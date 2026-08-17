// ═══════════════════════════════════════════════════════════════════════════
// Edge Function: check-activity-answer — UEEH Matemáticas 3ro BGU
// SERVER-SIDE QUESTION EVALUATION & ATTEMPT TRACKING
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ALLOWED_ORIGINS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://pablojuk.github.io"
];

function buildCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Método no permitido" }), {
        status: 405,
        headers: corsHeaders
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Cabecera de autorización no encontrada" }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Sesión no válida" }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener estudiante vinculado
    const { data: student, error: stErr } = await serviceClient
      .from("students")
      .select("id, status")
      .eq("linked_user_id", user.id)
      .single();

    if (stErr || !student || student.status !== "active") {
      return new Response(JSON.stringify({ success: false, error: "Estudiante no encontrado o inactivo" }), {
        status: 403,
        headers: corsHeaders
      });
    }

    // Parsear body
    const body = await req.json();

    // Bloquear intentos de inyección de parámetros no permitidos
    const forbiddenKeys = ["student_id", "score", "expected_answer", "correct_answer", "attempt_number", "question_score"];
    for (const k of forbiddenKeys) {
      if (k in body) {
        return new Response(JSON.stringify({ success: false, error: `Parámetro '${k}' no permitido` }), {
          status: 400,
          headers: corsHeaders
        });
      }
    }

    const { activity_key, run_id, phase = "initial", question_id, answer } = body;

    if (!activity_key || !run_id || !question_id || answer === undefined) {
      return new Response(JSON.stringify({ success: false, error: "Faltan parámetros requeridos (activity_key, run_id, question_id, answer)" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Obtener actividad activa
    const { data: activity, error: actErr } = await serviceClient
      .from("activities")
      .select("id, is_active, opens_at, due_at")
      .eq("activity_key", activity_key)
      .single();

    if (actErr || !activity || !activity.is_active) {
      return new Response(JSON.stringify({ success: false, error: "Actividad no encontrada o inactiva" }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const now = new Date();
    if (activity.opens_at && new Date(activity.opens_at) > now) {
      return new Response(JSON.stringify({ success: false, error: "La actividad aún no está abierta" }), {
        status: 403,
        headers: corsHeaders
      });
    }

    if (activity.due_at && new Date(activity.due_at) < now) {
      return new Response(JSON.stringify({ success: false, error: "El plazo de entrega ha finalizado" }), {
        status: 403,
        headers: corsHeaders
      });
    }

    // Cargar config privada
    const { data: cfgRow, error: cfgErr } = await serviceClient
      .schema("private")
      .from("activity_grading_configs")
      .select("grader_type, config")
      .eq("activity_id", activity.id)
      .single();

    if (cfgErr || !cfgRow) {
      return new Response(JSON.stringify({ success: false, error: "Configuración de calificación no encontrada" }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const { grader_type, config } = cfgRow;
    let isCorrect = false;
    let partialFraction: number | null = null;
    let rawQuestionScore = 0;

    // EVALUACIÓN SERVER-SIDE
    if (grader_type === "determinants_gamification_v1") {
      const planetConfig = config.planets?.[question_id];
      if (planetConfig) {
        const userAns = String(answer).trim().toLowerCase().replace(",", ".");
        const accepted = (planetConfig.answers || []).map((a: string) => String(a).trim().toLowerCase().replace(",", "."));
        isCorrect = accepted.includes(userAns);

        if (planetConfig.isInvertibleCheck) {
          const invChoice = body.invertibleChoice;
          if (invChoice !== undefined && invChoice !== planetConfig.correctInvertible) {
            isCorrect = false;
          }
        }
        rawQuestionScore = isCorrect ? 10 : 0;
      }
    } else if (grader_type === "determinants_classwork_v1") {
      const qConfig = config.questions?.[question_id];
      if (qConfig) {
        if (qConfig.mode === "mcq") {
          isCorrect = Number(answer) === Number(qConfig.correctIndex);
          rawQuestionScore = isCorrect ? 10 : 0;
        } else if (qConfig.mode === "input") {
          const userAns = String(answer).trim().toLowerCase().replace(/\s+/g, "").replace(",", ".");
          const accepted = (qConfig.acceptedAnswers || []).map((a: string) => String(a).trim().toLowerCase().replace(/\s+/g, "").replace(",", "."));
          isCorrect = accepted.some((ans: string) => {
            if (userAns === ans) return true;
            const uN = parseFloat(userAns);
            const aN = parseFloat(ans);
            return !isNaN(uN) && !isNaN(aN) && Math.abs(uN - aN) < 1e-6;
          });
          rawQuestionScore = isCorrect ? 10 : 0;
        } else if (qConfig.mode === "fill") {
          const blanks = qConfig.blanks || [];
          const userBlanks = Array.isArray(answer) ? answer : [];
          let okCount = 0;
          blanks.forEach((b: { answer: number }, i: number) => {
            const uVal = String(userBlanks[i] || "").trim().replace(",", ".");
            if (Math.abs(Number(uVal) - Number(b.answer)) < 1e-6) okCount++;
          });
          partialFraction = blanks.length > 0 ? okCount / blanks.length : 0;
          isCorrect = okCount === blanks.length;
          rawQuestionScore = Math.round(partialFraction * 10 * 10) / 10;
        }
      }
    }

    // Registrar intento server-side via RPC
    const { data: recResult, error: recErr } = await serviceClient.rpc("record_question_attempt", {
      p_activity_id: activity.id,
      p_student_id: student.id,
      p_run_id: run_id,
      p_phase: phase,
      p_question_id: question_id,
      p_answer_data: { answer },
      p_is_correct: isCorrect,
      p_partial_fraction: partialFraction,
      p_question_score: rawQuestionScore
    });

    if (recErr) {
      return new Response(JSON.stringify({ success: false, error: recErr.message }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Ajustar puntaje según el número de intento alcanzado (Attempt 1 = 10, Attempt 2 = 9, Attempt 3 = 8)
    let finalQScore = rawQuestionScore;
    if (isCorrect && (recResult.attempt_number === 2)) finalQScore = Math.min(finalQScore, 9);
    if (isCorrect && (recResult.attempt_number === 3)) finalQScore = Math.min(finalQScore, 8);

    return new Response(JSON.stringify({
      success: true,
      correct: isCorrect,
      attempt_number: recResult.attempt_number,
      attempts_remaining: recResult.attempts_remaining,
      locked: recResult.locked,
      question_score: finalQScore,
      partial_fraction: partialFraction
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || "Error interno del servidor" }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
