import { guardarDatosEstudiante } from "../core/storage.js";

export function crearFormularioEstudiante(onSuccess) {
  return `
    <section class="app-card p-5 sm:p-8">
      <div class="inline-flex hero-badge items-center px-3 py-1 text-xs font-bold text-cyan-100">🪪 Credencial del estudiante</div>
      <h2 class="screen-title text-white mt-3">Ingreso a la misión matemática</h2>
      <p class="mt-2 section-subtitle">Completa tu identidad académica para activar tu mapa de aprendizaje.</p>
      <form id="student-form" class="mt-6 space-y-4" novalidate>
        <label class="block"><span class="mb-1 block text-sm font-semibold text-cyan-100">👤 Nombre</span><input aria-label="Nombre del estudiante" name="nombre" class="input-field" placeholder="Ejemplo: María José" required /></label>
        <label class="block"><span class="mb-1 block text-sm font-semibold text-cyan-100">🏫 Curso</span><input aria-label="Curso" name="curso" class="input-field" placeholder="Ejemplo: 3ro BGU" required /></label>
        <label class="block"><span class="mb-1 block text-sm font-semibold text-cyan-100">🧭 Paralelo</span><input aria-label="Paralelo" name="paralelo" class="input-field" placeholder="Ejemplo: A" required /></label>
        <p id="form-error" class="hidden rounded-xl border border-red-300/50 bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-100"></p>
        <p class="text-xs text-cyan-100">Mensaje pedagógico: cada respuesta razonada te acerca al siguiente nivel.</p>
        <button class="app-btn bg-violet-500 text-white" type="submit">Activar credencial y continuar</button>
      </form>
    </section>
  `;
}

export function activarFormularioEstudiante(onSuccess) {
  const form = document.getElementById("student-form");
  const error = document.getElementById("form-error");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const nombre = String(formData.get("nombre") || "").trim();
    const curso = String(formData.get("curso") || "").trim();
    const paralelo = String(formData.get("paralelo") || "").trim();
    if (!nombre || !curso || !paralelo) {
      error.textContent = "Completa nombre, curso y paralelo para continuar.";
      error.classList.remove("hidden");
      return;
    }
    guardarDatosEstudiante({ nombre, curso, paralelo });
    error.classList.add("hidden");
    onSuccess({ nombre, curso, paralelo });
  });
}
