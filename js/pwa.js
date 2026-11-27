export function registerOffline() {
  if (!("serviceWorker" in navigator)) return;
  const notice = document.querySelector("#app-update");
  navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).then(registration => {
    if (!notice) return;
    const reflect = () => { notice.hidden = !registration.waiting || !navigator.serviceWorker.controller; };
    registration.addEventListener("updatefound", () => {
      registration.installing?.addEventListener("statechange", reflect);
    });
    reflect();
  }).catch(error => {
    console.warn("Offline setup failed.", error);
  });
}
