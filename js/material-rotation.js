import { DEFAULT_THEME, MATERIALS, WORLDS } from "./themes.js";

export const LEGACY_MATERIALS = Object.values(WORLDS).map(world => world.material);
export const ALL_MATERIALS = Object.keys(MATERIALS);

export function appearanceFor(material) {
  const theme = Object.keys(WORLDS).find(id => WORLDS[id].material === material)
    ?? MATERIALS[material]?.world ?? DEFAULT_THEME;
  return { theme, material: Object.hasOwn(MATERIALS, material) ? material : WORLDS[theme].material };
}

export function newRotation(materials, seed) {
  const pool = ALL_MATERIALS.filter(id => LEGACY_MATERIALS.includes(id) || materials?.includes(id));
  if (pool.length === LEGACY_MATERIALS.length) return undefined;
  const entropy = seed ?? globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
  return { pool, bag: [], seed: (entropy >>> 0) || 1 };
}

export function validRotation(value) {
  if (!value || typeof value !== "object" || Object.keys(value).length !== 3) return false;
  const { pool, bag, seed } = value;
  return Array.isArray(pool) && pool.length > LEGACY_MATERIALS.length
    && new Set(pool).size === pool.length && pool.every(id => ALL_MATERIALS.includes(id))
    && LEGACY_MATERIALS.every(id => pool.includes(id))
    && Array.isArray(bag) && bag.length <= pool.length && new Set(bag).size === bag.length
    && bag.every(id => pool.includes(id)) && Number.isInteger(seed) && seed > 0 && seed <= 0xffffffff;
}

// Cosmetic xorshift stream. No gameplay random source or shuffle-bag state is read.
export function rotateMaterial(previous, rotation) {
  const bag = rotation.bag.slice();
  let seed = rotation.seed;
  if (bag.length === 1 && bag[0] === previous) bag.length = 0;
  if (!bag.length) {
    bag.push(...rotation.pool);
    for (let i = bag.length - 1; i > 0; i--) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      seed >>>= 0;
      const j = seed % (i + 1);
      [bag[j], bag[i]] = [bag[i], bag[j]];
    }
  }
  const index = bag[0] === previous ? 1 : 0;
  const [material] = bag.splice(index, 1);
  return { ...appearanceFor(material), rotation: { pool: rotation.pool, bag, seed } };
}
