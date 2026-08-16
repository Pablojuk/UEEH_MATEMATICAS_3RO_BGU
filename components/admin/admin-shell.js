// ═══════════════════════════════════════════════════════════════════════════
// Admin Shell Component — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import { renderView, bindClick } from "../../core/navigation.js";
import { renderAdminDashboardView } from "./admin-dashboard.js";
import { renderAdminStudentsView } from "./admin-students.js";
import { renderAdminEnrollmentsView } from "./admin-enrollments.js?v=20260816_1";
import { renderAdminAcademicYearsView } from "./admin-academic-years.js";
import { renderAdminActivitiesView } from "./admin-activities.js?v=20260816_1";
import { renderAdminAuditView } from "./admin-audit.js";
import { renderAdminExportsView } from "./admin-exports.js?v=20260816_1";

const LOGO_URL = "./assets/img/logo-ueeh.png";

let currentTab = "dashboard";

/**
 * Renderiza el contenedor principal del Panel de Administración con pestañas navegables.
 */
export function renderAdminShell(initialTab = "dashboard") {
  currentTab = initialTab;

  const tabs = [
    { id: "dashboard", label: "Resumen", icon: "📊" },
    { id: "students", label: "Estudiantes", icon: "👥" },
    { id: "enrollments", label: "Matrículas", icon: "📋" },
    { id: "activities", label: "Actividades", icon: "📝" },
    { id: "years", label: "Años Lectivos", icon: "📅" },
    { id: "audit", label: "Auditoría", icon: "🛡️" },
    { id: "exports", label: "Exportar", icon: "📥" }
  ];

  const navTabsHtml = tabs
    .map(
      (t) => `
      <button id="tab-btn-${t.id}"
              class="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                currentTab === t.id
                  ? "bg-purple-700 text-white shadow-md"
                  : "bg-white/80 hover:bg-white text-neutral-700 hover:text-purple-900 border border-neutral-200/80"
              }">
        <span>${t.icon}</span>
        <span>${t.label}</span>
      </button>
    `
    )
    .join("");

  renderView(`
    <div class="min-h-screen bg-neutral-100/90 flex flex-col selection:bg-purple-200">
      <!-- Header Superior Admin -->
      <header class="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white border-b border-purple-800/50 shadow-lg sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div class="flex items-center gap-3.5">
            <img src="${LOGO_URL}" alt="UEEH Logo" class="w-10 h-10 object-contain rounded-xl bg-white/10 p-1 border border-white/20 shadow-inner">
            <div>
              <h1 class="heading-font text-base sm:text-lg font-bold tracking-tight text-purple-100">Panel de Administración Institucional</h1>
              <p class="text-[11px] text-purple-300 font-medium">Unidad Educativa Emilio Isaías H. — Matemáticas 3.º BGU</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button id="btn-admin-back-campus" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-purple-100 border border-white/20 font-bold text-xs transition-all flex items-center gap-2 shadow-sm">
              <span>🔙</span> Volver al Campus
            </button>
          </div>
        </div>
      </header>

      <!-- Barra de Navegación por Pestañas -->
      <div class="bg-white/60 backdrop-blur-md border-b border-neutral-200/80 shadow-xs sticky top-[65px] z-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          ${navTabsHtml}
        </div>
      </div>

      <!-- Contenido Principal Dinámico -->
      <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <div id="admin-content-root"></div>
      </main>

      <footer class="bg-white border-t border-neutral-200 py-4 text-center text-xs text-neutral-500">
        Plataforma UEEH 3.º BGU — Módulo de Gestión Administrativa Segura
      </footer>
    </div>
  `);

  bindAdminShellEvents(tabs);
  loadTabContent(currentTab);
}

function bindAdminShellEvents(tabs) {
  bindClick("#btn-admin-back-campus", () => {
    sessionStorage.setItem("ueeh_active_view", "campus");
    if (window.onReturnToCampus) {
      window.onReturnToCampus();
    }
  });

  tabs.forEach((t) => {
    bindClick(`#tab-btn-${t.id}`, () => {
      renderAdminShell(t.id);
    });
  });
}

function loadTabContent(tabId) {
  const root = document.getElementById("admin-content-root");
  if (!root) return;

  switch (tabId) {
    case "dashboard":
      renderAdminDashboardView(root);
      break;
    case "students":
      renderAdminStudentsView(root);
      break;
    case "enrollments":
      renderAdminEnrollmentsView(root);
      break;
    case "activities":
      renderAdminActivitiesView(root);
      break;
    case "years":
      renderAdminAcademicYearsView(root);
      break;
    case "audit":
      renderAdminAuditView(root);
      break;
    case "exports":
      renderAdminExportsView(root);
      break;
    default:
      renderAdminDashboardView(root);
      break;
  }
}
