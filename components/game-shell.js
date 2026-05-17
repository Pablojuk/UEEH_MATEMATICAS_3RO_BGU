export function crearGameShell() {
  return `
    <section class="app-card p-5 sm:p-8">
      <div class="relative z-10">
        <div class="inline-flex items-center rounded-full bg-violet-200/10 border border-violet-100/14 px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-violet-100">🎮 Zona de retos</div>
        <h2 class="screen-title mt-4">Portal de gamificación</h2>
        <p class="mt-3 section-subtitle">Próximamente se activarán misiones matemáticas con intentos, retroalimentación positiva, medallas y progreso visual.</p>

        <div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="rounded-2xl bg-white/7 border border-white/9 p-4 text-center">
            <p class="text-3xl font-black text-white">3</p>
            <p class="text-xs font-bold text-slate-300">intentos por reto</p>
          </div>
          <div class="rounded-2xl bg-white/7 border border-white/9 p-4 text-center">
            <p class="text-3xl font-black text-white">10</p>
            <p class="text-xs font-bold text-slate-300">puntaje máximo</p>
          </div>
          <div class="rounded-2xl bg-white/7 border border-white/9 p-4 text-center">
            <p class="text-3xl font-black text-white">★</p>
            <p class="text-xs font-bold text-slate-300">medallas</p>
          </div>
        </div>

        <div class="mt-6 rounded-[2rem] border border-violet-100/14 bg-violet-200/8 p-5">
          <p class="font-black text-violet-100">Modo juego en construcción</p>
          <p class="mt-2 text-sm leading-relaxed text-slate-300">En la siguiente fase este espacio se convertirá en una aventura interactiva para resolver ecuaciones paso a paso.</p>
        </div>
      </div>
    </section>
  `;
}
