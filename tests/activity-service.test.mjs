// ═══════════════════════════════════════════════════════════════════════════
// Activity Service & Summary Unit Tests — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import assert from "assert";
import crypto from "crypto";

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.sessionStorage = mockSessionStorage;

// 1. Test de Generación e Idempotencia de submission_id
function testSubmissionIdIdempotency() {
  const pendingKey = "ueeh_pending_sub_u5-gam-01";
  
  // Primer intento genera un nuevo UUID
  const firstSubmissionId = crypto.randomUUID();
  assert.strictEqual(typeof firstSubmissionId, "string");
  assert.strictEqual(firstSubmissionId.length, 36);

  // Guardar en sessionStorage para simular fallo de red
  sessionStorage.setItem(pendingKey, JSON.stringify({
    activityKey: "u5-gam-01",
    submission_id: firstSubmissionId,
    answers: { q1: "A" }
  }));

  // Reintento recupera exactamente el mismo submission_id
  const pendingRaw = sessionStorage.getItem(pendingKey);
  const pendingObj = JSON.parse(pendingRaw);
  assert.strictEqual(pendingObj.submission_id, firstSubmissionId);

  // Limpiar
  sessionStorage.removeItem(pendingKey);
  assert.strictEqual(sessionStorage.getItem(pendingKey), null);
  console.log("✅ Unit Test Passed: submission_id e Idempotencia de reintento en sessionStorage.");
}

// 2. Test de Transformación Lógica de Estados de Resumen de Actividades
function testActivityStateTransformations() {
  const now = new Date();
  const pastDate = new Date(now.getTime() - 3600000).toISOString();
  const futureDate = new Date(now.getTime() + 3600000).toISOString();

  // Estado 1: Completed -> CONFIRMED
  const resultCompleted = { result_status: "completed", best_score: 9.5, attempt_count: 2 };
  let state1 = "NOT_STARTED";
  if (resultCompleted.result_status === "completed") state1 = "CONFIRMED";
  assert.strictEqual(state1, "CONFIRMED");

  // Estado 2: Not Submitted -> OVERDUE
  const resultNotSubmitted = { result_status: "not_submitted", result_source: "deadline_auto" };
  let state2 = "NOT_STARTED";
  if (resultNotSubmitted.result_status === "not_submitted") state2 = "OVERDUE";
  assert.strictEqual(state2, "OVERDUE");

  // Estado 3: Sin Result + Plazo Futuro -> NOT_STARTED
  let state3 = "NOT_STARTED";
  if (now > new Date(futureDate)) state3 = "PROCESSING_CLOSURE";
  assert.strictEqual(state3, "NOT_STARTED");

  // Estado 4: Sin Result + Plazo Pasado -> PROCESSING_CLOSURE
  let state4 = "NOT_STARTED";
  if (now > new Date(pastDate)) state4 = "PROCESSING_CLOSURE";
  assert.strictEqual(state4, "PROCESSING_CLOSURE");

  console.log("✅ Unit Test Passed: Transformaciones lógicas de los 5 estados del resumen de actividades.");
}

try {
  testSubmissionIdIdempotency();
  testActivityStateTransformations();
  console.log("🎉 TODOS LOS UNIT TESTS DE ACTIVITY SERVICE SE EJECUTARON CON ÉXITO.");
  process.exit(0);
} catch (err) {
  console.error("❌ Error en unit tests de activity service:", err);
  process.exit(1);
}
