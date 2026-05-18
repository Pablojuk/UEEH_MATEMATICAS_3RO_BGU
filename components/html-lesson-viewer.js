const DEFAULT_SRC = "./topics/introduccion-derivadas/presentation.html";

export function crearHtmlLessonViewer({
  src = DEFAULT_SRC,
  title = "Presentación de la clase"
} = {}) {
  return `
    <section class="html-lesson-viewer" aria-label="${title}">
      <iframe
        class="html-lesson-viewer__frame"
        src="${src}"
        title="${title}"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>
    </section>
  `;
}
