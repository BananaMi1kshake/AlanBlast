export const THEMES = Object.freeze(["mint", "tidal", "orchard", "dusk", "desert", "glacier"]);
export const DEFAULT_THEME = THEMES[0];

export function nextTheme(theme) {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
}
