/**
 * Text Encoder Tool E2E Tests
 * 
 * Tests for the text encoder tool including PWA installability.
 */
import { describe, test, expect } from 'bun:test';
import pkg from '../package.json';

describe('Text Encoder Tool E2E', () => {
    describe('Package Configuration', () => {
        test('package has correct name', () => {
            expect(pkg.name).toBe('@libreutils/tool-text-encoder');
        });

        test('package has version', () => {
            expect(pkg.version).toBeTruthy();
        });

        test('package has dependency on shared', () => {
            expect(pkg.dependencies).toHaveProperty('@libreutils/shared');
        });
    });

    describe('Tool Files', () => {
        test('standalone HTML exists', async () => {
            const file = Bun.file('./tools/text-encoder/src/index.html');
            expect(await file.exists()).toBe(true);
        });

        test('standalone HTML has PWA meta tags', async () => {
            const html = await Bun.file('./tools/text-encoder/src/index.html').text();
            expect(html).toContain('viewport');
            expect(html).toContain('apple-mobile-web-app-capable');
        });

        test('tool exports encode/decode functions', async () => {
            const { TextEncoderTool } = await import('../src/tool');
            expect(typeof TextEncoderTool.encode).toBe('function');
            expect(typeof TextEncoderTool.decode).toBe('function');
        });
    });

    describe('PWA Readiness', () => {
        test('tool has meta description', async () => {
            const html = await Bun.file('./tools/text-encoder/src/index.html').text();
            expect(html).toContain('meta');
            expect(html).toContain('description');
        });

        test('tool has proper title', async () => {
            const html = await Bun.file('./tools/text-encoder/src/index.html').text();
            expect(html).toContain('<title>');
            expect(html).toContain('LibreUtils');
        });
    });
});
