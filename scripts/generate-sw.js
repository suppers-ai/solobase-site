#!/usr/bin/env node

const { generateSW } = require('workbox-build');
const path = require('path');

async function buildServiceWorker() {
  console.log('🔧 Generating service worker...');
  
  try {
    const { count, size, warnings } = await generateSW({
      swDest: path.join(__dirname, '..', 'public', 'sw.js'),
      globDirectory: path.join(__dirname, '..', 'public'),
      globPatterns: [
        '**/*.{html,css,js,json,svg,png,jpg,jpeg,webp,woff,woff2}'
      ],
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'google-fonts-stylesheets',
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 60,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
            },
          },
        },
        {
          urlPattern: /\.(?:js|css)$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-resources',
          },
        },
        {
          urlPattern: /^https:\/\/demo\.solobase\.dev\/api/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 5,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 5, // 5 minutes
            },
          },
        },
      ],
      navigateFallback: '/offline.html',
      navigateFallbackDenylist: [/^\/api/, /^\/demo/],
    });

    console.log(`✅ Service worker generated successfully!`);
    console.log(`   ${count} files will be precached, totaling ${(size / 1024 / 1024).toFixed(2)} MB`);
    
    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    // Create offline fallback page
    const fs = require('fs').promises;
    const offlineHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - Solobase</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        p {
            font-size: 1.25rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .btn {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 0.5rem;
            font-weight: 600;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📡 You're Offline</h1>
        <p>It looks like you've lost your internet connection.</p>
        <p>Please check your connection and try again.</p>
        <a href="/" class="btn" onclick="window.location.reload(); return false;">Try Again</a>
    </div>
</body>
</html>`;
    
    await fs.writeFile(
      path.join(__dirname, '..', 'public', 'offline.html'),
      offlineHtml
    );
    console.log('✅ Offline fallback page created');
    
  } catch (error) {
    console.error('❌ Error generating service worker:', error);
    process.exit(1);
  }
}

buildServiceWorker();