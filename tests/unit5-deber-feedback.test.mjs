// ═══════════════════════════════════════════════════════════════════════════
// Unit 5 Deber Feedback & MCQ Integrity Test — UEEH Matemáticas 3ro BGU
// Verifies: U5-UI-005 fix (elimination of unpopulated correctIndex dependency),
//           server-side solution_html rendering, zero answer key leakage,
//           and submitActivityResult preservation.
// ═══════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import assert from "assert";

const deberPath = path.resolve("topics/unit5-determinantes/deber.html");
const html = fs.readFileSync(deberPath, "utf-8");

// Extract inline scripts
const scriptMatches = html.match(/<script(?![^>]*src=)[\s\S]*?>([\s\S]*?)<\/script>/gi) || [];
assert.ok(scriptMatches.length > 0, "No scripts found in deber.html");
const allCode = scriptMatches.map((s) => s.replace(/<script[^>]*>|<\/script>/gi, "")).join("\n");

// 1. STATIC: No dead correctIndex or correct_index references
assert.ok(
  !allCode.includes("ex.correctIndex") && !allCode.includes("ex.correct_index"),
  "❌ deber.html must NOT contain dead references to ex.correctIndex or ex.correct_index"
);
console.log("✔ UI Integrity — Dead correctIndex dependency eliminated");

// 2. STATIC: MCQ styling uses ex.status when locked
assert.ok(
  allCode.includes('ex.status === "correct" ? " correct" : " wrong"'),
  "❌ MCQ option styling must check ex.status === 'correct' ? ' correct' : ' wrong'"
);
console.log("✔ UI Feedback — MCQ option styling cleanly reflects student selection status");

// 3. STATIC: solution_html is preserved and displayed when provided by server
assert.ok(
  allCode.includes("typeof res.solution_html === \"string\"") &&
  allCode.includes("targetEx.solution = res.solution_html"),
  "❌ deber.html must render res.solution_html from server response"
);
console.log("✔ Pedagogical Solution — Server solution_html properly assigned and displayed");

// 4. STATIC: All 22 exercises initialize with solution: null
const initialMatches = allCode.match(/solution:\s*null/g) || [];
assert.strictEqual(
  initialMatches.length,
  22,
  `❌ Exactly 22 exercises must have solution: null, found ${initialMatches.length}`
);
console.log("✔ Security — All 22 exercises initialize with solution: null (no embedded solutions)");

// 5. STATIC: No answer keys or private solutions exposed
const forbiddenKeys = [
  "correctAnswer",
  "correctAnswers",
  "answerKey",
  "solutionKey",
  "expectedAnswer",
  "respuestaCorrecta"
];
for (const key of forbiddenKeys) {
  assert.ok(
    !allCode.includes(key),
    `❌ Forbidden answer key '${key}' detected in deber.html`
  );
}
console.log("✔ Security Scan — Zero private answer keys detected in deber.html");

// 6. STATIC: submitActivityResult is called for final grading
assert.ok(
  allCode.includes("actModule.submitActivityResult") &&
  allCode.includes("u5-determinantes-class-01"),
  "❌ submitActivityResult must be called with activity_key 'u5-determinantes-class-01'"
);
console.log("✔ Architecture — Final grading delegates to submitActivityResult");

console.log("🎉 ALL DEBER FEEDBACK & MCQ INTEGRITY TESTS PASSED 100%!");
