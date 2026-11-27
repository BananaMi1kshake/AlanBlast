import { challengeUrl } from "./challenges.js";
import { FAILURES, objectiveProgress, remainingMoves } from "./adventure.js";
import { isUnlocked } from "./adventure-storage.js";

const $ = id => document.getElementById(id);

export function levelUrl(id, { replay = false } = {}) {
  const query = new URLSearchParams({ mode: "adventure" });
  if (id) query.set("level", id);
  if (replay) query.set("replay", "1");
  return `./play.html?${query}`;
}

export function createAdventureView(session, levels, restart, sandbox, mode) {
  const hud = $("adventure-hud");
  const overlay = $("adventure-result");
  const list = $("level-objectives");
  const title = $("adventure-result-title");
  const nextButton = $("next-level");
  const retryButton = $("retry-level");
  const controls = new Map();
  let renderedLevel;
  const daily = mode === "daily";
  const tutorial = mode === "tutorial";
  const exit = $("level-selection");
  const back = daily ? "./daily.html?date=" + session.day : tutorial ? "./index.html" : "./adventure.html";
  exit.href = back;
  exit.textContent = daily ? "Challenge dates" : tutorial ? "Main menu" : "Level selection";
  hud.hidden = false;
  if (sandbox) {
    $("mode-back").hidden = true;
    exit.hidden = true;
  } else {
    $("mode-back").href = back;
    $("mode-back").setAttribute("aria-label", exit.textContent);
  }
  document.querySelector("#restart-confirm p").textContent = "This resets the current level. Completed levels are kept.";
  if (daily) document.querySelector("#restart-confirm p").textContent = "This resets the challenge board and keeps the best result for this date.";
  if (tutorial) document.querySelector("#restart-confirm p").textContent = "This resets the current tutorial step.";
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
      $("level-name").textContent = daily ? `${session.day} · ${level.name}`
        : number ? `${number}. ${level.name}` : level.name;
      const tip = $("tutorial-tip");
      tip.hidden = !tutorial;
      if (tutorial) tip.textContent = level.tip;
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
    overlay.dataset.outcome = won ? "won" : "failed";
    $("completion-tag").hidden = !won;
    $("completion-tag").textContent = daily ? "DAILY CHALLENGE COMPLETE" : tutorial ? "LESSON COMPLETE" : "LEVEL COMPLETE";
    title.textContent = won ? level.name : "Level failed";
    $("adventure-result-summary").textContent = won
      ? goals.map(goal => `${goal.label} ${goal.target}/${goal.target}`).join(" · ")
      : FAILURES[run.reason];
    $("adventure-final-score").textContent = run.game.score;
    const next = levels[levels.indexOf(level) + 1];
    nextButton.hidden = !won || sandbox;
    nextButton.href = next && isUnlocked(levels, session.completed, next.id)
      ? (tutorial ? challengeUrl("tutorial", next.id) : levelUrl(next.id)) : back;
    nextButton.textContent = next ? "Continue" : daily ? "Challenge dates" : tutorial ? "Finish tutorial" : "Finish campaign";
    exit.hidden = sandbox || (won && !next);
    if (daily && session.best) {
      $("adventure-result-summary").textContent += ` · Best ${session.best}`;
    }
    retryButton.className = won && !sandbox ? "secondary" : "primary";
    retryButton.textContent = won ? "Replay" : "Retry";
  }

  return {
    render,
    gemTarget: () => controls.get("gems")?.value ?? $("level-name"),
    focusResult() { (nextButton.hidden ? retryButton : nextButton).focus({ preventScroll: true }); },
  };
}
