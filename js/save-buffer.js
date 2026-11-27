// Each accepted action stages its session and records together. Established
// storage keys remain readable by older builds and by the backup system.
export function createSaveBuffer(source) {
  const committed = new Map();
  const pending = new Map();
  let unavailable = !source;
  let conflicted = false;

  function getItem(key) {
    if (pending.has(key)) return pending.get(key);
    if (!committed.has(key)) {
      try { committed.set(key, source?.getItem(key) ?? null); }
      catch { unavailable = true; committed.set(key, null); }
    }
    return committed.get(key);
  }

  function check() {
    if (conflicted) return false;
    if (!source || unavailable) return true;
    try {
      conflicted = [...committed].some(([key, value]) => source.getItem(key) !== value);
    } catch { unavailable = true; }
    return !conflicted;
  }

  function stage(key, value) {
    getItem(key);
    pending.set(key, value);
  }

  function assign(key, value) {
    if (value === null) source.removeItem(key);
    else source.setItem(key, value);
  }

  function flush() {
    if (!check()) return "conflict";
    if (!source || unavailable) return "memory";
    const writes = [...pending].filter(([key, value]) => committed.get(key) !== value);
    const changed = [];
    try {
      for (const [key, value] of writes) {
        assign(key, value);
        changed.push(key);
      }
    } catch {
      for (const key of changed.reverse()) {
        try { assign(key, committed.get(key)); } catch { unavailable = true; }
      }
      return "memory";
    }
    for (const [key, value] of writes) committed.set(key, value);
    pending.clear();
    return "saved";
  }

  return {
    getItem, setItem: (key, value) => stage(key, value), removeItem: key => stage(key, null), check, flush,
    invalidate() { conflicted = true; },
  };
}

export function browserStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}
