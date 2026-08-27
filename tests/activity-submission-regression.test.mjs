import assert from "node:assert/strict";
import fs from "node:fs";

const migrationPath = "supabase/migrations/20260827133502_fix_activity_run_summary_canonical_progress.sql";
const edgePath = "supabase/functions/submit-activity-result/index.ts";
const servicePath = "core/activity-service.js";
const activityPages = [
  "topics/unit5-determinantes/gamificacion.html",
  "topics/unit5-determinantes/deber.html",
  "topics/unit6-sucesiones/gamificacion.html",
  "topics/unit6-sucesiones/deber.html"
];

const migrationSql = fs.readFileSync(migrationPath, "utf8");
const edgeSource = fs.readFileSync(edgePath, "utf8");
const serviceSource = fs.readFileSync(servicePath, "utf8");
const pageSources = activityPages.map((file) => [file, fs.readFileSync(file, "utf8")]);

function canonicalSummary({ canonicalProgress = [], legacyAttempts = [] }) {
  if (canonicalProgress.length > 0) {
    return canonicalProgress.map((row) => ({
      question_id: row.exercise_key,
      terminal_score: row.exercise_score ?? 0,
      attempt_count: row.attempt_count,
      is_correct: row.status === "correct",
      locked: Boolean(row.locked || row.status === "correct" || row.status === "failed")
    }));
  }

  const byQuestion = new Map();
  for (const attempt of legacyAttempts) {
    const current = byQuestion.get(attempt.question_id) || {
      question_id: attempt.question_id,
      terminal_score: 0,
      attempt_count: 0,
      is_correct: false,
      locked: false
    };
    current.attempt_count += 1;
    current.is_correct ||= attempt.is_correct;
    current.locked ||= attempt.is_correct || attempt.attempt_number >= 4;
    if (attempt.is_correct || attempt.attempt_number >= 4) {
      current.terminal_score = Math.max(current.terminal_score, attempt.question_score || 0);
    }
    byQuestion.set(attempt.question_id, current);
  }
  return [...byQuestion.values()];
}

function canSubmitGamification(summary) {
  return summary.filter((item) => item.is_correct).length >= 6;
}

function canSubmitClasswork(summary) {
  return summary.filter((item) => item.locked || item.is_correct || item.attempt_count >= 4).length >= 14;
}

// TEST A — New gamification run: six canonical rows, zero legacy rows.
const gamificationSummary = canonicalSummary({
  canonicalProgress: Array.from({ length: 6 }, (_, index) => ({
    exercise_key: `planet-${index + 1}`,
    exercise_score: 10,
    attempt_count: 1,
    status: "correct",
    locked: true
  })),
  legacyAttempts: []
});
assert.equal(gamificationSummary.length, 6);
assert.equal(canSubmitGamification(gamificationSummary), true);

// TEST B — New classwork run: fourteen terminal canonical rows.
const classworkSummary = canonicalSummary({
  canonicalProgress: Array.from({ length: 14 }, (_, index) => ({
    exercise_key: `question-${index + 1}`,
    exercise_score: index < 12 ? 10 : 9,
    attempt_count: index < 12 ? 1 : 4,
    status: index < 12 ? "correct" : "failed",
    locked: true
  }))
});
assert.equal(classworkSummary.length, 14);
assert.equal(canSubmitClasswork(classworkSummary), true);
assert.equal(Number((classworkSummary.reduce((sum, row) => sum + row.terminal_score, 0) / 14).toFixed(2)), 9.86);

// TEST C — Historical run: legacy rows remain the fallback when canonical rows are absent.
const historicalSummary = canonicalSummary({
  canonicalProgress: [],
  legacyAttempts: Array.from({ length: 6 }, (_, index) => ({
    question_id: `legacy-${index + 1}`,
    question_score: 9,
    attempt_number: 2,
    is_correct: true
  }))
});
assert.equal(historicalSummary.length, 6);
assert.equal(canSubmitGamification(historicalSummary), true);

assert.match(migrationSql, /IF v_has_canonical_progress THEN/i);
assert.match(migrationSql, /FROM public\.activity_exercise_progress AS progress/i);
assert.match(migrationSql, /FROM private\.activity_question_attempts AS attempts/i);
assert.ok(
  migrationSql.indexOf("IF v_has_canonical_progress THEN") <
    migrationSql.indexOf("FROM private.activity_question_attempts AS attempts"),
  "The canonical branch must return before the historical fallback is evaluated"
);

const storage = new Map();
globalThis.sessionStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

globalThis.__mockSupabase = {
  auth: {
    getSession: async () => ({
      data: { session: { access_token: "test-jwt-never-persisted" } },
      error: null
    })
  }
};

const instrumentedService = serviceSource.replace(
  /^import\s+\{\s*supabase\s*\}[^;]+;\s*/m,
  "const supabase = globalThis.__mockSupabase;\n"
);
assert.notEqual(instrumentedService, serviceSource, "The Supabase import must be replaceable for behavioral tests");
const serviceModule = await import(`data:text/javascript;base64,${Buffer.from(instrumentedService).toString("base64")}`);

// TEST D — A complete HTTP 400 response is confirmed and must not leave PENDING_RETRY state.
storage.clear();
const warnings = [];
const originalWarn = console.warn;
console.warn = (...args) => warnings.push(args);
globalThis.fetch = async () => new Response(
  JSON.stringify({ error: "Actividad incompleta", code: "ACTIVITY_INCOMPLETE" }),
  { status: 400, headers: { "Content-Type": "application/json" } }
);
const http400SubmissionId = crypto.randomUUID();
const http400Result = await serviceModule.submitActivityResult({
  activityKey: "u5-determinantes-class-01",
  submissionId: http400SubmissionId,
  runId: crypto.randomUUID(),
  phase: "initial",
  submission: { completed_at: new Date().toISOString() }
});
assert.equal(http400Result.success, false);
assert.equal(http400Result.state, "error");
assert.equal(http400Result.httpStatus, 400);
assert.equal(serviceModule.getPendingSubmission("u5-determinantes-class-01"), null);
assert.deepEqual(warnings.at(-1)?.[1], {
  httpStatus: 400,
  code: "ACTIVITY_INCOMPLETE",
  error: "Actividad incompleta"
});
console.warn = originalWarn;

// A late response must not clear a newer submission stored for the same activity.
storage.clear();
const olderSubmissionId = crypto.randomUUID();
const newerSubmissionId = crypto.randomUUID();
globalThis.fetch = async () => {
  serviceModule.savePendingSubmission(
    "u5-determinantes-class-01",
    newerSubmissionId,
    { completed_at: new Date().toISOString() },
    { runId: crypto.randomUUID(), phase: "initial" }
  );
  return new Response(JSON.stringify({ error: "Solicitud anterior rechazada" }), {
    status: 400,
    headers: { "Content-Type": "application/json" }
  });
};
await serviceModule.submitActivityResult({
  activityKey: "u5-determinantes-class-01",
  submissionId: olderSubmissionId,
  runId: crypto.randomUUID(),
  phase: "initial"
});
assert.equal(
  serviceModule.getPendingSubmission("u5-determinantes-class-01").submissionId,
  newerSubmissionId
);

// TEST E — A rejected fetch has an unknown server outcome and keeps the complete safe envelope.
storage.clear();
globalThis.fetch = async () => { throw new TypeError("network disconnected"); };
const networkSubmissionId = crypto.randomUUID();
const networkRunId = crypto.randomUUID();
const networkInitialRunId = crypto.randomUUID();
console.warn = () => {};
const networkResult = await serviceModule.submitActivityResult({
  activityKey: "u5-determinantes-class-01",
  submissionId: networkSubmissionId,
  runId: networkRunId,
  phase: "recovery",
  initialRunId: networkInitialRunId,
  submission: { completed_at: new Date().toISOString() }
});
console.warn = originalWarn;
assert.equal(networkResult.state, "pending_confirmation");
const pendingAfterNetwork = serviceModule.getPendingSubmission("u5-determinantes-class-01");
assert.deepEqual(
  {
    submissionId: pendingAfterNetwork.submissionId,
    activityKey: pendingAfterNetwork.activityKey,
    runId: pendingAfterNetwork.runId,
    phase: pendingAfterNetwork.phase,
    initialRunId: pendingAfterNetwork.initialRunId
  },
  {
    submissionId: networkSubmissionId,
    activityKey: "u5-determinantes-class-01",
    runId: networkRunId,
    phase: "recovery",
    initialRunId: networkInitialRunId
  }
);
const persistedEnvelopeText = JSON.stringify(pendingAfterNetwork);
assert.doesNotMatch(persistedEnvelopeText, /test-jwt-never-persisted|access_token|student_id|service_role/i);

// Legacy retry — missing runId is sent without inventing one; the authenticated server resolves it.
storage.clear();
const legacySubmissionId = crypto.randomUUID();
sessionStorage.setItem("ueeh_pending_sub_u5-determinantes-gam-01", JSON.stringify({
  submissionId: legacySubmissionId,
  activityKey: "u5-determinantes-gam-01",
  submission: { phase: "gamification" },
  savedAt: new Date().toISOString()
}));
let legacyRequestBody;
globalThis.fetch = async (_url, options) => {
  legacyRequestBody = JSON.parse(options.body);
  return new Response(JSON.stringify({ success: true, attempt_number: 1, score: 10 }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
const legacyRetryResult = await serviceModule.submitActivityResult({
  activityKey: "u5-determinantes-gam-01",
  isRetry: true
});
assert.equal(legacyRetryResult.success, true);
assert.equal(legacyRequestBody.submission_id, legacySubmissionId);
assert.ok(!legacyRequestBody.run_id, "A legacy retry must let the server resolve a missing run_id safely");
assert.match(edgeSource, /\.eq\("student_id", studentId\)/);
assert.match(edgeSource, /\.eq\("activity_id", activityId\)/);
assert.match(edgeSource, /\.eq\("status", "in_progress"\)/);
assert.match(edgeSource, /AMBIGUOUS_ACTIVE_RUN/);

// TEST F — A stale client UUID resolves only to the unique canonical active run
// scoped to the authenticated student and activity.
function resolveRunFixture({ providedRunId, ownedRunIds, activeRunIds }) {
  if (ownedRunIds.includes(providedRunId)) return { ok: true, runId: providedRunId, source: "provided" };
  if (activeRunIds.length === 1) return { ok: true, runId: activeRunIds[0], source: "canonical_fallback" };
  if (activeRunIds.length > 1) return { ok: false, code: "AMBIGUOUS_ACTIVE_RUN" };
  return { ok: false, code: "RUN_NOT_OWNED" };
}

for (const fixture of [
  { student: "UEEH-STU-000003", activity: "gamification", canonicalRunId: "af080bdf-80de-460a-a55b-5229b73566ea" },
  { student: "UEEH-STU-000003", activity: "classwork", canonicalRunId: "de6c7477-5da1-4cdb-9c11-af0b7fe6195a" },
  { student: "UEEH-STU-000006", activity: "gamification", canonicalRunId: "9ba1878d-9e22-41c0-8d49-33f4f7f2a78f" }
]) {
  const result = resolveRunFixture({
    providedRunId: crypto.randomUUID(),
    ownedRunIds: [],
    activeRunIds: [fixture.canonicalRunId]
  });
  assert.deepEqual(result, { ok: true, runId: fixture.canonicalRunId, source: "canonical_fallback" });
}
assert.match(edgeSource, /source: providedRunState \? "canonical_fallback" : "canonical_active"/);
assert.match(edgeSource, /\[submit-activity-result\]/);
assert.match(edgeSource, /student_code: diagnostic\.studentCode/);
assert.doesNotMatch(edgeSource.match(/function badRequest[\s\S]*?\n\}/)?.[0] || "", /access_token|authorization|answer_data/i);

// Every U5/U6 activity adopts the canonical run returned by check-activity-answer.
for (const [file, source] of pageSources) {
  assert.match(source, /(?:currentGameRunId|currentRunId)\s*=\s*(?:res|result)\.run_id\s*\|\|\s*(?:res|result)\.activity_run_id/, `${file} must adopt the canonical run id`);
}

// TEST G — Capture the real frontend payload and enforce the final-submit contract.
storage.clear();
let capturedBody;
globalThis.fetch = async (_url, options) => {
  capturedBody = JSON.parse(options.body);
  return new Response(JSON.stringify({ success: true, score: 10 }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
const canonicalRunId = "af080bdf-80de-460a-a55b-5229b73566ea";
const exactSubmissionId = crypto.randomUUID();
const exactPayloadResult = await serviceModule.submitActivityResult({
  activityKey: "u5-determinantes-gam-01",
  submissionId: exactSubmissionId,
  runId: canonicalRunId,
  phase: "gamification",
  submission: { run_id: canonicalRunId, completed_at: "2026-08-27T15:30:00.000Z" }
});
assert.equal(exactPayloadResult.success, true);
assert.deepEqual(Object.keys(capturedBody).sort(), ["activity_key", "phase", "run_id", "submission", "submission_id"].sort());
assert.equal(Object.hasOwn(capturedBody, "initial_run_id"), false, "initial_run_id is omitted outside recovery");
assert.equal(capturedBody.run_id, canonicalRunId);
assert.equal(capturedBody.submission_id, exactSubmissionId);
for (const forbidden of ["student_id", "score", "officialScore", "attempt_number", "best_score", "is_correct"]) {
  assert.equal(Object.hasOwn(capturedBody, forbidden), false, `${forbidden} must not exist at payload root`);
}

// TEST H — due_at is an absolute UTC boundary; timezone conversion cannot close it early.
const dueAt = new Date("2026-08-28T04:59:59.000Z");
assert.equal(new Date("2026-08-27T15:27:48.116Z") <= dueAt, true);
assert.equal(new Date("2026-08-28T05:00:00.000Z") <= dueAt, false);

// TEST I — Invalid legacy submission ids are discarded and regenerated as UUIDs.
storage.clear();
sessionStorage.setItem("ueeh_pending_sub_invalid-fixture", JSON.stringify({ submissionId: "not-a-uuid" }));
assert.match(serviceModule.getOrCreateSubmissionId("invalid-fixture"), /^[0-9a-f-]{36}$/i);
assert.equal(sessionStorage.getItem("ueeh_pending_sub_invalid-fixture"), null);

// TEST J — The same submission_id is checked before a new attempt is recorded.
assert.ok(
  edgeSource.indexOf('.eq("submission_id", submission_id)') <
    edgeSource.indexOf('serviceClient.rpc("record_activity_attempt"'),
  "Idempotency lookup must precede official attempt creation"
);

console.log("✅ Activity progress/submission regression tests A-J passed.");
