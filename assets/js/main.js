import {
  checkForRelease,
  installReleaseRechecks
} from "../../core/release-check.js?v=1.4.4";

const APP_MODULE_URL = "../../core/app.js?v=1.4.4";

function waitForDom() {
  if (document.readyState !== "loading") return Promise.resolve();
  return new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
}

async function bootstrap() {
  const release = await checkForRelease();
  if (release.reloadRequested) return;

  installReleaseRechecks();
  await waitForDom();

  const { iniciarApp } = await import(APP_MODULE_URL);
  iniciarApp();
}

void bootstrap();
