#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function copyServiceWorker() {
  console.log('🔧 Copying minimal service worker...');
  
  try {
    // Copy the minimal service worker from static to public
    const swSource = path.join(__dirname, '..', 'static', 'sw.js');
    const swDest = path.join(__dirname, '..', 'public', 'sw.js');
    
    const swContent = await fs.readFile(swSource, 'utf8');
    await fs.writeFile(swDest, swContent);
    
    console.log('✅ Service worker copied successfully (no caching enabled)');
    
  } catch (error) {
    console.error('❌ Error copying service worker:', error);
    process.exit(1);
  }
}

copyServiceWorker();