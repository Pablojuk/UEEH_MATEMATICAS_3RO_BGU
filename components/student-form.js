import { guardarDatosEstudiante } from "../core/storage.js";

export function crearFormularioEstudiante(onSuccess) {
  return `
    <section class="app-card p-5 sm:p-8">
      <h2 class="screen-title text-slate-900">Datos del estudiante</h2>
      <p class="mt-2 text-sm text-slate-600">Completa esta información para personalizar tu experiencia.</p>
      <form id="student-form" class="mt-5 space-y-4">
        <label class="block">
          <span class="mb-1 block text-sm font-semibold">Nombre</span>
          <input name="nombre" class="w-full rounded-xl border border-slate-300 px-4 py-3" required />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-semibold">Curso</span>
          <input name="curso" class="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="3ro BGU" required />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-semibold">Paralelo</span>
          <input name="paralelo" class="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="A" required />
        </label>
        <p id="form-error" class="hidden text-sm font-semibold text-red-600"></p>
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
