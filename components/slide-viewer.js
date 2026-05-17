import { renderMathInElementSafe, bindClick } from "../core/navigation.js";

const momentClass = {
  "Anticipación": "moment-tag--anticipacion",
  "Construcción": "moment-tag--construccion",
  "Consolidación": "moment-tag--consolidacion"
};

const duaClass = {
  "Compromiso": "dua-tag--compromiso",
  "Representación": "dua-tag--representacion",
  "Acción y expresión": "dua-tag--accion"
};

function toArray(dua) {
  if (Array.isArray(dua)) return dua;
  if (!dua) return [];
  return [dua];
}

export function createSlideViewer({ slides = [], onExit, onComplete }) {
  let currentIndex = 0;

  function buildSlideHTML() {
    const total = slides.length;
    const slide = slides[currentIndex] || {};
    const progress = Math.round(((currentIndex + 1) / total) * 100);
    const momento = slide.momento || slide.moment || "Construcción";
    const duaList = toArray(slide.dua);
    const titulo = slide.titulo || slide.title || "";
    const subtitulo = slide.subtitulo || slide.subtitle || "";
    const contenido = slide.contenido || slide.content || "";
    const formula = slide.formula || "";
    const actividad = slide.actividad || slide.activity || "";
    const visual = slide.visual || slide.icono || "";
    const notaDocente = slide.notaDocente || slide.teacherNote || slide.ayuda || "";

    return `
      <section class="slide-viewer-shell">
        <header class="slide-viewer-header">
          <button id="slide-exit" class="slide-viewer-exit">← Volver al campus</button>
          <div class="slide-viewer-head-right">
            <span class="moment-tag ${momentClass[momento] || "moment-tag--construccion"}">${momento}</span>
            <span class="slide-viewer-counter">${currentIndex + 1} / ${total}</span>
          </div>
        </header>

        <div class="slide-viewer-progress"><div class="slide-viewer-progress-bar" style="width:${progress}%"></div></div>

        <article class="slide-viewer-card slide-viewer-animate" id="lesson-slide-container">
          <div class="slide-viewer-content">
            ${visual ? `<div class="lesson-slide-visual">${visual}</div>` : ""}
            ${subtitulo ? `<p class="lesson-slide-subtitle">${subtitulo}</p>` : ""}
            <h2 class="lesson-slide-title">${titulo}</h2>
            ${contenido ? `<div class="lesson-slide-copy">${contenido}</div>` : ""}
            ${formula ? `<div class="slide-formula lesson-slide-formula">${formula}</div>` : ""}
            ${actividad ? `<div class="lesson-slide-activity">${actividad}</div>` : ""}
          </div>
          ${notaDocente ? `<aside class="lesson-slide-note"><strong>💡 Nota docente:</strong> ${notaDocente}</aside>` : ""}
        </article>

        <footer class="slide-viewer-footer">
          <div class="dua-tags-wrap">
            ${duaList.map((d) => `<span class="dua-tag ${duaClass[d] || "dua-tag--compromiso"}">DUA: ${d}</span>`).join("")}
          </div>
          <div class="slide-viewer-nav">
            <button id="slide-prev" class="slide-viewer-btn slide-viewer-btn--ghost" ${currentIndex === 0 ? "disabled" : ""}>Anterior</button>
            <button id="slide-next" class="slide-viewer-btn slide-viewer-btn--primary" ${currentIndex === total - 1 ? "disabled" : ""}>Siguiente</button>
          </div>
        </footer>

        ${currentIndex === total - 1 ? '<button id="slide-complete" class="slide-viewer-btn slide-viewer-btn--success">Ir al siguiente módulo</button>' : ""}
      </section>
    `;
  }

  function bindInteractions(app) {
    app.querySelectorAll("[data-action='quiz']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const wrap = btn.closest("[data-quiz]");
        if (!wrap) return;
        const feedback = wrap.querySelector("[data-quiz-feedback]");
        wrap.querySelectorAll("[data-action='quiz']").forEach((option) => {
          option.disabled = true;
          option.classList.add("is-disabled");
        });
        btn.classList.remove("is-disabled");

        const ok = btn.dataset.correct === "true";
        if (ok) btn.classList.add("is-correct");
        else btn.classList.add("is-wrong");

        if (feedback) {
          feedback.classList.remove("hidden");
          feedback.classList.toggle("feedback--good", ok);
          feedback.classList.toggle("feedback--warn", !ok);
          feedback.textContent = `${ok ? "✅" : "❌"} ${btn.dataset.feedback || ""}`;
        }
      });
    });

    app.querySelectorAll("[data-action='toggle-hint']").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const target = app.querySelector(`#${btn.dataset.target}`);
        if (!target) return;
        target.classList.toggle("hidden");
        await renderMathInElementSafe(target);
      });
    });
  }

  function bindKeyboard() {
    document.onkeydown = (event) => {
      if (event.key === "ArrowRight") document.getElementById("slide-next")?.click();
      if (event.key === "ArrowLeft") document.getElementById("slide-prev")?.click();
    };
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

    bindClick("#slide-exit", () => {
      document.onkeydown = null;
      onExit?.();
    });
    bindClick("#slide-complete", onComplete);

    bindInteractions(app);
    bindKeyboard();
  }

  return { repaint };
}
