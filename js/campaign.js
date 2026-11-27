const catalog = new URL("../adventure/levels.json", import.meta.url);
let levelsPromise;

export function loadCampaign() {
  levelsPromise ??= fetch(catalog).then(async response => {
    if (!response.ok) throw Error("Adventure levels could not be loaded.");
    const data = await response.json();
    if (data.version !== 1 || !Array.isArray(data.levels) || !data.levels.length) throw Error("Adventure catalog is invalid.");
    return data.levels;
  });
  return levelsPromise;
}
