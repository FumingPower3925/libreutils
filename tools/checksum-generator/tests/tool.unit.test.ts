
import { describe, it, expect, beforeAll } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (!global.window) {
    GlobalRegistrator.register();
}

import { ChecksumTool } from "../src/tool";

describe('ChecksumTool', () => {
    it('should calculate MD5 correctly for text', async () => {
        const hash = await ChecksumTool.calculateText('hello world', 'MD5');
        // echo -n "hello world" | md5
        expect(hash).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3');
    });

    it('should calculate SHA-1 correctly for text', async () => {
        const hash = await ChecksumTool.calculateText('hello world', 'SHA-1');
        // echo -n "hello world" | shasum -a 1
        expect(hash).toBe('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed');
    });

    it('should calculate SHA-256 correctly for text', async () => {
        const hash = await ChecksumTool.calculateText('hello world', 'SHA-256');
        // echo -n "hello world" | shasum -a 256
        expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });

    it('should calculate BLAKE2b correctly for text', async () => {
        const hash = await ChecksumTool.calculateText('hello world', 'BLAKE2b');
        // Verified via other tools or trusted source for "hello world" blake2b-512
        // Noble defaults to 512 bits (64 bytes)
        expect(hash).toHaveLength(128); // 64 bytes hex
        expect(hash).toBe('021ced8799296ceca557832ab941a50b4a11f83478cf141f51f933f653ab9fbcc05a037cddbed06e309bf334942c4e58cdf1a46e237911ccd7fcf9787cbc7fd0');
    });

    it('should stream file and calculate hash', async () => {
        // Mock File/Blob
        const content = new TextEncoder().encode('hello world');
        const file = new File([content], 'hello.txt', { type: 'text/plain' });

        const hash = await ChecksumTool.calculateFile(file, 'SHA-256');
        expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });

    it('should report progress during file streaming', async () => {
        // Create larger content to force chunks if possible, or Mock FileReader behavior
        // Since we can't easily force FileReader async behavior in Bun test environment without strict mocks,
        // we relied on the standard implementation.
        // We will just verify it calls back.

        const content = new Uint8Array(20 * 1024 * 1024); // 20MB
        // Fill with some data
        content[0] = 1; content[content.length - 1] = 255;

        const file = new File([content], 'large.bin');

        let progressCalls = 0;
        const hash = await ChecksumTool.calculateFile(file, 'MD5', (p) => {
            progressCalls++;
            expect(p).toBeGreaterThanOrEqual(0);
            expect(p).toBeLessThanOrEqual(100);
        });

        expect(progressCalls).toBeGreaterThan(0);
        // MD5 of 20MB zeros (mostly)
        // calculated locally or just expect string
        expect(hash).toBeTruthy();
    });
});
