import { APP_VERSION } from "./version.js?v=1.4.7";

export const RELEASE_RELOAD_KEY = "ueeh_release_reload";
export const RELEASE_UPDATE_MESSAGE = "Hay una actualización disponible. Actualizando la plataforma...";

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

function defaultManifestUrl() {
  // Resuelve dentro del subdirectorio del repositorio en GitHub Pages; nunca desde /.
  return new URL("../version.json", import.meta.url);
}

function getSessionStorage() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function readReloadTarget(storage) {
  try {
    return storage?.getItem(RELEASE_RELOAD_KEY) || null;
  } catch {
    return null;
  }
}

function rememberReloadTarget(storage, version) {
  try {
    if (!storage) return false;
    storage.setItem(RELEASE_RELOAD_KEY, version);
    return storage.getItem(RELEASE_RELOAD_KEY) === version;
  } catch {
    return false;
  }
}

export function buildVersionManifestUrl({ manifestUrl = defaultManifestUrl(), now = Date.now } = {}) {
  const url = new URL(manifestUrl, import.meta.url);
  url.searchParams.set("t", String(now()));
  return url.href;
}

export function buildReleaseReloadUrl(currentHref, remoteVersion) {
  const url = new URL(currentHref);
  url.searchParams.set("v", remoteVersion);
  return url.href;
}

export function showReleaseNotice(message = RELEASE_UPDATE_MESSAGE, documentObj = globalThis.document) {
  if (!documentObj?.body) return null;

  const existing = documentObj.getElementById("ueeh-release-update");
  if (existing) return existing;

  const notice = documentObj.createElement("div");
  notice.id = "ueeh-release-update";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "assertive");
  notice.textContent = message;
  Object.assign(notice.style, {
    position: "fixed",
    inset: "auto 1rem 1rem 1rem",
    zIndex: "2147483647",
    maxWidth: "42rem",
    margin: "0 auto",
    padding: "0.9rem 1.1rem",
    borderRadius: "0.85rem",
    background: "#1e293b",
    color: "#ffffff",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.28)",
    fontFamily: "system-ui, sans-serif",
    fontSize: "0.95rem",
    fontWeight: "700",
    textAlign: "center"
  });
  documentObj.body.appendChild(notice);
  return notice;
}

/**
 * Consulta el manifiesto público sin caché. Un fallo nunca bloquea el arranque.
 * Sólo escribe la clave anti-bucle propia y no limpia ningún almacenamiento.
 */
export async function checkForRelease(options = {}) {
  const localVersion = options.localVersion || APP_VERSION;
  const fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
  const storage = options.storage === undefined ? getSessionStorage() : options.storage;
  const locationObj = options.locationObj || globalThis.location;
  const logger = options.logger || console;
  const wait = options.wait || ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const reloadDelayMs = options.reloadDelayMs ?? 500;
  const notify = options.notify || (() => showReleaseNotice(RELEASE_UPDATE_MESSAGE, options.documentObj));

  if (typeof fetchImpl !== "function") {
    return { status: "unavailable", reloadRequested: false };
  }

  let remoteVersion;
  try {
    const response = await fetchImpl(
      buildVersionManifestUrl({ manifestUrl: options.manifestUrl, now: options.now || Date.now }),
      { cache: "no-store", headers: { Accept: "application/json" } }
    );

    if (!response?.ok) throw new Error(`HTTP ${response?.status || "desconocido"}`);
    const manifest = await response.json();
    remoteVersion = typeof manifest?.version === "string" ? manifest.version.trim() : "";
    if (!SEMVER_PATTERN.test(remoteVersion)) throw new Error("Manifiesto de versión inválido");
  } catch (error) {
    logger?.warn?.("No se pudo comprobar la versión publicada; el arranque continúa.", error);
    return { status: "unavailable", reloadRequested: false };
  }

  if (remoteVersion === localVersion) {
    return { status: "current", remoteVersion, reloadRequested: false };
  }

  if (readReloadTarget(storage) === remoteVersion) {
    return { status: "already-attempted", remoteVersion, reloadRequested: false };
  }

  // Sin esta escritura verificada no se recarga: es preferible continuar a crear un bucle.
  if (!rememberReloadTarget(storage, remoteVersion)) {
    logger?.warn?.("No se pudo activar la protección anti-bucle; se omite la recarga automática.");
    return { status: "reload-protection-unavailable", remoteVersion, reloadRequested: false };
  }

  try {
    await Promise.resolve(notify(RELEASE_UPDATE_MESSAGE));
    await wait(reloadDelayMs);
    const reloadUrl = buildReleaseReloadUrl(locationObj.href, remoteVersion);
    locationObj.replace(reloadUrl);
    return { status: "reload-requested", remoteVersion, reloadUrl, reloadRequested: true };
  } catch (error) {
    logger?.warn?.("No se pudo recargar automáticamente la versión publicada.", error);
    return { status: "reload-failed", remoteVersion, reloadRequested: false };
  }
}

/** Instala comprobaciones acotadas al volver a la pestaña; no usa polling. */
export function installReleaseRechecks(options = {}) {
  const windowObj = options.windowObj || globalThis.window;
  const documentObj = options.documentObj || globalThis.document;
  const checker = options.checker || (() => checkForRelease(options.checkOptions));
  let inFlight = false;

  const run = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      await checker();
    } finally {
      inFlight = false;
    }
  };

  const onFocus = () => void run();
  const onVisibilityChange = () => {
    if (documentObj?.visibilityState === "visible") void run();
  };

  windowObj?.addEventListener?.("focus", onFocus);
  documentObj?.addEventListener?.("visibilitychange", onVisibilityChange);

  return () => {
    windowObj?.removeEventListener?.("focus", onFocus);
    documentObj?.removeEventListener?.("visibilitychange", onVisibilityChange);
  };
}
