// ═══════════════════════════════════════════════════════════════════════════
// Admin Activities & Student Grades Matrix Component — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import {
  fetchActivitiesAdminList,
  fetchActivityAdminDetail,
  upsertActivity,
  setActivityActive,
  reopenActivity,
  fetchAcademicYears,
  fetchClassSections,
  fetchStudentGradesMatrix,
  adminResetStudentActivity,
  adminReopenStudentActivity
} from "../../core/admin-service.js";

let currentSubView = "grades"; // "grades" (DEFAULT) | "manage"
let selectedUnitNumber = 5;
let currentMatrixData = null;
let currentActivities = [];
let academicYears = [];
let classSections = [];

/**
 * Renderiza el contenedor principal de la pestaña Actividades con sub-vistas navegables.
 */
export async function renderAdminActivitiesView(container) {
  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <!-- Encabezado con Navegación Secundaria de Sub-Vistas -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm">
        <div>
          <h2 class="heading-font text-2xl font-bold text-moodle-text-blue flex items-center gap-2">
            Actividades Académicas
          </h2>
          <p class="text-xs text-neutral-500 mt-0.5">Calificaciones oficiales por estudiante y gestión de pautas privadas (Unidad 5+).</p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Selector de Sub-Vistas -->
          <div class="flex items-center bg-neutral-100 p-1 rounded-2xl border border-neutral-200">
            <button id="act-subtab-grades" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentSubView === "grades" ? "bg-white text-purple-900 shadow-sm" : "text-neutral-600 hover:text-purple-900"
            }">
              📊 Notas por estudiante
            </button>
            <button id="act-subtab-manage" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentSubView === "manage" ? "bg-white text-purple-900 shadow-sm" : "text-neutral-600 hover:text-purple-900"
            }">
              📝 Gestionar actividades
            </button>
          </div>

          <button id="btn-new-activity-top" class="${currentSubView === "manage" ? "flex" : "hidden"} px-4 py-2.5 rounded-2xl bg-moodle-blue hover:bg-moodle-blue/90 text-white font-bold text-xs shadow-md transition-all items-center gap-1.5">
            <span>➕</span> <span class="hidden sm:inline">Nueva Actividad</span>
          </button>
        </div>
      </div>

      <!-- Contenedor Principal Dinámico de Sub-Vista -->
      <div id="act-subview-root"></div>
    </div>

    <!-- Container Global para Modales -->
    <div id="modal-container"></div>
  `;

  bindSubViewEvents(container);

  if (currentSubView === "grades") {
    await renderStudentGradesSubView();
  } else {
    await renderManageActivitiesSubView();
  }
}

function bindSubViewEvents(container) {
  const btnGrades = container.querySelector("#act-subtab-grades");
  const btnManage = container.querySelector("#act-subtab-manage");
  const btnNew = container.querySelector("#btn-new-activity-top");

  btnGrades?.addEventListener("click", async () => {
    if (currentSubView === "grades") return;
    currentSubView = "grades";
    renderAdminActivitiesView(container);
  });

  btnManage?.addEventListener("click", async () => {
    if (currentSubView === "manage") return;
    currentSubView = "manage";
    renderAdminActivitiesView(container);
  });

  btnNew?.addEventListener("click", () => openActivityModal(null));
}

/* ==========================================================================
   SUB-VISTA 1 (PREDETERMINADA): NOTAS POR ESTUDIANTE
   ========================================================================== */

async function renderStudentGradesSubView() {
  const root = document.getElementById("act-subview-root");
  if (!root) return;

  root.innerHTML = `
    <div class="space-y-4">
      <!-- Barra Superior: Selector Dinámico de Unidad y Filtro de Búsqueda -->
      <div class="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <label class="text-xs font-bold text-neutral-700 uppercase tracking-wide whitespace-nowrap">Unidad:</label>
          <select id="select-unit-number" class="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs font-bold text-purple-900 focus:outline-none focus:border-purple-600">
            <option value="5" ${selectedUnitNumber === 5 ? "selected" : ""}>Unidad 5 — Determinantes</option>
            <option value="6" ${selectedUnitNumber === 6 ? "selected" : ""}>Unidad 6</option>
            <option value="7" ${selectedUnitNumber === 7 ? "selected" : ""}>Unidad 7</option>
          </select>
        </div>

        <div class="relative w-full sm:w-80">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">🔍</span>
          <input type="text" id="input-grades-search" placeholder="Buscar por estudiante o código (ej. UEEH-STU-000011)…"
                 class="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-moodle-text-blue focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-colors" />
        </div>
      </div>

      <!-- Tabla Matriz de Calificaciones -->
      <div id="grades-matrix-container" class="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
        <div class="flex justify-center py-12">
          <div class="w-8 h-8 border-4 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  `;

  await loadAndRenderGradesMatrix();

  document.getElementById("select-unit-number")?.addEventListener("change", async (e) => {
    selectedUnitNumber = Number(e.target.value);
    await loadAndRenderGradesMatrix();
  });

  document.getElementById("input-grades-search")?.addEventListener("input", filterAndRenderLocalGrades);
}

async function loadAndRenderGradesMatrix() {
  const container = document.getElementById("grades-matrix-container");

  try {
    const [matrixData, adminActivities] = await Promise.all([
      fetchStudentGradesMatrix(selectedUnitNumber),
      Array.isArray(currentActivities) && currentActivities.length > 0 ? Promise.resolve(currentActivities) : fetchActivitiesAdminList()
    ]);
    if (Array.isArray(adminActivities) && adminActivities.length > 0) {
      currentActivities = adminActivities;
    }
    currentMatrixData = matrixData;
    filterAndRenderLocalGrades();
  } catch (err) {
    if (container) {
      container.innerHTML = `<div class="p-6 text-center text-xs text-red-600 font-bold">Error al cargar la matriz de calificaciones: ${err.message}</div>`;
    }
  }
}

function filterAndRenderLocalGrades() {
  const container = document.getElementById("grades-matrix-container");
  const searchVal = (document.getElementById("input-grades-search")?.value || "").toLowerCase().trim();

  if (!container || !currentMatrixData) return;

  const { activities = [], students = [] } = currentMatrixData;

  const filteredStudents = students.filter((st) => {
    if (!searchVal) return true;
    return st.official_full_name.toLowerCase().includes(searchVal) || st.student_code.toLowerCase().includes(searchVal);
  });

  if (filteredStudents.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center space-y-2">
        <div class="text-3xl">🔍</div>
        <p class="text-xs font-bold text-neutral-600">No se encontraron estudiantes para la Unidad ${selectedUnitNumber}.</p>
      </div>
    `;
    return;
  }

  // Transformar encabezados dinámicamente según actividades devueltas
  let activityHeadersHtml = "";
  const hasClasswork = activities.some(a => a.activity_type === "classwork");
  const hasGamification = activities.some(a => a.activity_type === "gamification");

  if (hasGamification) {
    activityHeadersHtml += `<th class="px-5 py-3.5 text-center whitespace-nowrap">Gamificación</th>`;
  }
  if (hasClasswork) {
    activityHeadersHtml += `
      <th class="px-5 py-3.5 text-center whitespace-nowrap">Trabajo Inicial</th>
      <th class="px-5 py-3.5 text-center whitespace-nowrap">Recuperación</th>
      <th class="px-5 py-3.5 text-center whitespace-nowrap">Nota Final Trabajo</th>
    `;
  }

  // Construir filas de estudiantes
  const rowsHtml = filteredStudents
    .map((st) => {
      let completedCount = 0;
      let notSubmittedCount = 0;

      let gamificationCell = `<td class="px-5 py-4 text-center font-bold text-neutral-400">—</td>`;
      let classworkInitCell = `<td class="px-5 py-4 text-center font-bold text-neutral-400">—</td>`;
      let classworkRecCell = `<td class="px-5 py-4 text-center font-bold text-neutral-400">—</td>`;
      let classworkFinalCell = `<td class="px-5 py-4 text-center font-bold text-neutral-400">—</td>`;

      for (const act of activities) {
        const gradeInfo = st.grades?.[act.activity_key];

        if (act.activity_type === "gamification") {
          if (gradeInfo?.result_status === "completed") {
            completedCount++;
            gamificationCell = `<td class="px-5 py-4 text-center font-bold text-purple-950">${Number(gradeInfo.best_score).toFixed(2)} / 10</td>`;
          } else if (gradeInfo?.result_status === "not_submitted") {
            notSubmittedCount++;
            gamificationCell = `<td class="px-5 py-4 text-center font-bold text-red-600">${Number(act.minimum_score || 1).toFixed(2)} / 10</td>`;
          }
        } else if (act.activity_type === "classwork") {
          if (gradeInfo?.result_status === "completed") {
            completedCount++;
            const initVal = gradeInfo.initial_score !== null ? Number(gradeInfo.initial_score).toFixed(2) : Number(gradeInfo.best_score).toFixed(2);
            const recVal = gradeInfo.recovery_score !== null ? Number(gradeInfo.recovery_score).toFixed(2) : null;
            const finalVal = Number(gradeInfo.best_score).toFixed(2);

            classworkInitCell = `<td class="px-5 py-4 text-center font-bold text-neutral-800">${initVal} / 10</td>`;
            classworkRecCell = `<td class="px-5 py-4 text-center font-bold ${recVal !== null ? 'text-blue-900' : 'text-neutral-400'}">${recVal !== null ? `${recVal} / 10` : '—'}</td>`;
            classworkFinalCell = `<td class="px-5 py-4 text-center font-extrabold text-purple-950">${finalVal} / 10</td>`;
          } else if (gradeInfo?.result_status === "not_submitted") {
            notSubmittedCount++;
            const minScoreNum = Number(act.minimum_score || 1.00).toFixed(2);
            classworkInitCell = `<td class="px-5 py-4 text-center font-bold text-red-600">${minScoreNum} / 10</td>`;
            classworkRecCell = `<td class="px-5 py-4 text-center font-bold text-neutral-400">—</td>`;
            classworkFinalCell = `<td class="px-5 py-4 text-center font-bold text-red-600">${minScoreNum} / 10</td>`;
          }
        }
      }

      // Estado General por Estudiante
      let overallStatusBadge = `<span class="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold">🟡 Pendiente</span>`;
      if (notSubmittedCount > 0) {
        overallStatusBadge = `<span class="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">🔴 Con actividad no entregada</span>`;
      } else if (activities.length > 0 && completedCount === activities.length) {
        overallStatusBadge = `<span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">✅ Completo</span>`;
      } else if (completedCount > 0) {
        overallStatusBadge = `<span class="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">🟡 Parcial</span>`;
      }

      let cellsHtml = "";
      if (hasGamification) cellsHtml += gamificationCell;
      if (hasClasswork) cellsHtml += classworkInitCell + classworkRecCell + classworkFinalCell;

      return `
        <tr class="hover:bg-neutral-50/80 transition-colors border-b border-neutral-100 last:border-none text-xs">
          <td class="px-5 py-4 font-bold text-neutral-800">${escapeHTML(st.official_full_name)}</td>
          <td class="px-5 py-4 font-mono font-bold text-moodle-text-blue">${escapeHTML(st.student_code)}</td>
          ${cellsHtml}
          <td class="px-5 py-4 text-center">${overallStatusBadge}</td>
          <td class="px-5 py-4 text-right">
            <button data-student-code="${escapeHTML(st.student_code)}" class="btn-detail-student-grades px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold transition-colors">
              Ver detalle →
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-neutral-50 border-b border-neutral-200 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
            <th class="px-5 py-3.5">Estudiante</th>
            <th class="px-5 py-3.5">Código</th>
            ${activityHeadersHtml}
            <th class="px-5 py-3.5 text-center">Estado</th>
            <th class="px-5 py-3.5 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll(".btn-detail-student-grades").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.getAttribute("data-student-code");
      const stData = students.find((s) => s.student_code === code);
      if (stData) openStudentGradeDetailModal(stData, selectedUnitNumber, currentMatrixData);
    });
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveActivityUuid(act, gradeInfo) {
  if (act?.id && UUID_REGEX.test(act.id)) return act.id;
  if (act?.activity_id && UUID_REGEX.test(act.activity_id)) return act.activity_id;
  if (gradeInfo?.activity_id && UUID_REGEX.test(gradeInfo.activity_id)) return gradeInfo.activity_id;
  
  const key = act?.activity_key || gradeInfo?.activity_key;
  if (key && Array.isArray(currentActivities) && currentActivities.length > 0) {
    const found = currentActivities.find(ca => ca.activity_key === key);
    if (found?.id && UUID_REGEX.test(found.id)) return found.id;
  }
  return "";
}

function resolveStudentUuid(student, gradeInfo) {
  // 1. student.id (UUID directo del objeto de la matriz)
  if (student?.id && UUID_REGEX.test(student.id)) return student.id;
  // 2. student.student_id (alias UUID)
  if (student?.student_id && UUID_REGEX.test(student.student_id)) return student.student_id;
  // 3. gradeInfo.student_id (UUID del registro de calificación)
  if (gradeInfo?.student_id && UUID_REGEX.test(gradeInfo.student_id)) return gradeInfo.student_id;
  // 4. Búsqueda por código institucional en la matriz vigente
  if (student?.student_code && currentMatrixData?.students) {
    const byCode = currentMatrixData.students.find(s => s.student_code === student.student_code);
    if (byCode?.id && UUID_REGEX.test(byCode.id)) return byCode.id;
    if (byCode?.student_id && UUID_REGEX.test(byCode.student_id)) return byCode.student_id;
  }
  // 5. Búsqueda por nombre completo como último fallback
  if (student?.official_full_name && currentMatrixData?.students) {
    const byName = currentMatrixData.students.find(s => s.official_full_name === student.official_full_name);
    if (byName?.id && UUID_REGEX.test(byName.id)) return byName.id;
    if (byName?.student_id && UUID_REGEX.test(byName.student_id)) return byName.student_id;
  }
  return "";
}

/**
 * Modal con el desglose académico detallado del estudiante.
 */
async function openStudentGradeDetailModal(student, unitNumber, matrixData) {
  const container = document.getElementById("modal-container");
  if (!container) return;

  // Asegurar que el catálogo de actividades con UUIDs esté en memoria
  if (!Array.isArray(currentActivities) || currentActivities.length === 0) {
    try {
      currentActivities = await fetchActivitiesAdminList();
    } catch (_) {}
  }

  const { activities = [] } = matrixData;

  const formatDate = (isoStr) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("es-EC", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    } catch (_) {
      return "—";
    }
  };

  const rowsHtml = activities
    .map((act) => {
      const gradeInfo = student.grades?.[act.activity_key];

      let statusBadge = `<span class="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold">🟡 Pendiente</span>`;
      let initialNote = "—";
      let recoveryNote = "—";
      let finalNote = "—";
      let regDateDisplay = "—";

      if (gradeInfo) {
        if (gradeInfo.result_status === "completed") {
          statusBadge = `<span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">✅ Enviado y registrado</span>`;
          initialNote = gradeInfo.initial_score !== null ? `${Number(gradeInfo.initial_score).toFixed(2)} / 10` : `${Number(gradeInfo.best_score).toFixed(2)} / 10`;
          recoveryNote = gradeInfo.recovery_score !== null ? `${Number(gradeInfo.recovery_score).toFixed(2)} / 10` : "—";
          finalNote = `${Number(gradeInfo.best_score).toFixed(2)} / 10`;
          regDateDisplay = formatDate(gradeInfo.last_completed_at);
        } else if (gradeInfo.result_status === "not_submitted") {
          statusBadge = `<span class="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">🔴 No entregado — plazo vencido</span>`;
          initialNote = `${Number(act.minimum_score || 1.00).toFixed(2)} / 10`;
          recoveryNote = "—";
          finalNote = `${Number(act.minimum_score || 1.00).toFixed(2)} / 10`;
          regDateDisplay = "—";
        }
      }

      const dueDateDisplay = formatDate(act.due_at);
      const actId = resolveActivityUuid(act, gradeInfo);
      const studentId = resolveStudentUuid(student, gradeInfo);

      return `
        <tr class="border-b border-neutral-100 text-xs">
          <td class="px-5 py-4 font-bold text-neutral-800">${escapeHTML(act.title)}</td>
          <td class="px-5 py-4">${statusBadge}</td>
          <td class="px-5 py-4 font-bold text-neutral-800">${initialNote}</td>
          <td class="px-5 py-4 font-bold text-blue-900">${recoveryNote}</td>
          <td class="px-5 py-4 font-extrabold text-purple-950">${finalNote}</td>
          <td class="px-5 py-4 text-neutral-500 font-mono text-[11px]">${regDateDisplay}</td>
          <td class="px-5 py-4 text-neutral-500 font-mono text-[11px]">${dueDateDisplay}</td>
          <td class="px-5 py-4 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button data-activity-id="${escapeHTML(actId)}" data-activity-key="${escapeHTML(act.activity_key || '')}" data-activity-title="${escapeHTML(act.title)}" data-student-id="${escapeHTML(studentId)}" data-student-code="${escapeHTML(student.student_code || '')}" class="btn-reopen-student-act px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px] transition-colors flex items-center gap-1 shadow-sm" title="Reabrir actividad para este estudiante">
                <span>🔓</span> Reabrir
              </button>
              <button data-activity-id="${escapeHTML(actId)}" data-activity-key="${escapeHTML(act.activity_key || '')}" data-activity-title="${escapeHTML(act.title)}" data-student-id="${escapeHTML(studentId)}" data-student-code="${escapeHTML(student.student_code || '')}" class="btn-reset-student-act px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 font-bold text-[11px] transition-colors flex items-center gap-1 shadow-sm" title="Reiniciar completamente actividad para este estudiante">
                <span>🔄</span> Reiniciar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div class="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-8 border border-neutral-200">
        <div class="p-6 bg-purple-800 text-white flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">📋</div>
            <div>
              <h3 class="heading-font text-lg font-bold">Detalle Académico del Estudiante</h3>
              <p class="text-xs text-purple-200">Unidad ${unitNumber} — 3.º BGU A</p>
            </div>
          </div>
          <button id="btn-close-detail-modal" class="text-white/80 hover:text-white text-xl">✕</button>
        </div>

        <div class="p-6 space-y-6">
          <!-- Identificación del Estudiante -->
          <div class="bg-purple-50/70 border border-purple-200/70 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Estudiante:</span>
              <span class="font-bold text-neutral-900 text-sm">${escapeHTML(student.official_full_name)}</span>
            </div>
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Código Institucional:</span>
              <span class="font-mono font-bold text-purple-900 text-sm">${escapeHTML(student.student_code)}</span>
            </div>
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Curso:</span>
              <span class="font-bold text-neutral-900 text-sm">3.º BGU A</span>
            </div>
          </div>

          <!-- Tabla Desglose -->
          <div class="border border-neutral-200 rounded-2xl overflow-hidden">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-neutral-50 border-b border-neutral-200 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                  <th class="px-5 py-3.5">Actividad</th>
                  <th class="px-5 py-3.5">Estado</th>
                  <th class="px-5 py-3.5">Nota Inicial</th>
                  <th class="px-5 py-3.5">Recuperación</th>
                  <th class="px-5 py-3.5">Nota Final</th>
                  <th class="px-5 py-3.5">Fecha Registro</th>
                  <th class="px-5 py-3.5">Fecha Límite</th>
                  <th class="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <div class="p-4 bg-neutral-50 border-t border-neutral-100 flex justify-end">
          <button id="btn-close-detail-modal-bottom" class="px-6 py-2.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `;

  const closeModalFn = () => { container.innerHTML = ""; };
  container.querySelector("#btn-close-detail-modal")?.addEventListener("click", closeModalFn);
  container.querySelector("#btn-close-detail-modal-bottom")?.addEventListener("click", closeModalFn);

  // Helper para asegurar obtención del UUID de actividad antes de invocar
  const getVerifiedActivityId = async (btn) => {
    let actId = btn.getAttribute("data-activity-id");
    if (actId && UUID_REGEX.test(actId)) return actId;

    const actKey = btn.getAttribute("data-activity-key");
    if (actKey) {
      try {
        if (!currentActivities || currentActivities.length === 0) {
          currentActivities = await fetchActivitiesAdminList();
        }
        const found = currentActivities.find(ca => ca.activity_key === actKey);
        if (found?.id && UUID_REGEX.test(found.id)) return found.id;
      } catch (_) {}
    }
    return null;
  };

  // Helper para asegurar obtención del UUID del estudiante (5 niveles de fallback)
  const getVerifiedStudentId = (btn) => {
    // 1. data-student-id directo del atributo HTML
    const attrId = btn.getAttribute("data-student-id");
    if (attrId && UUID_REGEX.test(attrId)) return attrId;

    // 2. student.id del objeto closure
    if (student?.id && UUID_REGEX.test(student.id)) return student.id;

    // 3. student.student_id del objeto closure
    if (student?.student_id && UUID_REGEX.test(student.student_id)) return student.student_id;

    // 4. Búsqueda por código institucional en la matriz vigente
    const stCode = btn.getAttribute("data-student-code") || student?.student_code;
    if (stCode && currentMatrixData?.students) {
      const byCode = currentMatrixData.students.find(s => s.student_code === stCode);
      if (byCode?.id && UUID_REGEX.test(byCode.id)) return byCode.id;
      if (byCode?.student_id && UUID_REGEX.test(byCode.student_id)) return byCode.student_id;
    }

    // 5. Búsqueda por nombre completo como último fallback
    if (student?.official_full_name && currentMatrixData?.students) {
      const byName = currentMatrixData.students.find(s => s.official_full_name === student.official_full_name);
      if (byName?.id && UUID_REGEX.test(byName.id)) return byName.id;
      if (byName?.student_id && UUID_REGEX.test(byName.student_id)) return byName.student_id;
    }

    return null;
  };

  // Bind Reabrir Actividad
  container.querySelectorAll(".btn-reopen-student-act").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const actTitle = btn.getAttribute("data-activity-title");
      const actId = await getVerifiedActivityId(btn);
      const studentId = getVerifiedStudentId(btn);

      if (!actId) {
        alert(`Error: No se pudo obtener el identificador UUID de la actividad "${actTitle}".`);
        return;
      }
      if (!studentId) {
        alert(`Error: No se pudo obtener el identificador UUID del estudiante "${student.official_full_name}".`);
        return;
      }

      const confirmMsg = `Esta acción afecta solamente a este estudiante.\n\n¿Estás seguro de reabrir la actividad "${actTitle}" para ${student.official_full_name}?\n\nSe retirará el bloqueo de ejercicios para permitir una nueva entrega sin eliminar su historial.`;
      if (!confirm(confirmMsg)) return;

      const reason = prompt("Motivo de la reapertura (obligatorio para auditoría):", "Reapertura de plazo especial por el docente");
      if (reason === null) return;
      if (!reason.trim()) {
        alert("El motivo es obligatorio para el registro de auditoría.");
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = "⏳ Reabriendo...";
        await adminReopenStudentActivity(studentId, actId, reason.trim());
        alert(`✓ Actividad "${actTitle}" reabierta exitosamente para ${student.official_full_name}.`);
        closeModalFn();
        await loadAndRenderGradesMatrix();
      } catch (err) {
        alert("Error al reabrir actividad: " + err.message);
        btn.disabled = false;
        btn.innerHTML = `<span>🔓</span> Reabrir`;
      }
    });
  });

  // Bind Reiniciar Actividad
  container.querySelectorAll(".btn-reset-student-act").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const actTitle = btn.getAttribute("data-activity-title");
      const actId = await getVerifiedActivityId(btn);
      const studentId = getVerifiedStudentId(btn);

      if (!actId) {
        alert(`Error: No se pudo obtener el identificador UUID de la actividad "${actTitle}".`);
        return;
      }
      if (!studentId) {
        alert(`Error: No se pudo obtener el identificador UUID del estudiante "${student.official_full_name}".`);
        return;
      }

      const confirmMsg = `Esta acción afecta solamente a este estudiante.\n\n¿Estás seguro de reiniciar completamente la actividad "${actTitle}" para ${student.official_full_name}?\n\n⚠️ ADVERTENCIA: Se eliminarán todos los registros de intentos y comprobaciones de este estudiante en esta actividad para permitirle comenzar desde cero.`;
      if (!confirm(confirmMsg)) return;

      const reason = prompt("Motivo del reinicio (obligatorio para auditoría):", "Reinicio administrativo por solicitud justificada");
      if (reason === null) return;
      if (!reason.trim()) {
        alert("El motivo es obligatorio para el registro de auditoría.");
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = "⏳ Reiniciando...";
        await adminResetStudentActivity(studentId, actId, reason.trim());
        alert(`✓ Actividad "${actTitle}" reiniciada exitosamente para ${student.official_full_name}.`);
        closeModalFn();
        await loadAndRenderGradesMatrix();
      } catch (err) {
        alert("Error al reiniciar actividad: " + err.message);
        btn.disabled = false;
        btn.innerHTML = `<span>🔄</span> Reiniciar`;
      }
    });
  });
}

/* ==========================================================================
   SUB-VISTA 2: GESTIONAR ACTIVIDADES (VISTA ACTUAL INTACTA)
   ========================================================================== */

async function renderManageActivitiesSubView() {
  const root = document.getElementById("act-subview-root");
  if (!root) return;

  root.innerHTML = `
    <div class="space-y-6">
      <!-- Filtros -->
      <div class="bg-white p-4 rounded-3xl border border-neutral-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label class="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Tipo</label>
          <select id="filter-type" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none">
            <option value="all">Todos los tipos</option>
            <option value="gamification">🎮 Gamificación</option>
            <option value="classwork">📝 Trabajo en clase</option>
          </select>
        </div>

        <div>
          <label class="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Unidad</label>
          <select id="filter-unit" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none">
            <option value="all">Todas las unidades</option>
            <option value="5">Unidad 5</option>
            <option value="6">Unidad 6</option>
          </select>
        </div>

        <div>
          <label class="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Estado</label>
          <select id="filter-status" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none">
            <option value="all">Todos los estados</option>
            <option value="active">Solo activas</option>
            <option value="inactive">Solo inactivas</option>
          </select>
        </div>

        <div>
          <label class="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Buscar</label>
          <input id="filter-search" type="text" placeholder="Clave o título..." class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none">
        </div>
      </div>

      <!-- Tabla de Actividades -->
      <div class="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-neutral-600">
            <thead class="bg-neutral-50 border-b border-neutral-200/80 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th class="p-4">Actividad</th>
                <th class="p-4">Tipo</th>
                <th class="p-4">Curso / Periodo</th>
                <th class="p-4">Apertura / Cierre</th>
                <th class="p-4">Estadísticas</th>
                <th class="p-4">Estado</th>
                <th class="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="activities-table-body" class="divide-y divide-neutral-100">
              <tr>
                <td colspan="7" class="p-8 text-center text-neutral-400">Cargando actividades...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  try {
    academicYears = await fetchAcademicYears();
    classSections = await fetchClassSections();
    await loadActivities();
  } catch (err) {
    console.error("Error inicializando gestión de actividades:", err);
  }

  document.getElementById("filter-type")?.addEventListener("change", applyFilters);
  document.getElementById("filter-unit")?.addEventListener("change", applyFilters);
  document.getElementById("filter-status")?.addEventListener("change", applyFilters);
  document.getElementById("filter-search")?.addEventListener("input", applyFilters);
}

async function loadActivities() {
  const tbody = document.getElementById("activities-table-body");
  try {
    currentActivities = await fetchActivitiesAdminList();
    applyFilters();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-500 font-semibold">Error al cargar actividades: ${err.message}</td></tr>`;
    }
  }
}

function applyFilters() {
  const typeVal = document.getElementById("filter-type")?.value || "all";
  const unitVal = document.getElementById("filter-unit")?.value || "all";
  const statusVal = document.getElementById("filter-status")?.value || "all";
  const searchVal = (document.getElementById("filter-search")?.value || "").toLowerCase().trim();

  let filtered = [...currentActivities];

  if (typeVal !== "all") {
    filtered = filtered.filter(a => a.activity_type === typeVal);
  }
  if (unitVal !== "all") {
    filtered = filtered.filter(a => a.unit_number === parseInt(unitVal, 10));
  }
  if (statusVal !== "all") {
    filtered = filtered.filter(a => statusVal === "active" ? a.is_active : !a.is_active);
  }
  if (searchVal) {
    filtered = filtered.filter(a =>
      a.activity_key.toLowerCase().includes(searchVal) ||
      a.title.toLowerCase().includes(searchVal)
    );
  }

  renderActivitiesTable(filtered);
}

function renderActivitiesTable(list) {
  const tbody = document.getElementById("activities-table-body");
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-neutral-400">
          No hay actividades registradas para esta vista. Haz clic en "Nueva Actividad" para registrar la primera.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((a) => {
    const typeBadge = a.activity_type === "gamification"
      ? `<span class="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">🎮 Gamificación</span>`
      : `<span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">📝 Trabajo en clase</span>`;

    const statusBadge = a.is_active
      ? `<span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">Activa</span>`
      : `<span class="px-2.5 py-1 rounded-full bg-neutral-200 text-neutral-600 font-bold text-[10px]">Inactiva</span>`;

    const opensStr = a.opens_at ? formatDateSpanish(a.opens_at) : "Inmediata";
    const dueStr = a.due_at ? formatDateSpanish(a.due_at) : "Sin plazo de cierre";

    return `
      <tr class="hover:bg-neutral-50/80 transition-colors">
        <td class="p-4">
          <div class="font-bold text-neutral-800">${escapeHTML(a.title)}</div>
          <div class="text-[10px] font-mono text-neutral-400 mt-0.5">${escapeHTML(a.activity_key)} | U${a.unit_number} (Ord: ${a.display_order})</div>
        </td>
        <td class="p-4">${typeBadge}</td>
        <td class="p-4">
          <div class="font-semibold text-neutral-700">${escapeHTML(a.section_name)}</div>
          <div class="text-[10px] text-neutral-400">${escapeHTML(a.academic_term_name)}</div>
        </td>
        <td class="p-4 text-[11px]">
          <div><span class="text-neutral-400">Abre:</span> ${opensStr}</div>
          <div><span class="text-neutral-400">Cierra:</span> ${dueStr}</div>
        </td>
        <td class="p-4 text-[11px]">
          <div class="font-semibold text-neutral-700">${a.completed_count} entregadas / ${a.not_submitted_count} vencidas</div>
          <div class="text-[10px] text-neutral-400">${a.attempts_count} intentos totales</div>
        </td>
        <td class="p-4">${statusBadge}</td>
        <td class="p-4 text-right space-x-2">
          <button data-id="${a.id}" class="btn-edit-act px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-[11px] transition-all">
            ✏️ Editar
          </button>
          <button data-id="${a.id}" data-active="${a.is_active}" class="btn-toggle-act px-2.5 py-1.5 rounded-xl ${a.is_active ? "bg-amber-100 hover:bg-amber-200 text-amber-800" : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"} font-bold text-[11px] transition-all">
            ${a.is_active ? "⏸️ Desactivar" : "▶️ Activar"}
          </button>
          <button data-id="${a.id}" class="btn-reopen-act px-2.5 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-[11px] transition-all">
            🔄 Reabrir
          </button>
        </td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll(".btn-edit-act").forEach(b => {
    b.addEventListener("click", () => openActivityModal(b.getAttribute("data-id")));
  });

  document.querySelectorAll(".btn-toggle-act").forEach(b => {
    b.addEventListener("click", async () => {
      const id = b.getAttribute("data-id");
      const currentActive = b.getAttribute("data-active") === "true";
      try {
        await setActivityActive(id, !currentActive);
        await loadActivities();
      } catch (err) {
        alert("Error al cambiar estado de la actividad: " + err.message);
      }
    });
  });

  document.querySelectorAll(".btn-reopen-act").forEach(b => {
    b.addEventListener("click", () => openReopenModal(b.getAttribute("data-id")));
  });
}

async function openActivityModal(activityId) {
  const container = document.getElementById("modal-container");
  let actDetail = null;

  if (activityId) {
    try {
      actDetail = await fetchActivityAdminDetail(activityId);
    } catch (err) {
      return alert("Error al cargar detalle de actividad: " + err.message);
    }
  }

  const activeYear = academicYears.find(y => y.is_active) || academicYears[0];
  const defaultTerm = activeYear?.academic_terms?.find(t => t.term_number === 2) || activeYear?.academic_terms?.[0];
  const defaultSection = classSections.find(s => s.academic_year_id === activeYear?.id) || classSections[0];

  const answersObj = actDetail?.grading_config?.answers || { q1: "A" };
  const answerEntries = Object.entries(answersObj);

  container.innerHTML = `
    <div class="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-6 bg-neutral-50 border-b border-neutral-200 flex justify-between items-center">
          <div>
            <h3 class="heading-font text-lg font-bold text-moodle-text-blue">${actDetail ? "Editar Actividad" : "Nueva Actividad (Unidad 5+)"}</h3>
            <p class="text-xs text-neutral-500 mt-0.5">Configura la metadata pública y la pauta de evaluación privada.</p>
          </div>
          <button id="btn-close-act-modal" class="text-neutral-400 hover:text-neutral-600 font-bold text-xl">✕</button>
        </div>

        <form id="form-act-modal" class="p-6 space-y-4 overflow-y-auto flex-1">
          ${actDetail?.has_history ? `
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
              <span>⚠️</span>
              <span>Esta actividad posee entregas registradas. Los campos estructurales clave (clave, tipo, curso, unidad, notas) se encuentran bloqueados para proteger el historial académico.</span>
            </div>
          ` : ""}

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">Clave Única (activity_key) *</label>
              <input type="text" id="act-key" required placeholder="ej: u5-gam-01" ${actDetail?.has_history ? "disabled" : ""} value="${actDetail?.activity_key || ""}" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono focus:ring-2 focus:ring-moodle-blue outline-none disabled:bg-neutral-100">
            </div>

            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">Título de la Actividad *</label>
              <input type="text" id="act-title" required placeholder="ej: Actividad 01: Gamificación de Derivadas" value="${actDetail?.title || ""}" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">Tipo de Actividad *</label>
              <select id="act-type" ${actDetail?.has_history ? "disabled" : ""} class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none disabled:bg-neutral-100">
                <option value="gamification" ${actDetail?.activity_type === "gamification" ? "selected" : ""}>🎮 Gamificación</option>
                <option value="classwork" ${actDetail?.activity_type === "classwork" ? "selected" : ""}>📝 Trabajo en clase</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">Curso / Sección *</label>
              <select id="act-section" ${actDetail?.has_history ? "disabled" : ""} class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none disabled:bg-neutral-100">
                ${classSections.map(s => `
                  <option value="${s.id}" ${actDetail?.class_section_id === s.id || (!actDetail && s.id === defaultSection?.id) ? "selected" : ""}>
                    ${s.grade_number}.º ${s.education_level || "BGU"} ${s.parallel} (${s.academic_years?.name || "Año Activo"})
                  </option>
                `).join("")}
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">Periodo Académico *</label>
              <select id="act-term" ${actDetail?.has_history ? "disabled" : ""} class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none disabled:bg-neutral-100">
                ${(activeYear?.academic_terms || []).map(t => `
                  <option value="${t.id}" ${actDetail?.academic_term_id === t.id || (!actDetail && t.id === defaultTerm?.id) ? "selected" : ""}>
                    ${t.term_number}.º Trimestre (${t.name})
                  </option>
                `).join("")}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">Unidad *</label>
              <input type="number" id="act-unit" min="5" required ${actDetail?.has_history ? "disabled" : ""} value="${actDetail?.unit_number || 5}" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none disabled:bg-neutral-100">
            </div>

            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">Orden *</label>
              <input type="number" id="act-order" min="1" required value="${actDetail?.display_order || 1}" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">Nota Máxima *</label>
              <input type="number" step="0.5" id="act-max-score" min="1" max="10" required ${actDetail?.has_history ? "disabled" : ""} value="${actDetail?.max_score || 10}" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none disabled:bg-neutral-100">
            </div>

            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">Nota Mínima *</label>
              <input type="number" step="0.5" id="act-min-score" min="0.1" max="10" required ${actDetail?.has_history ? "disabled" : ""} value="${actDetail?.minimum_score || 1}" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none disabled:bg-neutral-100">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-neutral-700 mb-1">Ruta Relativa del Módulo (source_path)</label>
            <input type="text" id="act-source-path" placeholder="ej: topics/introduccion-derivadas/gamificacion.html" value="${actDetail?.source_path || ""}" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono focus:ring-2 focus:ring-moodle-blue outline-none">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">Fecha / Hora de Apertura (opens_at)</label>
              <input type="datetime-local" id="act-opens-at" value="${formatDatetimeLocal(actDetail?.opens_at)}" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none">
            </div>

            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">Fecha / Hora de Cierre (due_at)</label>
              <input type="datetime-local" id="act-due-at" value="${formatDatetimeLocal(actDetail?.due_at)}" class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none">
            </div>
          </div>

          <!-- Pauta de Respuestas Privada -->
          <div class="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                  <span>🔒</span> Configuración Privada de Calificación (auto_mcq)
                </h4>
                <p class="text-[10px] text-purple-700 mt-0.5">La pauta de respuestas se evalúa únicamente en servidor y nunca se expone al estudiante.</p>
              </div>
              <button type="button" id="btn-add-answer-row" class="px-2.5 py-1 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-[10px] transition-all">
                + Añadir Pregunta
              </button>
            </div>

            <div id="answers-container" class="space-y-2 max-h-40 overflow-y-auto pr-1">
              ${answerEntries.map(([qId, ansVal]) => `
                <div class="flex items-center gap-2 answer-row">
                  <input type="text" placeholder="ID Pregunta (ej: q1)" value="${qId}" class="ans-qid w-1/2 px-2.5 py-1.5 rounded-lg border border-purple-200 text-xs font-mono">
                  <input type="text" placeholder="Respuesta Correcta (ej: B)" value="${ansVal}" class="ans-val w-1/2 px-2.5 py-1.5 rounded-lg border border-purple-200 text-xs font-mono">
                  <button type="button" class="btn-del-ans text-purple-400 hover:text-purple-700 font-bold px-1 text-sm">✕</button>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="pt-4 border-t border-neutral-200 flex justify-end gap-3">
            <button type="button" id="btn-cancel-act-modal" class="px-5 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-xs hover:bg-neutral-100 transition-all">
              Cancelar
            </button>
            <button type="submit" class="px-6 py-2.5 rounded-xl bg-moodle-blue hover:bg-moodle-blue/90 text-white font-bold text-xs shadow-md transition-all">
              ${actDetail ? "Guardar Cambios" : "Crear Actividad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById("btn-close-act-modal")?.addEventListener("click", closeModal);
  document.getElementById("btn-cancel-act-modal")?.addEventListener("click", closeModal);

  document.getElementById("btn-add-answer-row")?.addEventListener("click", () => {
    const answersContainer = document.getElementById("answers-container");
    if (!answersContainer) return;
    const count = answersContainer.querySelectorAll(".answer-row").length + 1;
    const div = document.createElement("div");
    div.className = "flex items-center gap-2 answer-row";
    div.innerHTML = `
      <input type="text" placeholder="ID Pregunta (ej: q${count})" value="q${count}" class="ans-qid w-1/2 px-2.5 py-1.5 rounded-lg border border-purple-200 text-xs font-mono">
      <input type="text" placeholder="Respuesta Correcta (ej: A)" value="A" class="ans-val w-1/2 px-2.5 py-1.5 rounded-lg border border-purple-200 text-xs font-mono">
      <button type="button" class="btn-del-ans text-purple-400 hover:text-purple-700 font-bold px-1 text-sm">✕</button>
    `;
    answersContainer.appendChild(div);
    div.querySelector(".btn-del-ans")?.addEventListener("click", () => div.remove());
  });

  document.querySelectorAll(".btn-del-ans").forEach(b => {
    b.addEventListener("click", (e) => e.target.closest(".answer-row")?.remove());
  });

  document.getElementById("form-act-modal")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = document.getElementById("act-key").value.trim();
    const title = document.getElementById("act-title").value.trim();
    const type = document.getElementById("act-type").value;
    const sectionId = document.getElementById("act-section").value;
    const termId = document.getElementById("act-term").value;
    const unit = parseInt(document.getElementById("act-unit").value, 10);
    const order = parseInt(document.getElementById("act-order").value, 10);
    const maxScore = parseFloat(document.getElementById("act-max-score").value);
    const minScore = parseFloat(document.getElementById("act-min-score").value);
    const sourcePath = document.getElementById("act-source-path").value.trim();
    const opensAtVal = document.getElementById("act-opens-at").value;
    const dueAtVal = document.getElementById("act-due-at").value;

    const answersObj = {};
    document.querySelectorAll(".answer-row").forEach(row => {
      const qid = row.querySelector(".ans-qid")?.value.trim();
      const val = row.querySelector(".ans-val")?.value.trim();
      if (qid && val) {
        answersObj[qid] = val;
      }
    });

    if (Object.keys(answersObj).length === 0) {
      return alert("Se requiere configurar al menos 1 pregunta en la pauta de evaluación privada.");
    }

    const payload = {
      id: actDetail?.id || null,
      activity_key: key,
      title: title,
      activity_type: type,
      class_section_id: sectionId,
      academic_term_id: termId,
      unit_number: unit,
      display_order: order,
      max_score: maxScore,
      minimum_score: minScore,
      source_path: sourcePath || null,
      is_active: actDetail ? actDetail.is_active : true,
      opens_at: opensAtVal ? new Date(opensAtVal).toISOString() : null,
      due_at: dueAtVal ? new Date(dueAtVal).toISOString() : null,
      grader_type: "auto_mcq",
      grading_config: { answers: answersObj }
    };

    try {
      await upsertActivity(payload);
      closeModal();
      await loadActivities();
    } catch (err) {
      alert("Error al guardar la actividad: " + err.message);
    }
  });
}

function openReopenModal(activityId) {
  const container = document.getElementById("modal-container");
  const act = currentActivities.find(a => a.id === activityId);
  if (!act) return;

  container.innerHTML = `
    <div class="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden">
        <div class="p-6 bg-blue-50 border-b border-blue-100">
          <h3 class="heading-font text-lg font-bold text-blue-900">Reabrir Plazo de Actividad</h3>
          <p class="text-xs text-blue-700 mt-0.5">${escapeHTML(act.title)} (${escapeHTML(act.activity_key)})</p>
        </div>

        <form id="form-reopen-modal" class="p-6 space-y-4">
          <div class="p-3 bg-blue-50/50 border border-blue-200/80 rounded-2xl text-xs text-blue-900">
            <span>ℹ️</span>
            <span>Los registros automáticos por no entrega de estudiantes que nunca realizaron la actividad serán retirados para permitirles entregar durante el nuevo plazo. Las entregas reales de estudiantes se conservarán intactas.</span>
          </div>

          <div>
            <label class="block text-xs font-bold text-neutral-700 mb-1">Nueva Fecha / Hora de Cierre (due_at) *</label>
            <input type="datetime-local" id="reopen-due-at" required class="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-moodle-blue outline-none">
          </div>

          <div class="pt-4 border-t border-neutral-200 flex justify-end gap-3">
            <button type="button" id="btn-cancel-reopen" class="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-xs hover:bg-neutral-100 transition-all">
              Cancelar
            </button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all">
              Reabrir Plazo
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById("btn-cancel-reopen")?.addEventListener("click", closeModal);
  document.getElementById("form-reopen-modal")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newDueVal = document.getElementById("reopen-due-at").value;
    if (!newDueVal) return alert("Selecciona la nueva fecha de cierre.");

    const newDueIso = new Date(newDueVal).toISOString();

    try {
      await reopenActivity(activityId, newDueIso);
      closeModal();
      await loadActivities();
      alert("El plazo de la actividad ha sido reabierto con éxito.");
    } catch (err) {
      alert("Error al reabrir la actividad: " + err.message);
    }
  });
}

function closeModal() {
  const container = document.getElementById("modal-container");
  if (container) container.innerHTML = "";
}

function formatDateSpanish(isoStr) {
  if (!isoStr) return "N/A";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDatetimeLocal(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
