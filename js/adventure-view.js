import { FAILURES, objectiveProgress, remainingMoves } from "./adventure.js";
import { isUnlocked } from "./adventure-storage.js";

const $ = id => document.getElementById(id);

export function levelUrl(id, { replay = false } = {}) {
  const query = new URLSearchParams({ mode: "adventure" });
  if (id) query.set("level", id);
  if (replay) query.set("replay", "1");
  return `./play.html?${query}`;
}

export function createAdventureView(session, levels, restart, sandbox) {
  const hud = $("adventure-hud");
  const overlay = $("adventure-result");
  const list = $("level-objectives");
  const title = $("adventure-result-title");
  const nextButton = $("next-level");
  const retryButton = $("retry-level");
  const controls = new Map();
  let renderedLevel;
  hud.hidden = false;
  if (sandbox) {
    $("mode-back").hidden = true;
    overlay.querySelector('[href="./adventure.html"]').hidden = true;
  } else {
    $("mode-back").href = "./adventure.html";
    $("mode-back").setAttribute("aria-label", "Level selection");
  }
  document.querySelector("#restart-confirm p").textContent = "This resets the current level. Completed levels are kept.";
  retryButton.addEventListener("click", restart);

  function render() {
    const { level, run } = session;
    const goals = objectiveProgress(level, run);
    if (renderedLevel !== level) {
      renderedLevel = level;
      controls.clear();
      list.replaceChildren();
      for (const goal of goals) {
        const chip = document.createElement("div");
        chip.className = "objective-chip";
        chip.dataset.objective = goal.type;
        const label = document.createElement("span");
        label.textContent = goal.label;
        const value = document.createElement("strong");
        chip.append(label, value);
        list.append(chip);
        controls.set(goal.type, { chip, value });
      }
      const number = levels.indexOf(level) + 1;
      $("level-name").textContent = number ? `${number}. ${level.name}` : level.name;
    }
    for (const goal of goals) {
      const { chip, value } = controls.get(goal.type);
      chip.dataset.complete = String(goal.complete);
      value.textContent = `${Math.min(goal.value, goal.target)}/${goal.target}`;
      chip.setAttribute("aria-label", `${goal.label} ${goal.value} of ${goal.target}${goal.complete ? ", complete" : ""}`);
    }
    const moves = remainingMoves(level, run);
    $("moves-left").textContent = moves === null ? "" : `${moves} moves left`;
    overlay.hidden = run.status === "playing";
    if (overlay.hidden) return;
    const won = run.status === "won";
    $("completion-tag").hidden = !won;
    title.textContent = won ? level.name : "Level failed";
    $("adventure-result-summary").textContent = won
      ? goals.map(goal => `${goal.label} ${goal.target}/${goal.target}`).join(" · ")
      : FAILURES[run.reason];
    $("adventure-final-score").textContent = run.game.score;
    const next = levels[levels.indexOf(level) + 1];
    nextButton.hidden = !won || sandbox;
    nextButton.href = next && isUnlocked(levels, session.completed, next.id) ? levelUrl(next.id) : "./adventure.html";
    nextButton.textContent = next ? "Continue" : "Finish campaign";
    retryButton.className = won && !sandbox ? "secondary" : "primary";
    retryButton.textContent = won ? "Replay" : "Retry";
  }

  return {
    render,
    gemTarget: () => controls.get("gems")?.value ?? $("level-name"),
    focusResult() { (nextButton.hidden ? retryButton : nextButton).focus({ preventScroll: true }); },
  };
}
