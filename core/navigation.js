const appRoot = () => document.getElementById("app");

export function renderView(html) {
  const app = appRoot();
  if (!app) return;
  app.innerHTML = html;
}

export function bindClick(selector, handler) {
  document.querySelector(selector)?.addEventListener("click", handler);
}

export async function renderMathInElementSafe(target = appRoot()) {
  if (!target) return;

  if (window.MathJax?.typesetPromise) {
    try {
      await window.MathJax.typesetPromise([target]);
      return;
    } catch (error) {
      console.warn("MathJax no pudo renderizar una fórmula:", error);
    }
  }

  target.querySelectorAll("[data-formula]").forEach((element) => {
    element.classList.add("formula-fallback");
  });
}
