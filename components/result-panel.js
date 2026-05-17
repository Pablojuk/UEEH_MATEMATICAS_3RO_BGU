export function crearResultPanel() {
  const rows = [
    ["Nota gamificación", "-- / 10", "Pendiente de activar"],
    ["Nota deber", "-- / 10", "Pendiente de activar"],
    ["Nota recuperación", "-- / 10", "Pendiente de activar"],
    ["Nota final", "-- / 10", "Pendiente de cálculo"]
  ];

  return `
    <section class="app-card p-5 sm:p-8 space-y-4">
      <div class="inline-flex hero-badge items-center px-3 py-1 text-xs font-bold text-emerald-100">📊 Tablero académico</div>
      <h2 class="screen-title text-white">Resultados y retroalimentación</h2>
      <p class="section-subtitle">Vista visual preparada para mostrar puntajes reales en próximas fases.</p>

      <div class="grid gap-3 sm:grid-cols-2">
        ${rows.map(([label, value, status]) => `<div class="metric-card"><p class="text-sm text-cyan-100">${label}</p><p class="mt-1 text-xl font-extrabold text-white">${value}</p><p class="text-xs text-amber-200">${status}</p></div>`).join("")}
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="metric-card"><p class="text-sm text-cyan-100">Porcentaje</p><p class="text-lg font-bold text-white">-- %</p><p class="text-xs text-slate-200">Nivel: Pendiente</p></div>
        <div class="metric-card"><p class="text-sm text-cyan-100">Estado</p><p class="text-lg font-bold text-white">Pendiente</p><p class="text-xs text-slate-200">Observación: Aún no hay evaluación final.</p></div>
      </div>

      <div class="rounded-xl border border-yellow-300/35 bg-yellow-400/10 p-3">
        <p class="text-sm font-semibold text-yellow-100">🏅 Espacio de insignia o logro</p>
      </div>
    </section>
  `;
}
