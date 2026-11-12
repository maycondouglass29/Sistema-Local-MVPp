import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';

console.log('[Build] Compilando processos Electron e Backend...');

// Ensure output directories
if (!fs.existsSync('electron/dist')) {
  fs.mkdirSync('electron/dist', { recursive: true });
}

await esbuild.build({
  entryPoints: ['electron/main.ts'],
  outfile: 'electron/main.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron', 'bun:sqlite', 'node:sqlite'],
  sourcemap: true,
});

await esbuild.build({
  entryPoints: ['electron/preload.ts'],
  outfile: 'electron/preload.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
  sourcemap: true,
});

console.log('[Build] Electron compilado com sucesso!');
