export function crearGameShell() {
  return `
    <section class="app-card p-5 sm:p-8 space-y-4">
      <div class="inline-flex hero-badge items-center px-3 py-1 text-xs font-bold text-violet-100">🎮 Zona de Retos Matemáticos</div>
      <h2 class="screen-title text-white">Módulo de juego en despliegue</h2>
      <p class="section-subtitle">Próximamente se activarán los retos interactivos con puntajes, energía y recompensas.</p>
      <div class="metric-card">
        <p class="text-sm text-cyan-100">Energía de misión (visual)</p>
        <div class="progress-track mt-2"><div class="progress-bar" style="width:48%"></div></div>
        <p class="mt-2 text-xs text-cyan-100">Reserva activa: 48%</p>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <article class="metric-card"><p class="font-bold">🛰️ Misión 1</p><p class="text-sm text-slate-200">Reconocimiento algebraico</p></article>
        <article class="metric-card"><p class="font-bold">🌌 Misión 2</p><p class="text-sm text-slate-200">Portal de ecuaciones</p></article>
        <article class="metric-card"><p class="font-bold">🏆 Recompensa</p><p class="text-sm text-slate-200">Insignia Explorador Lógico</p></article>
      </div>
    </section>
  `;
}
