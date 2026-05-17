const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyAcZYZeZjo-_H2KXdpjNsxpjRY9Y3kU-Rv7VjCjKw3tELL5YAXqVbfuhI6fwdIGXii/exec";

const SHEET_NAME = "Resultados";
const GAME_STATE_KEY = "ueeh_memorama_ecuaciones_estado_v1";

const exerciseBank = [
  {
    id: 17,
    equation: "\\[ \\frac{2x+1}{12} + \\frac{2(1-2x)}{24} = \\frac{x}{18} \\]",
    answer: "3",
    hint: "Saca el mínimo común múltiplo de 12, 24 y 18. El mcm es 72.",
    steps:
      "72\\left(\\frac{2x+1}{12}\\right) + 72\\left(\\frac{2(1-2x)}{24}\\right) = 72\\left(\\frac{x}{18}\\right)<br>6(2x+1) + 3[2(1-2x)] = 4x<br>12x + 6 + 6 - 12x = 4x<br>12 = 4x<br>x = 3"
  },
  {
    id: 18,
    equation: "\\[ \\frac{x-2}{3-x} = -\\frac{5}{4} \\]",
    answer: "7",
    hint: "Multiplica en cruz. Ten cuidado con el signo negativo.",
    steps:
      "4(x-2) = -5(3-x)<br>4x - 8 = -15 + 5x<br>-8 + 15 = 5x - 4x<br>7 = x"
  },
  {
    id: 19,
    equation: "\\[ \\frac{3(x+1)}{2} + \\frac{2(x+6)}{5} = 2 \\]",
    answer: "-1",
    hint: "El mcm de 2 y 5 es 10. Multiplica toda la ecuación por 10.",
    steps:
      "5[3(x+1)] + 2[2(x+6)] = 20<br>15x + 15 + 4x + 24 = 20<br>19x + 39 = 20<br>19x = -19<br>x = -1"
  },
  {
    id: 20,
    equation: "\\[ x - \\frac{2(x+1)}{3} = 1 - \\frac{3x-2}{4} \\]",
    answer: "2",
    hint: "El mcm de 3 y 4 es 12. Cuidado con el signo negativo antes de la fracción.",
    steps:
      "12x - 4[2(x+1)] = 12 - 3(3x-2)<br>12x - 8x - 8 = 12 - 9x + 6<br>4x - 8 = 18 - 9x<br>13x = 26<br>x = 2"
  },
  {
    id: 21,
    equation: "\\[ \\frac{2(x-3)}{6} - \\frac{3(x-2)}{4} = 1 \\]",
    answer: "-6/5",
    hint: "Puedes simplificar primero o usar mcm = 12.",
    steps:
      "2[2(x-3)] - 3[3(x-2)] = 12<br>4x - 12 - (9x - 18) = 12<br>4x - 12 - 9x + 18 = 12<br>-5x + 6 = 12<br>-5x = 6<br>x = -\\frac{6}{5}"
  },
  {
    id: 22,
    equation: "\\[ \\frac{3(-x+5)}{4} + \\frac{2(x-3)}{3} = 6 \\]",
    answer: "-51",
    hint: "El mcm de 4 y 3 es 12.",
    steps:
      "3[3(-x+5)] + 4[2(x-3)] = 72<br>-9x + 45 + 8x - 24 = 72<br>-x + 21 = 72<br>-x = 51<br>x = -51"
  },
  {
    id: 23,
    equation: "\\[ \\frac{5(2x-3)}{4} - \\frac{4(x-2)}{3} = \\frac{1}{2} \\]",
    answer: "19/14",
    hint: "El mcm de 4, 3 y 2 es 12.",
    steps:
      "3[5(2x-3)] - 4[4(x-2)] = 6<br>30x - 45 - 16x + 32 = 6<br>14x - 13 = 6<br>14x = 19<br>x = \\frac{19}{14}"
  },
  {
    id: 24,
    equation: "\\[ \\frac{2x}{3} + \\frac{x}{2} + \\frac{x}{3} + \\frac{x}{4} = 700 \\]",
    answer: "400",
    hint: "El mcm de 3, 2 y 4 es 12.",
    steps:
      "4(2x) + 6x + 4x + 3x = 12(700)<br>8x + 6x + 4x + 3x = 8400<br>21x = 8400<br>x = 400"
  },
  {
    id: 25,
    equation: "\\[ x + \\frac{3(x-5)}{2} = 3 + \\frac{5x-21}{2} \\]",
    answer: "infinitas soluciones",
    isIdentity: true,
    hint: "Multiplica toda la ecuación por 2 y observa qué ocurre en ambos lados.",
    steps:
      "2x + 3(x-5) = 6 + 5x - 21<br>2x + 3x - 15 = 5x - 15<br>5x - 15 = 5x - 15<br>0 = 0<br>Es una identidad: tiene infinitas soluciones."
  }
];

const EMOJIS = ["🚀", "🧠", "📐", "🔬", "💡", "📚", "🎯", "✏️"];
const TOTAL_PAIRS = EMOJIS.length;

let cardsArray = [];
let flippedCards = [];
let matchedIndexes = [];
let pendingMatchIndexes = [];

let matchedPairs = 0;
let attempts = 0;
let isBoardLocked = false;

let activeExercise = null;
let wrongAttempts = 0;
let totalExerciseErrors = 0;
let exercisesSolved = 0;
let availableExercises = [...exerciseBank];
let resultSubmitted = false;

const sounds = {
  click: new Audio("./sounds/click.wav"),
  match: new Audio("./sounds/match.wav"),
  error: new Audio("./sounds/error.wav"),
  win: new Audio("./sounds/win.wav")
};

export function crearGameShell() {
  return `
    <section class="game-shell bg-[#F8FAFC] text-[#313849] rounded-3xl border border-neutral-200 shadow-xl p-4 sm:p-6 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none opacity-[0.04] text-[#1E293B] overflow-hidden">
        <span class="absolute top-[5%] left-[5%] text-6xl">∑</span>
        <span class="absolute top-[15%] right-[10%] text-7xl">π</span>
        <span class="absolute top-[42%] left-[8%] text-5xl">√</span>
        <span class="absolute top-[50%] right-[15%] text-6xl">x²</span>
        <span class="absolute bottom-[18%] left-[12%] text-7xl">∞</span>
        <span class="absolute bottom-[8%] right-[20%] text-5xl">=</span>
      </div>

      <div class="relative z-10 max-w-4xl mx-auto">
        <header class="text-center mb-6">
          <div class="inline-flex items-center rounded-full bg-orange-50 text-[#F47C20] px-3 py-1 text-xs font-bold mb-3">
            🎮 Gamificación
          </div>
          <h2 class="heading-font text-3xl sm:text-4xl font-bold text-[#1E293B]">
            Memorama Algebraico
          </h2>
          <p class="text-[#6B7280] text-sm mt-2">
            Encuentra los pares y resuelve un reto algebraico para asegurar cada acierto.
          </p>
        </header>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm mb-6">
          <div class="text-center">
            <span class="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Pares</span>
            <span id="game-ui-matches" class="heading-font text-xl font-bold text-[#1E293B]">0 / 8</span>
          </div>
          <div class="text-center">
            <span class="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Intentos</span>
            <span id="game-ui-attempts" class="heading-font text-xl font-bold text-[#1E293B]">0</span>
          </div>
          <div class="text-center">
            <span class="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Ejercicios</span>
            <span id="game-ui-exercises" class="heading-font text-xl font-bold text-[#1E293B]">0 / 8</span>
          </div>
          <div class="text-center">
            <span class="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">Errores</span>
            <span id="game-ui-errors" class="heading-font text-xl font-bold text-[#1E293B]">0</span>
          </div>
        </div>

        <main
          id="game-board"
          class="grid grid-cols-4 gap-2 sm:gap-3 max-w-[620px] mx-auto"
          role="grid"
          aria-label="Tablero de Memorama Algebraico"
        ></main>

        <div class="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            id="game-reset-btn"
            class="px-6 py-3 rounded-xl bg-[#1E293B] hover:bg-[#313849] text-white text-sm font-bold transition-colors"
            type="button"
          >
            Reiniciar juego
          </button>
        </div>
      </div>
    </section>

    <div id="game-exercise-modal" class="fixed inset-0 z-[80] bg-[#1E293B]/85 backdrop-blur-sm hidden items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto text-center">
        <h2 class="heading-font text-2xl font-bold text-[#1E293B]">
          Reto Algebraico Desbloqueado
        </h2>
        <p class="text-[#6B7280] text-sm mt-1">
          Resuelve la ecuación para asegurar tu par.
        </p>

        <div
          id="game-math-equation"
          class="text-xl sm:text-2xl my-6 p-5 bg-[#F8FAFC] border border-neutral-200 rounded-2xl overflow-x-auto"
        ></div>

        <input
          id="game-answer-input"
          type="text"
          placeholder="Ingresa el valor de x. Ej: 3, -1, 5/4"
          autocomplete="off"
          class="w-full bg-neutral-50 border-2 border-neutral-200 rounded-xl px-4 py-3 text-center text-sm text-[#1E293B] focus:outline-none focus:border-[#F47C20]"
        />

        <button
          id="game-check-answer-btn"
          class="mt-4 w-full px-6 py-3 rounded-xl bg-[#F47C20] hover:bg-orange-600 text-white text-sm font-bold transition-colors"
          type="button"
        >
          Comprobar respuesta
        </button>

        <button
          id="game-hint-btn"
          class="hidden mt-3 w-full px-6 py-3 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-50 text-[#6B7280] text-sm font-bold transition-colors"
          type="button"
        >
          Ver pista
        </button>

        <div id="game-exercise-feedback" class="hidden mt-4 p-3 rounded-xl text-sm font-bold"></div>

        <div id="game-hint-container" class="hidden mt-4 text-left bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
          <strong>Pista:</strong>
          <span id="game-hint-text"></span>
          <div id="game-steps-text" class="hidden mt-3 pt-3 border-t border-amber-200"></div>
        </div>
      </div>
    </div>

    <div id="game-win-modal" class="fixed inset-0 z-[85] bg-[#1E293B]/85 backdrop-blur-sm hidden items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl text-center">
        <div class="text-6xl mb-3">🏆</div>
        <h2 class="heading-font text-2xl font-bold text-[#1E293B]">
          ¡Misión cumplida!
        </h2>
        <p class="text-[#6B7280] text-sm mt-2">
          Encontraste todos los pares y resolviste los retos algebraicos.
        </p>

        <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-2xl bg-neutral-50 border border-neutral-200 p-4">
            <span class="block text-xs text-[#6B7280] font-bold uppercase">Intentos</span>
            <span id="game-win-attempts" class="heading-font text-xl font-bold text-[#1E293B]">0</span>
          </div>
          <div class="rounded-2xl bg-neutral-50 border border-neutral-200 p-4">
            <span class="block text-xs text-[#6B7280] font-bold uppercase">Nota</span>
            <span id="game-win-score" class="heading-font text-xl font-bold text-[#F47C20]">10</span>
          </div>
        </div>

        <p id="game-submit-status" class="mt-4 text-xs font-semibold text-[#6B7280]">
          Preparando envío de resultados...
        </p>

        <button
          id="game-play-again-btn"
          class="mt-5 w-full px-6 py-3 rounded-xl bg-[#1E293B] hover:bg-[#313849] text-white text-sm font-bold transition-colors"
          type="button"
        >
          Jugar otra vez
        </button>
      </div>
    </div>
  `;
}

export function activarGameShell() {
  const boardEl = document.getElementById("game-board");

  if (!boardEl) return;

  const restored = loadGameState();

  if (!restored) {
    resetState();
  }

  bindGameEvents();
  createBoard();
  updateStats();

  if (activeExercise && pendingMatchIndexes.length === 2) {
    isBoardLocked = true;

    setTimeout(() => {
      reopenPendingExerciseModal();
    }, 300);
  }
}

function resetState() {
  cardsArray = [];
  flippedCards = [];
  matchedIndexes = [];
  pendingMatchIndexes = [];
  matchedPairs = 0;
  attempts = 0;
  isBoardLocked = false;
  activeExercise = null;
  wrongAttempts = 0;
  totalExerciseErrors = 0;
  exercisesSolved = 0;
  availableExercises = [...exerciseBank];
  resultSubmitted = false;

  clearGameState();
}

function bindGameEvents() {
  document.getElementById("game-reset-btn")?.addEventListener("click", () => {
    resetState();
    createBoard();
    updateStats();
  });

  document.getElementById("game-check-answer-btn")?.addEventListener("click", validateExerciseAnswer);

  document.getElementById("game-hint-btn")?.addEventListener("click", () => {
    showHint(false);
  });

  document.getElementById("game-answer-input")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") validateExerciseAnswer();
  });

  document.getElementById("game-play-again-btn")?.addEventListener("click", () => {
    closeModal("game-win-modal");
    resetState();
    createBoard();
    updateStats();
  });
}

function createBoard() {
  const boardEl = document.getElementById("game-board");

  if (!boardEl) return;

  boardEl.innerHTML = "";

  if (!cardsArray || cardsArray.length !== TOTAL_PAIRS * 2) {
    const pairs = [...EMOJIS, ...EMOJIS];
    cardsArray = shuffleArray(pairs);
  }

  cardsArray.forEach((emoji, index) => {
    const card = document.createElement("button");

    card.className =
      "aspect-square rounded-xl bg-[#1E293B] text-white flex items-center justify-center relative overflow-hidden shadow-md transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#F47C20]";

    card.type = "button";
    card.setAttribute("aria-label", `Tarjeta ${index + 1}`);
    card.dataset.id = emoji;
    card.dataset.index = String(index);

    card.innerHTML = `
      <span class="game-card-cover absolute inset-0 flex items-center justify-center text-3xl text-white/25 font-bold">?</span>
      <span class="game-card-content hidden text-3xl sm:text-4xl">${emoji}</span>
    `;

    card.addEventListener("click", () => handleCardClick(card));
    boardEl.appendChild(card);

    if (matchedIndexes.includes(index) || pendingMatchIndexes.includes(index)) {
      revealCard(card);
      markCardMatched(card);
    }
  });
}

function handleCardClick(card) {
  if (
    isBoardLocked ||
    card.classList.contains("game-flipped") ||
    card.classList.contains("game-matched")
  ) {
    return;
  }

  playSound("click");
  revealCard(card);
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    attempts += 1;
    updateStats();
    saveGameState();
    checkMatch();
  }
}

function revealCard(card) {
  card.classList.add("game-flipped", "bg-white", "border", "border-neutral-200");
  card.classList.remove("bg-[#1E293B]", "text-white");

  card.querySelector(".game-card-cover")?.classList.add("hidden");
  card.querySelector(".game-card-content")?.classList.remove("hidden");
}

function hideCard(card) {
  card.classList.remove("game-flipped", "bg-white", "border", "border-neutral-200");
  card.classList.add("bg-[#1E293B]", "text-white");

  card.querySelector(".game-card-cover")?.classList.remove("hidden");
  card.querySelector(".game-card-content")?.classList.add("hidden");
}

function markCardMatched(card) {
  card.classList.remove("game-flipped");
  card.classList.add("game-matched", "bg-emerald-50", "border", "border-emerald-300");
  card.disabled = true;
}

function checkMatch() {
  isBoardLocked = true;

  const [card1, card2] = flippedCards;
  const match = card1.dataset.id === card2.dataset.id;

  if (match) {
    setTimeout(() => {
      markCardMatched(card1);
      markCardMatched(card2);
      playSound("match");

      pendingMatchIndexes = [
        Number(card1.dataset.index),
        Number(card2.dataset.index)
      ];

      openExerciseModal();
      saveGameState();
    }, 500);

    return;
  }

  playSound("error");

  setTimeout(() => {
    hideCard(card1);
    hideCard(card2);
    flippedCards = [];
    isBoardLocked = false;
    saveGameState();
  }, 900);
}

function openExerciseModal() {
  wrongAttempts = 0;

  const answerInput = document.getElementById("game-answer-input");
  const feedbackEl = document.getElementById("game-exercise-feedback");
  const hintBtn = document.getElementById("game-hint-btn");
  const hintContainer = document.getElementById("game-hint-container");
  const stepsText = document.getElementById("game-steps-text");

  if (answerInput) answerInput.value = "";
  feedbackEl?.classList.add("hidden");
  hintBtn?.classList.add("hidden");
  hintContainer?.classList.add("hidden");
  stepsText?.classList.add("hidden");

  if (availableExercises.length === 0) {
    availableExercises = [...exerciseBank];
  }

  const randomIndex = Math.floor(Math.random() * availableExercises.length);
  activeExercise = availableExercises.splice(randomIndex, 1)[0];

  const mathContainer = document.getElementById("game-math-equation");

  if (mathContainer) {
    mathContainer.innerHTML = activeExercise.equation;
    renderMath(mathContainer);
  }

  saveGameState();
  openModal("game-exercise-modal");

  setTimeout(() => {
    answerInput?.focus();
  }, 100);
}

function reopenPendingExerciseModal() {
  const answerInput = document.getElementById("game-answer-input");
  const feedbackEl = document.getElementById("game-exercise-feedback");
  const hintBtn = document.getElementById("game-hint-btn");
  const hintContainer = document.getElementById("game-hint-container");
  const hintText = document.getElementById("game-hint-text");
  const stepsText = document.getElementById("game-steps-text");
  const mathContainer = document.getElementById("game-math-equation");

  if (!activeExercise || !mathContainer) return;

  if (answerInput) answerInput.value = "";

  feedbackEl?.classList.add("hidden");

  if (wrongAttempts >= 2) {
    hintBtn?.classList.remove("hidden");
  } else {
    hintBtn?.classList.add("hidden");
  }

  if (wrongAttempts >= 3 && activeExercise.steps) {
    hintContainer?.classList.remove("hidden");

    if (hintText) {
      hintText.innerHTML = activeExercise.hint;
    }

    if (stepsText) {
      stepsText.classList.remove("hidden");
      stepsText.innerHTML = `<strong>Desarrollo:</strong><br>${activeExercise.steps}`;
    }
  } else {
    hintContainer?.classList.add("hidden");
    stepsText?.classList.add("hidden");
  }

  mathContainer.innerHTML = activeExercise.equation;
  renderMath(mathContainer);

  openModal("game-exercise-modal");

  setTimeout(() => {
    answerInput?.focus();
  }, 100);
}

function validateExerciseAnswer() {
  if (!activeExercise) return;

  const answerInput = document.getElementById("game-answer-input");
  const userInput = answerInput?.value.trim().toLowerCase() || "";

  if (!userInput) return;

  let isCorrect = false;

  if (activeExercise.isIdentity) {
    const validTexts = [
      "infinitas soluciones",
      "infinito",
      "identidad",
      "todos los reales",
      "reales",
      "r"
    ];

    isCorrect = validTexts.some((text) => userInput.includes(text));
  } else {
    if (normalizeAnswer(userInput) === normalizeAnswer(activeExercise.answer)) {
      isCorrect = true;
    } else {
      const userNumber = parseToNumber(userInput);
      const correctNumber = parseToNumber(activeExercise.answer);

      if (!Number.isNaN(userNumber) && !Number.isNaN(correctNumber)) {
        isCorrect = Math.abs(userNumber - correctNumber) < 0.0001;
      }
    }
  }

  if (isCorrect) {
    playSound("match");
    showExerciseFeedback(true, "¡Excelente! Despeje correcto.");

    setTimeout(() => {
      closeModal("game-exercise-modal");

      matchedIndexes = Array.from(
        new Set([...matchedIndexes, ...pendingMatchIndexes])
      );

      pendingMatchIndexes = [];
      matchedPairs = matchedIndexes.length / 2;
      exercisesSolved += 1;
      activeExercise = null;
      wrongAttempts = 0;
      flippedCards = [];
      isBoardLocked = false;

      updateStats();
      saveGameState();
      checkVictory();
    }, 1100);

    return;
  }

  playSound("error");
  wrongAttempts += 1;
  totalExerciseErrors += 1;

  showExerciseFeedback(false, "Respuesta incorrecta. Inténtalo de nuevo.");
  updateStats();
  saveGameState();

  if (wrongAttempts >= 2) {
    document.getElementById("game-hint-btn")?.classList.remove("hidden");
  }

  if (wrongAttempts >= 3) {
    showHint(true);
  }

  answerInput?.focus();
}

function showExerciseFeedback(isSuccess, message) {
  const feedbackEl = document.getElementById("game-exercise-feedback");

  if (!feedbackEl) return;

  feedbackEl.className = `mt-4 p-3 rounded-xl text-sm font-bold ${
    isSuccess
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-red-50 text-red-700 border border-red-200"
  }`;

  feedbackEl.textContent = `${isSuccess ? "✅" : "❌"} ${message}`;
}

function showHint(forceSteps = false) {
  const hintContainer = document.getElementById("game-hint-container");
  const hintText = document.getElementById("game-hint-text");
  const stepsText = document.getElementById("game-steps-text");

  if (!activeExercise || !hintContainer || !hintText || !stepsText) return;

  hintContainer.classList.remove("hidden");
  hintText.innerHTML = activeExercise.hint;

  if (forceSteps && activeExercise.steps) {
    stepsText.classList.remove("hidden");
    stepsText.innerHTML = `<strong>Desarrollo:</strong><br>${activeExercise.steps}`;
    renderMath(stepsText);
  }
}

function checkVictory() {
  if (matchedPairs !== TOTAL_PAIRS) return;

  isBoardLocked = true;
  playSound("win");

  const summary = buildResultSummary();

  document.getElementById("game-win-attempts").textContent = String(attempts);
  document.getElementById("game-win-score").textContent = summary.notaFinal.toFixed(2);

  openModal("game-win-modal");
  clearGameState();
  submitResultToSheets(summary);
}

function buildResultSummary() {
  const minimumAttempts = TOTAL_PAIRS;
  const extraMemoryAttempts = Math.max(0, attempts - minimumAttempts);
  const rawScore = 10 - totalExerciseErrors * 0.5 - extraMemoryAttempts * 0.15;
  const notaFinal = Math.max(5, Math.min(10, rawScore));
  const porcentajeFinal = Math.round(notaFinal * 10);
  const nivel = notaFinal >= 9 ? "Excelente" : notaFinal >= 7 ? "Logrado" : "En proceso";
  const estado = notaFinal >= 7 ? "Aprobado" : "Requiere refuerzo";

  return {
    notaFinal,
    porcentajeFinal,
    nivel,
    estado,
    intentos: attempts,
    paresEncontrados: matchedPairs,
    ejerciciosResueltos: exercisesSolved,
    erroresEjercicios: totalExerciseErrors,
    observacion:
      notaFinal >= 9
        ? "Excelente desempeño en el memorama algebraico."
        : notaFinal >= 7
          ? "Buen avance. Se recomienda seguir practicando signos y fracciones."
          : "Requiere refuerzo en despeje y manejo de fracciones."
  };
}

function submitResultToSheets(summary) {
  if (resultSubmitted) return;

  resultSubmitted = true;

  const statusEl = document.getElementById("game-submit-status");

  if (statusEl) {
    statusEl.textContent = "Enviando resultados al registro...";
  }

  const student = getStudentData();

  const payload = {
    hoja: SHEET_NAME,
    nombre: student.nombre,
    curso: student.curso,
    paralelo: student.paralelo,
    tema: "Ecuaciones de Primer Grado",
    tipoActividad: "Gamificación - Memorama Algebraico",
    numeroEjercicios: String(summary.ejerciciosResueltos),
    puntajeInicial: summary.notaFinal.toFixed(2),
    promedioInicial: summary.notaFinal.toFixed(2),
    recuperacionHabilitada: summary.notaFinal < 7 ? "SI" : "NO",
    promedioRecuperacion: "",
    notaFinal: summary.notaFinal.toFixed(2),
    porcentajeFinal: String(summary.porcentajeFinal),
    nivel: summary.nivel,
    estado: summary.estado,
    fechaLimite: "",
    observacion: `${summary.observacion} Intentos: ${summary.intentos}. Errores en ejercicios: ${summary.erroresEjercicios}.`
  };

  submitByHiddenForm(payload);

  setTimeout(() => {
    if (statusEl) {
      statusEl.textContent = "Resultado enviado. Puedes revisar el registro en tu hoja de cálculo.";
    }
  }, 1200);
}

function submitByHiddenForm(payload) {
  const iframeName = `game-submit-frame-${Date.now()}`;

  const iframe = document.createElement("iframe");
  iframe.name = iframeName;
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  const form = document.createElement("form");
  form.method = "GET";
  form.action = APPS_SCRIPT_URL;
  form.target = iframeName;
  form.style.display = "none";

  Object.entries(payload).forEach(([key, value]) => {
    const input = document.createElement("input");

    input.type = "hidden";
    input.name = key;
    input.value = value ?? "";

    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();

  setTimeout(() => {
    form.remove();
    iframe.remove();
  }, 5000);
}

function getStudentData() {
  return {
    nombre:
      localStorage.getItem("ueeh_student_name") ||
      localStorage.getItem("studentName") ||
      "Estudiante",
    curso:
      localStorage.getItem("ueeh_student_grade") ||
      localStorage.getItem("studentGrade") ||
      "3ro BGU",
    paralelo:
      localStorage.getItem("ueeh_student_parallel") ||
      localStorage.getItem("studentParallel") ||
      "A"
  };
}

function updateStats() {
  const matchesEl = document.getElementById("game-ui-matches");
  const attemptsEl = document.getElementById("game-ui-attempts");
  const exercisesEl = document.getElementById("game-ui-exercises");
  const errorsEl = document.getElementById("game-ui-errors");

  if (matchesEl) matchesEl.textContent = `${matchedPairs} / ${TOTAL_PAIRS}`;
  if (attemptsEl) attemptsEl.textContent = String(attempts);
  if (exercisesEl) exercisesEl.textContent = `${exercisesSolved} / ${TOTAL_PAIRS}`;
  if (errorsEl) errorsEl.textContent = String(totalExerciseErrors);
}

function openModal(id) {
  const modal = document.getElementById(id);

  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeModal(id) {
  const modal = document.getElementById(id);

  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function shuffleArray(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function playSound(type) {
  try {
    const sound = sounds[type];

    if (!sound) return;

    sound.currentTime = 0;
    sound.play().catch(() => {});
  } catch {
    // Los navegadores pueden bloquear audio automático. El juego continúa sin romperse.
  }
}

function normalizeAnswer(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace("x=", "")
    .replace(",", ".");
}

function parseToNumber(value) {
  const normalized = normalizeAnswer(value);

  if (normalized.includes("/")) {
    const [numerator, denominator] = normalized.split("/").map(Number);

    if (!denominator) return Number.NaN;

    return numerator / denominator;
  }

  return Number(normalized);
}

function saveGameState() {
  const state = {
    cardsArray,
    matchedIndexes,
    pendingMatchIndexes,
    matchedPairs,
    attempts,
    totalExerciseErrors,
    exercisesSolved,
    wrongAttempts,
    activeExerciseId: activeExercise?.id || null,
    availableExerciseIds: availableExercises.map((exercise) => exercise.id),
    savedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
  } catch {
    // Si localStorage falla, el juego continúa sin romperse.
  }
}

function loadGameState() {
  try {
    const rawState = localStorage.getItem(GAME_STATE_KEY);

    if (!rawState) return false;

    const state = JSON.parse(rawState);

    if (!state || !Array.isArray(state.cardsArray)) return false;
    if (state.cardsArray.length !== TOTAL_PAIRS * 2) return false;

    cardsArray = state.cardsArray;

    matchedIndexes = Array.isArray(state.matchedIndexes)
      ? state.matchedIndexes
      : [];

    pendingMatchIndexes = Array.isArray(state.pendingMatchIndexes)
      ? state.pendingMatchIndexes
      : [];

    matchedPairs = Number(state.matchedPairs || matchedIndexes.length / 2 || 0);
    attempts = Number(state.attempts || 0);
    totalExerciseErrors = Number(state.totalExerciseErrors || 0);
    exercisesSolved = Number(state.exercisesSolved || 0);
    wrongAttempts = Number(state.wrongAttempts || 0);

    if (Array.isArray(state.availableExerciseIds)) {
      availableExercises = exerciseBank.filter((exercise) =>
        state.availableExerciseIds.includes(exercise.id)
      );
    } else {
      availableExercises = [...exerciseBank];
    }

    activeExercise = state.activeExerciseId
      ? exerciseBank.find((exercise) => exercise.id === state.activeExerciseId) || null
      : null;

    flippedCards = [];
    isBoardLocked = Boolean(activeExercise && pendingMatchIndexes.length === 2);
    resultSubmitted = false;

    return true;
  } catch {
    clearGameState();
    return false;
  }
}

function clearGameState() {
  try {
    localStorage.removeItem(GAME_STATE_KEY);
  } catch {
    // No interrumpir la app.
  }
}

function renderMath(element) {
  if (!element) return;

  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetClear?.([element]);
    window.MathJax.typesetPromise([element]).catch(() => {});
  }
}