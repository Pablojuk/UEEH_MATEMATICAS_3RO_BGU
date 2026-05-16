export function crearSlideViewer() {
  return `
    <section class="app-card p-5 sm:p-8 space-y-4">
      <div class="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">📘 Slides</div>
      <h2 class="screen-title">Explicaciones interactivas</h2>
      <p class="section-subtitle">Próximamente aquí se mostrarán las explicaciones interactivas con fórmulas en LaTeX.</p>

      <div class="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
        <h3 class="font-bold text-indigo-900">Slide de ejemplo</h3>
        <p class="mt-1 text-sm text-indigo-800">Vista previa del estilo de contenido matemático guiado.</p>
        <p class="mt-3 rounded-xl bg-white px-3 py-2 text-lg">\(2x + 5 = 15\)</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button class="app-btn bg-slate-200 text-slate-700" disabled>Anterior</button>
        <button class="app-btn bg-indigo-600 text-white" disabled>Siguiente</button>
      </div>
    </section>
  `;
}
