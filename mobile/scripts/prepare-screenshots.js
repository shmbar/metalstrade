#!/usr/bin/env node
/**
 * Turn raw device screenshots into App Store Connect-ready images.
 *
 * We have no Mac and therefore no simulator, so store screenshots are captured
 * on a physical iPhone whose resolution almost never matches what App Store
 * Connect demands. This resizes them to an exact accepted size and — just as
 * importantly — flattens the alpha channel, because ASC rejects any PNG that
 * still has one with a message that does not explain itself.
 *
 * Usage (run from the repo root or from mobile/):
 *   node mobile/scripts/prepare-screenshots.js --in ./raw --out ./shots
 *   node mobile/scripts/prepare-screenshots.js --in ./raw --size 6.9
 *   node mobile/scripts/prepare-screenshots.js --in ./raw --mode cover
 *
 * Options:
 *   --in    <dir>   Source folder of .png/.jpg screenshots   (default ./raw)
 *   --out   <dir>   Destination folder                       (default ./shots)
 *   --size  <name>  6.5 | 6.9 | ipad13                       (default 6.5)
 *   --mode  <name>  contain (pad, keeps all content)         (default contain)
 *                   cover   (fills frame, crops edges)
 *   --bg    <hex>   Padding colour for contain mode          (default #ffffff)
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// App Store Connect accepts a small set of exact pixel sizes per display class.
// Supplying the largest iPhone size lets Apple scale it down for smaller slots.
const SIZES = {
  '6.5': { w: 1284, h: 2778, label: 'iPhone 6.5" (required by this listing)' },
  '6.9': { w: 1290, h: 2796, label: 'iPhone 6.9"' },
  ipad13: { w: 2064, h: 2752, label: 'iPad 13" (only needed if the build supports iPad)' },
};

function parseArgs(argv) {
  const args = { in: './raw', out: './shots', size: '6.5', mode: 'contain', bg: '#ffffff' };
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (!(key in args)) {
      console.error(`Unknown option: ${argv[i]}`);
      process.exit(1);
    }
    if (argv[i + 1] === undefined) {
      console.error(`Option --${key} needs a value`);
      process.exit(1);
    }
    args[key] = argv[i + 1];
  }
  return args;
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) {
    console.error(`--bg must be a 6-digit hex colour, got "${hex}"`);
    process.exit(1);
  }
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, alpha: 1 };
}

async function main() {
  const args = parseArgs(process.argv);
  const target = SIZES[args.size];
  if (!target) {
    console.error(`--size must be one of: ${Object.keys(SIZES).join(', ')}`);
    process.exit(1);
  }
  if (args.mode !== 'contain' && args.mode !== 'cover') {
    console.error('--mode must be "contain" or "cover"');
    process.exit(1);
  }
  if (!fs.existsSync(args.in)) {
    console.error(`Source folder not found: ${path.resolve(args.in)}`);
    console.error('Put your raw iPhone screenshots there and run again.');
    process.exit(1);
  }

  const files = fs
    .readdirSync(args.in)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (files.length === 0) {
    console.error(`No .png or .jpg files in ${path.resolve(args.in)}`);
    process.exit(1);
  }

  fs.mkdirSync(args.out, { recursive: true });
  const background = hexToRgb(args.bg);

  console.log(`${target.label} — ${target.w} x ${target.h}, mode "${args.mode}"`);

  let index = 0;
  for (const file of files) {
    index += 1;
    const src = path.join(args.in, file);
    const meta = await sharp(src).metadata();
    const outName = `${String(index).padStart(2, '0')}-${path.parse(file).name}.png`;
    const dest = path.join(args.out, outName);

    await sharp(src)
      .resize(target.w, target.h, { fit: args.mode, background })
      // Apple rejects screenshots that carry an alpha channel, so composite
      // onto a solid background and drop transparency entirely.
      .flatten({ background })
      .png({ compressionLevel: 9 })
      .toFile(dest);

    console.log(`  ${file}  ${meta.width}x${meta.height}  ->  ${outName}`);
  }

  console.log(`\n${files.length} image(s) written to ${path.resolve(args.out)}`);
  console.log('Upload the first three in the order you want them shown — Apple');
  console.log('uses only those three on the install sheet.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
