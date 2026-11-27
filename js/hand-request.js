// Leave the UI thread free during both candidate validation and exhaustive fallback.
export function requestHand(board, bag, receive, timeout) {
  let worker;
  let timer;
  let active = true;

  function cancel() {
    active = false;
    clearTimeout(timer);
    worker?.terminate();
  }

  function finish(result) {
    if (!active) return;
    cancel();
    receive(result);
  }

  try {
    worker = new Worker(new URL("./hand-worker.js", import.meta.url), { type: "module" });
    worker.addEventListener("message", event => finish(event.data), { once: true });
    worker.addEventListener("error", () => finish({ status: "error" }), { once: true });
    timer = setTimeout(() => finish({ status: "timeout" }), timeout);
    worker.postMessage({ board, bag });
  } catch {
    // Keep callbacks asynchronous, including worker startup failures.
    clearTimeout(timer);
    timer = setTimeout(() => finish({ status: "error" }), 0);
  }

  return cancel;
}
