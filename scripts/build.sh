#!/bin/bash

# TODO: use zx
# TODO: remove $schema from manifest when building
# TODO: minify manifest when building in production

browser="$2"
esbuildTarget=""

# If no browser specified
# TODO: build for all instead of erroring
if [ -z "$browser" ]; then
  echo "No browser specified" 2>&1
  exit 1
fi

case "$browser" in

  chrome)
    echo "Building for Chrome"
    esbuildTarget="chrome58"
    ;;
  
  firefox)
    echo "Building for Firefox"
    esbuildTarget="firefox57"
    ;;
  
  *)
    echo "Unrecognized browser: $browser" 2>&1
    exit 1
    ;;

esac

if [ "$1" = "dev" ]; then
  isDev="1"
  export NODE_ENV="dev"
else
  isDev="0"
  export NODE_ENV="production"
fi

# Install dependencies
npm i

# Remove old builds
rm -rf "dist"
mkdir "dist"

# Copy manifest
cp "src/manifests/$browser.json" "dist/manifest.json"

# Copy public files
cp -r "public" "dist/public"

# Copy HTML, CSS and net rules
cp -r src/{html,css,net-rules} "dist"

# Copy Monaco editor from Node modules
monacoMode="min"
if [ "$isDev" = "1" ]; then
  monacoMode="dev"
fi
cp -r "node_modules/monaco-editor/$monacoMode/vs" "dist/public/vs"

# Copy RequireJS lib
cp "node_modules/requirejs/require.js" "dist/public/require.js"

# ESBuild options
opts="--bundle --target=$esbuildTarget"
if [ "$isDev" = "1" ]; then
  # Enable sourcemaps and watch in development
  opts="$opts --sourcemap --watch"
else
  # Minify in production
  opts="$opts --minify"
fi

# Build TypeScript files into JavaScript
./node_modules/.bin/esbuild src/{inject,background,popup,content,ot}.ts --outdir=dist $opts
