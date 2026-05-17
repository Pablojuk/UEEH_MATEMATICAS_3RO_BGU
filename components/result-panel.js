import { obtenerResultadoGamificacion } from "../core/storage.js";

function formatScore(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "-- / 10";
  }

  return `${Number(value).toFixed(2)} / 10`;
}

export function crearResultPanel() {
  const gameResults = obtenerResultadoGamificacion();

  const gamificationScore = formatScore(gameResults?.notaFinal);
  const homeworkScore = "-- / 10";
  const recoveryScore = "-- / 10";

  const finalScore = gameResults?.notaFinal != null ? formatScore(gameResults.notaFinal) : "-- / 10";
  const percentage =
    gameResults?.porcentajeFinal != null ? `${gameResults.porcentajeFinal} %` : "-- %";
  const level = gameResults?.nivel || "Pendiente";
  const status = gameResults?.estado || "Pendiente";
  const observation =
    gameResults?.observacion ||
    "Aún no hay evaluación final. Completa la gamificación para ver tu calificación.";

  const sheetStatus = gameResults?.enviadoSheets
    ? "Registrado en Google Sheets"
    : gameResults
      ? "Guardado localmente"
      : "Pendiente de envío";

  const rows = [
    ["Gamificación", gamificationScore],
    ["Trabajo para la Casa", homeworkScore],
    ["Recuperación", recoveryScore],
    ["Nota final", finalScore],
    ["Porcentaje final", percentage],
    ["Nivel", level],
    ["Estado", status],
    ["Registro en hoja", sheetStatus],
    ["Observación pedagógica", observation]
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

      ${
        gameResults
          ? `
        <div class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Última calificación de gamificación: <strong>${gamificationScore}</strong>
          ${
            gameResults.paresEncontrados != null
              ? ` · Pares: ${gameResults.paresEncontrados}/8`
              : ""
          }
        </div>
      `
          : ""
      }

      <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${rows
          .map(
            ([label, value]) => `
              <div class="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 ${
                label === "Observación pedagógica" ? "sm:col-span-2" : ""
              }">
                <span class="block text-xs font-bold text-moodle-text-gray uppercase tracking-wide">
                  ${label}
                </span>
                <span class="block heading-font text-xl font-bold text-moodle-text-blue mt-1 ${
                  label === "Observación pedagógica" ? "text-base font-medium font-sans" : ""
                }">
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
