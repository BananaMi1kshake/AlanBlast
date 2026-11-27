export function moveFeedback({ lines, combo, fullBoardClear, record, over, gems = 0, won = false }) {
  const withGem = (sounds, delay) => gems ? [...sounds, { name: "gem", delay }] : sounds;
  if (fullBoardClear) return { sounds: withGem([{ name: "allClear" }], .65), vibration: "allClear" };
  if (won) return { sounds: withGem([{ name: "levelComplete" }], .3), vibration: lines ? "clear2" : "place" };
  const clear = lines ? `clear${Math.min(lines, 4)}` : "place";
  const vibration = lines && combo >= 7 ? "combo" : clear === "clear4" ? "clear3" : clear;
  if (over) return { sounds: withGem([{ name: "gameOver" }], .18), vibration };
  const sounds = [{ name: clear, combo }];
  if (lines && combo > 1) sounds.push({ name: "combo", combo, delay: .18 + .055 * Math.min(lines - 1, 3) });
  if (record) sounds.push({ name: "record", delay: lines ? .44 : .12 });
  return { sounds: withGem(sounds, .14), vibration };
}

export function createFeedback(audio, haptics, settings, currentMaterial = () => undefined) {
  function configure() {
    audio.configure(settings);
    haptics.configure(settings);
  }

  function cue(name) {
    audio.play([{ name, material: currentMaterial() }]);
    if (name === "invalid") haptics.play(name);
  }

  function move(result) {
    const { sounds, vibration } = moveFeedback(result);
    audio.play(sounds.map(cue => ({ ...cue, material: result.material ?? currentMaterial() })));
    if (vibration) haptics.play(vibration);
  }

  function restart() {
    audio.stop();
    haptics.stop();
    cue("newGame");
  }

  configure();
  return { configure, cue, move, restart };
}

export function bindFeedbackLifecycle(audio, haptics, page = document) {
  function activate(event) {
    if (!event.isTrusted) return;
    if (event.type.startsWith("pointer") && (!event.isPrimary || event.button !== 0)) return;
    if (event.type === "keydown" && (event.repeat || event.altKey || event.ctrlKey || event.metaKey
      || ["Control", "Shift", "Alt", "Meta", "Escape"].includes(event.key))) return;
    audio.activate();
  }

  for (const event of ["pointerdown", "pointerup", "touchend", "click", "keydown"]) {
    page.addEventListener(event, activate, { capture: true, passive: true });
  }
  function sync() {
    audio.setVisible(!page.hidden);
    haptics.setVisible(!page.hidden);
  }
  page.addEventListener("visibilitychange", sync);
  sync();
}
