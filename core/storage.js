const KEYS = {
  student: "bgu_student",
  progress: "bgu_progress",
  lastSubmission: "bgu_last_submission",
  gameResults: "ueeh_game_results"
};

export function guardarDatosEstudiante(datos) {
  localStorage.setItem(KEYS.student, JSON.stringify(datos));
}

export function obtenerDatosEstudiante() {
  const raw = localStorage.getItem(KEYS.student);
  return raw ? JSON.parse(raw) : null;
}

export function limpiarDatosEstudiante() {
  localStorage.removeItem(KEYS.student);
}

export function guardarAvanceBasico(avance) {
  localStorage.setItem(KEYS.progress, JSON.stringify(avance));
}

export function obtenerAvanceBasico() {
  const raw = localStorage.getItem(KEYS.progress);
  return raw ? JSON.parse(raw) : null;
}

export function guardarMarcaReenvio(payload) {
  localStorage.setItem(KEYS.lastSubmission, JSON.stringify(payload));
}

export function obtenerMarcaReenvio() {
  const raw = localStorage.getItem(KEYS.lastSubmission);
  return raw ? JSON.parse(raw) : null;
}

export function guardarResultadoGamificacion(resultado) {
  localStorage.setItem(
    KEYS.gameResults,
    JSON.stringify({
      ...resultado,
      guardadoEn: new Date().toISOString()
    })
  );
}

export function obtenerResultadoGamificacion() {
  const raw = localStorage.getItem(KEYS.gameResults);
  return raw ? JSON.parse(raw) : null;
}

export function limpiarDatosLocales() {
  [
    "ueeh_student_name",
    "ueeh_student_grade",
    "ueeh_student_parallel",
    KEYS.student,
    KEYS.progress,
    KEYS.lastSubmission,
    KEYS.gameResults,
    // Unidad 2
    "ueeh_unidad2_presentation_viewed",
    "ueeh_unidad2_result_gamificacion",
    "ueeh_unidad2_result_deber",
    "deber_derivadas_unidad2_enviado_v1",
    "deber_derivadas_unidad2_progreso_v1",
    "ueeh_escape_derivadas_unidad2_estado_v1",
    // Unidad 3
    "ueeh_unidad3_presentation_viewed",
    "ueeh_unidad3_result_gamificacion",
    "ueeh_unidad3_result_deber",
    "deber_matrices_unidad3_enviado_v1",
    "deber_matrices_unidad3_progreso_v1",
    "ueeh_escape_matrices_unidad3_estado_v1"
  ].forEach((key) => localStorage.removeItem(key));
}
