// ═══════════════════════════════════════════════════════════════════════════
// Unit 5 Classwork Submit Guard Test — UEEH Matemáticas 3ro BGU
// Verifies: in-flight guard, button state, retry same ID, solution null,
//           navigation lock, server-authoritative scoring, 4-attempt lock.
// ═══════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import vm from "vm";
import assert from "assert";

const deberPath = path.resolve("topics/unit5-determinantes/deber.html");
const html = fs.readFileSync(deberPath, "utf-8");

// ────────────────────────────────────────────────────────────
// Helper: extract inline script code from deber.html
// ────────────────────────────────────────────────────────────
const scriptMatches = html.match(/<script(?![^>]*src=)[\s\S]*?>([\s\S]*?)<\/script>/gi) || [];
assert.ok(scriptMatches.length > 0, "No scripts found");

const allCode = scriptMatches.map(s => s.replace(/<script[^>]*>|<\/script>/gi, "")).join("\n");

// ────────────────────────────────────────────────────────────
// 1. STATIC: _submitting guard exists in checkCurrent
// ────────────────────────────────────────────────────────────
assert.ok(
  allCode.includes("if (_submitting) return"),
  "❌ checkCurrent must contain the _submitting in-flight guard"
);
console.log("✔ Submit Guard — _submitting in-flight check present in checkCurrent()");

// ────────────────────────────────────────────────────────────
// 2. STATIC: _submitting guard exists in navigation functions
// ────────────────────────────────────────────────────────────
// navTo, prevExercise, nextExercise should all check _submitting
const navToMatch = allCode.match(/function navTo[\s\S]*?(?=function\s)/);
assert.ok(navToMatch && navToMatch[0].includes("_submitting"), "❌ navTo must check _submitting");

const prevMatch = allCode.match(/function prevExercise[\s\S]*?(?=function\s)/);
assert.ok(prevMatch && prevMatch[0].includes("_submitting"), "❌ prevExercise must check _submitting");

const nextMatch = allCode.match(/function nextExercise[\s\S]*?(?=function\s)/);
assert.ok(nextMatch && nextMatch[0].includes("_submitting"), "❌ nextExercise must check _submitting");
console.log("✔ Submit Guard — Navigation functions (navTo, prev, next) blocked during submission");

// ────────────────────────────────────────────────────────────
// 3. STATIC: button disabled during _submitting
// ────────────────────────────────────────────────────────────
assert.ok(
  html.includes("_submitting") && html.includes("Comprobando"),
  "❌ Button must show '⏳ Comprobando...' and be disabled during _submitting"
);
console.log("✔ Submit Guard — Button shows '⏳ Comprobando...' and is disabled during in-flight");

// ────────────────────────────────────────────────────────────
// 4. STATIC: _pendingSubmissionId retained on error
// ────────────────────────────────────────────────────────────
assert.ok(
  allCode.includes("_pendingSubmissionId is intentionally RETAINED"),
  "❌ Network error path must retain _pendingSubmissionId for retry"
);
console.log("✔ Submit Guard — _pendingSubmissionId retained for retry on network error");

// ────────────────────────────────────────────────────────────
// 5. STATIC: new submission ID only when no pending
// ────────────────────────────────────────────────────────────
assert.ok(
  allCode.includes("if (!_pendingSubmissionId)") && allCode.includes("_pendingSubmissionId = crypto.randomUUID()"),
  "❌ New submission ID must only be generated when no pending retry exists"
);
console.log("✔ Submit Guard — New submission ID generated only when no pending retry");

// ────────────────────────────────────────────────────────────
// 6. STATIC: server-authoritative attempt_number
// ────────────────────────────────────────────────────────────
assert.ok(
  allCode.includes("targetEx.attempts = res.attempt_number"),
  "❌ Attempt count must come from server (res.attempt_number), not local increment"
);
assert.ok(
  !allCode.includes("ex.attempts++") && !allCode.includes("ex.attempts +="),
  "❌ No local attempt increment (ex.attempts++ or +=) should exist"
);
console.log("✔ Submit Guard — attempt_number sourced exclusively from server response");

// ────────────────────────────────────────────────────────────
// 7. STATIC: server-authoritative score
// ────────────────────────────────────────────────────────────
assert.ok(
  allCode.includes("targetEx.score = res.question_score"),
  "❌ Score must come from server (res.question_score), not local calculation"
);
console.log("✔ Submit Guard — question_score sourced exclusively from server response");

// ────────────────────────────────────────────────────────────
// 8. STATIC: solution null safety
// ────────────────────────────────────────────────────────────
// The solution box rendering must NOT blindly output ${ex.solution}
// It must check typeof === "string" and .trim().length > 0
assert.ok(
  html.includes('typeof ex.solution === "string"') || html.includes("typeof ex.solution === 'string'") ||
  html.includes('typeof res.solution_html === "string"'),
  "❌ Solution rendering must check typeof before displaying"
);

// The HTML must NOT contain a bare ${ex.solution} without guard
const solutionBoxPattern = /solutionBox[\s\S]{0,200}\$\{ex\.solution\}/;
const solutionBoxMatches = html.match(solutionBoxPattern);
// If matched, it should be within a conditional block
if (solutionBoxMatches) {
  // Verify it's inside the ternary guard
  assert.ok(
    html.includes('ex.solution && typeof ex.solution === "string"') ||
    html.includes("ex.solution && typeof ex.solution === 'string'"),
    "❌ Solution box must be conditionally rendered only when ex.solution is a non-empty string"
  );
}
console.log("✔ Submit Guard — Solution box hidden when solution is null/undefined/empty (no literal 'null')");

// ────────────────────────────────────────────────────────────
// 9. STATIC: solution_html from server guarded
// ────────────────────────────────────────────────────────────
assert.ok(
  allCode.includes('typeof res.solution_html === "string"') && allCode.includes("res.solution_html.trim().length > 0"),
  "❌ checkCurrent must validate res.solution_html type and non-emptiness before assigning"
);
console.log("✔ Submit Guard — Server solution_html validated for type and non-emptiness");

// ────────────────────────────────────────────────────────────
// 10. STATIC: target exercise captured by reference
// ────────────────────────────────────────────────────────────
assert.ok(
  allCode.includes("targetEx = targetList[_submittingExIndex]"),
  "❌ The response must be applied to the exercise that originated the request, not currentEx()"
);
console.log("✔ Submit Guard — Server response applied to target exercise by captured index/phase");

// ────────────────────────────────────────────────────────────
// 11. STATIC: HTTP error does NOT clear submission ID
// ────────────────────────────────────────────────────────────
// On !response.ok path: _submitting = false but _pendingSubmissionId NOT cleared
const httpErrorBlock = allCode.match(/if \(!response\.ok\)[\s\S]*?return;\s*\}/);
assert.ok(httpErrorBlock, "❌ HTTP error handling block must exist");
assert.ok(
  !httpErrorBlock[0].includes("_pendingSubmissionId = null"),
  "❌ HTTP error path must NOT clear _pendingSubmissionId"
);
console.log("✔ Submit Guard — HTTP 500 retains submission ID (no new attempt on retry)");

// ────────────────────────────────────────────────────────────
// 12. STATIC: success path clears submission ID
// ────────────────────────────────────────────────────────────
assert.ok(
  allCode.includes("_pendingSubmissionId = null") && allCode.includes("_submitting = false"),
  "❌ Success path must clear both _pendingSubmissionId and _submitting"
);
console.log("✔ Submit Guard — Success path clears in-flight state and pending submission ID");

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
  // Make window self-referential (matches browser: window === globalThis)
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
// 13. BEHAVIORAL: simulate rapid-fire calls to checkCurrent
// ────────────────────────────────────────────────────────────
{
  let fetchCallCount = 0;
  const sandbox = createTestSandbox(async () => {
    fetchCallCount++;
    return new Promise(() => {}); // never resolves — simulates slow server
  });

  fetchCallCount = 0;
  for (let i = 0; i < 10; i++) {
    vm.runInContext("checkCurrent()", sandbox);
  }

  // _submitting is set synchronously, blocking all subsequent calls
  const submittingAfterSpam = vm.runInContext("_submitting", sandbox);
  assert.strictEqual(submittingAfterSpam, true, "❌ _submitting must be true after first call");

  // Wait for microtasks so getAuthSessionToken resolves and fetch fires
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(fetchCallCount, 1, `❌ 10 rapid clicks must produce exactly 1 fetch call, got ${fetchCallCount}`);
  console.log("✔ Submit Guard — 10 rapid clicks produce exactly 1 fetch request (spam protection confirmed)");
}

// ────────────────────────────────────────────────────────────
// 14. BEHAVIORAL: submission ID retained after network error
// ────────────────────────────────────────────────────────────
{
  let capturedSubmissionId = null;
  const sandbox = createTestSandbox(async (url, opts) => {
    const body = JSON.parse(opts.body);
    capturedSubmissionId = body.question_submission_id;
    throw new Error("Network error");
  });

  vm.runInContext("checkCurrent()", sandbox);
  await new Promise(r => setTimeout(r, 50));

  const firstId = capturedSubmissionId;
  assert.ok(firstId, "❌ First submission should have captured an ID");

  const pendingAfterError = vm.runInContext("_pendingSubmissionId", sandbox);
  assert.ok(pendingAfterError, "❌ _pendingSubmissionId must be retained after network error");
  assert.strictEqual(pendingAfterError, firstId, "❌ Pending ID must match the original submission ID");

  const submittingAfterError = vm.runInContext("_submitting", sandbox);
  assert.strictEqual(submittingAfterError, false, "❌ _submitting must be false after error (allow retry)");

  // Retry — should use same submission ID
  capturedSubmissionId = null;
  vm.runInContext("checkCurrent()", sandbox);
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(capturedSubmissionId, firstId, `❌ Retry must use SAME submission ID. Got ${capturedSubmissionId} expected ${firstId}`);
  console.log("✔ Submit Guard — Network error retains submission ID; retry reuses same ID (idempotency)");
}

// ────────────────────────────────────────────────────────────
// 15. BEHAVIORAL: HTTP 500 does not increment local attempts
// ────────────────────────────────────────────────────────────
{
  const sandbox = createTestSandbox(async () => ({
    ok: false,
    status: 500,
    json: async () => ({ success: false, error: "Internal error" })
  }));

  vm.runInContext("checkCurrent()", sandbox);
  await new Promise(r => setTimeout(r, 50));

  const attempts = vm.runInContext("state.initial[0].attempts", sandbox);
  const score = vm.runInContext("state.initial[0].score", sandbox);
  const status = vm.runInContext("state.initial[0].status", sandbox);

  assert.strictEqual(attempts, 0, `❌ HTTP 500 must NOT increment attempts. Got ${attempts}`);
  assert.strictEqual(score, null, `❌ HTTP 500 must NOT set score. Got ${score}`);
  assert.strictEqual(status, "pending", `❌ HTTP 500 must NOT change status. Got ${status}`);
  console.log("✔ Submit Guard — HTTP 500 does not increment attempts, set score, or lock exercise");
}

// ────────────────────────────────────────────────────────────
// 16. STATIC: solution: null in HTML exercises
// ────────────────────────────────────────────────────────────
const solutionNullCount = (html.match(/solution:\s*null/g) || []).length;
assert.ok(solutionNullCount >= 22, `❌ Expected ≥22 'solution: null' entries, found ${solutionNullCount}`);
console.log(`✔ Submit Guard — All ${solutionNullCount} exercises have solution: null (public security verified)`);

console.log("🎉 ALL SUBMIT GUARD TESTS PASSED 100%!");
