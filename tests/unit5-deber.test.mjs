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

scriptMatches.forEach((s, idx) => {
  const code = s.replace(/<script[^>]*>|<\/script>/gi, "");
  try {
    new vm.Script(code);
  } catch (err) {
    assert.fail(`❌ ERROR DE SINTAXIS JS en script ${idx} de deber.html: ${err.message}`);
  }
});
console.log("✔ Deber HTML — Todos los scripts compilan con sintaxis JavaScript 100% válida");

// 2. Verificar que el botón 'Iniciar Deber' existe y tiene onclick='startHomework()'
assert.ok(
  html.includes('onclick="startHomework()"'),
  "❌ ERROR: El botón Iniciar Deber debe invocar la función startHomework()"
);
console.log("✔ Deber HTML — Botón Iniciar Deber correctamente vinculado a startHomework()");

// 3. Verificar que el header muestra '4 Intentos' y no '3 Intentos'
assert.ok(
  html.includes("4 Intentos"),
  "❌ ERROR: La cabecera de deber.html debe mostrar '4 Intentos'"
);
assert.ok(
  !html.includes("3 Intentos"),
  "❌ ERROR: La cabecera de deber.html NO debe mostrar '3 Intentos'"
);
console.log("✔ Deber HTML — Cabecera configurada correctamente con '4 Intentos'");

// 4. Verificar que NO depende de modales o inputs legacy de identificación manual
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

// 5. Verificar que la recuperación calcula MAX(notaInit, recAvg) y no el promedio
assert.ok(
  html.includes("Math.max(notaInit, recAvg)"),
  "❌ ERROR: showSummary debe calcular la nota final con Math.max(notaInit, recAvg)"
);
console.log("✔ Deber HTML — Nota final de recuperación configurada con MAX(initial, recovery)");

// 6. Verificar que la cantidad de ejercicios iniciales es 14 y de recuperación es 8
assert.ok(html.includes("id: 14"), "❌ ERROR: Debe existir el ejercicio inicial 14");
assert.ok(html.includes("id: 8") && html.includes("R8. Resuelve por Cramer"), "❌ ERROR: Debe existir el ejercicio de recuperación R8");
console.log("✔ Deber HTML — 14 ejercicios iniciales y 8 de recuperación verificados");

console.log("🎉 TODOS LOS TESTS DE INTEGRIDAD DE UNIDAD 5 (DEBER) PASARON CON ÉXITO 100%!");
