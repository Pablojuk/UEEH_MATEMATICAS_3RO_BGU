import { renderMathInElementSafe, bindClick } from "../core/navigation.js";

function getTagClass(label) {
  if (label === "Anticipación") return "tag tag--anticipacion";
  if (label === "Construcción") return "tag tag--construccion";
  return "tag tag--consolidacion";
}

function renderFormulaBlock(formula) {
  if (!formula) return "";
  return `<div class="slide-formula" data-formula>${formula}</div>`;
}

function renderInteraction(slide) {
  if (slide.tipo !== "interaccion") return "";
  return `
    <div class="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
      <p class="text-sm font-semibold text-indigo-900">¿Qué observas en la expresión?</p>
      <div class="mt-2 flex flex-col gap-2">
        <button type="button" class="mini-answer" data-answer="1">Primero identifico los elementos de la expresión.</button>
        <button type="button" class="mini-answer" data-answer="2">Busco una relación entre datos y operaciones.</button>
      </div>
      <p id="mini-feedback" class="mt-2 hidden text-sm font-semibold text-indigo-700"></p>
    </div>
  `;
}

export function createSlideViewer({ slides = [], onExit, onComplete }) {
  let currentIndex = 0;

  function buildSlideHTML() {
    const total = slides.length;
    const slide = slides[currentIndex];
    const progress = Math.round(((currentIndex + 1) / total) * 100);

    return `
      <section class="app-card p-5 sm:p-8 space-y-4">
        <div class="flex items-center justify-between gap-2">
          <div class="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">📘 Slides interactivas</div>
          <p class="text-xs font-semibold text-slate-500">Slide ${currentIndex + 1} de ${total}</p>
        </div>

        <div class="progress-track" aria-label="Progreso de slides">
          <div class="progress-bar" style="width:${progress}%"></div>
        </div>

        <article class="slide-stage">
          <header class="space-y-2">
            <div class="flex flex-wrap gap-2">
              <span class="${getTagClass(slide.momento)}">${slide.momento}</span>
              <span class="tag tag--dua">DUA: ${slide.dua}</span>
            </div>
            <h2 class="screen-title">${slide.icono ? `${slide.icono} ` : ""}${slide.titulo}</h2>
            ${slide.subtitulo ? `<p class="section-subtitle">${slide.subtitulo}</p>` : ""}
          </header>

          <div class="mt-4 space-y-3">
            <p class="text-slate-700">${slide.contenido || ""}</p>
            ${renderFormulaBlock(slide.formula)}
            ${renderInteraction(slide)}
            ${slide.ayuda ? `<p class="help-note">${slide.ayuda}</p>` : ""}
          </div>
        </article>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button id="slide-prev" class="app-btn bg-slate-200 text-slate-800" ${currentIndex === 0 ? "disabled" : ""} aria-label="Ir a la slide anterior">Anterior</button>
          <button id="slide-next" class="app-btn bg-indigo-600 text-white" ${currentIndex === total - 1 ? "disabled" : ""} aria-label="Ir a la slide siguiente">Siguiente</button>
          <button id="slide-exit" class="app-btn bg-white border border-slate-300 text-slate-700" aria-label="Volver al panel principal">Volver al panel</button>
        </div>

        ${currentIndex === total - 1 ? '<button id="slide-complete" class="app-btn bg-emerald-600 text-white" aria-label="Ir al siguiente módulo">Ir al siguiente módulo</button>' : ""}
      </section>
    `;
  }

  async function repaint() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = buildSlideHTML();
    await renderMathInElementSafe(app);

    bindClick("#slide-prev", () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        repaint();
      }
    });

    bindClick("#slide-next", () => {
      if (currentIndex < slides.length - 1) {
        currentIndex += 1;
        repaint();
      }
    });

    bindClick("#slide-exit", onExit);
    bindClick("#slide-complete", onComplete);

    document.querySelectorAll(".mini-answer").forEach((button) => {
      button.addEventListener("click", () => {
        const feedback = document.getElementById("mini-feedback");
        if (!feedback) return;
        feedback.classList.remove("hidden");
        feedback.textContent = button.dataset.answer === "1"
          ? "Excelente observación. Vas por buen camino."
          : "Muy bien, ahora conecta esta idea con el ejemplo.";
      });
    });
  }

  return { repaint };
}
