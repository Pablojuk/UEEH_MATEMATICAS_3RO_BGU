import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();

console.log("==================================================");
console.log("UNIT 8 CHECK BUTTON & SUPABASE GRADES AUDIT SUITE");
console.log("==================================================");

// ─────────────────────────────────────────────────────────────
// 1. DEBER.HTML COMPROBAR & SUBMISSION INTEGRITY
// ─────────────────────────────────────────────────────────────
const debPath = path.join(ROOT, "topics", "unit8-normal", "deber.html");
const debContent = fs.readFileSync(debPath, "utf8");

// Verify UI error handling and check_id retention
assert.ok(debContent.includes("st.pendingCheckId"), "❌ deber.html must retain pendingCheckId for retries");
assert.ok(debContent.includes("Error al comprobar:"), "❌ deber.html must show visible error message on check failure");
assert.ok(debContent.includes("res?.data?.final_score"), "❌ deber.html must read final_score from res.data");
assert.ok(debContent.includes("res.state === \"confirmed\""), "❌ deber.html must verify confirmed state before showing final score");

// ─────────────────────────────────────────────────────────────
// 2. GAMIFICACION.HTML COMPROBAR & SUBMISSION INTEGRITY
// ─────────────────────────────────────────────────────────────
const gamPath = path.join(ROOT, "topics", "unit8-normal", "gamificacion.html");
const gamContent = fs.readFileSync(gamPath, "utf8");

assert.ok(gamContent.includes("pendingCheckId"), "❌ gamificacion.html must retain pendingCheckId for retries");
assert.ok(gamContent.includes("Error al comprobar:"), "❌ gamificacion.html must show visible error message in modal-feedback on check failure");
assert.ok(gamContent.includes("res?.data?.final_score"), "❌ gamificacion.html must read final_score from res.data");
assert.ok(gamContent.includes("res.state === \"confirmed\""), "❌ gamificacion.html must verify confirmed state");

// ─────────────────────────────────────────────────────────────
// 3. EXERCISE-PROGRESS-SERVICE JSON ERROR RESILIENCE
// ─────────────────────────────────────────────────────────────
const progServPath = path.join(ROOT, "core", "exercise-progress-service.js");
const progServContent = fs.readFileSync(progServPath, "utf8");

assert.ok(progServContent.includes("body = await res.json()"), "❌ exercise-progress-service.js must parse json safely");
assert.ok(progServContent.includes("Error del servidor"), "❌ exercise-progress-service.js must handle non-JSON / HTTP error payloads gracefully");

// ─────────────────────────────────────────────────────────────
// 4. BEHAVIORAL VM TEST: ERROR AND CONFIRMATION DISPATCH
// ─────────────────────────────────────────────────────────────
const debScriptMatch = debContent.match(/<script type="module">([\s\S]*?)<\/script>/i);
assert.ok(debScriptMatch, "❌ Main script module must exist in deber.html");
let debCode = debScriptMatch[1].replace(/import\s+[\s\S]*?;/g, "");

const debStore = {};
const mockEl = (id) => debStore[id] || (debStore[id] = {
  id,
  innerHTML: "",
  textContent: "",
  style: {},
  classList: { add: () => {}, remove: () => {}, contains: () => false },
  setAttribute: () => {},
  querySelector: () => null
});

let mockCheckResponse = {
  success: false,
  error: "Estudiante no registrado o inactivo"
};

let mockSubmitResponse = {
  success: true,
  state: "confirmed",
  data: { final_score: 7.50, score: 7.50, initial_score: 6.00, recovery_score: 9.00 }
};

const debContext = {
  console, Math, Date, performance, URLSearchParams,
  crypto: { randomUUID: () => "uuid-" + Math.random().toString(36).slice(2, 9) },
  window: {
    location: { search: "?previewStudent=test-docente" },
    addEventListener: () => {}, scrollTo: () => {},
    MathJax: { typesetPromise: async () => {} }
  },
  document: {
    getElementById: (id) => mockEl(id),
    querySelectorAll: () => [],
    createElement: (tag) => ({ ...mockEl("elem-" + Math.random()), tagName: tag }),
    addEventListener: () => {}
  },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  alert: (msg) => { console.log("[UI Alert]", msg); },
  supabase: {},
  checkExercise: async () => mockCheckResponse,
  submitActivityResult: async () => mockSubmitResponse,
  getExerciseProgress: async () => []
};

debContext.globalThis = debContext;
debContext.window.globalThis = debContext;
debContext.window.document = debContext.document;

vm.createContext(debContext);
vm.runInContext(debCode, debContext);

// Init
await vm.runInContext("initAppWithSeed()", debContext);

// 1. Simulate Check Failure (e.g. Auth / Student error)
const initialIdx = vm.runInContext("orderedInitialExercises.findIndex(ex => ex.exerciseKey === 'initial-q01')", debContext);
vm.runInContext(`currentIdx = ${initialIdx}`, debContext);
vm.runInContext("updateDirectInput('initial-q01', '1.5')", debContext);
await debContext.window.checkAnswer();
const ex1State = vm.runInContext("exerciseState['initial-q01']", debContext);
assert.ok(ex1State.feedbackText.includes("Error al comprobar:"), "❌ Feedback must show visible error when checkExercise fails");
assert.ok(ex1State.feedbackText.includes("Estudiante no registrado o inactivo"), "❌ Feedback must show actual server error message");
assert.ok(ex1State.pendingCheckId, "❌ pendingCheckId must be retained for idempotency");
assert.strictEqual(ex1State.locked, false, "❌ Exercise must remain unlocked on technical failure");
console.log("✔ Test Case A — Check failure shows visible, friendly error and preserves pending check ID");

// 2. Simulate Check Success
mockCheckResponse = {
  success: true,
  exercise_key: "initial-q01",
  attempt_count: 1,
  correct: true,
  status: "correct",
  score: 10,
  locked: true,
  remaining_attempts: 3,
  solution_html: "<p>Paso a paso</p>"
};
await debContext.window.checkAnswer();
assert.strictEqual(ex1State.status, "correct", "❌ Status must update to correct");
assert.strictEqual(ex1State.locked, true, "❌ Exercise must be locked on correct answer");
assert.strictEqual(ex1State.score, 10, "❌ Score must be 10 on first attempt");
assert.strictEqual(ex1State.pendingCheckId, null, "❌ pendingCheckId must be cleared on success");
console.log("✔ Test Case B — Check success applies score (10), locks exercise, clears pending ID");

// 3. Simulate Finalize Activity with res.data.final_score
// Mock completed progress
vm.runInContext(`
  orderedInitialExercises.forEach(ex => {
    exerciseState[ex.exerciseKey].status = 'correct';
    exerciseState[ex.exerciseKey].score = 10;
  });
`, debContext);

await debContext.window.finalizeActivityAdapter();
const sumFinalEl = mockEl("sumFinal");
assert.strictEqual(sumFinalEl.textContent, "7.50", "❌ Official score (7.50) from res.data.final_score must be displayed in sumFinal");
console.log("✔ Test Case C — Activity finalization correctly unpacks res.data.final_score and updates official UI summary");

console.log("\n🎉 ALL UNIT 8 CHECK BUTTON & SUPABASE GRADES TESTS PASSED 100%!");
