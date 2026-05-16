import { renderView, bindClick } from "./navigation.js";
import { createSlideViewer } from "../components/slide-viewer.js";
import { slidesPlantillaTema } from "../topics/plantilla-tema/content.js";
import { obtenerDatosEstudiante } from "./storage.js";
import { crearFormularioEstudiante, activarFormularioEstudiante } from "../components/student-form.js";
import { crearGameShell } from "../components/game-shell.js";
import { crearResultPanel } from "../components/result-panel.js";
import { crearFeedbackBox } from "../components/feedback-box.js";

function layout(title, body, withBack = true) {
  return `
    <div class="space-y-4">
      ${withBack ? '<button id="btn-back-dashboard" class="app-btn bg-white border border-slate-300 text-slate-700">← Volver al panel</button>' : ""}
      <header class="app-card p-5 sm:p-8">
        <h1 class="screen-title text-slate-900">${title}</h1>
      </header>
      ${body}
    </div>
  `;
}

function goToWelcome() {
  renderView(`
    <section class="app-card overflow-hidden p-6 sm:p-10 text-center relative">
      <div class="absolute -top-6 -right-5 text-5xl opacity-20">📐</div>
      <div class="absolute -bottom-8 -left-4 text-6xl opacity-15">➗</div>
      <p class="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">Plataforma educativa</p>
      <h1 class="screen-title mt-3">Matemáticas de Tercero de BGU</h1>
      <p class="mt-3 section-subtitle">Aprende con una experiencia visual, guiada y hecha para avanzar paso a paso.</p>
      <div class="mt-6 grid grid-cols-3 gap-2 text-xs font-semibold text-slate-600">
        <span class="rounded-lg bg-slate-100 px-2 py-2">🎯 Retos</span>
        <span class="rounded-lg bg-slate-100 px-2 py-2">🧠 Práctica</span>
        <span class="rounded-lg bg-slate-100 px-2 py-2">🏆 Progreso</span>
      </div>
      <button id="btn-start" class="app-btn mt-6 bg-blue-600 text-white">Comenzar</button>
    </section>
  `);
  bindClick("#btn-start", goToStudentForm);
}

function goToStudentForm() {
  renderView(layout("Registro inicial", crearFormularioEstudiante(goToDashboard), false));
  activarFormularioEstudiante(goToDashboard);
}

function goToDashboard(data = obtenerDatosEstudiante()) {
  const saludo = data
    ? `Hola, <strong>${data.nombre}</strong>. Curso: <strong>${data.curso}</strong>. Paralelo: <strong>${data.paralelo}</strong>.`
    : "Completa tus datos para personalizar la experiencia.";

  renderView(
    layout(
      "Panel principal",
      `
      <section class="app-card p-5 sm:p-8 space-y-4">
        <div class="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
          <p class="text-sm opacity-90">Tu espacio de aprendizaje</p>
          <p class="mt-1 text-base font-semibold">${saludo}</p>
        </div>
        ${crearFeedbackBox("great", "Excelente inicio, continúa con el siguiente reto.")}
        <div class="nav-grid">
          <button id="btn-slides" class="nav-card gradient-slides"><span class="nav-card__title">📘 Slides</span><span class="nav-card__desc">Explicaciones visuales e interactivas.</span></button>
          <button id="btn-game" class="nav-card gradient-game"><span class="nav-card__title">🎮 Juego</span><span class="nav-card__desc">Zona de retos matemáticos.</span></button>
          <button id="btn-homework" class="nav-card gradient-homework"><span class="nav-card__title">📝 Deber</span><span class="nav-card__desc">Área de práctica evaluada.</span></button>
          <button id="btn-results" class="nav-card gradient-results"><span class="nav-card__title">📊 Resultados</span><span class="nav-card__desc">Panel de resultados y retroalimentación.</span></button>
        </div>
      </section>
    `,
      false
    )
  );

  bindClick("#btn-slides", goToSlides);
  bindClick("#btn-game", goToGame);
  bindClick("#btn-homework", goToHomework);
  bindClick("#btn-results", goToResults);
}

function goToSlides() {
  const viewer = createSlideViewer({
    slides: slidesPlantillaTema,
    onExit: () => goToDashboard(),
    onComplete: () => goToDashboard()
  });

  viewer.repaint();
}

function goToGame() {
  renderView(layout("Juego", `${crearGameShell()} ${crearFeedbackBox("good", "Buen intento, vas por buen camino.")}`));
  bindClick("#btn-back-dashboard", () => goToDashboard());
}

function goToHomework() {
  renderView(
    layout(
      "Deber interactivo (Placeholder)",
      `<section class="app-card p-5 sm:p-8 space-y-3"><div class="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700">📝 Deber</div><h2 class="screen-title mt-2">Área de práctica evaluada</h2><p class="section-subtitle">Próximamente se habilitarán actividades calificadas por competencias.</p>${crearFeedbackBox("warn", "Revisa el procedimiento antes de continuar.")}</section>`
    )
  );
  bindClick("#btn-back-dashboard", () => goToDashboard());
}

function goToResults() {
  renderView(layout("Resultados", crearResultPanel()));
  bindClick("#btn-back-dashboard", () => goToDashboard());
}

export function iniciarApp() {
  goToWelcome();
}
