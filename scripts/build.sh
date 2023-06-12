#!/bin/bash

isDev="0"
if [ "$1" = "dev" ]; then
  isDev="1"
fi

rm -rf dist
mkdir dist

cp src/manifest.json dist/manifest.json
cp -r public dist/public
cp -r src/{html,css,net-rules} dist

opts="--bundle --target=chrome58"
if [ "$isDev" = "1" ]; then
  opts="$opts --sourcemap"
else
  opts="$opts --minify"
fi

# TODO: do in one command
./node_modules/.bin/esbuild src/inject.ts     --outfile=dist/inject.js     $opts
./node_modules/.bin/esbuild src/background.ts --outfile=dist/background.js $opts
./node_modules/.bin/esbuild src/popup.ts      --outfile=dist/popup.js      $opts
./node_modules/.bin/esbuild src/content.ts    --outfile=dist/content.js    $opts
./node_modules/.bin/esbuild src/ot.ts         --outfile=dist/ot.js         $opts
