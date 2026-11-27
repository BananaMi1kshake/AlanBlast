// The game and profile share a writer across modes. Older engines still use
// the per-action storage comparison in save-buffer.js.
export async function takePlayAccess(locks = globalThis.navigator?.locks) {
  if (!locks) return true;
  let release;
  let granted;
  const signal = new AbortController();
  const timer = setTimeout(() => signal.abort(), 600);
  const ready = new Promise(resolve => { granted = resolve; });
  locks.request("alanblox:play", { signal: signal.signal }, () => {
    clearTimeout(timer);
    const active = new Promise(resolve => { release = resolve; });
    granted(true);
    return active;
  }).catch(error => {
    clearTimeout(timer);
    granted(error?.name !== "AbortError");
  });
  if (!await ready) return false;
  if (release) addEventListener("pagehide", release, { once: true });
  return true;
}
