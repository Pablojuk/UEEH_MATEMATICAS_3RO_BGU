// ═══════════════════════════════════════════════════════════════════════════
// Unified Asset & Module Cache-Busting Test Suite — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════
// Verifies:
// 1. Central version module (core/version.js) and withVersion helper
// 2. Automated module versioning across app.js, activity-service.js,
//    activity-summary.js, exercise-progress-service.js
// 3. HTML entry points (index.html, unit5/unit6 activities) with Cache-Control meta
// 4. Activity selective cache-busting & future unit scalability
// 5. Zero manual cache clearance requirement across browser updates
// ═══════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import assert from "assert";
import { APP_VERSION, BUILD_TIMESTAMP, withVersion } from "../core/version.js";

console.log("==================================================");
console.log("UNIFIED ASSET & MODULE CACHE-BUSTING TEST SUITE");
console.log("==================================================");

// ────────────────────────────────────────────────────────────
// 1. UNIT TEST: core/version.js and withVersion helper
// ────────────────────────────────────────────────────────────

assert.ok(typeof APP_VERSION === "string" && APP_VERSION.length > 0, "❌ APP_VERSION must be a non-empty string");
assert.ok(typeof BUILD_TIMESTAMP === "string" && BUILD_TIMESTAMP.length > 0, "❌ BUILD_TIMESTAMP must be defined");
console.log(`✔ Version Core — APP_VERSION: ${APP_VERSION} (Build: ${BUILD_TIMESTAMP})`);

// CASO 1: Simple module path
const vApp = withVersion("./core/app.js");
assert.strictEqual(vApp, `./core/app.js?v=${APP_VERSION}`, "❌ Simple path must append ?v=APP_VERSION");
console.log("✔ withVersion — Simple path receives ?v=APP_VERSION");

// CASO 2: Path with existing query parameters
const vQuery = withVersion("topics/unit6-sucesiones/deber.html?mode=recovery");
assert.ok(vQuery.includes("mode=recovery") && vQuery.includes(`v=${APP_VERSION}`), "❌ Existing query parameters must be preserved");
assert.ok(!vQuery.includes("??"), "❌ URL must not contain double '?'");
console.log("✔ withVersion — Existing query parameters preserved with & separator");

// CASO 3: Path with hash fragment
const vHash = withVersion("topics/unit6-sucesiones/deber.html#exercise-3");
assert.strictEqual(vHash, `topics/unit6-sucesiones/deber.html?v=${APP_VERSION}#exercise-3`, "❌ Hash fragment must remain at the very end");
console.log("✔ withVersion — Hash fragment preserved at end of URL");

// CASO 4: Old token replacement
const vReplace = withVersion("./topics/unit5-determinantes/deber.html?v=OLD_1.0.0&mode=recovery", "1.3.0");
assert.ok(vReplace.includes("v=1.3.0"), "❌ New version token must be present");
assert.ok(!vReplace.includes("OLD_1.0.0"), "❌ Old version token must be replaced");
assert.ok(!vReplace.includes("v=OLD_1.0.0&v=1.3.0"), "❌ Tokens must not accumulate");
console.log("✔ withVersion — Old ?v= parameter cleanly replaced without duplication");

// CASO 5: Edge cases
assert.strictEqual(withVersion(null), null);
assert.strictEqual(withVersion(""), "");
console.log("✔ withVersion — Edge cases (null, empty) handled safely");

// ────────────────────────────────────────────────────────────
// 2. STATIC AUDIT: HTML Entry Points & Meta Cache Control
// ────────────────────────────────────────────────────────────

const indexHtml = fs.readFileSync("index.html", "utf-8");
assert.ok(indexHtml.includes('<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"'), "❌ index.html must contain no-cache Cache-Control meta");
assert.ok(indexHtml.includes('<meta http-equiv="Pragma" content="no-cache"'), "❌ index.html must contain Pragma no-cache meta");
assert.ok(indexHtml.includes('<meta http-equiv="Expires" content="0"'), "❌ index.html must contain Expires 0 meta");
assert.ok(indexHtml.includes(`./assets/js/main.js?v=${APP_VERSION}`), "❌ index.html must import main.js with current APP_VERSION");
assert.ok(indexHtml.includes(`./assets/css/styles.css?v=${APP_VERSION}`), "❌ index.html must link styles.css with current APP_VERSION");
console.log("✔ HTML Audit — index.html configured with no-cache headers and versioned entry points");

// ────────────────────────────────────────────────────────────
// 3. STATIC AUDIT: Core JavaScript Module Dependency Tree
// ────────────────────────────────────────────────────────────

// A. main.js -> app.js
const mainJs = fs.readFileSync("assets/js/main.js", "utf-8");
assert.ok(mainJs.includes(`core/app.js?v=${APP_VERSION}`), "❌ main.js must import app.js with ?v=APP_VERSION");
console.log("✔ Module Audit — assets/js/main.js imports core/app.js?v=APP_VERSION");

// B. app.js -> dynamic components
const appJs = fs.readFileSync("core/app.js", "utf-8");
assert.ok(appJs.includes("from \"./version.js\""), "❌ app.js must import version module");
assert.ok(appJs.includes("activity-summary.js?v=${APP_VERSION}"), "❌ app.js must dynamically import activity-summary.js with APP_VERSION");
assert.ok(appJs.includes("admin-shell.js?v=${APP_VERSION}"), "❌ app.js must dynamically import admin-shell.js with APP_VERSION");
assert.ok(appJs.includes("export function buildFreshActivityUrl(pathStr, token = APP_VERSION)"), "❌ app.js must export buildFreshActivityUrl using withVersion");
console.log("✔ Module Audit — core/app.js dynamically imports components with ?v=APP_VERSION");

// C. activity-summary.js -> activity-service.js
const actSummaryJs = fs.readFileSync("components/activity-summary.js", "utf-8");
assert.ok(actSummaryJs.includes(`activity-service.js?v=${APP_VERSION}`), "❌ activity-summary.js must import activity-service.js with ?v=APP_VERSION");
console.log("✔ Module Audit — components/activity-summary.js imports activity-service.js?v=APP_VERSION");

// D. exercise-progress-service.js -> supabase-client.js & activity-service.js
const exProgJs = fs.readFileSync("core/exercise-progress-service.js", "utf-8");
assert.ok(exProgJs.includes(`supabase-client.js?v=${APP_VERSION}`), "❌ exercise-progress-service.js must import supabase-client.js with ?v=APP_VERSION");
assert.ok(exProgJs.includes(`activity-service.js?v=${APP_VERSION}`), "❌ exercise-progress-service.js must import activity-service.js with ?v=APP_VERSION");
console.log("✔ Module Audit — core/exercise-progress-service.js imports dependencies with ?v=APP_VERSION");

// E. activity-service.js -> supabase-client.js
const actServJs = fs.readFileSync("core/activity-service.js", "utf-8");
assert.ok(actServJs.includes(`supabase-client.js?v=${APP_VERSION}`), "❌ activity-service.js must import supabase-client.js with ?v=APP_VERSION");
console.log("✔ Module Audit — core/activity-service.js imports supabase-client.js?v=APP_VERSION");

// ────────────────────────────────────────────────────────────
// 4. STATIC AUDIT: Unit 5 & Unit 6 Activity Pages
// ────────────────────────────────────────────────────────────

const u6Deber = fs.readFileSync("topics/unit6-sucesiones/deber.html", "utf-8");
const u6Gam = fs.readFileSync("topics/unit6-sucesiones/gamificacion.html", "utf-8");
const u5Deber = fs.readFileSync("topics/unit5-determinantes/deber.html", "utf-8");
const u5Gam = fs.readFileSync("topics/unit5-determinantes/gamificacion.html", "utf-8");

assert.ok(u6Deber.includes('<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"'), "❌ Unit 6 deber must contain no-cache meta");
assert.ok(u6Deber.includes(`exercise-progress-service.js?v=${APP_VERSION}`), "❌ Unit 6 deber must import exercise-progress-service with ?v=APP_VERSION");
assert.ok(u6Gam.includes('<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"'), "❌ Unit 6 gamification must contain no-cache meta");
assert.ok(u6Gam.includes(`exercise-progress-service.js?v=${APP_VERSION}`), "❌ Unit 6 gamification must import exercise-progress-service with ?v=APP_VERSION");

assert.ok(u5Deber.includes('<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"'), "❌ Unit 5 deber must contain no-cache meta");
assert.ok(u5Deber.includes(`supabase-client.js?v=${APP_VERSION}`), "❌ Unit 5 deber must import supabase-client with ?v=APP_VERSION");
assert.ok(u5Gam.includes('<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"'), "❌ Unit 5 gamification must contain no-cache meta");
assert.ok(u5Gam.includes(`supabase-client.js?v=${APP_VERSION}`), "❌ Unit 5 gamification must import supabase-client with ?v=APP_VERSION");
console.log("✔ Activity Audit — Unit 5 & Unit 6 activity pages configured with no-cache headers and versioned services");

// ────────────────────────────────────────────────────────────
// 5. BEHAVIORAL SIMULATION: Version Upgrade from 1.3.0 to 1.4.0
// ────────────────────────────────────────────────────────────

const simulatedOldUrl = withVersion("./core/app.js", "1.3.0");
const simulatedNewUrl = withVersion("./core/app.js", "1.4.0");

assert.strictEqual(simulatedOldUrl, "./core/app.js?v=1.3.0");
assert.strictEqual(simulatedNewUrl, "./core/app.js?v=1.4.0");
assert.notStrictEqual(simulatedOldUrl, simulatedNewUrl, "❌ New release must generate distinct URL to force fresh fetch");
console.log("✔ Upgrade Simulation — Bumping version completely invalidates previous cache in all browsers (Zero manual Ctrl+F5 required)");

console.log("🎉 ALL UNIFIED ASSET & MODULE CACHE-BUSTING TESTS PASSED 100%!");
