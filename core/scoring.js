export function redondearNota(valor, decimales = 2) {
  return Number(Math.max(0, valor).toFixed(decimales));
}

export function calcularPromedio(notas = []) {
  if (!notas.length) return 0;
  const suma = notas.reduce((acc, nota) => acc + Number(nota || 0), 0);
  return redondearNota(suma / notas.length);
}

export function calcularPorcentaje(obtenido = 0, total = 10) {
  if (!total) return 0;
  return redondearNota((Number(obtenido) / Number(total)) * 100);
}

export function determinarNivel(notaSobre10 = 0) {
  if (notaSobre10 >= 9) return "Dominio alto";
  if (notaSobre10 >= 7) return "Dominio esperado";
  if (notaSobre10 >= 5) return "En proceso";
  return "Requiere refuerzo";
}

export function determinarEstado(notaSobre10 = 0) {
  return notaSobre10 >= 7 ? "Aprobado" : "Requiere recuperación";
}
