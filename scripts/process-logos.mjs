import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const ICON_SRC = 'C:\\Users\\Nemo CLAW\\.gemini\\antigravity\\brain\\b6b24f41-40ee-4ffe-8958-eb97d57802e9\\claw_icon_mark_1774368839428.png';
const WORDMARK_SRC = 'C:\\Users\\Nemo CLAW\\.gemini\\antigravity\\brain\\b6b24f41-40ee-4ffe-8958-eb97d57802e9\\full_wordmark_logo_1774368855448.png';
const OUTPUT_DIR = join('C:\\Projects\\NemoC_LAW_AI', 'public', 'logos');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Remove near-white/light background → transparent ──
async function removeWhiteBg(inputPath, threshold = 235) {
  const image = sharp(inputPath);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Remove white and near-white pixels
    if (r > threshold && g > threshold && b > threshold) {
      data[i + 3] = 0;
    }
  }

  return { buffer: data, width, height, channels };
}

// ── Auto-crop: find bounding box of non-transparent pixels ──
function findContentBounds(data, width, height, channels) {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const alpha = data[idx + 3];
      if (alpha > 20) { // pixel is visible
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Add small padding (2% of dimensions)
  const padX = Math.max(Math.floor((maxX - minX) * 0.02), 4);
  const padY = Math.max(Math.floor((maxY - minY) * 0.02), 4);
  
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(width - 1, maxX + padX);
  maxY = Math.min(height - 1, maxY + padY);

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

// ── Process and crop an image ──
async function processImage(srcPath, name, threshold = 235) {
  console.log(`\n📸 Processing: ${name}`);
  
  const { buffer, width, height, channels } = await removeWhiteBg(srcPath, threshold);
  console.log(`   Original: ${width}×${height}`);
  
  const bounds = findContentBounds(buffer, width, height, channels);
  console.log(`   Content bounds: ${bounds.left},${bounds.top} → ${bounds.width}×${bounds.height}`);

  // Create cropped transparent version
  const cropped = await sharp(buffer, { raw: { width, height, channels } })
    .extract(bounds)
    .png()
    .toBuffer();

  const croppedMeta = await sharp(cropped).metadata();
  console.log(`   Cropped: ${croppedMeta.width}×${croppedMeta.height} (aspect: ${(croppedMeta.width / croppedMeta.height).toFixed(2)})`);

  return cropped;
}

// ── Generate size variants ──
async function generateVariants(sourceBuffer, sizes, prefix) {
  let count = 0;
  const backgrounds = [
    { name: 'transparent', bg: { r: 0, g: 0, b: 0, alpha: 0 }, flatten: false },
    { name: 'black', bg: { r: 10, g: 10, b: 15, alpha: 1 }, flatten: true },
    { name: 'white', bg: { r: 255, g: 255, b: 255, alpha: 1 }, flatten: true },
  ];

  for (const size of sizes) {
    for (const bgOpt of backgrounds) {
      const filename = `${prefix}-${size.name}-${bgOpt.name}.png`;
      const outputPath = join(OUTPUT_DIR, filename);

      let pipeline = sharp(sourceBuffer);

      if (size.h && size.w === size.h) {
        pipeline = pipeline.resize(size.w, size.h, {
          fit: 'contain',
          background: bgOpt.flatten ? bgOpt.bg : { r: 0, g: 0, b: 0, alpha: 0 },
        });
      } else if (size.h) {
        pipeline = pipeline.resize(size.w, size.h, {
          fit: 'contain',
          background: bgOpt.flatten ? bgOpt.bg : { r: 0, g: 0, b: 0, alpha: 0 },
        });
      } else {
        pipeline = pipeline.resize(size.w, null, { fit: 'inside' });
      }

      if (bgOpt.flatten) {
        pipeline = pipeline.flatten({ background: bgOpt.bg });
      }

      await pipeline.png().toFile(outputPath);
      count++;
      console.log(`   ✅ ${filename}`);
    }
  }
  return count;
}

async function main() {
  // ── 1. Process CLAW ICON (circular mark) ──
  const iconCropped = await processImage(ICON_SRC, 'Claw Icon');
  await sharp(iconCropped).toFile(join(OUTPUT_DIR, 'claw-icon-original-transparent.png'));

  const iconSizes = [
    { name: '16', w: 16, h: 16 },
    { name: '32', w: 32, h: 32 },
    { name: '48', w: 48, h: 48 },
    { name: '64', w: 64, h: 64 },
    { name: '128', w: 128, h: 128 },
    { name: '180', w: 180, h: 180 },
    { name: '192', w: 192, h: 192 },
    { name: '256', w: 256, h: 256 },
    { name: '512', w: 512, h: 512 },
    { name: '1024', w: 1024, h: 1024 },
  ];

  console.log('\n📐 Generating icon variants...');
  await generateVariants(iconCropped, iconSizes, 'claw');

  // ── 2. Process WORDMARK (full platform name - horizontal) ──
  const wordmarkCropped = await processImage(WORDMARK_SRC, 'Wordmark');
  await sharp(wordmarkCropped).toFile(join(OUTPUT_DIR, 'wordmark-original-transparent.png'));

  const wordmarkMeta = await sharp(wordmarkCropped).metadata();
  
  // Width-based sizes (maintain horizontal aspect ratio)
  const wordmarkSizes = [
    { name: 'xs', w: 150, h: null },
    { name: 'sm', w: 200, h: null },
    { name: 'md', w: 300, h: null },
    { name: 'lg', w: 400, h: null },
    { name: 'xl', w: 600, h: null },
    { name: 'xxl', w: 800, h: null },
    { name: 'full', w: 1200, h: null },
  ];

  // Height-based sizes (for navbar/footer where height is constrained)
  const wordmarkHeightSizes = [
    { name: 'h32', w: null, h: 32 },
    { name: 'h40', w: null, h: 40 },
    { name: 'h48', w: null, h: 48 },
    { name: 'h56', w: null, h: 56 },
    { name: 'h64', w: null, h: 64 },
    { name: 'h80', w: null, h: 80 },
    { name: 'h100', w: null, h: 100 },
    { name: 'h120', w: null, h: 120 },
  ];

  console.log('\n📐 Generating wordmark width variants...');
  await generateVariants(wordmarkCropped, wordmarkSizes, 'wordmark');

  // Height-based (special handling)
  console.log('\n📐 Generating wordmark height variants...');
  const backgrounds = [
    { name: 'transparent', bg: { r: 0, g: 0, b: 0, alpha: 0 }, flatten: false },
    { name: 'black', bg: { r: 10, g: 10, b: 15, alpha: 1 }, flatten: true },
    { name: 'white', bg: { r: 255, g: 255, b: 255, alpha: 1 }, flatten: true },
  ];

  for (const size of wordmarkHeightSizes) {
    for (const bgOpt of backgrounds) {
      const filename = `wordmark-${size.name}-${bgOpt.name}.png`;
      let pipeline = sharp(wordmarkCropped).resize(null, size.h, { fit: 'inside' });
      if (bgOpt.flatten) pipeline = pipeline.flatten({ background: bgOpt.bg });
      await pipeline.png().toFile(join(OUTPUT_DIR, filename));
      console.log(`   ✅ ${filename}`);
    }
  }

  // ── 3. Social media cards ──
  console.log('\n📐 Generating social cards...');
  const socialSizes = [
    { name: 'og-image', w: 1200, h: 630 },
    { name: 'twitter-card', w: 1200, h: 675 },
  ];
  await generateVariants(wordmarkCropped, socialSizes, 'nemoc');

  // ── 4. Special files ──
  console.log('\n📐 Generating special files...');
  
  // favicon (claw icon, 32x32)
  await sharp(iconCropped)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(join(OUTPUT_DIR, 'favicon.png'));
  console.log('   ✅ favicon.png');

  // apple-touch-icon (claw icon, 180x180, white bg)
  await sharp(iconCropped)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png().toFile(join(OUTPUT_DIR, 'apple-touch-icon.png'));
  console.log('   ✅ apple-touch-icon.png');

  console.log('\n🎉 All done!');
}

main().catch(console.error);
