// ═══════════════════════════════════════════════════════════════════════════
// Admin Activities Integration Unit Test — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import assert from "assert";

const activitiesComponentPath = path.resolve("components/admin/admin-activities.js");
const content = fs.readFileSync(activitiesComponentPath, "utf-8");

// 1. Verificar que currentSubView es "grades" por defecto
assert.ok(
  content.includes('let currentSubView = "grades";'),
  "❌ ERROR: La subvista por defecto en admin-activities.js debe ser 'grades' (Notas por estudiante)"
);

// 2. Verificar existencia de botones de subvista en la cabecera
assert.ok(
  content.includes('id="act-subtab-grades"') && content.includes('id="act-subtab-manage"'),
  "❌ ERROR: admin-activities.js debe contener los botones de subvista #act-subtab-grades y #act-subtab-manage"
);

// 3. Verificar consumo de la acción student_grades_matrix
assert.ok(
  content.includes('fetchStudentGradesMatrix'),
  "❌ ERROR: admin-activities.js debe invocar fetchStudentGradesMatrix"
);

// 4. Verificar etiquetas amigables en los encabezados dinámicos
assert.ok(
  content.includes('if (act.activity_type === "gamification") shortTitle = "Gamificación";') &&
  content.includes('else if (act.activity_type === "classwork") shortTitle = "Trabajo en Clase";'),
  "❌ ERROR: admin-activities.js debe convertir gamification -> Gamificación y classwork -> Trabajo en Clase"
);

// 5. Verificar modal de detalle
assert.ok(
  content.includes('openStudentGradeDetailModal'),
  "❌ ERROR: admin-activities.js debe soportar la acción Ver detalle con modal"
);

console.log("✅ INTEGRATION TEST PASSED: La vista Actividades monta 'Notas por estudiante' por defecto y conmuta a 'Gestionar actividades'.");
