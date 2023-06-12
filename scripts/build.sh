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
  opts="$opts --sourcemap --watch"
else
  opts="$opts --minify"
fi

./node_modules/.bin/esbuild src/{inject,background,popup,content,ot}.ts --outdir=dist $opts
