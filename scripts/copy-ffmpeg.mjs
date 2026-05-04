import { cpSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'node_modules/@ffmpeg/core-mt/dist/esm');
const dest = join(root, 'public/ffmpeg');

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('ffmpeg wasm files copied to public/ffmpeg/');
