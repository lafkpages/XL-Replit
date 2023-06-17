import esbuild from 'rollup-plugin-esbuild';
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

import { readFileSync } from 'fs';
let browser = null;
try {
  readFileSync('dist/.tmp/browser.txt', 'ascii');
} catch {}

const options = {
  plugins: [
    commonjs(),
    nodeResolve(),
    esbuild({
      sourceMap: true, // default
      minify: true,
      target: 'es6',
      // Like @rollup/plugin-replace
      define: {
        __VERSION__: '"x.y.z"',
      },
      tsconfig: 'tsconfig.json', // default
      // Add extra loaders
      loaders: {
        // Add .json files support
        // require @rollup/plugin-commonjs
        '.json': 'json',
        // Enable JSX in .js files too
        '.js': 'jsx',
      },
    }),
    typescript(),
  ],
  output: {
    format: 'iife',
    name: 'xlReplit',
    globals: {
      '@replit/protocol': 'protocol',
    },
  },
};

if (browser) {
  options.dir = `dist/${browser}`;
}

export default options;
