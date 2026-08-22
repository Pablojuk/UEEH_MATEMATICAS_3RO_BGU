import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ALLOWED_ORIGINS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://pablojuk.github.io"
];

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[2];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req: Request) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  // 1. Validar CORS Origin estricto
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: "Origen no autorizado" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }

  try {
    const MAX_BYTES = 65536;
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Payload demasiado grande" }), {
        status: 413,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const reader = req.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: "Body vacío" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" }
      });
    }
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BYTES) {
        reader.cancel();
        return new Response(JSON.stringify({ error: "Payload demasiado grande" }), {
          status: 413,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
      chunks.push(value);
    }
    const bodyBuffer = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bodyBuffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const bodyText = new TextDecoder().decode(bodyBuffer);
    let payload: any;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // 3. Rechazar campos de cliente no autorizados (defensa en profundidad)
    const FORBIDDEN_FIELDS = [
      "student_id",
      "score",
      "question_score",
      "attempt_number",
      "attempt_count",
      "correct_answer",
      "expected_answer",
      "is_correct",
      "correct",
      "locked",
      "remaining_attempts",
      "status"
    ];
    for (const field of FORBIDDEN_FIELDS) {
      if (field in payload) {
        return new Response(
          JSON.stringify({ error: `El campo '${field}' no está permitido en la petición` }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
    }

    const {
      activity_key,
      exercise_key,
      question_id,
      check_id,
      question_submission_id,
      answer,
      user_answer,
      run_id,
      phase
    } = payload;

    const resolvedExerciseKey = String(exercise_key ?? question_id ?? "").trim();
    const resolvedCheckId = String(check_id ?? question_submission_id ?? "").trim();
    const resolvedAnswer = answer !== undefined ? answer : user_answer;

    // 4. Validar formato de tipos obligatorios
    if (!activity_key || typeof activity_key !== "string") {
      return new Response(JSON.stringify({ error: "activity_key requerido" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (!resolvedExerciseKey) {
      return new Response(JSON.stringify({ error: "exercise_key (o question_id) requerido" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (!resolvedCheckId || !UUID_REGEX.test(resolvedCheckId)) {
      return new Response(JSON.stringify({ error: "check_id (o question_submission_id) debe ser un UUID válido" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 5. Autenticación por JWT de Supabase Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Autenticación requerida (JWT ausente)" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sesión inválida o expirada" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const userId = userData.user.id;

    // 6. Validar que el usuario sea un estudiante activo
    const { data: student, error: studentError } = await serviceClient
      .from("students")
      .select("id, status")
      .eq("linked_user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: "Estudiante no registrado o inactivo" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 7. Validar la matrícula activa y la sección de clase del estudiante
    const { data: enrollment, error: enrollError } = await serviceClient
      .from("enrollments")
      .select("class_section_id, status")
      .eq("student_id", student.id)
      .eq("status", "active")
      .maybeSingle();

    if (enrollError || !enrollment) {
      return new Response(JSON.stringify({ error: "El estudiante no posee una matrícula activa" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 8. Consultar la actividad solicitada
    const { data: activity, error: actError } = await serviceClient
      .from("activities")
      .select("id, class_section_id, is_active, opens_at, due_at")
      .eq("activity_key", activity_key)
      .maybeSingle();

    if (actError || !activity) {
      return new Response(JSON.stringify({ error: "Actividad no encontrada" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Validar disponibilidad activa
    if (!activity.is_active) {
      return new Response(JSON.stringify({ error: "La actividad no se encuentra disponible." }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Validar pertenencia de sección
    if (activity.class_section_id !== enrollment.class_section_id) {
      return new Response(JSON.stringify({ error: "No tienes permiso para responder en esta sección académica" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const now = new Date();
    if (activity.opens_at && new Date(activity.opens_at) > now) {
      return new Response(JSON.stringify({ error: "La actividad aún no se encuentra abierta" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (activity.due_at && new Date(activity.due_at) < now) {
      return new Response(JSON.stringify({ error: "El plazo de entrega para esta actividad ha vencido" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // 9. Obtener la pauta privada mediante RPC get_activity_grading_config
    const { data: gradingConfigData, error: cfgError } = await serviceClient
      .rpc("get_activity_grading_config", { p_activity_id: activity.id });

    if (cfgError || !gradingConfigData || !gradingConfigData.config) {
      return new Response(JSON.stringify({ error: "Configuración de calificación no encontrada" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const graderType = gradingConfigData.grader_type;
    const config = gradingConfigData.config;

    // 10. Evaluador Servidor según grader_type
    let isCorrect = false;
    let partialFraction: number | null = null;
    let solutionHtml: string | null = null;

    const qStr = resolvedExerciseKey;

    if (graderType === "determinants_gamification_v1") {
      const planetCfg = config.planets?.[qStr];
      if (!planetCfg) {
        return new Response(JSON.stringify({ error: `Planeta ${qStr} no existe en la pauta` }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      if (planetCfg.isInvertibleCheck) {
        const uAns = String(resolvedAnswer?.answer ?? "").trim();
        const uInv = Boolean(resolvedAnswer?.isInvertible);
        isCorrect = planetCfg.answers.includes(uAns) && (uInv === planetCfg.correctInvertible);
      } else {
        const uAns = String(resolvedAnswer ?? "").trim();
        isCorrect = planetCfg.answers.includes(uAns);
      }

      if (planetCfg.solution_html) {
        solutionHtml = planetCfg.solution_html;
      }

    } else if (graderType === "determinants_classwork_v1") {
      const targetGroup = phase === "recovery" ? config.recoveryQuestions : config.questions;
      const qCfg = targetGroup?.[qStr];

      if (!qCfg) {
        return new Response(JSON.stringify({ error: `Pregunta ${qStr} no existe en la pauta de ${phase || "initial"}` }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      if (qCfg.mode === "mcq") {
        const uIdx = Number(resolvedAnswer);
        isCorrect = uIdx === qCfg.correctIndex;
      } else if (qCfg.mode === "input") {
        const uAns = String(resolvedAnswer ?? "").trim();
        isCorrect = qCfg.acceptedAnswers ? qCfg.acceptedAnswers.includes(uAns) : false;
      } else if (qCfg.mode === "fill") {
        const userBlanks: any[] = Array.isArray(resolvedAnswer) ? resolvedAnswer : [];
        const expectedBlanks: any[] = qCfg.blanks || [];
        let matchCount = 0;

        expectedBlanks.forEach((b: any, idx: number) => {
          const uVal = String(userBlanks[idx] ?? "").trim();
          const eVal = String(b.answer ?? "").trim();
          if (uVal === eVal) matchCount++;
        });

        const totalBlanks = expectedBlanks.length || 1;
        isCorrect = matchCount === totalBlanks;
        partialFraction = matchCount / totalBlanks;
      }

      if (qCfg.solution_html) {
        solutionHtml = qCfg.solution_html;
      }
    } else if (graderType === "exercise_set") {
      const exCfg = config.exercises?.[qStr];
      if (!exCfg) {
        return new Response(JSON.stringify({ error: `Ejercicio ${qStr} no existe en la pauta` }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      if (exCfg.type === "mcq") {
        const uVal = String(resolvedAnswer ?? "").trim();
        isCorrect = uVal === String(exCfg.correct_option ?? exCfg.correctIndex ?? "").trim();
      } else if (exCfg.type === "numeric" || exCfg.type === "input") {
        const uAns = String(resolvedAnswer ?? "").trim();
        const accepted = exCfg.accepted_answers || exCfg.acceptedAnswers || [];
        isCorrect = accepted.includes(uAns);
      }

      if (exCfg.solution_html) {
        solutionHtml = exCfg.solution_html;
      }
    } else {
      return new Response(JSON.stringify({ error: `Tipo de calificador '${graderType}' no soportado` }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const user_answer = resolvedAnswer;

    // 11. Registrar comprobación atómica con historial e idempotencia en Supabase (RPC Gateway)
    const { data: recordRes, error: recError } = await serviceClient.rpc("record_exercise_check", {
      p_activity_id: activity.id,
      p_student_id: student.id,
      p_exercise_key: qStr,
      p_check_id: resolvedCheckId,
      p_is_correct: isCorrect,
      p_answer_data: { value: user_answer }
    });

    if (recError || !recordRes) {
      console.error("Error al registrar comprobación de ejercicio:", recError);
      return new Response(JSON.stringify({ error: "Error interno al guardar la respuesta" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Fallback de attempts_remaining según grader_type
    let fallbackAttemptsRemaining: number | null = null;
    if (graderType === "determinants_classwork_v1" || graderType === "exercise_set") {
      fallbackAttemptsRemaining = Math.max(0, 4 - Number(recordRes.attempt_number || 0));
    } else if (graderType === "determinants_gamification_v1") {
      fallbackAttemptsRemaining = null;
    }

    const attemptsRemaining = (recordRes.attempts_remaining !== undefined && recordRes.attempts_remaining !== null)
      ? recordRes.attempts_remaining
      : fallbackAttemptsRemaining;

    // 12. Sanitizar respuesta devuelta al cliente: NUNCA devolver solución si el ejercicio sigue incorrecto/abierto
    const isLocked = Boolean(recordRes.locked);
    const isCorrectFinal = recordRes.correct ?? isCorrect;
    const isTerminal = isLocked || isCorrectFinal || recordRes.status === "correct" || recordRes.status === "failed";

    const responsePayload: any = {
      success: true,
      activity_id: activity.id,
      activity_run_id: recordRes.activity_run_id,
      run_id: recordRes.activity_run_id,
      phase: phase || "initial",
      exercise_key: qStr,
      question_id: qStr,
      attempt_count: recordRes.attempt_count,
      attempt_number: recordRes.attempt_count,
      correct: isCorrectFinal,
      is_correct: isCorrectFinal,
      status: recordRes.status,
      score: recordRes.score,
      question_score: recordRes.score ?? 0.00,
      locked: isLocked,
      remaining_attempts: attemptsRemaining,
      attempts_remaining: attemptsRemaining,
      solution_html: isTerminal && solutionHtml ? solutionHtml : null
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Excepción en check-activity-answer:", err);
    return new Response(JSON.stringify({ error: "Error procesando la solicitud" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
