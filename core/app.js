import { renderView, bindClick } from "./navigation.js";
import { createSlideViewer } from "../components/slide-viewer.js";
import { slidesPlantillaTema } from "../topics/plantilla-tema/content.js";
import { obtenerDatosEstudiante } from "./storage.js";
import { crearFormularioEstudiante, activarFormularioEstudiante } from "../components/student-form.js";
import { crearGameShell } from "../components/game-shell.js";
import { crearResultPanel } from "../components/result-panel.js";
import { crearFeedbackBox } from "../components/feedback-box.js";

const topics = [
  { id: "ecuaciones-primer-grado", unit: "Unidad 1", title: "Ecuaciones de Primer Grado", desc: "Fundamentos algebraicos, despeje de incógnitas y resolución de problemas cotidianos.", icon: "∑", status: "Disponible", progress: 45, unlocked: true },
  { id: "funciones-lineales", unit: "Unidad 2", title: "Funciones Lineales", desc: "Interpretación de relaciones entre variables, pendiente y representación gráfica.", icon: "π", status: "Próximamente", progress: 0, unlocked: false },
  { id: "sistemas-ecuaciones", unit: "Unidad 3", title: "Sistemas de Ecuaciones", desc: "Resolución de problemas mediante dos o más ecuaciones relacionadas.", icon: "±", status: "Próximamente", progress: 0, unlocked: false },
  { id: "derivadas-basicas", unit: "Unidad 4", title: "Derivadas Básicas", desc: "Introducción a la tasa de cambio y análisis inicial de funciones.", icon: "f(x)", status: "Próximamente", progress: 0, unlocked: false },
  { id: "aplicaciones-derivadas", unit: "Unidad 5", title: "Aplicaciones de Derivadas", desc: "Máximos, mínimos y problemas de optimización.", icon: "∆", status: "Próximamente", progress: 0, unlocked: false },
  { id: "simulador-matematico", unit: "Unidad 6", title: "Simulador Matemático", desc: "Retos de repaso para fortalecer el razonamiento lógico y algebraico.", icon: "∞", status: "Próximamente", progress: 0, unlocked: false }
];

const symbols = ["∑", "π", "√", "f(x)", "x²", "∆", "∞", "=", "±", "y = mx + b"];
const particles = () => `<div class="math-particles" aria-hidden="true">${symbols.map((s, i) => `<span class="math-symbol text-${i % 3 === 0 ? "3xl" : "2xl"}" style="left:${6 + i * 9}%;top:${10 + ((i * 13) % 70)}%;--dur:${12 + (i % 5) * 2}s;--delay:-${i}s">${s}</span>`).join("")}</div>`;

const topNav = (d = obtenerDatosEstudiante()) => {
  const nombre = d?.nombre || "Estudiante";
  const inicial = nombre.charAt(0).toUpperCase() || "E";
  return `<header class="glass-nav"><div class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between"><div><h1 class="font-bold text-white">U.E. Emiliano Hinostroza</h1><p class="text-xs text-slate-300">Campus Matemático Digital · 3.º BGU</p></div><div class="flex items-center gap-3"><div class="text-right hidden sm:block"><p class="font-semibold text-white">${nombre}</p><p class="text-xs text-slate-300">${d?.curso || "Tercero BGU"}${d?.paralelo ? ` · Paralelo ${d.paralelo}` : ""}</p></div><div class="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-200 to-violet-300 text-slate-900 grid place-items-center font-black">${inicial}</div></div></div></header>`;
};

function goToWelcome() {
  renderView(`${particles()}<section class="min-h-screen flex items-center px-4 py-8"><div class="max-w-5xl mx-auto w-full grid lg:grid-cols-2 gap-7"><div class="space-y-5"><p class="text-cyan-100/80 font-bold uppercase tracking-[.18em] text-xs">Unidad Educativa Emiliano Hinostroza</p><h1 class="screen-title">Academia Matemática Digital</h1><p class="text-violet-100 font-semibold">Tercero de BGU</p><p class="section-subtitle">Bienvenido al campus matemático nocturno: una experiencia moderna, suave y motivadora para aprender.</p><button id="btn-start" class="app-btn bg-gradient-to-r from-cyan-200 to-violet-300 text-slate-900">Iniciar aventura matemática</button></div><div class="hero-panel rounded-3xl p-6"><p class="text-sm text-slate-300">Ruta activa</p><h2 class="text-2xl font-black text-white mt-2">Álgebra fundamental</h2><div class="mt-4 progress-track"><div class="progress-bar" style="width:45%"></div></div></div></div></section>`);
  bindClick("#btn-start", goToStudentForm);
}

function goToStudentForm() {
  renderView(`${particles()}<div class="min-h-screen flex items-center justify-center px-4 py-8">${crearFormularioEstudiante(goToDashboard)}</div>`);
  activarFormularioEstudiante(goToDashboard);
}

function topicCard(t) {
  return `<article class="topic-card" data-topic-id="${t.id}"><div class="flex justify-between"><div class="h-12 w-12 rounded-xl bg-white/10 grid place-items-center font-bold text-cyan-100">${t.icon}</div><span class="unit-status-badge ${t.unlocked ? "unit-status-available" : "unit-status-soon"}">${t.status}</span></div><p class="mt-4 text-xs text-cyan-100/75 font-bold uppercase">${t.unit}</p><h4 class="text-xl font-black text-white mt-1">${t.title}</h4><p class="text-sm text-slate-300 mt-2">${t.desc}</p><div class="mt-4 flex justify-between text-xs"><span>${t.unlocked ? "En curso" : "Bloqueado"}</span><span>${t.progress}%</span></div><div class="progress-track mt-1"><div class="${t.unlocked ? "progress-bar" : "bg-slate-600"}" style="width:${t.progress}%"></div></div><button class="app-btn mt-4 ${t.unlocked ? "bg-white/10 text-white" : "bg-slate-800 text-slate-300"}">${t.unlocked ? "Abrir unidad" : "Próximamente"}</button></article>`;
}

function goToDashboard(data = obtenerDatosEstudiante()) {
  renderView(`${particles()}${topNav(data)}<section class="pt-24 pb-20 px-4"><div class="max-w-7xl mx-auto space-y-6"><div class="hero-panel rounded-3xl p-6 md:p-8"><h2 class="screen-title">Matemáticas en modo espacio digital</h2><p class="section-subtitle mt-2">Avanza a tu ritmo, desbloquea logros y fortalece tus competencias matemáticas.</p><div class="mt-4 flex flex-wrap gap-3"><button id="btn-open-active-topic" class="app-btn bg-gradient-to-r from-cyan-200 to-violet-300 text-slate-900 sm:w-auto">Abrir unidad activa</button><button id="btn-scroll-units" class="app-btn bg-white/10 text-white sm:w-auto">Ver ruta de aprendizaje</button></div></div><section id="units" class="app-card rounded-3xl p-5"><div class="flex flex-col md:flex-row md:items-center justify-between gap-3"><h3 class="text-2xl font-black text-white">Unidades de estudio</h3><input id="topic-search" class="search-field md:w-80" placeholder="Buscar por título, descripción o unidad"></div><p id="empty-search" class="hidden text-sm text-amber-100 mt-3">No se encontraron unidades con esa búsqueda</p><div id="topics-grid" class="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">${topics.map(topicCard).join("")}</div></section></div></section>${topicModal(topics[0])}<div id="blocked-toast" class="hidden fixed bottom-4 right-4 z-50 rounded-xl border border-amber-200/30 bg-amber-200/15 px-4 py-3 text-amber-100 font-semibold">Esta unidad se activará próximamente.</div>`);
  bindDashboardEvents();
}

function topicModal(topic) { return `<div id="topicModal" class="fixed inset-0 z-50 hidden overflow-y-auto"><div id="modal-backdrop" class="modal-backdrop fixed inset-0"></div><div class="min-h-full flex items-start justify-center px-4 py-6"><section class="modal-card w-full max-w-5xl mb-10 p-5 md:p-8"><button id="modal-close" aria-label="Cerrar modal" class="absolute right-4 top-4 h-10 w-10 rounded-full bg-white/10 text-white">×</button><p class="text-xs uppercase tracking-[.18em] text-cyan-100">${topic.unit}</p><h2 class="text-3xl font-black text-white mt-2">${topic.title}</h2><p class="section-subtitle mt-2">${topic.desc}</p><div class="grid md:grid-cols-2 gap-4 mt-6">
<button id="modal-slides" class="bento-action bento-slides p-5 text-left"><div class="flex items-start justify-between gap-3"><div class="bento-icon">📘</div></div><h3 class="bento-title">Slides y teoría</h3><p class="bento-desc">Repasa las presentaciones de la clase y el material teórico interactivo.</p><p class="bento-cta">Iniciar lectura →</p></button>
<button id="modal-game" class="bento-action bento-game p-5 text-left"><div class="flex items-start justify-between gap-3"><div class="bento-icon">🎮</div></div><h3 class="bento-title">Gamificación</h3><p class="bento-desc">Aprende jugando. Retos, quizzes interactivos y recompensas.</p><p class="bento-cta">Empezar a jugar →</p></button>
<button id="modal-homework" class="bento-action bento-homework p-5 text-left"><div class="flex items-start justify-between gap-3"><div class="bento-icon">📝</div><span class="bento-mini">Pendiente</span></div><h3 class="bento-title">Deber interactivo</h3><p class="bento-desc">Resuelve actividades prácticas y fortalece tus habilidades.</p><p class="bento-cta">Resolver deber →</p></button>
<button id="modal-results" class="bento-action bento-results p-5 text-left"><div class="flex items-start justify-between gap-3"><div class="bento-icon">📊</div><span class="bento-mini">Resumen</span></div><h3 class="bento-title">Resultados</h3><p class="bento-desc">Consulta tu progreso, desempeño y observaciones pedagógicas.</p><p class="bento-cta">Ver resultados →</p></button>
</div></section></div></div>`; }

function bindDashboardEvents() {
  const modal = document.getElementById("topicModal");
  const openModal = () => { modal?.classList.remove("hidden"); modal.scrollTop = 0; document.body.style.overflow = "hidden"; };
  const closeModal = () => { modal?.classList.add("hidden"); document.body.style.overflow = ""; };
  const showToast = () => { const t = document.getElementById("blocked-toast"); t?.classList.remove("hidden"); setTimeout(() => t?.classList.add("hidden"), 1800); };

  bindClick("#btn-open-active-topic", openModal); bindClick('[data-topic-id="ecuaciones-primer-grado"]', openModal);
  bindClick("#modal-close", closeModal); bindClick("#modal-backdrop", closeModal);
  bindClick("#btn-scroll-units", () => document.getElementById("units")?.scrollIntoView({ behavior: "smooth" }));
  bindClick("#modal-slides", () => { closeModal(); goToSlides(); }); bindClick("#modal-game", () => { closeModal(); goToGame(); });
  bindClick("#modal-homework", () => { closeModal(); goToHomework(); }); bindClick("#modal-results", () => { closeModal(); goToResults(); });

  document.querySelectorAll(".topic-card[data-topic-id]").forEach((card) => {
    if (card.getAttribute("data-topic-id") !== "ecuaciones-primer-grado") card.addEventListener("click", showToast);
  });

  const search = document.getElementById("topic-search");
  const empty = document.getElementById("empty-search");
  search?.addEventListener("input", () => {
    const term = search.value.trim().toLowerCase(); let visible = 0;
    document.querySelectorAll(".topic-card[data-topic-id]").forEach((card) => {
      const match = !term || card.textContent.toLowerCase().includes(term);
      card.classList.toggle("hidden", !match); if (match) visible += 1;
    });
    empty?.classList.toggle("hidden", visible !== 0);
  });
}

function layout(title, body) { return `${particles()}${topNav()}<div class="max-w-5xl mx-auto px-4 pt-24 pb-10 space-y-4"><button id="btn-back-dashboard" class="app-btn bg-white/10 text-white">← Volver al campus</button><section class="app-card p-6 rounded-3xl"><h1 class="screen-title">${title}</h1></section>${body}</div>`; }
function goToSlides() { const viewer = createSlideViewer({ slides: slidesPlantillaTema, onExit: () => goToDashboard(), onComplete: () => goToDashboard() }); viewer.repaint(); }
function goToGame() { renderView(layout("Zona de retos matemáticos", `${crearGameShell()} ${crearFeedbackBox("good", "Buen intento, vas por buen camino.")}`)); bindClick("#btn-back-dashboard", () => goToDashboard()); }
function goToHomework() { renderView(layout("Deber interactivo", `<section class="app-card p-6 rounded-3xl">${crearFeedbackBox("warn", "Revisa el procedimiento antes de continuar.")}</section>`)); bindClick("#btn-back-dashboard", () => goToDashboard()); }
function goToResults() { renderView(layout("Resultados", crearResultPanel())); bindClick("#btn-back-dashboard", () => goToDashboard()); }

export function iniciarApp() { goToWelcome(); }
