import { renderView, bindClick } from "./navigation.js";
import { createSlideViewer } from "../components/slide-viewer.js";
import { crearHtmlLessonViewer } from "../components/html-lesson-viewer.js";
import { slidesPlantillaTema } from "../topics/plantilla-tema/content.js";
import { obtenerDatosEstudiante, guardarDatosEstudiante, limpiarDatosLocales } from "./storage.js";
import { crearGameShell, activarGameShell } from "../components/game-shell.js";
import { crearResultPanel } from "../components/result-panel.js";
import { crearFeedbackBox } from "../components/feedback-box.js";
import { initAuthGate } from "../components/auth-gate.js";
import { logout } from "./auth-service.js";
import { CURRICULUM_UNITS, getUnitByNumber } from "./curriculum-config.js";

const LOGO_URL = "./assets/img/logo-ueeh.png";
const HERO_IMAGE_URL = "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80";

let currentAuthUser = null;
let currentAuthProfile = null;

export function setAuthenticatedUser(user, profile) {
  currentAuthUser = user;
  currentAuthProfile = profile;
}

let currentActivity = "";
let currentGamificationUnit = 1;
let currentHomeworkUnit = 1;
let currentActiveUnit = null;
let shouldOpenActiveUnitModal = false;

function getStoredStudent() {
  const appStudent = obtenerDatosEstudiante();

  const savedName = localStorage.getItem("ueeh_student_name");
  const savedGrade = localStorage.getItem("ueeh_student_grade");
  const savedParallel = localStorage.getItem("ueeh_student_parallel");

  return {
    nombre: savedName || appStudent?.nombre || "",
    curso: savedGrade || appStudent?.curso || "3ro BGU",
    paralelo: savedParallel || appStudent?.paralelo || ""
  };
}

function initialsFromName(name = "Estudiante") {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "ES";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function mathSymbolsLayer() {
  return `
    <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <span class="symbol-float text-5xl font-light top-[10%] left-[5%]">∑</span>
      <span class="symbol-float text-4xl font-light top-[15%] left-[40%]">π</span>
      <span class="symbol-float text-5xl font-light top-[8%] left-[75%]">√</span>
      <span class="symbol-float text-4xl font-medium top-[40%] left-[12%]">f(x)</span>
      <span class="symbol-float text-5xl font-light top-[48%] left-[50%]">x²</span>
      <span class="symbol-float text-6xl font-light top-[38%] left-[85%]">∞</span>
      <span class="symbol-float text-5xl font-light top-[75%] left-[8%]">∆</span>
      <span class="symbol-float text-4xl font-light top-[82%] left-[35%]">=</span>
      <span class="symbol-float text-4xl font-light top-[70%] left-[68%]">±</span>
    </div>
  `;
}

function renderHeader() {
  const student = getStoredStudent();
  const displayName = currentAuthProfile?.display_name || currentAuthUser?.user_metadata?.full_name || currentAuthUser?.email || student.nombre || "Estudiante";
  const role = currentAuthProfile?.role || "student";
  const initials = initialsFromName(displayName);

  const roleBadgeHtml = role === "admin"
    ? `<span class="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">Administrador</span>`
    : `<span class="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Estudiante</span>`;

  const adminBtnHtml = role === "admin"
    ? `<button id="btn-header-admin" class="text-xs font-bold px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white transition-colors duration-150 flex items-center gap-1.5 shadow-sm border border-purple-800" title="Panel de Administración">
         <span>🛡️</span> <span class="hidden sm:inline">Administración</span>
       </button>`
    : "";

  return `
    <header class="w-full bg-white/80 backdrop-blur-xl border-b border-neutral-200 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="flex flex-col">
            <span class="text-[10px] font-bold tracking-widest text-moodle-text-gray uppercase leading-none mb-1">
              U.E. Emiliano Hinostroza
            </span>
            <span class="heading-font text-lg font-bold text-moodle-text-blue flex items-center gap-1.5">
              Campus Matemático Digital
              <span class="text-moodle-orange text-sm font-normal font-sans">· 3.º BGU</span>
            </span>
          </div>
          <img src="${LOGO_URL}" alt="Logo UEEH" class="h-12 w-auto object-contain">
        </div>

        <div class="flex items-center gap-3">
          ${adminBtnHtml}

          <div class="flex items-center gap-3 bg-neutral-100/80 border border-neutral-200/80 rounded-2xl py-1.5 pl-3 pr-4">
            <div class="relative">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-moodle-orange to-amber-600 flex items-center justify-center font-bold text-white text-sm tracking-wider shadow-sm">
                ${initials}
              </div>
              <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>

            <div class="hidden sm:flex flex-col text-left">
              <div class="flex items-center gap-1.5 mb-0.5">
                ${roleBadgeHtml}
              </div>
              <span class="text-xs font-semibold text-moodle-text-blue leading-none">
                ${displayName}
              </span>
            </div>
          </div>

          <button id="btn-header-logout" class="text-xs font-bold px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-moodle-text-blue transition-colors duration-150 flex items-center gap-1.5 border border-neutral-200" title="Cerrar sesión">
            <span>🚪</span> <span class="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

function renderHero() {
  return `
    <section class="relative bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-12 lg:gap-8 pt-8 pb-12">
      <div class="max-w-2xl space-y-6 flex-1 z-10">
        <span class="inline-block text-sm font-medium text-moodle-text-gray uppercase tracking-widest text-xs">
          Bienvenido a la comunidad
        </span>

        <h2 class="hero-font text-5xl sm:text-6xl font-bold text-moodle-text-blue leading-[1.1]">
          Bienvenido a la Comunidad del Saber de
          <span class="text-moodle-orange">3ro de BGU</span>
        </h2>

        <p class="text-moodle-text-gray text-base leading-relaxed max-w-md">
          Explora tus actividades, participa en los retos y completa tu ruta de aprendizaje para dominar las matemáticas este año.
        </p>

        <div class="pt-2">
          <button id="btn-open-unit-hero" class="group px-6 py-2.5 rounded-full border border-moodle-text-blue text-moodle-text-blue hover:bg-neutral-50 font-medium text-sm transition-colors duration-200 flex items-center gap-2">
            Abrir unidad activa
            <span class="text-lg transform group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </div>

      <div class="w-full lg:w-[500px] flex-shrink-0 relative z-10 flex justify-end">
        <div class="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
          <div class="absolute right-0 bottom-[-10%] w-[320px] h-[320px] bg-moodle-orange rounded-full"></div>
          <div class="absolute left-10 top-[-20%] w-[200px] h-[200px] border-[1.5px] border-dashed border-moodle-orange rounded-full"></div>
        </div>

        <div class="w-full max-w-[450px] rounded-[32px] overflow-hidden shadow-2xl relative bg-neutral-100 z-10 border-4 border-white">
          <img src="${HERO_IMAGE_URL}" alt="Comunidad del saber" class="w-full h-auto object-cover aspect-[4/3]" />
        </div>
      </div>
    </section>
  `;
}

function renderProgressSection() {
  return `
    <section class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-moodle-bg-light rounded-2xl p-8 border border-neutral-200 relative z-10">
      <div class="space-y-4">
        <div class="flex justify-between items-end mb-2">
          <span class="text-xs font-bold text-moodle-text-gray tracking-wider uppercase">
            Progreso en Ecuaciones de 1er Grado
          </span>
          <span class="heading-font text-xl font-bold text-moodle-orange">50%</span>
        </div>

        <div class="w-full bg-neutral-200 h-3 rounded-full overflow-hidden">
          <div class="bg-moodle-orange h-full rounded-full transition-all duration-500" style="width: 50%;"></div>
        </div>

        <p class="text-[10px] text-moodle-text-gray italic">
          * Cada actividad completada (Presentación, Gamificación, Tareas) suma un 25%.
        </p>
      </div>

      <div class="md:pl-8 md:border-l border-neutral-200 flex flex-col justify-center">
        <span class="text-xs font-bold text-moodle-text-gray tracking-wider uppercase block mb-3">
          Medallas ganadas
        </span>

        <div class="flex gap-3">
          <div class="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-2xl shadow-sm">🥇</div>
          <div class="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-2xl shadow-sm">⚡</div>
        </div>
      </div>
    </section>
  `;
}

function renderCurriculumRoute() {
  const cardsHtml = CURRICULUM_UNITS.map((unit) => {
    const badgeClass = unit.badge.length > 2 ? "text-xs" : "";
    const btnId = unit.cardButtonId || `btn-open-unit-${unit.unitNumber}`;

    return `
      <div class="unit-card bg-white border border-neutral-200 hover:border-moodle-orange/40 rounded-2xl p-6 flex flex-col justify-between transition-all hover:shadow-lg">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-lg bg-orange-50 text-moodle-orange flex items-center justify-center font-bold ${badgeClass}">
              ${unit.badge}
            </div>
            <span class="px-3 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100 animate-pulse">
              ${unit.status}
            </span>
          </div>

          <div>
            <h4 class="heading-font text-xl font-bold text-moodle-text-blue">
              ${unit.title}
            </h4>
            <p class="text-moodle-text-gray text-sm mt-2 leading-relaxed">
              ${unit.description}
            </p>
          </div>
        </div>

        <button id="${btnId}" class="btn-open-unit mt-8 w-full py-3 rounded-xl bg-moodle-text-blue hover:bg-moodle-dark-blue text-sm font-semibold text-white transition-colors" data-unit="${unit.unitNumber}">
          Entrar a la Unidad
        </button>
      </div>
    `;
  }).join("");

  return `
    <section class="space-y-8 relative z-10">
      <h3 class="heading-font text-3xl font-bold text-moodle-text-blue border-b border-neutral-200 pb-4">
        Ruta Curricular
      </h3>

      <div id="units-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${cardsHtml}
      </div>
    </section>
  `;
}

function renderUnitModal(unit) {
  const r = unit.routes;
  const u = unit.unitNumber;
  const closeTopId = `btn-close-unit-${u === 1 ? "" : u + "-"}top`;
  const closeBottomId = `btn-close-unit-${u === 1 ? "" : u + "-"}bottom`;

  const renderCard = (typeKey, routeData, isResults = false) => {
    if (!routeData) return "";
    const iconHtml = routeData.image
      ? `<img src="${routeData.image}" alt="${routeData.title}" class="w-12 h-12 rounded-xl object-contain shrink-0 shadow-sm" />`
      : `<div class="w-12 h-12 rounded-xl ${typeKey === 'presentation' ? 'bg-orange-50 text-moodle-orange' : typeKey === 'gamification' ? 'bg-violet-50 text-violet-600' : typeKey === 'classwork' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center text-2xl shrink-0">${routeData.icon || '📄'}</div>`;

    if (isResults) {
      return `
        <div class="group bg-neutral-100 border border-neutral-200 hover:shadow-md p-6 rounded-2xl flex flex-col justify-between transition-all">
          <div class="flex items-start gap-4">
            ${iconHtml}
            <div class="space-y-1">
              <h4 class="text-base font-bold text-moodle-text-blue">${routeData.title}</h4>
              <p class="text-moodle-text-gray text-xs leading-relaxed">
                ${routeData.description}
              </p>
            </div>
          </div>
          <div class="mt-6 pt-4 border-t border-neutral-100">
            <button id="${routeData.buttonId || `btn-unit-${u}-results`}" class="btn-unit-action w-full flex justify-between items-center text-[10px] font-bold text-emerald-700 cursor-pointer hover:text-emerald-800" data-unit="${u}" data-action="results">
              <span>REVISAR DESEMPEÑO</span>
              <span>VER DETALLES</span>
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="group bg-white border border-neutral-200 hover:border-moodle-orange/30 hover:shadow-md p-6 rounded-2xl flex flex-col justify-between transition-all">
        <div class="flex items-start gap-4">
          ${iconHtml}
          <div class="space-y-1">
            <h4 class="text-base font-bold text-moodle-text-blue">${routeData.title}</h4>
            <p class="text-moodle-text-gray text-xs leading-relaxed">
              ${routeData.description}
            </p>
          </div>
        </div>
        <div class="mt-6 pt-4 border-t border-neutral-100 text-right">
          <button id="${routeData.buttonId || `btn-unit-${u}-${typeKey}`}" class="btn-unit-action text-sm font-semibold ${routeData.actionColor || 'text-moodle-orange'} cursor-pointer hover:underline" data-unit="${u}" data-action="${typeKey}">
            ${routeData.actionText || 'Comenzar →'}
          </button>
        </div>
      </div>
    `;
  };

  return `
    <div id="unit-${u}" class="fixed inset-0 z-50 bg-moodle-dark-blue/80 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300 flex items-center justify-center p-4" role="dialog">
      <div class="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl relative transition-transform duration-300 scale-95 flex flex-col">
        <div class="p-8 border-b border-neutral-100 flex items-start justify-between bg-white sticky top-0 z-10">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-moodle-orange">Unidad ${u}</span>
            <h3 class="heading-font text-3xl font-bold text-moodle-text-blue mt-1">
              ${unit.title}
            </h3>
            <p class="text-moodle-text-gray text-sm mt-1">
              ${unit.modalSubtitle}
            </p>
          </div>

          <button id="${closeTopId}" class="btn-close-unit-modal p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-moodle-text-gray transition-colors" data-unit="${u}" aria-label="Cerrar unidad">
            ✕
          </button>
        </div>

        <div class="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 bg-neutral-50/50">
          ${renderCard('presentation', r.presentation)}
          ${renderCard('gamification', r.gamification)}
          ${renderCard('classwork', r.classwork)}
          ${renderCard('results', r.results, true)}
        </div>

        <div class="p-6 bg-white border-t border-neutral-100 text-right">
          <button id="${closeBottomId}" class="btn-close-unit-modal px-8 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-sm font-semibold text-moodle-text-blue transition-colors" data-unit="${u}">
            Cerrar unidad
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderStudentDataModal() {
  const student = getStoredStudent();

  return `
    <div id="student-data-modal" class="fixed inset-0 z-[60] bg-moodle-dark-blue/90 backdrop-blur-md opacity-0 pointer-events-none transition-opacity duration-300 flex items-center justify-center p-4" role="dialog">
      <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl relative transition-transform duration-300 scale-95 flex flex-col overflow-hidden">

        <div class="bg-moodle-orange p-6 text-white text-center">
          <h3 class="heading-font text-2xl font-bold">Antes de comenzar</h3>
          <p class="text-orange-100 text-sm mt-1">
            Registra tus datos para guardar tu calificación de <br>
            <strong id="activity-name-display" class="text-white">la actividad</strong>.
          </p>
        </div>

        <div class="p-6 space-y-4 bg-white">
          <div>
            <label class="block text-xs font-bold text-moodle-text-gray uppercase tracking-wide mb-1">
              Nombre y Apellido
            </label>
            <input
              type="text"
              id="student-name"
              value="${student.nombre}"
              placeholder="Ej. Juan Pérez"
              class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-moodle-text-blue focus:outline-none focus:border-moodle-orange focus:ring-1 focus:ring-moodle-orange transition-colors"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-moodle-text-gray uppercase tracking-wide mb-1">
                Grado / Curso
              </label>
              <select
                id="student-grade"
                class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-moodle-text-blue focus:outline-none focus:border-moodle-orange focus:ring-1 focus:ring-moodle-orange transition-colors"
              >
                <option value="" disabled>Selecciona...</option>
                <option value="1ro BGU" ${student.curso === "1ro BGU" || student.curso === "1BGU" ? "selected" : ""}>1ro BGU</option>
                <option value="2do BGU" ${student.curso === "2do BGU" || student.curso === "2BGU" ? "selected" : ""}>2do BGU</option>
                <option value="3ro BGU" ${student.curso === "3ro BGU" || student.curso === "3BGU" ? "selected" : ""}>3ro BGU</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-moodle-text-gray uppercase tracking-wide mb-1">
                Paralelo
              </label>
              <select
                id="student-parallel"
                class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-moodle-text-blue focus:outline-none focus:border-moodle-orange focus:ring-1 focus:ring-moodle-orange transition-colors"
              >
                <option value="" disabled>Selecciona...</option>
                ${["A", "B", "C", "D"]
                  .map((p) => `<option value="${p}" ${student.paralelo === p ? "selected" : ""}>${p}</option>`)
                  .join("")}
              </select>
            </div>
          </div>
        </div>

        <div class="p-6 bg-neutral-50 border-t border-neutral-100 flex gap-3 justify-end">
          <button id="btn-clear-student-data" class="px-5 py-2.5 rounded-full bg-white border border-red-200 hover:bg-red-50 text-sm font-semibold text-red-700 transition-colors">
            Cambiar estudiante / limpiar datos
          </button>
          <button id="btn-cancel-data" class="px-5 py-2.5 rounded-full bg-white border border-neutral-200 hover:bg-neutral-100 text-sm font-semibold text-moodle-text-gray transition-colors">
            Cancelar
          </button>
          <button id="btn-start-activity" class="px-6 py-2.5 rounded-full bg-moodle-text-blue hover:bg-moodle-dark-blue text-sm font-semibold text-white transition-colors">
            Entrar a la actividad
          </button>
        </div>

      </div>
    </div>
  `;
}

function renderToast() {
  return `
    <div id="toast" class="fixed bottom-5 right-5 z-[70] bg-moodle-text-blue text-white px-5 py-3.5 rounded-xl text-sm font-medium shadow-xl translate-y-20 opacity-0 transition-all duration-300 flex items-center gap-3">
      <span>💡</span>
      <span id="toast-text">Notificación</span>
    </div>
  `;
}

function goToDashboard() {
  sessionStorage.setItem("ueeh_active_view", "campus");
  renderView(`
    ${mathSymbolsLayer()}

    <div class="relative z-10 min-h-screen flex flex-col">
      ${renderHeader()}

      <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        ${renderHero()}
        ${renderProgressSection()}
        ${renderCurriculumRoute()}
      </main>
    </div>

    ${CURRICULUM_UNITS.map(renderUnitModal).join("\n")}
    ${renderStudentDataModal()}
    ${renderToast()}
  `);

  bindDashboardEvents();

  if (shouldOpenActiveUnitModal && currentActiveUnit) {
    openModal(`unit-${currentActiveUnit}`);
    shouldOpenActiveUnitModal = false;
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.remove("opacity-0", "pointer-events-none");
  modal.firstElementChild?.classList.remove("scale-95");
  modal.firstElementChild?.classList.add("scale-100");

  if (id.startsWith("unit-")) {
    document.body.classList.add("overflow-hidden");
    const match = id.match(/unit-(\d+)/);
    if (match) {
      currentActiveUnit = parseInt(match[1], 10);
    }
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.add("opacity-0", "pointer-events-none");
  modal.firstElementChild?.classList.remove("scale-100");
  modal.firstElementChild?.classList.add("scale-95");

  if (id.startsWith("unit-")) {
    document.body.classList.remove("overflow-hidden");
  }
}

function openDataModal(activityName) {
  currentActivity = activityName;

  const activityLabel = document.getElementById("activity-name-display");
  if (activityLabel) {
    activityLabel.textContent = activityName;
  }

  openModal("student-data-modal");
}

function saveStudentDataFromModal() {
  const nameInput = document.getElementById("student-name");
  const gradeInput = document.getElementById("student-grade");
  const parallelInput = document.getElementById("student-parallel");

  const nombre = nameInput?.value.trim() || "";
  const curso = gradeInput?.value || "";
  const paralelo = parallelInput?.value || "";

  if (!nombre || !curso || !paralelo) {
    showToast("Completa tus datos antes de ingresar a la actividad.");
    return false;
  }

  localStorage.setItem("ueeh_student_name", nombre);
  localStorage.setItem("ueeh_student_grade", curso);
  localStorage.setItem("ueeh_student_parallel", paralelo);

  guardarDatosEstudiante({ nombre, curso, paralelo });

  return true;
}

function startActivity() {
  if (!saveStudentDataFromModal()) return;

  closeModal("student-data-modal");
  CURRICULUM_UNITS.forEach((u) => closeModal(`unit-${u.unitNumber}`));

  showToast(`Datos asegurados. Iniciando ${currentActivity}...`);
  shouldOpenActiveUnitModal = true;

  const actionType = currentActivity === "Gamificación" ? "gamification" : "classwork";
  const unitNumber = actionType === "gamification" ? currentGamificationUnit : currentHomeworkUnit;
  const unit = getUnitByNumber(unitNumber);

  if (unit) {
    executeUnitNavigation(unit, actionType);
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toast-text");

  if (!toast || !toastText) return;

  toastText.textContent = message;
  toast.classList.remove("translate-y-20", "opacity-0");

  setTimeout(() => {
    toast.classList.add("translate-y-20", "opacity-0");
  }, 3000);
}

function handleUnitAction(unitNumber, actionType) {
  const unit = getUnitByNumber(unitNumber);
  if (!unit) return;

  const route = unit.routes[actionType];
  if (!route) {
    showToast("Actividad no disponible.");
    return;
  }

  closeModal(`unit-${unitNumber}`);
  shouldOpenActiveUnitModal = true;

  // Si la unidad requiere modal de datos de estudiante (unidades legacy 1-4)
  if (unit.requiresStudentData && (actionType === "gamification" || actionType === "classwork")) {
    currentGamificationUnit = unitNumber;
    currentHomeworkUnit = unitNumber;
    openDataModal(route.title);
    return;
  }

  executeUnitNavigation(unit, actionType);
}

export function buildFreshActivityUrl(pathStr, token = Date.now().toString()) {
  if (!pathStr || typeof pathStr !== "string") return pathStr;

  try {
    const dummyBase = "https://ueeh-app.internal/";
    const url = new URL(pathStr, dummyBase);
    url.searchParams.set("v", token);

    if (pathStr.startsWith("./")) {
      const pathname = url.pathname.replace(/^\//, "");
      return `./${pathname}${url.search}${url.hash}`;
    } else if (pathStr.startsWith("/")) {
      return `${url.pathname}${url.search}${url.hash}`;
    } else if (!pathStr.startsWith("http://") && !pathStr.startsWith("https://")) {
      const pathname = url.pathname.replace(/^\//, "");
      return `${pathname}${url.search}${url.hash}`;
    } else {
      return url.href;
    }
  } catch {
    const separator = pathStr.includes("?") ? "&" : "?";
    return `${pathStr}${separator}v=${token}`;
  }
}

function executeUnitNavigation(unit, actionType) {
  const route = unit.routes[actionType];
  if (!route) return;

  if (actionType === "presentation") {
    if (route.type === "legacy-slides") {
      showToast("Abriendo diapositivas...");
      goToSlides();
    } else if (route.src) {
      if (route.viewedKey) localStorage.setItem(route.viewedKey, "true");
      showToast(`Abriendo presentación de ${unit.title}...`);
      renderView(
        layout(
          route.viewTitle || unit.title,
          crearHtmlLessonViewer({
            src: route.src,
            title: route.viewerTitle || `${unit.title} - Presentación de la Clase`
          })
        )
      );
      bindClick("#btn-back-dashboard", () => goToDashboard());
      setupFullscreenButton();
    }
    return;
  }

  if (actionType === "gamification") {
    if (route.type === "legacy-game") {
      goToGame();
    } else if (route.src) {
      showToast(`Cargando ${route.title}...`);
      renderView(
        layout(
          route.viewTitle || `Gamificación · ${unit.title}`,
          crearHtmlLessonViewer({
            src: buildFreshActivityUrl(route.src),
            title: route.viewerTitle || `${route.title} · Unidad ${unit.unitNumber}`
          })
        )
      );
      bindClick("#btn-back-dashboard", () => goToDashboard());
      setupFullscreenButton();
    }
    return;
  }

  if (actionType === "classwork") {
    if (route.type === "legacy-homework") {
      goToHomework();
    } else if (route.src) {
      showToast(`Cargando ${route.title}...`);
      renderView(
        layout(
          route.viewTitle || `${route.title} · ${unit.title}`,
          crearHtmlLessonViewer({
            src: buildFreshActivityUrl(route.src),
            title: route.viewerTitle || `${route.title} · Unidad ${unit.unitNumber}`
          })
        )
      );
      bindClick("#btn-back-dashboard", () => goToDashboard());
      setupFullscreenButton();
    }
    return;
  }

  if (actionType === "results") {
    if (route.type === "supabase-summary") {
      showToast(`Cargando resultados de Unidad ${unit.unitNumber}...`);
      import("../components/activity-summary.js").then(({ renderStudentActivitySummary }) => {
        renderView(
          layout(
            route.viewTitle || `Resultados · Unidad ${unit.unitNumber} ${unit.title}`,
            `<section id="summary-container" class="app-card p-6 sm:p-8"></section>`
          )
        );
        const container = document.getElementById("summary-container");
        if (container) {
          renderStudentActivitySummary(container);
        }
        bindClick("#btn-back-dashboard", () => goToDashboard());
      });
    } else if (unit.unitNumber === 1) {
      showToast("Cargando panel de resultados...");
      goToResults();
    } else if (unit.unitNumber === 2) {
      showToast("Cargando panel de resultados de Unidad 2...");
      goToDerivadasResults();
    } else if (unit.unitNumber === 3) {
      showToast("Cargando panel de resultados de Unidad 3...");
      goToMatricesResults();
    } else if (unit.unitNumber === 4) {
      showToast("Cargando panel de resultados de Unidad 4...");
      goToProductoMatricesResults();
    }
  }
}

function bindDashboardEvents() {
  bindClick("#btn-header-logout", () => logout());
  bindClick("#btn-header-admin", () => {
    if (currentAuthProfile?.role === "admin") {
      sessionStorage.setItem("ueeh_active_view", "admin");
      import("../components/admin/admin-shell.js").then((m) => {
        window.onReturnToCampus = () => {
          sessionStorage.setItem("ueeh_active_view", "campus");
          goToDashboard();
        };
        m.renderAdminShell("dashboard");
      });
    }
  });
  bindClick("#btn-open-unit-hero", () => openModal("unit-1"));

  // Bind dinámico para todas las unidades curriculares
  CURRICULUM_UNITS.forEach((unit) => {
    const u = unit.unitNumber;

    // Botones de apertura de card
    if (unit.cardButtonId) {
      bindClick(`#${unit.cardButtonId}`, () => openModal(`unit-${u}`));
    }
    bindClick(`#btn-open-unit-${u}`, () => openModal(`unit-${u}`));

    // Botones de cierre de modal
    const closeTopId = `#btn-close-unit-${u === 1 ? "" : u + "-"}top`;
    const closeBottomId = `#btn-close-unit-${u === 1 ? "" : u + "-"}bottom`;
    bindClick(closeTopId, () => closeModal(`unit-${u}`));
    bindClick(closeBottomId, () => closeModal(`unit-${u}`));
    bindClick(`#btn-close-unit-${u}-top`, () => closeModal(`unit-${u}`));
    bindClick(`#btn-close-unit-${u}-bottom`, () => closeModal(`unit-${u}`));

    // Botones de acción dentro del modal
    const r = unit.routes;
    if (r.presentation) {
      const btnId = r.presentation.buttonId || `btn-unit-${u}-slides`;
      bindClick(`#${btnId}`, () => handleUnitAction(u, "presentation"));
    }
    if (r.gamification) {
      const btnId = r.gamification.buttonId || `btn-unit-${u}-game`;
      bindClick(`#${btnId}`, () => handleUnitAction(u, "gamification"));
    }
    if (r.classwork) {
      const btnId = r.classwork.buttonId || `btn-unit-${u}-homework`;
      bindClick(`#${btnId}`, () => handleUnitAction(u, "classwork"));
    }
    if (r.results) {
      const btnId = r.results.buttonId || `btn-unit-${u}-results`;
      bindClick(`#${btnId}`, () => handleUnitAction(u, "results"));
    }
  });

  // Modal de datos de estudiante
  bindClick("#btn-cancel-data", () => closeModal("student-data-modal"));
  bindClick("#btn-clear-student-data", () => {
    limpiarDatosLocales();
    showToast("Datos limpiados. Ingresa la información del estudiante.");
    const nameInput = document.getElementById("student-name");
    const gradeInput = document.getElementById("student-grade");
    const parallelInput = document.getElementById("student-parallel");
    if (nameInput) nameInput.value = "";
    if (gradeInput) gradeInput.value = "3ro BGU";
    if (parallelInput) parallelInput.value = "";
  });
  bindClick("#btn-start-activity", startActivity);

  ["#student-name", "#student-grade", "#student-parallel"].forEach((selector) => {
    const input = document.querySelector(selector);
    input?.addEventListener("input", saveStudentAutosave);
    input?.addEventListener("change", saveStudentAutosave);
  });
}

function saveStudentAutosave() {
  const nameInput = document.getElementById("student-name");
  const gradeInput = document.getElementById("student-grade");
  const parallelInput = document.getElementById("student-parallel");

  if (nameInput?.value) {
    localStorage.setItem("ueeh_student_name", nameInput.value);
  }

  if (gradeInput?.value) {
    localStorage.setItem("ueeh_student_grade", gradeInput.value);
  }

  if (parallelInput?.value) {
    localStorage.setItem("ueeh_student_parallel", parallelInput.value);
  }
}

function layout(title, body) {
  return `
    ${mathSymbolsLayer()}

    <div class="relative z-10 min-h-screen flex flex-col">
      ${renderHeader()}

      <div class="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 space-y-4">
        <button id="btn-back-dashboard" class="px-5 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-sm font-semibold text-moodle-text-blue transition-colors">
          ← Volver al campus
        </button>

        <header class="app-card p-6 sm:p-8">
          <h1 class="screen-title">${title}</h1>
        </header>

        ${body}
      </div>
    </div>
  `;
}

function goToSlides() {
  const viewer = createSlideViewer({
    slides: slidesPlantillaTema,
    onExit: () => goToDashboard(),
    onComplete: () => goToDashboard()
  });

  viewer.repaint();
}

function setupFullscreenButton() {
  const btn = document.getElementById("btn-fullscreen-lesson");
  const iframe = document.getElementById("lesson-iframe");
  if (btn && iframe) {
    btn.addEventListener("click", () => {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if (iframe.webkitRequestFullscreen) {
        iframe.webkitRequestFullscreen();
      } else if (iframe.msRequestFullscreen) {
        iframe.msRequestFullscreen();
      }
    });
  }

  const btnBack = document.getElementById("btn-back-to-unit");
  if (btnBack) {
    btnBack.addEventListener("click", () => {
      goToDashboard();
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   RESULTADOS LEGACY (UNIDADES 1-4)
   ═══════════════════════════════════════════════════════════════════════════ */

function getUnidad2Results() {
  const safeParse = (key) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
  return { presentationViewed: localStorage.getItem("ueeh_unidad2_presentation_viewed") === "true", gamificacion: safeParse("ueeh_unidad2_result_gamificacion"), deber: safeParse("ueeh_unidad2_result_deber"), resultsViewed: localStorage.getItem("ueeh_unidad2_results_viewed") === "true" };
}

function getUnidad2Progress() {
  const d = getUnidad2Results();
  return (d.presentationViewed ? 25 : 0) + (d.gamificacion?.estado ? 25 : 0) + (d.deber?.estado ? 25 : 0) + (d.resultsViewed ? 25 : 0);
}

function goToDerivadasResults() {
  localStorage.setItem("ueeh_unidad2_results_viewed", "true");
  const data = getUnidad2Results();
  const progress = getUnidad2Progress();
  const notas = [data.gamificacion?.notaFinal, data.deber?.notaFinal].filter((n) => Number.isFinite(Number(n))).map(Number);
  const promedio = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length) : null;
  const promedioTxt = promedio == null ? "Pendiente" : `${promedio.toFixed(2)} / 10`;
  const mensaje = promedio == null ? "Aún no hay actividades completadas." : promedio >= 9 ? "Excelente desempeño." : promedio >= 7 ? "Buen avance." : "Requiere refuerzo.";
  const card = (titulo, r) => `<div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 space-y-2"><h3 class="heading-font text-lg font-bold text-moodle-text-blue">${titulo}</h3><p><strong>Nota:</strong> ${r?.notaFinal ?? "Pendiente"}</p><p><strong>Porcentaje:</strong> ${r?.porcentajeFinal ?? "Pendiente"}${r?.porcentajeFinal ? "%" : ""}</p><p><strong>Nivel:</strong> ${r?.nivel ?? "Pendiente"}</p><p><strong>Estado:</strong> ${r?.estado ?? "Pendiente"}</p><p><strong>Observación:</strong> ${r?.observacion ?? "Sin registro"}</p><p><strong>Fecha:</strong> ${r?.fecha ? new Date(r.fecha).toLocaleString() : "Pendiente"}</p></div>`;
  renderView(layout("Resultados · Introducción a las Derivadas", `<section class="app-card p-6 sm:p-8 space-y-6"><div class="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-bold">📊 Unidad 2</div><h2 class="heading-font text-2xl font-bold text-moodle-text-blue">Introducción a las Derivadas</h2><div class="rounded-2xl border border-neutral-200 p-4 bg-white"><div class="flex justify-between text-sm font-semibold"><span>Progreso de la unidad</span><span>${progress}%</span></div><div class="w-full bg-neutral-200 h-3 rounded-full mt-2"><div class="bg-moodle-orange h-full rounded-full" style="width:${progress}%"></div></div><p class="text-xs text-moodle-text-gray mt-2">Presentación: ${data.presentationViewed ? "Vista" : "Pendiente"}</p></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4">${card("Gamificación", data.gamificacion)}${card("Trabajo para la Casa", data.deber)}</div><div class="rounded-2xl border border-neutral-200 bg-blue-50 p-5"><p class="text-xs font-bold text-moodle-text-gray uppercase">Promedio general (actividades evaluadas)</p><p class="heading-font text-3xl text-moodle-text-blue font-bold mt-1">${promedioTxt}</p><p class="mt-2 text-moodle-text-gray">${mensaje}</p></div></section>`));
  bindClick("#btn-back-dashboard", () => goToDashboard());
}

function getUnidad3Results() {
  const safeParse = (key) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
  return {
    presentationViewed: localStorage.getItem("ueeh_unidad3_presentation_viewed") === "true",
    gamificacion: safeParse("ueeh_unidad3_result_gamificacion"),
    deber: safeParse("ueeh_unidad3_result_deber"),
    resultsViewed: localStorage.getItem("ueeh_unidad3_results_viewed") === "true"
  };
}

function getUnidad3Progress() {
  const d = getUnidad3Results();
  return (d.presentationViewed ? 25 : 0) + (d.gamificacion?.estado ? 25 : 0) + (d.deber?.estado ? 25 : 0) + (d.resultsViewed ? 25 : 0);
}

function goToMatricesResults() {
  localStorage.setItem("ueeh_unidad3_results_viewed", "true");
  const data = getUnidad3Results();
  const progress = getUnidad3Progress();
  const notas = [data.gamificacion?.notaFinal, data.deber?.notaFinal].filter((n) => Number.isFinite(Number(n))).map(Number);
  const promedio = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length) : null;
  const promedioTxt = promedio == null ? "Pendiente" : `${promedio.toFixed(2)} / 10`;
  const mensaje = promedio == null ? "Aún no hay actividades completadas." : promedio >= 9 ? "Excelente desempeño." : promedio >= 7 ? "Buen avance." : "Requiere refuerzo.";
  const card = (titulo, r) => `<div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 space-y-2"><h3 class="heading-font text-lg font-bold text-moodle-text-blue">${titulo}</h3><p><strong>Nota:</strong> ${r?.notaFinal ?? "Pendiente"}</p><p><strong>Porcentaje:</strong> ${r?.porcentajeFinal ?? "Pendiente"}${r?.porcentajeFinal ? "%" : ""}</p><p><strong>Nivel:</strong> ${r?.nivel ?? "Pendiente"}</p><p><strong>Estado:</strong> ${r?.estado ?? "Pendiente"}</p><p><strong>Observación:</strong> ${r?.observacion ?? "Sin registro"}</p><p><strong>Fecha:</strong> ${r?.fecha ? new Date(r.fecha).toLocaleString() : "Pendiente"}</p></div>`;
  renderView(
    layout(
      "Resultados · Operaciones con matrices",
      `<section class="app-card p-6 sm:p-8 space-y-6">
        <div class="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-bold">📊 Unidad 3</div>
        <h2 class="heading-font text-2xl font-bold text-moodle-text-blue">Operaciones con matrices</h2>
        <div class="rounded-2xl border border-neutral-200 p-4 bg-white">
          <div class="flex justify-between text-sm font-semibold">
            <span>Progreso de la unidad</span>
            <span>${progress}%</span>
          </div>
          <div class="w-full bg-neutral-200 h-3 rounded-full mt-2"><div class="bg-moodle-orange h-full rounded-full" style="width:${progress}%"></div></div>
          <p class="text-xs text-moodle-text-gray mt-2">Presentación: ${data.presentationViewed ? "Vista" : "Pendiente"}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${card("Gamificación", data.gamificacion)}
          ${card("Trabajo para la Casa", data.deber)}
        </div>
        <div class="rounded-2xl border border-neutral-200 bg-blue-50 p-5">
          <p class="text-xs font-bold text-moodle-text-gray uppercase">Promedio general (actividades evaluadas)</p>
          <p class="heading-font text-3xl text-moodle-text-blue font-bold mt-1">${promedioTxt}</p>
          <p class="mt-2 text-moodle-text-gray">${mensaje}</p>
        </div>
      </section>`
    )
  );
  bindClick("#btn-back-dashboard", () => goToDashboard());
}

function getUnidad4Results() {
  const safeParse = (key) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
  return {
    presentationViewed: localStorage.getItem("ueeh_unidad4_presentation_viewed") === "true",
    gamificacion: safeParse("ueeh_unidad4_result_gamificacion"),
    deber: safeParse("ueeh_unidad4_result_deber"),
    resultsViewed: localStorage.getItem("ueeh_unidad4_results_viewed") === "true"
  };
}

function getUnidad4Progress() {
  const d = getUnidad4Results();
  return (d.presentationViewed ? 25 : 0) + (d.gamificacion?.estado ? 25 : 0) + (d.deber?.estado ? 25 : 0) + (d.resultsViewed ? 25 : 0);
}

function goToProductoMatricesResults() {
  localStorage.setItem("ueeh_unidad4_results_viewed", "true");
  const data = getUnidad4Results();
  const progress = getUnidad4Progress();
  const notas = [data.gamificacion?.notaFinal, data.deber?.notaFinal].filter((n) => Number.isFinite(Number(n))).map(Number);
  const promedio = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length) : null;
  const promedioTxt = promedio == null ? "Pendiente" : `${promedio.toFixed(2)} / 10`;
  const mensaje = promedio == null ? "Aún no hay actividades completadas." : promedio >= 9 ? "Excelente desempeño." : promedio >= 7 ? "Buen avance." : "Requiere refuerzo.";
  const card = (titulo, r) => `<div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 space-y-2"><h3 class="heading-font text-lg font-bold text-moodle-text-blue">${titulo}</h3><p><strong>Nota:</strong> ${r?.notaFinal ?? "Pendiente"}</p><p><strong>Porcentaje:</strong> ${r?.porcentajeFinal ?? "Pendiente"}${r?.porcentajeFinal ? "%" : ""}</p><p><strong>Nivel:</strong> ${r?.nivel ?? "Pendiente"}</p><p><strong>Estado:</strong> ${r?.estado ?? "Pendiente"}</p><p><strong>Observación:</strong> ${r?.observacion ?? "Sin registro"}</p><p><strong>Fecha:</strong> ${r?.fecha ? new Date(r.fecha).toLocaleString() : "Pendiente"}</p></div>`;
  renderView(
    layout(
      "Resultados · Producto de matrices",
      `<section class="app-card p-6 sm:p-8 space-y-6">
        <div class="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-bold">📊 Unidad 4</div>
        <h2 class="heading-font text-2xl font-bold text-moodle-text-blue">Producto de matrices</h2>
        <div class="rounded-2xl border border-neutral-200 p-4 bg-white">
          <div class="flex justify-between text-sm font-semibold">
            <span>Progreso de la unidad</span>
            <span>${progress}%</span>
          </div>
          <div class="w-full bg-neutral-200 h-3 rounded-full mt-2"><div class="bg-moodle-orange h-full rounded-full" style="width:${progress}%"></div></div>
          <p class="text-xs text-moodle-text-gray mt-2">Presentación: ${data.presentationViewed ? "Vista" : "Pendiente"}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${card("Gamificación", data.gamificacion)}
          ${card("Trabajo para la Casa", data.deber)}
        </div>
        <div class="rounded-2xl border border-neutral-200 bg-blue-50 p-5">
          <p class="text-xs font-bold text-moodle-text-gray uppercase">Promedio general (actividades evaluadas)</p>
          <p class="heading-font text-3xl text-moodle-text-blue font-bold mt-1">${promedioTxt}</p>
          <p class="mt-2 text-moodle-text-gray">${mensaje}</p>
        </div>
      </section>`
    )
  );
  bindClick("#btn-back-dashboard", () => goToDashboard());
}

function goToGame() {
  renderView(layout("Gamificación", crearGameShell()));
  bindClick("#btn-back-dashboard", () => goToDashboard());
  activarGameShell();
  document.addEventListener(
    "ueeh:game-finished",
    () => goToResults(),
    { once: true }
  );
}

function goToHomework() {
  renderView(
    layout(
      "Trabajo para la Casa",
      `
        <section class="app-card p-6 sm:p-8">
          <div class="inline-flex items-center rounded-full bg-blue-50 text-blue-600 px-3 py-1 text-xs font-bold">
            🏠 Trabajo para la Casa
          </div>

          <h2 class="heading-font text-2xl font-bold text-moodle-text-blue mt-4">
            Actividades para fortalecer tu aprendizaje
          </h2>

          <p class="section-subtitle mt-2">
            Próximamente se habilitarán ejercicios evaluados, intentos y retroalimentación automática.
          </p>

          <div class="mt-5">
            ${crearFeedbackBox("warn", "Revisa el procedimiento antes de continuar.")}
          </div>
        </section>
      `
    )
  );

  bindClick("#btn-back-dashboard", () => goToDashboard());
}

function goToResults() {
  renderView(layout("Resultados", crearResultPanel()));
  bindClick("#btn-back-dashboard", () => goToDashboard());
}

export function iniciarApp() {
  const shouldReset = new URLSearchParams(window.location.search).get("reset") === "1";
  if (shouldReset) {
    limpiarDatosLocales();
  }

  initAuthGate((user, profile) => {
    setAuthenticatedUser(user, profile);

    const activeView = sessionStorage.getItem("ueeh_active_view");
    if (activeView === "admin" && profile?.role === "admin") {
      import("../components/admin/admin-shell.js").then((m) => {
        window.onReturnToCampus = () => {
          sessionStorage.setItem("ueeh_active_view", "campus");
          goToDashboard();
        };
        m.renderAdminShell("dashboard");
      });
    } else {
      goToDashboard();
    }
  });
}
