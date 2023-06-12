#!/usr/bin/env zx

const args = argv._;
if (args[0] == path.basename(__filename)) {
  args.shift();
}

const browser = argv.browser || args[1];
let esbuildTarget = '';

// If no browser specified
// TODO: build for all instead of erroring
if (!browser) {
  echo('No browser specified');
  exit(1);
}

switch (browser) {
  case 'chrome':
    echo('Building for Chrome');
    esbuildTarget = 'chrome58';
    break;

  case 'firefox':
    echo('Building for Firefox');
    esbuildTarget = 'firefox57';
    break;

  default:
    echo('Unrecognized browser: $browser');
    exit(1);
    break;
}

let isDev = false;
let NODE_ENV = 'production';
if (argv.dev || argv._[0] == 'dev') {
  isDev = true;
  NODE_ENV = 'dev';
}

// Install dependencies
await $`npm i`;

// Remove old builds
await fs.emptyDir('dist');

// Copy manifest
const manifest = await fs.readJson(`src/manifests/${browser}.json`);
delete manifest['$schema'];
await fs.writeJson(`dist/manifest.json`, manifest);

// Copy localization files
await fs.copy(`src/locales`, `dist/_locales`);

// Copy public files
await fs.copy('public', 'dist/public');

// Copy HTML, CSS and net rules
for (const folder of ['html', 'css', 'net-rules']) {
  await fs.copy(`src/${folder}`, `dist/${folder}`);
}

// Copy Monaco editor from Node modules
const monacoMode = isDev ? 'dev' : 'min';
await fs.copy(`node_modules/monaco-editor/${monacoMode}/vs`, 'dist/public/vs');

// Copy RequireJS lib
await fs.copy('node_modules/requirejs/require.js', 'dist/public/require.js');

// ESBuild options
let opts = ['--bundle', `--target=${esbuildTarget}`];
if (isDev) {
  // Enable sourcemaps and watch in development
  opts.push('--sourcemap', '--watch');
} else {
  // Minify in production
  opts.push('--minify');
}

// Build TypeScript files into JavaScript
await $`./node_modules/.bin/esbuild src/{inject,background,popup,content,ot}.ts --outdir=dist ${opts}`;
