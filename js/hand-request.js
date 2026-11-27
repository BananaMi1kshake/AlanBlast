// A completed deal can leave one warm worker. Cancelled work is terminated so
// its reply can never arrive in the next run.
let idleWorker;
let activeCancel;

export function closeHandWorker() {
  activeCancel?.();
  idleWorker?.terminate();
  idleWorker = undefined;
}

export function requestHand(board, bag, receive, timeout) {
  activeCancel?.();
  let worker;
  let timer;
  let active = true;

  function release(keepWorker) {
    active = false;
    activeCancel = undefined;
    clearTimeout(timer);
    worker?.removeEventListener("message", onMessage);
    worker?.removeEventListener("error", onError);
    if (keepWorker) idleWorker = worker;
    else worker?.terminate();
  }

  function cancel() {
    if (active) release(false);
  }

  function finish(result, keepWorker = false) {
    if (!active) return;
    release(keepWorker);
    receive(result);
  }

  const onMessage = event => finish(event.data, true);
  const onError = () => finish({ status: "error" });
  activeCancel = cancel;
  try {
    worker = idleWorker;
    idleWorker = undefined;
    worker ??= new Worker(new URL("./hand-worker.js", import.meta.url), { type: "module" });
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    timer = setTimeout(() => finish({ status: "timeout" }), timeout);
    worker.postMessage({ board, bag });
  } catch {
    clearTimeout(timer);
    timer = setTimeout(onError, 0);
  }
  return cancel;
}
