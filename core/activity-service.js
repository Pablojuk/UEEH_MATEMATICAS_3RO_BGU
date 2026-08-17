// ═══════════════════════════════════════════════════════════════════════════
// Frontend Activity Service — UEEH Matemáticas 3ro BGU (Unidad 5+)
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from "./supabase-client.js";

const SUBMIT_FUNCTION_URL = "https://fetfzizgkrdmocnlkgco.supabase.co/functions/v1/submit-activity-result";

/**
 * Obtiene o crea un submission_id único para una entrega específica de una actividad en sessionStorage.
 */
export function getOrCreateSubmissionId(activityKey) {
  const key = `ueeh_pending_sub_${activityKey}`;
  const stored = sessionStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.submissionId) {
        return parsed.submissionId;
      }
    } catch (_) {
      sessionStorage.removeItem(key);
    }
  }
  const newId = crypto.randomUUID();
  return newId;
}

/**
 * Guarda temporalmente un borrador de entrega pendiente de confirmación en sessionStorage.
 */
export function savePendingSubmission(activityKey, submissionId, submission) {
  const key = `ueeh_pending_sub_${activityKey}`;
  sessionStorage.setItem(key, JSON.stringify({
    submissionId,
    activityKey,
    submission,
    savedAt: new Date().toISOString()
  }));
}

/**
 * Elimina la entrega pendiente de sessionStorage una vez confirmada por Supabase.
 */
export function clearPendingSubmission(activityKey) {
  const key = `ueeh_pending_sub_${activityKey}`;
  sessionStorage.removeItem(key);
}

/**
 * Obtiene una entrega pendiente de confirmación si existe en sessionStorage.
 */
export function getPendingSubmission(activityKey) {
  const key = `ueeh_pending_sub_${activityKey}`;
  const stored = sessionStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (_) {
    return null;
  }
}

/**
 * Envía una actividad a la Edge Function de Supabase con garantía de idempotencia (submission_id).
 */
export async function submitActivityResult({ activityKey, submission, submissionId, runId, phase, initialRunId, isRetry = false }) {
  let subId = submissionId;
  const pending = getPendingSubmission(activityKey);

  if (isRetry && pending && pending.submissionId) {
    subId = pending.submissionId;
    submission = submission || pending.submission;
  } else if (!subId) {
    subId = getOrCreateSubmissionId(activityKey);
    savePendingSubmission(activityKey, subId, submission);
  }

  try {
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !session) {
      return {
        success: false,
        state: "error",
        error: "Sesión no válida. Inicia sesión con tu cuenta institucional."
      };
    }

    const payloadRunId = runId || submission?.run_id;
    const payloadPhase = phase || submission?.phase || "initial";
    const payloadInitialRunId = initialRunId || submission?.initial_run_id;

    const res = await fetch(SUBMIT_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        activity_key: activityKey,
        submission_id: subId,
        run_id: payloadRunId,
        phase: payloadPhase,
        initial_run_id: payloadInitialRunId,
        submission: submission
      })
    });

    const body = await res.json();

    if (res.ok && body.success) {
      clearPendingSubmission(activityKey);
      return {
        success: true,
        state: "confirmed",
        data: body
      };
    } else {
      return {
        success: false,
        state: "error",
        error: body.error || "No se pudo registrar la actividad."
      };
    }
  } catch (netErr) {
    console.warn("Fallo de conexión en envío de actividad (se conserva pending para retry):", netErr);
    return {
      success: false,
      state: "pending_confirmation",
      error: "Sin respuesta del servidor. Tu entrega ha sido conservada en este navegador y puedes presionar 'Reintentar envío' sin generar un intento duplicado."
    };
  }
}

/**
 * Consulta las actividades y resultados formateados directamente desde Supabase como fuente oficial.
 */
export async function fetchStudentActivitySummary() {
  const { data: activities, error: actErr } = await supabase
    .from("activities")
    .select("id, activity_key, title, activity_type, unit_number, max_score, minimum_score, opens_at, due_at, display_order")
    .eq("is_active", true)
    .order("unit_number", { ascending: true })
    .order("display_order", { ascending: true });

  if (actErr) {
    console.error("Error al consultar actividades:", actErr);
    return [];
  }

  const { data: results, error: resErr } = await supabase
    .from("activity_results")
    .select("activity_id, best_score, attempt_count, result_status, result_source, first_completed_at, last_completed_at");

  if (resErr) {
    console.error("Error al consultar resultados del estudiante:", resErr);
  }

  const resultMap = new Map((results || []).map((r) => [r.activity_id, r]));

  const now = new Date();

  return activities.map((act) => {
    const res = resultMap.get(act.id);
    const pendingLocal = getPendingSubmission(act.activity_key);

    let displayState = "NOT_STARTED";
    let statusText = "🟡 Pendiente de realizar";

    if (res) {
      if (res.result_status === "completed") {
        displayState = "CONFIRMED";
        statusText = "✅ Enviado y registrado";
        // Si Supabase confirmó, limpiar cualquier borrador local antiguo
        if (pendingLocal) clearPendingSubmission(act.activity_key);
      } else if (res.result_status === "not_submitted") {
        displayState = "OVERDUE";
        statusText = "🔴 No entregado — plazo vencido";
      }
    } else if (pendingLocal) {
      displayState = "PENDING_RETRY";
      statusText = "🟡 Pendiente de confirmar (Fallo de conexión previa)";
    } else if (act.due_at && now > new Date(act.due_at)) {
      displayState = "PROCESSING_CLOSURE";
      statusText = "⏳ Cierre en procesamiento";
    }

    return {
      activity: act,
      result: res || null,
      displayState,
      statusText,
      pendingLocal: displayState === "PENDING_RETRY" ? pendingLocal : null
    };
  });
}
