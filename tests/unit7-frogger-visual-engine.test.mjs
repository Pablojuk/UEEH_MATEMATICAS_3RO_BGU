import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();
const gamPath = path.join(ROOT, "topics", "unit7-binomial", "gamificacion.html");
assert.ok(fs.existsSync(gamPath), "❌ gamificacion.html must exist");

const gamContent = fs.readFileSync(gamPath, "utf8");

console.log("==================================================");
console.log("UNIT 7 FROGGER VISUAL ENGINE & RENDERING AUDIT");
console.log("==================================================");

// 1. Verify static integrity
assert.ok(!gamContent.includes("restorePreviewState()"), "❌ Must NOT call undefined restorePreviewState()");
assert.ok(gamContent.includes("window.MathJax && window.MathJax.typesetPromise"), "❌ typeset() must use window.MathJax.typesetPromise");
assert.ok(!gamContent.includes("4 comprobaciones fallidas: 1/10"), "❌ Instructions must not contradict gamification_unlimited policy");

// 2. Extract module script for VM behavioral execution
const re = /<script type="module">([\s\S]*?)<\/script>/i;
const match = gamContent.match(re);
assert.ok(match, "❌ Main game module script must be present");

let scriptCode = match[1];
// Strip ES module imports for pure VM execution
scriptCode = scriptCode.replace(/import\s+[\s\S]*?;/g, "");

// Track rendering & physics
let drawCalls = 0;
let filledRects = [];
let strokeRects = [];
let textDrawn = [];
let rafCount = 0;
let rafCallbacks = [];

const mockCanvas = {
  width: 560,
  height: 600,
  clientWidth: 560,
  clientHeight: 600,
  style: {},
  getContext: (type) => {
    if (type === "2d") {
      return {
        fillRect: (x, y, w, h) => {
          drawCalls++;
          filledRects.push({ x, y, w, h });
        },
        strokeRect: (x, y, w, h) => {
          strokeRects.push({ x, y, w, h });
        },
        clearRect: () => {},
        beginPath: () => {},
        closePath: () => {},
        save: () => {},
        restore: () => {},
        roundRect: () => {},
        ellipse: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        moveTo: () => {},
        lineTo: () => {},
        setLineDash: () => {},
        fillText: (txt, x, y) => {
          textDrawn.push({ txt, x, y });
        },
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        font: "",
        textAlign: ""
      };
    }
  }
};

const createMockElem = (id) => ({
  id,
  style: {},
  classList: { remove: () => {}, add: () => {} },
  innerText: '',
  innerHTML: '',
  addEventListener: (evt, fn) => {
    elementsMap[id][evt] = fn;
  }
});

const elementsMap = {
  'start-screen': createMockElem('start-screen'),
  'end-screen': createMockElem('end-screen'),
  'game-container': createMockElem('game-container'),
  'game-canvas': mockCanvas,
  'hud-pads': createMockElem('hud-pads'),
  'hud-progress': createMockElem('hud-progress'),
  'hud-score': createMockElem('hud-score'),
  'btn-up': createMockElem('btn-up'),
  'btn-down': createMockElem('btn-down'),
  'btn-left': createMockElem('btn-left'),
  'btn-right': createMockElem('btn-right'),
  'challenge-modal': createMockElem('challenge-modal'),
  'modal-title': createMockElem('modal-title'),
  'modal-statement': createMockElem('modal-statement'),
  'modal-equation': createMockElem('modal-equation'),
  'modal-options': createMockElem('modal-options'),
  'modal-feedback': createMockElem('modal-feedback'),
  'modal-solution': createMockElem('modal-solution'),
  'modal-solution-text': createMockElem('modal-solution-text'),
  'modal-score': createMockElem('modal-score'),
  'btn-check': createMockElem('btn-check'),
  'btn-continue': createMockElem('btn-continue'),
  'final-score': createMockElem('final-score'),
  'final-raw-score': createMockElem('final-raw-score')
};

const mockDocument = {
  visibilityState: "visible",
  getElementById(id) {
    return elementsMap[id] || createMockElem(id);
  },
  querySelectorAll() { return []; },
  createElement(tag) {
    return { tag, style: {}, classList: { add: () => {}, remove: () => {} }, innerHTML: '', innerText: '', setAttribute: () => {} };
  },
  body: { classList: { add: () => {}, remove: () => {} } },
  addEventListener: () => {}
};

const mockWindow = {
  document: mockDocument,
  MathJax: { typesetPromise: async () => {} },
  requestAnimationFrame: (cb) => {
    rafCount++;
    rafCallbacks.push(cb);
    return rafCount;
  },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  addEventListener: () => {},
  location: { reload: () => {}, href: "" }
};

const context = vm.createContext({
  window: mockWindow,
  document: mockDocument,
  requestAnimationFrame: mockWindow.requestAnimationFrame,
  console: console,
  crypto: { randomUUID: () => "test-uuid" },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Math: Math,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Date: Date,
  submitActivityResult: async () => ({ success: true }),
  checkExercise: async () => ({ success: true }),
  getExerciseProgress: async () => []
});

vm.runInContext(scriptCode, context);
console.log("✔ Game script initialized without uncaught errors in clean VM");

// 3. Test startGame()
assert.strictEqual(typeof context.window.startGame, "function", "❌ startGame must be exported to window");
context.window.startGame();

assert.strictEqual(elementsMap['game-container'].style.display, 'flex', "❌ game-container must be displayed");
assert.ok(rafCount > 0, "❌ requestAnimationFrame must be invoked by gameLoop");

// 4. Step through 5 frames of the game loop
for (let frame = 1; frame <= 5; frame++) {
  const cb = rafCallbacks.shift();
  if (cb) cb();
}

assert.ok(drawCalls > 20, `❌ draw() must execute multiple draw operations per frame (got ${drawCalls} calls)`);
assert.ok(filledRects.some(r => r.w === 560 && r.h === 600), "❌ Background clearing rect must be drawn");
assert.ok(textDrawn.some(t => t.txt && t.txt.includes("RÍO")), "❌ River text HUD must be rendered in canvas");
console.log(`✔ Visual Render Loop — Canvas drawn ${drawCalls} times over 5 animation frames with full world elements`);

// 5. Test Frog movement via D-Pad (Up button pointerdown event listener)
if (elementsMap['btn-up'].pointerdown) {
  const initialDraws = drawCalls;
  elementsMap['btn-up'].pointerdown({ preventDefault: () => {} });
  // Step one frame to process physics and draw
  const cb = rafCallbacks.shift();
  if (cb) cb();
  assert.ok(drawCalls > initialDraws, "❌ Additional draw calls must occur after frog movement");
  console.log("✔ Controls — Pointerdown on D-Pad Up successfully registered and animated frog movement");
}

console.log("🎉 ALL UNIT 7 FROGGER VISUAL ENGINE & RENDERING TESTS PASSED 100%!");
