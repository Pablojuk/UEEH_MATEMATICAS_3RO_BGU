import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

console.log("==================================================");
console.log("UNIT 8 INTEGRITY & SECURITY AUDIT TEST SUITE");
console.log("==================================================");

// ─────────────────────────────────────────────────────────────
// 1. PRESENTATION.HTML AUDIT
// ─────────────────────────────────────────────────────────────
const presPath = path.join(ROOT, "topics", "unit8-normal", "presentation.html");
assert.ok(fs.existsSync(presPath), "❌ topics/unit8-normal/presentation.html must exist");
const presContent = fs.readFileSync(presPath, "utf8");

assert.ok(presContent.includes("MathJax"), "❌ presentation.html must include MathJax 3");
assert.ok(presContent.includes("slide"), "❌ presentation.html must contain slides");
assert.ok(!presContent.includes("createClient("), "❌ presentation.html must not create Supabase clients");
assert.ok(!presContent.includes("submitActivityResult"), "❌ presentation.html must not submit grades (formative only)");
console.log("✔ Presentation — Formative presentation verified with MathJax 3 and 0 Supabase writes");

// ─────────────────────────────────────────────────────────────
// 2. GAMIFICACION.HTML AUDIT
// ─────────────────────────────────────────────────────────────
const gamPath = path.join(ROOT, "topics", "unit8-normal", "gamificacion.html");
assert.ok(fs.existsSync(gamPath), "❌ topics/unit8-normal/gamificacion.html must exist");
const gamContent = fs.readFileSync(gamPath, "utf8");

assert.ok(!gamContent.includes("AUTHORING_MODE = true"), "❌ gamificacion.html must NOT have AUTHORING_MODE active");
assert.ok(gamContent.includes("u8-normal-gam-01"), "❌ gamificacion.html must use activity_key u8-normal-gam-01");
assert.ok(gamContent.includes("checkInFlight"), "❌ gamificacion.html must implement in-flight submit guard");
assert.ok(gamContent.includes("checkExercise"), "❌ gamificacion.html must import and call checkExercise");
assert.ok(gamContent.includes("getExerciseProgress"), "❌ gamificacion.html must import and call getExerciseProgress");
assert.ok(gamContent.includes("submitActivityResult"), "❌ gamificacion.html must delegate final grade to submitActivityResult");
assert.match(gamContent, /import\s+\{\s*supabase\s*\}\s+from\s+['"]\.\.\/\.\.\/core\/supabase-client\.js(?:\?v=[^'"]+)?['"]/, "❌ gamificacion.html must import singleton supabase client");

// Verify all missions
const missionRegex = /const MISSIONS\s*=\s*(\[[\s\S]*?\]);\s*\/\//;
const matchGam = gamContent.match(missionRegex);
assert.ok(matchGam, "❌ MISSIONS array must be declared in gamificacion.html");

const missions = eval(matchGam[1]);
assert.strictEqual(missions.length, 6, "❌ MISSIONS must contain exactly 6 challenges");
missions.forEach((m, idx) => {
  assert.ok(m.exerciseKey, `❌ Mission ${idx + 1} must have exerciseKey`);
  assert.ok(m.statement, `❌ Mission ${idx + 1} must have statement`);
  assert.ok(m.equation, `❌ Mission ${idx + 1} must have equation`);
  assert.ok(Array.isArray(m.options) && m.options.length >= 2, `❌ Mission ${idx + 1} must have options array`);
  assert.ok(m.hint, `❌ Mission ${idx + 1} must have procedural hint`);
  assert.ok(!m.solution, `❌ Mission ${idx + 1} must not contain solution in public HTML`);
  assert.ok(!m.correctOptionKey, `❌ Mission ${idx + 1} must not contain correctOptionKey in public HTML`);
});
console.log("✔ Gamificacion — 6 missions verified with in-flight guard, exercise-progress-service, and 0 answer leakage");

// ─────────────────────────────────────────────────────────────
// 3. DEBER.HTML AUDIT
// ─────────────────────────────────────────────────────────────
const debPath = path.join(ROOT, "topics", "unit8-normal", "deber.html");
assert.ok(fs.existsSync(debPath), "❌ topics/unit8-normal/deber.html must exist");
const debContent = fs.readFileSync(debPath, "utf8");

assert.ok(!debContent.includes("AUTHORING_MODE = true"), "❌ deber.html must NOT have AUTHORING_MODE active");
assert.ok(debContent.includes("u8-normal-class-01"), "❌ deber.html must use activity_key u8-normal-class-01");
assert.ok(debContent.includes("checkExercise"), "❌ deber.html must import and call checkExercise");
assert.ok(debContent.includes("getExerciseProgress"), "❌ deber.html must import and call getExerciseProgress");
assert.ok(debContent.includes("submitActivityResult"), "❌ deber.html must delegate final grade to submitActivityResult");
assert.match(debContent, /import\s+\{\s*supabase\s*\}\s+from\s+['"]\.\.\/\.\.\/core\/supabase-client\.js(?:\?v=[^'"]+)?['"]/, "❌ deber.html must import singleton supabase client");

// Verify exercisesVisual (20) and recoveryVisual (10)
const exMatch = debContent.match(/const exercisesVisual\s*=\s*(\[[\s\S]*?\]);\s*const/);
assert.ok(exMatch, "❌ exercisesVisual array must be declared in deber.html");
const initialExs = eval(exMatch[1]);
assert.strictEqual(initialExs.length, 20, `❌ exercisesVisual must have 20 exercises, found ${initialExs.length}`);

const recMatch = debContent.match(/const recoveryVisual\s*=\s*(\[[\s\S]*?\]);\s*let/);
assert.ok(recMatch, "❌ recoveryVisual array must be declared in deber.html");
const recExs = eval(recMatch[1]);
assert.strictEqual(recExs.length, 10, `❌ recoveryVisual must have 10 exercises, found ${recExs.length}`);

// Verify zero solution leakage in public deber
[...initialExs, ...recExs].forEach((item, idx) => {
  assert.ok(!item.solution, `❌ Exercise ${idx + 1} (${item.exerciseKey}) must not contain solution in public HTML`);
  assert.ok(!item.correctOptionKey, `❌ Exercise ${idx + 1} (${item.exerciseKey}) must not contain correctOptionKey in public HTML`);
  assert.ok(!item.acceptedAnswers, `❌ Exercise ${idx + 1} (${item.exerciseKey}) must not contain acceptedAnswers in public HTML`);
});

// Verify recovery arithmetic average formula
assert.ok(
  debContent.includes("(initialVisualScore + recoveryVisualScore) / 2"),
  "❌ deber.html must use official arithmetic average formula: (initial + recovery) / 2"
);

console.log("✔ Deber — 20 initial + 10 recovery exercises verified with exercise-progress-service, average policy, and 0 answer leakage");

// ─────────────────────────────────────────────────────────────
// 4. CURRICULUM CONFIG AUDIT
// ─────────────────────────────────────────────────────────────
import { getUnitByNumber } from "../core/curriculum-config.js";
const unit8 = getUnitByNumber(8);
assert.ok(unit8, "❌ Unit 8 must be registered in CURRICULUM_UNITS");
assert.strictEqual(unit8.unitNumber, 8);
assert.strictEqual(unit8.slug, "unit8-normal");
assert.strictEqual(unit8.status, "ACTIVA");
assert.ok(unit8.routes.presentation, "❌ Unit 8 must have presentation route");
assert.ok(unit8.routes.gamification, "❌ Unit 8 must have gamification route");
assert.ok(unit8.routes.classwork, "❌ Unit 8 must have classwork route");
assert.ok(unit8.routes.results, "❌ Unit 8 must have results route");
console.log("✔ Curriculum Config — Unit 8 registered with all 4 routes and proper slug");

// ─────────────────────────────────────────────────────────────
// 5. PROVISIONING MIGRATION AUDIT
// ─────────────────────────────────────────────────────────────
const migPath = path.join(ROOT, "supabase", "migrations", "20261026180000_unit8_normal_provisioning.sql");
assert.ok(fs.existsSync(migPath), "❌ Migration 20261026180000_unit8_normal_provisioning.sql must exist");
const migContent = fs.readFileSync(migPath, "utf8");

assert.ok(migContent.includes("u8-normal-gam-01"), "❌ Migration must provision u8-normal-gam-01");
assert.ok(migContent.includes("u8-normal-class-01"), "❌ Migration must provision u8-normal-class-01");
assert.ok(migContent.includes("gamification_unlimited"), "❌ Gamification must have gamification_unlimited policy");
assert.ok(migContent.includes("classwork_limited"), "❌ Classwork must have classwork_limited policy");
assert.ok(migContent.includes('"recovery_policy": "average"'), "❌ Classwork must explicitly configure recovery_policy = average");
assert.ok(migContent.includes("is_active,\n    opens_at,\n    due_at") || migContent.includes("is_active"), "❌ Migration must manage activity status");
console.log("✔ Provisioning Migration — Unit 8 activities and private grading configs verified");

console.log("\n🎉 ALL UNIT 8 INTEGRITY & SECURITY TESTS PASSED 100%!");
