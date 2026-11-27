export function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { data.set(key, value); },
    removeItem(key) { data.delete(key); },
  };
}

export function isLoopback(host) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
