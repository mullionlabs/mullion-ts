import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  minify: false,
  external: [
    '@typescript-eslint/utils',
    '@mullion/core',
    'eslint',
    'typescript',
  ],
});
