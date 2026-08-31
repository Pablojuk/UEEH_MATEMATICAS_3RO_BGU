// ═══════════════════════════════════════════════════════════════════════════
// Application Release & Asset Versioning — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Versión de compilación y despliegue global de la plataforma.
 * Al incrementar esta constante en un release, todos los navegadores
 * invalidan de forma automática e inmediata el caché de módulos JS.
 */
export const APP_VERSION = "1.4.6";
export const BUILD_TIMESTAMP = "2026-08-30-v1.4.6";

/**
 * Anexa o actualiza el parámetro de versionado ?v=APP_VERSION a una URL o ruta de módulo,
 * preservando parámetros de consulta existentes y fragmentos de ancla (#hash).
 *
 * @param {string} pathStr - Ruta o URL a versionar.
 * @param {string} [version=APP_VERSION] - Versión a aplicar.
 * @returns {string} URL con parámetro de versión garantizado.
 */
export function withVersion(pathStr, version = APP_VERSION) {
  if (!pathStr || typeof pathStr !== "string") return pathStr;

  const [baseAndQuery, hash] = pathStr.split("#");
  const [base, query] = baseAndQuery.split("?");

  const params = new URLSearchParams(query || "");
  params.set("v", version);

  const newQuery = params.toString();
  const queryPart = newQuery ? `?${newQuery}` : "";
  const hashPart = hash !== undefined ? `#${hash}` : "";

  return `${base}${queryPart}${hashPart}`;
}
