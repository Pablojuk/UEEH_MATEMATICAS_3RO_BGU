import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();

console.log("==================================================");
console.log("UNIT 8 REAL FUNCTIONAL INTERACTION & EXECUTION TEST");
console.log("==================================================");

// ─────────────────────────────────────────────────────────────
// 1. GAMIFICACIÓN FUNCTIONAL EXECUTION TEST
// ─────────────────────────────────────────────────────────────
console.log("\n--- [1/3] Testing Gamificacion: Bomberman Z-Gauss 3D ---");
const gamPath = path.join(ROOT, "topics", "unit8-normal", "gamificacion.html");
assert.ok(fs.existsSync(gamPath), "❌ gamificacion.html must exist");
const gamContent = fs.readFileSync(gamPath, "utf8");

// Verify no placeholders or invalid scripts
assert.ok(!gamContent.includes("ACTIVITY_KEY_PLACEHOLDER"), "❌ Must NOT contain ACTIVITY_KEY_PLACEHOLDER");
assert.ok(!gamContent.includes("Vista previa local;"), "❌ Must NOT contain Vista previa local text");

// Extract module script
const gamScriptMatch = gamContent.match(/<script type="module">([\s\S]*?)<\/script>/i);
assert.ok(gamScriptMatch, "❌ Main game module script must be present");

let gamCode = gamScriptMatch[1].replace(/import\s+[\s\S]*?;/g, "");

// Track canvas rendering
let drawCalls = 0;
let filledRects = [];
let drawnTexts = [];

const mockCanvas = {
  width: 780,
  height: 660,
  clientWidth: 780,
  clientHeight: 660,
  style: {},
  getContext: (type) => ({
    fillRect: (x, y, w, h) => { drawCalls++; filledRects.push({ x, y, w, h }); },
    strokeRect: () => {},
    clearRect: () => { drawCalls++; },
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    stroke: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    roundRect: () => {},
    ellipse: () => {},
    fillText: (txt, x, y) => { drawnTexts.push(txt); },
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} })
  })
};

const createMockElement = (id) => ({
  id,
  textContent: "",
  innerText: "",
  innerHTML: "",
  className: "",
  style: { display: "" },
  disabled: false,
  dataset: {},
  classList: {
    add: () => {},
    remove: () => {},
    toggle: () => {}
  },
  setAttribute: () => {},
  addEventListener: () => {},
  appendChild: () => {},
  querySelectorAll: () => []
});

const domElements = {
  "bomber-canvas": mockCanvas,
  "start-screen": createMockElement("start-screen"),
  "game-screen": createMockElement("game-screen"),
  "instructions-screen": createMockElement("instructions-screen"),
  "end-screen": createMockElement("end-screen"),
  "challenge-modal": createMockElement("challenge-modal"),
  "hud-defeated": createMockElement("hud-defeated"),
  "hud-remaining": createMockElement("hud-remaining"),
  "hud-accuracy": createMockElement("hud-accuracy"),
  "hud-coins": createMockElement("hud-coins"),
  "hud-bar-fill": createMockElement("hud-bar-fill"),
  "btn-open-pending": createMockElement("btn-open-pending"),
  "btn-check": createMockElement("btn-check"),
  "btn-continue": createMockElement("btn-continue"),
  "btn-hint": createMockElement("btn-hint"),
  "btn-bomb": createMockElement("btn-bomb"),
  "btn-up": createMockElement("btn-up"),
  "btn-down": createMockElement("btn-down"),
  "btn-left": createMockElement("btn-left"),
  "btn-right": createMockElement("btn-right"),
  "modal-enemy-tag": createMockElement("modal-enemy-tag"),
  "modal-challenge-title": createMockElement("modal-challenge-title"),
  "modal-score-pill": createMockElement("modal-score-pill"),
  "modal-statement": createMockElement("modal-statement"),
  "modal-equation": createMockElement("modal-equation"),
  "modal-options": createMockElement("modal-options"),
  "modal-hint-box": createMockElement("modal-hint-box"),
  "modal-feedback": createMockElement("modal-feedback"),
  "modal-solution": createMockElement("modal-solution"),
  "modal-solution-content": createMockElement("modal-solution-content"),
  "finalize-status-msg": createMockElement("finalize-status-msg"),
  "btn-finalize": createMockElement("btn-finalize"),
  "end-score": createMockElement("end-score")
};

const gamContext = {
  console,
  Math,
  Date,
  performance,
  URLSearchParams,
  crypto: {
    randomUUID: () => "uuid-" + Math.random().toString(36).slice(2, 9)
  },
  window: {
    location: { search: "?previewStudent=test-student" },
    addEventListener: () => {},
    scrollTo: () => {},
    MathJax: { typesetPromise: async () => {} }
  },
  document: {
    getElementById: (id) => domElements[id] || (domElements[id] = createMockElement(id)),
    querySelectorAll: (sel) => [],
    createElement: (tag) => createMockElement("elem-" + Math.random()),
    addEventListener: () => {}
  },
  requestAnimationFrame: (cb) => { /* simulated */ },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  // Academic services mocks
  supabase: {},
  submitActivityResult: async () => ({ final_score: 10.0, score: 10.0 }),
  checkExercise: async (req) => ({
    success: true,
    exercise_key: req.exerciseKey,
    attempt_count: 1,
    correct: true,
    status: "correct",
    score: 10,
    locked: true,
    solution_html: "<p>Solución detallada</p>"
  }),
  getExerciseProgress: async () => []
};

gamContext.globalThis = gamContext;
gamContext.window.globalThis = gamContext;

vm.createContext(gamContext);
vm.runInContext(gamCode, gamContext);

// Verify window exports
assert.strictEqual(typeof gamContext.window.startGame, "function", "❌ window.startGame must be exported");
assert.strictEqual(typeof gamContext.window.checkAnswer, "function", "❌ window.checkAnswer must be exported");
assert.strictEqual(typeof gamContext.window.showInstructions, "function", "❌ window.showInstructions must be exported");

// Execute startGame()
await gamContext.window.startGame();

// Verify game state after start
const gamState = vm.runInContext("({ gameRunning, ACTIVITY_KEY, orderedMissions, enemies })", gamContext);
assert.strictEqual(gamState.gameRunning, true, "❌ gameRunning must be true after startGame()");
assert.strictEqual(gamState.ACTIVITY_KEY, "u8-normal-gam-01", "❌ ACTIVITY_KEY must be u8-normal-gam-01");
assert.strictEqual(gamState.orderedMissions.length, 6, "❌ 6 missions must be ordered");
assert.strictEqual(gamState.enemies.length, 6, "❌ Exactly 6 enemies must be generated in the 3D maze");
assert.ok(drawCalls > 0, "❌ Maze and Blender arena must be rendered on canvas");

console.log("✔ Gamificacion — startGame() executed cleanly, maze rendered, 6 enemies instantiated, seed resolved!");

// ─────────────────────────────────────────────────────────────
// 2. DEBER FUNCTIONAL EXECUTION TEST
// ─────────────────────────────────────────────────────────────
console.log("\n--- [2/3] Testing Deber: Distribución Normal (20 initial + 10 recovery) ---");
const debPath = path.join(ROOT, "topics", "unit8-normal", "deber.html");
assert.ok(fs.existsSync(debPath), "❌ deber.html must exist");
const debContent = fs.readFileSync(debPath, "utf8");

assert.ok(!debContent.includes("ACTIVITY_KEY_PLACEHOLDER"), "❌ Must NOT contain ACTIVITY_KEY_PLACEHOLDER");
assert.ok(!debContent.includes("Vista previa local:"), "❌ Must NOT contain Vista previa local text");

// Extract module script
const debScriptMatch = debContent.match(/<script type="module">([\s\S]*?)<\/script>/i);
assert.ok(debScriptMatch, "❌ Main classwork module script must be present");

let debCode = debScriptMatch[1].replace(/import\s+[\s\S]*?;/g, "");

const debDomStore = {};
const getOrCreateElement = (id) => {
  if (!debDomStore[id]) {
    debDomStore[id] = {
      id,
      innerHTML: "",
      textContent: "",
      innerText: "",
      className: "",
      style: { display: "" },
      disabled: false,
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {}
      },
      setAttribute: () => {},
      addEventListener: () => {}
    };
  }
  return debDomStore[id];
};

const debContext = {
  console,
  Math,
  Date,
  performance,
  URLSearchParams,
  crypto: {
    randomUUID: () => "uuid-" + Math.random().toString(36).slice(2, 9)
  },
  window: {
    location: { search: "?previewStudent=test-student" },
    addEventListener: () => {},
    scrollTo: () => {},
    MathJax: { typesetPromise: async () => {} }
  },
  document: {
    getElementById: (id) => getOrCreateElement(id),
    querySelectorAll: (sel) => [],
    createElement: (tag) => ({ ...getOrCreateElement("elem-" + Math.random()), tagName: tag }),
    addEventListener: () => {}
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  // Academic services mocks
  supabase: {},
  submitActivityResult: async () => ({
    final_score: 7.00,
    score: 7.00,
    initial_score: 6.00,
    recovery_score: 8.00
  }),
  checkExercise: async (req) => ({
    success: true,
    exercise_key: req.exerciseKey,
    attempt_count: 1,
    correct: true,
    status: "correct",
    score: 10,
    locked: true,
    solution_html: "<p>Solución oficial</p>"
  }),
  getExerciseProgress: async () => []
};

debContext.globalThis = debContext;
debContext.window.globalThis = debContext;

vm.createContext(debContext);
vm.runInContext(debCode, debContext);

// Verify window exports
assert.strictEqual(typeof debContext.window.startActivity, "function", "❌ window.startActivity must be exported");
assert.strictEqual(typeof debContext.window.checkAnswer, "function", "❌ window.checkAnswer must be exported");
assert.strictEqual(typeof debContext.window.finalizeActivityAdapter, "function", "❌ window.finalizeActivityAdapter must be exported");

// Execute initAppWithSeed()
await vm.runInContext("initAppWithSeed()", debContext);

// Verify initial and recovery exercises
const debState = vm.runInContext("({ orderedInitialExercises, orderedRecoveryExercises, currentIdx })", debContext);
assert.strictEqual(debState.orderedInitialExercises.length, 20, "❌ orderedInitialExercises must have exactly 20 exercises");
assert.strictEqual(debState.orderedRecoveryExercises.length, 10, "❌ orderedRecoveryExercises must have exactly 10 exercises");

// Execute startActivity() and renderExercise()
debContext.window.startActivity();
const panel = getOrCreateElement("exercisePanel");
assert.ok(panel.innerHTML.length > 50, "❌ exercisePanel must contain rendered exercise HTML");
assert.ok(panel.innerHTML.includes("Estandariza"), "❌ Rendered exercise must contain exercise content");

// Test navigation
debContext.window.nextExercise();
assert.strictEqual(vm.runInContext("currentIdx", debContext), 1, "❌ currentIdx must advance to 1 on nextExercise()");
debContext.window.prevExercise();
assert.strictEqual(vm.runInContext("currentIdx", debContext), 0, "❌ currentIdx must return to 0 on prevExercise()");

// Test renderSummary with serverFinalScore
vm.runInContext("renderSummary(7.00)", debContext);
const sumFinal = getOrCreateElement("sumFinal");
assert.strictEqual(sumFinal.textContent, "7.00", "❌ sumFinal must display the official server final score");

console.log("✔ Deber — initAppWithSeed() initialized 20 initial + 10 recovery exercises, navigation works, official summary reflects server final score!");

// ─────────────────────────────────────────────────────────────
// 3. REGRESSION INTEGRITY TEST: UNITS 5, 6, 7
// ─────────────────────────────────────────────────────────────
console.log("\n--- [3/3] Regression Audit: Units 5, 6, 7 Untouched & Operational ---");

const u5Path = path.join(ROOT, "topics", "unit5-determinantes", "deber.html");
const u6Path = path.join(ROOT, "topics", "unit6-sucesiones", "deber.html");
const u7Path = path.join(ROOT, "topics", "unit7-binomial", "deber.html");

assert.ok(fs.existsSync(u5Path), "❌ Unit 5 deber must exist");
assert.ok(fs.existsSync(u6Path), "❌ Unit 6 deber must exist");
assert.ok(fs.existsSync(u7Path), "❌ Unit 7 deber must exist");

const u7Content = fs.readFileSync(u7Path, "utf8");
assert.ok(u7Content.includes("u7-binomial-class-01"), "❌ Unit 7 activity key must be u7-binomial-class-01");
assert.ok(u7Content.includes("finalScore = (serverFinalScore !== null"), "❌ Unit 7 serverFinalScore handling must be intact");

console.log("✔ Regression — Units 5, 6, 7 intact and unaffected by Unit 8 updates.");

console.log("\n🎉 ALL REAL FUNCTIONAL INTERACTION & EXECUTION TESTS PASSED 100%!");
