#!/usr/bin/env zx

// Directory that contains all builds
const distDir = 'dist';

// Node modules directory
const nodeModulesDir = path.resolve('./node_modules');

// Build types for Node, to use here
await $`./node_modules/.bin/esbuild ./src/types --outfile=${distDir}/types.js --bundle --minify --target=node12 --format=cjs`;
const { replitAccents } = require(`../${distDir}/types.js`);
await fs.rm(`${distDir}/types.js`);

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

// Build directory
const buildDir = `${distDir}/${browser}`;

// Remove old builds
if (await fs.pathExists(`${distDir}/manifest.json`)) {
  await fs.emptyDir(distDir);
} else {
  await fs.emptyDir(buildDir);
}

await fs.ensureDir(buildDir);

// Copy manifest
const manifest = await fs.readJson('src/manifest.json');
delete manifest['$schema'];
switch (browser) {
  case 'firefox': {
    manifest.background.scripts = [manifest.background.service_worker];
    delete manifest.background.service_worker;
    break;
  }

  case 'chrome': {
    delete manifest.developer;
  }
}
await fs.writeJson(`${buildDir}/manifest.json`, manifest);

// Copy localization files
await fs.copy(`src/locales`, `${buildDir}/_locales`);

// Copy public files
await fs.copy('public', `${buildDir}/public`);

// Copy HTML, CSS and net rules
for (const folder of ['html', 'css', 'net-rules']) {
  await fs.copy(`src/${folder}`, `${buildDir}/${folder}`);
}

// Inject variant classes into XL CSS
let xlCss = await fs.readFile(`${buildDir}/css/xl.css`, 'utf8');
for (const accent of replitAccents) {
  xlCss += `
    .${accent}-fg {
      color: var(--accent-${accent}-default);
    }

    .${accent}-bg {
      background-color: var(--accent-${accent}-default);
    }
  `.replace(/\s+/g, '');
}
await fs.writeFile(`${buildDir}/css/xl.css`, xlCss);

// Copy Monaco editor from Node modules
const monacoMode = isDev ? 'dev' : 'min';
await fs.copy(
  `node_modules/monaco-editor/${monacoMode}/vs`,
  `${buildDir}/public/vs`
);

// Copy RequireJS lib
await fs.copy(
  'node_modules/requirejs/require.js',
  `${buildDir}/public/require.js`
);

// ESBuild options
let opts = ['--bundle', '--minify', `--target=${esbuildTarget}`];
if (isDev) {
  // Enable sourcemaps and watch in development
  opts.push('--sourcemap' /*, '--watch'*/);

  // Watch temporarily disabled due to multiple esbuild commands
} else {
}

// Build TypeScript files into JavaScript
await $`./node_modules/.bin/esbuild src/inject.ts ${[
  `--outdir=${buildDir}`,
  ...opts,
  '--global-name=xlReplit',
]}`;
await $`./node_modules/.bin/esbuild src/{background,popup,content,index}.ts src/util/ot.ts --outdir=${buildDir} ${opts}`;

// If prod, bundle
if (!isDev) {
  await $`cd ${buildDir} && ${nodeModulesDir}/.bin/web-ext build -o`;

  await fs.move(
    `${buildDir}/web-ext-artifacts/xl_replit-${manifest.version}.zip`,
    `${buildDir}/../${browser}.zip`
  );

  await fs.remove(`${buildDir}/web-ext-artifacts`);
}
