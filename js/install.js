export function bindInstall() {
  const panel = document.querySelector("#install-panel");
  const button = document.querySelector("#install-game");
  const help = document.querySelector("#install-help");
  const standalone = matchMedia("(display-mode: standalone)");
  let pending;
  let installed = false;

  function refresh() {
    panel.hidden = installed || standalone.matches || navigator.standalone === true;
  }
  standalone.addEventListener("change", refresh);
  addEventListener("appinstalled", () => {
    installed = true;
    pending = undefined;
    refresh();
  });
  addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    pending = event;
  });
  button.addEventListener("click", async () => {
    if (pending) {
      const prompt = pending;
      pending = undefined;
      try {
        await prompt.prompt();
        if ((await prompt.userChoice).outcome === "accepted") {
          installed = true;
          refresh();
        }
        return;
      } catch {
        // A browser may withdraw the prompt before the click.
      }
    }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    help.hidden = !help.hidden;
    button.setAttribute("aria-expanded", String(!help.hidden));
    help.textContent = ios
      ? "In Safari, tap Share, then Add to Home Screen."
      : "Use Install app or Add to Home Screen in your browser menu if available. AlanBlox also works in this tab.";
  });
  refresh();
}
