#!/usr/bin/env zx

// Disable verbose
$.verbose = false;

// Directory that contains all builds
const distDir = 'dist';

// Builds cache directory
const buildsCacheDir = `${distDir}/.cache`;
await fs.ensureDir(buildsCacheDir);

// Node modules directory
const nodeModulesDir = path.resolve('./node_modules');

// Build types for Node, to use here
await spinner(
  'Building types',
  () =>
    $`./node_modules/.bin/esbuild ./src/types --outfile=${distDir}/types.js --bundle --minify --target=node12 --format=cjs`
);
const { replitAccents } = require(`../${distDir}/types.js`);
await fs.rm(`${distDir}/types.js`);

// Build consts for Node, to use here
await spinner(
  'Building consts',
  () =>
    $`./node_modules/.bin/esbuild ./src/consts --outfile=${distDir}/consts.js --bundle --minify --target=node12 --format=cjs`
);
const { BACKEND } = require(`../${distDir}/consts.js`);
await fs.rm(`${distDir}/consts.js`);

const args = argv._;
if (args[0] == path.basename(__filename)) {
  args.shift();
}

const browser = argv.browser || args[1] || (await question('Browser: '));
let esbuildTarget = '';
let browserSupportsSymlinks = true;

// If no browser specified
// TODO: Build for all browsers when none specified
//       Meanwhile, prompt user to specify browser

if (!browser) {
  echo('No browser specified');
  process.exit(1);
}

switch (browser) {
  case 'chrome':
    esbuildTarget = 'chrome58';
    break;

  case 'firefox':
    esbuildTarget = 'firefox57';
    browserSupportsSymlinks = false;
    break;

  default:
    echo(`Unrecognized browser: ${browser}`);
    process.exit(1);
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
await spinner('Cleaning up', async () => {
  if (await fs.pathExists(`${distDir}/manifest.json`)) {
    await fs.emptyDir(distDir);
  } else {
    await fs.emptyDir(buildDir);
  }

  await fs.ensureDir(buildDir);
});

// Load minifier lib
const { minify } = await import('uglify-js');

// Copy manifest
let manifest = null;
await spinner('Building manifest', async () => {
  manifest = await fs.readJson('src/manifest.json');
  delete manifest['$schema'];
  switch (browser) {
    case 'firefox': {
      manifest.background.scripts = [manifest.background.service_worker];
      delete manifest.background.service_worker;
      break;
    }

    case 'chrome': {
      delete manifest.developer;
      delete manifest.browser_specific_settings;
      // TODO: move URLs to a config file
      manifest.chrome_settings_overrides.search_provider.favicon_url = `${BACKEND}/${manifest.chrome_settings_overrides.search_provider.favicon_url.replace(
        /^public\/assets\//,
        ''
      )}`;
    }
  }
  await fs.writeJson(`${buildDir}/manifest.json`, manifest);
});

// Copy localization files
await spinner('Copying localization files', () =>
  fs.copy(`src/locales`, `${buildDir}/_locales`)
);

// Copy public files
await spinner('Copying public files', () =>
  fs.copy('public', `${buildDir}/public`)
);

// Copy HTML, CSS and net rules
for (const folder of ['html', 'css', 'net-rules']) {
  await spinner(`Copying ${folder}`, () =>
    fs.copy(`src/${folder}`, `${buildDir}/${folder}`)
  );
}

// Inject variant classes into XL CSS
await spinner('Building XL CSS', async () => {
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
});

// Copy Monaco editor from Node modules\
const filesToMinify = /^language\/.+\.js$/;
await spinner('Copying Monaco', async () => {
  const destDir = `${buildsCacheDir}/monaco`;

  if (!(await fs.pathExists(destDir))) {
    await fs.ensureDir(destDir);
    async function iter(dir, files) {
      dir = path.normalize(dir);

      const _dir = `node_modules/monaco-editor/min/vs/${dir}`;

      const dest = `${destDir}/${dir}`;

      await fs.ensureDir(dest);

      for (const file of files) {
        const filePath = `${dir}/${file.name}`;
        const filePathFull = `${_dir}/${file.name}`;

        if (file.isDirectory()) {
          await iter(
            filePath,
            await fs.readdir(filePathFull, {
              withFileTypes: true,
            })
          );
          continue;
        } else if (file.isFile() && filesToMinify.test(filePath)) {
          try {
            const data = await fs.readFile(filePathFull, 'utf-8');
            const { code } = minify(data);
            if (code) {
              await fs.writeFile(`${dest}/${file.name}`, code, 'utf-8');
              continue;
            }
          } catch (e) {
            console.error(`Error minifying ${filePath}:`, e);
          }
        }

        await fs.copy(filePathFull, `${dest}/${file.name}`);
      }
    }

    await iter(
      '.',
      await fs.readdir(`node_modules/monaco-editor/min/vs`, {
        withFileTypes: true,
      })
    );
  }

  if (browserSupportsSymlinks) {
    await fs.symlink(
      path.resolve(`${buildsCacheDir}/monaco`),
      `${buildDir}/public/vs`,
      'dir'
    );
  } else {
    await fs.copy(`${buildsCacheDir}/monaco`, `${buildDir}/public/vs`);
  }
});

// Copy RequireJS lib
await spinner('Copying RequireJS', () =>
  fs.copy('node_modules/requirejs/require.js', `${buildDir}/public/require.js`)
);

// ESBuild options
let opts = ['--bundle', '--minify', `--target=${esbuildTarget}`];
if (isDev) {
  // Disable prod-only features
  opts.push('--define:PRODUCTION=false');

  // Enable sourcemaps and watch in development
  opts.push('--sourcemap' /*, '--watch'*/);

  // Watch temporarily disabled due to multiple esbuild commands
} else {
  // Enable prod-only features
  opts.push('--define:PRODUCTION=true');
}

// Build TypeScript files into JavaScript
await spinner('Building TypeScript', async () => {
  await $`./node_modules/.bin/esbuild src/inject.ts ${[
    `--outdir=${buildDir}`,
    ...opts,
    '--global-name=xlReplit',
  ]}`;
  await $`./node_modules/.bin/esbuild src/{background,popup,content,index}.ts src/util/ot.ts --outdir=${buildDir} ${opts}`;
});

// If prod, bundle
if (!isDev) {
  await spinner('Bundling', async () => {
    await $`cd ${buildDir} && ${nodeModulesDir}/.bin/web-ext build -o`;

    const bundleFile = `${buildDir}/web-ext-artifacts/xl_replit-${manifest.version}.zip`;
    const bundleDest = `${buildDir}/../${browser}.zip`;

    try {
      await fs.remove(bundleDest);
      await fs.move(bundleFile, bundleDest);
    } catch {
      echo(`Failed to move bundle`);
    }

    await fs.remove(`${buildDir}/web-ext-artifacts`);
  });
}
