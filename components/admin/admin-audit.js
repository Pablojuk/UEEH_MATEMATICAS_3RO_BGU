// ═══════════════════════════════════════════════════════════════════════════
// Admin Audit Viewer Component — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import { fetchAuditLogs } from "../../core/admin-service.js";

export async function renderAdminAuditView(container) {
  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm flex items-center justify-between">
        <div>
          <h2 class="heading-font text-2xl font-bold text-moodle-text-blue flex items-center gap-2">
            Regístro de Auditoría del Sistema
          </h2>
          <p class="text-xs text-neutral-500 mt-0.5">Historial de acciones administrativas y eventos de seguridad.</p>
        </div>
      </div>

      <div id="audit-list-container" class="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
        <div class="flex justify-center py-12">
          <div class="w-8 h-8 border-4 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  `;

  try {
    const logs = await fetchAuditLogs(50);
    const root = document.getElementById("audit-list-container");

    if (!root) return;

    if (logs.length === 0) {
      root.innerHTML = `<div class="p-12 text-center text-xs font-bold text-neutral-500">No hay registros de auditoría aún.</div>`;
      return;
    }

    const rowsHtml = logs
      .map((l) => {
        const metadataStr = l.metadata ? JSON.stringify(l.metadata) : "{}";
        return `
          <tr class="hover:bg-neutral-50/80 transition-colors border-b border-neutral-100 last:border-none text-xs">
            <td class="px-6 py-4 text-neutral-400 font-mono text-[11px]">${new Date(l.created_at).toLocaleString()}</td>
            <td class="px-6 py-4 font-bold text-purple-800">${l.action}</td>
            <td class="px-6 py-4 text-neutral-600 font-mono text-[11px]">${l.actor_user_id ? l.actor_user_id.slice(0, 8) + "…" : "Sistema"}</td>
            <td class="px-6 py-4 text-neutral-600">${l.entity_type || "-"}</td>
            <td class="px-6 py-4 font-mono text-[11px] text-neutral-500 max-w-xs truncate" title="${metadataStr}">${metadataStr}</td>
          </tr>
        `;
      })
      .join("");

    root.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-neutral-50 border-b border-neutral-200 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
              <th class="px-6 py-3.5">Fecha y Hora</th>
              <th class="px-6 py-3.5">Acción</th>
              <th class="px-6 py-3.5">Usuario Actor</th>
              <th class="px-6 py-3.5">Entidad</th>
              <th class="px-6 py-3.5">Metadatos</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    const root = document.getElementById("audit-list-container");
    if (root) {
      root.innerHTML = `<div class="p-6 text-center text-xs text-red-600 font-bold">Error cargando auditoría: ${err.message}</div>`;
    }
  }
}
