// ═══════════════════════════════════════════════════════════════════════════
// Curriculum Config Test — UEEH Matemáticas 3ro BGU
// Verifies: U5-SCALE-001 data-driven configuration integrity, uniqueness,
//           route formats, and GitHub Pages compatibility.
// ═══════════════════════════════════════════════════════════════════════════

import assert from "assert";
import { CURRICULUM_UNITS, getUnitByNumber, getUnitBySlug } from "../core/curriculum-config.js";

// 1. Array exported with at least 5 units
assert.ok(Array.isArray(CURRICULUM_UNITS), "❌ CURRICULUM_UNITS must be an array");
assert.ok(CURRICULUM_UNITS.length >= 5, `❌ CURRICULUM_UNITS must contain at least 5 units, found ${CURRICULUM_UNITS.length}`);
console.log(`✔ Curriculum Config — ${CURRICULUM_UNITS.length} units exported`);

// 2. Uniqueness of unitNumber and slug
const unitNumbers = new Set();
const slugs = new Set();

for (const unit of CURRICULUM_UNITS) {
  assert.ok(typeof unit.unitNumber === "number", `❌ unitNumber must be number: ${unit.unitNumber}`);
  assert.ok(!unitNumbers.has(unit.unitNumber), `❌ Duplicate unitNumber: ${unit.unitNumber}`);
  unitNumbers.add(unit.unitNumber);

  assert.ok(typeof unit.slug === "string" && unit.slug.length > 0, `❌ slug must be non-empty string: ${unit.slug}`);
  assert.ok(!slugs.has(unit.slug), `❌ Duplicate slug: ${unit.slug}`);
  slugs.add(unit.slug);

  assert.ok(typeof unit.title === "string" && unit.title.length > 0, `❌ title must be non-empty string in unit ${unit.unitNumber}`);
  assert.ok(typeof unit.description === "string" && unit.description.length > 0, `❌ description must be non-empty in unit ${unit.unitNumber}`);
  assert.ok(typeof unit.badge === "string" && unit.badge.length > 0, `❌ badge must be non-empty in unit ${unit.unitNumber}`);
}
console.log("✔ Uniqueness — All unitNumbers and slugs are unique");

// 3. Unit 5 specific verification
const u5 = getUnitByNumber(5);
assert.ok(u5, "❌ Unit 5 must exist in CURRICULUM_UNITS");
assert.strictEqual(u5.slug, "unit5-determinantes");
assert.strictEqual(u5.requiresStudentData, false, "❌ Unit 5 uses Supabase Auth, requiresStudentData must be false");
assert.ok(u5.routes.presentation.src.includes("unit5-determinantes/presentation.html"));
assert.ok(u5.routes.gamification.src.includes("unit5-determinantes/gamificacion.html"));
assert.ok(u5.routes.classwork.src.includes("unit5-determinantes/deber.html"));
assert.strictEqual(u5.routes.results.type, "supabase-summary");
console.log("✔ Unit 5 Master Template — Verified with full presentation/gamification/classwork/results routes");

// 4. Route path format checks (No Windows paths, no localhost, no root-relative `/` paths)
for (const unit of CURRICULUM_UNITS) {
  for (const [key, route] of Object.entries(unit.routes || {})) {
    if (route.src) {
      assert.ok(!route.src.startsWith("/"), `❌ Route ${unit.unitNumber}.${key}.src must NOT start with root '/': ${route.src}`);
      assert.ok(!route.src.includes("localhost"), `❌ Route ${unit.unitNumber}.${key}.src must NOT contain localhost: ${route.src}`);
      assert.ok(!route.src.includes(":\\"), `❌ Route ${unit.unitNumber}.${key}.src must NOT contain Windows path: ${route.src}`);
      assert.ok(route.src.startsWith("./topics/"), `❌ Route ${unit.unitNumber}.${key}.src must start with './topics/': ${route.src}`);
    }
    if (route.image) {
      assert.ok(!route.image.startsWith("/"), `❌ Image in ${unit.unitNumber}.${key} must NOT start with root '/': ${route.image}`);
      assert.ok(!route.image.includes("localhost"), `❌ Image must NOT contain localhost: ${route.image}`);
      assert.ok(!route.image.includes(":\\"), `❌ Image must NOT contain Windows path: ${route.image}`);
    }
  }
}
console.log("✔ GitHub Pages Compatibility — All routes and assets use relative paths");

// 5. Lookup helper functions
assert.strictEqual(getUnitByNumber(1)?.slug, "ecuaciones-lineales");
assert.strictEqual(getUnitBySlug("operaciones-matrices")?.unitNumber, 3);
assert.strictEqual(getUnitByNumber(999), null);
assert.strictEqual(getUnitBySlug("non-existent"), null);
console.log("✔ Lookup Helpers — getUnitByNumber and getUnitBySlug operate correctly");

console.log("🎉 ALL CURRICULUM CONFIG TESTS PASSED 100%!");
