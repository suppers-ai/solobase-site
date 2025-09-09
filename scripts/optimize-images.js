#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (!SUPPORTED_FORMATS.includes(ext)) {
    return;
  }
  
  try {
    const stats = await fs.stat(filePath);
    const originalSize = stats.size;
    
    // Read the image
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    // Optimize based on format
    let optimized;
    if (ext === '.png') {
      optimized = image.png({ quality: 85, compressionLevel: 9 });
    } else if (ext === '.jpg' || ext === '.jpeg') {
      optimized = image.jpeg({ quality: 85, progressive: true });
    } else if (ext === '.webp') {
      optimized = image.webp({ quality: 85 });
    }
    
    // Resize if too large
    if (metadata.width > 2000) {
      optimized = optimized.resize(2000, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }
    
    // Save optimized image
    const tempPath = `${filePath}.tmp`;
    await optimized.toFile(tempPath);
    
    // Check if optimization was worth it
    const newStats = await fs.stat(tempPath);
    if (newStats.size < originalSize) {
      await fs.rename(tempPath, filePath);
      const savedPercent = ((originalSize - newStats.size) / originalSize * 100).toFixed(1);
      console.log(`  ✓ ${path.relative(PUBLIC_DIR, filePath)} - saved ${savedPercent}%`);
    } else {
      await fs.unlink(tempPath);
      console.log(`  - ${path.relative(PUBLIC_DIR, filePath)} - already optimized`);
    }
  } catch (error) {
    console.error(`  ✗ Error optimizing ${filePath}:`, error.message);
  }
}

async function findImages(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findImages(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_FORMATS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

async function main() {
  console.log('🖼️  Optimizing images...');
  
  try {
    // Check if public directory exists
    await fs.access(PUBLIC_DIR);
    
    // Find all images
    const images = await findImages(PUBLIC_DIR);
    
    if (images.length === 0) {
      console.log('No images found to optimize.');
      return;
    }
    
    console.log(`Found ${images.length} images to process...`);
    
    // Optimize all images
    for (const image of images) {
      await optimizeImage(image);
    }
    
    console.log('✅ Image optimization complete!');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Public directory not found. Run Hugo build first.');
    } else {
      console.error('Error during optimization:', error);
      process.exit(1);
    }
  }
}

main();