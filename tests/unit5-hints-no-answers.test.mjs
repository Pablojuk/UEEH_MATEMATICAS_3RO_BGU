// ═══════════════════════════════════════════════════════════════════════════
// Unit 5 Pedagogical Hints Security & Integrity Test — UEEH Matemáticas 3ro BGU
// Verifies: Hints guide procedurally without leaking answers or solutions.
// ═══════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import vm from "vm";
import assert from "assert";

const deberPath = path.resolve("topics/unit5-determinantes/deber.html");
const html = fs.readFileSync(deberPath, "utf-8");

// Extract inline scripts
const scriptMatches = html.match(/<script(?![^>]*src=)[\s\S]*?>([\s\S]*?)<\/script>/gi) || [];
assert.ok(scriptMatches.length > 0, "No scripts found in deber.html");

const sandbox = {
  window: {},
  crypto: { randomUUID: () => "test-uuid" },
  document: {
    querySelectorAll: () => [],
    getElementById: () => ({ classList: { add: () => {}, remove: () => {} }, style: {} })
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);

scriptMatches.forEach(s => {
  const code = s.replace(/<script[^>]*>|<\/script>/gi, "");
  vm.runInContext(code, sandbox);
});

const exercises = vm.runInContext("exercises", sandbox);
const recoveryExercises = vm.runInContext("recoveryExercises", sandbox);

// ────────────────────────────────────────────────────────────
// 1. Structure Verification: 14 initial + 8 recovery
// ────────────────────────────────────────────────────────────
assert.strictEqual(exercises.length, 14, `❌ Expected 14 initial exercises, got ${exercises.length}`);
assert.strictEqual(recoveryExercises.length, 8, `❌ Expected 8 recovery exercises, got ${recoveryExercises.length}`);
console.log("✔ Counts — 14 initial exercises and 8 recovery exercises verified");

// ────────────────────────────────────────────────────────────
// 2. All exercises must have non-empty string hints
// ────────────────────────────────────────────────────────────
exercises.forEach((ex, idx) => {
  assert.ok(typeof ex.hint === "string" && ex.hint.trim().length > 10, `❌ Exercise ${idx + 1} has invalid hint`);
  assert.strictEqual(ex.solution, null, `❌ Exercise ${idx + 1} solution must be null in public HTML`);
});

recoveryExercises.forEach((ex, idx) => {
  assert.ok(typeof ex.hint === "string" && ex.hint.trim().length > 10, `❌ Recovery ${idx + 1} has invalid hint`);
  assert.strictEqual(ex.solution, null, `❌ Recovery ${idx + 1} solution must be null in public HTML`);
});
console.log("✔ Hint Presence — All 22 exercises have valid, non-empty procedural hints and solution: null");

// ────────────────────────────────────────────────────────────
// 3. Prohibited leaked answers in initial hints
// ────────────────────────────────────────────────────────────
const initialLeakedPatterns = [
  { pattern: "= 15", desc: "leaks final result 15" },
  { pattern: "= 29", desc: "leaks final result 29" },
  { pattern: "(3)(5) - (2)(4)", desc: "leaks step-by-step arithmetic in Ex 1" },
  { pattern: "-2 - 18", desc: "leaks step-by-step arithmetic in Ex 2" },
  { pattern: "28 - (-2)", desc: "leaks step-by-step arithmetic in Ex 3" },
  { pattern: "0 - (-15)", desc: "leaks step-by-step arithmetic in Ex 4" },
  { pattern: "8 - (-18)", desc: "leaks step-by-step arithmetic in Ex 5" },
  { pattern: "8 + 18", desc: "leaks step-by-step arithmetic in Ex 5" },
  { pattern: "27 - (-2)", desc: "leaks step-by-step arithmetic in Ex 6" },
  { pattern: "x^2 = 16", desc: "leaks quadratic resolution in Ex 11" },
  { pattern: "x = \\pm 4", desc: "leaks roots in Ex 11" },
  { pattern: "x = 4", desc: "leaks roots in Ex 11" },
  { pattern: "x^2 = 4", desc: "leaks quadratic resolution in Ex 12" },
  { pattern: "\\pm 2", desc: "leaks roots in Ex 12" },
  { pattern: "\\Delta = -5", desc: "leaks Delta value in Ex 13" },
  { pattern: "\\Delta_x = -10", desc: "leaks Delta_x value in Ex 13" },
  { pattern: "x = 2", desc: "leaks x value in Ex 13" },
  { pattern: "y = 1", desc: "leaks y value in Ex 13" },
  { pattern: "Fila 1 y la Fila 2: son exactamente iguales", desc: "leaks MCQ answer in Ex 14" }
];

initialLeakedPatterns.forEach(({ pattern, desc }) => {
  exercises.forEach((ex, idx) => {
    assert.ok(!ex.hint.includes(pattern), `❌ Initial Ex ${idx + 1} hint ${desc}: "${ex.hint}"`);
  });
});
console.log("✔ Initial Hints Audit — Zero leaked calculations or final values detected in initial exercises");

// ────────────────────────────────────────────────────────────
// 4. Prohibited leaked answers in recovery hints
// ────────────────────────────────────────────────────────────
const recoveryLeakedPatterns = [
  { pattern: "8 - 3", desc: "leaks calculation in R1" },
  { pattern: "-12 - 10", desc: "leaks calculation in R2" },
  { pattern: "-22", desc: "leaks answer in R2" },
  { pattern: "30 - (-2)", desc: "leaks calculation in R3" },
  { pattern: "32", desc: "leaks answer in R3" },
  { pattern: "-1 - 12", desc: "leaks calculation in R4" },
  { pattern: "-13", desc: "leaks answer in R4" },
  { pattern: "2 - 5", desc: "leaks calculation in R5" },
  { pattern: "-3", desc: "leaks answer in R5" },
  { pattern: "x^2 = 25", desc: "leaks quadratic resolution in R6" },
  { pattern: "\\pm 5", desc: "leaks roots in R6" },
  { pattern: "±5", desc: "leaks roots in R6" },
  { pattern: "\\pm 4", desc: "leaks roots in R7" },
  { pattern: "±4", desc: "leaks roots in R7" },
  { pattern: "\\Delta = -2", desc: "leaks Delta in R8" },
  { pattern: "\\Delta_x = -6", desc: "leaks Delta_x in R8" },
  { pattern: "x = 3", desc: "leaks x in R8" },
  { pattern: "y = 2", desc: "leaks y in R8" }
];

recoveryLeakedPatterns.forEach(({ pattern, desc }) => {
  recoveryExercises.forEach((ex, idx) => {
    assert.ok(!ex.hint.includes(pattern), `❌ Recovery Ex ${idx + 1} hint ${desc}: "${ex.hint}"`);
  });
});
console.log("✔ Recovery Hints Audit — Zero leaked calculations or final values detected in recovery exercises");

// ────────────────────────────────────────────────────────────
// 5. MCQ hints do NOT equal options
// ────────────────────────────────────────────────────────────
exercises.concat(recoveryExercises).forEach((ex) => {
  if (ex.mode === "mcq" && ex.options) {
    ex.options.forEach((opt) => {
      const cleanOpt = opt.replace(/[\\()$]/g, "").trim();
      assert.notStrictEqual(ex.hint.trim(), opt.trim(), `❌ MCQ hint matches an option directly`);
      assert.notStrictEqual(ex.hint.trim(), cleanOpt, `❌ MCQ hint matches cleaned option directly`);
    });
  }
});
console.log("✔ MCQ Hints Audit — No hint matches an option directly");

// ────────────────────────────────────────────────────────────
// 6. Security: No private answer arrays or keys in HTML
// ────────────────────────────────────────────────────────────
assert.ok(!html.includes("correctIndex:"), "❌ correctIndex must not exist in deber.html");
assert.ok(!html.includes("acceptedAnswers:"), "❌ acceptedAnswers must not exist in deber.html");
console.log("✔ Public HTML Security — No private answer keys exposed");

console.log("🎉 ALL UNIT 5 HINT INTEGRITY & PEDAGOGICAL TESTS PASSED 100%!");
