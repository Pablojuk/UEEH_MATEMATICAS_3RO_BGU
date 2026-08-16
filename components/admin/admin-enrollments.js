// ═══════════════════════════════════════════════════════════════════════════
// Admin Enrollments View Component — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import {
  fetchEnrollments,
  fetchStudents,
  fetchAcademicYears,
  fetchClassSections,
  createEnrollment
} from "../../core/admin-service.js";

function formatDateSpanish(dateStr) {
  if (!dateStr) return "Sin fecha";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Sin fecha";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function renderAdminEnrollmentsView(container) {
  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm">
        <div>
          <h2 class="heading-font text-2xl font-bold text-moodle-text-blue flex items-center gap-2">
            Gestión de Matrículas
          </h2>
          <p class="text-xs text-neutral-500 mt-0.5">Asignación académica de estudiantes a cursos y años lectivos.</p>
        </div>

        <button id="btn-open-create-enrollment-modal" class="px-5 py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2">
          <span>➕</span> Matricular Estudiante
        </button>
      </div>

      <div id="enrollments-list-container" class="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
        <div class="flex justify-center py-12">
          <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  `;

  await loadAndRenderEnrollments();

  document.getElementById("btn-open-create-enrollment-modal")?.addEventListener("click", () => openCreateEnrollmentModal(loadAndRenderEnrollments));
}

async function loadAndRenderEnrollments() {
  const container = document.getElementById("enrollments-list-container");
  if (!container) return;

  try {
    const list = await fetchEnrollments();

    if (list.length === 0) {
      container.innerHTML = `<div class="p-12 text-center text-xs font-bold text-neutral-500">No hay matrículas registradas.</div>`;
      return;
    }

    const rowsHtml = list
      .map((e) => {
        const studentName = e.students?.official_full_name || "N/A";
        const studentCode = e.students?.student_code || "N/A";
        const sec = e.class_sections;
        const yearName = sec?.academic_years?.name || "Sin año";
        const gradeStr = sec ? `${sec.grade_number}.º ${sec.education_level || "BGU"}` : "N/A";
        const parallel = sec?.parallel || "N/A";
        const formattedDate = formatDateSpanish(e.enrolled_at);

        return `
          <tr class="hover:bg-neutral-50/80 transition-colors border-b border-neutral-100 last:border-none text-xs">
            <td class="px-6 py-4 font-mono font-bold text-moodle-text-blue">${studentCode}</td>
            <td class="px-6 py-4 font-bold text-neutral-800">${studentName}</td>
            <td class="px-6 py-4 text-neutral-600">${gradeStr} Paralelo ${parallel}</td>
            <td class="px-6 py-4 text-neutral-600">${yearName}</td>
            <td class="px-6 py-4"><span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">Matriculado</span></td>
            <td class="px-6 py-4 text-right text-neutral-400 text-[10px]">${formattedDate}</td>
          </tr>
        `;
      })
      .join("");

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-neutral-50 border-b border-neutral-200 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
              <th class="px-6 py-3.5">Código Estudiante</th>
              <th class="px-6 py-3.5">Estudiante</th>
              <th class="px-6 py-3.5">Curso / Paralelo</th>
              <th class="px-6 py-3.5">Año Lectivo</th>
              <th class="px-6 py-3.5">Estado</th>
              <th class="px-6 py-3.5 text-right">Fecha Matrícula</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-center text-xs text-red-600 font-bold">Error cargando matrículas: ${err.message}</div>`;
  }
}

async function openCreateEnrollmentModal(onSuccess) {
  const backdrop = document.createElement("div");
  backdrop.className = "fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto";

  let students = [];
  let years = [];
  let sections = [];
  let existingEnrollments = [];

  try {
    const [stData, yrData, secData, enData] = await Promise.all([
      fetchStudents({ status: "active" }),
      fetchAcademicYears(),
      fetchClassSections(),
      fetchEnrollments()
    ]);
    students = stData || [];
    years = yrData || [];
    sections = secData || [];
    existingEnrollments = enData || [];
  } catch (err) {
    console.error("Error cargando datos para matrícula:", err);
  }

  const studentOptsHtml = students
    .map((s) => {
      const alreadyEnrolled = existingEnrollments.some((e) => e.students?.id === s.id && e.status !== "cancelled");
      const suffix = alreadyEnrolled ? " (Ya matriculado)" : "";
      return `<option value="${s.id}">${s.official_full_name} (${s.student_code})${suffix}</option>`;
    })
    .join("");

  const yearOptsHtml = years
    .map((y) => `<option value="${y.id}" ${y.is_active ? "selected" : ""}>${y.name} ${y.is_active ? "(Activo)" : ""}</option>`)
    .join("");

  const sectionOptsHtml = sections
    .map((s) => {
      const gStr = `${s.grade_number}.º ${s.education_level || "BGU"}`;
      return `<option value="${s.id}">${gStr} - Paralelo ${s.parallel}</option>`;
    })
    .join("");

  backdrop.innerHTML = `
    <div class="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8 border border-neutral-200 animate-scale-up">
      <div class="p-6 bg-blue-700 text-white flex items-center justify-between">
        <h3 class="heading-font text-lg font-bold">Matricular Estudiante Existente</h3>
        <button id="btn-close-enroll-modal" class="text-white/80 hover:text-white text-xl">✕</button>
      </div>

      <form id="form-create-enrollment" class="p-6 space-y-4 text-xs">
        <div>
          <label class="block font-bold text-neutral-700 uppercase tracking-wide mb-1">Seleccionar Estudiante *</label>
          <select id="enroll-student-id" required class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-3 text-xs text-moodle-text-blue">
            ${studentOptsHtml || `<option value="">Sin estudiantes activos disponibles</option>`}
          </select>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block font-bold text-neutral-700 uppercase tracking-wide mb-1">Año Lectivo *</label>
            <select id="enroll-year-id" required class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-3 text-xs text-moodle-text-blue">
              ${yearOptsHtml || `<option value="">Sin años registrados</option>`}
            </select>
          </div>

          <div>
            <label class="block font-bold text-neutral-700 uppercase tracking-wide mb-1">Curso y Paralelo *</label>
            <select id="enroll-section-id" required class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-3 text-xs text-moodle-text-blue">
              ${sectionOptsHtml || `<option value="">Sin secciones registradas</option>`}
            </select>
          </div>
        </div>

        <div id="enroll-warning-box" class="hidden p-3 bg-amber-50 text-amber-900 border border-amber-200 font-bold text-center rounded-xl text-xs space-y-0.5">
          <p>⚠️ El estudiante ya se encuentra matriculado en este curso y año lectivo.</p>
        </div>

        <div id="enroll-error-box" class="hidden p-3 bg-red-50 text-red-700 font-bold text-center rounded-xl text-xs"></div>

        <div class="pt-3 border-t border-neutral-100 flex gap-3 justify-end">
          <button type="button" id="btn-cancel-enroll" class="px-5 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 font-bold">Cancelar</button>
          <button type="submit" id="btn-submit-enroll" class="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold shadow-md transition-colors">Registrar Matrícula</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.querySelector("#btn-close-enroll-modal")?.addEventListener("click", close);
  backdrop.querySelector("#btn-cancel-enroll")?.addEventListener("click", close);

  const selectStudent = backdrop.querySelector("#enroll-student-id");
  const selectSection = backdrop.querySelector("#enroll-section-id");
  const warnBox = backdrop.querySelector("#enroll-warning-box");
  const submitBtn = backdrop.querySelector("#btn-submit-enroll");

  const updateDuplicateCheck = () => {
    const selectedStudentId = selectStudent?.value;
    const selectedSectionId = selectSection?.value;

    const isDuplicate = existingEnrollments.some(
      (e) => e.students?.id === selectedStudentId && e.class_sections?.id === selectedSectionId && e.status !== "cancelled"
    );

    if (isDuplicate) {
      warnBox?.classList.remove("hidden");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add("opacity-50", "cursor-not-allowed");
      }
    } else {
      warnBox?.classList.add("hidden");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
      }
    }
  };

  selectStudent?.addEventListener("change", updateDuplicateCheck);
  selectSection?.addEventListener("change", updateDuplicateCheck);
  updateDuplicateCheck();

  backdrop.querySelector("#form-create-enrollment")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentId = selectStudent?.value;
    const sectionId = selectSection?.value;

    try {
      await createEnrollment(studentId, sectionId);
      close();
      if (onSuccess) await onSuccess();
    } catch (err) {
      const errBox = backdrop.querySelector("#enroll-error-box");
      if (errBox) {
        errBox.textContent = err.message.includes("duplicate")
          ? "El estudiante ya cuenta con una matrícula registrada para esa sección."
          : "No se pudo completar el registro de matrícula.";
        errBox.classList.remove("hidden");
      }
    }
  });
}
