import { guardarDatosEstudiante } from "../core/storage.js";

export function crearFormularioEstudiante(onSuccess) {
  return `
    <section class="app-card p-5 sm:p-8">
      <div class="mb-4 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">👩‍🎓 Registro inicial</div>
      <h2 class="screen-title text-slate-900">Cuéntanos quién eres</h2>
      <p class="mt-2 section-subtitle">Estos datos se usarán para personalizar y registrar tu actividad académica.</p>
      <form id="student-form" class="mt-6 space-y-4">
        <label class="block">
          <span class="mb-1 block text-sm font-semibold">Nombre</span>
          <input name="nombre" class="input-field" placeholder="Ejemplo: María José" required />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-semibold">Curso</span>
          <input name="curso" class="input-field" placeholder="Ejemplo: 3ro BGU" required />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-semibold">Paralelo</span>
          <input name="paralelo" class="input-field" placeholder="Ejemplo: A" required />
        </label>
        <p id="form-error" class="hidden rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"></p>
        <button class="app-btn bg-blue-600 text-white" type="submit">Guardar y continuar</button>
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
