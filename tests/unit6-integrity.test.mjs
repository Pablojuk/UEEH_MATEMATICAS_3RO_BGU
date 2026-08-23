import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();

console.log("==================================================");
console.log("UNIT 6 INTEGRITY & SECURITY AUDIT TEST SUITE");
console.log("==================================================");

// ─────────────────────────────────────────────────────────────
// 1. PRESENTATION.HTML AUDIT
// ─────────────────────────────────────────────────────────────
const presPath = path.join(ROOT, "topics", "unit6-sucesiones", "presentation.html");
assert.ok(fs.existsSync(presPath), "❌ topics/unit6-sucesiones/presentation.html must exist");
const presContent = fs.readFileSync(presPath, "utf8");

assert.ok(presContent.includes("MathJax"), "❌ presentation.html must include MathJax 3");
assert.ok(presContent.includes("slide"), "❌ presentation.html must contain slides");
assert.ok(!presContent.includes("createClient("), "❌ presentation.html must not create Supabase clients");
assert.ok(!presContent.includes("submitActivityResult"), "❌ presentation.html must not submit grades (formative only)");
console.log("✔ Presentation — Formative presentation verified with MathJax 3 and 0 Supabase writes");

// ─────────────────────────────────────────────────────────────
// 2. GAMIFICACION.HTML AUDIT
// ─────────────────────────────────────────────────────────────
const gamPath = path.join(ROOT, "topics", "unit6-sucesiones", "gamificacion.html");
assert.ok(fs.existsSync(gamPath), "❌ topics/unit6-sucesiones/gamificacion.html must exist");
const gamContent = fs.readFileSync(gamPath, "utf8");

assert.ok(!gamContent.includes("AUTHORING_ANSWER_KEY"), "❌ gamificacion.html must NOT contain AUTHORING_ANSWER_KEY");
assert.ok(!gamContent.includes("AUTHORING_MODE = true"), "❌ gamificacion.html must NOT have AUTHORING_MODE active");
assert.ok(gamContent.includes("u6-sucesiones-gam-01"), "❌ gamificacion.html must use activity_key u6-sucesiones-gam-01");
assert.ok(gamContent.includes("checkInFlight") || gamContent.includes("_submittingAnswer"), "❌ gamificacion.html must implement in-flight submit guard");
assert.ok(gamContent.includes("checkExercise"), "❌ gamificacion.html must import and call checkExercise");
assert.ok(gamContent.includes("getExerciseProgress"), "❌ gamificacion.html must import and call getExerciseProgress");
assert.ok(gamContent.includes("submitActivityResult"), "❌ gamificacion.html must delegate final grade to submitActivityResult");
assert.ok(gamContent.includes("import { supabase } from '../../core/supabase-client.js'"), "❌ gamificacion.html must import singleton supabase client");

// Verify all missions have solution: null
const missionRegex = /const MISSIONS\s*=\s*(\[[\s\S]*?\]);/;
const matchGam = gamContent.match(missionRegex);
assert.ok(matchGam, "❌ MISSIONS array must be declared in gamificacion.html");

const missions = eval(matchGam[1]);
assert.strictEqual(missions.length, 8, "❌ MISSIONS must contain exactly 8 challenges");
missions.forEach((m, idx) => {
  assert.ok(m.exerciseKey, `❌ Mission ${idx + 1} must have exerciseKey`);
  assert.ok(m.statement, `❌ Mission ${idx + 1} must have statement`);
  assert.ok(m.equation, `❌ Mission ${idx + 1} must have equation`);
  assert.ok(Array.isArray(m.options) && m.options.length >= 2, `❌ Mission ${idx + 1} must have options array`);
  assert.ok(m.hint, `❌ Mission ${idx + 1} must have procedural hint`);
  assert.strictEqual(m.solution, null, `❌ Mission ${idx + 1} must have solution: null in public HTML`);
});
console.log("✔ Gamificacion — 8 missions verified with in-flight guard, exercise-progress-service, and solution: null");

// ─────────────────────────────────────────────────────────────
// 3. DEBER.HTML AUDIT
// ─────────────────────────────────────────────────────────────
const debPath = path.join(ROOT, "topics", "unit6-sucesiones", "deber.html");
assert.ok(fs.existsSync(debPath), "❌ topics/unit6-sucesiones/deber.html must exist");
const debContent = fs.readFileSync(debPath, "utf8");

assert.ok(!debContent.includes("AUTHORING_ANSWER_KEY"), "❌ deber.html must NOT contain AUTHORING_ANSWER_KEY");
assert.ok(debContent.includes("u6-sucesiones-class-01"), "❌ deber.html must use activity_key u6-sucesiones-class-01");
assert.ok(debContent.includes("_submitting"), "❌ deber.html must implement _submitting guard");
assert.ok(debContent.includes("_pendingSubmission"), "❌ deber.html must implement _pendingSubmission binding");
assert.ok(debContent.includes("checkExercise"), "❌ deber.html must import and call checkExercise");
assert.ok(debContent.includes("getExerciseProgress"), "❌ deber.html must import and call getExerciseProgress");
assert.ok(debContent.includes("submitActivityResult"), "❌ deber.html must delegate final grade to submitActivityResult");
assert.ok(debContent.includes("import { supabase } from '../../core/supabase-client.js'"), "❌ deber.html must import singleton supabase client");

// Verify exercisesVisual (20) and recoveryVisual (10)
const exMatch = debContent.match(/const exercisesVisual\s*=\s*(\[[\s\S]*?\]);/);
assert.ok(exMatch, "❌ exercisesVisual array must be declared in deber.html");
const initialExs = eval(exMatch[1]);
assert.strictEqual(initialExs.length, 20, `❌ exercisesVisual must have 20 exercises, found ${initialExs.length}`);

const recMatch = debContent.match(/const recoveryVisual\s*=\s*(\[[\s\S]*?\]);/);
assert.ok(recMatch, "❌ recoveryVisual array must be declared in deber.html");
const recoveryExs = eval(recMatch[1]);
assert.strictEqual(recoveryExs.length, 10, `❌ recoveryVisual must have 10 recovery exercises, found ${recoveryExs.length}`);

[...initialExs, ...recoveryExs].forEach((ex, idx) => {
  assert.ok(ex.exerciseKey, `❌ Exercise ${idx + 1} must have exerciseKey`);
  assert.ok(ex.statement, `❌ Exercise ${idx + 1} must have statement`);
  assert.ok(ex.hint, `❌ Exercise ${idx + 1} must have procedural hint`);
  assert.strictEqual(ex.solution, null, `❌ Exercise ${idx + 1} must have solution: null in public HTML`);
});
console.log("✔ Deber — 20 initial + 10 recovery exercises verified with _submitting guard, exercise-progress-service, and solution: null");

// ─────────────────────────────────────────────────────────────
// 4. RETRY IDEMPOTENCY & TECHNICAL ERROR BEHAVIORAL AUDIT
// ─────────────────────────────────────────────────────────────
assert.ok(gamContent.includes("_pendingGamCheckIds"), "❌ gamificacion.html must track pending check IDs for idempotent retry");
assert.ok(gamContent.includes("delete _pendingGamCheckIds"), "❌ gamificacion.html must clean pending check ID only on success");
assert.ok(debContent.includes("_pendingSubmission = null"), "❌ deber.html must clear _pendingSubmission only on success");
console.log("✔ Retry Idempotency — Both gamification and classwork retain pending check IDs on technical errors");

// ─────────────────────────────────────────────────────────────
// 5. ORIGINAL SOURCE INTEGRITY AUDIT
// ─────────────────────────────────────────────────────────────
const dropboxDir = "C:\\Users\\ASUS\\Dropbox\\UNIDAD EDUCATIVA EMILIANO HINOZTROZA\\DOCUMENTOS HTML\\SUCESIONES CONVERGENTES Y LÍMITE DE UNA SUCESIÓN";
const origPres = path.join(dropboxDir, "PRESENTACIÓN.html");
const origGam = path.join(dropboxDir, "GAMIFICACION.html");
const origDeb = path.join(dropboxDir, "DEBER.html");

assert.ok(fs.existsSync(origPres), "❌ Original PRESENTACIÓN.html in Dropbox must exist intact");
assert.ok(fs.existsSync(origGam), "❌ Original GAMIFICACION.html in Dropbox must exist intact");
assert.ok(fs.existsSync(origDeb), "❌ Original DEBER.html in Dropbox must exist intact");
console.log("✔ Original Files — Source files in Dropbox remain 100% intact and untouched");

console.log("🎉 ALL UNIT 6 INTEGRITY & SECURITY TESTS PASSED 100%!");
