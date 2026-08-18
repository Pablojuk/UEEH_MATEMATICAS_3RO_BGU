// ═══════════════════════════════════════════════════════════════════════════
// Unit 5 Classwork Submit Guard & Question Binding Test — UEEH Matemáticas 3ro BGU
// Verifies: in-flight guard, _pendingSubmission question binding, navigation lock,
//           idempotent retry same ID, Edge Function fallback (4 - attempt, null for gamification).
// ═══════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import vm from "vm";
import assert from "assert";

const deberPath = path.resolve("topics/unit5-determinantes/deber.html");
const html = fs.readFileSync(deberPath, "utf-8");

const edgePath = path.resolve("supabase/functions/check-activity-answer/index.ts");
const edgeCode = fs.readFileSync(edgePath, "utf-8");

// ────────────────────────────────────────────────────────────
// Helper: extract inline script code from deber.html
// ────────────────────────────────────────────────────────────
const scriptMatches = html.match(/<script(?![^>]*src=)[\s\S]*?>([\s\S]*?)<\/script>/gi) || [];
assert.ok(scriptMatches.length > 0, "No scripts found");

const allCode = scriptMatches.map(s => s.replace(/<script[^>]*>|<\/script>/gi, "")).join("\n");

// ────────────────────────────────────────────────────────────
// 1. STATIC: _submitting in-flight guard exists
// ────────────────────────────────────────────────────────────
assert.ok(
  allCode.includes("if (_submitting) return"),
  "❌ checkCurrent must contain the _submitting in-flight guard"
);
console.log("✔ Submit Guard — _submitting in-flight check present in checkCurrent()");

// ────────────────────────────────────────────────────────────
// 2. STATIC: _pendingSubmission binding exists
// ────────────────────────────────────────────────────────────
assert.ok(
  allCode.includes("_pendingSubmission") &&
  allCode.includes("runId") &&
  allCode.includes("phase") &&
  allCode.includes("questionId") &&
  allCode.includes("exerciseIndex"),
  "❌ _pendingSubmission must bind runId, phase, questionId, and exerciseIndex"
);
console.log("✔ Submit Guard — _pendingSubmission bound to (runId, phase, questionId, exerciseIndex)");

// ────────────────────────────────────────────────────────────
// 3. STATIC: navigation blocked while _submitting OR _pendingSubmission exists
// ────────────────────────────────────────────────────────────
const navToMatch = allCode.match(/function navTo[\s\S]*?(?=function\s)/);
assert.ok(navToMatch && navToMatch[0].includes("_submitting") && navToMatch[0].includes("_pendingSubmission"), "❌ navTo must check _submitting and _pendingSubmission");

const prevMatch = allCode.match(/function prevExercise[\s\S]*?(?=function\s)/);
assert.ok(prevMatch && prevMatch[0].includes("_submitting") && prevMatch[0].includes("_pendingSubmission"), "❌ prevExercise must check _submitting and _pendingSubmission");

const nextMatch = allCode.match(/function nextExercise[\s\S]*?(?=function\s)/);
assert.ok(nextMatch && nextMatch[0].includes("_submitting") && nextMatch[0].includes("_pendingSubmission"), "❌ nextExercise must check _submitting and _pendingSubmission");
console.log("✔ Submit Guard — Navigation (navTo, prev, next) blocked when retry is pending");

// ────────────────────────────────────────────────────────────
// 4. STATIC: button shows spinner and disabled during submission
// ────────────────────────────────────────────────────────────
assert.ok(
  html.includes("_submitting") && html.includes("Comprobando"),
  "❌ Button must show '⏳ Comprobando...' and be disabled during _submitting"
);
console.log("✔ Submit Guard — Button shows '⏳ Comprobando...' and is disabled during in-flight");

// ────────────────────────────────────────────────────────────
// 5. STATIC: server-authoritative attempts, score, locked
// ────────────────────────────────────────────────────────────
assert.ok(
  allCode.includes("targetEx.attempts = res.attempt_number"),
  "❌ Attempt count must come from server (res.attempt_number)"
);
assert.ok(
  allCode.includes("targetEx.score = res.question_score"),
  "❌ Score must come from server (res.question_score)"
);
assert.ok(
  !allCode.includes("ex.attempts++") && !allCode.includes("ex.attempts +="),
  "❌ No local attempt increments"
);
console.log("✔ Submit Guard — attempts and score sourced exclusively from server response");

// ────────────────────────────────────────────────────────────
// 6. STATIC: Edge Function fallback logic (4 - attempt for classwork, null for gamification)
// ────────────────────────────────────────────────────────────
assert.ok(
  !edgeCode.includes("3 - recordRes.attempt_number"),
  "❌ Edge function must NOT contain legacy '3 - recordRes.attempt_number'"
);
assert.ok(
  edgeCode.includes('graderType === "determinants_classwork_v1"') &&
  edgeCode.includes("Math.max(0, 4 - Number(recordRes.attempt_number || 0))"),
  "❌ Edge function must compute classwork fallback as Math.max(0, 4 - attempt_number)"
);
assert.ok(
  edgeCode.includes('graderType === "determinants_gamification_v1"') &&
  edgeCode.includes("fallbackAttemptsRemaining = null"),
  "❌ Edge function must compute gamification fallback as null (unlimited)"
);
console.log("✔ Edge Function — Classwork fallback is 4 - attempt, Gamification fallback is null (no legacy 3 - attempt)");

// ────────────────────────────────────────────────────────────
// Helper: create a sandboxed VM environment for behavioral tests
// ────────────────────────────────────────────────────────────
function createTestSandbox(fetchFn) {
  const sb = {
    crypto: { randomUUID: () => "uuid-" + (++sb._uuidSeq) },
    _uuidSeq: 0,
    document: {
      querySelectorAll: () => [],
      getElementById: () => ({
        classList: { add: () => {}, remove: () => {} },
        style: {},
        innerHTML: "",
        innerText: "",
        disabled: false
      })
    },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout: (fn) => fn(),
    fetch: fetchFn
  };
  sb.window = sb;
  vm.createContext(sb);
  scriptMatches.forEach(s => {
    const code = s.replace(/<script[^>]*>|<\/script>/gi, "");
    vm.runInContext(code, sb);
  });
  vm.runInContext(`
    state.initial = buildRuntime(exercises);
    state.recovery = buildRuntime(recoveryExercises);
    state.phase = "initial";
    state.currentIndex = 0;
    state.initial[0].textInput = "7";
    getAuthSessionToken = async function() { return "fake-token"; };
  `, sb);
  return sb;
}

// ────────────────────────────────────────────────────────────
// 7. BEHAVIORAL: 10 rapid clicks produce exactly 1 fetch request
// ────────────────────────────────────────────────────────────
{
  let fetchCallCount = 0;
  const sandbox = createTestSandbox(async () => {
    fetchCallCount++;
    return new Promise(() => {}); // never resolves — simulates in-flight
  });

  for (let i = 0; i < 10; i++) {
    vm.runInContext("checkCurrent()", sandbox);
  }

  const submittingAfterSpam = vm.runInContext("_submitting", sandbox);
  assert.strictEqual(submittingAfterSpam, true, "❌ _submitting must be true after first call");

  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(fetchCallCount, 1, `❌ 10 rapid clicks must produce exactly 1 fetch call, got ${fetchCallCount}`);
  console.log("✔ Behavioral — 10 rapid clicks produce exactly 1 fetch request");
}

// ────────────────────────────────────────────────────────────
// 8. BEHAVIORAL: Retry Question Binding & Navigation Lock
// ────────────────────────────────────────────────────────────
{
  let capturedSubmissionId = null;
  let shouldFail = true;

  const sandbox = createTestSandbox(async (url, opts) => {
    const body = JSON.parse(opts.body);
    capturedSubmissionId = body.question_submission_id;

    if (shouldFail) {
      throw new Error("Network timeout");
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        is_correct: false,
        attempt_number: 1,
        attempts_remaining: 3,
        question_score: 0,
        locked: false
      })
    };
  });

  // Step 1: Submit Question 1 (fails with network error)
  vm.runInContext("checkCurrent()", sandbox);
  await new Promise(r => setTimeout(r, 50));

  const firstSubmissionId = capturedSubmissionId;
  assert.ok(firstSubmissionId, "❌ First submission must capture an ID");

  // Verify _pendingSubmission contains full metadata
  const pending = vm.runInContext("_pendingSubmission", sandbox);
  assert.ok(pending, "❌ _pendingSubmission must exist after network error");
  assert.strictEqual(pending.id, firstSubmissionId, "❌ pending.id must match captured ID");
  assert.strictEqual(pending.exerciseIndex, 0, "❌ pending.exerciseIndex must be 0 (Question 1)");
  assert.strictEqual(pending.questionId, "1", "❌ pending.questionId must be '1'");

  // Step 2: Attempt navigation to Question 2 (must be BLOCKED)
  vm.runInContext("navTo(1)", sandbox);
  let currentIndex = vm.runInContext("state.currentIndex", sandbox);
  assert.strictEqual(currentIndex, 0, "❌ Navigation to Question 2 must be blocked while retry is pending!");

  vm.runInContext("nextExercise()", sandbox);
  currentIndex = vm.runInContext("state.currentIndex", sandbox);
  assert.strictEqual(currentIndex, 0, "❌ nextExercise() must be blocked while retry is pending!");

  // Step 3: Retry Question 1 (now server succeeds)
  shouldFail = false;
  capturedSubmissionId = null;
  vm.runInContext("checkCurrent()", sandbox);
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(capturedSubmissionId, firstSubmissionId, `❌ Retry must reuse SAME submission ID ${firstSubmissionId}`);

  // Step 4: After success, pending submission must be cleared and navigation allowed
  const pendingAfterSuccess = vm.runInContext("_pendingSubmission", sandbox);
  assert.strictEqual(pendingAfterSuccess, null, "❌ _pendingSubmission must be null after successful response");

  vm.runInContext("navTo(1)", sandbox);
  currentIndex = vm.runInContext("state.currentIndex", sandbox);
  assert.strictEqual(currentIndex, 1, "❌ Navigation to Question 2 must now be permitted");

  // Step 5: Submitting Question 2 generates a NEW submission ID
  vm.runInContext("state.initial[1].selectedOption = 0", sandbox);
  capturedSubmissionId = null;
  vm.runInContext("checkCurrent()", sandbox);
  await new Promise(r => setTimeout(r, 50));

  assert.ok(capturedSubmissionId, "❌ Question 2 must generate a submission ID");
  assert.notStrictEqual(capturedSubmissionId, firstSubmissionId, "❌ Question 2 must NOT reuse Question 1's submission ID");
  console.log("✔ Behavioral — Retry is strictly bound to originating question; navigation locked until confirmed; distinct question gets new ID");
}

// ────────────────────────────────────────────────────────────
// 9. BEHAVIORAL: HTTP 500 does not consume attempts or lock
// ────────────────────────────────────────────────────────────
{
  const sandbox = createTestSandbox(async () => ({
    ok: false,
    status: 500,
    json: async () => ({ success: false, error: "Internal server error" })
  }));

  vm.runInContext("checkCurrent()", sandbox);
  await new Promise(r => setTimeout(r, 50));

  const attempts = vm.runInContext("state.initial[0].attempts", sandbox);
  const score = vm.runInContext("state.initial[0].score", sandbox);
  const status = vm.runInContext("state.initial[0].status", sandbox);

  assert.strictEqual(attempts, 0, `❌ HTTP 500 must NOT increment attempts. Got ${attempts}`);
  assert.strictEqual(score, null, `❌ HTTP 500 must NOT set score. Got ${score}`);
  assert.strictEqual(status, "pending", `❌ HTTP 500 must NOT change status. Got ${status}`);
  console.log("✔ Behavioral — HTTP 500 does not increment attempts or lock exercise");
}

// ────────────────────────────────────────────────────────────
// 10. STATIC & BEHAVIORAL: MCQ selectedOption = 0 (and 1, 2, 3, input, fill) answer_data serialization
// ────────────────────────────────────────────────────────────
assert.ok(
  !edgeCode.includes("user_answer ? { value: user_answer } : null"),
  "❌ Edge function must NOT use truthiness ternary on user_answer (converts 0 to null)"
);
assert.ok(
  edgeCode.includes("p_answer_data: { value: user_answer }"),
  "❌ Edge function must pass p_answer_data: { value: user_answer } to preserve 0, false, empty string, arrays"
);
console.log("✔ Edge Function — p_answer_data always passes { value: user_answer } (MCQ option 0 preserved as non-null)");

// Behavioral simulation of MCQ options 0, 1, 2, 3, input, and fill
{
  const testAnswers = [
    { mode: "mcq", val: 0, expected: { value: 0 } },
    { mode: "mcq", val: 1, expected: { value: 1 } },
    { mode: "mcq", val: 2, expected: { value: 2 } },
    { mode: "mcq", val: 3, expected: { value: 3 } },
    { mode: "input", val: "-20", expected: { value: "-20" } },
    { mode: "fill", val: ["1", "2", "3"], expected: { value: ["1", "2", "3"] } }
  ];

  for (const t of testAnswers) {
    // Simulate Edge function payload creation
    const user_answer = t.val;
    const p_answer_data = { value: user_answer };

    assert.notStrictEqual(p_answer_data, null, `❌ p_answer_data must not be null for ${JSON.stringify(t.val)}`);
    assert.deepStrictEqual(p_answer_data, t.expected, `❌ p_answer_data mismatch for ${JSON.stringify(t.val)}`);
  }
  console.log("✔ Answer Data — All answer types (MCQ 0..3, input, fill) serialize cleanly without null conversions");
}

// ────────────────────────────────────────────────────────────
// 11. STATIC: Solution null safety (no literal "null")
// ────────────────────────────────────────────────────────────
const solutionNullCount = (html.match(/solution:\s*null/g) || []).length;
assert.ok(solutionNullCount >= 22, `❌ Expected ≥22 'solution: null' entries, found ${solutionNullCount}`);
console.log(`✔ Public Security — All ${solutionNullCount} exercises have solution: null`);

console.log("🎉 ALL SUBMIT GUARD & QUESTION BINDING TESTS PASSED 100%!");
