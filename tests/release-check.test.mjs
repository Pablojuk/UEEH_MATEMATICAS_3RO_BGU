import assert from "node:assert/strict";
import {
  RELEASE_RELOAD_KEY,
  checkForRelease,
  installReleaseRechecks
} from "../core/release-check.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    snapshot() {
      return Object.fromEntries(values);
    }
  };
}

function releaseResponse(version) {
  return { ok: true, status: 200, json: async () => ({ version, build: `test-v${version}` }) };
}

function quietOptions(overrides = {}) {
  return {
    localVersion: "1.4.3",
    reloadDelayMs: 0,
    wait: async () => {},
    notify: () => {},
    logger: { warn: () => {} },
    now: () => 123456,
    ...overrides
  };
}

// 1. Remoto igual: no recarga y la petición evita caché.
{
  const requests = [];
  const locationObj = { href: "https://example.test/UEEH/index.html?mode=class#u6", replace: () => assert.fail("No debe recargar") };
  const result = await checkForRelease(quietOptions({
    storage: createStorage(),
    locationObj,
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      return releaseResponse("1.4.3");
    }
  }));

  assert.equal(result.status, "current");
  assert.equal(result.reloadRequested, false);
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/version\.json\?t=123456$/);
  assert.equal(requests[0].init.cache, "no-store");
}

// 2. Remoto diferente: muestra aviso y solicita exactamente una recarga.
{
  const pendingKey = "ueeh_pending_sub_u6-sucesiones-class-01";
  const pendingValue = JSON.stringify({ submissionId: "pending-123", answers: [1, 2] });
  const storage = createStorage({ [pendingKey]: pendingValue, ueeh_active_view: "campus" });
  const reloads = [];
  let notices = 0;
  const locationObj = {
    href: "https://example.test/UEEH/index.html?mode=class&route=unit6#exercise-4",
    replace(url) {
      reloads.push(url);
      this.href = url;
    }
  };
  const options = quietOptions({
    storage,
    locationObj,
    fetchImpl: async () => releaseResponse("1.4.7"),
    notify: () => { notices += 1; }
  });

  const first = await checkForRelease(options);
  const second = await checkForRelease(options);

  assert.equal(first.status, "reload-requested");
  assert.equal(second.status, "already-attempted");
  assert.equal(reloads.length, 1, "Una versión remota sólo puede provocar una recarga por sesión");
  assert.equal(notices, 1);
  assert.equal(storage.getItem(RELEASE_RELOAD_KEY), "1.4.7");
  assert.equal(storage.getItem(pendingKey), pendingValue, "La entrega pendiente debe conservarse intacta");
  assert.equal(storage.getItem("ueeh_active_view"), "campus", "El estado de sesión ajeno debe conservarse");

  const reloadUrl = new URL(reloads[0]);
  assert.equal(reloadUrl.pathname, "/UEEH/index.html");
  assert.equal(reloadUrl.searchParams.get("mode"), "class");
  assert.equal(reloadUrl.searchParams.get("route"), "unit6");
  assert.equal(reloadUrl.searchParams.get("v"), "1.4.7");
  assert.equal(reloadUrl.hash, "#exercise-4");
}

// 3. Fallo de version.json: el arranque continúa y no se escribe almacenamiento.
{
  const storage = createStorage({ ueeh_pending_sub_test: "intacto" });
  let reloads = 0;
  const result = await checkForRelease(quietOptions({
    storage,
    locationObj: { href: "https://example.test/UEEH/", replace: () => { reloads += 1; } },
    fetchImpl: async () => { throw new Error("sin conexión"); }
  }));

  assert.equal(result.status, "unavailable");
  assert.equal(result.reloadRequested, false);
  assert.equal(reloads, 0);
  assert.deepEqual(storage.snapshot(), { ueeh_pending_sub_test: "intacto" });
}

// 4. La versión objetivo ya fue intentada: no entra en bucle.
{
  const storage = createStorage({ [RELEASE_RELOAD_KEY]: "1.4.7" });
  let reloads = 0;
  const result = await checkForRelease(quietOptions({
    storage,
    locationObj: { href: "https://example.test/UEEH/?v=1.4.7", replace: () => { reloads += 1; } },
    fetchImpl: async () => releaseResponse("1.4.7")
  }));

  assert.equal(result.status, "already-attempted");
  assert.equal(reloads, 0);
}

// 5. Se comprueba al enfocar y al volver visible, nunca mientras sigue oculta.
{
  const windowListeners = new Map();
  const documentListeners = new Map();
  const windowObj = {
    addEventListener: (event, handler) => windowListeners.set(event, handler),
    removeEventListener: (event) => windowListeners.delete(event)
  };
  const documentObj = {
    visibilityState: "hidden",
    addEventListener: (event, handler) => documentListeners.set(event, handler),
    removeEventListener: (event) => documentListeners.delete(event)
  };
  let checks = 0;
  const cleanup = installReleaseRechecks({ windowObj, documentObj, checker: async () => { checks += 1; } });

  windowListeners.get("focus")();
  await new Promise((resolve) => setImmediate(resolve));
  documentListeners.get("visibilitychange")();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(checks, 1);

  documentObj.visibilityState = "visible";
  documentListeners.get("visibilitychange")();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(checks, 2);

  cleanup();
  assert.equal(windowListeners.size, 0);
  assert.equal(documentListeners.size, 0);
}

console.log("✔ Release check — no-store, recarga única, fallo tolerado, sesión preservada y rechecks acotados");
