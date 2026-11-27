import { SETTINGS_KEY } from "./settings.js";
import { APP_VERSION, BACKUP_LIMIT, BACKUP_NOTICE, exportBackup, prepareImport, resetProgress } from "./backup.js";
import { loadCampaign } from "./campaign.js";
import { currentDay, loadChallenges } from "./challenges.js";

const catalogs = () => Promise.all([loadCampaign(), loadChallenges("daily")]);

export function bindSaveControls({ gameStorage } = {}) {
  const panel = document.querySelector("#save-controls");
  const input = panel.querySelector("#backup-file");
  const status = panel.querySelector("#backup-status");
  const confirmation = panel.querySelector("#backup-confirmation");
  const question = panel.querySelector("#backup-question");
  const confirm = panel.querySelector("#confirm-backup");
  const cancel = panel.querySelector("#cancel-backup");
  let pending;
  let request = 0;
  document.querySelector("#app-version").textContent = APP_VERSION;

  function report(error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  }

  function clear() {
    request++;
    pending = null;
    confirmation.hidden = true;
    status.textContent = "";
  }

  function ask(action, message, label) {
    pending = action;
    question.textContent = message;
    confirm.textContent = label;
    confirmation.hidden = false;
    cancel.focus();
  }

  panel.querySelector("#export-backup").addEventListener("click", async () => {
    clear();
    const exportRequest = request;
    try {
      const [levels, challenges] = await catalogs();
      if (request !== exportRequest || !panel.closest("dialog").open) return;
      const backupStorage = gameStorage && { getItem: key => key === SETTINGS_KEY
        ? localStorage.getItem(key) : gameStorage.getItem(key) };
      const blob = new Blob([exportBackup(levels, challenges, backupStorage)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `alanblox-backup-${currentDay()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = "Backup exported.";
    } catch (error) {
      if (request === exportRequest) report(error);
    }
  });

  input.addEventListener("change", async () => {
    clear();
    const importRequest = request;
    const file = input.files[0];
    input.value = "";
    if (!file) return;
    try {
      if (file.size > BACKUP_LIMIT) throw Error("Choose an AlanBlox backup smaller than 2 MiB.");
      const [text, [levels, challenges]] = await Promise.all([file.text(), catalogs()]);
      if (request !== importRequest || !panel.closest("dialog").open) return;
      ask(prepareImport(text, levels, challenges),
        "Replace all current AlanBlox saves and settings with this backup?", "Replace saves");
    } catch (error) {
      if (request === importRequest) report(error);
    }
  });

  panel.querySelector("#reset-progress").addEventListener("click", () => {
    clear();
    ask(() => resetProgress(), "Delete all game progress, records, achievements, and material discoveries from this device?", "Delete progress");
  });

  cancel.addEventListener("click", () => { clear(); panel.querySelector("#export-backup").focus(); });
  panel.closest("dialog").addEventListener("close", clear);
  confirm.addEventListener("click", () => {
    if (!pending) return;
    try {
      pending();
      location.replace("./index.html");
    } catch (error) {
      clear();
      report(error);
    }
  });
  addEventListener("storage", event => {
    if (event.key !== BACKUP_NOTICE) return;
    if (gameStorage) dispatchEvent(new Event("alanblox-save-replaced"));
    else location.reload();
  });
}
