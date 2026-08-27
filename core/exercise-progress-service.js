// ═══════════════════════════════════════════════════════════════════════════
// Frontend Exercise Progress Service — UEEH Matemáticas 3ro BGU (Unidad 5+)
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from "./supabase-client.js?v=1.4.4";
import { submitActivityResult } from "./activity-service.js?v=1.4.4";

const CHECK_FUNCTION_URL = "https://fetfzizgkrdmocnlkgco.supabase.co/functions/v1/check-activity-answer";

/**
 * Comprueba un ejercicio individual enviándolo a Supabase.
 * Inmutable, atómico e idempotente (vinculado a check_id).
 */
export async function checkExercise({ activityKey, exerciseKey, answer, checkId, runId, phase }) {
  const cid = checkId || crypto.randomUUID();

  try {
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !session) {
      return {
        success: false,
        error: "Sesión no válida. Inicia sesión con tu cuenta institucional."
      };
    }

    const res = await fetch(CHECK_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        activity_key: activityKey,
        exercise_key: String(exerciseKey),
        check_id: cid,
        answer: answer,
        run_id: runId,
        phase: phase || "initial"
      })
    });

    const body = await res.json();

    if (res.ok && body.success) {
      return {
        success: true,
        checkId: cid,
        ...body
      };
    } else {
      return {
        success: false,
        error: body.error || "No se pudo comprobar la respuesta.",
        code: body.code
      };
    }
  } catch (netErr) {
    console.warn("Fallo de red al comprobar ejercicio:", netErr);
    return {
      success: false,
      error: "Error de conexión con el servidor. Revisa tu conexión e intenta nuevamente.",
      isNetworkError: true
    };
  }
}

/**
 * Consulta el estado consolidado de los ejercicios guardados para el estudiante en la actividad activa.
 */
export async function getExerciseProgress(activityKey) {
  try {
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !session) return [];

    // 1. Obtener ID de la actividad
    const { data: activity, error: actErr } = await supabase
      .from("activities")
      .select("id")
      .eq("activity_key", activityKey)
      .maybeSingle();

    if (actErr || !activity) return [];

    // 2. Consultar progreso mediante RPC optimizado o consulta directa con RLS
    const { data: progressData, error: progErr } = await supabase
      .rpc("get_student_exercise_progress", { p_activity_id: activity.id });

    if (progErr || !Array.isArray(progressData)) {
      // Fallback a consulta directa sobre la tabla protegida con RLS
      const { data: fallbackData } = await supabase
        .from("activity_exercise_progress")
        .select("exercise_key, answer_data, attempt_count, exercise_score, status, locked, last_checked_at")
        .eq("activity_id", activity.id);

      return fallbackData || [];
    }

    return progressData;
  } catch (err) {
    console.warn("Error al recuperar progreso de ejercicios:", err);
    return [];
  }
}

/**
 * Aplica el progreso guardado sobre la estructura de ejercicios del frontend.
 */
export function restoreExerciseProgress({ exercises = [], progressList = [], onApplyState = null }) {
  if (!Array.isArray(exercises) || !Array.isArray(progressList) || progressList.length === 0) {
    return exercises;
  }

  const progressMap = new Map();
  for (const item of progressList) {
    if (item && item.exercise_key !== undefined) {
      progressMap.set(String(item.exercise_key), item);
    }
  }

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const key = String(ex.exercise_key ?? ex.id ?? (i + 1));
    const saved = progressMap.get(key);

    if (saved) {
      ex.status = saved.status;
      ex.attempts = saved.attempt_count;
      ex.attempt_count = saved.attempt_count;
      ex.score = saved.exercise_score;
      ex.locked = Boolean(saved.locked);
      ex.savedAnswer = saved.answer_data?.value ?? saved.answer_data;

      if (typeof onApplyState === "function") {
        onApplyState(ex, saved, i);
      }
    }
  }

  return exercises;
}

/**
 * Envía oficialmente la actividad completa ("Enviar actividad").
 */
export async function finalizeActivity({ activityKey, submissionId, runId, phase }) {
  return await submitActivityResult({
    activityKey,
    submissionId,
    runId,
    phase
  });
}
