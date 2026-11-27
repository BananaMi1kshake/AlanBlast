import { challengeUrl, createDailySession, currentDay, dailyDate, FIRST_DAY, loadChallenges } from "./challenges.js";
import { registerOffline } from "./pwa.js";
import { createMotionPreference, loadSettings } from "./settings.js";
import { WORLDS } from "./themes.js";
import { paintWorld } from "./world-art.js";

const $ = id => document.getElementById(id);
const input = $("challenge-date");
const before = $("earlier-day");
const after = $("later-day");
const link = $("daily-play");
createMotionPreference(loadSettings());
registerOffline();

try {
  const levels = await loadChallenges("daily");
  input.min = FIRST_DAY;
  input.max = currentDay();
  const requested = new URLSearchParams(location.search).get("date");
  input.value = dailyDate(requested) !== null && requested <= input.max ? requested : input.max;
  function render() {
    input.max = currentDay();
    const date = input.value;
    const session = date <= input.max ? createDailySession(levels, date) : null;
    before.disabled = !session || date === input.min;
    after.disabled = !session || date === input.max;
    link.hidden = !session;
    if (!session) {
      $("daily-status").textContent = "Choose an available date.";
      return;
    }
    $("daily-name").textContent = session.level.name;
    paintWorld($("daily-art"), WORLDS[session.level.world]);
    $("daily-status").textContent = session.best
      ? `Completed · Best score ${session.best}` : session.newlyStarted ? "Ready to play" : session.over ? "Ready to retry" : "In progress";
    link.href = challengeUrl("daily", date);
    link.textContent = session.over ? (session.best ? "View or replay challenge" : "View or retry challenge")
      : session.newlyStarted ? "Play challenge" : "Resume challenge";
  }
  function step(direction) {
    input.value = currentDay(new Date(dailyDate(input.value) + direction * 86400000));
    render();
  }
  before.addEventListener("click", () => step(-1));
  after.addEventListener("click", () => step(1));
  input.addEventListener("change", render);
  addEventListener("pageshow", render);
  render();
} catch (error) {
  $("daily-status").textContent = error.message;
}
