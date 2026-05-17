export function crearGameShell() {
  return `
    <section class="app-card p-6 rounded-3xl">
      <div class="inline-flex items-center rounded-full bg-violet-200/10 border border-violet-100/20 px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-violet-100">🎮 Gamificación</div>
      <h2 class="screen-title mt-4">Portal de retos</h2>
      <p class="mt-2 section-subtitle">Próximamente se activarán misiones matemáticas con intentos, medallas y progreso visual.</p>
      <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="rounded-xl bg-white/5 border border-white/10 p-4 text-center"><p class="text-2xl font-black">3</p><p class="text-xs text-slate-300">intentos</p></div>
        <div class="rounded-xl bg-white/5 border border-white/10 p-4 text-center"><p class="text-2xl font-black">10</p><p class="text-xs text-slate-300">puntos</p></div>
        <div class="rounded-xl bg-white/5 border border-white/10 p-4 text-center"><p class="text-2xl font-black">★</p><p class="text-xs text-slate-300">insignias</p></div>
      </div>
    </section>
  `;
}
