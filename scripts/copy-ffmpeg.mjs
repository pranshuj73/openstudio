import { cpSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dest = join(root, 'public/ffmpeg');

mkdirSync(dest, { recursive: true });

// FFmpeg WASM core (single-threaded — avoids the 32-pthread-pool hang in Turbopack)
const coreSrc = join(root, 'node_modules/@ffmpeg/core/dist/esm');
cpSync(coreSrc, dest, { recursive: true });

// FFmpeg class worker (ESM) — served as a static file and referenced via
// classWorkerURL so Turbopack never bundles it (browser loads it natively).
// worker.js imports const.js and errors.js via relative paths, so copy all three.
const esmSrc = join(root, 'node_modules/@ffmpeg/ffmpeg/dist/esm');
cpSync(join(esmSrc, 'worker.js'), join(dest, 'worker.js'));
cpSync(join(esmSrc, 'const.js'), join(dest, 'const.js'));
cpSync(join(esmSrc, 'errors.js'), join(dest, 'errors.js'));

console.log('ffmpeg files copied to public/ffmpeg/');
