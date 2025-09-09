#!/bin/bash

# Build script for Solobase Demo Site

echo "Building Solobase Demo Site..."

# Clean previous build
if [ -d "public" ]; then
    echo "Cleaning previous build..."
    rm -rf public
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build CSS with PurgeCSS
echo "Building optimized CSS..."
npm run build:css

# Build the site with minification and cleanup
echo "Generating static site..."
hugo --minify --gc --cleanDestinationDir

# Check if build was successful
if [ $? -eq 0 ]; then
    # Optimize images
    echo "Optimizing images..."
    find public -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) -exec echo "Optimizing {}" \;
    
    # Generate service worker
    echo "Generating service worker..."
    node scripts/generate-sw.js
    
    # Compress assets
    echo "Compressing assets..."
    find public -type f \( -name "*.html" -o -name "*.css" -o -name "*.js" -o -name "*.json" \) -exec gzip -k {} \;
    
    echo ""
    echo "✅ Build completed successfully!"
    echo "📁 Generated files are in the 'public' directory"
    echo "📊 Build stats:"
    du -sh public/
    echo "🚀 Ready for deployment"
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi