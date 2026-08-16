// ═══════════════════════════════════════════════════════════════════════════
// Admin Academic Years & Sections Component — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import {
  fetchAcademicYears,
  createAcademicYear,
  setActiveAcademicYear,
  fetchClassSections,
  createClassSection
} from "../../core/admin-service.js";

export async function renderAdminAcademicYearsView(container) {
  container.innerHTML = `
    <div class="space-y-8 animate-fade-in">
      <!-- Módulo de Años Lectivos -->
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm">
          <div>
            <h2 class="heading-font text-2xl font-bold text-moodle-text-blue flex items-center gap-2">
              Años Lectivos y Periodos Académicos
            </h2>
            <p class="text-xs text-neutral-500 mt-0.5">Control de periodos escolares y trimestres asociados.</p>
          </div>

          <button id="btn-open-create-year-modal" class="px-5 py-3 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2">
            <span>➕</span> Crear Nuevo Año Lectivo
          </button>
        </div>

        <div id="years-list-container" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="col-span-2 flex justify-center py-8">
            <div class="w-8 h-8 border-4 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>

      <!-- Módulo de Cursos / Paralelos -->
      <div class="space-y-4 pt-4 border-t border-neutral-200">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm">
          <div>
            <h3 class="heading-font text-xl font-bold text-moodle-text-blue flex items-center gap-2">
              Cursos y Paralelos Institucionales
            </h3>
            <p class="text-xs text-neutral-500 mt-0.5">Definición de ofertas académicas por año (ej. 3.º BGU A).</p>
          </div>

          <button id="btn-open-create-section-modal" class="px-4 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2">
            <span>➕</span> Nueva Sección / Paralelo
          </button>
        </div>

        <div id="sections-list-container" class="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-sm">
          <div class="flex justify-center py-6">
            <div class="w-6 h-6 border-3 border-neutral-300 border-t-neutral-800 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadAndRenderYears();
  await loadAndRenderSections();

  document.getElementById("btn-open-create-year-modal")?.addEventListener("click", () => openCreateYearModal(loadAndRenderYears));
  document.getElementById("btn-open-create-section-modal")?.addEventListener("click", () => openCreateSectionModal(loadAndRenderSections));
}

async function loadAndRenderYears() {
  const container = document.getElementById("years-list-container");
  if (!container) return;

  try {
    const years = await fetchAcademicYears();

    if (years.length === 0) {
      container.innerHTML = `<div class="col-span-2 p-8 text-center text-xs font-bold text-neutral-500">No hay años lectivos registrados.</div>`;
      return;
    }

    container.innerHTML = years
      .map((y) => {
        const termsHtml = (y.academic_terms || [])
          .sort((a, b) => a.term_order - b.term_order)
          .map((t) => `<span class="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 font-bold text-[10px]">${t.name}</span>`)
          .join(" ");

        return `
          <div class="bg-white rounded-3xl p-6 border ${y.is_active ? "border-purple-600 ring-2 ring-purple-600/20" : "border-neutral-200/80"} shadow-sm space-y-4 flex flex-col justify-between">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="heading-font text-2xl font-extrabold text-moodle-text-blue">${y.name}</span>
                ${
                  y.is_active
                    ? `<span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200">
                         ● Año Activo Vigente
                       </span>`
                    : `<button data-year-id="${y.id}" class="btn-set-active-year px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition-colors">
                         Establecer como Activo
                       </button>`
                }
              </div>

              <div class="space-y-1">
                <span class="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Trimestres Configurados:</span>
                <div class="flex flex-wrap gap-1.5 pt-1">
                  ${termsHtml || `<span class="text-xs text-neutral-400 italic">Sin trimestres</span>`}
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-neutral-100 text-[10px] text-neutral-400 flex items-center justify-between">
              <span>Fecha de Registro: ${new Date(y.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        `;
      })
      .join("");

    container.querySelectorAll(".btn-set-active-year").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-year-id");
        if (id && confirm("¿Deseas activar este año lectivo? Los demás años pasarán a estado inactivo.")) {
          try {
            await setActiveAcademicYear(id);
            await loadAndRenderYears();
          } catch (err) {
            alert("Error al activar año lectivo: " + err.message);
          }
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="col-span-2 p-6 text-center text-xs text-red-600 font-bold">Error cargando años lectivos: ${err.message}</div>`;
  }
}

async function loadAndRenderSections() {
  const container = document.getElementById("sections-list-container");
  if (!container) return;

  try {
    const sections = await fetchClassSections();

    if (sections.length === 0) {
      container.innerHTML = `<p class="text-center text-xs font-bold text-neutral-500">No hay secciones de curso registradas.</p>`;
      return;
    }

    const cardsHtml = sections
      .map(
        (s) => `
        <div class="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
          <div>
            <span class="heading-font text-base font-bold text-moodle-text-blue">${s.grade_number}.º ${s.education_level || "BGU"} — Paralelo ${s.parallel}</span>
            <p class="text-xs text-neutral-500">Año Lectivo: ${s.academic_years?.name || "Sin año"}</p>
          </div>
          <span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">Sección Activa</span>
        </div>
      `
      )
      .join("");

    container.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${cardsHtml}</div>`;
  } catch (err) {
    container.innerHTML = `<p class="text-center text-xs text-red-600 font-bold">Error cargando secciones: ${err.message}</p>`;
  }
}

async function openCreateYearModal(onSuccess) {
  const backdrop = document.createElement("div");
  backdrop.className = "fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto";

  backdrop.innerHTML = `
    <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-neutral-200 animate-scale-up">
      <div class="p-6 bg-purple-700 text-white flex items-center justify-between">
        <h3 class="heading-font text-lg font-bold">Crear Nuevo Año Lectivo</h3>
        <button id="btn-close-year-modal" class="text-white/80 hover:text-white text-xl">✕</button>
      </div>

      <form id="form-create-year" class="p-6 space-y-4 text-xs">
        <div>
          <label class="block font-bold text-neutral-700 uppercase tracking-wide mb-1">Nombre del Año Lectivo *</label>
          <input type="text" id="year-name-input" placeholder="Ej. 2027-2028" required class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-moodle-text-blue font-bold focus:outline-none focus:border-purple-600" />
          <span class="text-[10px] text-neutral-500 mt-1 block">Formato requerido: YYYY-YYYY</span>
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer font-bold text-neutral-800">
            <input type="checkbox" id="chk-set-active-year" class="w-4 h-4 text-purple-700 rounded focus:ring-purple-600" />
            <span>Establecer como año lectivo activo</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer font-bold text-neutral-800">
            <input type="checkbox" id="chk-create-terms" checked class="w-4 h-4 text-purple-700 rounded focus:ring-purple-600" />
            <span>Crear automáticamente 3 trimestres</span>
          </label>
        </div>

        <div id="year-error-box" class="hidden p-3 bg-red-50 text-red-700 font-bold text-center rounded-xl"></div>

        <div class="pt-3 border-t border-neutral-100 flex gap-3 justify-end">
          <button type="button" id="btn-cancel-year" class="px-5 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 font-bold">Cancelar</button>
          <button type="submit" class="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-md">Guardar Año Lectivo</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();

  backdrop.querySelector("#btn-close-year-modal")?.addEventListener("click", close);
  backdrop.querySelector("#btn-cancel-year")?.addEventListener("click", close);

  backdrop.querySelector("#form-create-year")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = backdrop.querySelector("#year-name-input")?.value.trim();
    const setActive = backdrop.querySelector("#chk-set-active-year")?.checked;
    const createTerms = backdrop.querySelector("#chk-create-terms")?.checked;

    try {
      await createAcademicYear(name, setActive, createTerms);
      close();
      if (onSuccess) await onSuccess();
    } catch (err) {
      const errBox = backdrop.querySelector("#year-error-box");
      if (errBox) {
        errBox.textContent = err.message;
        errBox.classList.remove("hidden");
      }
    }
  });
}

async function openCreateSectionModal(onSuccess) {
  const backdrop = document.createElement("div");
  backdrop.className = "fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto";

  let years = [];
  try {
    years = await fetchAcademicYears();
  } catch (e) {}

  const yearOptsHtml = years.map((y) => `<option value="${y.id}">${y.name} ${y.is_active ? "(Activo)" : ""}</option>`).join("");

  backdrop.innerHTML = `
    <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-neutral-200 animate-scale-up">
      <div class="p-6 bg-neutral-800 text-white flex items-center justify-between">
        <h3 class="heading-font text-lg font-bold">Nueva Sección / Paralelo</h3>
        <button id="btn-close-sec-modal" class="text-white/80 hover:text-white text-xl">✕</button>
      </div>

      <form id="form-create-section" class="p-6 space-y-4 text-xs">
        <div>
          <label class="block font-bold text-neutral-700 uppercase tracking-wide mb-1">Año Lectivo *</label>
          <select id="sec-year-id" required class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-3 text-xs text-moodle-text-blue">
            ${yearOptsHtml}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block font-bold text-neutral-700 uppercase tracking-wide mb-1">Curso (1 a 3) *</label>
            <select id="sec-grade-number" required class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-3 text-xs text-moodle-text-blue font-bold">
              <option value="1">1.º (Primero)</option>
              <option value="2">2.º (Segundo)</option>
              <option value="3" selected>3.º (Tercero)</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-neutral-700 uppercase tracking-wide mb-1">Nivel *</label>
            <input type="text" id="sec-education-level" value="BGU" required class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-moodle-text-blue font-bold" />
          </div>
        </div>

        <div>
          <label class="block font-bold text-neutral-700 uppercase tracking-wide mb-1">Paralelo (Una Letra) *</label>
          <input type="text" id="sec-parallel-input" placeholder="Ej. A" maxlength="1" required class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-moodle-text-blue font-bold uppercase" />
        </div>

        <div id="sec-error-box" class="hidden p-3 bg-red-50 text-red-700 font-bold text-center rounded-xl"></div>

        <div class="pt-3 border-t border-neutral-100 flex gap-3 justify-end">
          <button type="button" id="btn-cancel-sec" class="px-5 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 font-bold">Cancelar</button>
          <button type="submit" class="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-900 text-white font-bold shadow-md">Guardar Sección</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();

  backdrop.querySelector("#btn-close-sec-modal")?.addEventListener("click", close);
  backdrop.querySelector("#btn-cancel-sec")?.addEventListener("click", close);

  backdrop.querySelector("#form-create-section")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const yearId = backdrop.querySelector("#sec-year-id")?.value;
    const gradeNum = parseInt(backdrop.querySelector("#sec-grade-number")?.value, 10);
    const level = backdrop.querySelector("#sec-education-level")?.value.trim() || "BGU";
    const parallel = backdrop.querySelector("#sec-parallel-input")?.value.trim().toUpperCase();

    try {
      await createClassSection(yearId, gradeNum, level, parallel);
      close();
      if (onSuccess) await onSuccess();
    } catch (err) {
      const errBox = backdrop.querySelector("#sec-error-box");
      if (errBox) {
        errBox.textContent = err.message;
        errBox.classList.remove("hidden");
      }
    }
  });
}
