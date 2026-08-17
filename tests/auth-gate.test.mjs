// ═══════════════════════════════════════════════════════════════════════════
// Automated Unit Tests: Auth Gate Component Resilience & Contract
// ═══════════════════════════════════════════════════════════════════════════

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const authGatePath = path.resolve("components/auth-gate.js");

test("Auth Gate — Static Analysis for Undefined Global Supabase Reference", () => {
  const code = fs.readFileSync(authGatePath, "utf8");
  
  // Verify modular supabase client import exists
  assert.match(code, /import\s+{[^}]*supabase[^}]*}\s+from\s+["']\.\.\/core\/supabase-client\.js["'];?/,
    "auth-gate.js MUST import supabase from ../core/supabase-client.js");

  // Verify no un-imported or raw window.supabase references
  assert.doesNotMatch(code, /window\.supabase/i,
    "auth-gate.js MUST NOT depend on window.supabase global object");

  // Verify try/catch error boundaries exist around session handlers
  assert.match(code, /try\s*\{[\s\S]*?getUserProfile/,
    "auth-gate.js MUST wrap profile & student status checks in try/catch");

  // Verify defensive timeout implementation exists
  assert.match(code, /setTimeout\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?renderAuthLoginView/,
    "auth-gate.js MUST implement a defensive timeout to prevent infinite loading spinners");
});

test("Auth Gate — Audio 404 Prevention Static Analysis", () => {
  const gameShellPath = path.resolve("components/game-shell.js");
  const code = fs.readFileSync(gameShellPath, "utf8");

  assert.doesNotMatch(code, /\.wav["']/i,
    "components/game-shell.js MUST NOT attempt to load legacy .wav files triggering 404 errors");
});

test("Auth Gate — Exported Functions Static Analysis", () => {
  const code = fs.readFileSync(authGatePath, "utf8");

  assert.match(code, /export\s+async\s+function\s+initAuthGate/, "initAuthGate must be an exported function");
  assert.match(code, /export\s+function\s+renderAuthLoadingView/, "renderAuthLoadingView must be an exported function");
  assert.match(code, /export\s+function\s+renderAuthLoginView/, "renderAuthLoginView must be an exported function");
  assert.match(code, /export\s+function\s+renderAuthErrorView/, "renderAuthErrorView must be an exported function");
  assert.match(code, /export\s+function\s+renderAuthUnlinkedView/, "renderAuthUnlinkedView must be an exported function");
  assert.match(code, /export\s+function\s+renderAuthInactiveView/, "renderAuthInactiveView must be an exported function");
});
