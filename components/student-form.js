import { guardarDatosEstudiante } from "../core/storage.js";

export function crearFormularioEstudiante(onSuccess) {
  return `
    <section class="app-card w-full max-w-xl p-6 sm:p-8">
      <div class="relative z-10">
        <div class="mb-5 inline-flex items-center rounded-full bg-cyan-200/8 border border-cyan-100/14 px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-cyan-100">Credencial de ingreso</div>
        <h2 class="screen-title">Activa tu misión matemática</h2>
        <p class="mt-3 section-subtitle">Estos datos personalizan tu campus y preparan el registro académico de tus actividades.</p>

        <form id="student-form" class="mt-7 space-y-4">
          <label class="block">
            <span class="mb-2 block text-sm font-black text-cyan-100/80">Nombre del estudiante</span>
            <input name="nombre" class="input-field" placeholder="Ejemplo: María José" required />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-black text-cyan-100/80">Curso</span>
            <input name="curso" class="input-field" placeholder="Ejemplo: 3ro BGU" required />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-black text-cyan-100/80">Paralelo</span>
            <input name="paralelo" class="input-field" placeholder="Ejemplo: A" required />
          </label>
          <p id="form-error" class="hidden rounded-2xl bg-rose-300/10 border border-rose-200/20 px-4 py-3 text-sm font-bold text-rose-100"></p>
          <button class="app-btn bg-gradient-to-r from-cyan-200 to-violet-300 text-slate-950 shadow-2xl shadow-cyan-300/10" type="submit">Entrar al campus matemático</button>
        </form>
      </div>
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
