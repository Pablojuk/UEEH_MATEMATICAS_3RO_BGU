// ═══════════════════════════════════════════════════════════════════════════
// Frontend Activity Service — UEEH Matemáticas 3ro BGU (Unidad 5+)
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from "./supabase-client.js?v=1.4.7";
import { getCurrentValidSession } from "./auth-session-service.js?v=1.4.7";

const SUBMIT_FUNCTION_URL = "https://fetfzizgkrdmocnlkgco.supabase.co/functions/v1/submit-activity-result";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Obtiene o crea un submission_id único para una entrega específica de una actividad en sessionStorage.
 */
export function getOrCreateSubmissionId(activityKey) {
  const key = `ueeh_pending_sub_${activityKey}`;
  const stored = sessionStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const storedId = parsed?.submissionId || parsed?.submission_id;
      if (typeof storedId === "string" && UUID_REGEX.test(storedId)) {
        return storedId;
      }
      sessionStorage.removeItem(key);
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
export function savePendingSubmission(activityKey, submissionId, submission, options = {}) {
  const key = `ueeh_pending_sub_${activityKey}`;
  const { runId, phase, initialRunId } = options;
  sessionStorage.setItem(key, JSON.stringify({
    submissionId,
    activityKey,
    submission: submission ?? null,
    runId: runId || submission?.run_id || null,
    phase: phase || submission?.phase || "initial",
    initialRunId: initialRunId || submission?.initial_run_id || null,
    state: "awaiting_response",
    savedAt: new Date().toISOString()
  }));
}

/**
 * Elimina la entrega pendiente de sessionStorage una vez confirmada por Supabase.
 */
export function clearPendingSubmission(activityKey, submissionId = null) {
  const key = `ueeh_pending_sub_${activityKey}`;
  if (submissionId) {
    const current = getPendingSubmission(activityKey);
    const currentId = current?.submissionId || current?.submission_id;
    if (currentId !== submissionId) return false;
  }
  sessionStorage.removeItem(key);
  return true;
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

  if (isRetry && pending) {
    subId = pending.submissionId || pending.submission_id || subId;
    submission = submission || pending.submission || pending.answers;
    runId = runId || pending.runId || pending.run_id;
    phase = phase || pending.phase;
    initialRunId = initialRunId || pending.initialRunId || pending.initial_run_id;
  }

  if (!subId) {
    subId = getOrCreateSubmissionId(activityKey);
  }

  let session;
  try {
    const { session: currentSession, error: sessionErr } = await getCurrentValidSession(supabase.auth);
    if (sessionErr || !currentSession) {
      return {
        success: false,
        state: "error",
        error: "Sesión no válida. Inicia sesión con tu cuenta institucional."
      };
    }
    // Keep the token in memory only; it is never included in the pending envelope.
    session = currentSession;
  } catch (authErr) {
    console.warn("No se pudo comprobar la sesión antes del envío:", authErr);
    return {
      success: false,
      state: "error",
      error: "No se pudo validar la sesión. Intenta nuevamente."
    };
  }

  const payloadRunId = runId || submission?.run_id;
  const payloadPhase = phase || submission?.phase || "initial";
  const payloadInitialRunId = initialRunId || submission?.initial_run_id;

  savePendingSubmission(activityKey, subId, submission, {
    runId: payloadRunId,
    phase: payloadPhase,
    initialRunId: payloadInitialRunId
  });

  let res;
  try {
    res = await fetch(SUBMIT_FUNCTION_URL, {
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
  } catch (netErr) {
    console.warn("Fallo de conexión en envío de actividad (se conserva pending para retry):", netErr);
    return {
      success: false,
      state: "pending_confirmation",
      error: "Sin respuesta del servidor. Tu entrega ha sido conservada en este navegador y puedes presionar 'Reintentar envío' sin generar un intento duplicado."
    };
  }

  let responseText;
  try {
    responseText = await res.text();
  } catch (bodyErr) {
    console.warn("La respuesta se interrumpió antes de recibirse completa; se conserva pending:", bodyErr);
    return {
      success: false,
      state: "pending_confirmation",
      error: "La respuesta del servidor se interrumpió. Tu entrega permanece guardada para un reintento seguro."
    };
  }

  // A complete HTTP response is a confirmed outcome, including 4xx/5xx.
  // Remove only the envelope that belongs to this exact submission.
  clearPendingSubmission(activityKey, subId);

  let body = {};
  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch (_) {
      body = {};
    }
  }

  if (res.ok && body.success) {
    return {
      success: true,
      state: "confirmed",
      data: body
    };
  }

  console.warn("[submit-activity-result]", {
    httpStatus: res.status,
    code: body.code || null,
    error: body.error || "Respuesta de error sin detalle"
  });

  return {
    success: false,
    state: "error",
    httpStatus: res.status,
    code: body.code,
    error: body.error || "No se pudo finalizar el registro. Tu progreso permanece guardado en Supabase; intenta nuevamente."
  };
}

/**
 * Consulta las actividades y resultados formateados directamente desde Supabase como fuente oficial.
 * Permite filtrar por unidad curricular específica (unitNumber) de forma data-driven.
 */
export async function fetchStudentActivitySummary(unitNumber = null) {
  let query = supabase
    .from("activities")
    .select("id, activity_key, title, activity_type, unit_number, max_score, minimum_score, opens_at, due_at, display_order")
    .eq("is_active", true);

  if (unitNumber !== null && unitNumber !== undefined) {
    query = query.eq("unit_number", Number(unitNumber));
  }

  const { data: activities, error: actErr } = await query
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

  let activeRunsSet = new Set();
  try {
    const { data: runs } = await supabase
      .from("activity_runs")
      .select("activity_id")
      .eq("status", "in_progress");

    if (Array.isArray(runs)) {
      activeRunsSet = new Set(runs.map((r) => r.activity_id));
    }
  } catch (_) {
    // Si la tabla no existe o error, continuar
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
        // Clear only a pending envelope that predates the confirmed server result.
        if (pendingLocal && res.last_completed_at && pendingLocal.savedAt &&
            new Date(res.last_completed_at) >= new Date(pendingLocal.savedAt)) {
          clearPendingSubmission(
            act.activity_key,
            pendingLocal.submissionId || pendingLocal.submission_id || null
          );
        }
      } else if (res.result_status === "not_submitted") {
        displayState = "OVERDUE";
        statusText = "🔴 No entregado — plazo vencido";
      }
    } else if (pendingLocal) {
      displayState = "PENDING_RETRY";
      statusText = "🟡 Pendiente de confirmar (respuesta de red incierta)";
    } else if (activeRunsSet.has(act.id)) {
      displayState = "IN_PROGRESS";
      statusText = "📝 En progreso";
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
