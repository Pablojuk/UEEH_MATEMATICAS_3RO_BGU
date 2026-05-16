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
      <h2 class="screen-title">Panel de resultados (Base)</h2>
      <div class="mt-4 space-y-2">
        ${rows
          .map(
            ([label, value]) =>
              `<div class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span class="font-semibold">${label}</span><span>${value}</span></div>`
          )
          .join("")}
      </div>
    </section>
  `;
}
