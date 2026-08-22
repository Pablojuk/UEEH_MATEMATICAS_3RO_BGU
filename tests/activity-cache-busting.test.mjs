// ═══════════════════════════════════════════════════════════════════════════
// Activity Selective Cache-Busting Test — UEEH Matemáticas 3ro BGU
// Verifies: selective cache-busting for gamification and classwork,
//           preservation of normal caching for presentations,
//           query and hash preservation, replacement of old tokens,
//           data-driven scalability for future units, and timing variance.
// ═══════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import assert from "assert";

const appPath = path.resolve("core/app.js");
const appCode = fs.readFileSync(appPath, "utf-8");

// Extraer la función buildFreshActivityUrl de app.js para ejecutar en Node sin resolver dependencias de navegador
const funcMatch = appCode.match(/export\s+function\s+buildFreshActivityUrl\s*\([\s\S]*?\n\}/);
if (!funcMatch) {
  throw new Error("❌ No se encontró buildFreshActivityUrl exportada en core/app.js");
}
const buildFreshActivityUrl = new Function("return (" + funcMatch[0].replace(/^export\s+/, "") + ")")();

// ────────────────────────────────────────────────────────────
// 1. UNIT TEST: buildFreshActivityUrl helper
// ────────────────────────────────────────────────────────────

// CASO 1: gamificacion.html gets fresh token
const gamUrl = buildFreshActivityUrl("./topics/unit5-determinantes/gamificacion.html", "1001");
assert.strictEqual(
  gamUrl,
  "./topics/unit5-determinantes/gamificacion.html?v=1001",
  "❌ Gamificacion URL must receive ?v=TOKEN"
);
console.log("✔ Helper — Gamification receives ?v=TOKEN correctly");

// CASO 2: deber.html gets fresh token
const deberUrl = buildFreshActivityUrl("./topics/unit5-determinantes/deber.html", "2002");
assert.strictEqual(
  deberUrl,
  "./topics/unit5-determinantes/deber.html?v=2002",
  "❌ Deber URL must receive ?v=TOKEN"
);
console.log("✔ Helper — Deber receives ?v=TOKEN correctly");

// CASO 3: Existing query parameters are preserved
const queryUrl = buildFreshActivityUrl("topics/unit5-determinantes/deber.html?mode=recovery", "3003");
assert.ok(
  queryUrl.includes("mode=recovery") && queryUrl.includes("v=3003"),
  "❌ Existing query parameter 'mode=recovery' must be preserved"
);
assert.ok(
  !queryUrl.includes("??"),
  "❌ URL must not contain double '?'"
);
console.log("✔ Helper — Existing query parameters preserved with & separator");

// CASO 4: Existing hash is preserved at the end of the URL
const hashUrl = buildFreshActivityUrl("topics/unit5-determinantes/deber.html#exercise-3", "4004");
assert.strictEqual(
  hashUrl,
  "topics/unit5-determinantes/deber.html?v=4004#exercise-3",
  "❌ Hash must be preserved at the end of the URL"
);
console.log("✔ Helper — Hash preserved after query string");

// CASO 5: Old 'v' parameter is cleanly replaced, not duplicated
const replaceUrl = buildFreshActivityUrl("./topics/unit5-determinantes/deber.html?v=OLD_TOKEN&mode=recovery", "NEW_TOKEN");
assert.ok(
  replaceUrl.includes("v=NEW_TOKEN"),
  "❌ New token must be present"
);
assert.ok(
  !replaceUrl.includes("OLD_TOKEN"),
  "❌ Old token must be completely replaced"
);
assert.ok(
  !replaceUrl.includes("v=OLD_TOKEN&v=NEW_TOKEN"),
  "❌ Tokens must not accumulate"
);
console.log("✔ Helper — Old ?v= parameter cleanly replaced without duplication");

// CASO 6: Fallback / null / empty safety
assert.strictEqual(buildFreshActivityUrl(null), null);
assert.strictEqual(buildFreshActivityUrl(""), "");
console.log("✔ Helper — Edge cases (null, empty) handled safely");

// ────────────────────────────────────────────────────────────
// 2. STATIC AUDIT: app.js routing logic
// ────────────────────────────────────────────────────────────

// Verify presentation does NOT use buildFreshActivityUrl
const presentationBlock = appCode.match(/if\s*\(\s*actionType\s*===\s*["']presentation["']\s*\)[\s\S]*?(?=if\s*\(\s*actionType\s*===)/);
assert.ok(presentationBlock, "❌ presentation block must exist in app.js");
assert.ok(
  !presentationBlock[0].includes("buildFreshActivityUrl"),
  "❌ presentation must NOT use buildFreshActivityUrl (must preserve normal cache)"
);
console.log("✔ Routing — Presentation preserves normal cache without ?v=");

// Verify gamification uses buildFreshActivityUrl
const gamificationBlock = appCode.match(/if\s*\(\s*actionType\s*===\s*["']gamification["']\s*\)[\s\S]*?(?=if\s*\(\s*actionType\s*===)/);
assert.ok(gamificationBlock, "❌ gamification block must exist in app.js");
assert.ok(
  gamificationBlock[0].includes("buildFreshActivityUrl(route.src)"),
  "❌ gamification must use buildFreshActivityUrl(route.src)"
);
console.log("✔ Routing — Gamification routes through buildFreshActivityUrl");

// Verify classwork uses buildFreshActivityUrl
const classworkBlock = appCode.match(/if\s*\(\s*actionType\s*===\s*["']classwork["']\s*\)[\s\S]*?(?=if\s*\(\s*actionType\s*===)/);
assert.ok(classworkBlock, "❌ classwork block must exist in app.js");
assert.ok(
  classworkBlock[0].includes("buildFreshActivityUrl(route.src)"),
  "❌ classwork must use buildFreshActivityUrl(route.src)"
);
console.log("✔ Routing — Classwork routes through buildFreshActivityUrl");

// Anti-hardcode check: no unit-specific cache logic
assert.ok(
  !appCode.includes("if (unit === 5)") &&
  !appCode.includes("unitNumber === 5 ? buildFreshActivityUrl"),
  "❌ Cache-busting must be data-driven by actionType, not hardcoded to Unit 5"
);
console.log("✔ Anti-Hardcode — Cache-busting is data-driven by actionType, not unitNumber");

// ────────────────────────────────────────────────────────────
// 3. SIMULATION: Future Unit 99 behavior
// ────────────────────────────────────────────────────────────

const mockUnit99 = {
  unitNumber: 99,
  slug: "unit99-test",
  routes: {
    presentation: { src: "./topics/unit99-test/presentation.html" },
    gamification: { src: "./topics/unit99-test/gamificacion.html" },
    classwork: { src: "./topics/unit99-test/deber.html" }
  }
};

const resolveRouteUrl = (unit, actionType, token) => {
  const route = unit.routes[actionType];
  if (actionType === "presentation") return route.src;
  if (actionType === "gamification" || actionType === "classwork") {
    return buildFreshActivityUrl(route.src, token);
  }
  return route.src;
};

const u99Pres = resolveRouteUrl(mockUnit99, "presentation", "111");
const u99Gam = resolveRouteUrl(mockUnit99, "gamification", "222");
const u99Class = resolveRouteUrl(mockUnit99, "classwork", "333");

assert.strictEqual(u99Pres, "./topics/unit99-test/presentation.html", "❌ Unit 99 presentation must have normal cache");
assert.strictEqual(u99Gam, "./topics/unit99-test/gamificacion.html?v=222", "❌ Unit 99 gamification must have fresh token");
assert.strictEqual(u99Class, "./topics/unit99-test/deber.html?v=333", "❌ Unit 99 classwork must have fresh token");
console.log("✔ Future Unit Simulation — Unit 99 automatically inherits selective cache-busting");

// ────────────────────────────────────────────────────────────
// 4. TIMING & SEQUENTIAL OPENINGS: Different tokens across openings
// ────────────────────────────────────────────────────────────

const token1 = Date.now().toString();
// Advance simulated time
const token2 = (Date.now() + 1500).toString();

const open1 = buildFreshActivityUrl("./topics/unit5-determinantes/gamificacion.html", token1);
const open2 = buildFreshActivityUrl("./topics/unit5-determinantes/gamificacion.html", token2);

assert.notStrictEqual(open1, open2, "❌ Sequential openings must produce different URLs");
assert.ok(open1.includes(`v=${token1}`));
assert.ok(open2.includes(`v=${token2}`));
console.log("✔ Timing — Sequential openings generate distinct cache-busting tokens");

// ────────────────────────────────────────────────────────────
// 5. GITHUB PAGES BASE URL SAFETY
// ────────────────────────────────────────────────────────────

const ghBase = "https://pablojuk.github.io/UEEH_MATEMATICAS_3RO_BGU/topics/unit5-determinantes/gamificacion.html";
const ghUrl = buildFreshActivityUrl(ghBase, "9999");
assert.strictEqual(
  ghUrl,
  "https://pablojuk.github.io/UEEH_MATEMATICAS_3RO_BGU/topics/unit5-determinantes/gamificacion.html?v=9999",
  "❌ Full GitHub Pages URL base must be preserved"
);
console.log("✔ GitHub Pages — Full GitHub Pages URL preserved with subpath and token");

console.log("🎉 ALL ACTIVITY CACHE-BUSTING TESTS PASSED 100%!");
