const KEYS = {
  student: "bgu_student",
  progress: "bgu_progress",
  lastSubmission: "bgu_last_submission"
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
