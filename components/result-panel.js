export function crearResultPanel() {
  const rows = [
    ["Nota gamificación", "-- / 10"],
    ["Nota deber", "-- / 10"],
    ["Nota recuperación", "-- / 10"],
    ["Nota final", "-- / 10"],
    ["Porcentaje final", "-- %"],
    ["Nivel", "Pendiente"],
    ["Estado", "Pendiente"],
    ["Observación pedagógica", "Aún no hay evaluación final."]
  ];

  return `
    <section class="app-card p-5 sm:p-8">
      <div class="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">📊 Resultados</div>
      <h2 class="screen-title mt-3">Panel de resultados y retroalimentación</h2>
      <p class="mt-2 section-subtitle">Esta vista mostrará tu progreso final cuando se habiliten evaluaciones reales.</p>

      <div class="mt-4 space-y-2">
        ${rows
          .map(
            ([label, value]) =>
              `<div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><span class="font-semibold text-slate-700">${label}</span><span class="font-bold text-slate-900">${value}</span></div>`
          )
          .join("")}
      </div>
    </section>
  `;
}
