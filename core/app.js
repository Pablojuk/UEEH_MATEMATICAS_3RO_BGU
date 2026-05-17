import { renderView, bindClick } from "./navigation.js";
import { createSlideViewer } from "../components/slide-viewer.js";
import { slidesPlantillaTema } from "../topics/plantilla-tema/content.js";
import { obtenerDatosEstudiante } from "./storage.js";
import { crearFormularioEstudiante, activarFormularioEstudiante } from "../components/student-form.js";
import { crearGameShell } from "../components/game-shell.js";
import { crearResultPanel } from "../components/result-panel.js";
import { crearFeedbackBox } from "../components/feedback-box.js";

const topics = [
  {
    id: "ecuaciones-primer-grado",
    unit: "Unidad 1",
    title: "Ecuaciones de Primer Grado",
    desc: "Fundamentos algebraicos, despeje de incógnitas y resolución de problemas cotidianos.",
    icon: "ƒx",
    glow: "rgba(103,232,249,.38)",
    status: "Disponible",
    progress: 45,
    unlocked: true
  },
  {
    id: "funciones-lineales",
    unit: "Unidad 2",
    title: "Funciones Lineales",
    desc: "Interpretación de relaciones entre variables, pendiente y representación gráfica.",
    icon: "↗",
    glow: "rgba(167,139,250,.34)",
    status: "Próximamente",
    progress: 0,
    unlocked: false
  },
  {
    id: "sistemas-ecuaciones",
    unit: "Unidad 3",
    title: "Sistemas de Ecuaciones",
    desc: "Resolución de problemas mediante dos o más ecuaciones relacionadas.",
    icon: "≋",
    glow: "rgba(253,230,138,.28)",
    status: "Próximamente",
    progress: 0,
    unlocked: false
  },
  {
    id: "derivadas-basicas",
    unit: "Unidad 4",
    title: "Derivadas Básicas",
    desc: "Introducción a la tasa de cambio y análisis inicial de funciones.",
    icon: "dy",
    glow: "rgba(249,168,212,.26)",
    status: "Próximamente",
    progress: 0,
    unlocked: false
  },
  {
    id: "aplicaciones-derivadas",
    unit: "Unidad 5",
    title: "Aplicaciones de Derivadas",
    desc: "Máximos, mínimos y problemas de optimización con interpretación visual.",
    icon: "△",
    glow: "rgba(134,239,172,.28)",
    status: "Próximamente",
    progress: 0,
    unlocked: false
  },
  {
    id: "simulador-matematico",
    unit: "Repaso",
    title: "Simulador Matemático",
    desc: "Retos de repaso para fortalecer el razonamiento lógico y algebraico.",
    icon: "✓",
    glow: "rgba(96,165,250,.30)",
    status: "Próximamente",
    progress: 0,
    unlocked: false
  }
];

function particles() {
  return `
    <div class="math-particles" aria-hidden="true">
      <span class="particle text-4xl" style="left:8%; top:24%; --duration:10s; --delay:-1s; --x:26px; --y:-38px; --rotate:12deg;">∑</span>
      <span class="particle text-3xl" style="left:18%; top:68%; --duration:12s; --delay:-3s; --x:-32px; --y:28px; --rotate:-18deg;">π</span>
      <span class="particle text-5xl" style="left:35%; top:16%; --duration:13s; --delay:-5s; --x:38px; --y:30px; --rotate:22deg;">√</span>
      <span class="particle text-2xl" style="left:52%; top:76%; --duration:9s; --delay:-2s; --x:-24px; --y:-34px; --rotate:-8deg;">f(x)</span>
      <span class="particle text-4xl" style="left:72%; top:26%; --duration:11s; --delay:-4s; --x:30px; --y:42px; --rotate:16deg;">∆</span>
      <span class="particle text-3xl" style="left:86%; top:58%; --duration:14s; --delay:-6s; --x:-35px; --y:26px; --rotate:-24deg;">∞</span>
    </div>
  `;
}

function topNav(data = obtenerDatosEstudiante()) {
  const nombre = data?.nombre ? data.nombre.split(" ")[0] : "Estudiante";
  const inicial = nombre.charAt(0).toUpperCase() || "E";
  const curso = data?.curso || "Tercero BGU";
  const paralelo = data?.paralelo ? ` · Paralelo ${data.paralelo}` : "";

  return `
    <header class="glass-nav">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-200 via-sky-300 to-violet-300 flex items-center justify-center shadow-lg shadow-cyan-300/10 text-slate-950 text-xl font-black">∴</div>
          <div>
            <h1 class="font-extrabold tracking-tight text-white text-base md:text-xl">U.E. Emiliano Hinostroza</h1>
            <p class="text-xs md:text-sm text-cyan-100/62 font-semibold">Campus Matemático Digital · 3.º BGU</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-white/7 border border-white/10 text-cyan-100">✦</div>
          <div class="flex items-center gap-3 rounded-full bg-white/7 border border-white/10 px-3 py-2">
            <div class="text-right hidden md:block">
              <p class="text-sm font-bold text-white">${nombre}</p>
              <p class="text-xs text-cyan-100/56">${curso}${paralelo}</p>
            </div>
            <div class="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-200 to-violet-300 flex items-center justify-center font-black text-slate-950">${inicial}</div>
          </div>
        </div>
      </div>
    </header>
  `;
}

function layout(title, body, withBack = true) {
  return `
    ${particles()}
    ${topNav()}
    <div class="max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-12 space-y-4">
      ${withBack ? '<button id="btn-back-dashboard" class="app-btn bg-white/7 border border-white/10 text-white hover:bg-white/12">← Volver al campus</button>' : ""}
      <header class="app-card p-5 sm:p-8">
        <h1 class="screen-title">${title}</h1>
      </header>
      ${body}
    </div>
  `;
}

function goToWelcome() {
  renderView(`
    ${particles()}
    <section class="min-h-screen flex items-center px-4 py-10">
      <div class="max-w-6xl mx-auto w-full grid lg:grid-cols-[1.08fr_.92fr] gap-8 items-center">
        <div class="space-y-7">
          <div class="mission-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-cyan-100/88">✦ Plataforma educativa inmersiva</div>
          <div>
            <p class="text-cyan-100/70 font-black uppercase tracking-[.22em] text-sm">Unidad Educativa Emiliano Hinostroza</p>
            <h1 class="mt-4 text-4xl sm:text-5xl lg:text-7xl font-black leading-[.96] tracking-tight text-white">
              Academia Matemática
              <span class="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 via-sky-200 to-violet-200">Digital 3.º BGU</span>
            </h1>
            <p class="mt-6 text-base sm:text-lg text-slate-200/76 max-w-2xl leading-relaxed">Explora un campus oscuro, suave e inmersivo donde cada tema se convierte en una misión matemática visual.</p>
          </div>
          <div class="grid grid-cols-3 gap-3 max-w-xl text-center">
            <span class="rounded-2xl bg-white/7 border border-white/10 px-3 py-3 text-xs sm:text-sm font-black text-cyan-100">🎯 Retos</span>
            <span class="rounded-2xl bg-white/7 border border-white/10 px-3 py-3 text-xs sm:text-sm font-black text-violet-100">🎮 Juego</span>
            <span class="rounded-2xl bg-white/7 border border-white/10 px-3 py-3 text-xs sm:text-sm font-black text-emerald-100">🏆 Progreso</span>
          </div>
          <button id="btn-start" class="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-cyan-200 to-violet-300 px-7 py-4 font-black text-slate-950 shadow-2xl shadow-cyan-300/10 hover:scale-[1.02] transition">Iniciar aventura matemática</button>
        </div>
        <div class="hologram-card rounded-[2.25rem] p-6 sm:p-8">
          <div class="relative z-10 space-y-5">
            <div class="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-cyan-200 to-violet-300 flex items-center justify-center text-5xl shadow-xl shadow-cyan-300/10">∑</div>
            <h2 class="screen-title">Campus espacio-digital</h2>
            <p class="section-subtitle">Una experiencia visual para aprender matemáticas con slides, retos, deberes y resultados en un solo lugar.</p>
            <div class="progress-track-dark h-4 rounded-full overflow-hidden p-1"><div class="progress-glow h-full rounded-full" style="width:45%"></div></div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="rounded-2xl bg-white/7 border border-white/9 p-4"><p class="text-2xl font-black text-white">6</p><p class="text-xs font-bold text-slate-300">unidades</p></div>
              <div class="rounded-2xl bg-white/7 border border-white/9 p-4"><p class="text-2xl font-black text-white">4</p><p class="text-xs font-bold text-slate-300">módulos</p></div>
              <div class="rounded-2xl bg-white/7 border border-white/9 p-4"><p class="text-2xl font-black text-white">10</p><p class="text-xs font-bold text-slate-300">puntos</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `);
  bindClick("#btn-start", goToStudentForm);
}

function goToStudentForm() {
  renderView(`${particles()}<div class="min-h-screen flex items-center justify-center px-4 py-10">${crearFormularioEstudiante(goToDashboard)}</div>`);
  activarFormularioEstudiante(goToDashboard);
}

function topicCard(topic) {
  const statusClass = topic.unlocked ? "text-emerald-100 bg-emerald-200/10 border-emerald-100/14" : "text-slate-300 bg-white/7 border-white/9";
  const progressLabel = topic.progress > 0 ? "En curso" : "Bloqueado";
  const action = topic.unlocked ? "Abrir portal" : "Se activará después";

  return `
    <article class="planet-card ${topic.unlocked ? "cursor-pointer" : ""} p-6" data-topic-id="${topic.id}" style="--glow: ${topic.glow};">
      <div class="relative z-10 h-full flex flex-col">
        <div class="flex justify-between items-start gap-4">
          <div class="h-16 w-16 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center text-cyan-100 text-2xl font-black">${topic.icon}</div>
          <span class="rounded-full border px-3 py-1 text-xs font-black ${statusClass}">${topic.status}</span>
        </div>
        <div class="mt-7">
          <p class="text-xs font-black tracking-[.18em] uppercase text-cyan-100/64">${topic.unit}</p>
          <h4 class="mt-2 text-2xl font-black text-white">${topic.title}</h4>
          <p class="mt-3 text-sm leading-relaxed text-slate-400">${topic.desc}</p>
        </div>
        <div class="mt-auto pt-8">
          <div class="flex justify-between text-xs font-black text-slate-300 mb-2"><span>${progressLabel}</span><span>${topic.progress}%</span></div>
          <div class="progress-track-dark h-3 rounded-full overflow-hidden p-1"><div class="${topic.unlocked ? "progress-glow" : "bg-slate-600/70"} h-full rounded-full" style="width:${topic.progress}%"></div></div>
          <button type="button" class="${topic.unlocked ? "portal-button text-white" : "bg-white/5 border border-white/8 text-slate-400"} mt-5 w-full rounded-2xl px-4 py-3 font-black flex items-center justify-center gap-2">${action} ${topic.unlocked ? "→" : ""}</button>
        </div>
      </div>
    </article>
  `;
}

function topicModal(topic) {
  return `
    <div id="topicModal" class="fixed inset-0 z-50 hidden overflow-y-auto overscroll-contain">
      <div class="modal-backdrop absolute inset-0" id="modal-backdrop"></div>
      <div class="relative min-h-full flex items-start justify-center px-4 py-6 md:py-10">
        <section class="cinematic-modal w-full max-w-5xl rounded-[2.25rem] p-5 sm:p-8 lg:p-10 relative mb-10">
          <button id="modal-close" class="absolute right-5 top-5 h-11 w-11 rounded-full bg-white/7 border border-white/9 flex items-center justify-center text-white hover:bg-white/12 transition" aria-label="Cerrar modal">×</button>
          <div class="pr-12">
            <span class="inline-flex rounded-full bg-cyan-200/8 border border-cyan-100/14 px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-cyan-100">${topic.unit} · Portal activo</span>
            <h2 class="mt-5 text-3xl sm:text-5xl font-black text-white tracking-tight">${topic.title}</h2>
            <p class="mt-4 text-slate-300 text-base sm:text-lg max-w-3xl leading-relaxed">Selecciona una estación de aprendizaje. Cada una te llevará a una experiencia distinta: teoría visual, juego, deber evaluado o resultados.</p>
          </div>
          <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            <button id="modal-slides" class="bento-action rounded-[2rem] p-6 text-left" style="--bento-glow: radial-gradient(circle, rgba(103,232,249,.46), transparent 68%);"><div class="relative z-10"><div class="h-14 w-14 rounded-2xl bg-cyan-200/11 border border-cyan-100/14 flex items-center justify-center text-cyan-100 mb-5 text-2xl">▣</div><h3 class="text-2xl font-black text-white">Slides y teoría</h3><p class="mt-3 text-sm text-slate-400 leading-relaxed">Explora una explicación guiada con fórmulas, ejemplos y momentos DUA.</p><p class="mt-6 inline-flex items-center gap-2 font-black text-cyan-100">Iniciar lectura →</p></div></button>
            <button id="modal-game" class="bento-action rounded-[2rem] p-6 text-left" style="--bento-glow: radial-gradient(circle, rgba(167,139,250,.44), transparent 68%);"><div class="relative z-10"><div class="h-14 w-14 rounded-2xl bg-violet-200/11 border border-violet-100/14 flex items-center justify-center text-violet-100 mb-5 text-2xl">🎮</div><h3 class="text-2xl font-black text-white">Gamificación</h3><p class="mt-3 text-sm text-slate-400 leading-relaxed">Retos matemáticos, intentos, feedback positivo y recompensas visuales.</p><p class="mt-6 inline-flex items-center gap-2 font-black text-violet-100">Empezar reto →</p></div></button>
            <button id="modal-homework" class="bento-action rounded-[2rem] p-6 text-left" style="--bento-glow: radial-gradient(circle, rgba(253,230,138,.42), transparent 68%);"><div class="relative z-10"><div class="h-14 w-14 rounded-2xl bg-amber-200/11 border border-amber-100/14 flex items-center justify-center text-amber-100 mb-5 text-2xl">✎</div><h3 class="text-2xl font-black text-white">Deber interactivo</h3><p class="mt-3 text-sm text-slate-400 leading-relaxed">Práctica evaluada con intentos, retroalimentación y nota sobre 10.</p><p class="mt-6 inline-flex items-center gap-2 font-black text-amber-100">Abrir práctica →</p></div></button>
            <button id="modal-results" class="bento-action rounded-[2rem] p-6 text-left" style="--bento-glow: radial-gradient(circle, rgba(134,239,172,.42), transparent 68%);"><div class="relative z-10"><div class="h-14 w-14 rounded-2xl bg-emerald-200/11 border border-emerald-100/14 flex items-center justify-center text-emerald-100 mb-5 text-2xl">↗</div><h3 class="text-2xl font-black text-white">Resultados</h3><p class="mt-3 text-sm text-slate-400 leading-relaxed">Visualiza desempeño, nota final, nivel y observación pedagógica.</p><p class="mt-6 inline-flex items-center gap-2 font-black text-emerald-100">Ver panel →</p></div></button>
          </div>
        </section>
      </div>
    </div>
  `;
}

function goToDashboard(data = obtenerDatosEstudiante()) {
  const nombre = data?.nombre ? data.nombre.split(" ")[0] : "Estudiante";
  const curso = data?.curso || "Tercero BGU";
  const paralelo = data?.paralelo ? `Paralelo ${data.paralelo}` : "Paralelo";
  const activeTopic = topics[0];

  renderView(`
    ${particles()}
    ${topNav(data)}
    <div class="cinema-shell">
      <section class="orbital-hero">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div class="grid lg:grid-cols-[1.12fr_.88fr] gap-10 items-center">
            <div>
              <div class="mission-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-cyan-100/88 mb-7">✦ Misión activa: Exploración algebraica</div>
              <h2 class="text-4xl sm:text-5xl lg:text-7xl font-black leading-[.96] tracking-tight text-white">Matemáticas en modo <span class="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 via-sky-200 to-violet-200">espacio digital</span></h2>
              <p class="mt-6 text-base sm:text-lg lg:text-xl text-slate-200/76 max-w-2xl leading-relaxed">Hola, <strong>${nombre}</strong>. Ingresa a un campus inmersivo donde cada unidad es un planeta, cada reto desbloquea progreso y cada fórmula se convierte en una misión visual.</p>
              <div class="mt-8 flex flex-col sm:flex-row gap-3"><button id="btn-open-active-topic" class="rounded-2xl bg-gradient-to-r from-cyan-200 to-violet-300 px-6 py-4 font-black text-slate-950 shadow-2xl shadow-cyan-300/10 hover:scale-[1.02] transition">Abrir unidad activa</button><button id="btn-scroll-units" class="rounded-2xl border border-white/12 bg-white/7 px-6 py-4 font-bold text-white hover:bg-white/11 transition">Ver ruta de aprendizaje</button></div>
            </div>
            <div class="hologram-card rounded-[2.25rem] p-6 sm:p-8"><div class="relative z-10"><div class="flex items-start justify-between gap-5"><div><p class="text-sm font-bold text-cyan-100/62">Progreso de misión</p><h3 class="mt-1 text-3xl font-black text-white">Nivel Explorador</h3><p class="mt-2 text-sm text-slate-300">${curso} · ${paralelo}</p></div><div class="relative h-24 w-24 rounded-full bg-slate-950/42 border border-cyan-100/16 flex items-center justify-center"><div class="absolute inset-2 rounded-full border-4 border-cyan-200/14"></div><div class="absolute inset-2 rounded-full border-4 border-t-cyan-200 border-r-violet-200 border-b-transparent border-l-transparent rotate-45"></div><span class="text-2xl font-black text-white">45%</span></div></div><div class="mt-7 progress-track-dark h-4 rounded-full overflow-hidden p-1"><div class="progress-glow h-full rounded-full" style="width:45%"></div></div><div class="mt-6 grid grid-cols-3 gap-3"><div class="rounded-2xl bg-white/7 border border-white/9 p-4 text-center"><p class="text-2xl font-black text-white">12</p><p class="text-xs font-bold text-slate-300">medallas</p></div><div class="rounded-2xl bg-white/7 border border-white/9 p-4 text-center"><p class="text-2xl font-black text-white">4</p><p class="text-xs font-bold text-slate-300">retos</p></div><div class="rounded-2xl bg-white/7 border border-white/9 p-4 text-center"><p class="text-2xl font-black text-white">8.7</p><p class="text-xs font-bold text-slate-300">nota</p></div></div><div class="mt-5 rounded-2xl bg-cyan-200/8 border border-cyan-100/14 p-4 flex items-center gap-3"><div class="h-11 w-11 rounded-xl bg-amber-200 flex items-center justify-center text-slate-950 font-black">★</div><div><p class="font-black text-white">Insignia desbloqueada</p><p class="text-sm text-slate-300">Despeje algebraico inicial</p></div></div></div></div>
          </div>
        </div>
      </section>
      <main id="units" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 relative z-20 pb-24">
        <section class="rounded-[2rem] bg-slate-950/62 border border-white/9 backdrop-blur-2xl p-4 sm:p-6 lg:p-8 shadow-2xl shadow-black/24">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-8"><div><p class="text-cyan-100/82 text-sm font-black uppercase tracking-[.2em]">Sistema planetario de aprendizaje</p><h3 class="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">Unidades de estudio</h3><p class="mt-2 text-slate-400 max-w-2xl">Selecciona un planeta matemático para abrir sus slides, retos, deberes y resultados.</p></div><div class="relative w-full lg:w-96"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-100/42">⌕</span><input id="topic-search" class="search-field w-full rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder:text-slate-500" placeholder="Buscar unidad, tema o reto..." /></div></div>
          <div id="topics-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">${topics.map(topicCard).join("")}</div>
        </section>
      </main>
      ${topicModal(activeTopic)}
    </div>
  `);

  bindDashboardEvents();
}

function bindDashboardEvents() {
  const openModal = () => {
    const modal = document.getElementById("topicModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.scrollTop = 0;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    const modal = document.getElementById("topicModal");
    if (!modal) return;
    modal.classList.add("hidden");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  };

  bindClick("#btn-open-active-topic", openModal);
  bindClick('[data-topic-id="ecuaciones-primer-grado"]', openModal);
  bindClick("#modal-close", closeModal);
  bindClick("#modal-backdrop", closeModal);
  bindClick("#btn-scroll-units", () => document.getElementById("units")?.scrollIntoView({ behavior: "smooth" }));
  bindClick("#modal-slides", () => { closeModal(); goToSlides(); });
  bindClick("#modal-game", () => { closeModal(); goToGame(); });
  bindClick("#modal-homework", () => { closeModal(); goToHomework(); });
  bindClick("#modal-results", () => { closeModal(); goToResults(); });

  document.querySelectorAll(".planet-card[data-topic-id]").forEach((card) => {
    const id = card.getAttribute("data-topic-id");
    if (id !== "ecuaciones-primer-grado") {
      card.addEventListener("click", () => alert("Esta unidad se activará próximamente."));
    }
  });

  const search = document.getElementById("topic-search");
  search?.addEventListener("input", () => {
    const term = search.value.trim().toLowerCase();
    document.querySelectorAll(".planet-card[data-topic-id]").forEach((card) => {
      const text = card.textContent.toLowerCase();
      card.classList.toggle("hidden", term && !text.includes(term));
    });
  });
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
  renderView(layout("Zona de retos matemáticos", `${crearGameShell()} ${crearFeedbackBox("good", "Buen intento, vas por buen camino.")}`));
  bindClick("#btn-back-dashboard", () => goToDashboard());
}

function goToHomework() {
  renderView(
    layout(
      "Deber interactivo",
      `<section class="app-card p-5 sm:p-8 space-y-4"><div class="inline-flex items-center rounded-full bg-amber-200/10 border border-amber-100/14 px-3 py-1 text-xs font-black text-amber-100">✎ Deber</div><h2 class="screen-title mt-2">Área de práctica evaluada</h2><p class="section-subtitle">Próximamente se habilitarán actividades calificadas por competencias, con intentos, retroalimentación y nota sobre 10.</p>${crearFeedbackBox("warn", "Revisa el procedimiento antes de continuar.")}</section>`
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
