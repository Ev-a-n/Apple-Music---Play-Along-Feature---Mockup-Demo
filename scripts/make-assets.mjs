// Generates the app icon and the social preview image in code (no design files).
// Run with: npm run assets
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
function png(w, h, pixel) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x, y);
      const i = y * (w * 3 + 1) + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4);
  head[8] = 8; head[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const stops = [[55, 77, 104], [61, 73, 89], [64, 71, 80], [59, 60, 59], [52, 48, 42]];
const gradient = (t) => {
  const p = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(p), f = p - i;
  return stops[i].map((c, k) => c + (stops[i + 1][k] - c) * f);
};
const mix = (a, b, t) => a.map((c, k) => c + (b[k] - c) * Math.max(0, Math.min(1, t)));
const white = [255, 255, 255];
// Anti-aliased rounded rectangle coverage (0..1).
const rrect = (x, y, cx, cy, hw, hh, r) => {
  const dx = Math.max(Math.abs(x - cx) - (hw - r), 0), dy = Math.max(Math.abs(y - cy) - (hh - r), 0);
  return Math.max(0, Math.min(1, r - Math.hypot(dx, dy) + 0.5));
};

// The motif: a timeline bar with a bright looped stretch between two markers.
function motif(w, h, s, cy) {
  return (x, y) => {
    let c = gradient(y / h);
    const glow = Math.max(0, 1 - Math.hypot(x - w * 0.25, y - h * 0.2) / (w * 0.6));
    c = mix(c, [96, 128, 170], glow * 0.35);
    const cx = w / 2, half = w * 0.36;
    c = mix(c, white, rrect(x, y, cx, cy, half, 2.5 * s, 2.5 * s) * 0.25);
    const a = cx - half * 0.45, b = cx + half * 0.3;
    c = mix(c, white, rrect(x, y, (a + b) / 2, cy, (b - a) / 2, 2.5 * s, 1) * 0.5);
    c = mix(c, white, rrect(x, y, (a + (a + b) / 2) / 2, cy, (b - a) / 4, 2.5 * s, 1));
    c = mix(c, white, rrect(x, y, a, cy, 3 * s, 11.5 * s, 2 * s));
    c = mix(c, white, rrect(x, y, b, cy, 3 * s, 11.5 * s, 2 * s));
    return c;
  };
}
function og(w, h) {
  const bar = motif(w, h, 3, h * 0.62);
  const lines = [[0.3, 0.42, 0.3], [0.4, 0.34, 1], [0.5, 0.46, 0.55]];
  return (x, y) => {
    let c = bar(x, y);
    for (const [fy, fw, o] of lines) c = mix(c, white, rrect(x, y, w * 0.14 + (w * fw) / 2, h * fy - 40, (w * fw) / 2, 14, 14) * o);
    return c;
  };
}

writeFileSync('public/icon-180.png', png(180, 180, motif(180, 180, 1.6, 90)));
writeFileSync('public/icon-512.png', png(512, 512, motif(512, 512, 4.5, 256)));
writeFileSync('public/og.png', png(1200, 630, og(1200, 630)));
console.log('Wrote public/icon-180.png, public/icon-512.png, public/og.png');
