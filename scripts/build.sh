#!/bin/bash

isDev="0"
if [ "$1" = "dev" ]; then
  isDev="1"
fi

# Remove old builds
rm -rf "dist"
mkdir "dist"

# Copy manifest
cp "src/manifest.json" "dist/manifest.json"

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
opts="--bundle --target=chrome58"
if [ "$isDev" = "1" ]; then
  # Enable sourcemaps and watch in development
  opts="$opts --sourcemap --watch"
else
  # Minify in production
  opts="$opts --minify"
fi

# Build TypeScript files into JavaScript
./node_modules/.bin/esbuild src/{inject,background,popup,content,ot}.ts --outdir=dist $opts
