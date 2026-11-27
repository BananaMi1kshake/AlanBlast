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
