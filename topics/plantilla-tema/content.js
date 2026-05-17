export const slidesPlantillaTema = [
  {
    id: "apertura-bienvenida",
    momento: "Anticipación",
    dua: ["Compromiso"],
    tipo: "intro",
    titulo: "Ecuaciones de Primer Grado",
    subtitulo: "Comprendiendo el equilibrio matemático",
    contenido: "Bienvenidos. Hoy descubriremos cómo el álgebra funciona como la balanza perfecta del universo.<br><br><strong style='color:#F47C20'>\"La matemática es el alfabeto con el cual Dios ha escrito el universo.\" — Galileo Galilei</strong>",
    formula: "",
    actividad: "",
    visual: "⚖️✨",
    notaDocente: "Dar la bienvenida con energía. Preguntar cómo se sienten hoy."
  },
  {
    id: "uso-cotidiano",
    momento: "Anticipación",
    dua: ["Compromiso", "Representación"],
    tipo: "actividad",
    titulo: "¿Dónde usamos ecuaciones?",
    subtitulo: "Activación de conocimientos",
    contenido: "Sin darnos cuenta, nuestro cerebro resuelve ecuaciones todos los días. Piensa en situaciones cotidianas donde buscas un valor desconocido.",
    formula: "",
    actividad: `
      <div class="lesson-slide-grid">
        <div class="lesson-slide-item">🛒 <span>Calcular el vuelto en la tienda.</span></div>
        <div class="lesson-slide-item">⏱️ <span>Estimar a qué hora salir para no llegar tarde.</span></div>
        <div class="lesson-slide-item">📊 <span>Calcular la nota necesaria para pasar el quimestre.</span></div>
        <div class="lesson-slide-item">🍕 <span>Dividir la cuenta de la pizza entre amigos.</span></div>
      </div>`,
    visual: "🤔💭",
    notaDocente: "Pedir a un estudiante que dé su propio ejemplo de la vida real."
  },
  {
    id: "situacion-problema",
    momento: "Anticipación",
    dua: ["Compromiso"],
    tipo: "problema",
    titulo: "El Misterio del Viaje",
    subtitulo: "Situación Problema",
    contenido: "Imagina que tienes $20 para gastar en el recreo durante la semana. Ya gastaste $8 el lunes. Si quieres gastar la misma cantidad los 4 días restantes, ¿cuánto puedes gastar cada día?",
    formula: "\\[ 8 + 4x = 20 \\]",
    actividad: "",
    visual: "💸🚌",
    notaDocente: "Dejar que intenten resolverlo mentalmente sin fórmulas primero."
  },
  {
    id: "meta-clase",
    momento: "Anticipación",
    dua: ["Representación"],
    tipo: "meta",
    titulo: "Nuestra Meta de Hoy",
    subtitulo: "Objetivo de aprendizaje",
    contenido: "Al finalizar esta clase, serás capaz de:<br><br>1. Identificar los elementos de una ecuación lineal.<br>2. Aplicar propiedades de igualdad (operaciones inversas).<br>3. Resolver ecuaciones fraccionarias de primer grado aplicadas al nivel de 3ro BGU.",
    formula: "",
    actividad: "",
    visual: "🎯🚀",
    notaDocente: "Leer el objetivo de forma clara y verificar comprensión."
  },
  {
    id: "definicion",
    momento: "Construcción",
    dua: ["Representación"],
    tipo: "concepto",
    titulo: "¿Qué es una Ecuación?",
    subtitulo: "Definición",
    contenido: "Una ecuación es una <strong>igualdad matemática</strong> entre dos expresiones (miembros) donde aparecen elementos conocidos y desconocidos (incógnitas).",
    formula: "\\[ 3x - 5 = 10 \\]",
    actividad: "",
    visual: "📝",
    notaDocente: "Enfatizar la palabra ‘igualdad’."
  },
  {
    id: "anatomia",
    momento: "Construcción",
    dua: ["Representación"],
    tipo: "concepto",
    titulo: "Anatomía de una Ecuación",
    subtitulo: "Partes principales",
    contenido: "Conocer los nombres correctos nos ayuda a hablar el mismo idioma matemático.",
    formula: "\\[ \\underbrace{3x + 2}_{\\text{Primer Miembro}} = \\underbrace{14}_{\\text{Segundo Miembro}} \\]",
    actividad: `<ul class="lesson-slide-list"><li><strong>Incógnita:</strong> La letra (ej. \\(x\\)) cuyo valor desconocemos.</li><li><strong>Términos:</strong> Cada uno de los sumandos (\\(3x\\), \\(2\\), \\(14\\)).</li><li><strong>Coeficiente:</strong> El número que multiplica a la incógnita (\\(3\\)).</li></ul>`,
    visual: "🔍",
    notaDocente: "Señalar físicamente cada parte en la proyección si es posible."
  },
  {
    id: "reto-quiz",
    momento: "Consolidación",
    dua: ["Acción y expresión", "Compromiso"],
    tipo: "quiz",
    titulo: "Reto Rápido",
    subtitulo: "Pon a prueba tu instinto",
    contenido: "Sin usar papel, ¿cuál es el primer paso correcto para resolver esta ecuación?",
    formula: "\\[ 3x - 7 = 14 \\]",
    actividad: `
      <div class="lesson-slide-quiz" data-quiz>
        <button class="lesson-slide-quiz-option" data-action="quiz" data-correct="false" data-feedback="Recuerda el orden: primero quitamos sumas o restas.">A) Dividir todo para 3</button>
        <button class="lesson-slide-quiz-option" data-action="quiz" data-correct="true" data-feedback="¡Exacto! Pasamos el -7 como suma.">B) Sumar 7 a ambos lados</button>
        <button class="lesson-slide-quiz-option" data-action="quiz" data-correct="false" data-feedback="No podemos combinar términos con x y sin x directamente.">C) Restar 3x menos 7</button>
        <p class="lesson-slide-feedback hidden" data-quiz-feedback></p>
      </div>`,
    visual: "🧠",
    notaDocente: "Esperar a que todos participen mentalmente antes de hacer clic."
  },
  {
    id: "practica-guiada",
    momento: "Consolidación",
    dua: ["Acción y expresión", "Representación"],
    tipo: "practica",
    titulo: "Práctica Guiada (Nivel BGU)",
    subtitulo: "Ejercicio #19 de la guía",
    contenido: "Saca tu cuaderno. Resolvamos juntos esta ecuación fraccionaria hallando el mínimo común múltiplo (mcm = 10).",
    formula: "\\[ \\frac{3(x+1)}{2} + \\frac{2(x+6)}{5} = 2 \\]",
    actividad: `
      <button class="lesson-slide-hint-btn" data-action="toggle-hint" data-target="hint-eq">Ver pistas iniciales 👀</button>
      <div id="hint-eq" class="lesson-slide-hint hidden">
        <strong>Paso 1:</strong> Multiplica TODA la ecuación por 10.<br>
        \\( 5[3(x+1)] + 2[2(x+6)] = 20 \\)<br>
        <strong>Paso 2:</strong> Ley distributiva.<br>
        \\( 15x + 15 + 4x + 24 = 20 \\)
      </div>`,
    visual: "✍️",
    notaDocente: "Dar 3 minutos. Pasear por las mesas. Solución final: x = -1."
  }
];
