import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getCurrentValidSession, isSessionTokenExpired } from "../core/auth-session-service.js";

const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
const pastExpiry = Math.floor(Date.now() / 1000) - 60;

const makeSession = (userId, accessToken, expiresAt = futureExpiry) => ({
  access_token: accessToken,
  refresh_token: `refresh-${userId}`,
  expires_at: expiresAt,
  user: { id: userId }
});

// Login A -> signOut -> login B: the academic request must use B.
let currentSession = makeSession("user-a", "token-a");
let refreshCalls = 0;
const auth = {
  async getSession() {
    return { data: { session: currentSession }, error: null };
  },
  async refreshSession() {
    refreshCalls += 1;
    const refreshed = makeSession(currentSession.user.id, `fresh-${currentSession.user.id}`);
    currentSession = refreshed;
    return { data: { session: refreshed }, error: null };
  },
  async getUser(accessToken) {
    if (accessToken !== currentSession?.access_token) {
      return { data: { user: null }, error: new Error("stale token") };
    }
    return { data: { user: currentSession.user }, error: null };
  }
};

const buildAcademicAuthorization = async () => {
  const { session, error } = await getCurrentValidSession(auth);
  assert.equal(error, null);
  return `Bearer ${session.access_token}`;
};

assert.equal(await buildAcademicAuthorization(), "Bearer token-a");
currentSession = null; // signOut A
currentSession = makeSession("user-b", "token-b"); // login B
assert.equal(await buildAcademicAuthorization(), "Bearer token-b");
assert.equal(refreshCalls, 0, "A valid B session must not be refreshed unnecessarily");

// Expired access token -> one refresh -> request uses the refreshed token.
currentSession = makeSession("user-b", "expired-token-b", pastExpiry);
assert.equal(isSessionTokenExpired(currentSession), true);
assert.equal(await buildAcademicAuthorization(), "Bearer fresh-user-b");
assert.equal(refreshCalls, 1, "An expired session must refresh exactly once");

// Static integration guarantees: one browser singleton and no direct stale-session reads.
const supabaseClientSource = fs.readFileSync("core/supabase-client.js", "utf8");
assert.ok(supabaseClientSource.includes('Symbol.for("ueeh.supabase.client")'));
assert.ok(supabaseClientSource.includes("globalThis[SUPABASE_CLIENT_KEY]"));
assert.equal((supabaseClientSource.match(/createClient\(/g) || []).length, 1);

// Browser ESM treats the same file with and without a query as distinct
// modules. Execute the production module source under both URLs and prove
// that its global singleton still resolves to exactly the same client.
const executableClientSource = supabaseClientSource
  .replace(
    /import \{ createClient \} from [^;]+;/,
    'const createClient = () => ({ auth: { marker: "shared-auth-client" } });'
  )
  .replace(
    /import \{ SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY \} from [^;]+;/,
    'const SUPABASE_URL = "https://example.invalid"; const SUPABASE_PUBLISHABLE_KEY = "public-test-key";'
  );

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ueeh-supabase-singleton-"));
const tempModulePath = path.join(tempDir, "supabase-client.mjs");
const singletonKey = Symbol.for("ueeh.supabase.client");

try {
  fs.writeFileSync(tempModulePath, executableClientSource, "utf8");
  delete globalThis[singletonKey];

  const moduleUrl = pathToFileURL(tempModulePath).href;
  const plainImport = await import(moduleUrl);
  const versionedImport = await import(`${moduleUrl}?v=1.4.7`);

  assert.strictEqual(
    plainImport.supabase,
    versionedImport.supabase,
    "Versioned and unversioned ESM URLs must resolve to the same Supabase client"
  );
  assert.strictEqual(plainImport.supabase.auth, versionedImport.supabase.auth);
} finally {
  delete globalThis[singletonKey];
  fs.rmSync(tempDir, { recursive: true, force: true });
}

for (const file of ["core/exercise-progress-service.js", "core/activity-service.js"]) {
  const source = fs.readFileSync(file, "utf8");
  assert.ok(source.includes("getCurrentValidSession(supabase.auth)"), `${file} must resolve the current validated session immediately before academic requests`);
  assert.ok(!source.includes("supabase.auth.getSession()"), `${file} must not bypass the shared validated-session service`);
}

const authGateSource = fs.readFileSync("components/auth-gate.js", "utf8");
assert.ok(!authGateSource.includes("sessionStorage.clear()"), "Auth recovery must not erase pending check/submission identifiers");

console.log("✔ Auth session switch regression — user B token and expired-token refresh verified");
