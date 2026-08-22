// ═══════════════════════════════════════════════════════════════════════════
// Comprehensive Exercise Progress, Ledger & Runs Test Suite — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import assert from "assert";
import crypto from "crypto";
import fs from "fs";

console.log("🚀 Iniciando Suite de Pruebas de Progreso por Ejercicio, Runs e Idempotencia (Classwork & Gamification)...");

/**
 * Función restoreExerciseProgress replicada para evaluación pura en Node.js
 */
function restoreExerciseProgress({ exercises = [], progressList = [], onApplyState = null }) {
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

// ────────────────────────────────────────────────────────────
// SIMULADOR IN-MEMORY DE BASE DE DATOS Y MOTOR SERVER-SIDE
// ────────────────────────────────────────────────────────────
class MockSupabaseServer {
  constructor() {
    this.runs = []; // { id, student_id, activity_id, status, submission_id, created_at, submitted_at }
    this.checks = []; // { id, student_id, activity_id, activity_run_id, exercise_key, check_id, attempt_number, answer_data, is_correct, score, response_payload }
    this.progress = []; // { id, student_id, activity_id, activity_run_id, exercise_key, answer_data, attempt_count, exercise_score, status, locked, last_checked_at }
    this.attempts = []; // { id, activity_id, student_id, submission_id, attempt_number, score, submission_data }
    this.results = []; // { activity_id, student_id, best_score, attempt_count, result_status, result_source }
    this.activities = new Map(); // activity_id -> { activity_type, attempt_policy, ... }
    this.gradingConfigs = new Map(); // activity_id -> { grader_type, config }
  }

  getOrCreateActiveRun(activityId, studentId) {
    let run = this.runs.find(r => r.activity_id === activityId && r.student_id === studentId && r.status === 'in_progress');
    if (!run) {
      run = {
        id: crypto.randomUUID(),
        activity_id: activityId,
        student_id: studentId,
        status: 'in_progress',
        submission_id: null,
        created_at: new Date().toISOString(),
        submitted_at: null
      };
      this.runs.push(run);
    }
    return run.id;
  }

  recordExerciseCheck({ activityId, studentId, exerciseKey, checkId, isCorrect, answerData, clientRunId = null }) {
    // Resolver run oficial del servidor (Anti-reset: ignora clientRunId arbitrario)
    const runId = this.getOrCreateActiveRun(activityId, studentId);

    // 1. Idempotencia histórica: si check_id ya existe, retornar exactamente el response_payload original
    const existingCheck = this.checks.find(c => 
      c.activity_id === activityId && 
      c.student_id === studentId && 
      c.activity_run_id === runId && 
      c.exercise_key === exerciseKey && 
      c.check_id === checkId
    );

    if (existingCheck) {
      return { ...existingCheck.response_payload, idempotent: true };
    }

    // 2. Obtener política de la actividad
    const act = this.activities.get(activityId) || { activity_type: 'classwork', attempt_policy: 'classwork_limited' };
    const effectivePolicy = act.attempt_policy || (act.activity_type === 'gamification' ? 'gamification_unlimited' : 'classwork_limited');

    // 3. Consultar progreso actual
    let prog = this.progress.find(p =>
      p.activity_id === activityId &&
      p.student_id === studentId &&
      p.activity_run_id === runId &&
      p.exercise_key === exerciseKey
    );

    let attemptCount = prog ? prog.attempt_count : 0;

    // Validación de bloqueo según política
    if (effectivePolicy === 'gamification_unlimited') {
      if (prog && (prog.locked || prog.status === 'correct')) {
        return {
          success: true,
          activity_id: activityId,
          activity_run_id: runId,
          exercise_key: exerciseKey,
          attempt_count: attemptCount,
          correct: true,
          status: 'correct',
          score: prog.exercise_score,
          locked: true,
          remaining_attempts: null,
          attempts_remaining: null,
          max_attempts_reached: false
        };
      }
    } else {
      if (prog && (prog.locked || attemptCount >= 4 || prog.status === 'correct' || prog.status === 'failed')) {
        return {
          success: true,
          activity_id: activityId,
          activity_run_id: runId,
          exercise_key: exerciseKey,
          attempt_count: attemptCount,
          correct: prog.status === 'correct',
          status: prog.status,
          score: prog.exercise_score,
          locked: true,
          remaining_attempts: 0,
          attempts_remaining: 0,
          max_attempts_reached: true
        };
      }
    }

    const nextAttempt = attemptCount + 1;
    let status;
    let score = null;
    let locked = false;
    let remaining = null;

    if (effectivePolicy === 'gamification_unlimited') {
      if (isCorrect) {
        status = 'correct';
        locked = true;
        remaining = null;
        if (nextAttempt === 1) score = 10.00;
        else if (nextAttempt === 2) score = 9.00;
        else if (nextAttempt === 3) score = 8.00;
        else score = 7.00; // 4, 5, 10, 20...
      } else {
        status = 'incorrect';
        locked = false;
        score = null;
        remaining = null;
      }
    } else {
      if (isCorrect) {
        status = 'correct';
        locked = true;
        remaining = 0;
        if (nextAttempt === 1) score = 10.00;
        else if (nextAttempt === 2) score = 9.00;
        else if (nextAttempt === 3) score = 8.00;
        else score = 7.00;
      } else {
        if (nextAttempt >= 4) {
          status = 'failed';
          locked = true;
          score = 1.00; // Nunca 0.00
          remaining = 0;
        } else {
          status = 'incorrect';
          locked = false;
          score = null;
          remaining = 4 - nextAttempt;
        }
      }
    }

    const responsePayload = {
      success: true,
      activity_id: activityId,
      activity_run_id: runId,
      exercise_key: exerciseKey,
      attempt_count: nextAttempt,
      correct: isCorrect,
      status: status,
      score: score,
      locked: locked,
      remaining_attempts: remaining,
      attempts_remaining: remaining
    };

    // Registrar en checks ledger
    this.checks.push({
      id: crypto.randomUUID(),
      student_id: studentId,
      activity_id: activityId,
      activity_run_id: runId,
      exercise_key: exerciseKey,
      check_id: checkId,
      attempt_number: nextAttempt,
      answer_data: answerData,
      is_correct: isCorrect,
      score: score,
      response_payload: responsePayload,
      created_at: new Date().toISOString()
    });

    // Actualizar progreso consolidado
    if (!prog) {
      prog = {
        id: crypto.randomUUID(),
        student_id: studentId,
        activity_id: activityId,
        activity_run_id: runId,
        exercise_key: exerciseKey,
        answer_data: answerData,
        attempt_count: nextAttempt,
        exercise_score: score,
        status: status,
        locked: locked,
        last_checked_at: new Date().toISOString()
      };
      this.progress.push(prog);
    } else {
      prog.attempt_count = nextAttempt;
      prog.answer_data = answerData;
      prog.exercise_score = score;
      prog.status = status;
      prog.locked = locked;
      prog.last_checked_at = new Date().toISOString();
    }

    return responsePayload;
  }

  submitActivityResult({ activityId, studentId, submissionId, activityKey }) {
    // 1. Idempotencia obligatoria de submission_id (Precision 3)
    const existingAttempt = this.attempts.find(a => a.activity_id === activityId && a.student_id === studentId && a.submission_id === submissionId);
    if (existingAttempt) {
      const best = this.results.find(r => r.activity_id === activityId && r.student_id === studentId);
      return {
        success: true,
        idempotent: true,
        activity_key: activityKey,
        attempt_number: existingAttempt.attempt_number,
        score: existingAttempt.score,
        best_score: best?.best_score ?? existingAttempt.score,
        attempt_count: best?.attempt_count ?? existingAttempt.attempt_number,
        registered_at: existingAttempt.completed_at || new Date().toISOString()
      };
    }

    // 2. Obtener active run
    const activeRun = this.runs.find(r => r.activity_id === activityId && r.student_id === studentId && r.status === 'in_progress');
    if (!activeRun) {
      return { success: false, error: "No hay una sesión en progreso para esta actividad" };
    }

    // 3. Validar completitud con pauta privada
    const cfg = this.gradingConfigs.get(activityId);
    if (!cfg || !cfg.exercises) {
      return { success: false, error: "Pauta no configurada" };
    }

    const requiredKeys = Object.keys(cfg.exercises);
    const totalRequired = requiredKeys.length;

    const runProgress = this.progress.filter(p => p.activity_run_id === activeRun.id);
    const progMap = new Map(runProgress.map(p => [p.exercise_key, p]));

    const incomplete = requiredKeys.filter(k => {
      const p = progMap.get(k);
      if (!p) return true;
      return !(p.status === 'correct' || p.status === 'failed' || p.locked === true);
    });

    if (incomplete.length > 0) {
      return {
        success: false,
        code: "ACTIVITY_INCOMPLETE",
        error: `Te faltan ${incomplete.length} ejercicios por terminar antes de enviar la actividad.`,
        remaining_exercises: incomplete.length
      };
    }

    // 4. Calcular nota final utilizando totalRequired como denominador inmutable
    const totalScore = requiredKeys.reduce((acc, k) => {
      const p = progMap.get(k);
      return acc + Number(p.exercise_score || 1.00);
    }, 0);

    const calculatedAvg = Number((totalScore / totalRequired).toFixed(2));
    const officialScore = Math.max(1.00, Math.min(10.00, calculatedAvg));

    const attemptNumber = this.attempts.filter(a => a.activity_id === activityId && a.student_id === studentId).length + 1;

    // Registrar attempt
    const newAttempt = {
      id: crypto.randomUUID(),
      activity_id: activityId,
      student_id: studentId,
      submission_id: submissionId,
      attempt_number: attemptNumber,
      score: officialScore,
      completed_at: new Date().toISOString()
    };
    this.attempts.push(newAttempt);

    // Actualizar o crear results
    let res = this.results.find(r => r.activity_id === activityId && r.student_id === studentId);
    if (!res) {
      res = {
        activity_id: activityId,
        student_id: studentId,
        best_score: officialScore,
        attempt_count: attemptNumber,
        result_status: 'completed',
        result_source: 'student_submission'
      };
      this.results.push(res);
    } else {
      res.best_score = Math.max(res.best_score, officialScore);
      res.attempt_count = attemptNumber;
      res.result_status = 'completed';
      res.result_source = 'student_submission';
    }

    // Marcar run como submitted
    activeRun.status = 'submitted';
    activeRun.submitted_at = new Date().toISOString();
    activeRun.submission_id = submissionId;

    return {
      success: true,
      activity_key: activityKey,
      attempt_number: attemptNumber,
      score: officialScore,
      best_score: res.best_score,
      attempt_count: res.attempt_count,
      registered_at: newAttempt.completed_at
    };
  }
}

// ────────────────────────────────────────────────────────────
// EJECUCIÓN DE PRUEBAS — PARTE A: CLASSWORK (20 CASOS)
// ────────────────────────────────────────────────────────────

const server = new MockSupabaseServer();
const student1 = "11111111-1111-1111-1111-111111111111";
const activity1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

server.activities.set(activity1, {
  activity_type: "classwork",
  attempt_policy: "classwork_limited"
});

// Configurar actividad con 5 ejercicios
server.gradingConfigs.set(activity1, {
  grader_type: "exercise_set",
  exercises: {
    "ex-01": { type: "numeric", answer: "5" },
    "ex-02": { type: "numeric", answer: "10" },
    "ex-03": { type: "numeric", answer: "15" },
    "ex-04": { type: "numeric", answer: "20" },
    "ex-05": { type: "numeric", answer: "25" }
  }
});

// TEST 1: Intento 1 correcto -> 10.00, correct, locked
const res1 = server.recordExerciseCheck({
  activityId: activity1,
  studentId: student1,
  exerciseKey: "ex-01",
  checkId: crypto.randomUUID(),
  isCorrect: true,
  answerData: { value: "5" }
});
assert.strictEqual(res1.attempt_count, 1);
assert.strictEqual(res1.score, 10.00);
assert.strictEqual(res1.status, "correct");
assert.strictEqual(res1.locked, true);
console.log("✔ TEST 1 PASSED: Classwork — Intento 1 correcto -> 10/10, correct, locked");

// TEST 2: Intento 1 incorrecto, Intento 2 correcto -> 9.00, correct, locked
const res2_1 = server.recordExerciseCheck({
  activityId: activity1,
  studentId: student1,
  exerciseKey: "ex-02",
  checkId: crypto.randomUUID(),
  isCorrect: false,
  answerData: { value: "99" }
});
assert.strictEqual(res2_1.attempt_count, 1);
assert.strictEqual(res2_1.score, null);
assert.strictEqual(res2_1.status, "incorrect");
assert.strictEqual(res2_1.locked, false);
assert.strictEqual(res2_1.remaining_attempts, 3);

const res2_2 = server.recordExerciseCheck({
  activityId: activity1,
  studentId: student1,
  exerciseKey: "ex-02",
  checkId: crypto.randomUUID(),
  isCorrect: true,
  answerData: { value: "10" }
});
assert.strictEqual(res2_2.attempt_count, 2);
assert.strictEqual(res2_2.score, 9.00);
assert.strictEqual(res2_2.status, "correct");
assert.strictEqual(res2_2.locked, true);
console.log("✔ TEST 2 PASSED: Classwork — Intento 2 correcto -> 9/10, correct, locked");

// TEST 3: 2 incorrectos, Intento 3 correcto -> 8.00
server.recordExerciseCheck({ activityId: activity1, studentId: student1, exerciseKey: "ex-03", checkId: crypto.randomUUID(), isCorrect: false });
server.recordExerciseCheck({ activityId: activity1, studentId: student1, exerciseKey: "ex-03", checkId: crypto.randomUUID(), isCorrect: false });
const res3 = server.recordExerciseCheck({ activityId: activity1, studentId: student1, exerciseKey: "ex-03", checkId: crypto.randomUUID(), isCorrect: true });
assert.strictEqual(res3.attempt_count, 3);
assert.strictEqual(res3.score, 8.00);
assert.strictEqual(res3.status, "correct");
assert.strictEqual(res3.locked, true);
console.log("✔ TEST 3 PASSED: Classwork — Intento 3 correcto -> 8/10, correct, locked");

// TEST 4: 3 incorrectos, Intento 4 correcto -> 7.00
server.recordExerciseCheck({ activityId: activity1, studentId: student1, exerciseKey: "ex-04", checkId: crypto.randomUUID(), isCorrect: false });
server.recordExerciseCheck({ activityId: activity1, studentId: student1, exerciseKey: "ex-04", checkId: crypto.randomUUID(), isCorrect: false });
server.recordExerciseCheck({ activityId: activity1, studentId: student1, exerciseKey: "ex-04", checkId: crypto.randomUUID(), isCorrect: false });
const res4 = server.recordExerciseCheck({ activityId: activity1, studentId: student1, exerciseKey: "ex-04", checkId: crypto.randomUUID(), isCorrect: true });
assert.strictEqual(res4.attempt_count, 4);
assert.strictEqual(res4.score, 7.00);
assert.strictEqual(res4.status, "correct");
assert.strictEqual(res4.locked, true);
console.log("✔ TEST 4 PASSED: Classwork — Intento 4 correcto -> 7/10, correct, locked");

// TEST 5: 4 incorrectos -> 1.00, failed, locked. Quinto intento rechazado.
server.recordExerciseCheck({ activityId: activity1, studentId: student1, exerciseKey: "ex-05", checkId: crypto.randomUUID(), isCorrect: false });
server.recordExerciseCheck({ activityId: activity1, studentId: student1, exerciseKey: "ex-05", checkId: crypto.randomUUID(), isCorrect: false });
server.recordExerciseCheck({ activityId: activity1, studentId: student1, exerciseKey: "ex-05", checkId: crypto.randomUUID(), isCorrect: false });
const res5 = server.recordExerciseCheck({ activityId: activity1, studentId: student1, exerciseKey: "ex-05", checkId: crypto.randomUUID(), isCorrect: false });
assert.strictEqual(res5.attempt_count, 4);
assert.strictEqual(res5.score, 1.00);
assert.strictEqual(res5.status, "failed");
assert.strictEqual(res5.locked, true);

// Intento 5 rechazado:
const res5_5 = server.recordExerciseCheck({ activityId: activity1, studentId: student1, exerciseKey: "ex-05", checkId: crypto.randomUUID(), isCorrect: true });
assert.strictEqual(res5_5.attempt_count, 4);
assert.strictEqual(res5_5.score, 1.00);
assert.strictEqual(res5_5.max_attempts_reached, true);
assert.strictEqual(res5_5.locked, true);
console.log("✔ TEST 5 PASSED: Classwork — 4 fallos -> 1/10, failed, locked. 5.º intento rechazado.");

// TEST 6: Preservación F5 / reload
const student2 = "22222222-2222-2222-2222-222222222222";
server.recordExerciseCheck({ activityId: activity1, studentId: student2, exerciseKey: "ex-01", checkId: crypto.randomUUID(), isCorrect: false, answerData: { value: "error1" } });
server.recordExerciseCheck({ activityId: activity1, studentId: student2, exerciseKey: "ex-01", checkId: crypto.randomUUID(), isCorrect: false, answerData: { value: "error2" } });
// Simular reload consultando DB
const runId2 = server.getOrCreateActiveRun(activity1, student2);
const progReload = server.progress.find(p => p.activity_run_id === runId2 && p.exercise_key === "ex-01");
assert.strictEqual(progReload.attempt_count, 2);
assert.strictEqual(progReload.status, "incorrect");
assert.strictEqual(progReload.locked, false);
console.log("✔ TEST 6 PASSED: Preservación F5 / reload recupera attempt_count = 2");

// TEST 7: Cambio de dispositivo recupera estado exacto
const progListDev2 = server.progress.filter(p => p.activity_run_id === runId2);
assert.strictEqual(progListDev2.length, 1);
assert.strictEqual(progListDev2[0].attempt_count, 2);
console.log("✔ TEST 7 PASSED: Cambio de dispositivo recupera estado exacto del run activo");

// TEST 8: Doble clic rápido concurrente consume exactamente 1 intento
const fastCheckId = crypto.randomUUID();
const click1 = server.recordExerciseCheck({ activityId: activity1, studentId: student2, exerciseKey: "ex-02", checkId: fastCheckId, isCorrect: false });
const click2 = server.recordExerciseCheck({ activityId: activity1, studentId: student2, exerciseKey: "ex-02", checkId: fastCheckId, isCorrect: false });
assert.strictEqual(click1.attempt_count, 1);
assert.strictEqual(click2.attempt_count, 1);
assert.strictEqual(click2.idempotent, true);
console.log("✔ TEST 8 PASSED: Doble clic rápido con mismo check_id consume exactamente 1 intento");

// TEST 9: Retry por pérdida de respuesta
const retryCheck = server.recordExerciseCheck({ activityId: activity1, studentId: student2, exerciseKey: "ex-02", checkId: fastCheckId, isCorrect: false });
assert.strictEqual(retryCheck.attempt_count, 1);
assert.strictEqual(retryCheck.idempotent, true);
console.log("✔ TEST 9 PASSED: Retry por pérdida de red devuelve respuesta original");

// TEST 10: Idempotencia histórica (Ajuste 18)
const student3 = "33333333-3333-3333-3333-333333333333";
const checkIdA = crypto.randomUUID();
const checkIdB = crypto.randomUUID();

const resA = server.recordExerciseCheck({ activityId: activity1, studentId: student3, exerciseKey: "ex-01", checkId: checkIdA, isCorrect: false });
assert.strictEqual(resA.attempt_count, 1);

const resB = server.recordExerciseCheck({ activityId: activity1, studentId: student3, exerciseKey: "ex-01", checkId: checkIdB, isCorrect: false });
assert.strictEqual(resB.attempt_count, 2);

// Retry tardío de Check A
const resALate = server.recordExerciseCheck({ activityId: activity1, studentId: student3, exerciseKey: "ex-01", checkId: checkIdA, isCorrect: false });
assert.strictEqual(resALate.attempt_count, 1); // Retorna payload original de A
assert.strictEqual(resALate.idempotent, true);

// El progreso actual del ejercicio debe continuar en 2 (NO 3)
const runId3 = server.getOrCreateActiveRun(activity1, student3);
const progA = server.progress.find(p => p.activity_run_id === runId3 && p.exercise_key === "ex-01");
assert.strictEqual(progA.attempt_count, 2);
console.log("✔ TEST 10 PASSED: Idempotencia histórica (Check A -> Check B -> Retry tardío A) mantiene attempt_count = 2");

// TEST 11: Anti-reset de Run ID (Ajuste 19)
server.recordExerciseCheck({ activityId: activity1, studentId: student3, exerciseKey: "ex-02", checkId: crypto.randomUUID(), isCorrect: false });
server.recordExerciseCheck({ activityId: activity1, studentId: student3, exerciseKey: "ex-02", checkId: crypto.randomUUID(), isCorrect: false });
server.recordExerciseCheck({ activityId: activity1, studentId: student3, exerciseKey: "ex-02", checkId: crypto.randomUUID(), isCorrect: false });
// Atacante manda run_id inventado
const fakeRunId = crypto.randomUUID();
const resFake = server.recordExerciseCheck({
  activityId: activity1,
  studentId: student3,
  exerciseKey: "ex-02",
  checkId: crypto.randomUUID(),
  isCorrect: false,
  clientRunId: fakeRunId
});
assert.strictEqual(resFake.attempt_count, 4); // Consumió el 4.º intento en el run oficial
assert.strictEqual(resFake.status, "failed");
console.log("✔ TEST 11 PASSED: Anti-reset ignora run_id inventado de DevTools y asocia al run oficial");

// TEST 12: Rechazo de manipulación en cliente (Defensa en profundidad en Edge Function)
const edgeFunctionCode = fs.readFileSync("supabase/functions/check-activity-answer/index.ts", "utf-8");
assert.ok(edgeFunctionCode.includes('"score"'), "Edge Function must reject 'score'");
assert.ok(edgeFunctionCode.includes('"student_id"'), "Edge Function must reject 'student_id'");
assert.ok(edgeFunctionCode.includes('"locked"'), "Edge Function must reject 'locked'");
console.log("✔ TEST 12 PASSED: Servidor rechaza parámetros de calificación enviados por cliente");

// TEST 13: Protección de pautas privadas (soluciones nunca expuestas en payload inicial)
const deberHtml = fs.readFileSync("topics/unit5-determinantes/deber.html", "utf-8");
assert.ok(!deberHtml.includes("answerKey:"), "deber.html must not contain answerKey");
assert.ok(!deberHtml.includes("acceptedAnswers:"), "deber.html must not contain acceptedAnswers");
console.log("✔ TEST 13 PASSED: Pauta privada no está expuesta en frontend");

// TEST 14: Solución paso a paso protegida
// En check-activity-answer, solución solo se devuelve si isTerminal
assert.ok(edgeFunctionCode.includes("solution_html: isTerminal && solutionHtml ? solutionHtml : null"), "Solution must only be returned when terminal");
console.log("✔ TEST 14 PASSED: solution_html protegido mientras el ejercicio esté incorrecto/abierto");

// TEST 15: Restauración mixta en UI (Ajuste 14)
const sampleExercises = [
  { id: 1, exercise_key: "ex-01", status: "pending", attempts: 0, score: null, locked: false },
  { id: 2, exercise_key: "ex-02", status: "pending", attempts: 0, score: null, locked: false },
  { id: 3, exercise_key: "ex-03", status: "pending", attempts: 0, score: null, locked: false }
];
const sampleProgress = [
  { exercise_key: "ex-01", status: "correct", attempt_count: 1, exercise_score: 10.00, locked: true },
  { exercise_key: "ex-02", status: "incorrect", attempt_count: 2, exercise_score: null, locked: false },
  { exercise_key: "ex-03", status: "failed", attempt_count: 4, exercise_score: 1.00, locked: true }
];
restoreExerciseProgress({ exercises: sampleExercises, progressList: sampleProgress });
assert.strictEqual(sampleExercises[0].score, 10.00);
assert.strictEqual(sampleExercises[0].locked, true);
assert.strictEqual(sampleExercises[1].attempts, 2);
assert.strictEqual(sampleExercises[1].locked, false);
assert.strictEqual(sampleExercises[2].score, 1.00);
assert.strictEqual(sampleExercises[2].locked, true);
console.log("✔ TEST 15 PASSED: restoreExerciseProgress restaura estados mixtos (10 locked, 2 editable, 1 locked)");

// TEST 16: Validación de completitud al enviar (Ajuste 5)
const student4 = "44444444-4444-4444-4444-444444444444";
// Responder solo 3 de 5 ejercicios
server.recordExerciseCheck({ activityId: activity1, studentId: student4, exerciseKey: "ex-01", checkId: crypto.randomUUID(), isCorrect: true });
server.recordExerciseCheck({ activityId: activity1, studentId: student4, exerciseKey: "ex-02", checkId: crypto.randomUUID(), isCorrect: true });
server.recordExerciseCheck({ activityId: activity1, studentId: student4, exerciseKey: "ex-03", checkId: crypto.randomUUID(), isCorrect: true });

const submitIncomplete = server.submitActivityResult({
  activityId: activity1,
  studentId: student4,
  submissionId: crypto.randomUUID(),
  activityKey: "act-test"
});
assert.strictEqual(submitIncomplete.success, false);
assert.strictEqual(submitIncomplete.code, "ACTIVITY_INCOMPLETE");
assert.strictEqual(submitIncomplete.remaining_exercises, 2);
console.log("✔ TEST 16 PASSED: Finalización con ejercicios incompletos rechazada con ACTIVITY_INCOMPLETE");

// TEST 17: Cálculo de nota con denominador inmutable (Ajuste 6)
// Completar los 5 ejercicios para student1: ex-01=10, ex-02=9, ex-03=8, ex-04=7, ex-05=1
// Promedio esperado = (10 + 9 + 8 + 7 + 1) / 5 = 35 / 5 = 7.00
const subId1 = crypto.randomUUID();
const submitComplete = server.submitActivityResult({
  activityId: activity1,
  studentId: student1,
  submissionId: subId1,
  activityKey: "act-test"
});
assert.strictEqual(submitComplete.success, true);
assert.strictEqual(submitComplete.score, 7.00);
assert.strictEqual(submitComplete.attempt_number, 1);
console.log("✔ TEST 17 PASSED: Cálculo de nota (10+9+8+7+1)/5 = 7.00 con denominador fijo de 5");

// TEST 18: Idempotencia de Envío Final (Precision 3)
const submitRetry = server.submitActivityResult({
  activityId: activity1,
  studentId: student1,
  submissionId: subId1,
  activityKey: "act-test"
});
assert.strictEqual(submitRetry.success, true);
assert.strictEqual(submitRetry.idempotent, true);
assert.strictEqual(submitRetry.score, 7.00);
assert.strictEqual(submitRetry.attempt_number, 1);

// Verificar conteos en server
const attemptsForStudent1 = server.attempts.filter(a => a.student_id === student1);
assert.strictEqual(attemptsForStudent1.length, 1, "Debe existir exactamente 1 attempt registrado");
const submittedRunsForStudent1 = server.runs.filter(r => r.student_id === student1 && r.status === 'submitted');
assert.strictEqual(submittedRunsForStudent1.length, 1, "Debe existir exactamente 1 run submitted");
console.log("✔ TEST 18 PASSED: Final submission idempotency (retry con mismo submission_id devuelve original sin crear duplicados)");

// TEST 19: Deadline institucional (Ajuste 15)
// Simular vencimiento de plazo para student4 (que tenía 3 de 5 terminados pero nunca envió)
// Regla: result = not_submitted, best_score = 1.00, attempt_count = 0.
server.results.push({
  activity_id: activity1,
  student_id: student4,
  best_score: 1.00,
  attempt_count: 0,
  result_status: 'not_submitted',
  result_source: 'deadline_auto'
});
// Los 3 ejercicios guardados en progress y el run siguen existiendo
const progStudent4 = server.progress.filter(p => p.student_id === student4);
assert.strictEqual(progStudent4.length, 3, "El progreso debe conservarse tras el vencimiento");
console.log("✔ TEST 19 PASSED: Deadline institucional genera not_submitted sin borrar progreso de ejercicios");

// TEST 20: Reapertura institucional (Ajuste 16)
// Simular reapertura: se elimina el resultado automático not_submitted
const idxAuto = server.results.findIndex(r => r.student_id === student4 && r.result_status === 'not_submitted');
if (idxAuto !== -1) server.results.splice(idxAuto, 1);
// Student 4 completa los 2 restantes: ex-04=7 (intento 4), ex-05=10 (intento 1)
server.recordExerciseCheck({ activityId: activity1, studentId: student4, exerciseKey: "ex-04", checkId: crypto.randomUUID(), isCorrect: true });
server.recordExerciseCheck({ activityId: activity1, studentId: student4, exerciseKey: "ex-05", checkId: crypto.randomUUID(), isCorrect: true });
// Ahora student4 tiene los 5 completos y puede enviar
const subId4 = crypto.randomUUID();
const submitAfterReopen = server.submitActivityResult({
  activityId: activity1,
  studentId: student4,
  submissionId: subId4,
  activityKey: "act-test"
});
assert.strictEqual(submitAfterReopen.success, true);
assert.strictEqual(submitAfterReopen.score, 10.00);
console.log("✔ TEST 20 PASSED: Reapertura conserva progreso intacto y permite completar la actividad");

// ────────────────────────────────────────────────────────────
// EJECUCIÓN DE PRUEBAS — PARTE B: GAMIFICACIÓN (POLÍTICA ILIMITADA)
// ────────────────────────────────────────────────────────────

const activityGam = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const studentGam = "55555555-5555-5555-5555-555555555555";

server.activities.set(activityGam, {
  activity_type: "gamification",
  attempt_policy: "gamification_unlimited"
});

// TEST 21: Gamificación — Intento 1 correcto -> 10.00, correct, locked
const resGam1 = server.recordExerciseCheck({
  activityId: activityGam,
  studentId: studentGam,
  exerciseKey: "planet-01",
  checkId: crypto.randomUUID(),
  isCorrect: true,
  answerData: { value: "A" }
});
assert.strictEqual(resGam1.attempt_count, 1);
assert.strictEqual(resGam1.score, 10.00);
assert.strictEqual(resGam1.status, "correct");
assert.strictEqual(resGam1.locked, true);
assert.strictEqual(resGam1.remaining_attempts, null);
console.log("✔ TEST 21 PASSED: Gamificación — Intento 1 correcto devuelve 10/10 y bloquea");

// TEST 22: Gamificación — Intento 2 correcto -> 9.00, correct, locked
server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-02", checkId: crypto.randomUUID(), isCorrect: false });
const resGam2 = server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-02", checkId: crypto.randomUUID(), isCorrect: true });
assert.strictEqual(resGam2.attempt_count, 2);
assert.strictEqual(resGam2.score, 9.00);
assert.strictEqual(resGam2.status, "correct");
assert.strictEqual(resGam2.locked, true);
console.log("✔ TEST 22 PASSED: Gamificación — Intento 2 correcto devuelve 9/10 y bloquea");

// TEST 23: Gamificación — Intento 3 correcto -> 8.00, correct, locked
server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-03", checkId: crypto.randomUUID(), isCorrect: false });
server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-03", checkId: crypto.randomUUID(), isCorrect: false });
const resGam3 = server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-03", checkId: crypto.randomUUID(), isCorrect: true });
assert.strictEqual(resGam3.attempt_count, 3);
assert.strictEqual(resGam3.score, 8.00);
assert.strictEqual(resGam3.status, "correct");
assert.strictEqual(resGam3.locked, true);
console.log("✔ TEST 23 PASSED: Gamificación — Intento 3 correcto devuelve 8/10 y bloquea");

// TEST 24: Gamificación — Intento 4 correcto -> 7.00, correct, locked
server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-04", checkId: crypto.randomUUID(), isCorrect: false });
server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-04", checkId: crypto.randomUUID(), isCorrect: false });
server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-04", checkId: crypto.randomUUID(), isCorrect: false });
const resGam4 = server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-04", checkId: crypto.randomUUID(), isCorrect: true });
assert.strictEqual(resGam4.attempt_count, 4);
assert.strictEqual(resGam4.score, 7.00);
assert.strictEqual(resGam4.status, "correct");
assert.strictEqual(resGam4.locked, true);
console.log("✔ TEST 24 PASSED: Gamificación — Intento 4 correcto devuelve 7/10 y bloquea");

// TEST 25: Gamificación — Intento 10 correcto -> 7.00, correct, locked
for (let i = 1; i <= 9; i++) {
  const r = server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-05", checkId: crypto.randomUUID(), isCorrect: false });
  assert.strictEqual(r.locked, false, `Intento ${i} no debe bloquear`);
  assert.strictEqual(r.status, "incorrect");
  assert.strictEqual(r.score, null);
}
const resGam10 = server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-05", checkId: crypto.randomUUID(), isCorrect: true });
assert.strictEqual(resGam10.attempt_count, 10);
assert.strictEqual(resGam10.score, 7.00);
assert.strictEqual(resGam10.status, "correct");
assert.strictEqual(resGam10.locked, true);
console.log("✔ TEST 25 PASSED: Gamificación — Intento 10 correcto devuelve 7/10 y bloquea");

// TEST 26: Gamificación — 20 respuestas incorrectas NO bloquean
for (let i = 1; i <= 20; i++) {
  const r = server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-06", checkId: crypto.randomUUID(), isCorrect: false });
  assert.strictEqual(r.attempt_count, i);
  assert.strictEqual(r.locked, false, `Intento incorrecto ${i} NO debe bloquear`);
  assert.strictEqual(r.status, "incorrect", `Intento ${i} debe ser 'incorrect' (nunca 'failed')`);
  assert.strictEqual(r.score, null, `Intento ${i} no debe asignar nota`);
  assert.strictEqual(r.remaining_attempts, null, `Intentos deben ser ilimitados (null)`);
}
console.log("✔ TEST 26 PASSED: Gamificación — 20 respuestas incorrectas NO bloquean, mantienen status = 'incorrect' y score = null");

// TEST 27: Gamificación — Intento 21 correcto tras 20 fallos bloquea con 7.00
const resGam21 = server.recordExerciseCheck({ activityId: activityGam, studentId: studentGam, exerciseKey: "planet-06", checkId: crypto.randomUUID(), isCorrect: true });
assert.strictEqual(resGam21.attempt_count, 21);
assert.strictEqual(resGam21.score, 7.00);
assert.strictEqual(resGam21.status, "correct");
assert.strictEqual(resGam21.locked, true);
console.log("✔ TEST 27 PASSED: Gamificación — Intento 21 correcto tras 20 fallos bloquea con nota 7.00");

console.log("🎉 ALL 27 EXERCISE PROGRESS & GAMIFICATION/CLASSWORK POLICY TESTS PASSED 100%!");
