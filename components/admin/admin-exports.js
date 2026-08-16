// ═══════════════════════════════════════════════════════════════════════════
// Admin Exports Component — UEEH Matemáticas 3ro BGU
// REAL OPENXML (.xlsx) SPREADSHEET GENERATION VIA VENDOR SHEETJS
// ═══════════════════════════════════════════════════════════════════════════

import { fetchStudents, fetchEnrollments, fetchGradebookData } from "../../core/admin-service.js";

export function renderAdminExportsView(container) {
  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm">
        <h2 class="heading-font text-2xl font-bold text-moodle-text-blue">Exportaciones Institucionales</h2>
        <p class="text-xs text-neutral-500 mt-0.5">Descarga el Libro de Calificaciones oficial en formato Excel (.xlsx) y los reportes administrativos.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Libro de Calificaciones (Excel Real .xlsx) -->
        <div class="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div class="space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl">📊</div>
            <div>
              <h3 class="heading-font text-base font-bold text-moodle-text-blue">Libro de Calificaciones (Excel .xlsx)</h3>
              <p class="text-xs text-neutral-500">Documento OpenXML oficial en hoja única (Calificaciones) con resumen y columnas dinámicas por actividad.</p>
            </div>
          </div>
          <button id="btn-export-gradebook-xlsx" class="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2">
            <span>📥</span> Descargar Excel (.xlsx)
          </button>
        </div>

        <!-- Nómina de Estudiantes (CSV) -->
        <div class="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div class="space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl">👥</div>
            <div>
              <h3 class="heading-font text-base font-bold text-moodle-text-blue">Nómina de Estudiantes (CSV)</h3>
              <p class="text-xs text-neutral-500">Listado institucional con código permanente, estado de cuenta y vinculación.</p>
            </div>
          </div>
          <button id="btn-export-students-csv" class="w-full py-3 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2">
            <span>📥</span> Descargar CSV Estudiantes
          </button>
        </div>

        <!-- Reporte de Matrículas (CSV) -->
        <div class="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div class="space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl">📋</div>
            <div>
              <h3 class="heading-font text-base font-bold text-moodle-text-blue">Reporte de Matrículas (CSV)</h3>
              <p class="text-xs text-neutral-500">Histórico de inscripciones registradas por fecha oficial de matrícula (enrolled_at).</p>
            </div>
          </div>
          <button id="btn-export-enrollments-csv" class="w-full py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2">
            <span>📥</span> Descargar CSV Matrículas
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-export-gradebook-xlsx")?.addEventListener("click", exportGradebookXLSX);
  document.getElementById("btn-export-students-csv")?.addEventListener("click", exportStudentsCSV);
  document.getElementById("btn-export-enrollments-csv")?.addEventListener("click", exportEnrollmentsCSV);
}

/**
 * Genera y descarga el archivo Excel (.xlsx) OpenXML binario oficial.
 */
export async function exportGradebookXLSX() {
  try {
    const data = await fetchGradebookData();
    const students = data.students || [];
    const activities = data.activities || [];
    const results = data.results || [];
    const sections = data.sections || [];

    if (students.length === 0) return alert("No hay datos de estudiantes matriculados para exportar.");

    const sectionMap = new Map(sections.map((s) => [s.id, s]));
    const resultMap = new Map(results.map((r) => [`${r.activity_id}:${r.student_id}`, r]));

    // Generar encabezados de actividades dinámicas (ej: "Gamificación - Actividad 01")
    const dynamicHeaders = activities.map((a) => {
      const typeLabel = a.activity_type === "gamification" ? "Gamificación" : "Trabajo en clase";
      return `${typeLabel} - ${a.title}`;
    });

    const headers = [
      "Codigo_Estudiante",
      "Nombre_Oficial",
      "Curso",
      "Paralelo",
      "Ano_Lectivo",
      "Resumen",
      ...dynamicHeaders
    ];

    const rows = students.map((s) => {
      const sec = sectionMap.get(s.class_section_id);
      const gradeStr = sec ? `${sec.grade_number}.º ${sec.education_level || "BGU"}` : "3.º BGU";
      const parallelStr = sec?.parallel || "A";
      const yearStr = sec?.year_name || "2026-2027";

      let completedCount = 0;
      let notSubmittedCount = 0;
      let pendingCount = 0;

      const activityScores = activities.map((a) => {
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

      return [
        s.student_code,
        s.official_full_name,
        gradeStr,
        parallelStr,
        yearStr,
        resumenStr,
        ...activityScores
      ];
    });

    const aoaData = [headers, ...rows];

    // Verificar si la librería SheetJS XLSX está disponible en la ventana
    const XLSXLib = window.XLSX;
    if (!XLSXLib) {
      throw new Error("La librería de exportación Excel (.xlsx) no se encuentra cargada.");
    }

    // Crear Workbook binario OpenXML real con 1 sola hoja "Calificaciones"
    const wb = XLSXLib.utils.book_new();
    const ws = XLSXLib.utils.aoa_to_sheet(aoaData);

    // Ajustar anchos de columnas
    const colWidths = headers.map((h, i) => {
      let maxLen = h.length;
      for (const row of rows) {
        const valStr = String(row[i] ?? "");
        if (valStr.length > maxLen) maxLen = valStr.length;
      }
      return { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
    });
    ws["!cols"] = colWidths;

    XLSXLib.utils.book_append_sheet(wb, ws, "Calificaciones");

    // Descargar archivo .xlsx real binario
    XLSXLib.writeFile(wb, "Libro_Calificaciones_UEEH_2026-2027.xlsx");
  } catch (err) {
    alert("Error al generar el Libro de Calificaciones Excel (.xlsx): " + err.message);
  }
}

async function exportStudentsCSV() {
  try {
    const students = await fetchStudents();
    if (students.length === 0) return alert("No hay datos de estudiantes para exportar.");

    const headers = ["Codigo_Estudiante", "Nombre_Oficial", "Curso", "Paralelo", "Ano_Lectivo", "Estado", "Vinculado"];
    const rows = students.map((s) => [
      s.student_code,
      `"${s.official_full_name}"`,
      `"${s.grade}"`,
      `"${s.parallel}"`,
      `"${s.year_name}"`,
      s.status,
      s.is_linked ? "SÍ" : "NO"
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadBlob(csvContent, `nomina_estudiantes_ueeh_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
  } catch (err) {
    alert("Error al exportar nómina de estudiantes: " + err.message);
  }
}

async function exportEnrollmentsCSV() {
  try {
    const list = await fetchEnrollments();
    if (list.length === 0) return alert("No hay datos de matrículas para exportar.");

    const headers = ["Codigo_Estudiante", "Nombre_Oficial", "Ano_Lectivo", "Curso", "Paralelo", "Fecha_Matricula"];
    const rows = list.map((e) => {
      const sec = e.class_sections;
      const gradeStr = sec ? `${sec.grade_number}.º ${sec.education_level || "BGU"}` : "N/A";
      const yearStr = sec?.academic_years?.name || "N/A";

      let fechaStr = "Sin fecha";
      if (e.enrolled_at) {
        const d = new Date(e.enrolled_at);
        if (!isNaN(d.getTime())) {
          fechaStr = d.toISOString().slice(0, 10);
        }
      }

      return [
        e.students?.student_code || "N/A",
        `"${e.students?.official_full_name || "N/A"}"`,
        `"${yearStr}"`,
        `"${gradeStr}"`,
        `"${sec?.parallel || "N/A"}"`,
        fechaStr
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadBlob(csvContent, `matriculas_ueeh_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
  } catch (err) {
    alert("Error al exportar matrículas: " + err.message);
  }
}

function downloadBlob(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
