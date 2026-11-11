/**
 * iOS/Safari probe `/apple-touch-icon-precomposed.png` (and
 * `/apple-touch-icon.png`) even though Next injects
 * <link rel="apple-touch-icon" href="/apple-icon">. Without a static file
 * the request fell through to the marketing `/[slug]` route and crashed
 * (Sentry 1J, `controller[kState].transformAlgorithm is not a function`).
 * Keep both as real 180×180 PNGs in public/.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngSize(buf: Buffer) {
  // IHDR is the first chunk: 8-byte signature, 4-byte length, 4-byte "IHDR", then width/height.
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("public apple-touch-icon files", () => {
  for (const name of ["apple-touch-icon-precomposed.png", "apple-touch-icon.png"]) {
    it(`${name} is a 180×180 PNG`, () => {
      const buf = readFileSync(resolve(__dirname, "../../../public", name));
      expect(buf.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
      expect(buf.toString("ascii", 12, 16)).toBe("IHDR");
      expect(pngSize(buf)).toEqual({ width: 180, height: 180 });
    });
  }
});
