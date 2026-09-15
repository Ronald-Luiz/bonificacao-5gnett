let loaded = false;

export async function initializeLegacyApp() {
  if (loaded || window.__5GNETT_LEGACY_STARTED__) return;

  loaded = true;
  window.__5GNETT_LEGACY_STARTED__ = true;

  await import("./legacy.js");
}
