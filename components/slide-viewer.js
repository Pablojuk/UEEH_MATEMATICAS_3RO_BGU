export function crearSlideViewer() {
  return `
    <section class="app-card p-5 sm:p-8 space-y-4">
      <h2 class="screen-title">Slides interactivas (Placeholder)</h2>
      <div class="rounded-xl bg-slate-50 p-4">
        <h3 class="font-bold">Slide 1: Introducción visual</h3>
        <p class="text-sm text-slate-600">Aquí se mostrará una explicación guiada por pasos en la Fase 2.</p>
        <p class="mt-2 text-lg">\(2x + 5 = 15\)</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <button class="app-btn bg-slate-200 text-slate-700" disabled>Anterior</button>
        <button class="app-btn bg-indigo-600 text-white" disabled>Siguiente</button>
      </div>
    </section>
  `;
}
