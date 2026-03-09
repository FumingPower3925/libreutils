/**
 * Development Server — serves a production-quality build with code splitting,
 * minification, and gzip compression.
 */

import { join } from 'node:path';

const PORT = parseInt(process.env.PORT || '3000', 10);
const ROOT = process.cwd();

// ── Build step (splitting + minify) ─────────────────────────────────

let buildArtifacts: Map<string, { contents: Uint8Array; type: string }> = new Map();
let buildReady = false;

async function runBuild() {
    console.log('  Building...');
    const t0 = performance.now();

    const result = await Bun.build({
        entrypoints: [join(ROOT, 'src/index.ts')],
        outdir: join(ROOT, '.dev-dist'),
        target: 'browser',
        minify: true,
        splitting: true,
        format: 'esm',
        sourcemap: 'external',
        external: ['7z-wasm'],
    });

    if (!result.success) {
        console.error('Build failed:', result.logs);
        return;
    }

    buildArtifacts.clear();
    for (const output of result.outputs) {
        // output.path is absolute — derive the URL path from it
        const relativePath = output.path.replace(join(ROOT, '.dev-dist'), '');
        const urlPath = '/' + relativePath.replace(/^\//, '');
        const type = urlPath.endsWith('.js')
            ? 'application/javascript'
            : urlPath.endsWith('.css')
              ? 'text/css'
              : 'application/octet-stream';
        buildArtifacts.set(urlPath, {
            contents: new Uint8Array(await output.arrayBuffer()),
            type,
        });
    }

    buildReady = true;
    console.log(`  Built ${result.outputs.length} files in ${(performance.now() - t0).toFixed(0)}ms`);
}

// ── CSS concatenation ───────────────────────────────────────────────

async function buildCSS(): Promise<string> {
    const cssFiles = [
        join(ROOT, 'shared/src/styles/variables.css'),
        join(ROOT, 'shared/src/styles/base.css'),
        join(ROOT, 'shared/src/styles/components.css'),
    ];
    let css = '';
    for (const path of cssFiles) {
        const f = Bun.file(path);
        if (await f.exists()) css += await f.text() + '\n';
    }
    // Minify: strip comments, collapse whitespace
    css = css
        .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
        .replace(/\s*([{}:;,])\s*/g, '$1')   // whitespace around punctuation
        .replace(/;\}/g, '}')                // trailing semicolons
        .replace(/\n+/g, '')                 // newlines
        .trim();
    return css;
}

// ── HTML with dev transforms ────────────────────────────────────────

async function buildHTML(): Promise<string> {
    const f = Bun.file(join(ROOT, 'src/index.html'));
    let html = await f.text();
    // In dev mode, Bun produces index.js as the entry
    return html;
}

// ── Gzip compression helper ─────────────────────────────────────────

const COMPRESSIBLE = new Set([
    'text/html', 'text/css', 'application/javascript', 'application/json',
    'image/svg+xml', 'text/plain',
]);

function shouldCompress(contentType: string): boolean {
    return COMPRESSIBLE.has(contentType.split(';')[0]);
}

function compressResponse(body: Uint8Array | string, headers: Record<string, string>, req: Request): Response {
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    const ct = headers['Content-Type'] || '';
    if (shouldCompress(ct.split(';')[0]) && acceptEncoding.includes('gzip')) {
        const data = typeof body === 'string' ? new TextEncoder().encode(body) : body;
        const compressed = Bun.gzipSync(data);
        return new Response(compressed, {
            headers: { ...headers, 'Content-Encoding': 'gzip', 'Vary': 'Accept-Encoding' },
        });
    }
    return new Response(body, { headers });
}

// ── Server ──────────────────────────────────────────────────────────

console.log('Starting LibreUtils development server...');
console.log(`  Local: http://localhost:${PORT}`);

await runBuild();

const server = Bun.serve({
    port: PORT,
    async fetch(req: Request) {
        const url = new URL(req.url);
        let pathname = url.pathname;

        // SPA: routes without extension serve index.html
        if (pathname === '/' || !pathname.includes('.')) {
            pathname = '/index.html';
        }

        // Serve built JS/CSS chunks
        if (buildReady && buildArtifacts.has(pathname)) {
            const artifact = buildArtifacts.get(pathname)!;
            return compressResponse(artifact.contents, {
                'Content-Type': artifact.type,
                'Cache-Control': 'no-cache',
            }, req);
        }

        // /index.html
        if (pathname === '/index.html') {
            const html = await buildHTML();
            return compressResponse(html, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache',
            }, req);
        }

        // /styles.css
        if (pathname === '/styles.css') {
            const css = await buildCSS();
            return compressResponse(css, {
                'Content-Type': 'text/css',
                'Cache-Control': 'no-cache',
            }, req);
        }

        // Vendor files (libarchive WASM + worker)
        if (pathname.startsWith('/vendor/libarchive/')) {
            const vendorFile = Bun.file(
                join(ROOT, 'tools/archive-manager/node_modules/libarchive.js/dist', pathname.replace('/vendor/libarchive/', '')),
            );
            if (await vendorFile.exists()) {
                const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
                if (pathname.endsWith('.wasm')) headers['Content-Type'] = 'application/wasm';
                else if (pathname.endsWith('.js')) headers['Content-Type'] = 'application/javascript';
                return new Response(vendorFile, { headers });
            }
        }

        // Vendor files (7z-wasm)
        if (pathname.startsWith('/vendor/7z-wasm/')) {
            const vendorFile = Bun.file(
                join(ROOT, 'tools/archive-manager/node_modules/7z-wasm', pathname.replace('/vendor/7z-wasm/', '')),
            );
            if (await vendorFile.exists()) {
                const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
                if (pathname.endsWith('.wasm')) headers['Content-Type'] = 'application/wasm';
                else if (pathname.endsWith('.js')) headers['Content-Type'] = 'application/javascript';
                return new Response(vendorFile, { headers });
            }
        }

        // Public static assets (sw.js, manifest.json, favicon, etc.)
        const publicFile = Bun.file(join(ROOT, 'public', pathname));
        if (await publicFile.exists()) {
            return new Response(publicFile, { headers: { 'Cache-Control': 'no-cache' } });
        }

        // Source files (for sourcemap references, etc.)
        const srcFile = Bun.file(join(ROOT, 'src', pathname));
        if (await srcFile.exists()) {
            return new Response(srcFile, { headers: { 'Cache-Control': 'no-cache' } });
        }

        return new Response('Not Found', { status: 404 });
    },
});

console.log(`Server running at http://localhost:${server.port}`);

// ── File watcher for automatic rebuild ──────────────────────────────

import { watch } from 'node:fs';

const WATCH_DIRS = ['src', 'tools', 'shared/src'];
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

for (const dir of WATCH_DIRS) {
    try {
        watch(join(ROOT, dir), { recursive: true }, (_event, filename) => {
            if (!filename || filename.endsWith('.test.ts')) return;
            if (rebuildTimer) clearTimeout(rebuildTimer);
            rebuildTimer = setTimeout(async () => {
                console.log(`\n  File changed: ${dir}/${filename}`);
                await runBuild();
            }, 200);
        });
    } catch {
        // Directory might not exist
    }
}

export {};
