export function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { data.set(key, value); },
  };
}

export function isLoopback(host) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
