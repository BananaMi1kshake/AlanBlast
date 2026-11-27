export function registerOffline() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(error => {
      console.warn("Offline setup failed.", error);
    });
  }
}
