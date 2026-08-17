// ═══════════════════════════════════════════════════════════════════════════
// Immutable Unit 5+ Grading System Unit Test — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import assert from "assert";

// 1. Gamification Scoring Logic Test
function calcGamificationExerciseScore(attemptNumber, isCorrect) {
  if (!isCorrect) return 0;
  if (attemptNumber === 1) return 10.0;
  if (attemptNumber === 2) return 9.0;
  if (attemptNumber === 3) return 8.0;
  return 7.0; // Attempt 4, 5, 6, ..., N >= 4 is ALWAYS 7.00
}

function calcGamificationActivityScore(exerciseScores) {
  if (exerciseScores.length === 0) return 0;
  const sum = exerciseScores.reduce((acc, s) => acc + s, 0);
  return Math.round((sum / exerciseScores.length) * 100) / 100;
}

// Test case N: 10, 10, 10, 9, 9, 10 -> sum=58 / 6 = 9.6666... -> 9.67
const caseGam1 = [
  calcGamificationExerciseScore(1, true),
  calcGamificationExerciseScore(1, true),
  calcGamificationExerciseScore(1, true),
  calcGamificationExerciseScore(2, true),
  calcGamificationExerciseScore(2, true),
  calcGamificationExerciseScore(1, true)
];
assert.strictEqual(calcGamificationActivityScore(caseGam1), 9.67, "❌ Gamification average 10+10+10+9+9+10 must equal 9.67");

// Test case N: attempts 4, 4, 5, 6, 10, 20 (all >= 4) -> all 7.0 -> average 7.00
const caseGam2 = [
  calcGamificationExerciseScore(4, true),
  calcGamificationExerciseScore(4, true),
  calcGamificationExerciseScore(5, true),
  calcGamificationExerciseScore(6, true),
  calcGamificationExerciseScore(10, true),
  calcGamificationExerciseScore(20, true)
];
assert.strictEqual(calcGamificationActivityScore(caseGam2), 7.00, "❌ Gamification attempt >= 4 must be 7.00");

// 2. Classwork Scoring Logic Test (Max 4 attempts)
function calcClassworkExerciseScore(attemptNumber, isCorrect) {
  if (attemptNumber > 4) {
    throw new Error("Attempt 5+ is NOT allowed for classwork");
  }
  if (isCorrect) {
    if (attemptNumber === 1) return 10.0;
    if (attemptNumber === 2) return 9.0;
    if (attemptNumber === 3) return 8.0;
    if (attemptNumber === 4) return 7.0;
  } else {
    if (attemptNumber === 4) return 1.0; // 4th failure = 1.00 & locked!
    return 0.0; // Pending retry for attempts < 4
  }
}

assert.strictEqual(calcClassworkExerciseScore(1, true), 10.0);
assert.strictEqual(calcClassworkExerciseScore(2, true), 9.0);
assert.strictEqual(calcClassworkExerciseScore(3, true), 8.0);
assert.strictEqual(calcClassworkExerciseScore(4, true), 7.0);
assert.strictEqual(calcClassworkExerciseScore(4, false), 1.0, "❌ 4th attempt failure in classwork must score 1.00");
assert.throws(() => calcClassworkExerciseScore(5, true), /NOT allowed/, "❌ Attempt 5+ must be rejected");

// 3. Recovery Final Score Logic Test: MAX(initial, recovery)
function calcFinalClassworkScore(rawInitial, recoveryScore) {
  if (rawInitial >= 7.0) return rawInitial;
  if (recoveryScore === null || recoveryScore === undefined) return rawInitial;
  return Math.max(rawInitial, recoveryScore);
}

assert.strictEqual(calcFinalClassworkScore(6.0, 8.0), 8.0, "❌ Initial 6 + Recovery 8 must equal 8.0");
assert.strictEqual(calcFinalClassworkScore(6.0, 4.0), 6.0, "❌ Initial 6 + Recovery 4 must equal 6.0");
assert.strictEqual(calcFinalClassworkScore(3.5, 7.25), 7.25, "❌ Initial 3.5 + Recovery 7.25 must equal 7.25");

// 4. Dynamic 80% Recovery Question Count Calculation for Future Units
function calcRecoveryQuestionCount(totalClassworkQuestions) {
  return Math.ceil(totalClassworkQuestions * 0.80);
}

assert.strictEqual(calcRecoveryQuestionCount(14), 12, "❌ 14 classwork questions -> ceil(14 * 0.80) = 12");
assert.strictEqual(calcRecoveryQuestionCount(15), 12, "❌ 15 classwork questions -> ceil(15 * 0.80) = 12");
assert.strictEqual(calcRecoveryQuestionCount(16), 13, "❌ 16 classwork questions -> ceil(16 * 0.80) = 13");
assert.strictEqual(calcRecoveryQuestionCount(20), 16, "❌ 20 classwork questions -> ceil(20 * 0.80) = 16");

console.log("🎉 ALL IMMUTABLE GRADING SYSTEM UNIT TESTS PASSED 100%!");
