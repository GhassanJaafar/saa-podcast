/**
 * Generate a real favicon.ico + apple-touch-icon.png from public/favicon.svg.
 *
 * The previous favicon.ico was an SVG file renamed to .ico, which browsers
 * refuse to render. This writes a genuine ICO container holding PNG-encoded
 * 16/32/48px entries (the PNG-in-ICO form, supported since Windows Vista).
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const SRC = 'public/favicon.svg';
const SIZES = [16, 32, 48];

// The mark is 140x111 — pad it to a square instead of stretching it.
const square = (size) =>
  sharp(SRC, { density: 384 })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

const pngs = await Promise.all(SIZES.map(square));

// ── Pack into an ICO container ──────────────────────────────────────────────
const HEADER = 6;
const ENTRY = 16;
const header = Buffer.alloc(HEADER);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: 1 = icon
header.writeUInt16LE(SIZES.length, 4);

let offset = HEADER + ENTRY * SIZES.length;
const entries = SIZES.map((size, i) => {
  const e = Buffer.alloc(ENTRY);
  e.writeUInt8(size === 256 ? 0 : size, 0); // width
  e.writeUInt8(size === 256 ? 0 : size, 1); // height
  e.writeUInt8(0, 2); // palette size
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});

writeFileSync('public/favicon.ico', Buffer.concat([header, ...entries, ...pngs]));

// Safari needs a real PNG for the home-screen icon; it cannot use an SVG.
await sharp(SRC, { density: 384 })
  .resize(180, 180, { fit: 'contain', background: { r: 255, g: 249, b: 237, alpha: 1 } })
  .png({ compressionLevel: 9 })
  .toFile('public/apple-touch-icon.png');

console.log(`favicon.ico: ${SIZES.join('/')}px entries`);
console.log('apple-touch-icon.png: 180x180');
