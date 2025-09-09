#!/bin/bash

# Development server script for Solobase Demo Site

echo "Starting Solobase Demo Site development environment..."
echo ""

# Check if Node.js dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
    echo ""
fi

# Build CSS first
echo "Building Tailwind CSS..."
./build-css.sh
echo ""

echo "Starting Hugo development server..."
echo "Site will be available at: http://localhost:1313"
echo "Press Ctrl+C to stop the server"
echo ""

# Start Hugo server with CSS watching in background
npx tailwindcss -i ./themes/solobase-theme/assets/css/main.css -o ./static/css/main.css --watch &
CSS_PID=$!

# Start Hugo server
hugo server \
  --source . \
  --buildDrafts \
  --buildFuture \
  --watch \
  --verbose \
  --port 1313 \
  --bind 0.0.0.0

# Kill CSS watcher when Hugo server stops
kill $CSS_PID 2>/dev/null