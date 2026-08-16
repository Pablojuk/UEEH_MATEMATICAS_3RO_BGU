// ═══════════════════════════════════════════════════════════════════════════
// Admin Dashboard View Component — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import { fetchAdminDashboardStats } from "../../core/admin-service.js";

export async function renderAdminDashboardView(container) {
  try {
    const stats = await fetchAdminDashboardStats();

    container.innerHTML = `
      <div class="space-y-8 animate-fade-in">
        <!-- Banner Superior Año Activo -->
        <div class="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div class="space-y-2 z-10">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-bold backdrop-blur-md">
              <span>📅</span> Año Lectivo Vigente
            </span>
            <h2 class="hero-font text-3xl sm:text-4xl font-bold tracking-tight">
              ${stats.activeYear}
            </h2>
            <p class="text-xs sm:text-sm text-purple-200/80 max-w-xl leading-relaxed">
              Gestión unificada de matrículas, cuentas de Google de estudiantes y códigos de activación para 3.º BGU.
            </p>
          </div>

          <div class="flex items-center gap-3 z-10">
            <button id="btn-dash-new-student" class="px-5 py-3 rounded-2xl bg-moodle-orange hover:bg-moodle-orange/90 text-white font-bold text-sm shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-2">
              <span>➕</span> Nuevo Estudiante
            </button>
          </div>
        </div>

        <!-- Tarjetas de Métricas Principales (KPIs) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div class="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider">Estudiantes</span>
              <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">👥</div>
            </div>
            <div>
              <div class="text-3xl font-extrabold text-moodle-text-blue">${stats.totalStudents}</div>
              <p class="text-xs text-neutral-500 mt-1">Registrados en el sistema</p>
            </div>
          </div>

          <div class="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider">Vinculados</span>
              <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">✅</div>
            </div>
            <div>
              <div class="text-3xl font-extrabold text-emerald-600">${stats.linkedStudents}</div>
              <p class="text-xs text-neutral-500 mt-1">Cuentas Google asociadas</p>
            </div>
          </div>

          <div class="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider">Pendientes</span>
              <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">⏳</div>
            </div>
            <div>
              <div class="text-3xl font-extrabold text-amber-600">${stats.pendingStudents}</div>
              <p class="text-xs text-neutral-500 mt-1">Sin vincular aún</p>
            </div>
          </div>

          <div class="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-neutral-500 uppercase tracking-wider">Códigos Activos</span>
              <div class="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">🔑</div>
            </div>
            <div>
              <div class="text-3xl font-extrabold text-purple-700">${stats.activeCodes}</div>
              <p class="text-xs text-neutral-500 mt-1">Listos para canjear</p>
            </div>
          </div>
        </div>

        <!-- Secciones Rápidas de Administración -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-lg">🎓</div>
              <div>
                <h3 class="heading-font text-lg font-bold text-moodle-text-blue">Gestión de Alumnos</h3>
                <p class="text-xs text-neutral-500">Agrega estudiantes, genera códigos o restablece accesos.</p>
              </div>
            </div>
            <div class="pt-2 border-t border-neutral-100 flex justify-end">
              <button id="btn-dash-go-students" class="text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors flex items-center gap-1">
                Ver lista completa →
              </button>
            </div>
          </div>

          <div class="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg">📋</div>
              <div>
                <h3 class="heading-font text-lg font-bold text-moodle-text-blue">Matrículas e Histórico</h3>
                <p class="text-xs text-neutral-500">Revisa la asignación de cursos y paralelos por periodo.</p>
              </div>
            </div>
            <div class="pt-2 border-t border-neutral-100 flex justify-end">
              <button id="btn-dash-go-enrollments" class="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors flex items-center gap-1">
                Ver matrículas →
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("btn-dash-new-student")?.addEventListener("click", () => {
      import("./admin-shell.js").then((m) => m.renderAdminShell("students"));
    });

    document.getElementById("btn-dash-go-students")?.addEventListener("click", () => {
      import("./admin-shell.js").then((m) => m.renderAdminShell("students"));
    });

    document.getElementById("btn-dash-go-enrollments")?.addEventListener("click", () => {
      import("./admin-shell.js").then((m) => m.renderAdminShell("enrollments"));
    });
  } catch (err) {
    container.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-3xl p-6 text-center space-y-2">
        <p class="text-sm font-bold text-red-700">Error al cargar información del panel</p>
        <p class="text-xs text-red-600">${err.message || err}</p>
      </div>
    `;
  }
}
