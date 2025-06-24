import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vite';

import cliBase from '../build-config/templates/vite/cli.vite.config.ts';
import libBase from '../build-config/templates/vite/lib.vite.config.ts';

import pkg from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default mergeConfig(
  mergeConfig(cliBase, libBase),
  defineConfig({
    build: {
      lib: {
        entry: {
          'lib/lib': resolve(__dirname, pkg.module),
          'bin/syntax-codegen': resolve(__dirname, './bin/syntax-codegen'),
        },
        name: pkg.name,
        formats: ['es'],
      },
      rollupOptions: {
        external: Object.keys(pkg.dependencies),
      },
    },
  }),
);
