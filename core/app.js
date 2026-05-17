import { renderView, bindClick } from "./navigation.js";
import { createSlideViewer } from "../components/slide-viewer.js";
import { slidesPlantillaTema } from "../topics/plantilla-tema/content.js";
import { obtenerDatosEstudiante } from "./storage.js";
import { crearFormularioEstudiante, activarFormularioEstudiante } from "../components/student-form.js";
import { crearGameShell } from "../components/game-shell.js";
import { crearResultPanel } from "../components/result-panel.js";

function layout(title, body, withBack = true) {
  return `<div class="space-y-4">${withBack ? '<button id="btn-back-dashboard" class="app-btn bg-white/90 border border-white/40 text-slate-800">← Volver al panel</button>' : ""}<header class="app-card p-5 sm:p-8"><h1 class="screen-title text-white">${title}</h1></header>${body}</div>`;
}

function goToWelcome() {
  renderView(`
    <section class="app-card overflow-hidden p-6 sm:p-10 text-center relative">
      <div class="hero-symbol">∑</div><div class="hero-symbol">π</div><div class="hero-symbol">√x</div><div class="hero-symbol">∞</div>
      <p class="inline-flex hero-badge px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-100">Unidad Educativa Emiliano Hinostroza</p>
      <div class="mx-auto mt-4 h-16 w-16 rounded-2xl border border-white/30 bg-white/10 grid place-items-center text-xs font-bold text-white">Escudo UEEH</div>
      <h1 class="screen-title mt-4 text-white">Academia Matemática 3.º BGU</h1>
      <p class="mt-3 section-subtitle">Activa tu misión galáctica: domina ecuaciones y sube de nivel paso a paso.</p>
      <div class="mt-6 grid grid-cols-2 gap-2 text-xs font-semibold text-white sm:grid-cols-4">
        <span class="hero-badge px-2 py-2">🎯 Retos</span><span class="hero-badge px-2 py-2">🎮 Juegos</span><span class="hero-badge px-2 py-2">📝 Deber</span><span class="hero-badge px-2 py-2">📊 Resultados</span>
      </div>
      <button id="btn-start" class="app-btn mt-7 bg-cyan-400 text-slate-900">Iniciar aventura matemática</button>
    </section>
  `);
  bindClick("#btn-start", goToStudentForm);
}

function goToStudentForm() {
  renderView(layout("Credencial de ingreso", crearFormularioEstudiante(goToDashboard), false));
  activarFormularioEstudiante(goToDashboard);
}

function goToDashboard(data = obtenerDatosEstudiante()) {
  const saludo = data ? `Hola, <strong>${data.nombre}</strong> · ${data.curso} "${data.paralelo}"` : "Completa tus datos para personalizar la misión.";
  renderView(layout("Mapa de aprendizaje", `
    <section class="app-card p-5 sm:p-8 space-y-4">
      <div class="rounded-2xl border border-cyan-300/40 bg-gradient-to-r from-cyan-600/50 via-indigo-500/40 to-violet-500/50 p-4 text-white">
        <p class="text-sm opacity-90">Misión actual: Ecuaciones de primer grado</p>
        <p class="mt-1 text-base font-semibold">${saludo}</p>
        <div class="mt-3 progress-track" aria-label="Progreso simulado"><div class="progress-bar" style="width:32%"></div></div>
        <p class="mt-2 text-xs text-cyan-100">Progreso visual estimado: 32% · ¡Cada paso cuenta!</p>
      </div>
      <div class="nav-grid">
        <button id="btn-slides" class="nav-card gradient-slides"><span class="nav-card__title">📘 Slides</span><span class="nav-card__desc">Explicaciones por momentos de clase y DUA.</span><span class="nav-card__status">Estado: Disponible</span></button>
        <button id="btn-game" class="nav-card gradient-game"><span class="nav-card__title">🎮 Juego</span><span class="nav-card__desc">Zona de retos matemáticos y recompensas.</span><span class="nav-card__status">Estado: Próximamente</span></button>
        <button id="btn-homework" class="nav-card gradient-homework"><span class="nav-card__title">📝 Deber</span><span class="nav-card__desc">Práctica evaluada por pasos guiados.</span><span class="nav-card__status">Estado: En preparación</span></button>
        <button id="btn-results" class="nav-card gradient-results"><span class="nav-card__title">📊 Resultados</span><span class="nav-card__desc">Tablero académico y observaciones.</span><span class="nav-card__status">Estado: Vista previa</span></button>
      </div>
    </section>
  `, false));
  bindClick("#btn-slides", goToSlides); bindClick("#btn-game", goToGame); bindClick("#btn-homework", goToHomework); bindClick("#btn-results", goToResults);
}

function goToSlides() { createSlideViewer({ slides: slidesPlantillaTema, onExit: () => goToDashboard(), onComplete: () => goToDashboard() }).repaint(); }
function goToGame() { renderView(layout("Zona de Retos Matemáticos", crearGameShell())); bindClick("#btn-back-dashboard", () => goToDashboard()); }
function goToHomework() {
  renderView(layout("Zona de práctica evaluada", `<section class="app-card p-5 sm:p-8 space-y-4"><div class="hero-badge inline-flex items-center px-3 py-1 text-xs font-bold text-cyan-100">📝 Deber guiado</div><h2 class="screen-title text-white mt-2">Entrenamiento académico en construcción</h2><p class="section-subtitle">Esta estación habilitará ejercicios por competencias con retroalimentación pedagógica.</p><div class="metric-card"><p class="font-semibold">1) Lee el reto</p><p class="font-semibold">2) Resuelve paso a paso</p><p class="font-semibold">3) Revisa retroalimentación</p><p class="mt-2 text-sm text-amber-200">Intentos máximos por activar en próxima fase.</p></div><p class="text-sm text-cyan-100">Próximamente se activará la práctica evaluada.</p></section>`));
  bindClick("#btn-back-dashboard", () => goToDashboard());
}
function goToResults() { renderView(layout("Resultados", crearResultPanel())); bindClick("#btn-back-dashboard", () => goToDashboard()); }
export function iniciarApp() { goToWelcome(); }
