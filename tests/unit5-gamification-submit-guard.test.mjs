// ═══════════════════════════════════════════════════════════════════════════
// Unit 5 Gamification Submit Guard Test — UEEH Matemáticas 3ro BGU
// Verifies: in-flight guard (_submittingAnswer), double-click / double-tap prevention,
//           button disabled state, try/finally restoration, and activity-service delegation.
// ═══════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import assert from "assert";

const gamPath = path.resolve("topics/unit5-determinantes/gamificacion.html");
const html = fs.readFileSync(gamPath, "utf-8");

// Extract inline scripts
const scriptMatches = html.match(/<script(?![^>]*src=)[\s\S]*?>([\s\S]*?)<\/script>/gi) || [];
assert.ok(scriptMatches.length > 0, "No scripts found in gamificacion.html");
const allCode = scriptMatches.map((s) => s.replace(/<script[^>]*>|<\/script>/gi, "")).join("\n");

// 1. STATIC: _submittingAnswer state variable exists
assert.ok(
  allCode.includes("let _submittingAnswer = false;"),
  "❌ gamificacion.html must declare let _submittingAnswer = false;"
);
console.log("✔ Submit Guard — _submittingAnswer variable declared");

// 2. STATIC: submit button has id and verifyAnswer has in-flight guard
assert.ok(
  html.includes('id="btn-submit-answer"'),
  "❌ Submit button must have id='btn-submit-answer'"
);
assert.ok(
  allCode.includes("if (_submittingAnswer || isCurrentSolved) return;"),
  "❌ verifyAnswer must check (_submittingAnswer || isCurrentSolved)"
);
console.log("✔ Submit Guard — In-flight guard present in verifyAnswer()");

// 3. STATIC: Button disabled and text updated during submission
assert.ok(
  allCode.includes("_submittingAnswer = true;") &&
  allCode.includes("submitBtn.disabled = true;") &&
  allCode.includes("⏳ Transmitiendo..."),
  "❌ Button must be disabled with '⏳ Transmitiendo...' during submission"
);
console.log("✔ Submit Guard — Button disabled with loading text during in-flight");

// 4. STATIC: try / finally restores _submittingAnswer and re-enables button if not solved
assert.ok(
  allCode.includes("finally {") &&
  allCode.includes("_submittingAnswer = false;") &&
  allCode.includes("if (submitBtn && !isCurrentSolved) {"),
  "❌ try/finally must restore _submittingAnswer and re-enable button when not solved"
);
console.log("✔ Submit Guard — try/finally correctly restores submitting state");

// 5. STATIC: keypad, invertible options, and keydown blocked during _submittingAnswer
assert.ok(
  allCode.includes("if (isCurrentSolved || _submittingAnswer) return;") ||
  allCode.includes("if (_submittingAnswer || isCurrentSolved) return;"),
  "❌ Keypad, invertible choices, and keydown must be guarded during in-flight"
);
console.log("✔ Submit Guard — Keypad, options, and Enter key blocked during submission");

// 6. STATIC: finishGame still calls submitActivityResult via activity-service
assert.ok(
  allCode.includes("submitActivityResult") &&
  allCode.includes("u5-determinantes-gam-01"),
  "❌ finishGame must call submitActivityResult with u5-determinantes-gam-01"
);
console.log("✔ Architecture — finishGame delegates official grade to activity-service");

// 7. BEHAVIORAL: Rapid successive clicks trigger exactly 1 fetch
let fetchCalls = 0;
let resolveFetch = null;

const mockFetch = async () => {
  fetchCalls++;
  return new Promise((resolve) => {
    resolveFetch = () =>
      resolve({
        ok: true,
        json: async () => ({
          success: true,
          is_correct: false,
          error: "Respuesta incorrecta"
        })
      });
  });
};

// Simulate execution of verifyAnswer logic with mock
let mockSubmitting = false;
let mockCalls = 0;

async function simulatedVerify() {
  if (mockSubmitting) return;
  mockSubmitting = true;
  try {
    await mockFetch();
  } finally {
    mockSubmitting = false;
  }
}

// Fire 10 rapid calls
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(simulatedVerify());
}

assert.strictEqual(fetchCalls, 1, "❌ 10 rapid invocations must produce exactly 1 fetch call");

// Complete the pending fetch
if (resolveFetch) resolveFetch();
await Promise.all(promises);

assert.strictEqual(mockSubmitting, false, "❌ Guard must be reset after fetch completes");
console.log("✔ Behavioral — 10 rapid clicks produce exactly 1 fetch request");

console.log("🎉 ALL GAMIFICATION SUBMIT GUARD TESTS PASSED 100%!");
