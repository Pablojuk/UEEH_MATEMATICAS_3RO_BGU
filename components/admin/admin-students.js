// ═══════════════════════════════════════════════════════════════════════════
// Admin Students View Component — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import {
  fetchStudents,
  fetchAcademicYears,
  fetchClassSections,
  createStudent
} from "../../core/admin-service.js";

import { openStudentDetailModal } from "./admin-student-detail.js?v=20260816_1";

let currentStudentsList = [];

export async function renderAdminStudentsView(container) {
  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <!-- Encabezado del Módulo y Acciones Primarias -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm">
        <div>
          <h2 class="heading-font text-2xl font-bold text-moodle-text-blue flex items-center gap-2">
            Gestión de Estudiantes
            <span id="students-counter-badge" class="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-sans font-bold">0</span>
          </h2>
          <p class="text-xs text-neutral-500 mt-0.5">Administración de expedientes, códigos de activación y vinculación Google.</p>
        </div>

        <button id="btn-open-create-student-modal" class="px-5 py-3 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2">
          <span>➕</span> Nuevo Estudiante
        </button>
      </div>

      <!-- Barra de Búsqueda y Filtros -->
      <div class="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="sm:col-span-2 relative">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">🔍</span>
          <input type="text" id="input-student-search" placeholder="Buscar por nombre oficial o código (ej. UEEH-STU-000001)…"
                 class="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-moodle-text-blue focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-colors" />
        </div>

        <div>
          <select id="select-filter-status" class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-moodle-text-blue focus:outline-none focus:border-purple-600">
            <option value="">Todos los Estados (Activos / Inactivos)</option>
            <option value="active" selected>Únicamente Activos</option>
            <option value="inactive">Únicamente Inactivos</option>
          </select>
        </div>
      </div>

      <!-- Tabla / Tarjetas de Estudiantes -->
      <div id="students-list-container" class="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
        <div class="flex justify-center py-12">
          <div class="w-8 h-8 border-4 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  `;

  await loadAndRenderStudentsList();

  document.getElementById("input-student-search")?.addEventListener("input", filterAndRenderLocal);
  document.getElementById("select-filter-status")?.addEventListener("change", loadAndRenderStudentsList);
  document.getElementById("btn-open-create-student-modal")?.addEventListener("click", () => openCreateStudentModal(loadAndRenderStudentsList));
}

async function loadAndRenderStudentsList() {
  const container = document.getElementById("students-list-container");
  const statusFilter = document.getElementById("select-filter-status")?.value;

  try {
    currentStudentsList = await fetchStudents({ status: statusFilter });
    filterAndRenderLocal();
  } catch (err) {
    if (container) {
      container.innerHTML = `<div class="p-6 text-center text-xs text-red-600 font-bold">Error cargando listado: ${err.message}</div>`;
    }
  }
}

function filterAndRenderLocal() {
  const container = document.getElementById("students-list-container");
  const counter = document.getElementById("students-counter-badge");
  const searchVal = (document.getElementById("input-student-search")?.value || "").toLowerCase().trim();

  if (!container) return;

  const filtered = currentStudentsList.filter((st) => {
    if (!searchVal) return true;
    return st.official_full_name.toLowerCase().includes(searchVal) || st.student_code.toLowerCase().includes(searchVal);
  });

  if (counter) counter.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center space-y-2">
        <div class="text-3xl">🔍</div>
        <p class="text-xs font-bold text-neutral-600">No se encontraron estudiantes que coincidan.</p>
      </div>
    `;
    return;
  }

  const rowsHtml = filtered
    .map((st) => {
      const statusBadge = st.status === "active"
        ? `<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">Activo</span>`
        : `<span class="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">Inactivo</span>`;

      let codeBadge = `<span class="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold">Sin código</span>`;
      if (st.is_linked) {
        codeBadge = `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">● Vinculado</span>`;
      } else if (st.code_status === "active") {
        codeBadge = `<span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">🔑 Código Activo</span>`;
      }

      return `
        <tr class="hover:bg-neutral-50/80 transition-colors border-b border-neutral-100 last:border-none text-xs">
          <td class="px-6 py-4 font-mono font-bold text-moodle-text-blue">${st.student_code}</td>
          <td class="px-6 py-4 font-bold text-neutral-800">${st.official_full_name}</td>
          <td class="px-6 py-4 text-neutral-600">${st.grade} ${st.parallel ? "Paralelo " + st.parallel : ""}</td>
          <td class="px-6 py-4 text-neutral-500">${st.year_name}</td>
          <td class="px-6 py-4">${statusBadge}</td>
          <td class="px-6 py-4">${codeBadge}</td>
          <td class="px-6 py-4 text-right">
            <button data-student-id="${st.id}" class="btn-detail-student px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-purple-800 font-bold transition-colors">
              Ver Ficha →
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
            <th class="px-6 py-3.5">Código</th>
            <th class="px-6 py-3.5">Nombre Oficial</th>
            <th class="px-6 py-3.5">Curso</th>
            <th class="px-6 py-3.5">Año Lectivo</th>
            <th class="px-6 py-3.5">Estado</th>
            <th class="px-6 py-3.5">Acceso Google</th>
            <th class="px-6 py-3.5 text-right">Acción</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll(".btn-detail-student").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-student-id");
      if (id) openStudentDetailModal(id, loadAndRenderStudentsList);
    });
  });
}

/**
 * Modal para registrar nuevo estudiante.
 */
async function openCreateStudentModal(onSuccess) {
  const backdrop = document.createElement("div");
  backdrop.className = "fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto";

  let years = [];
  let sections = [];
  try {
    years = await fetchAcademicYears();
    sections = await fetchClassSections();
  } catch (err) {
    console.error("Error cargando catálogos para formulario:", err);
  }

  const activeYear = years.find((y) => y.is_active) || years[0];

  const yearOptionsHtml = years
    .map((y) => `<option value="${y.id}" ${y.is_active ? "selected" : ""}>${y.name} ${y.is_active ? "(Activo)" : ""}</option>`)
    .join("");

  const sectionOptionsHtml = sections
    .map((s) => `<option value="${s.id}">${s.grade} - Paralelo ${s.parallel}</option>`)
    .join("");

  backdrop.innerHTML = `
    <div class="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8 border border-neutral-200 animate-scale-up">
      <div class="p-6 bg-purple-700 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">➕</div>
          <div>
            <h3 class="heading-font text-lg font-bold">Registrar Nuevo Estudiante</h3>
            <p class="text-xs text-purple-200">Plataforma Educativa 3.º BGU</p>
          </div>
        </div>
        <button id="btn-close-create-modal" class="text-white/80 hover:text-white text-xl">✕</button>
      </div>

      <form id="form-create-student" class="p-6 space-y-4 text-xs">
        <div>
          <label class="block font-bold text-neutral-700 uppercase tracking-wide mb-1">Nombre Completo Oficial *</label>
          <input type="text" id="create-full-name" required placeholder="Ej. MORALES ANDRADE LUIS ENRIQUE"
                 class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-moodle-text-blue focus:outline-none focus:border-purple-600" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block font-bold text-neutral-700 uppercase tracking-wide mb-1">Año Lectivo *</label>
            <select id="create-year-id" required class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-3 text-xs text-moodle-text-blue focus:outline-none focus:border-purple-600">
              ${yearOptionsHtml || `<option value="">Sin años lectivos registrados</option>`}
            </select>
          </div>

          <div>
            <label class="block font-bold text-neutral-700 uppercase tracking-wide mb-1">Curso y Paralelo *</label>
            <select id="create-section-id" required class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-3 text-xs text-moodle-text-blue focus:outline-none focus:border-purple-600">
              ${sectionOptionsHtml || `<option value="">Sin secciones registradas</option>`}
            </select>
          </div>
        </div>

        <div class="p-4 bg-purple-50/70 border border-purple-200/70 rounded-2xl space-y-2">
          <label class="flex items-center gap-2 cursor-pointer font-bold text-purple-900">
            <input type="checkbox" id="chk-auto-enroll" checked class="w-4 h-4 text-purple-700 rounded focus:ring-purple-600" />
            <span>Matricular inmediatamente en este periodo</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer font-bold text-purple-900">
            <input type="checkbox" id="chk-auto-code" checked class="w-4 h-4 text-purple-700 rounded focus:ring-purple-600" />
            <span>Generar código de activación de 1 solo uso</span>
          </label>
        </div>

        <div id="create-student-error" class="hidden p-3 bg-red-50 text-red-700 rounded-xl text-center font-bold"></div>

        <div class="pt-3 border-t border-neutral-100 flex gap-3 justify-end">
          <button type="button" id="btn-cancel-create" class="px-5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold transition-colors">
            Cancelar
          </button>
          <button type="submit" id="btn-submit-create" class="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold transition-colors shadow-md">
            Crear Estudiante
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.classList.add("overflow-hidden");

  const close = () => {
    document.body.classList.remove("overflow-hidden");
    backdrop.remove();
  };

  backdrop.querySelector("#btn-close-create-modal")?.addEventListener("click", close);
  backdrop.querySelector("#btn-cancel-create")?.addEventListener("click", close);

  const form = backdrop.querySelector("#form-create-student");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = backdrop.querySelector("#create-student-error");
    if (errorEl) errorEl.classList.add("hidden");

    const name = backdrop.querySelector("#create-full-name")?.value.trim();
    const sectionId = backdrop.querySelector("#create-section-id")?.value;
    const autoEnroll = backdrop.querySelector("#chk-auto-enroll")?.checked;
    const autoCode = backdrop.querySelector("#chk-auto-code")?.checked;

    if (!name) return;

    try {
      let res = await createStudent({
        official_full_name: name,
        class_section_id: sectionId,
        auto_enroll: autoEnroll,
        auto_generate_code: autoCode,
        confirm_homonym: false
      });

      if (res && res.requires_confirmation) {
        const proceed = confirm("Ya existe un estudiante registrado con el mismo nombre completo.\n\n¿Deseas continuar y registrarlo de todas formas?");
        if (!proceed) return;

        res = await createStudent({
          official_full_name: name,
          class_section_id: sectionId,
          auto_enroll: autoEnroll,
          auto_generate_code: autoCode,
          confirm_homonym: true
        });
      }

      close();

      if (res.raw_claim_code) {
        showRawCodeCreatedModal(res.official_full_name, res.raw_claim_code, onSuccess);
      } else {
        if (onSuccess) await onSuccess();
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || "Error al crear estudiante";
        errorEl.classList.remove("hidden");
      }
    }
  });
}
