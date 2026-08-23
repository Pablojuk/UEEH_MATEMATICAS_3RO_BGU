// ═══════════════════════════════════════════════════════════════════════════
// Activity Summary Unit Scoping Tests — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import assert from "assert";
import fs from "fs";
import path from "path";
import vm from "vm";

console.log("==================================================");
console.log("TEST SUITE: ACTIVITY SUMMARY UNIT SCOPING");
console.log("==================================================");

// 1. Static Audit of Component and App.js
const compPath = path.resolve(process.cwd(), "components/activity-summary.js");
const appPath = path.resolve(process.cwd(), "core/app.js");
const actServPath = path.resolve(process.cwd(), "core/activity-service.js");

const compCode = fs.readFileSync(compPath, "utf8");
const appCode = fs.readFileSync(appPath, "utf8");
const actServCode = fs.readFileSync(actServPath, "utf8");

// No hardcoding of unit 5 / unit 6 in activity-summary.js
assert.ok(!compCode.includes('if (unit === 5)'), "❌ activity-summary.js must NOT contain hardcoded if (unit === 5)");
assert.ok(!compCode.includes('if (unit === 6)'), "❌ activity-summary.js must NOT contain hardcoded if (unit === 6)");
assert.ok(!compCode.includes('(Unidad 5+)'), "❌ activity-summary.js must NOT contain static '(Unidad 5+)' text");
assert.ok(compCode.includes('Aún no tienes actividades calificadas en esta unidad.'), "❌ activity-summary.js must contain standard empty message");
assert.ok(actServCode.includes('unitNumber !== null && unitNumber !== undefined'), "❌ activity-service.js must support unitNumber filtering");
assert.ok(appCode.includes('unitNumber: unit.unitNumber'), "❌ app.js must pass unit.unitNumber to renderStudentActivitySummary");
console.log("✔ Static Analysis — Generic data-driven component verified without hardcoding");

// 2. Behavioral Unit Isolation Simulation
const mockActivitiesDataset = [
  {
    activity: {
      id: "act-u5-gam",
      activity_key: "u5-determinantes-gam-01",
      title: "Odisea Espacial: Planetas",
      activity_type: "gamification",
      unit_number: 5,
      max_score: 10,
      minimum_score: 1,
      opens_at: "2026-08-16T20:00:00Z",
      due_at: "2026-08-30T23:59:00Z"
    },
    result: { best_score: 10, attempt_count: 1, result_status: "completed" },
    displayState: "CONFIRMED",
    statusText: "✅ Enviado y registrado"
  },
  {
    activity: {
      id: "act-u5-class",
      activity_key: "u5-determinantes-class-01",
      title: "Deber: Determinantes",
      activity_type: "classwork",
      unit_number: 5,
      max_score: 10,
      minimum_score: 1,
      opens_at: "2026-08-16T20:00:00Z",
      due_at: "2026-08-30T23:59:00Z"
    },
    result: { best_score: 9.5, attempt_count: 2, result_status: "completed" },
    displayState: "CONFIRMED",
    statusText: "✅ Enviado y registrado"
  },
  {
    activity: {
      id: "act-u6-gam",
      activity_key: "u6-sucesiones-gam-01",
      title: "Space Math Invaders",
      activity_type: "gamification",
      unit_number: 6,
      max_score: 10,
      minimum_score: 1,
      opens_at: "2026-08-22T20:00:00Z",
      due_at: "2026-09-08T23:59:00Z"
    },
    result: { best_score: 10, attempt_count: 1, result_status: "completed" },
    displayState: "CONFIRMED",
    statusText: "✅ Enviado y registrado"
  },
  {
    activity: {
      id: "act-u6-class",
      activity_key: "u6-sucesiones-class-01",
      title: "Deber: Sucesiones y Límites",
      activity_type: "classwork",
      unit_number: 6,
      max_score: 10,
      minimum_score: 1,
      opens_at: "2026-08-22T20:00:00Z",
      due_at: "2026-09-08T23:59:00Z"
    },
    result: null,
    displayState: "NOT_STARTED",
    statusText: "🟡 Pendiente de realizar"
  }
];

function simulateActivitySummaryRendering(dataset, requestedUnit, unitTitle = "") {
  const filtered = (requestedUnit !== null && requestedUnit !== undefined)
    ? dataset.filter(item => Number(item.activity?.unit_number) === Number(requestedUnit))
    : dataset;

  const headerTitle = requestedUnit ? `Resumen de Actividades • Unidad ${requestedUnit}` : "Resumen de Actividades";
  const headerSubtitle = unitTitle ? `Unidad ${requestedUnit}: ${unitTitle}` : "Consulta el estado oficial y las calificaciones de tus actividades evaluables en Supabase.";

  let bodyHtml = "";
  if (filtered.length === 0) {
    bodyHtml = '<div class="col-span-full p-8 bg-white rounded-3xl border border-neutral-200/80 text-center text-neutral-400">Aún no tienes actividades calificadas en esta unidad.</div>';
  } else {
    bodyHtml = filtered.map(item => `<div class="card" data-key="${item.activity.activity_key}" data-unit="${item.activity.unit_number}">${item.activity.title}</div>`).join("");
  }

  return {
    headerTitle,
    headerSubtitle,
    renderedCount: filtered.length,
    renderedKeys: filtered.map(item => item.activity.activity_key),
    renderedUnits: [...new Set(filtered.map(item => item.activity.unit_number))],
    bodyHtml
  };
}

// ── Case A: currentUnit = 5 ──
const resU5 = simulateActivitySummaryRendering(mockActivitiesDataset, 5, "Determinantes");
assert.strictEqual(resU5.renderedCount, 2, "❌ Unit 5 must render exactly 2 activities");
assert.deepStrictEqual(resU5.renderedKeys, ["u5-determinantes-gam-01", "u5-determinantes-class-01"]);
assert.deepStrictEqual(resU5.renderedUnits, [5]);
assert.ok(!resU5.renderedKeys.includes("u6-sucesiones-gam-01"), "❌ Unit 5 must NOT leak Unit 6 gamification");
assert.ok(!resU5.renderedKeys.includes("u6-sucesiones-class-01"), "❌ Unit 5 must NOT leak Unit 6 classwork");
assert.strictEqual(resU5.headerTitle, "Resumen de Actividades • Unidad 5");
assert.strictEqual(resU5.headerSubtitle, "Unidad 5: Determinantes");
console.log("✔ Case A: currentUnit = 5 renders strictly 2 activities with unit_number = 5 (0 leaks from U6)");

// ── Case B: currentUnit = 6 ──
const resU6 = simulateActivitySummaryRendering(mockActivitiesDataset, 6, "Sucesiones");
assert.strictEqual(resU6.renderedCount, 2, "❌ Unit 6 must render exactly 2 activities");
assert.deepStrictEqual(resU6.renderedKeys, ["u6-sucesiones-gam-01", "u6-sucesiones-class-01"]);
assert.deepStrictEqual(resU6.renderedUnits, [6]);
assert.ok(!resU6.renderedKeys.includes("u5-determinantes-gam-01"), "❌ Unit 6 must NOT leak Unit 5 gamification");
assert.ok(!resU6.renderedKeys.includes("u5-determinantes-class-01"), "❌ Unit 6 must NOT leak Unit 5 classwork");
assert.strictEqual(resU6.headerTitle, "Resumen de Actividades • Unidad 6");
assert.strictEqual(resU6.headerSubtitle, "Unidad 6: Sucesiones");
console.log("✔ Case B: currentUnit = 6 renders strictly 2 activities with unit_number = 6 (0 leaks from U5)");

// ── Case C: currentUnit = 7 (sin resultados) ──
const resU7 = simulateActivitySummaryRendering(mockActivitiesDataset, 7, "Cálculo Integral");
assert.strictEqual(resU7.renderedCount, 0, "❌ Unit 7 must render 0 activity cards");
assert.deepStrictEqual(resU7.renderedKeys, []);
assert.ok(resU7.bodyHtml.includes("Aún no tienes actividades calificadas en esta unidad."), "❌ Unit 7 must display empty state message");
assert.strictEqual(resU7.headerTitle, "Resumen de Actividades • Unidad 7");
assert.strictEqual(resU7.headerSubtitle, "Unidad 7: Cálculo Integral");
console.log("✔ Case C: currentUnit = 7 (future unit) displays clean empty state without other unit cards");

// ── Case D: Future Unit 99 Scalability Simulation ──
const futureDataset = [
  ...mockActivitiesDataset,
  {
    activity: { id: "act-u99", activity_key: "u99-future-01", title: "Topología Cuántica", unit_number: 99 },
    result: { best_score: 10, attempt_count: 1, result_status: "completed" }
  }
];
const resU99 = simulateActivitySummaryRendering(futureDataset, 99, "Topología");
assert.strictEqual(resU99.renderedCount, 1);
assert.deepStrictEqual(resU99.renderedKeys, ["u99-future-01"]);
assert.deepStrictEqual(resU99.renderedUnits, [99]);
console.log("✔ Case D: Future Unit 99 automatically scales without code modification");

console.log("🎉 ALL ACTIVITY SUMMARY UNIT SCOPING TESTS PASSED 100%!");
