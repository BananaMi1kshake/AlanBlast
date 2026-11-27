import { createAudio } from "../js/audio.js";
import { bindFeedbackLifecycle } from "../js/feedback.js";
import { createHaptics, VIBRATIONS } from "../js/haptics.js";
import { SOUNDS } from "../js/sound-bank.js";

const audio = createAudio();
const haptics = createHaptics();
const slider = document.querySelector("#preview-volume");
const percent = document.querySelector("#preview-percent");
const comboInput = document.querySelector("#combo-level");
const status = document.querySelector("#vibration-status");
const configure = () => audio.configure({ sound: true, volume: Number(slider.value) / 100 });

bindFeedbackLifecycle(audio, haptics);
configure();
document.querySelector("#local-only").hidden = true;
document.querySelector("#preview").hidden = false;
slider.addEventListener("input", () => {
  percent.value = `${slider.value}%`;
  configure();
});
document.querySelector("#stop").addEventListener("click", () => {
  audio.stop();
  haptics.stop();
});

function button(label, handler) {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.addEventListener("click", handler);
  return element;
}

const sounds = document.querySelector("#sounds");
for (const [name, { label }] of Object.entries(SOUNDS)) {
  sounds.append(button(label, () => {
    const combo = Math.max(1, comboInput.valueAsNumber || 1);
    audio.play([{ name, combo }]);
  }));
}

const vibrations = document.querySelector("#vibrations");
status.textContent = haptics.supported ? "Requires a device with vibration hardware." : "Unavailable in this browser.";
for (const [name, { label }] of Object.entries(VIBRATIONS)) {
  const preview = button(label, () => {
    haptics.stop();
    status.textContent = haptics.play(name) ? "Pattern requested." : "The browser declined the request.";
  });
  preview.disabled = !haptics.supported;
  vibrations.append(preview);
}
