// Safari may report a smaller visible area while browser chrome is on screen.
// Keep CSS in charge during pinch zoom so zoomed content can still be explored.
function bindViewport() {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  function update() {
    if (viewport && Math.abs(viewport.scale - 1) < .01) {
      root.style.setProperty("--screen-height", `${viewport.height}px`);
      root.style.setProperty("--screen-top", `${viewport.offsetTop}px`);
    }
  }
  viewport?.addEventListener("resize", update);
  viewport?.addEventListener("scroll", update);
  window.addEventListener("resize", update);
  window.addEventListener("pageshow", update);
  update();

  const field = document.querySelector(".playfield");
  if (field && !CSS.supports("width", "1cqh") && "ResizeObserver" in window) {
    new ResizeObserver(([entry]) => {
      field.style.setProperty("--playfield-height", `${entry.contentRect.height}px`);
    }).observe(field);
  }

  // The fixed layout and touch-action handle modern browsers. On WebKit this
  // also suppresses single-finger page bounce from the gameplay surface.
  document.body.addEventListener("touchmove", event => {
    if (event.cancelable && event.touches.length === 1 && !(viewport?.scale > 1.01)
      && !event.target.closest?.("dialog, .game-over")) event.preventDefault();
  }, { passive: false });
}

if (document.documentElement.classList.contains("app-viewport")) bindViewport();
