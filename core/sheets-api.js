export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyAcZYZeZjo-_H2KXdpjNsxpjRY9Y3kU-Rv7VjCjKw3tELL5YAXqVbfuhI6fwdIGXii/exec";

export const SHEETS = {
  unidad1: { gamificacion: "Gami_Uni_1", deber: "Deb_Uni_1" },
  unidad2: { gamificacion: "Gami_Uni_2", deber: "Deb_Uni_2" },
  unidad3: { gamificacion: "Gami_Uni_3", deber: "Deb_Uni_3" }
};

export function crearPayloadBase(datos = {}) {
  return {
    hoja: datos.hoja ?? "Resultados",
    idEnvio: datos.idEnvio ?? "",
    nombre: datos.nombre ?? "",
    curso: datos.curso ?? "",
    paralelo: datos.paralelo ?? "",
    tema: datos.tema ?? "",
    tipoActividad: datos.tipoActividad ?? "",
    numeroEjercicios: datos.numeroEjercicios ?? 0,
    puntajeInicial: datos.puntajeInicial ?? 0,
    promedioInicial: datos.promedioInicial ?? 0,
    recuperacionHabilitada: datos.recuperacionHabilitada ?? false,
    promedioRecuperacion: datos.promedioRecuperacion ?? 0,
    notaFinal: datos.notaFinal ?? 0,
    porcentajeFinal: datos.porcentajeFinal ?? 0,
    nivel: datos.nivel ?? "",
    estado: datos.estado ?? "",
    fechaLimite: datos.fechaLimite ?? "",
    observacion: datos.observacion ?? "",
    detalleEjercicios: datos.detalleEjercicios ?? "",
    userAgent: navigator.userAgent || "",
    urlOrigen: location.href || "",
    fechaCliente: new Date().toISOString()
  };
}

export function crearIdEnvio({ hoja, tipoActividad, nombre }) {
  const limpio = String(nombre || "estudiante")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return `${hoja}-${tipoActividad || "actividad"}-${limpio}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enviarDatosAGoogleSheets(datos, options = {}) {
  const timeoutMs = options.timeoutMs || 12000;
  const payload = crearPayloadBase({
    ...datos,
    idEnvio:
      datos.idEnvio ||
      crearIdEnvio({ hoja: datos.hoja, tipoActividad: datos.tipoActividad, nombre: datos.nombre })
  });
  return enviarPorJSONP(payload, timeoutMs);
}

function enviarPorJSONP(payload, timeoutMs) {
  return new Promise((resolve) => {
    const callbackName = `ueehSheetsCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const params = new URLSearchParams({ ...payload, callback: callbackName });
    const script = document.createElement("script");

    const cleanup = () => {
      clearTimeout(timer);
      delete window[callbackName];
      script.remove();
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve({ ok: false, confirmado: false, error: "Tiempo de espera agotado.", payload });
    }, timeoutMs);

    window[callbackName] = (response) => {
      cleanup();
      if (response && response.ok) {
        resolve({
          ok: true,
          confirmado: true,
          hoja: response.hoja,
          fila: response.fila,
          idEnvio: response.idEnvio || payload.idEnvio,
          duplicado: Boolean(response.duplicado),
          payload
        });
      } else {
        resolve({
          ok: false,
          confirmado: false,
          error: response?.error || "El Apps Script respondió con error.",
          payload
        });
      }
    };

    script.onerror = () => {
      cleanup();
      resolve({ ok: false, confirmado: false, error: "No se pudo cargar JSONP.", payload });
    };
    script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
    document.body.appendChild(script);
  });
}
