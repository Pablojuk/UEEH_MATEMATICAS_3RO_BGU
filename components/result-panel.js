export function crearResultPanel() {
  const rows = [
    ["Gamificación", "-- / 10"],
    ["Trabajo para la Casa", "-- / 10"],
    ["Recuperación", "-- / 10"],
    ["Nota final", "-- / 10"],
    ["Porcentaje final", "-- %"],
    ["Nivel", "Pendiente"],
    ["Estado", "Pendiente"],
    ["Observación pedagógica", "Aún no hay evaluación final."]
  ];

  return `
    <section class="app-card p-6 sm:p-8">
      <div class="inline-flex items-center rounded-full bg-emerald-50 text-emerald-600 px-3 py-1 text-xs font-bold">
        📊 Resultados
      </div>

      <h2 class="heading-font text-2xl font-bold text-moodle-text-blue mt-4">
        Resultados de las Actividades
      </h2>

      <p class="section-subtitle mt-2">
        Consulta aquí tu desempeño en la Gamificación y el Trabajo para la Casa.
      </p>

      <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${rows
          .map(
            ([label, value]) => `
              <div class="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4">
                <span class="block text-xs font-bold text-moodle-text-gray uppercase tracking-wide">
                  ${label}
                </span>
                <span class="block heading-font text-xl font-bold text-moodle-text-blue mt-1">
                  ${value}
                </span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}