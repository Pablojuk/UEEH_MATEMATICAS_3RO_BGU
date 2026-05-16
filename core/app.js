import { renderView, bindClick } from "./navigation.js";
import { obtenerDatosEstudiante } from "./storage.js";
import { crearFormularioEstudiante, activarFormularioEstudiante } from "../components/student-form.js";
import { crearSlideViewer } from "../components/slide-viewer.js";
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
    <section class="app-card p-6 sm:p-10 text-center">
      <p class="text-sm font-semibold uppercase tracking-wide text-blue-600">Plataforma educativa</p>
      <h1 class="screen-title mt-2">Matemáticas de Tercero de BGU</h1>
      <p class="mt-3 text-slate-600">Una experiencia tipo app, moderna y pensada para estudiantes.</p>
      <button id="btn-start" class="app-btn mt-6 bg-blue-600 text-white">Empezar</button>
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
        <p>${saludo}</p>
        ${crearFeedbackBox("great", "Excelente inicio, continúa con el siguiente reto.")}
        <div class="grid gap-3 sm:grid-cols-2">
          <button id="btn-slides" class="app-btn bg-indigo-600 text-white">Ir a Slides</button>
          <button id="btn-game" class="app-btn bg-violet-600 text-white">Ir a Juego</button>
          <button id="btn-homework" class="app-btn bg-cyan-600 text-white">Ir a Deber</button>
          <button id="btn-results" class="app-btn bg-emerald-600 text-white">Ir a Resultados</button>
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
  renderView(layout("Slides", crearSlideViewer()));
  bindClick("#btn-back-dashboard", () => goToDashboard());
}

function goToGame() {
  renderView(layout("Juego", `${crearGameShell()} ${crearFeedbackBox("good", "Buen intento, vas por buen camino.")}`));
  bindClick("#btn-back-dashboard", () => goToDashboard());
}

function goToHomework() {
  renderView(
    layout(
      "Deber interactivo (Placeholder)",
      `<section class="app-card p-5 sm:p-8 space-y-3"><p class="text-slate-700">Próximamente: deber evaluado por competencias.</p>${crearFeedbackBox("warn", "Revisa el procedimiento antes de continuar.")}</section>`
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
