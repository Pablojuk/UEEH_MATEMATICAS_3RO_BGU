const DEFAULT_SRC = "./topics/introduccion-derivadas/presentation.html";

export function crearHtmlLessonViewer({
  src = DEFAULT_SRC,
  title = "Presentación de la clase"
} = {}) {
  return `
    <div class="flex flex-col gap-4 w-full">
      <div class="flex justify-end items-center px-2">
        <button
          id="btn-back-to-unit"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-sm font-semibold text-moodle-text-blue transition-colors mr-3"
          title="Regresar a la Unidad"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          Regresar a la Unidad
        </button>
        <button
          id="btn-fullscreen-lesson"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-moodle-orange hover:bg-orange-600 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-moodle-orange focus:ring-offset-2"
          title="Ver en pantalla completa"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
          </svg>
          Presentación en pantalla completa
        </button>
      </div>
      <section class="html-lesson-viewer w-full" aria-label="${title}">
        <iframe
          id="lesson-iframe"
          class="html-lesson-viewer__frame"
          src="${src}"
          title="${title}"
          loading="lazy"
          allowfullscreen
          webkitallowfullscreen
          mozallowfullscreen
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </section>
    </div>
  `;
}

