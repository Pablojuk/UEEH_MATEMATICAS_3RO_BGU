// ═══════════════════════════════════════════════════════════════════════════
// Student Activity Summary Component — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import { fetchStudentActivitySummary, submitActivityResult } from "../core/activity-service.js?v=1.4.2";

/**
 * Renderiza el Resumen de Actividades del Estudiante consultando Supabase como única fuente oficial.
 * Aislado por unidad curricular de forma data-driven (unitNumber / unitTitle).
 */
export async function renderStudentActivitySummary(container, options = {}) {
  const unitNumber = typeof options === "object"
    ? (options?.unitNumber ?? options?.unit ?? null)
    : (typeof options === "number" ? options : null);
  const unitTitle = typeof options === "object" ? (options?.unitTitle ?? "") : "";

  const headerTitle = unitNumber ? `Resumen de Actividades • Unidad ${unitNumber}` : "Resumen de Actividades";
  const headerSubtitle = unitTitle
    ? `Unidad ${unitNumber}: ${unitTitle}`
    : "Consulta el estado oficial y las calificaciones de tus actividades evaluables en Supabase.";

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm">
        <h2 class="heading-font text-2xl font-bold text-moodle-text-blue">${escapeHTML(headerTitle)}</h2>
        <p class="text-xs text-neutral-500 mt-0.5">${escapeHTML(headerSubtitle)}</p>
      </div>

      <div id="summary-cards-root" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="col-span-full p-8 text-center text-neutral-400">Cargando resumen de actividades...</div>
      </div>
    </div>
  `;

  await loadSummary(unitNumber);
}

async function loadSummary(unitNumber = null) {
  const root = document.getElementById("summary-cards-root");
  if (!root) return;

  try {
    const allItems = await fetchStudentActivitySummary(unitNumber);
    const list = (unitNumber !== null && unitNumber !== undefined)
      ? allItems.filter((item) => Number(item.activity?.unit_number) === Number(unitNumber))
      : allItems;

    if (list.length === 0) {
      root.innerHTML = `
        <div class="col-span-full p-8 bg-white rounded-3xl border border-neutral-200/80 text-center text-neutral-400">
          Aún no tienes actividades calificadas en esta unidad.
        </div>
      `;
      return;
    }

    root.innerHTML = list.map((item) => renderActivityCard(item)).join("");

    // Bind event listeners para botones de reintento
    list.forEach((item) => {
      if (item.displayState === "PENDING_RETRY" && item.pendingLocal) {
        const btn = document.getElementById(`btn-retry-${item.activity.activity_key}`);
        if (btn) {
          btn.addEventListener("click", async () => {
            btn.disabled = true;
            btn.textContent = "⏳ Reintentando envío...";
            const res = await submitActivityResult({
              activityKey: item.activity.activity_key,
              isRetry: true
            });

            if (res.success) {
              alert("¡Entrega registrada y confirmada exitosamente en Supabase!");
              await loadSummary(unitNumber);
            } else {
              alert(res.error || "No se pudo reintentar la entrega.");
              btn.disabled = false;
              btn.textContent = "🔄 Reintentar envío";
            }
          });
        }
      }
    });
  } catch (err) {
    root.innerHTML = `
      <div class="col-span-full p-8 bg-white rounded-3xl border border-red-200 text-center text-red-500 font-semibold">
        Error al cargar el resumen de actividades: ${escapeHTML(err.message)}
      </div>
    `;
  }
}

function renderActivityCard(item) {
  const { activity, result, displayState, statusText, pendingLocal } = item;
  const isGamification = activity.activity_type === "gamification";

  const typeIcon = isGamification ? "🎮" : "📝";
  const typeName = isGamification ? "Gamificación" : "Trabajo en clase";

  let statusBadge = "";
  let detailsHtml = "";

  switch (displayState) {
    case "CONFIRMED":
      statusBadge = `<span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">✅ Enviado y registrado</span>`;
      detailsHtml = `
        <div class="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-neutral-400 block text-[10px] uppercase font-bold">Mejor Nota</span>
            <span class="font-extrabold text-emerald-700 text-base">${Number(result.best_score).toFixed(2)} / ${Number(activity.max_score).toFixed(2)}</span>
          </div>
          <div>
            <span class="text-neutral-400 block text-[10px] uppercase font-bold">Intentos</span>
            <span class="font-bold text-neutral-700 text-base">${result.attempt_count}</span>
          </div>
          <div class="col-span-2 text-[10px] text-neutral-400 mt-1">
            Último registro: ${formatDateSpanish(result.last_completed_at)}
          </div>
        </div>
      `;
      break;

    case "OVERDUE":
      statusBadge = `<span class="px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold text-xs">🔴 No entregado — plazo vencido</span>`;
      detailsHtml = `
        <div class="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-neutral-400 block text-[10px] uppercase font-bold">Nota Asignada</span>
            <span class="font-extrabold text-red-700 text-base">${Number(activity.minimum_score).toFixed(2)} / ${Number(activity.max_score).toFixed(2)}</span>
          </div>
          <div>
            <span class="text-neutral-400 block text-[10px] uppercase font-bold">Intentos Reales</span>
            <span class="font-bold text-neutral-700 text-base">0</span>
          </div>
          <div class="col-span-2 text-[10px] text-red-400 mt-1">
            Cierre oficial: ${formatDateSpanish(activity.due_at)}
          </div>
        </div>
      `;
      break;

    case "PROCESSING_CLOSURE":
      statusBadge = `<span class="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">⏳ Cierre en procesamiento</span>`;
      detailsHtml = `
        <div class="mt-4 pt-4 border-t border-neutral-100 text-xs text-amber-700">
          El plazo ha finalizado (${formatDateSpanish(activity.due_at)}). El registro de no entrega se procesará en breve.
        </div>
      `;
      break;

    case "PENDING_RETRY":
      statusBadge = `<span class="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">🟡 Pendiente de confirmar</span>`;
      detailsHtml = `
        <div class="mt-4 pt-4 border-t border-neutral-100 space-y-2 text-xs">
          <p class="text-amber-800">No se recibió una respuesta completa del servidor durante el último envío. La entrega quedó guardada para reintentar con el mismo identificador, sin duplicar intentos.</p>
          <button id="btn-retry-${activity.activity_key}" class="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-sm">
            🔄 Reintentar envío
          </button>
        </div>
      `;
      break;

    case "NOT_STARTED":
    default:
      statusBadge = `<span class="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 font-bold text-xs">🟡 Pendiente de realizar</span>`;
      detailsHtml = `
        <div class="mt-4 pt-4 border-t border-neutral-100 text-xs text-neutral-500">
          Plazo límite de entrega: <strong class="text-neutral-700">${formatDateSpanish(activity.due_at)}</strong>
        </div>
      `;
      break;
  }

  return `
    <div class="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm flex flex-col justify-between space-y-3">
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-neutral-400 uppercase tracking-wider">${typeIcon} ${typeName} | U${activity.unit_number}</span>
          ${statusBadge}
        </div>
        <h3 class="heading-font text-lg font-bold text-moodle-text-blue">${escapeHTML(activity.title)}</h3>
        <p class="text-xs text-neutral-400 font-mono">Clave: ${escapeHTML(activity.activity_key)}</p>
      </div>

      ${detailsHtml}
    </div>
  `;
}

function formatDateSpanish(isoStr) {
  if (!isoStr) return "N/A";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
