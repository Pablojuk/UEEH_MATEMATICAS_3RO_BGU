// ═══════════════════════════════════════════════════════════════════════════
// Curriculum Configuration — UEEH Matemáticas 3.º BGU
// Data-driven master configuration for academic units and learning resources
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Catálogo maestro de unidades curriculares.
 * Para agregar una nueva unidad (ej. Unidad 6), basta con añadir un nuevo
 * objeto a este arreglo y crear los archivos en topics/ correspondiente.
 */
export const CURRICULUM_UNITS = [
  {
    unitNumber: 1,
    slug: "ecuaciones-lineales",
    badge: "[=]",
    status: "ACTIVA",
    title: "Ecuaciones de Primer Grado",
    description: "Fundamentos y resolución de problemas cotidianos.",
    modalSubtitle: "Cada actividad completada suma un 25% a tu progreso total.",
    cardButtonId: "btn-open-unit-card",
    requiresStudentData: true,
    routes: {
      presentation: {
        title: "Presentación de la Clase",
        description: "Repasa las diapositivas y conceptos explicados por el docente.",
        icon: "📽️",
        actionText: "Iniciar lectura →",
        actionColor: "text-moodle-orange",
        buttonId: "btn-modal-slides",
        type: "legacy-slides"
      },
      gamification: {
        title: "Gamificación",
        description: "Demuestra lo que sabes con retos y juegos interactivos.",
        icon: "🎮",
        actionText: "Empezar a jugar →",
        actionColor: "text-violet-600",
        buttonId: "btn-modal-game-data",
        type: "legacy-game"
      },
      classwork: {
        title: "Trabajo para la Casa",
        description: "Dos actividades independientes para fortalecer tu aprendizaje autónomo.",
        icon: "🏠",
        actionText: "Ver actividades →",
        actionColor: "text-blue-600",
        buttonId: "btn-modal-homework-data",
        type: "legacy-homework"
      },
      results: {
        title: "Resultados de las Actividades",
        description: "Consulta aquí tu desempeño en la Gamificación y el Trabajo para la Casa.",
        icon: "📊",
        buttonId: "btn-modal-results",
        type: "legacy-results"
      }
    }
  },
  {
    unitNumber: 2,
    slug: "introduccion-derivadas",
    badge: "f′",
    status: "ACTIVA",
    title: "Introducción a las Derivadas",
    description: "Cambio, pendiente y primeras reglas de derivación.",
    modalSubtitle: "Cada actividad completada suma un 25% a tu progreso total.",
    cardButtonId: "btn-open-unit-derivatives",
    requiresStudentData: true,
    routes: {
      presentation: {
        title: "Presentación de la Clase",
        description: "Aquí se colocarán las diapositivas del tema Introducción a las Derivadas.",
        image: "./assets/img/derivadas-slides.png",
        actionText: "Iniciar lectura →",
        actionColor: "text-moodle-orange",
        buttonId: "btn-unit-2-slides",
        type: "html-lesson",
        src: "./topics/introduccion-derivadas/presentation.html",
        viewerTitle: "Introducción a las Derivadas - Presentación de la Clase",
        viewTitle: "Introducción a las Derivadas",
        viewedKey: "ueeh_unidad2_presentation_viewed"
      },
      gamification: {
        title: "Gamificación",
        description: "Aquí se colocará el juego interactivo del tema Introducción a las Derivadas.",
        image: "./assets/img/derivadas-game.jpg",
        actionText: "Empezar a jugar →",
        actionColor: "text-violet-600",
        buttonId: "btn-unit-2-game",
        type: "html-lesson",
        src: "./topics/introduccion-derivadas/gamificacion.html",
        viewerTitle: "Escape Room: Protocolo Derivadas · Unidad 2",
        viewTitle: "Gamificación · Introducción a las Derivadas"
      },
      classwork: {
        title: "Trabajo para la Casa",
        description: "Aquí se colocarán las actividades independientes para reforzar el tema.",
        image: "./assets/img/derivadas-homework.png",
        actionText: "Ver actividades →",
        actionColor: "text-blue-600",
        buttonId: "btn-unit-2-homework",
        type: "html-lesson",
        src: "./topics/introduccion-derivadas/deber.html",
        viewerTitle: "Deber interactivo | Derivadas Unidad 2",
        viewTitle: "Trabajo para la Casa · Introducción a las Derivadas"
      },
      results: {
        title: "Resultados de las Actividades",
        description: "Aquí se consultará el desempeño del estudiante en este tema.",
        image: "./assets/img/derivadas-results.png",
        buttonId: "btn-unit-2-results",
        type: "legacy-unit2-results"
      }
    }
  },
  {
    unitNumber: 3,
    slug: "operaciones-matrices",
    badge: "[M]",
    status: "ACTIVA",
    title: "Operaciones con matrices",
    description: "Conceptos básicos, suma, resta y multiplicación por un escalar.",
    modalSubtitle: "Cada actividad completada suma un 25% a tu progreso total.",
    cardButtonId: "btn-open-unit-matrices",
    requiresStudentData: true,
    routes: {
      presentation: {
        title: "Presentación de la Clase",
        description: "Diapositivas y conceptos clave sobre operaciones matriciales.",
        image: "./assets/img/matrices-slides.png",
        actionText: "Iniciar lectura →",
        actionColor: "text-moodle-orange",
        buttonId: "btn-unit-3-slides",
        type: "html-lesson",
        src: "./topics/operaciones-matrices/presentation.html",
        viewerTitle: "Operaciones con matrices - Presentación de la Clase",
        viewTitle: "Operaciones con matrices",
        viewedKey: "ueeh_unidad3_presentation_viewed"
      },
      gamification: {
        title: "Gamificación",
        description: "Retos dinámicos para reforzar la suma, resta y producto escalar.",
        image: "./assets/img/matrices-game.png",
        actionText: "Empezar a jugar →",
        actionColor: "text-violet-600",
        buttonId: "btn-unit-3-game",
        type: "html-lesson",
        src: "./topics/operaciones-matrices/gamificacion.html",
        viewerTitle: "Escape Room: Protocolo Matrices · Unidad 3",
        viewTitle: "Gamificación · Operaciones con matrices"
      },
      classwork: {
        title: "Trabajo para la Casa",
        description: "Aquí se colocarán las actividades independientes para reforzar el tema.",
        image: "./assets/img/matrices-homework.png",
        actionText: "Ver actividades →",
        actionColor: "text-blue-600",
        buttonId: "btn-unit-3-homework",
        type: "html-lesson",
        src: "./topics/operaciones-matrices/deber.html",
        viewerTitle: "Deber interactivo | Matrices Unidad 3",
        viewTitle: "Trabajo para la Casa · Operaciones con matrices"
      },
      results: {
        title: "Resultados de las Actividades",
        description: "Aquí se consultará el desempeño del estudiante en este tema.",
        image: "./assets/img/matrices-results.png",
        buttonId: "btn-unit-3-results",
        type: "legacy-unit3-results"
      }
    }
  },
  {
    unitNumber: 4,
    slug: "producto-matrices",
    badge: "A×B",
    status: "ACTIVA",
    title: "Producto de matrices",
    description: "Multiplicación de matrices, regla fila por columna y ejercicios guiados.",
    modalSubtitle: "Cada actividad completada suma un 25% a tu progreso total.",
    cardButtonId: "btn-open-unit-producto-matrices",
    requiresStudentData: true,
    routes: {
      presentation: {
        title: "Presentación de la Clase",
        description: "Diapositivas del tema Producto de matrices M3×3.",
        icon: "📽️",
        actionText: "Iniciar lectura →",
        actionColor: "text-moodle-orange",
        buttonId: "btn-unit-4-slides",
        type: "html-lesson",
        src: "./topics/producto-matrices/presentation.html",
        viewerTitle: "Producto de matrices - Presentación de la Clase",
        viewTitle: "Producto de matrices",
        viewedKey: "ueeh_unidad4_presentation_viewed"
      },
      gamification: {
        title: "Gamificación",
        description: "Juego interactivo Matrix-Space sobre Producto de matrices.",
        icon: "🎮",
        actionText: "Empezar a jugar →",
        actionColor: "text-violet-600",
        buttonId: "btn-unit-4-game",
        type: "html-lesson",
        src: "./topics/producto-matrices/gamificacion.html",
        viewerTitle: "Matrix-Space: Simulador Fluido · Unidad 4",
        viewTitle: "Gamificación · Producto de matrices"
      },
      classwork: {
        title: "Trabajo para la Casa",
        description: "Actividades independientes para reforzar el producto de matrices.",
        icon: "🏠",
        actionText: "Ver actividades →",
        actionColor: "text-blue-600",
        buttonId: "btn-unit-4-homework",
        type: "html-lesson",
        src: "./topics/producto-matrices/deber.html",
        viewerTitle: "Deber interactivo | Producto de matrices Unidad 4",
        viewTitle: "Trabajo para la Casa · Producto de matrices"
      },
      results: {
        title: "Resultados de las Actividades",
        description: "Consulta tu desempeño en Gamificación y Trabajo para la Casa.",
        icon: "📊",
        buttonId: "btn-unit-4-results",
        type: "legacy-unit4-results"
      }
    }
  },
  {
    unitNumber: 5,
    slug: "unit5-determinantes",
    badge: "|A|",
    status: "ACTIVA",
    title: "Determinantes de matrices 2x2 y 3x3",
    description: "Propiedades, regla de Sarrus, determinantes de orden 2 y 3, e invertibilidad.",
    modalSubtitle: "Cada actividad completada se registra en Supabase como tu calificación oficial.",
    cardButtonId: "btn-open-unit-determinantes",
    requiresStudentData: false,
    routes: {
      presentation: {
        title: "Presentación de la Clase",
        description: "22 diapositivas interactivas explicadas paso a paso.",
        icon: "📽️",
        actionText: "Iniciar lectura →",
        actionColor: "text-moodle-orange",
        buttonId: "btn-unit-5-slides",
        type: "html-lesson",
        src: "./topics/unit5-determinantes/presentation.html",
        viewerTitle: "Determinantes de matrices - Presentación de la Clase",
        viewTitle: "Determinantes de matrices 2x2 y 3x3"
      },
      gamification: {
        title: "Gamificación",
        description: "Odisea Espacial: La Ruta de los 6 Planetas.",
        icon: "🚀",
        actionText: "Empezar a jugar →",
        actionColor: "text-violet-600",
        buttonId: "btn-unit-5-game",
        type: "html-lesson",
        src: "./topics/unit5-determinantes/gamificacion.html",
        viewerTitle: "Odisea Espacial: Ruta de los 6 Planetas · Unidad 5",
        viewTitle: "Gamificación · Odisea Espacial"
      },
      classwork: {
        title: "Trabajo en Clase",
        description: "Deber interactivo con 14 ejercicios + 8 de recuperación.",
        icon: "📐",
        actionText: "Ver actividades →",
        actionColor: "text-blue-600",
        buttonId: "btn-unit-5-homework",
        type: "html-lesson",
        src: "./topics/unit5-determinantes/deber.html",
        viewerTitle: "Deber Interactivo | Determinantes 2x2 y 3x3 · Unidad 5",
        viewTitle: "Trabajo en Clase · Determinantes"
      },
      results: {
        title: "Resultados de las Actividades",
        description: "Consulta tu desempeño en la plataforma oficial Supabase.",
        icon: "📊",
        buttonId: "btn-unit-5-results",
        type: "supabase-summary",
        viewTitle: "Resultados · Unidad 5 Determinantes"
      }
    }
  },
  {
    unitNumber: 6,
    slug: "unit6-sucesiones",
    badge: "aₙ",
    status: "ACTIVA",
    title: "Sucesiones convergentes y límite de una sucesión",
    description: "Término general, cálculo de límites al infinito, convergencia y divergencia de sucesiones.",
    modalSubtitle: "Cada actividad completada se registra en Supabase como tu calificación oficial.",
    cardButtonId: "btn-open-unit-sucesiones",
    requiresStudentData: false,
    routes: {
      presentation: {
        title: "Presentación de la Clase",
        description: "24 diapositivas interactivas con teoría, ejemplos y ejercicios formativos.",
        icon: "📽️",
        actionText: "Iniciar lectura →",
        actionColor: "text-moodle-orange",
        buttonId: "btn-unit-6-slides",
        type: "html-lesson",
        src: "./topics/unit6-sucesiones/presentation.html",
        viewerTitle: "Sucesiones convergentes - Presentación de la Clase",
        viewTitle: "Sucesiones convergentes y límite de una sucesión"
      },
      gamification: {
        title: "Gamificación",
        description: "Space Math Invaders 1984: Destruye los aliens calculando límites.",
        icon: "👾",
        actionText: "Empezar a jugar →",
        actionColor: "text-violet-600",
        buttonId: "btn-unit-6-game",
        type: "html-lesson",
        src: "./topics/unit6-sucesiones/gamificacion.html",
        viewerTitle: "Space Math Invaders 1984 · Unidad 6",
        viewTitle: "Gamificación · Space Math Invaders"
      },
      classwork: {
        title: "Trabajo en Clase",
        description: "Deber interactivo con 20 ejercicios iniciales + 10 de recuperación.",
        icon: "📐",
        actionText: "Ver actividades →",
        actionColor: "text-blue-600",
        buttonId: "btn-unit-6-homework",
        type: "html-lesson",
        src: "./topics/unit6-sucesiones/deber.html",
        viewerTitle: "Deber Interactivo | Sucesiones y Límites · Unidad 6",
        viewTitle: "Trabajo en Clase · Sucesiones"
      },
      results: {
        title: "Resultados de las Actividades",
        description: "Consulta tu desempeño en la plataforma oficial Supabase.",
        icon: "📊",
        buttonId: "btn-unit-6-results",
        type: "supabase-summary",
        viewTitle: "Resultados · Unidad 6 Sucesiones"
      }
    }
  }
];

/**
 * Busca una unidad por su número.
 */
export function getUnitByNumber(unitNumber) {
  return CURRICULUM_UNITS.find((u) => u.unitNumber === Number(unitNumber)) || null;
}

/**
 * Busca una unidad por su slug.
 */
export function getUnitBySlug(slug) {
  return CURRICULUM_UNITS.find((u) => u.slug === slug) || null;
}
