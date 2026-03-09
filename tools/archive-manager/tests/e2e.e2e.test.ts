import { describe, it, expect } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (!global.window) {
    GlobalRegistrator.register();
}

import { ArchiveManager } from "../src/tool";

// ── Helpers ────────────────────────────────────────────────────────────

function writeUint16LE(buf: Uint8Array, offset: number, val: number) {
    buf[offset] = val & 0xff;
    buf[offset + 1] = (val >> 8) & 0xff;
}

function writeUint32LE(buf: Uint8Array, offset: number, val: number) {
    buf[offset] = val & 0xff;
    buf[offset + 1] = (val >> 8) & 0xff;
    buf[offset + 2] = (val >> 16) & 0xff;
    buf[offset + 3] = (val >> 24) & 0xff;
}

function buildStoredZip(fileName: string, content: Uint8Array): Uint8Array {
    const enc = new TextEncoder();
    const nameBytes = enc.encode(fileName);
    const nameLen = nameBytes.length;
    const dataLen = content.length;

    const localHeaderSize = 30 + nameLen;
    const centralEntrySize = 46 + nameLen;
    const eocdSize = 22;
    const totalSize = localHeaderSize + dataLen + centralEntrySize + eocdSize;
    const buf = new Uint8Array(totalSize);

    let offset = 0;

    // Local file header
    writeUint32LE(buf, offset, 0x04034b50); offset += 4;
    writeUint16LE(buf, offset, 20);         offset += 2;
    writeUint16LE(buf, offset, 0);          offset += 2;
    writeUint16LE(buf, offset, 0);          offset += 2; // stored
    writeUint16LE(buf, offset, 0);          offset += 2;
    writeUint16LE(buf, offset, 0);          offset += 2;
    writeUint32LE(buf, offset, 0);          offset += 4;
    writeUint32LE(buf, offset, dataLen);    offset += 4;
    writeUint32LE(buf, offset, dataLen);    offset += 4;
    writeUint16LE(buf, offset, nameLen);    offset += 2;
    writeUint16LE(buf, offset, 0);          offset += 2;
    buf.set(nameBytes, offset);             offset += nameLen;
    buf.set(content, offset);               offset += dataLen;

    const centralDirStart = offset;

    // Central directory entry
    writeUint32LE(buf, offset, 0x02014b50); offset += 4;
    writeUint16LE(buf, offset, 20);         offset += 2;
    writeUint16LE(buf, offset, 20);         offset += 2;
    writeUint16LE(buf, offset, 0);          offset += 2;
    writeUint16LE(buf, offset, 0);          offset += 2; // stored
    writeUint16LE(buf, offset, 0);          offset += 2;
    writeUint16LE(buf, offset, 0);          offset += 2;
    writeUint32LE(buf, offset, 0);          offset += 4;
    writeUint32LE(buf, offset, dataLen);    offset += 4;
    writeUint32LE(buf, offset, dataLen);    offset += 4;
    writeUint16LE(buf, offset, nameLen);    offset += 2;
    writeUint16LE(buf, offset, 0);          offset += 2;
    writeUint16LE(buf, offset, 0);          offset += 2;
    writeUint16LE(buf, offset, 0);          offset += 2;
    writeUint16LE(buf, offset, 0);          offset += 2;
    writeUint32LE(buf, offset, 0);          offset += 4;
    writeUint32LE(buf, offset, 0);          offset += 4;
    buf.set(nameBytes, offset);             offset += nameLen;

    const centralDirSize = offset - centralDirStart;

    // EOCD
    writeUint32LE(buf, offset, 0x06054b50); offset += 4;
    writeUint16LE(buf, offset, 0);          offset += 2;
    writeUint16LE(buf, offset, 0);          offset += 2;
    writeUint16LE(buf, offset, 1);          offset += 2;
    writeUint16LE(buf, offset, 1);          offset += 2;
    writeUint32LE(buf, offset, centralDirSize); offset += 4;
    writeUint32LE(buf, offset, centralDirStart); offset += 4;
    writeUint16LE(buf, offset, 0);          offset += 2;

    return buf;
}

function buildTar(fileName: string, content: Uint8Array): Uint8Array {
    const enc = new TextEncoder();
    const dataLen = content.length;
    const dataPadded = Math.ceil(dataLen / 512) * 512;
    const totalSize = 512 + dataPadded + 1024;
    const buf = new Uint8Array(totalSize);

    const nameBytes = enc.encode(fileName);
    buf.set(nameBytes.subarray(0, Math.min(nameBytes.length, 100)), 0);

    buf.set(enc.encode('0000644\0'), 100);
    buf.set(enc.encode('0000000\0'), 108);
    buf.set(enc.encode('0000000\0'), 116);
    buf.set(enc.encode(dataLen.toString(8).padStart(11, '0') + '\0'), 124);
    buf.set(enc.encode('00000000000\0'), 136);
    buf[156] = 48; // '0'
    buf.set(enc.encode('ustar\0'), 257);
    buf[263] = 48;
    buf[264] = 48;

    // Checksum
    for (let i = 148; i < 156; i++) buf[i] = 32;
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += buf[i];
    buf.set(enc.encode(checksum.toString(8).padStart(6, '0') + '\0 '), 148);

    buf.set(content, 512);
    return buf;
}

// ── E2E Tests ──────────────────────────────────────────────────────────

describe('Archive Manager E2E', () => {
    describe('ZIP workflow', () => {
        it('should detect, list, and extract a ZIP file end-to-end', async () => {
            const content = new TextEncoder().encode('E2E test content for ZIP');
            const zipData = buildStoredZip('e2e-test.txt', content);
            const file = new File([zipData as BlobPart], 'test.zip', { type: 'application/zip' });

            // Step 1: detect format
            const format = ArchiveManager.detectFormat(file);
            expect(format).toBe('zip');

            // Step 2: list entries
            const entries = await ArchiveManager.listEntries(file);
            expect(entries.length).toBe(1);
            expect(entries[0].name).toBe('e2e-test.txt');
            expect(entries[0].size).toBe(content.length);
            expect(entries[0].isDirectory).toBe(false);

            // Step 3: extract single file
            const extracted = await ArchiveManager.extractFile(file, 'e2e-test.txt');
            expect(extracted.name).toBe('e2e-test.txt');
            expect(extracted.size).toBe(content.length);
            expect(new TextDecoder().decode(extracted.data)).toBe('E2E test content for ZIP');

            // Step 4: extract all
            const all = await ArchiveManager.extractAll(file);
            expect(all.length).toBe(1);
            expect(new TextDecoder().decode(all[0].data)).toBe('E2E test content for ZIP');
        });
    });

    describe('TAR workflow', () => {
        it('should detect, list, and extract a TAR file end-to-end', async () => {
            const content = new TextEncoder().encode('E2E test content for TAR');
            const tarData = buildTar('e2e-tar.txt', content);
            const file = new File([tarData as BlobPart], 'test.tar');

            // Step 1: detect format
            const format = ArchiveManager.detectFormat(file);
            expect(format).toBe('tar');

            // Step 2: list entries
            const entries = await ArchiveManager.listEntries(file);
            expect(entries.length).toBe(1);
            expect(entries[0].name).toBe('e2e-tar.txt');
            expect(entries[0].size).toBe(content.length);

            // Step 3: extract single file
            const extracted = await ArchiveManager.extractFile(file, 'e2e-tar.txt');
            expect(new TextDecoder().decode(extracted.data)).toBe('E2E test content for TAR');

            // Step 4: extract all
            const all = await ArchiveManager.extractAll(file);
            expect(all.length).toBe(1);
            expect(all[0].name).toBe('e2e-tar.txt');
        });
    });

    describe('Format detection from bytes', () => {
        it('should detect ZIP from byte content regardless of extension', () => {
            const zipMagic = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
            expect(ArchiveManager.detectFormatFromBytes(zipMagic)).toBe('zip');
        });

        it('should detect GZ from byte content regardless of extension', () => {
            const gzMagic = new Uint8Array([0x1f, 0x8b, 0x08, 0, 0, 0, 0, 0]);
            expect(ArchiveManager.detectFormatFromBytes(gzMagic)).toBe('gz');
        });
    });
});
