const appRoot = () => document.getElementById("app");

export function renderView(html) {
  const app = appRoot();
  if (!app) return;
  app.innerHTML = html;
  if (window.renderMathInElement) window.renderMathInElement(app);
}

export function bindClick(selector, handler) {
  document.querySelector(selector)?.addEventListener("click", handler);
}
