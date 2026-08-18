// ═══════════════════════════════════════════════════════════════════════════
// Unit 5 Classwork (Deber) Static & DOM Integrity Test — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import vm from "vm";
import assert from "assert";

const deberPath = path.resolve("topics/unit5-determinantes/deber.html");
const html = fs.readFileSync(deberPath, "utf-8");

// 1. Verificar compilación limpia de todos los scripts en deber.html
const scriptMatches = html.match(/<script(?![^>]*src=)[\s\S]*?>([\s\S]*?)<\/script>/gi) || [];
assert.ok(scriptMatches.length > 0, "❌ ERROR: No se encontraron scripts en deber.html");

const sandbox = {
  window: {},
  crypto: { randomUUID: () => "test-uuid" },
  document: {
    querySelectorAll: () => [],
    getElementById: () => ({ classList: { add: () => {}, remove: () => {} }, style: {} })
  }
};
vm.createContext(sandbox);

scriptMatches.forEach((s, idx) => {
  const code = s.replace(/<script[^>]*>|<\/script>/gi, "");
  try {
    vm.runInContext(code, sandbox);
  } catch (err) {
    assert.fail(`❌ ERROR DE SINTAXIS / EJECUCIÓN JS en script ${idx} de deber.html: ${err.message}`);
  }
});
console.log("✔ Deber HTML — Todos los scripts compilan y se ejecutan limpiamente en contexto VM");

// 2. Verificar que las variables globales y funciones se instancian correctamente
const exercises = vm.runInContext("exercises", sandbox);
const recoveryExercises = vm.runInContext("recoveryExercises", sandbox);
const startHomework = vm.runInContext("startHomework", sandbox);

assert.ok(Array.isArray(exercises), "❌ ERROR: exercises debe ser un Array");
assert.strictEqual(exercises.length, 14, "❌ ERROR: exercises debe tener exactamente 14 elementos");

assert.ok(Array.isArray(recoveryExercises), "❌ ERROR: recoveryExercises debe ser un Array");
assert.strictEqual(recoveryExercises.length, 8, "❌ ERROR: recoveryExercises debe tener exactamente 8 elementos");

assert.strictEqual(typeof startHomework, "function", "❌ ERROR: startHomework debe ser una función");
console.log("✔ Deber HTML — exercises (14), recoveryExercises (8) y startHomework (function) verificados");

// 3. Verificar que el botón 'Iniciar Deber' existe y tiene onclick='startHomework()'
assert.ok(
  html.includes('onclick="startHomework()"'),
  "❌ ERROR: El botón Iniciar Deber debe invocar la función startHomework()"
);
console.log("✔ Deber HTML — Botón Iniciar Deber correctamente vinculado a startHomework()");

// 4. Verificar que el header muestra '4 Intentos' y no '3 Intentos'
assert.ok(
  html.includes("4 Intentos"),
  "❌ ERROR: La cabecera de deber.html debe mostrar '4 Intentos'"
);
assert.ok(
  !html.includes("3 Intentos"),
  "❌ ERROR: La cabecera de deber.html NO debe mostrar '3 Intentos'"
);
console.log("✔ Deber HTML — Cabecera configurada correctamente con '4 Intentos'");

// 5. Verificar que NO depende de modales o inputs legacy de identificación manual
assert.ok(
  !html.includes("openDataModal"),
  "❌ ERROR: deber.html no debe depender de openDataModal"
);
assert.ok(
  !html.includes("ensureStudentData"),
  "❌ ERROR: deber.html no debe depender de ensureStudentData"
);
assert.ok(
  !html.includes("studentName") && !html.includes("studentCourse"),
  "❌ ERROR: deber.html no debe contener campos de identificación manual de estudiantes"
);
console.log("✔ Deber HTML — Eliminada toda dependencia de modal legacy o captura manual");

// 6. Verificar que la recuperación calcula MAX(notaInit, recAvg) y no el promedio
assert.ok(
  html.includes("Math.max(notaInit, recAvg)"),
  "❌ ERROR: showSummary debe calcular la nota final con Math.max(notaInit, recAvg)"
);
console.log("✔ Deber HTML — Nota final de recuperación configurada con MAX(initial, recovery)");

// 7. Verificar que el comentario inicial del bloque de ejercicios está cerrado limpiamente
assert.ok(
  html.includes("BASE DE DATOS DE LOS 14 EJERCICIOS\n     ************************************************************/\n    const exercises = [") ||
  html.includes("BASE DE DATOS DE LOS 14 EJERCICIOS\r\n     ************************************************************/\r\n    const exercises = ["),
  "❌ ERROR: El comentario de los 14 ejercicios debe estar cerrado y const exercises declarado en línea propia"
);
console.log("✔ Deber HTML — Comentario y declaración const exercises formateados con máxima pulcritud");

console.log("🎉 TODOS LOS TESTS DE INTEGRIDAD DE UNIDAD 5 (DEBER) PASARON CON ÉXITO 100%!");
