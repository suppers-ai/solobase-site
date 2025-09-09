#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Test configuration
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const tests = [];
let passed = 0;
let failed = 0;

// Helper functions
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runTest(name, testFn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    await testFn();
    console.log('✅ PASSED');
    passed++;
    return true;
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    failed++;
    return false;
  }
}

// Test suite
async function runTests() {
  console.log('🧪 Running integration tests...\n');
  
  // Test 1: Check if build directory exists
  await runTest('Build directory exists', async () => {
    if (!await fileExists(PUBLIC_DIR)) {
      throw new Error('Public directory does not exist');
    }
  });
  
  // Test 2: Check critical files
  await runTest('Critical files exist', async () => {
    const criticalFiles = [
      'index.html',
      'docs/index.html',
      'demo/index.html',
      'sitemap.xml',
      'robots.txt',
      'manifest.json',
      'sw.js'
    ];
    
    for (const file of criticalFiles) {
      const filePath = path.join(PUBLIC_DIR, file);
      if (!await fileExists(filePath)) {
        throw new Error(`Missing critical file: ${file}`);
      }
    }
  });
  
  // Test 3: Check HTML validity
  await runTest('HTML structure validity', async () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const content = await fs.readFile(indexPath, 'utf-8');
    
    // Check for essential elements
    if (!content.includes('<!DOCTYPE html>')) {
      throw new Error('Missing DOCTYPE declaration');
    }
    if (!content.includes('<html')) {
      throw new Error('Missing html tag');
    }
    if (!content.includes('<head>')) {
      throw new Error('Missing head tag');
    }
    if (!content.includes('<body')) {
      throw new Error('Missing body tag');
    }
    if (!content.includes('<meta name="viewport"')) {
      throw new Error('Missing viewport meta tag');
    }
  });
  
  // Test 4: Check for broken internal links
  await runTest('No broken internal links', async () => {
    const htmlFiles = [];
    
    async function findHtmlFiles(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await findHtmlFiles(fullPath);
        } else if (entry.name.endsWith('.html')) {
          htmlFiles.push(fullPath);
        }
      }
    }
    
    await findHtmlFiles(PUBLIC_DIR);
    
    const linkRegex = /href="([^"]+)"/g;
    const brokenLinks = [];
    
    for (const htmlFile of htmlFiles) {
      const content = await fs.readFile(htmlFile, 'utf-8');
      let match;
      
      while ((match = linkRegex.exec(content)) !== null) {
        const link = match[1];
        
        // Check only internal links
        if (!link.startsWith('http') && !link.startsWith('#') && !link.startsWith('mailto:')) {
          let targetPath;
          
          if (link.startsWith('/')) {
            targetPath = path.join(PUBLIC_DIR, link);
          } else {
            targetPath = path.join(path.dirname(htmlFile), link);
          }
          
          // If link doesn't have extension, assume it's a directory with index.html
          if (!path.extname(targetPath)) {
            targetPath = path.join(targetPath, 'index.html');
          }
          
          if (!await fileExists(targetPath)) {
            brokenLinks.push(`${path.relative(PUBLIC_DIR, htmlFile)} -> ${link}`);
          }
        }
      }
    }
    
    if (brokenLinks.length > 0) {
      throw new Error(`Found ${brokenLinks.length} broken links:\n${brokenLinks.join('\n')}`);
    }
  });
  
  // Test 5: Check file sizes
  await runTest('File sizes are reasonable', async () => {
    const stats = await fs.stat(PUBLIC_DIR);
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    
    async function getDirectorySize(dir) {
      let size = 0;
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          size += await getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          size += stats.size;
        }
      }
      
      return size;
    }
    
    const totalSize = await getDirectorySize(PUBLIC_DIR);
    
    if (totalSize > maxSizeBytes) {
      throw new Error(`Build size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds limit (50MB)`);
    }
  });
  
  // Test 6: Check for required meta tags
  await runTest('SEO meta tags present', async () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const content = await fs.readFile(indexPath, 'utf-8');
    
    const requiredMeta = [
      'name="description"',
      'property="og:title"',
      'property="og:description"',
      'name="twitter:card"'
    ];
    
    for (const meta of requiredMeta) {
      if (!content.includes(meta)) {
        throw new Error(`Missing meta tag: ${meta}`);
      }
    }
  });
  
  // Test 7: Check security headers in config
  await runTest('Security configuration exists', async () => {
    const netlifyConfig = path.join(__dirname, '..', 'netlify.toml');
    if (await fileExists(netlifyConfig)) {
      const content = await fs.readFile(netlifyConfig, 'utf-8');
      
      const securityHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Content-Security-Policy'
      ];
      
      for (const header of securityHeaders) {
        if (!content.includes(header)) {
          throw new Error(`Missing security header: ${header}`);
        }
      }
    }
  });
  
  // Test 8: Check for service worker
  await runTest('Service worker configured', async () => {
    const swPath = path.join(PUBLIC_DIR, 'sw.js');
    const swRegisterPath = path.join(PUBLIC_DIR, 'js', 'sw-register.js');
    
    if (!await fileExists(swPath)) {
      throw new Error('Service worker not found');
    }
    
    if (!await fileExists(swRegisterPath)) {
      throw new Error('Service worker registration script not found');
    }
  });
  
  // Test 9: Check demo container configuration
  await runTest('Demo container configuration', async () => {
    const dockerfilePath = path.join(__dirname, '..', 'Dockerfile.demo');
    const dockerComposePath = path.join(__dirname, '..', 'docker-compose.demo.yml');
    
    if (!await fileExists(dockerfilePath)) {
      throw new Error('Dockerfile.demo not found');
    }
    
    if (!await fileExists(dockerComposePath)) {
      throw new Error('docker-compose.demo.yml not found');
    }
  });
  
  // Test 10: Validate JSON files
  await runTest('JSON files are valid', async () => {
    const jsonFiles = [
      path.join(PUBLIC_DIR, 'manifest.json'),
      path.join(PUBLIC_DIR, 'build-info.json')
    ];
    
    for (const jsonFile of jsonFiles) {
      if (await fileExists(jsonFile)) {
        const content = await fs.readFile(jsonFile, 'utf-8');
        try {
          JSON.parse(content);
        } catch (error) {
          throw new Error(`Invalid JSON in ${path.basename(jsonFile)}: ${error.message}`);
        }
      }
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed. Please fix the issues and try again.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});