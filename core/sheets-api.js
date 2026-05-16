export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyAcZYZeZjo-_H2KXdpjNsxpjRY9Y3kU-Rv7VjCjKw3tELL5YAXqVbfuhI6fwdIGXii/exec";

export function crearPayloadBase(datos = {}) {
  return {
    hoja: datos.hoja ?? "PlantillaTema",
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
    fecha: datos.fecha ?? "",
    hora: datos.hora ?? "",
    tiempoEmpleado: datos.tiempoEmpleado ?? "",
    intentos: datos.intentos ?? 1,
    observacion: datos.observacion ?? ""
  };
}

export async function enviarDatosAGoogleSheets(datos) {
  const payload = crearPayloadBase(datos);
  console.info("[Simulación Fase 1] Payload listo para Google Sheets:", payload);
  return { ok: true, modo: "simulacion", url: APPS_SCRIPT_URL, payload };
}
