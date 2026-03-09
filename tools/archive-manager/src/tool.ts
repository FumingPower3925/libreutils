export interface ArchiveEntry {
    name: string;
    size: number;
    compressedSize?: number;
    isDirectory: boolean;
    lastModified?: Date;
}

export interface ExtractedFile {
    name: string;
    data: Uint8Array;
    size: number;
}

export type ArchiveFormat = 'zip' | 'tar' | 'tar.gz' | 'gz' | 'unknown';

export type CreateArchiveFormat = 'zip' | 'tar' | 'tar.gz';

export interface CreateArchiveOptions {
    format: CreateArchiveFormat;
    compressionLevel?: number; // 0-9 for ZIP
    password?: string; // ZIP only (not yet supported)
}

export interface InputFile {
    name: string; // Can include path like "folder/file.txt"
    data: Uint8Array;
}

// ── ZIP constants ──────────────────────────────────────────────────────
const ZIP_LOCAL_HEADER_SIG = 0x04034b50;
const ZIP_CENTRAL_DIR_SIG = 0x02014b50;
const ZIP_EOCD_SIG = 0x06054b50;

// ── Helper utilities ───────────────────────────────────────────────────

function readUint16LE(data: Uint8Array, offset: number): number {
    return data[offset] | (data[offset + 1] << 8);
}

function readUint32LE(data: Uint8Array, offset: number): number {
    return (
        (data[offset]) |
        (data[offset + 1] << 8) |
        (data[offset + 2] << 16) |
        ((data[offset + 3] << 24) >>> 0)  // unsigned shift for top bit
    ) >>> 0;
}

function decodeString(data: Uint8Array, offset: number, length: number): string {
    return new TextDecoder().decode(data.subarray(offset, offset + length));
}

function dosDateTimeToDate(date: number, time: number): Date {
    const day = date & 0x1f;
    const month = ((date >> 5) & 0x0f) - 1;
    const year = ((date >> 9) & 0x7f) + 1980;
    const second = (time & 0x1f) * 2;
    const minute = (time >> 5) & 0x3f;
    const hour = (time >> 11) & 0x1f;
    return new Date(year, month, day, hour, minute, second);
}

/**
 * Decompress raw deflate data using the browser DecompressionStream API.
 */
async function decompressDeflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    // Write compressed data and close
    writer.write(compressed as unknown as BufferSource);
    writer.close();

    // Read all decompressed chunks
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value as Uint8Array);
        totalLength += value.byteLength;
    }

    // Merge chunks
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return result;
}

/**
 * Decompress gzip data using the browser DecompressionStream API.
 */
async function decompressGzip(compressed: Uint8Array): Promise<Uint8Array> {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    writer.write(compressed as unknown as BufferSource);
    writer.close();

    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.byteLength;
    }

    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return result;
}

// ── ZIP parsing ────────────────────────────────────────────────────────

interface ZipCentralEntry {
    name: string;
    compressedSize: number;
    uncompressedSize: number;
    compressionMethod: number;
    localHeaderOffset: number;
    isDirectory: boolean;
    lastModified: Date;
}

function findEOCD(data: Uint8Array): number {
    // Search backwards for EOCD signature (max 65535 + 22 bytes for comment)
    const maxSearch = Math.min(data.length, 65557);
    for (let i = data.length - 22; i >= data.length - maxSearch && i >= 0; i--) {
        if (readUint32LE(data, i) === ZIP_EOCD_SIG) {
            return i;
        }
    }
    return -1;
}

function parseZipCentralDirectory(data: Uint8Array): ZipCentralEntry[] {
    const eocdOffset = findEOCD(data);
    if (eocdOffset === -1) {
        throw new Error('Invalid ZIP file: End of Central Directory record not found');
    }

    const centralDirOffset = readUint32LE(data, eocdOffset + 16);
    const totalEntries = readUint16LE(data, eocdOffset + 10);
    const entries: ZipCentralEntry[] = [];
    let offset = centralDirOffset;

    for (let i = 0; i < totalEntries; i++) {
        if (offset + 46 > data.length) break;
        const sig = readUint32LE(data, offset);
        if (sig !== ZIP_CENTRAL_DIR_SIG) break;

        const compressionMethod = readUint16LE(data, offset + 10);
        const modTime = readUint16LE(data, offset + 12);
        const modDate = readUint16LE(data, offset + 14);
        const compressedSize = readUint32LE(data, offset + 20);
        const uncompressedSize = readUint32LE(data, offset + 24);
        const fileNameLen = readUint16LE(data, offset + 28);
        const extraLen = readUint16LE(data, offset + 30);
        const commentLen = readUint16LE(data, offset + 32);
        const localHeaderOffset = readUint32LE(data, offset + 42);

        const name = decodeString(data, offset + 46, fileNameLen);
        const isDirectory = name.endsWith('/');

        entries.push({
            name,
            compressionMethod,
            compressedSize,
            uncompressedSize,
            localHeaderOffset,
            isDirectory,
            lastModified: dosDateTimeToDate(modDate, modTime),
        });

        offset += 46 + fileNameLen + extraLen + commentLen;
    }

    return entries;
}

function getLocalFileData(data: Uint8Array, localHeaderOffset: number, compressedSize: number): Uint8Array {
    const sig = readUint32LE(data, localHeaderOffset);
    if (sig !== ZIP_LOCAL_HEADER_SIG) {
        throw new Error('Invalid ZIP local file header');
    }
    const fileNameLen = readUint16LE(data, localHeaderOffset + 26);
    const extraLen = readUint16LE(data, localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + fileNameLen + extraLen;
    return data.subarray(dataOffset, dataOffset + compressedSize);
}

async function extractZipEntry(data: Uint8Array, entry: ZipCentralEntry): Promise<Uint8Array> {
    const compressedData = getLocalFileData(data, entry.localHeaderOffset, entry.compressedSize);

    if (entry.compressionMethod === 0) {
        // Stored (no compression)
        return compressedData;
    } else if (entry.compressionMethod === 8) {
        // Deflate
        return decompressDeflateRaw(compressedData);
    } else {
        throw new Error(`Unsupported ZIP compression method: ${entry.compressionMethod}`);
    }
}

// ── TAR parsing ────────────────────────────────────────────────────────

interface TarEntry {
    name: string;
    size: number;
    isDirectory: boolean;
    dataOffset: number;
}

function isNullBlock(data: Uint8Array, offset: number): boolean {
    for (let i = 0; i < 512 && offset + i < data.length; i++) {
        if (data[offset + i] !== 0) return false;
    }
    return true;
}

function parseTarEntries(data: Uint8Array): TarEntry[] {
    const entries: TarEntry[] = [];
    let offset = 0;

    while (offset + 512 <= data.length) {
        // End-of-archive: two consecutive 512-byte blocks of zeros
        if (isNullBlock(data, offset)) break;

        const name = decodeString(data, offset, 100).replace(/\0+$/, '');
        if (!name) break;

        // Parse file size from octal string at offset 124, length 12
        const sizeStr = decodeString(data, offset + 124, 12).replace(/\0+$/, '').trim();
        const size = parseInt(sizeStr, 8) || 0;

        // Type flag at offset 156
        const typeFlag = data[offset + 156];
        // '5' (53) = directory, '0' (48) or 0 = regular file
        const isDirectory = typeFlag === 53; // '5'

        // Check for UStar prefix at offset 345
        let fullName = name;
        const ustarMagic = decodeString(data, offset + 257, 5);
        if (ustarMagic === 'ustar') {
            const prefix = decodeString(data, offset + 345, 155).replace(/\0+$/, '');
            if (prefix) {
                fullName = prefix + '/' + name;
            }
        }

        const dataOffset = offset + 512;

        entries.push({
            name: fullName,
            size,
            isDirectory,
            dataOffset,
        });

        // Advance past header + data (padded to 512 bytes)
        const dataPaddedSize = Math.ceil(size / 512) * 512;
        offset += 512 + dataPaddedSize;
    }

    return entries;
}

function isTarData(data: Uint8Array): boolean {
    if (data.length < 512) return false;

    // Check for UStar magic at offset 257
    const ustarMagic = decodeString(data, 257, 5);
    if (ustarMagic === 'ustar') return true;

    // Fallback: check that offset 0-99 contains a reasonable filename
    // and the first byte is non-zero
    if (data[0] === 0) return false;

    // Check if the size field at 124-135 looks like an octal number
    const sizeStr = decodeString(data, 124, 12).replace(/\0+$/, '').trim();
    if (sizeStr.length > 0 && /^[0-7]+$/.test(sizeStr)) return true;

    return false;
}

// ── ArchiveManager ─────────────────────────────────────────────────────

export class ArchiveManager {
    /**
     * Detect the archive format based on magic bytes and file extension.
     */
    static detectFormat(file: File): ArchiveFormat {
        const name = file.name.toLowerCase();
        if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) return 'tar.gz';
        if (name.endsWith('.gz')) return 'gz';
        if (name.endsWith('.tar')) return 'tar';
        if (name.endsWith('.zip')) return 'zip';
        return 'unknown';
    }

    /**
     * Detect archive format from data bytes.
     */
    static detectFormatFromBytes(data: Uint8Array): ArchiveFormat {
        if (data.length >= 4) {
            // ZIP magic: PK\x03\x04
            if (data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) {
                return 'zip';
            }
        }
        if (data.length >= 2) {
            // GZ magic: \x1f\x8b
            if (data[0] === 0x1f && data[1] === 0x8b) {
                return 'gz';
            }
        }
        if (isTarData(data)) {
            return 'tar';
        }
        return 'unknown';
    }

    /**
     * List all entries in an archive file.
     */
    static async listEntries(file: File): Promise<ArchiveEntry[]> {
        const data = new Uint8Array(await file.arrayBuffer());
        let format = this.detectFormatFromBytes(data);

        // Fallback to extension-based detection
        if (format === 'unknown') {
            format = this.detectFormat(file);
        }

        switch (format) {
            case 'zip':
                return this.listZipEntries(data);
            case 'tar':
                return this.listTarEntries(data);
            case 'gz':
            case 'tar.gz': {
                const decompressed = await decompressGzip(data);
                if (isTarData(decompressed)) {
                    return this.listTarEntries(decompressed);
                }
                // Single gz file — return the decompressed content as one entry
                const baseName = file.name.replace(/\.gz$/i, '').replace(/\.tgz$/i, '.tar');
                return [{
                    name: baseName || 'decompressed',
                    size: decompressed.length,
                    isDirectory: false,
                }];
            }
            default:
                throw new Error(`Unsupported or unrecognizable archive format`);
        }
    }

    /**
     * Extract a single file from the archive by entry name.
     */
    static async extractFile(file: File, entryName: string): Promise<ExtractedFile> {
        const data = new Uint8Array(await file.arrayBuffer());
        let format = this.detectFormatFromBytes(data);
        if (format === 'unknown') {
            format = this.detectFormat(file);
        }

        switch (format) {
            case 'zip': {
                const entries = parseZipCentralDirectory(data);
                const entry = entries.find(e => e.name === entryName);
                if (!entry) throw new Error(`Entry not found: ${entryName}`);
                if (entry.isDirectory) throw new Error(`Cannot extract directory: ${entryName}`);
                const extracted = await extractZipEntry(data, entry);
                return { name: entry.name, data: extracted, size: extracted.length };
            }
            case 'tar': {
                const entries = parseTarEntries(data);
                const entry = entries.find(e => e.name === entryName);
                if (!entry) throw new Error(`Entry not found: ${entryName}`);
                if (entry.isDirectory) throw new Error(`Cannot extract directory: ${entryName}`);
                const extracted = data.slice(entry.dataOffset, entry.dataOffset + entry.size);
                return { name: entry.name, data: extracted, size: extracted.length };
            }
            case 'gz':
            case 'tar.gz': {
                const decompressed = await decompressGzip(data);
                if (isTarData(decompressed)) {
                    const entries = parseTarEntries(decompressed);
                    const entry = entries.find(e => e.name === entryName);
                    if (!entry) throw new Error(`Entry not found: ${entryName}`);
                    if (entry.isDirectory) throw new Error(`Cannot extract directory: ${entryName}`);
                    const extracted = decompressed.slice(entry.dataOffset, entry.dataOffset + entry.size);
                    return { name: entry.name, data: extracted, size: extracted.length };
                }
                // Single gz file
                const baseName = file.name.replace(/\.gz$/i, '').replace(/\.tgz$/i, '.tar');
                return { name: baseName || 'decompressed', data: decompressed, size: decompressed.length };
            }
            default:
                throw new Error(`Unsupported or unrecognizable archive format`);
        }
    }

    /**
     * Extract all files from the archive.
     */
    static async extractAll(file: File): Promise<ExtractedFile[]> {
        const data = new Uint8Array(await file.arrayBuffer());
        let format = this.detectFormatFromBytes(data);
        if (format === 'unknown') {
            format = this.detectFormat(file);
        }

        switch (format) {
            case 'zip': {
                const entries = parseZipCentralDirectory(data);
                const results: ExtractedFile[] = [];
                for (const entry of entries) {
                    if (entry.isDirectory) continue;
                    const extracted = await extractZipEntry(data, entry);
                    results.push({ name: entry.name, data: extracted, size: extracted.length });
                }
                return results;
            }
            case 'tar': {
                return this.extractAllTar(data);
            }
            case 'gz':
            case 'tar.gz': {
                const decompressed = await decompressGzip(data);
                if (isTarData(decompressed)) {
                    return this.extractAllTar(decompressed);
                }
                const baseName = file.name.replace(/\.gz$/i, '').replace(/\.tgz$/i, '.tar');
                return [{ name: baseName || 'decompressed', data: decompressed, size: decompressed.length }];
            }
            default:
                throw new Error(`Unsupported or unrecognizable archive format`);
        }
    }

    // ── Private helpers ────────────────────────────────────────────────

    private static listZipEntries(data: Uint8Array): ArchiveEntry[] {
        const entries = parseZipCentralDirectory(data);
        return entries.map(e => ({
            name: e.name,
            size: e.uncompressedSize,
            compressedSize: e.compressedSize,
            isDirectory: e.isDirectory,
            lastModified: e.lastModified,
        }));
    }

    private static listTarEntries(data: Uint8Array): ArchiveEntry[] {
        const entries = parseTarEntries(data);
        return entries.map(e => ({
            name: e.name,
            size: e.size,
            isDirectory: e.isDirectory,
        }));
    }

    private static extractAllTar(data: Uint8Array): ExtractedFile[] {
        const entries = parseTarEntries(data);
        const results: ExtractedFile[] = [];
        for (const entry of entries) {
            if (entry.isDirectory) continue;
            const extracted = data.slice(entry.dataOffset, entry.dataOffset + entry.size);
            results.push({ name: entry.name, data: extracted, size: extracted.length });
        }
        return results;
    }

    // ── Archive creation ──────────────────────────────────────────────

    /**
     * Create an archive from a list of input files.
     */
    static async createArchive(files: InputFile[], options: CreateArchiveOptions): Promise<Blob> {
        switch (options.format) {
            case 'zip':
                return this.createZip(files, options);
            case 'tar':
                return this.createTar(files);
            case 'tar.gz':
                return this.createTarGz(files);
            default:
                throw new Error(`Unsupported creation format: ${(options as CreateArchiveOptions).format}`);
        }
    }

    /**
     * Create a ZIP archive using fflate.
     */
    private static async createZip(files: InputFile[], options: CreateArchiveOptions): Promise<Blob> {
        const fflate = await import('fflate');
        const level = (options.compressionLevel ?? 6) as 0|1|2|3|4|5|6|7|8|9;
        const zipData: Record<string, [Uint8Array, { level: 0|1|2|3|4|5|6|7|8|9 }]> = {};
        for (const file of files) {
            zipData[file.name] = [file.data, { level }];
        }
        const zipped = fflate.zipSync(zipData);
        return new Blob([zipped as BlobPart], { type: 'application/zip' });
    }

    /**
     * Create a TAR archive manually.
     */
    private static createTar(files: InputFile[]): Blob {
        const parts: Uint8Array[] = [];
        const enc = new TextEncoder();

        for (const file of files) {
            const header = new Uint8Array(512);

            // Name (0-99)
            const nameBytes = enc.encode(file.name);
            header.set(nameBytes.subarray(0, Math.min(100, nameBytes.length)), 0);

            // File mode (100-107): "0000644\0"
            header.set(enc.encode('0000644\0'), 100);

            // Owner ID (108-115): "0000000\0"
            header.set(enc.encode('0000000\0'), 108);

            // Group ID (116-123): "0000000\0"
            header.set(enc.encode('0000000\0'), 116);

            // File size (124-135): octal
            header.set(enc.encode(file.data.length.toString(8).padStart(11, '0') + '\0'), 124);

            // Mtime (136-147)
            const mtime = Math.floor(Date.now() / 1000);
            header.set(enc.encode(mtime.toString(8).padStart(11, '0') + '\0'), 136);

            // Type flag: '0' regular file
            header[156] = 48;

            // UStar magic + version
            header.set(enc.encode('ustar\0'), 257);
            header[263] = 48; header[264] = 48;

            // Checksum (148-155): initialize with spaces, compute, write
            for (let i = 148; i < 156; i++) header[i] = 32;
            let checksum = 0;
            for (let i = 0; i < 512; i++) checksum += header[i];
            header.set(enc.encode(checksum.toString(8).padStart(6, '0') + '\0 '), 148);

            parts.push(header);
            parts.push(file.data);

            // Pad data to 512-byte boundary
            const padding = (512 - (file.data.length % 512)) % 512;
            if (padding > 0) parts.push(new Uint8Array(padding));
        }

        // Two 512-byte blocks of zeros as end marker
        parts.push(new Uint8Array(1024));

        return new Blob(parts as BlobPart[], { type: 'application/x-tar' });
    }

    /**
     * Create a TAR.GZ archive (TAR + gzip compression via fflate).
     */
    private static async createTarGz(files: InputFile[]): Promise<Blob> {
        const tarBlob = this.createTar(files);
        const tarData = new Uint8Array(await tarBlob.arrayBuffer());

        const fflate = await import('fflate');
        const gzipped = fflate.gzipSync(tarData);

        return new Blob([gzipped as BlobPart], { type: 'application/gzip' });
    }

    // ── Encryption detection ──────────────────────────────────────────

    /**
     * Detect if a ZIP archive is encrypted by checking the general purpose bit flag.
     */
    static isZipEncrypted(data: Uint8Array): boolean {
        let offset = 0;
        while (offset + 30 <= data.length) {
            const sig = readUint32LE(data, offset);
            if (sig !== ZIP_LOCAL_HEADER_SIG) break;
            const flags = readUint16LE(data, offset + 6);
            if (flags & 0x01) return true; // Encryption flag
            const compSize = readUint32LE(data, offset + 18);
            const nameLen = readUint16LE(data, offset + 26);
            const extraLen = readUint16LE(data, offset + 28);
            offset += 30 + nameLen + extraLen + compSize;
        }
        return false;
    }
}
