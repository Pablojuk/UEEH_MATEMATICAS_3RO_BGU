import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { APP_VERSION, BUILD_TIMESTAMP } from "../core/version.js";

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

const manifest = JSON.parse(read("version.json"));
assert.deepEqual(Object.keys(manifest).sort(), ["build", "version"], "version.json sólo debe exponer version y build");
assert.equal(manifest.version, APP_VERSION, "version.json y APP_VERSION deben coincidir");
assert.equal(manifest.build, BUILD_TIMESTAMP, "version.json y BUILD_TIMESTAMP deben coincidir");
assert.equal(BUILD_TIMESTAMP, `2026-08-31-v${APP_VERSION}`, "El build final debe corresponder al release actual");

const indexHtml = read("index.html");
assert.match(indexHtml, new RegExp(`assets/css/styles\\.css\\?v=${APP_VERSION.replaceAll(".", "\\.")}`));
assert.match(indexHtml, new RegExp(`assets/js/main\\.js\\?v=${APP_VERSION.replaceAll(".", "\\.")}`));
assert.match(indexHtml, new RegExp(`assets/vendor/xlsx\\.full\\.min\\.js\\?v=${APP_VERSION.replaceAll(".", "\\.")}`));
assert.match(indexHtml, /Cache-Control" content="no-cache, no-store, must-revalidate"/);

const mainJs = read("assets/js/main.js");
assert.ok(mainJs.includes(`core/release-check.js?v=${APP_VERSION}`), "main.js debe versionar release-check.js");
assert.ok(mainJs.includes(`core/app.js?v=${APP_VERSION}`), "main.js debe versionar app.js");
assert.ok(
  mainJs.indexOf("await checkForRelease()") < mainJs.indexOf("await import(APP_MODULE_URL)"),
  "El release check debe ejecutarse antes de cargar la aplicación"
);

const releaseCheckJs = read("core/release-check.js");
assert.ok(releaseCheckJs.includes(`version.js?v=${APP_VERSION}`), "release-check.js debe cargar la versión vigente");
assert.ok(releaseCheckJs.includes('cache: "no-store"'), "version.json debe solicitarse con cache: no-store");
assert.ok(releaseCheckJs.includes('new URL("../version.json", import.meta.url)'), "version.json debe resolverse relativo al repositorio");
assert.ok(!releaseCheckJs.includes('new URL("/version.json"'), "No se permite una ruta absoluta /version.json");
assert.ok(releaseCheckJs.includes('"focus"'), "Debe comprobar al recuperar el foco");
assert.ok(releaseCheckJs.includes('"visibilitychange"'), "Debe comprobar al volver visible");
assert.ok(!releaseCheckJs.includes("setInterval("), "No se permite polling periódico");
assert.ok(!releaseCheckJs.includes("localStorage"), "El release check no debe tocar localStorage ni la sesión de Supabase");
assert.ok(!releaseCheckJs.includes(".clear("), "El release check no debe vaciar almacenamiento");

function walkFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(path.join(ROOT, directory), { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(relative));
    else if (/\.(?:html|js|mjs)$/.test(entry.name)) files.push(relative);
  }
  return files;
}

const productiveFiles = [
  "index.html",
  ...walkFiles("assets/js"),
  ...walkFiles("components"),
  ...walkFiles("core"),
  ...walkFiles("topics")
];

const staleTokens = [];
for (const file of productiveFiles) {
  const source = read(file);
  for (const match of source.matchAll(/[?&]v=(\d+\.\d+\.\d+)/g)) {
    if (match[1] !== APP_VERSION) staleTokens.push(`${file}: ${match[1]}`);
  }
}

assert.deepEqual(staleTokens, [], `Hay tokens productivos con versiones antiguas: ${staleTokens.join(", ")}`);

for (const file of [
  "topics/unit5-determinantes/deber.html",
  "topics/unit5-determinantes/gamificacion.html",
  "topics/unit6-sucesiones/deber.html",
  "topics/unit6-sucesiones/gamificacion.html",
  "topics/unit7-binomial/deber.html",
  "topics/unit7-binomial/gamificacion.html"
]) {
  assert.ok(read(file).includes(`?v=${APP_VERSION}`), `${file} debe importar servicios con la versión vigente`);
}

console.log(`✔ Release version consistency — ${APP_VERSION}, SheetJS y todos los imports productivos están alineados`);
