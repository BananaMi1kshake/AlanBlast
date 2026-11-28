import { appearanceFor } from "./material-rotation.js";
import { MATERIALS, visualProfile } from "./themes.js";
import { paintWorld } from "./world-art.js";

export function bindMaterialPicker({ getGame, available, apply, onOpen, cue, motion }) {
  const dialog = document.querySelector("#material-picker");
  const opener = document.querySelector("#open-material");
  const close = dialog.querySelector("#close-material");
  const next = dialog.querySelector("#cycle-material");
  const confirm = dialog.querySelector("#apply-material");
  const name = dialog.querySelector("#material-picker-name");
  const preview = dialog.querySelector(".material-swatch");
  let choices;
  let index;

  function showPreview() {
    const material = choices[index];
    paintWorld(preview, visualProfile(appearanceFor(material)), ["mint", "sky", "lilac", "sun", "coral", "mint"]);
    name.textContent = MATERIALS[material].name;
    next.disabled = choices.length < 2;
  }

  opener.hidden = false;
  opener.addEventListener("click", () => {
    onOpen();
    const current = visualProfile(getGame()).material;
    choices = [...new Set([current, ...available()])];
    index = 0;
    showPreview();
    dialog.showModal();
    if (!motion.matches) dialog.animate([
      { opacity: 0, transform: "translateY(-4px) scale(.98)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ], { duration: 110, easing: "ease-out" });
    cue("ui");
  });

  next.addEventListener("click", () => {
    index = (index + 1) % choices.length;
    showPreview();
    cue("ui");
  });
  confirm.addEventListener("click", () => {
    apply(choices[index]);
    dialog.close();
    cue("ui");
  });
  close.addEventListener("click", () => { dialog.close(); cue("ui"); });
  dialog.addEventListener("close", () => opener.focus({ preventScroll: true }));
  motion.addEventListener("change", () => {
    if (motion.matches) dialog.getAnimations().forEach(animation => animation.cancel());
  });
}
