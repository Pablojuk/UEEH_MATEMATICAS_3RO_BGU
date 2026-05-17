import { guardarDatosEstudiante } from "../core/storage.js";

export function crearFormularioEstudiante(onSuccess) {
  return `
    <section class="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden">
      <div class="bg-moodle-orange p-6 text-white text-center">
        <h2 class="heading-font text-2xl font-bold">Antes de comenzar</h2>
        <p class="text-orange-100 text-sm mt-1">
          Registra tus datos para personalizar tu campus matemático.
        </p>
      </div>

      <form id="student-form" class="p-6 space-y-4 bg-white">
        <div>
          <label class="block text-xs font-bold text-moodle-text-gray uppercase tracking-wide mb-1">
            Nombre y Apellido
          </label>
          <input
            name="nombre"
            type="text"
            placeholder="Ej. Juan Pérez"
            class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-moodle-text-blue focus:outline-none focus:border-moodle-orange focus:ring-1 focus:ring-moodle-orange transition-colors"
            required
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-moodle-text-gray uppercase tracking-wide mb-1">
              Grado / Curso
            </label>
            <select
              name="curso"
              class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-moodle-text-blue focus:outline-none focus:border-moodle-orange focus:ring-1 focus:ring-moodle-orange transition-colors"
              required
            >
              <option value="" disabled selected>Selecciona...</option>
              <option value="1ro BGU">1ro BGU</option>
              <option value="2do BGU">2do BGU</option>
              <option value="3ro BGU">3ro BGU</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-moodle-text-gray uppercase tracking-wide mb-1">
              Paralelo
            </label>
            <select
              name="paralelo"
              class="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-moodle-text-blue focus:outline-none focus:border-moodle-orange focus:ring-1 focus:ring-moodle-orange transition-colors"
              required
            >
              <option value="" disabled selected>Selecciona...</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
        </div>

        <p id="form-error" class="hidden rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-semibold text-red-600"></p>

        <div class="pt-2 flex justify-end">
          <button
            type="submit"
            class="px-6 py-2.5 rounded-full bg-moodle-orange hover:bg-moodle-orange/90 text-sm font-semibold text-white transition-colors shadow-lg shadow-orange-500/20"
          >
            Ingresar al Campus
          </button>
        </div>
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