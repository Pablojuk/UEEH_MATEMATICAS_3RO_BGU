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

    // Rechazar parámetros de calificación enviados desde el navegador (autoridad exclusiva de servidor)
    const FORBIDDEN_FIELDS = ["student_id", "score", "rawScore", "officialScore", "minimum_score", "attempt_number", "best_score", "admin_user_id", "question_score", "correct_answer", "expected_answer", "is_correct"];
    for (const field of FORBIDDEN_FIELDS) {
      if (field in payload) {
        return new Response(
          JSON.stringify({ error: `El campo '${field}' no está permitido en la entrega` }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
    }

    const { activity_key, submission_id, run_id, phase, initial_run_id } = payload;

    if (!activity_key || typeof activity_key !== "string") {
      return new Response(JSON.stringify({ error: "activity_key requerido" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (!submission_id || typeof submission_id !== "string" || !UUID_REGEX.test(submission_id)) {
      return new Response(JSON.stringify({ error: "submission_id debe ser un UUID válido" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

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

    const { data: student, error: studentError } = await serviceClient
      .from("students")
      .select("id, status")
      .eq("linked_user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: "Estudiante no registrado o inactivo" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: enrollment, error: enrollError } = await serviceClient
      .from("enrollments")
      .select("class_section_id, status")
      .eq("student_id", student.id)
      .eq("status", "active")
      .maybeSingle();

    if (enrollError || !enrollment) {
      return new Response(JSON.stringify({ error: "El estudiante no posee una matrícula activa" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: activity, error: actError } = await serviceClient
      .from("activities")
      .select("id, class_section_id, max_score, minimum_score, is_active, opens_at, due_at")
      .eq("activity_key", activity_key)
      .maybeSingle();

    if (actError || !activity) {
      return new Response(JSON.stringify({ error: "Actividad no encontrada" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Validar pertenencia de sección
    if (activity.class_section_id !== enrollment.class_section_id) {
      return new Response(JSON.stringify({ error: "No tienes permiso para entregar actividades de esta sección" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // IDEMPOTENCIA OBLIGATORIA DE SUBMISSION_ID (Precision 3)
    // ──────────────────────────────────────────────────────────────────────────
    // Buscar intento existente ANTES de validar disponibilidad/fechas
    // (permite responder idénticamente ante reintentos tras vencimiento o cierre)
    const { data: existingAttempt } = await serviceClient
      .from("activity_attempts")
      .select("id, attempt_number, score, completed_at")
      .eq("activity_id", activity.id)
      .eq("student_id", student.id)
      .eq("submission_id", submission_id)
      .maybeSingle();

    if (existingAttempt) {
      const { data: bestRes } = await serviceClient
        .from("activity_results")
        .select("best_score, attempt_count")
        .eq("activity_id", activity.id)
        .eq("student_id", student.id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          idempotent: true,
          activity_key,
          attempt_number: existingAttempt.attempt_number,
          score: existingAttempt.score,
          max_score: Number(activity.max_score) || 10.00,
          best_score: bestRes?.best_score ?? existingAttempt.score,
          attempt_count: bestRes?.attempt_count ?? existingAttempt.attempt_number,
          registered_at: existingAttempt.completed_at || new Date().toISOString()
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Para entregas NUEVAS: comprobar is_active y ventana de tiempo (opens_at / due_at)
    if (!activity.is_active) {
      return new Response(JSON.stringify({ error: "La actividad no se encuentra disponible." }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const now = new Date();
    if (activity.opens_at && new Date(activity.opens_at) > now) {
      return new Response(JSON.stringify({ error: "La actividad aún no se encuentra abierta" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (activity.due_at && new Date(activity.due_at) < now) {
      return new Response(JSON.stringify({ error: "El plazo de entrega para esta actividad ha vencido" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Obtener la configuración privada de calificación mediante RPC
    const { data: gradingConfigData, error: cfgError } = await serviceClient
      .rpc("get_activity_grading_config", { p_activity_id: activity.id });

    if (cfgError || !gradingConfigData || !gradingConfigData.config) {
      return new Response(JSON.stringify({ error: "Configuración de calificación no encontrada" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const graderType = gradingConfigData.grader_type;
    const currentPhase = phase || (graderType === "determinants_gamification_v1" ? "gamification" : "initial");

    let computedScore = 0.0;
    let submissionDetails: any = { submission_id, phase: currentPhase };
    let activeRunId: string | null = null;

    if (graderType === "exercise_set") {
      // 1. Obtener run activo oficial
      const { data: activeRun, error: runErr } = await serviceClient
        .from("activity_runs")
        .select("id, status")
        .eq("activity_id", activity.id)
        .eq("student_id", student.id)
        .eq("status", "in_progress")
        .maybeSingle();

      if (runErr || !activeRun) {
        return new Response(
          JSON.stringify({ error: "No se encontró una sesión en progreso para esta actividad" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      activeRunId = activeRun.id;

      // 2. Obtener lista de ejercicios requeridos desde la pauta privada
      const requiredExercises = Object.keys(gradingConfigData.config.exercises || {});
      const totalRequired = requiredExercises.length;

      if (totalRequired === 0) {
        return new Response(
          JSON.stringify({ error: "La actividad no tiene ejercicios configurados en la pauta" }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // 3. Consultar progreso de los ejercicios en el run activo
      const { data: progressList, error: progErr } = await serviceClient
        .from("activity_exercise_progress")
        .select("exercise_key, status, locked, exercise_score")
        .eq("activity_run_id", activeRun.id);

      if (progErr || !progressList) {
        return new Response(
          JSON.stringify({ error: "Error al consultar el progreso de los ejercicios" }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const progressMap = new Map(progressList.map((p: any) => [p.exercise_key, p]));

      // 4. Validar que TODOS los ejercicios requeridos tengan estado terminal (correct o failed / locked)
      const incompleteExercises = requiredExercises.filter((k) => {
        const p = progressMap.get(k);
        if (!p) return true;
        const isTerminal = p.status === "correct" || p.status === "failed" || p.locked === true;
        return !isTerminal;
      });

      if (incompleteExercises.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            code: "ACTIVITY_INCOMPLETE",
            error: `Te faltan ${incompleteExercises.length} ejercicio(s) por terminar antes de enviar la actividad.`,
            remaining_exercises: incompleteExercises.length
          }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // 5. Calcular nota oficial utilizando el total configurado como denominador inmutable
      const totalScore = requiredExercises.reduce((acc, k) => {
        const p = progressMap.get(k);
        return acc + Number(p?.exercise_score || 1.00);
      }, 0);

      computedScore = totalScore / totalRequired;
      submissionDetails.activity_run_id = activeRun.id;
      submissionDetails.total_exercises = totalRequired;
      submissionDetails.raw_score = computedScore;

    } else if (graderType === "determinants_gamification_v1") {
      const payloadRunId = run_id;
      if (!payloadRunId || typeof payloadRunId !== "string" || !UUID_REGEX.test(payloadRunId)) {
        return new Response(JSON.stringify({ error: "run_id debe ser un UUID válido" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const { data: runSummaryData, error: summaryErr } = await serviceClient
        .rpc("get_activity_run_summary", {
          p_activity_id: activity.id,
          p_student_id: student.id,
          p_run_id: payloadRunId,
          p_phase: "gamification"
        });

      if (summaryErr || !Array.isArray(runSummaryData)) {
        return new Response(JSON.stringify({ error: "No se encontraron intentos registrados para este juego" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const correctPlanets = runSummaryData.filter((q: any) => q.is_correct === true);
      if (correctPlanets.length < 6) {
        return new Response(
          JSON.stringify({ error: `Odisea Espacial incompleta. Debes conquistar los 6 planetas (Completados: ${correctPlanets.length}/6).` }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const totalGamificationScore = runSummaryData.reduce((acc: number, q: any) => acc + Number(q.terminal_score || 0), 0);
      computedScore = totalGamificationScore / Number(runSummaryData.length || 6);
      submissionDetails.run_id = payloadRunId;
      submissionDetails.planets_completed = runSummaryData.length;

    } else if (graderType === "determinants_classwork_v1") {
      const payloadRunId = run_id;
      if (!payloadRunId || typeof payloadRunId !== "string" || !UUID_REGEX.test(payloadRunId)) {
        return new Response(JSON.stringify({ error: "run_id debe ser un UUID válido" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      if (currentPhase === "initial") {
        const { data: runSummaryData, error: summaryErr } = await serviceClient
          .rpc("get_activity_run_summary", {
            p_activity_id: activity.id,
            p_student_id: student.id,
            p_run_id: payloadRunId,
            p_phase: "initial"
          });

        if (summaryErr || !Array.isArray(runSummaryData)) {
          return new Response(JSON.stringify({ error: "No se encontraron intentos para el Trabajo en Clase" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
        }

        const terminalQuestions = runSummaryData.filter((q: any) => q.locked === true || q.is_correct === true || q.attempt_count >= 4);
        if (terminalQuestions.length < 14) {
          return new Response(
            JSON.stringify({
              success: false,
              code: "ACTIVITY_INCOMPLETE",
              error: `Trabajo en Clase incompleto. Debes resolver los 14 ejercicios iniciales (Finalizados: ${terminalQuestions.length}/14).`,
              remaining_exercises: 14 - terminalQuestions.length
            }),
            { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
          );
        }

        const totalTerminalScore = terminalQuestions.reduce((acc: number, q: any) => acc + Number(q.terminal_score || 0), 0);
        const rawInitialScore = totalTerminalScore / 14.0;
        computedScore = rawInitialScore;

        submissionDetails.run_id = payloadRunId;
        submissionDetails.phase = "initial";
        submissionDetails.raw_initial_score = rawInitialScore;
        submissionDetails.questions_count = 14;

      } else if (currentPhase === "recovery") {
        if (!initial_run_id || typeof initial_run_id !== "string" || !UUID_REGEX.test(initial_run_id)) {
          return new Response(JSON.stringify({ error: "initial_run_id debe ser un UUID válido para la fase de recuperación" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
        }

        const { data: pastAttempts } = await serviceClient
          .from("activity_attempts")
          .select("submission_data")
          .eq("activity_id", activity.id)
          .eq("student_id", student.id)
          .order("completed_at", { ascending: false });

        const targetAttempt = (pastAttempts || []).find((att: any) =>
          att.submission_data?.phase === "initial" && att.submission_data?.run_id === initial_run_id
        );

        if (!targetAttempt || targetAttempt.submission_data?.raw_initial_score === undefined || targetAttempt.submission_data?.raw_initial_score === null) {
          return new Response(
            JSON.stringify({ error: "No se encontró una entrega inicial registrada correspondiente a este initial_run_id" }),
            { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
          );
        }

        const rawInitialScore = Number(targetAttempt.submission_data.raw_initial_score);

        if (rawInitialScore >= 7.00) {
          return new Response(
            JSON.stringify({ error: "La fase de recuperación solo está disponible si la nota inicial es menor a 7.00" }),
            { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
          );
        }

        const { data: recSummaryData, error: recErr } = await serviceClient
          .rpc("get_activity_run_summary", {
            p_activity_id: activity.id,
            p_student_id: student.id,
            p_run_id: payloadRunId,
            p_phase: "recovery"
          });

        if (recErr || !Array.isArray(recSummaryData)) {
          return new Response(JSON.stringify({ error: "No se encontraron intentos para la fase de recuperación" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
        }

        const terminalRecovery = recSummaryData.filter((q: any) => q.locked === true || q.is_correct === true || q.attempt_count >= 4);
        if (terminalRecovery.length < 8) {
          return new Response(
            JSON.stringify({
              success: false,
              code: "ACTIVITY_INCOMPLETE",
              error: `Fase de recuperación incompleta. Debes completar los 8 ejercicios (Finalizados: ${terminalRecovery.length}/8).`,
              remaining_exercises: 8 - terminalRecovery.length
            }),
            { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
          );
        }

        const totalRecScore = terminalRecovery.reduce((acc: number, q: any) => acc + Number(q.terminal_score || 0), 0);
        const recoveryAvg = totalRecScore / 8.0;

        const finalRaw = Math.max(rawInitialScore, recoveryAvg);
        computedScore = finalRaw;

        submissionDetails.run_id = payloadRunId;
        submissionDetails.phase = "recovery";
        submissionDetails.initial_run_id = initial_run_id;
        submissionDetails.raw_initial_score = rawInitialScore;
        submissionDetails.recovery_score = recoveryAvg;
        submissionDetails.recovery_average = recoveryAvg;
        submissionDetails.final_raw_score = finalRaw;
      }
    } else {
      return new Response(JSON.stringify({ error: `Tipo de calificador '${graderType}' no reconocido` }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Aplicar la nota mínima institucional (1.00/10.00) y tope máximo
    const minScore = Number(activity.minimum_score) || 1.00;
    const maxScore = Number(activity.max_score) || 10.00;
    const finalOfficialScore = Math.max(minScore, Math.min(maxScore, Number(computedScore.toFixed(2))));

    // Guardar el intento de actividad mediante RPC atómica private.record_activity_attempt
    const { data: recordResult, error: recordError } = await serviceClient.rpc("record_activity_attempt", {
      p_activity_id: activity.id,
      p_student_id: student.id,
      p_submission_id: submission_id,
      p_score: finalOfficialScore,
      p_submission_data: submissionDetails
    });

    if (recordError || !recordResult) {
      console.error("Error al ejecutar record_activity_attempt:", recordError);
      return new Response(JSON.stringify({ error: "Error al guardar el resultado oficial en la base de datos" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Si existía un activity_run en progreso, marcarlo como submitted
    if (activeRunId) {
      await serviceClient
        .from("activity_runs")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          submission_id: submission_id
        })
        .eq("id", activeRunId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        activity_key,
        attempt_number: recordResult.attempt_number,
        score: finalOfficialScore,
        max_score: maxScore,
        best_score: recordResult.best_score,
        attempt_count: recordResult.attempt_count,
        registered_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Excepción en submit-activity-result:", err);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
