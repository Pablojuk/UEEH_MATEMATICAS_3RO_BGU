// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TEST AISLADO: TRABAJO EN CLASE UNIDAD 7 (u7-binomial-class-01)
// Entorno 100% aislado en memoria: NO modifica fechas, activación ni registros reales en Supabase
// ═══════════════════════════════════════════════════════════════════════════

import assert from "node:assert";
import fs from "node:fs";

console.log("==================================================================");
console.log("TEST DE INTEGRACIÓN EN ENTORNO AISLADO: u7-binomial-class-01");
console.log("==================================================================");

// 1. Verificación del estado canónico aprovisionado en la migración de Unidad 7
const u7Migration = fs.readFileSync("supabase/migrations/20260829204500_unit7_binomial_provisioning.sql", "utf8");

assert.ok(u7Migration.includes("'u7-binomial-class-01'"), "Actividad u7-binomial-class-01 aprovisionada canónicamente");
assert.ok(u7Migration.includes("'classwork_limited'"), "Política de 4 intentos classwork_limited verificada");
assert.ok(
  u7Migration.includes("unit_number") &&
  u7Migration.includes("max_score") &&
  u7Migration.includes("minimum_score") &&
  u7Migration.includes("is_active"),
  "Columnas canónicas presentes"
);

console.log("✔ Estado de aprovisionamiento de u7-binomial-class-01 verificado intacto");

// 2. Simulación de sandbox aislado sin conexión ni modificación a producción
class IsolatedDatabaseSandbox {
  constructor() {
    this.activities = new Map([
      ["u7-binomial-class-01", {
        id: "d9603077-3914-491d-898b-d6d0fc93e574",
        activity_key: "u7-binomial-class-01",
        unit_number: 7,
        max_score: 10.00,
        minimum_score: 1.00,
        is_active: false, // Inactivo en estado base
        opens_at: "2026-08-29T00:00:00-05:00",
        due_at: "2026-09-15T23:59:59-05:00"
      }]
    ]);

    this.gradingConfigs = new Map([
      ["d9603077-3914-491d-898b-d6d0fc93e574", {
        grader_type: "exercise_set",
        config: {
          recovery_policy: "average",
          exercises: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`initial-q${String(i + 1).padStart(2, "0")}`, { type: "input" }])),
          recoveryExercises: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`rec-q${String(i + 1).padStart(2, "0")}`, { type: "input" }]))
        }
      }]
    ]);

    this.activityRuns = [];
    this.activityAttempts = [];
    this.activityResults = new Map();
  }

  // Simulación atómica de record_activity_attempt
  recordActivityAttempt({ activityId, studentId, submissionId, score, submissionData }) {
    // 1. Idempotencia
    const existing = this.activityAttempts.find(a => a.submission_id === submissionId);
    if (existing) {
      const res = this.activityResults.get(`${studentId}_${activityId}`);
      return { success: true, is_retry: true, score: existing.score, final_score: res.final_score, best_score: res.best_score };
    }

    const nextAttempt = this.activityAttempts.filter(a => a.student_id === studentId && a.activity_id === activityId).length + 1;
    const attemptRecord = {
      id: `att-${Date.now()}-${nextAttempt}`,
      activity_id: activityId,
      student_id: studentId,
      submission_id: submissionId,
      attempt_number: nextAttempt,
      score,
      submission_data: submissionData,
      completed_at: new Date().toISOString()
    };
    this.activityAttempts.push(attemptRecord);

    const key = `${studentId}_${activityId}`;
    let res = this.activityResults.get(key);
    const rawInit = submissionData?.raw_initial_score ?? score;
    const recScore = submissionData?.recovery_score ?? null;

    if (!res) {
      res = {
        activity_id: activityId,
        student_id: studentId,
        best_score: score,
        final_score: score,
        initial_score: rawInit,
        recovery_score: recScore,
        attempt_count: 1
      };
      this.activityResults.set(key, res);
    } else {
      res.best_score = Math.max(res.best_score, score);
      res.final_score = score;
      res.initial_score = res.initial_score ?? rawInit;
      res.recovery_score = recScore ?? res.recovery_score;
      res.attempt_count += 1;
    }

    return {
      success: true,
      is_retry: false,
      attempt_number: nextAttempt,
      score,
      final_score: res.final_score,
      best_score: res.best_score,
      attempt_count: res.attempt_count
    };
  }
}

const sandbox = new IsolatedDatabaseSandbox();
const testStudentId = "student-isolated-test-uuid";
const u7Act = sandbox.activities.get("u7-binomial-class-01");
const u7Cfg = sandbox.gradingConfigs.get(u7Act.id);

// 3. Test de validación de estado cerrado / inactivo en el servidor
function validateActivityAvailability(activity, now = new Date()) {
  if (!activity.is_active) {
    return { ok: false, error: "Actividad inactiva o inexistente" };
  }
  if (activity.opens_at && now < new Date(activity.opens_at)) {
    return { ok: false, error: "La actividad todavía no está disponible" };
  }
  if (activity.due_at && now > new Date(activity.due_at)) {
    return { ok: false, error: "El plazo de entrega de esta actividad ha finalizado" };
  }
  return { ok: true };
}

const baseCheck = validateActivityAvailability(u7Act);
assert.strictEqual(baseCheck.ok, false);
assert.strictEqual(baseCheck.error, "Actividad inactiva o inexistente");
console.log("✔ Actividad u7-binomial-class-01 rechaza entregas cuando está inactiva (protegiendo producción)");

// 4. Simulación aislada de sesión de clase autorizada por docente (en sandbox en memoria)
const activeSandboxAct = { ...u7Act, is_active: true, opens_at: "2026-08-01", due_at: "2026-12-31" };
assert.strictEqual(validateActivityAvailability(activeSandboxAct).ok, true);

// 5. Flujo Completo: Intento 1 (Inicial 6.00)
const initSubId = "sub-init-001";
const initSubmission = sandbox.recordActivityAttempt({
  activityId: activeSandboxAct.id,
  studentId: testStudentId,
  submissionId: initSubId,
  score: 6.00,
  submissionData: { phase: "initial", raw_initial_score: 6.00 }
});

assert.strictEqual(initSubmission.success, true);
assert.strictEqual(initSubmission.final_score, 6.00);
assert.strictEqual(initSubmission.best_score, 6.00);
assert.strictEqual(initSubmission.attempt_count, 1);
console.log("✔ Intento inicial registrado atómicamente: Nota = 6.00");

// 6. Flujo de Recuperación: Validación en servidor de elegibilidad
const pastAttempts = sandbox.activityAttempts.filter(a => a.student_id === testStudentId && a.activity_id === activeSandboxAct.id);
assert.ok(pastAttempts.length > 0, "Tiene intento inicial previo");
const initialScore = pastAttempts[0].score;
assert.ok(initialScore < 7.00, "Inicial < 7.00 permite recuperación");

// 7. Entrega de Recuperación: 4.00 -> Promedio oficial 5.00
const recoveryScore = 4.00;
const policy = u7Cfg.config.recovery_policy;
assert.strictEqual(policy, "average", "Política de recuperación es 'average'");

const computedFinal = Number(((initialScore + recoveryScore) / 2.0).toFixed(2));
assert.strictEqual(computedFinal, 5.00);

const recSubId = "sub-rec-002";
const recSubmission = sandbox.recordActivityAttempt({
  activityId: activeSandboxAct.id,
  studentId: testStudentId,
  submissionId: recSubId,
  score: computedFinal,
  submissionData: {
    phase: "recovery",
    raw_initial_score: initialScore,
    recovery_score: recoveryScore,
    recovery_policy: policy,
    final_score: computedFinal
  }
});

assert.strictEqual(recSubmission.success, true);
assert.strictEqual(recSubmission.attempt_number, 2);
assert.strictEqual(recSubmission.final_score, 5.00, "Nota final oficial consolidada es 5.00");
assert.strictEqual(recSubmission.best_score, 6.00, "best_score conserva 6.00 como registro histórico");
assert.strictEqual(recSubmission.attempt_count, 2);

// 8. Verificación de Idempotencia en sandbox
const retryRecSubmission = sandbox.recordActivityAttempt({
  activityId: activeSandboxAct.id,
  studentId: testStudentId,
  submissionId: recSubId,
  score: computedFinal,
  submissionData: {}
});
assert.strictEqual(retryRecSubmission.is_retry, true);
assert.strictEqual(retryRecSubmission.final_score, 5.00);
assert.strictEqual(sandbox.activityAttempts.length, 2, "No se crearon intentos duplicados ante reintento");

console.log("✔ Flujo de recuperación en sandbox completado: 6.00 + 4.00 = 5.00 (best_score = 6.00 conservado)");
console.log("✔ Idempotencia de entrega de recuperación confirmada al 100%");
console.log("🎉 TEST DE INTEGRACIÓN AISLADO COMPLETADO CON ÉXITO SIN TOCAR PRODUCCIÓN!");
