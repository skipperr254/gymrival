/**
 * Generates branded app icon assets using an inline SVG barbell mark.
 * Run: node scripts/generate-icons.mjs
 * Requires: sharp (devDependency) — npm install --save-dev sharp
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'assets', 'images');

/**
 * Builds an SVG string for a symmetric barbell mark centered on a square canvas.
 *
 * Geometry (all proportional to canvas size, with minimums for small icons):
 *   • Two outer weight plates on each end
 *   • Two inner weight plates just inside them
 *   • A thin horizontal rod spanning the full barbell width
 */
function makeBarbellSVG({ size, barbellWidthPct, markColor, bgColor }) {
  const total = size;
  const cx = total / 2;
  const cy = total / 2;
  const bw = total * barbellWidthPct; // total barbell width in px
  const hw = bw / 2;

  // Proportional dimensions — minimums prevent invisibly-thin shapes at 96 px
  const outerPlateW = Math.max(6, total * 0.047);
  const outerPlateH = Math.max(22, total * 0.195);
  const innerPlateW = Math.max(4, total * 0.033);
  const innerPlateH = Math.max(16, total * 0.146);
  const gap = Math.max(1, total * 0.0078);
  const barH = Math.max(4, total * 0.0176);
  const plateRx = Math.max(1, total * 0.004);
  const barRx = barH / 2;

  // X positions (left side; right side is the mirror)
  const leftOuterX = cx - hw;
  const leftInnerX = leftOuterX + outerPlateW + gap;
  const barX = leftInnerX + innerPlateW + gap;
  const barW = bw - 2 * (outerPlateW + innerPlateW + 2 * gap);

  // Y positions (centered vertically)
  const outerPlateY = cy - outerPlateH / 2;
  const innerPlateY = cy - innerPlateH / 2;
  const barY = cy - barH / 2;

  // Right-side mirror X positions
  const rightInnerX = cx + hw - outerPlateW - gap - innerPlateW;
  const rightOuterX = cx + hw - outerPlateW;

  const bgAttr = bgColor
    ? `<rect width="${total}" height="${total}" fill="${bgColor}"/>`
    : '';

  const f = (n) => n.toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}">
  ${bgAttr}
  <!-- Rod (full barbell width) -->
  <rect x="${f(leftOuterX)}" y="${f(barY)}" width="${f(bw)}" height="${f(barH)}" rx="${f(barRx)}" fill="${markColor}"/>
  <!-- Left outer plate -->
  <rect x="${f(leftOuterX)}" y="${f(outerPlateY)}" width="${f(outerPlateW)}" height="${f(outerPlateH)}" rx="${f(plateRx)}" fill="${markColor}"/>
  <!-- Left inner plate -->
  <rect x="${f(leftInnerX)}" y="${f(innerPlateY)}" width="${f(innerPlateW)}" height="${f(innerPlateH)}" rx="${f(plateRx)}" fill="${markColor}"/>
  <!-- Right inner plate -->
  <rect x="${f(rightInnerX)}" y="${f(innerPlateY)}" width="${f(innerPlateW)}" height="${f(innerPlateH)}" rx="${f(plateRx)}" fill="${markColor}"/>
  <!-- Right outer plate -->
  <rect x="${f(rightOuterX)}" y="${f(outerPlateY)}" width="${f(outerPlateW)}" height="${f(outerPlateH)}" rx="${f(plateRx)}" fill="${markColor}"/>
</svg>`;
}

const assets = [
  {
    // App icon: solid dark background, red barbell at ~58% width
    filename: 'icon.png',
    size: 1024,
    barbellWidthPct: 0.585,
    markColor: '#e63030',
    bgColor: '#141414',
  },
  {
    // Android adaptive icon foreground: transparent bg, barbell at ~52% — safely
    // within the inner safe zone so circular/rounded-rect masks don't clip it
    filename: 'adaptive-icon-foreground.png',
    size: 1024,
    barbellWidthPct: 0.52,
    markColor: '#e63030',
    bgColor: null,
  },
  {
    // Splash icon: transparent bg, shown at imageWidth:200 over dark background
    filename: 'splash-icon.png',
    size: 1024,
    barbellWidthPct: 0.585,
    markColor: '#e63030',
    bgColor: null,
  },
  {
    // Android notification icon: white silhouette on transparent background.
    // Android renders notification icons as flat white; color fills show as a
    // solid white square, so this MUST be white-on-transparent.
    filename: 'notification-icon.png',
    size: 96,
    barbellWidthPct: 0.585,
    markColor: '#ffffff',
    bgColor: null,
  },
];

async function generate() {
  for (const asset of assets) {
    const svg = makeBarbellSVG(asset);
    const outPath = path.join(outDir, asset.filename);
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outPath);
    console.log(`✓  ${asset.filename}  (${asset.size}×${asset.size})`);
  }
  console.log('\nAll assets written to assets/images/');
}

generate().catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});
