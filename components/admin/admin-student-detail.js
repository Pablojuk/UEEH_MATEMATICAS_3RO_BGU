// ═══════════════════════════════════════════════════════════════════════════
// Admin Student Detail Modal Component — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import {
  fetchStudentDetail,
  generateClaimCode,
  resetStudentAccess,
  toggleStudentStatus
} from "../../core/admin-service.js";

/**
 * Abre el modal con el perfil detallado del estudiante.
 */
export async function openStudentDetailModal(studentId, onRefresh) {
  const backdrop = document.createElement("div");
  backdrop.id = "student-detail-backdrop";
  backdrop.className = "fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto";

  backdrop.innerHTML = `
    <div class="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 border border-neutral-200 animate-scale-up">
      <div class="p-6 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-purple-700 text-white font-extrabold text-lg flex items-center justify-center shadow-md">
            🎓
          </div>
          <div>
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-purple-700">Expediente de Estudiante</span>
            <h3 id="modal-student-name" class="heading-font text-xl font-bold text-moodle-text-blue">Cargando…</h3>
          </div>
        </div>
        <button id="btn-close-detail-modal" class="w-9 h-9 rounded-full bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition-colors">
          ✕
        </button>
      </div>

      <div id="modal-student-body" class="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        <div class="flex justify-center py-10">
          <div class="w-8 h-8 border-4 border-purple-200 border-t-purple-700 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.classList.add("overflow-hidden");

  const close = () => {
    document.body.classList.remove("overflow-hidden");
    backdrop.remove();
  };

  document.getElementById("btn-close-detail-modal")?.addEventListener("click", close);

  try {
    const data = await fetchStudentDetail(studentId);
    renderDetailBody(data, backdrop, close, onRefresh);
  } catch (err) {
    const body = document.getElementById("modal-student-body");
    if (body) {
      body.innerHTML = `<div class="p-4 bg-red-50 text-red-700 text-xs rounded-2xl font-bold text-center">Error al cargar detalle: ${err.message}</div>`;
    }
  }
}

function renderDetailBody(st, backdrop, close, onRefresh) {
  const nameEl = document.getElementById("modal-student-name");
  if (nameEl) nameEl.textContent = st.official_full_name;

  const body = document.getElementById("modal-student-body");
  if (!body) return;

  const isLinked = !!st.linked_user_id;

  let codeBadge = `<span class="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold">Sin código activo</span>`;
  if (st.code_status === "used" || isLinked) {
    codeBadge = `<span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">Código Canjeado</span>`;
  } else if (st.code_status === "active") {
    codeBadge = `<span class="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">🔑 Código Activo</span>`;
  } else if (st.code_status === "revoked") {
    codeBadge = `<span class="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">Código Revocado</span>`;
  }

  const historyHtml = (st.history || [])
    .map(
      (h) => `
      <div class="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs space-y-1">
        <div class="flex items-center justify-between font-bold text-neutral-700">
          <span>${h.action === "access_reset" ? "🔄 Restablecimiento de Acceso" : "🔗 Vinculación Inicial"}</span>
          <span class="text-[10px] text-neutral-400">${new Date(h.created_at).toLocaleString()}</span>
        </div>
        <p class="text-neutral-500">${h.reason || "Operación administrativa"}</p>
      </div>
    `
    )
    .join("");

  const hasActiveCode = st.code_status === "active";

  let codeActionButtonHtml = "";
  if (!isLinked) {
    if (hasActiveCode) {
      codeActionButtonHtml = `
        <button id="btn-action-reissue-code" class="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2">
          🔄 Reemitir código
        </button>`;
    } else {
      codeActionButtonHtml = `
        <button id="btn-action-generate-code" class="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2">
          🔑 Generar código de activación
        </button>`;
    }
  } else {
    codeActionButtonHtml = `
      <button id="btn-action-reset-access" class="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2">
        🔄 Restablecer Acceso Google
      </button>`;
  }

  body.innerHTML = `
    <div class="space-y-6">
      <!-- Ficha Técnica -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80">
        <div>
          <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Código Único Institucional</span>
          <p class="text-sm font-extrabold text-moodle-text-blue font-mono mt-0.5">${st.student_code || "N/A"}</p>
          <p class="text-[10px] text-neutral-400 mt-0.5 leading-tight">Identificador permanente del estudiante. No se utiliza para vincular la cuenta Google.</p>
        </div>
        <div>
          <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Estado Institucional</span>
          <p class="text-sm font-extrabold mt-0.5 ${st.status === "active" ? "text-emerald-600" : "text-red-600"}">
            ${st.status === "active" ? "ACTIVO" : "INACTIVO"}
          </p>
        </div>
        <div>
          <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Cuenta Google Asignada</span>
          <p class="text-xs font-semibold text-neutral-700 mt-0.5 flex items-center gap-1.5">
            ${isLinked ? `<span class="text-emerald-600">● Vinculada</span> (ID: <code class="text-[11px]">${st.linked_user_id.slice(0, 8)}…</code>)` : `<span class="text-amber-600">● Vinculación Pendiente</span>`}
          </p>
        </div>
        <div>
          <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Estado del Código de Activación</span>
          <div class="mt-0.5">${codeBadge}</div>
        </div>
      </div>

      <!-- Acciones Administrativas Protegidas -->
      <div class="space-y-3 pt-2 border-t border-neutral-200">
        <h4 class="text-xs font-extrabold text-neutral-500 uppercase tracking-wider">Acciones de Acceso y Seguridad</h4>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${codeActionButtonHtml}

          <button id="btn-action-toggle-status" class="px-4 py-2.5 rounded-xl ${st.status === "active" ? "bg-neutral-200 hover:bg-neutral-300 text-neutral-800" : "bg-emerald-600 hover:bg-emerald-700 text-white"} font-bold text-xs transition-colors flex items-center justify-center gap-2">
            ${st.status === "active" ? "🚫 Desactivar Estudiante" : "✅ Reactivar Estudiante"}
          </button>
        </div>

        <div id="action-feedback-box" class="hidden p-3 rounded-xl text-xs font-medium text-center"></div>
      </div>

      <!-- Historial de Cuentas -->
      <div class="space-y-3 pt-2 border-t border-neutral-200">
        <h4 class="text-xs font-extrabold text-neutral-500 uppercase tracking-wider">Historial de Cambios de Acceso</h4>
        <div class="space-y-2">
          ${historyHtml || `<p class="text-xs text-neutral-400 italic">No hay eventos de cambio registrados.</p>`}
        </div>
      </div>
    </div>
  `;

  // Bind Generar Código
  document.getElementById("btn-action-generate-code")?.addEventListener("click", async () => {
    try {
      const res = await generateClaimCode(st.id);
      showRawCodePopup(st.official_full_name, res.raw_claim_code, () => {
        close();
        if (onRefresh) onRefresh();
      });
    } catch (err) {
      alert("Error al generar código: " + err.message);
    }
  });

  // Bind Reemitir Código
  document.getElementById("btn-action-reissue-code")?.addEventListener("click", async () => {
    if (!confirm(`Ya existe un código de activación activo para ${st.official_full_name}.\n\nSi continúa, el código anterior será invalidado y se generará uno nuevo.\n\n¿Desea continuar?`)) return;

    try {
      const res = await generateClaimCode(st.id);
      showRawCodePopup(st.official_full_name, res.raw_claim_code, () => {
        close();
        if (onRefresh) onRefresh();
      });
    } catch (err) {
      alert("Error al reemitir código: " + err.message);
    }
  });

  // Bind Restablecer Acceso
  document.getElementById("btn-action-reset-access")?.addEventListener("click", async () => {
    const reason = prompt(
      `ATENCIÓN: Se desvinculará la cuenta de Google actual de ${st.official_full_name} y se emitirá un nuevo código de activación.\n\nEscribe el motivo del restablecimiento:`,
      "Pérdida de dispositivo / cambio de cuenta Google"
    );

    if (reason === null) return;

    try {
      const res = await resetStudentAccess(st.id, reason);
      showRawCodePopup(st.official_full_name, res.raw_claim_code, () => {
        close();
        if (onRefresh) onRefresh();
      });
    } catch (err) {
      alert("Error al restablecer acceso: " + err.message);
    }
  });

  // Bind Toggle Status
  document.getElementById("btn-action-toggle-status")?.addEventListener("click", async () => {
    const nextStatus = st.status === "active" ? "inactive" : "active";
    if (!confirm(`¿Estás seguro de cambiar el estado de ${st.official_full_name} a ${nextStatus.toUpperCase()}?`)) return;

    try {
      await toggleStudentStatus(st.id, nextStatus);
      close();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Error al cambiar estado: " + err.message);
    }
  });
}

/**
 * Muestra el código generado una sola vez con opción de copiar.
 */
export function showRawCodePopup(studentName, rawCode, onClose) {
  const backdrop = document.createElement("div");
  backdrop.className = "fixed inset-0 z-[60] bg-neutral-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in";

  backdrop.innerHTML = `
    <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6 text-center border border-neutral-200">
      <div class="w-16 h-16 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-3xl mx-auto">
        🔑
      </div>

      <div class="space-y-1">
        <span class="text-xs font-extrabold uppercase tracking-widest text-purple-700">Código de Activación Creado</span>
        <h3 class="heading-font text-lg font-bold text-moodle-text-blue">${studentName}</h3>
      </div>

      <div class="bg-neutral-900 text-white rounded-2xl p-4 space-y-2 border border-neutral-800">
        <p class="text-[10px] text-neutral-400 font-medium">CÓDIGO (SE MUESTRA UNA SOLA VEZ):</p>
        <div id="raw-code-text" class="font-mono text-base font-extrabold text-amber-400 tracking-wider select-all break-all">
          ${rawCode}
        </div>
      </div>

      <div class="rounded-xl bg-amber-50 border border-amber-200 p-3 text-left text-xs text-amber-900 space-y-1">
        <p class="font-bold">⚠️ Copia este código ahora</p>
        <p class="text-[11px] text-amber-800 leading-snug">Por razones de ciberseguridad, solo se almacena su resumen SHA-256 en la base de datos. Si cierras esta ventana, no se podrá recuperar el código original.</p>
      </div>

      <div class="flex gap-3">
        <button id="btn-copy-raw-code" class="flex-1 min-h-[46px] bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2">
          <span>📋</span> Copiar Código
        </button>
        <button id="btn-close-raw-popup" class="px-5 min-h-[46px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs transition-colors">
          Cerrar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const btnCopy = backdrop.querySelector("#btn-copy-raw-code");
  btnCopy?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      btnCopy.textContent = "✓ ¡Copiado!";
      btnCopy.classList.replace("bg-purple-700", "bg-emerald-600");
    } catch {
      alert("Copia el código manualmente desde la pantalla.");
    }
  });

  backdrop.querySelector("#btn-close-raw-popup")?.addEventListener("click", () => {
    backdrop.remove();
    if (onClose) onClose();
  });
}
