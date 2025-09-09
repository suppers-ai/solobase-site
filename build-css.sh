#!/bin/bash

# Build CSS with Tailwind CSS for Hugo
echo "Building Tailwind CSS for Hugo..."

# Create static/css directory if it doesn't exist
mkdir -p static/css

# Build CSS with Tailwind
npx tailwindcss -i ./themes/solobase-theme/assets/css/main.css -o ./static/css/main.css --minify

echo "CSS build complete!"