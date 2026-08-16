import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://pablojuk.github.io"
];

const GENERIC_SUBMIT_ERROR = "No se pudo procesar la entrega de la actividad.";
const MAX_PAYLOAD_BYTES = 65536; // 64 KB limit
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ success: false, error: "Origen no permitido" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": origin || ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // 0. Rechazo temprano por cabecera Content-Length
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return new Response(JSON.stringify({ success: false, error: "Payload demasiado grande" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Read request body as a stream to enforce byte size limit before accumulating in memory
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > MAX_PAYLOAD_BYTES) {
            await reader.cancel();
            return new Response(JSON.stringify({ success: false, error: "Payload demasiado grande" }), {
              status: 413,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          chunks.push(value);
        }
      }
    }

    const rawBuffer = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      rawBuffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // 1. Validar JWT de usuario
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Sesión no válida o expirada" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Resolver estudiante desde linked_user_id
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: student, error: stErr } = await serviceClient
      .from("students")
      .select("id, status")
      .eq("linked_user_id", user.id)
      .maybeSingle();

    if (stErr || !student || student.status !== "active") {
      return new Response(JSON.stringify({ success: false, error: "Estudiante no encontrado o inactivo" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Confirmar matrícula activa
    const { data: enrollments, error: enErr } = await serviceClient
      .from("enrollments")
      .select("class_section_id")
      .eq("student_id", student.id)
      .eq("status", "active");

    if (enErr || !enrollments || enrollments.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "El estudiante no cuenta con matrícula activa" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enrolledSectionIds = enrollments.map((e: any) => e.class_section_id);

    // 4. Parsear y sanitizar cuerpo de la solicitud
    const bodyText = new TextDecoder().decode(rawBuffer);
    const body = JSON.parse(bodyText);

    if (
      body.student_id !== undefined ||
      body.score !== undefined ||
      body.rawScore !== undefined ||
      body.officialScore !== undefined ||
      body.minimum_score !== undefined ||
      body.attempt_number !== undefined ||
      body.best_score !== undefined ||
      body.admin_user_id !== undefined
    ) {
      return new Response(JSON.stringify({ success: false, error: "Parámetros de entrega no permitidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { activity_key, submission_id, submission } = body;

    if (!activity_key || typeof activity_key !== "string" || activity_key.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Clave de actividad requerida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!submission_id || typeof submission_id !== "string" || !UUID_REGEX.test(submission_id.trim())) {
      return new Response(JSON.stringify({ success: false, error: "Identificador de entrega (submission_id) no válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const cleanSubmissionId = submission_id.trim();

    // 5. Consultar actividad activa
    const { data: activity, error: actErr } = await serviceClient
      .from("activities")
      .select("id, max_score, minimum_score, opens_at, due_at, class_section_id, is_active")
      .eq("activity_key", activity_key.trim())
      .single();

    if (actErr || !activity || !activity.is_active) {
      return new Response(JSON.stringify({ success: false, error: "Actividad no disponible o inactiva" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!enrolledSectionIds.includes(activity.class_section_id)) {
      return new Response(JSON.stringify({ success: false, error: "La actividad no corresponde al curso matriculado del estudiante" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 6. DETECCIÓN DE RETRY IDEMPOTENTE: Si ya existe un intento para este submission_id, devolver respuesta registrada sin re-calificar
    const { data: existingAttempt, error: attCheckErr } = await serviceClient
      .from("activity_attempts")
      .select("attempt_number, score, completed_at")
      .eq("activity_id", activity.id)
      .eq("student_id", student.id)
      .eq("submission_id", cleanSubmissionId)
      .maybeSingle();

    if (!attCheckErr && existingAttempt) {
      const { data: existingResults } = await serviceClient
        .from("activity_results")
        .select("best_score, attempt_count")
        .eq("activity_id", activity.id)
        .eq("student_id", student.id)
        .maybeSingle();

      return new Response(JSON.stringify({
        success: true,
        data: {
          activity_key: activity_key.trim(),
          score: existingAttempt.score,
          max_score: Number(activity.max_score || 10),
          attempt_number: existingAttempt.attempt_number,
          best_score: existingResults?.best_score ?? existingAttempt.score,
          attempt_count: existingResults?.attempt_count ?? 1,
          registered_at: existingAttempt.completed_at
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 7. NUEVA ENTREGA: Validar ventana de disponibilidad oficial por servidor
    const now = new Date();

    if (activity.opens_at && now < new Date(activity.opens_at)) {
      return new Response(JSON.stringify({ success: false, error: "La actividad todavía no está disponible." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (activity.due_at && now > new Date(activity.due_at)) {
      return new Response(JSON.stringify({ success: false, error: "El plazo de entrega de esta actividad ha finalizado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 8. Consultar pauta de calificación privada mediante RPC Gateway segura (Solo service_role)
    const { data: gradingConfigData, error: cfgErr } = await serviceClient
      .rpc("get_activity_grading_config", { p_activity_id: activity.id });

    if (cfgErr || !gradingConfigData || !gradingConfigData.grader_type) {
      console.error("Error al obtener grading config:", cfgErr);
      return new Response(JSON.stringify({ success: false, error: GENERIC_SUBMIT_ERROR }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 9. CALCULAR NOTA OFICIAL EN SERVIDOR (rawScore -> officialScore)
    const maxScore = Number(activity.max_score || 10);
    const minScore = Number(activity.minimum_score || 1);
    let rawScore = 0;

    if (gradingConfigData.grader_type === "auto_mcq") {
      const answers = gradingConfigData.config?.answers;
      const userAnswers = submission?.answers;

      if (!answers || typeof answers !== "object" || Object.keys(answers).length === 0) {
        console.error("Pauta auto_mcq inválida o vacía");
        return new Response(JSON.stringify({ success: false, error: GENERIC_SUBMIT_ERROR }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (!submission || typeof submission !== "object" || Array.isArray(submission) || !userAnswers || typeof userAnswers !== "object" || Array.isArray(userAnswers)) {
        return new Response(JSON.stringify({ success: false, error: "Formato de respuestas entregado no válido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const totalQuestions = Object.keys(answers).length;
      let correct = 0;

      for (const [qId, correctVal] of Object.entries(answers)) {
        if (userAnswers[qId] === correctVal) correct++;
      }

      rawScore = totalQuestions > 0 ? (correct / totalQuestions) * maxScore : 0;
    } else {
      console.error("Grader desconocido:", gradingConfigData.grader_type);
      return new Response(JSON.stringify({ success: false, error: GENERIC_SUBMIT_ERROR }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Aplicar regla oficial: officialScore = max(minScore, rawScore)
    const officialScore = Math.min(maxScore, Math.max(minScore, Math.round(Math.max(minScore, rawScore) * 100) / 100));

    // 10. Invocación atómica RPC en servidor con submission_id
    const { data: rpcResult, error: rpcErr } = await serviceClient.rpc("record_activity_attempt", {
      p_activity_id: activity.id,
      p_student_id: student.id,
      p_submission_id: cleanSubmissionId,
      p_score: officialScore,
      p_submission_data: submission || null
    });

    if (rpcErr || !rpcResult) {
      console.error("Error RPC record_activity_attempt:", rpcErr);
      return new Response(JSON.stringify({ success: false, error: GENERIC_SUBMIT_ERROR }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 11. Devolver ÚNICAMENTE información pública y segura al navegador
    return new Response(JSON.stringify({
      success: true,
      data: {
        activity_key: activity_key.trim(),
        score: rpcResult.score,
        max_score: rpcResult.max_score,
        attempt_number: rpcResult.attempt_number,
        best_score: rpcResult.best_score,
        attempt_count: rpcResult.attempt_count,
        registered_at: rpcResult.registered_at
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("Excepción en Edge Function submit-activity-result:", err);
    return new Response(JSON.stringify({ success: false, error: GENERIC_SUBMIT_ERROR }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
