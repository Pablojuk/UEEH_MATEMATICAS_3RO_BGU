export function crearGameShell() {
  return `
    <section class="app-card p-6 sm:p-8">
      <div class="inline-flex items-center rounded-full bg-violet-50 text-violet-600 px-3 py-1 text-xs font-bold">
        🎮 Gamificación
      </div>

      <h2 class="heading-font text-2xl font-bold text-moodle-text-blue mt-4">
        Portal de retos matemáticos
      </h2>

      <p class="section-subtitle mt-2">
        Próximamente se activarán juegos interactivos para practicar ecuaciones de primer grado, ganar medallas y revisar tu avance.
      </p>

      <div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-2xl bg-neutral-50 border border-neutral-200 p-5 text-center">
          <p class="heading-font text-3xl font-bold text-moodle-orange">3</p>
          <p class="text-xs font-semibold text-moodle-text-gray mt-1">intentos por reto</p>
        </div>

        <div class="rounded-2xl bg-neutral-50 border border-neutral-200 p-5 text-center">
          <p class="heading-font text-3xl font-bold text-moodle-orange">10</p>
          <p class="text-xs font-semibold text-moodle-text-gray mt-1">puntaje máximo</p>
        </div>

        <div class="rounded-2xl bg-neutral-50 border border-neutral-200 p-5 text-center">
          <p class="heading-font text-3xl font-bold text-moodle-orange">★</p>
          <p class="text-xs font-semibold text-moodle-text-gray mt-1">insignias</p>
        </div>
      </div>

      <div class="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <p class="font-bold text-moodle-text-blue">Modo juego en construcción</p>
        <p class="text-sm text-moodle-text-gray mt-1 leading-relaxed">
          En la siguiente fase este espacio se convertirá en una aventura de retos, preguntas y retroalimentación automática.
        </p>
      </div>
    </section>
  `;
}