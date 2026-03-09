/**
 * Copy vendor files (libarchive WASM + worker, 7z-wasm) to dist/vendor/.
 * Resolves packages from wherever npm/bun installed them
 * (may be hoisted to root node_modules or in the tool's local node_modules).
 */
import { join } from 'node:path';
import { mkdirSync, copyFileSync } from 'node:fs';

const ROOT = process.cwd();

// ── libarchive.js ─────────────────────────────────────────────────────

const LIBARCHIVE_VENDOR_DIR = join(ROOT, 'dist/vendor/libarchive');

const libarchiveCandidates = [
    join(ROOT, 'tools/archive-manager/node_modules/libarchive.js/dist'),
    join(ROOT, 'node_modules/libarchive.js/dist'),
];

let libarchiveDist: string | null = null;
for (const candidate of libarchiveCandidates) {
    try {
        const f = Bun.file(join(candidate, 'worker-bundle.js'));
        if (await f.exists()) {
            libarchiveDist = candidate;
            break;
        }
    } catch {
        // try next
    }
}

if (!libarchiveDist) {
    console.error('ERROR: Could not find libarchive.js dist files. Tried:');
    libarchiveCandidates.forEach(c => console.error(`  - ${c}`));
    process.exit(1);
}

mkdirSync(LIBARCHIVE_VENDOR_DIR, { recursive: true });

for (const file of ['worker-bundle.js', 'libarchive.wasm']) {
    copyFileSync(join(libarchiveDist, file), join(LIBARCHIVE_VENDOR_DIR, file));
    console.log(`  Copied libarchive/${file}`);
}

console.log(`  libarchive vendor files copied from ${libarchiveDist}`);

// ── 7z-wasm ───────────────────────────────────────────────────────────

const SEVENZ_VENDOR_DIR = join(ROOT, 'dist/vendor/7z-wasm');

const sevenzCandidates = [
    join(ROOT, 'tools/archive-manager/node_modules/7z-wasm'),
    join(ROOT, 'node_modules/7z-wasm'),
    join(ROOT, 'node_modules/.bun/7z-wasm@1.2.0/node_modules/7z-wasm'),
];

let sevenzDir: string | null = null;
for (const candidate of sevenzCandidates) {
    try {
        const f = Bun.file(join(candidate, '7zz.es6.js'));
        if (await f.exists()) {
            sevenzDir = candidate;
            break;
        }
    } catch {
        // try next
    }
}

if (!sevenzDir) {
    console.error('ERROR: Could not find 7z-wasm files. Tried:');
    sevenzCandidates.forEach(c => console.error(`  - ${c}`));
    process.exit(1);
}

mkdirSync(SEVENZ_VENDOR_DIR, { recursive: true });

for (const file of ['7zz.es6.js', '7zz.wasm']) {
    copyFileSync(join(sevenzDir, file), join(SEVENZ_VENDOR_DIR, file));
    console.log(`  Copied 7z-wasm/${file}`);
}

console.log(`  7z-wasm vendor files copied from ${sevenzDir}`);
