import { EXPANDED_MATERIALS } from "./material-library.js";

// The original IDs retain their palette positions in existing saves.
export const PALETTES = Object.freeze({
  mint: "Ocean", tidal: "Sunset", orchard: "Forest", dusk: "Midnight", desert: "Candy", glacier: "Glacier",
});

export const MATERIALS = Object.freeze({
  classic: { name: "Classic", impact: [1.08, .90], rebound: [.96, 1.05], dissolve: "scale(.12) rotate(8deg)", spread: 1 },
  yarn: { name: "Yarn", impact: [1.06, .93], rebound: [.99, 1.025], dissolve: "scale(.35) rotate(-16deg)", spread: .78 },
  jelly: { name: "Jelly", impact: [1.13, .82], rebound: [.91, 1.13], dissolve: "scale(.44,.05)", spread: 1.15 },
  wood: { name: "Wood", impact: [1.035, .965], rebound: [.99, 1.02], dissolve: "scale(.26) rotate(18deg)", spread: .9 },
  crystal: { name: "Crystal", impact: [1.045, .955], rebound: [.99, 1.02], dissolve: "scale(.08) rotate(-24deg)", spread: 1.28 },
  ceramic: { name: "Ceramic", impact: [1.035, .945], rebound: [.98, 1.025], dissolve: "scale(.13) rotate(32deg)", spread: 1.08 },
  ice: { name: "Ice", impact: [1.04, .96], rebound: [.99, 1.02], dissolve: "scale(.08) rotate(-12deg)", spread: 1.19 },
  confectionery: { name: "Confectionery", impact: [1.07, .91], rebound: [.96, 1.06], dissolve: "scale(.24) rotate(14deg)", spread: .94 },
  ...EXPANDED_MATERIALS,
});

export const WORLDS = Object.freeze({
  mint: { name: "Ocean", palette: "mint", material: "classic" },
  tidal: { name: "Sunset Loom", palette: "tidal", material: "yarn" },
  orchard: { name: "Forest Workshop", palette: "orchard", material: "wood" },
  dusk: { name: "Midnight Geode", palette: "dusk", material: "crystal" },
  desert: { name: "Candy Bounce", palette: "desert", material: "jelly" },
  glacier: { name: "Glacier", palette: "glacier", material: "ice" },
  kiln: { name: "Moonlit Kiln", palette: "dusk", material: "ceramic" },
  bakery: { name: "Sunset Bakery", palette: "tidal", material: "confectionery" },
});

export const THEMES = Object.freeze(Object.keys(WORLDS));
export const DEFAULT_THEME = THEMES[0];

export function nextTheme(theme) {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
}

export function visualProfile({ theme, material, palette }) {
  const world = Object.hasOwn(WORLDS, theme) ? WORLDS[theme] : WORLDS[DEFAULT_THEME];
  return {
    palette: Object.hasOwn(PALETTES, palette) ? palette : world.palette,
    material: Object.hasOwn(MATERIALS, material) ? material : world.material,
  };
}
