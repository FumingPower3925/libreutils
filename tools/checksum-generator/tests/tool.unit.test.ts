
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

    it('should calculate SHA-512 correctly for text', async () => {
        const hash = await ChecksumTool.calculateText('hello world', 'SHA-512');
        // echo -n "hello world" | shasum -a 512
        expect(hash).toBe('309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f');
    });

    it('should stream file and calculate hash', async () => {
        // Mock File/Blob
        const content = new TextEncoder().encode('hello world');
        const file = new File([content], 'hello.txt', { type: 'text/plain' });

        const hash = await ChecksumTool.calculateFile(file, 'SHA-256');
        expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });

    it('should report progress during file streaming', async () => {
        const content = new Uint8Array(20 * 1024 * 1024); // 20MB
        content[0] = 1; content[content.length - 1] = 255;
        const file = new File([content], 'large.bin');

        let progressCalls = 0;
        const hash = await ChecksumTool.calculateFile(file, 'MD5', (p) => {
            progressCalls++;
            expect(p).toBeGreaterThanOrEqual(0);
            expect(p).toBeLessThanOrEqual(100);
        });

        expect(progressCalls).toBeGreaterThan(0);
        expect(hash).toBeTruthy();
    });
});
