import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = file => readFile(new URL("../" + file, import.meta.url));
test("install identity and all original icon assets use valid manifest dimensions", async () => {
  const manifest = JSON.parse(await read("manifest.webmanifest"));
  assert.deepEqual([manifest.name, manifest.short_name, manifest.id, manifest.scope, manifest.start_url],
    ["AlanBlox", "AlanBlox", "./", "./", "./"]);
  assert.deepEqual(manifest.icons.map(({ purpose }) => purpose), ["any", "any", "maskable", "maskable"]);
  const icons = [...manifest.icons, { src: "./icons/apple-touch-icon.png", sizes: "180x180" },
    { src: "./icons/favicon.png", sizes: "32x32" }];
  for (const { src, sizes } of icons) {
    const png = await read(src);
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.subarray(12, 16).toString(), "IHDR");
    assert.equal(png.readUInt32BE(16) + "x" + png.readUInt32BE(20), sizes);
    assert.ok((await read("sw.js")).includes(src));
  }
  for (const view of ["index.html", "play.html", "adventure.html"]) {
    assert.ok((await read(view)).includes('./icons/favicon.png'));
    assert.ok((await read(view)).includes('./icons/apple-touch-icon.png'));
  }
});

test("generated branding ships as layered cached runtime art and proposed icons stay separate", async () => {
  const { BRANDING } = await import("../js/branding-assets.js");
  const manifest = JSON.parse(await read("manifest.webmanifest"));
  const worker = await read("sw.js");
  for (const src of Object.values(BRANDING)) {
    assert.match(src, /^\.\/assets\/branding\/runtime\/[^/]+\.webp$/);
    assert.equal((await read(src)).subarray(8, 12).toString(), "WEBP");
    assert.ok(worker.includes(src));
  }
  for (const [name, size] of [["icon-192", 192], ["icon-512", 512], ["apple-touch-icon", 180],
    ["icon-maskable-192", 192], ["icon-maskable-512", 512], ["favicon", 32]]) {
    const png = await read(`assets/branding/icon-preview/${name}.png`);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
    assert.equal(png[25], 2, "opaque RGB PNG");
    assert.ok(manifest.icons.every(icon => !icon.src.includes("icon-preview")));
  }
});
