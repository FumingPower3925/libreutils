import { describe, test, expect } from 'bun:test';

interface Manifest {
    name: string;
    short_name: string;
    version: string;
    description: string;
    start_url: string;
    display: string;
    background_color: string;
    theme_color: string;
    icons: { sizes: string }[];
    categories: string[];
}

async function loadManifest(): Promise<Manifest> {
    return await Bun.file('./public/manifest.json').json();
}

async function loadPkg(): Promise<{ version: string }> {
    return await Bun.file('./package.json').json();
}

describe('Web App E2E', () => {
    test('manifest version matches package.json version', async () => {
        const pkg = await loadPkg();
        const manifest = await loadManifest();
        expect(manifest.version).toBe(pkg.version);
    });

    describe('PWA Configuration', () => {
        test('manifest has required fields', async () => {
            const manifest = await loadManifest();
            expect(manifest.name).toBe('LibreUtils');
            expect(manifest.short_name).toBeTruthy();
            expect(manifest.description).toBeTruthy();
            expect(manifest.start_url).toBe('/');
            expect(manifest.display).toBe('standalone');
        });

        test('manifest has theme colors', async () => {
            const manifest = await loadManifest();
            expect(manifest.background_color).toBeTruthy();
            expect(manifest.theme_color).toBeTruthy();
        });

        test('manifest has icons configured', async () => {
            const manifest = await loadManifest();
            expect(manifest.icons).toBeDefined();
            expect(manifest.icons.length).toBeGreaterThan(0);

            const sizes = manifest.icons.map(icon => icon.sizes);
            expect(sizes).toContain('192x192');
            expect(sizes).toContain('512x512');
        });

        test('manifest has proper categories', async () => {
            const manifest = await loadManifest();
            expect(manifest.categories).toContain('utilities');
        });
    });

    describe('Service Worker', () => {
        test('service worker file exists', async () => {
            const swFile = Bun.file('./public/sw.js');
            expect(await swFile.exists()).toBe(true);
        });

        test('service worker has cache configuration', async () => {
            const swContent = await Bun.file('./public/sw.js').text();
            expect(swContent).toContain('CACHE_NAME');
            expect(swContent).toContain('install');
            expect(swContent).toContain('fetch');
        });
    });
});

describe('HTML Structure', () => {
    test('index.html exists and has required meta tags', async () => {
        const html = await Bun.file('./src/index.html').text();

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<meta charset="UTF-8">');
        expect(html).toContain('viewport');
        expect(html).toContain('manifest.json');
        expect(html).toContain('<title>');
    });

    test('app registers service worker', async () => {
        const ts = await Bun.file('./src/index.ts').text();
        expect(ts).toContain('serviceWorker');
    });
});
