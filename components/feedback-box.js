export function crearFeedbackBox(tipo = "good", mensaje = "") {
  const classByType = {
    good: "feedback feedback--good",
    warn: "feedback feedback--warn",
    great: "feedback feedback--great"
  };

  return `<p class="${classByType[tipo] || classByType.good}">${mensaje}</p>`;
}
