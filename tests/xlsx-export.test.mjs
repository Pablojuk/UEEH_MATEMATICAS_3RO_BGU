// ═══════════════════════════════════════════════════════════════════════════
// Real OpenXML Binary XLSX Export Test — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import assert from "assert";
import XLSX from "xlsx";

function testBinaryXLSXGeneration() {
  console.log("--- Test 1: Verificación de Generación Binaria OpenXML .xlsx Real ---");

  // Fixtures temporales en memoria (NO tocan Supabase)
  const fixtureStudents = [
    { id: "s-01", student_code: "TEMP-001", official_full_name: "Estudiante Temporal Uno", class_section_id: "sec-01" },
    { id: "s-02", student_code: "TEMP-002", official_full_name: "Estudiante Temporal Dos", class_section_id: "sec-01" }
  ];

  const fixtureActivities = [
    { id: "act-01", title: "Gamificación 01", activity_type: "gamification", unit_number: 5, display_order: 1, minimum_score: 1 },
    { id: "act-02", title: "Trabajo 01", activity_type: "classwork", unit_number: 5, display_order: 2, minimum_score: 1 },
    { id: "act-03", title: "Gamificación 02", activity_type: "gamification", unit_number: 5, display_order: 3, minimum_score: 1 }
  ];

  const fixtureResults = [
    // Estudiante 1: Completed en Act 1, Not Submitted en Act 2, Pendiente en Act 3
    { activity_id: "act-01", student_id: "s-01", result_status: "completed", best_score: 8.5, attempt_count: 2 },
    { activity_id: "act-02", student_id: "s-01", result_status: "not_submitted", best_score: 1, attempt_count: 0 }
  ];

  const resultMap = new Map(fixtureResults.map(r => [`${r.activity_id}:${r.student_id}`, r]));

  const dynamicHeaders = fixtureActivities.map(a => `${a.activity_type === "gamification" ? "Gamificación" : "Trabajo en clase"} - ${a.title}`);
  const headers = ["Codigo_Estudiante", "Nombre_Oficial", "Curso", "Paralelo", "Ano_Lectivo", "Resumen", ...dynamicHeaders];

  const rows = fixtureStudents.map(s => {
    let completedCount = 0;
    let notSubmittedCount = 0;
    let pendingCount = 0;

    const activityScores = fixtureActivities.map(a => {
      const res = resultMap.get(`${a.id}:${s.id}`);
      if (res) {
        if (res.result_status === "completed") {
          completedCount++;
          return Number(res.best_score);
        } else if (res.result_status === "not_submitted") {
          notSubmittedCount++;
          return Number(a.minimum_score || 1);
        }
      }
      pendingCount++;
      return ""; // Celda vacía para actividad pendiente
    });

    const resumenStr = `${completedCount} entregadas | ${notSubmittedCount} no entregadas | ${pendingCount} pendientes`;
    return [s.student_code, s.official_full_name, "3.º BGU", "A", "2026-2027", resumenStr, ...activityScores];
  });

  const aoaData = [headers, ...rows];

  // Crear Workbook y Hoja única
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoaData);
  XLSX.utils.book_append_sheet(wb, ws, "Calificaciones");

  // Generar Buffer Binario real XLSX (ZIP/OpenXML)
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  // Assert 1: Comprobar firmas mágicas de cabecera ZIP/OpenXML (0x50 0x4B 0x03 0x04)
  assert.strictEqual(buffer[0], 0x50, "Header byte 0 debe ser 'P'");
  assert.strictEqual(buffer[1], 0x4B, "Header byte 1 debe ser 'K'");
  assert.strictEqual(buffer[2], 0x03, "Header byte 2 debe ser 0x03");
  assert.strictEqual(buffer[3], 0x04, "Header byte 3 debe ser 0x04");
  console.log("  ✓ El archivo generado es un paquete binario OpenXML PK-ZIP (.xlsx) real, NO un CSV de texto.");

  // Assert 2: Re-parsear archivo binario generado para validar contenido e integridad
  const parsedWb = XLSX.read(buffer, { type: "buffer" });
  assert.deepStrictEqual(parsedWb.SheetNames, ["Calificaciones"], "Debe contener EXACTAMENTE 1 sola hoja llamada 'Calificaciones'");

  const parsedSheet = parsedWb.Sheets["Calificaciones"];
  const parsedJson = XLSX.utils.sheet_to_json(parsedSheet, { header: 1 });

  // Fila 0: Encabezados
  assert.strictEqual(parsedJson[0][0], "Codigo_Estudiante");
  assert.strictEqual(parsedJson[0][5], "Resumen");
  assert.strictEqual(parsedJson[0][6], "Gamificación - Gamificación 01");

  // Fila 1: Estudiante 1
  assert.strictEqual(parsedJson[1][0], "TEMP-001");
  assert.strictEqual(parsedJson[1][6], 8.5, "Actividad completada debe exportar el best_score como valor numérico (8.5)");
  assert.strictEqual(parsedJson[1][7], 1, "Actividad not_submitted debe exportar el minimum_score (1.00), NUNCA 0");
  assert.ok(parsedJson[1][8] === "" || parsedJson[1][8] === undefined, "Actividad pendiente sin resultado debe exportar celda vacía");

  console.log("  ✓ Contenido de hoja de calificaciones parseado y validado con éxito.");
}

function testZeroActivitiesScenario() {
  console.log("--- Test 2: Verificación de Escenario con 0 Actividades ---");

  const headers = ["Codigo_Estudiante", "Nombre_Oficial", "Curso", "Paralelo", "Ano_Lectivo", "Resumen"];
  const rows = [
    ["TEMP-001", "Estudiante Temporal Uno", "3.º BGU", "A", "2026-2027", "0 entregadas | 0 no entregadas | 0 pendientes"]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Calificaciones");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const parsedWb = XLSX.read(buffer, { type: "buffer" });

  assert.deepStrictEqual(parsedWb.SheetNames, ["Calificaciones"]);
  console.log("  ✓ El libro se genera limpiamente con columnas base en escenario de 0 actividades.");
}

try {
  testBinaryXLSXGeneration();
  testZeroActivitiesScenario();
  console.log("🎉 PRUEBA BINARIA DE GENERACIÓN DE EXCEL (.xlsx) COMPLETADA CON ÉXITO 100%.");
  process.exit(0);
} catch (err) {
  console.error("❌ Error en prueba de generación XLSX:", err);
  process.exit(1);
}
