import { describe, it, expect } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (!global.window) {
    GlobalRegistrator.register();
}

import { ArchiveManager } from "../src/tool";
import type { ArchiveFormat, InputFile } from "../src/tool";

// ── Helpers to build minimal archive buffers ───────────────────────────

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

/**
 * Build a minimal valid ZIP containing one stored (uncompressed) file.
 */
function buildMinimalZip(fileName: string, content: Uint8Array): Uint8Array {
    const enc = new TextEncoder();
    const nameBytes = enc.encode(fileName);
    const nameLen = nameBytes.length;
    const dataLen = content.length;

    // Local file header: 30 + nameLen
    const localHeaderSize = 30 + nameLen;
    // Central directory entry: 46 + nameLen
    const centralEntrySize = 46 + nameLen;
    // EOCD: 22
    const eocdSize = 22;
    const totalSize = localHeaderSize + dataLen + centralEntrySize + eocdSize;
    const buf = new Uint8Array(totalSize);

    let offset = 0;

    // ── Local file header ──
    writeUint32LE(buf, offset, 0x04034b50); offset += 4;  // signature
    writeUint16LE(buf, offset, 20);         offset += 2;  // version needed
    writeUint16LE(buf, offset, 0);          offset += 2;  // flags
    writeUint16LE(buf, offset, 0);          offset += 2;  // compression: stored
    writeUint16LE(buf, offset, 0);          offset += 2;  // mod time
    writeUint16LE(buf, offset, 0);          offset += 2;  // mod date
    writeUint32LE(buf, offset, 0);          offset += 4;  // crc32 (ignored for this test)
    writeUint32LE(buf, offset, dataLen);    offset += 4;  // compressed size
    writeUint32LE(buf, offset, dataLen);    offset += 4;  // uncompressed size
    writeUint16LE(buf, offset, nameLen);    offset += 2;  // file name length
    writeUint16LE(buf, offset, 0);          offset += 2;  // extra field length
    buf.set(nameBytes, offset);             offset += nameLen;
    buf.set(content, offset);               offset += dataLen;

    const centralDirStart = offset;

    // ── Central directory entry ──
    writeUint32LE(buf, offset, 0x02014b50); offset += 4;  // signature
    writeUint16LE(buf, offset, 20);         offset += 2;  // version made by
    writeUint16LE(buf, offset, 20);         offset += 2;  // version needed
    writeUint16LE(buf, offset, 0);          offset += 2;  // flags
    writeUint16LE(buf, offset, 0);          offset += 2;  // compression: stored
    writeUint16LE(buf, offset, 0);          offset += 2;  // mod time
    writeUint16LE(buf, offset, 0);          offset += 2;  // mod date
    writeUint32LE(buf, offset, 0);          offset += 4;  // crc32
    writeUint32LE(buf, offset, dataLen);    offset += 4;  // compressed size
    writeUint32LE(buf, offset, dataLen);    offset += 4;  // uncompressed size
    writeUint16LE(buf, offset, nameLen);    offset += 2;  // file name length
    writeUint16LE(buf, offset, 0);          offset += 2;  // extra field length
    writeUint16LE(buf, offset, 0);          offset += 2;  // comment length
    writeUint16LE(buf, offset, 0);          offset += 2;  // disk number start
    writeUint16LE(buf, offset, 0);          offset += 2;  // internal attributes
    writeUint32LE(buf, offset, 0);          offset += 4;  // external attributes
    writeUint32LE(buf, offset, 0);          offset += 4;  // local header offset
    buf.set(nameBytes, offset);             offset += nameLen;

    const centralDirSize = offset - centralDirStart;

    // ── End of Central Directory ──
    writeUint32LE(buf, offset, 0x06054b50); offset += 4;  // signature
    writeUint16LE(buf, offset, 0);          offset += 2;  // disk number
    writeUint16LE(buf, offset, 0);          offset += 2;  // disk with central dir
    writeUint16LE(buf, offset, 1);          offset += 2;  // entries on disk
    writeUint16LE(buf, offset, 1);          offset += 2;  // total entries
    writeUint32LE(buf, offset, centralDirSize); offset += 4; // central dir size
    writeUint32LE(buf, offset, centralDirStart); offset += 4; // central dir offset
    writeUint16LE(buf, offset, 0);          offset += 2;  // comment length

    return buf;
}

/**
 * Build a minimal TAR archive containing one file.
 */
function buildMinimalTar(fileName: string, content: Uint8Array): Uint8Array {
    const enc = new TextEncoder();
    const dataLen = content.length;
    const dataPadded = Math.ceil(dataLen / 512) * 512;
    // header(512) + data(padded) + 2 end-of-archive blocks(1024)
    const totalSize = 512 + dataPadded + 1024;
    const buf = new Uint8Array(totalSize);

    // ── TAR header ──
    // Name (0-99)
    const nameBytes = enc.encode(fileName);
    buf.set(nameBytes.subarray(0, Math.min(nameBytes.length, 100)), 0);

    // File mode (100-107): "0000644\0"
    const modeStr = enc.encode('0000644\0');
    buf.set(modeStr, 100);

    // Owner ID (108-115): "0000000\0"
    const uidStr = enc.encode('0000000\0');
    buf.set(uidStr, 108);

    // Group ID (116-123): "0000000\0"
    buf.set(uidStr, 116);

    // File size octal (124-135)
    const sizeStr = enc.encode(dataLen.toString(8).padStart(11, '0') + '\0');
    buf.set(sizeStr, 124);

    // Modification time (136-147): "00000000000\0"
    const mtimeStr = enc.encode('00000000000\0');
    buf.set(mtimeStr, 136);

    // Type flag (156): '0' for regular file
    buf[156] = 48; // '0'

    // UStar magic (257-262): "ustar\0"
    const ustarMagic = enc.encode('ustar\0');
    buf.set(ustarMagic, 257);

    // UStar version (263-264): "00"
    buf[263] = 48; // '0'
    buf[264] = 48; // '0'

    // Compute header checksum
    // Initialize checksum field (148-155) with spaces
    for (let i = 148; i < 156; i++) buf[i] = 32; // space

    let checksum = 0;
    for (let i = 0; i < 512; i++) {
        checksum += buf[i];
    }
    const checksumStr = enc.encode(checksum.toString(8).padStart(6, '0') + '\0 ');
    buf.set(checksumStr, 148);

    // ── File data ──
    buf.set(content, 512);

    // Remaining bytes are already zero (end-of-archive markers)
    return buf;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('ArchiveManager.detectFormat', () => {
    it('should detect ZIP by extension', () => {
        const file = new File([], 'test.zip');
        expect(ArchiveManager.detectFormat(file)).toBe('zip' as ArchiveFormat);
    });

    it('should detect TAR by extension', () => {
        const file = new File([], 'test.tar');
        expect(ArchiveManager.detectFormat(file)).toBe('tar' as ArchiveFormat);
    });

    it('should detect GZ by extension', () => {
        const file = new File([], 'test.gz');
        expect(ArchiveManager.detectFormat(file)).toBe('gz' as ArchiveFormat);
    });

    it('should detect TAR.GZ by extension', () => {
        const file = new File([], 'test.tar.gz');
        expect(ArchiveManager.detectFormat(file)).toBe('tar.gz' as ArchiveFormat);
    });

    it('should detect TGZ by extension', () => {
        const file = new File([], 'test.tgz');
        expect(ArchiveManager.detectFormat(file)).toBe('tar.gz' as ArchiveFormat);
    });

    it('should return unknown for unsupported extensions', () => {
        const file = new File([], 'test.txt');
        expect(ArchiveManager.detectFormat(file)).toBe('unknown' as ArchiveFormat);
    });
});

describe('ArchiveManager.detectFormatFromBytes', () => {
    it('should detect ZIP from magic bytes PK\\x03\\x04', () => {
        const data = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
        expect(ArchiveManager.detectFormatFromBytes(data)).toBe('zip' as ArchiveFormat);
    });

    it('should detect GZ from magic bytes \\x1f\\x8b', () => {
        const data = new Uint8Array([0x1f, 0x8b, 0x08, 0, 0, 0, 0, 0]);
        expect(ArchiveManager.detectFormatFromBytes(data)).toBe('gz' as ArchiveFormat);
    });

    it('should detect TAR by ustar magic', () => {
        const data = new Uint8Array(512);
        data[0] = 104; // 'h' - some filename
        const enc = new TextEncoder();
        const ustar = enc.encode('ustar');
        data.set(ustar, 257);
        expect(ArchiveManager.detectFormatFromBytes(data)).toBe('tar' as ArchiveFormat);
    });

    it('should return unknown for unrecognized data', () => {
        const data = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
        expect(ArchiveManager.detectFormatFromBytes(data)).toBe('unknown' as ArchiveFormat);
    });
});

describe('ArchiveManager ZIP parsing', () => {
    it('should list entries from a minimal stored ZIP', async () => {
        const content = new TextEncoder().encode('Hello, World!');
        const zipData = buildMinimalZip('hello.txt', content);
        const file = new File([zipData as BlobPart], 'test.zip');

        const entries = await ArchiveManager.listEntries(file);
        expect(entries.length).toBe(1);
        expect(entries[0].name).toBe('hello.txt');
        expect(entries[0].size).toBe(13);
        expect(entries[0].isDirectory).toBe(false);
    });

    it('should extract a stored ZIP entry', async () => {
        const content = new TextEncoder().encode('Hello, World!');
        const zipData = buildMinimalZip('hello.txt', content);
        const file = new File([zipData as BlobPart], 'test.zip');

        const extracted = await ArchiveManager.extractFile(file, 'hello.txt');
        expect(extracted.name).toBe('hello.txt');
        expect(extracted.size).toBe(13);
        expect(new TextDecoder().decode(extracted.data)).toBe('Hello, World!');
    });

    it('should extract all from a stored ZIP', async () => {
        const content = new TextEncoder().encode('Hello!');
        const zipData = buildMinimalZip('greet.txt', content);
        const file = new File([zipData as BlobPart], 'test.zip');

        const files = await ArchiveManager.extractAll(file);
        expect(files.length).toBe(1);
        expect(files[0].name).toBe('greet.txt');
        expect(new TextDecoder().decode(files[0].data)).toBe('Hello!');
    });
});

describe('ArchiveManager TAR parsing', () => {
    it('should list entries from a minimal TAR', async () => {
        const content = new TextEncoder().encode('TAR content');
        const tarData = buildMinimalTar('readme.txt', content);
        const file = new File([tarData as BlobPart], 'test.tar');

        const entries = await ArchiveManager.listEntries(file);
        expect(entries.length).toBe(1);
        expect(entries[0].name).toBe('readme.txt');
        expect(entries[0].size).toBe(11);
        expect(entries[0].isDirectory).toBe(false);
    });

    it('should extract a file from TAR', async () => {
        const content = new TextEncoder().encode('TAR content');
        const tarData = buildMinimalTar('readme.txt', content);
        const file = new File([tarData as BlobPart], 'test.tar');

        const extracted = await ArchiveManager.extractFile(file, 'readme.txt');
        expect(extracted.name).toBe('readme.txt');
        expect(new TextDecoder().decode(extracted.data)).toBe('TAR content');
    });

    it('should extract all from TAR', async () => {
        const content = new TextEncoder().encode('Data');
        const tarData = buildMinimalTar('data.bin', content);
        const file = new File([tarData as BlobPart], 'test.tar');

        const files = await ArchiveManager.extractAll(file);
        expect(files.length).toBe(1);
        expect(files[0].name).toBe('data.bin');
        expect(files[0].size).toBe(4);
    });
});

describe('ArchiveManager error handling', () => {
    it('should throw for corrupt ZIP data', async () => {
        const data = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
        const file = new File([data as BlobPart], 'corrupt.zip');

        await expect(ArchiveManager.listEntries(file)).rejects.toThrow();
    });

    it('should throw for unsupported format', async () => {
        const data = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
        const file = new File([data as BlobPart], 'unknown.xyz');

        await expect(ArchiveManager.listEntries(file)).rejects.toThrow('Unsupported');
    });

    it('should throw when extracting non-existent entry from ZIP', async () => {
        const content = new TextEncoder().encode('test');
        const zipData = buildMinimalZip('existing.txt', content);
        const file = new File([zipData as BlobPart], 'test.zip');

        await expect(
            ArchiveManager.extractFile(file, 'missing.txt')
        ).rejects.toThrow('Entry not found');
    });
});

// ── Archive creation tests ─────────────────────────────────────────────

describe('ArchiveManager.createArchive ZIP', () => {
    it('should create a valid ZIP with two files', async () => {
        const enc = new TextEncoder();
        const files: InputFile[] = [
            { name: 'hello.txt', data: enc.encode('Hello, World!') },
            { name: 'readme.md', data: enc.encode('# Readme') },
        ];

        const blob = await ArchiveManager.createArchive(files, { format: 'zip' });
        expect(blob.size).toBeGreaterThan(0);
        expect(blob.type).toBe('application/zip');

        // Verify ZIP magic bytes (PK\x03\x04)
        const data = new Uint8Array(await blob.arrayBuffer());
        expect(data[0]).toBe(0x50);
        expect(data[1]).toBe(0x4b);
        expect(data[2]).toBe(0x03);
        expect(data[3]).toBe(0x04);
    });

    it('should create a ZIP that can be extracted back', async () => {
        const enc = new TextEncoder();
        const dec = new TextDecoder();
        const files: InputFile[] = [
            { name: 'file1.txt', data: enc.encode('Content One') },
            { name: 'folder/file2.txt', data: enc.encode('Content Two') },
        ];

        // Use level 0 (store) so extraction works without DecompressionStream in test env
        const blob = await ArchiveManager.createArchive(files, { format: 'zip', compressionLevel: 0 });
        const zipFile = new File([blob], 'created.zip');

        // List entries
        const entries = await ArchiveManager.listEntries(zipFile);
        expect(entries.length).toBe(2);
        const names = entries.map(e => e.name).sort();
        expect(names).toEqual(['file1.txt', 'folder/file2.txt']);

        // Extract all and verify contents
        const extracted = await ArchiveManager.extractAll(zipFile);
        expect(extracted.length).toBe(2);

        const byName: Record<string, string> = {};
        for (const f of extracted) {
            byName[f.name] = dec.decode(f.data);
        }
        expect(byName['file1.txt']).toBe('Content One');
        expect(byName['folder/file2.txt']).toBe('Content Two');
    });

    it('should respect compression level 0 (store)', async () => {
        const enc = new TextEncoder();
        const files: InputFile[] = [
            { name: 'data.txt', data: enc.encode('Some data') },
        ];

        const blob = await ArchiveManager.createArchive(files, { format: 'zip', compressionLevel: 0 });
        expect(blob.size).toBeGreaterThan(0);

        // Should round-trip
        const zipFile = new File([blob], 'stored.zip');
        const extracted = await ArchiveManager.extractAll(zipFile);
        expect(extracted.length).toBe(1);
        expect(new TextDecoder().decode(extracted[0].data)).toBe('Some data');
    });
});

describe('ArchiveManager.createArchive TAR', () => {
    it('should create a valid TAR with two files', async () => {
        const enc = new TextEncoder();
        const files: InputFile[] = [
            { name: 'a.txt', data: enc.encode('AAA') },
            { name: 'b.txt', data: enc.encode('BBB') },
        ];

        const blob = await ArchiveManager.createArchive(files, { format: 'tar' });
        expect(blob.size).toBeGreaterThan(0);
        expect(blob.type).toBe('application/x-tar');

        // Verify it's valid TAR by extracting
        const tarFile = new File([blob], 'created.tar');
        const entries = await ArchiveManager.listEntries(tarFile);
        expect(entries.length).toBe(2);
        expect(entries[0].name).toBe('a.txt');
        expect(entries[1].name).toBe('b.txt');
    });

    it('should create a TAR that round-trips correctly', async () => {
        const enc = new TextEncoder();
        const dec = new TextDecoder();
        const files: InputFile[] = [
            { name: 'msg.txt', data: enc.encode('Hello TAR') },
        ];

        const blob = await ArchiveManager.createArchive(files, { format: 'tar' });
        const tarFile = new File([blob], 'test.tar');

        const extracted = await ArchiveManager.extractAll(tarFile);
        expect(extracted.length).toBe(1);
        expect(extracted[0].name).toBe('msg.txt');
        expect(dec.decode(extracted[0].data)).toBe('Hello TAR');
    });
});

describe('ArchiveManager.createArchive TAR.GZ', () => {
    it('should create a valid TAR.GZ with gzip magic bytes', async () => {
        const enc = new TextEncoder();
        const files: InputFile[] = [
            { name: 'compressed.txt', data: enc.encode('Compressed content here') },
        ];

        const blob = await ArchiveManager.createArchive(files, { format: 'tar.gz' });
        expect(blob.size).toBeGreaterThan(0);
        expect(blob.type).toBe('application/gzip');

        // Verify GZ magic bytes
        const data = new Uint8Array(await blob.arrayBuffer());
        expect(data[0]).toBe(0x1f);
        expect(data[1]).toBe(0x8b);
    });

    it('should create a TAR.GZ that round-trips correctly', async () => {
        const enc = new TextEncoder();
        const dec = new TextDecoder();
        const files: InputFile[] = [
            { name: 'file1.txt', data: enc.encode('First') },
            { name: 'file2.txt', data: enc.encode('Second') },
        ];

        const blob = await ArchiveManager.createArchive(files, { format: 'tar.gz' });
        const data = new Uint8Array(await blob.arrayBuffer());

        // Verify gzip magic bytes
        expect(data[0]).toBe(0x1f);
        expect(data[1]).toBe(0x8b);

        // Decompress using fflate (since DecompressionStream is unavailable in test env)
        const fflate = await import('fflate');
        const tarData = fflate.gunzipSync(data);

        // Verify the decompressed data is a valid TAR
        expect(ArchiveManager.detectFormatFromBytes(tarData)).toBe('tar');

        // Parse it as a TAR file to verify contents
        const tarFile = new File([tarData as BlobPart], 'test.tar');
        const extracted = await ArchiveManager.extractAll(tarFile);
        expect(extracted.length).toBe(2);

        const byName: Record<string, string> = {};
        for (const f of extracted) {
            byName[f.name] = dec.decode(f.data);
        }
        expect(byName['file1.txt']).toBe('First');
        expect(byName['file2.txt']).toBe('Second');
    });
});

describe('ArchiveManager.createArchive edge cases', () => {
    it('should handle empty file list for ZIP', async () => {
        const blob = await ArchiveManager.createArchive([], { format: 'zip' });
        expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle empty file list for TAR', async () => {
        const blob = await ArchiveManager.createArchive([], { format: 'tar' });
        // TAR with no files still has end-of-archive marker (1024 bytes)
        expect(blob.size).toBe(1024);
    });

    it('should throw for unsupported creation format', async () => {
        await expect(
            ArchiveManager.createArchive([], { format: 'rar' as any })
        ).rejects.toThrow('Unsupported creation format');
    });
});

describe('ArchiveManager.isZipEncrypted', () => {
    it('should return false for a non-encrypted ZIP', () => {
        const content = new TextEncoder().encode('test');
        const zipData = buildMinimalZip('test.txt', content);
        expect(ArchiveManager.isZipEncrypted(zipData)).toBe(false);
    });

    it('should return true when encryption flag is set', () => {
        const content = new TextEncoder().encode('secret');
        const zipData = buildMinimalZip('secret.txt', content);
        // Set the encryption bit (bit 0) in the general purpose bit flag
        // The flags field is at offset 6 in the local file header
        zipData[6] = zipData[6] | 0x01;
        expect(ArchiveManager.isZipEncrypted(zipData)).toBe(true);
    });

    it('should return false for non-ZIP data', () => {
        const data = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
        expect(ArchiveManager.isZipEncrypted(data)).toBe(false);
    });
});
