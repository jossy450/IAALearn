const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const logoPath = path.join(__dirname, 'android/app/src/main/res/drawable/mightysky_logo.png');
const outputDir = path.join(__dirname, 'android/app/src/main/res');

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const foregroundSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function generateIcons() {
  if (!fs.existsSync(logoPath)) {
    console.log('Logo not found, using placeholder');
    return;
  }

  const logoBuffer = fs.readFileSync(logoPath);
  
  // Generate adaptive icon foregrounds (larger for better quality on adaptive icons)
  for (const [dir, size] of Object.entries(foregroundSizes)) {
    const outPath = path.join(outputDir, dir, 'ic_launcher_foreground.png');
    await sharp(logoBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 59, g: 130, b: 246, alpha: 1 } }) // #3b82f6
      .png()
      .toFile(outPath);
    console.log(`Generated: ${outPath}`);
  }

  // Generate regular launcher icons (square)
  for (const [dir, size] of Object.entries(sizes)) {
    const outPath = path.join(outputDir, dir, 'ic_launcher.png');
    const outPathRound = path.join(outputDir, dir, 'ic_launcher_round.png');
    
    await sharp(logoBuffer)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outPath);
    
    await sharp(logoBuffer)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outPathRound);
    
    console.log(`Generated: ${outPath} and ${outPathRound}`);
  }

  // Generate drawable icons
  const drawableDir = path.join(outputDir, 'drawable');
  await sharp(logoBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 59, g: 130, b: 246, alpha: 1 } })
    .png()
    .toFile(path.join(drawableDir, 'ic_launcher_foreground.png'));
  console.log('Generated: drawable/ic_launcher_foreground.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
