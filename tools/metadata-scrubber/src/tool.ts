export interface ScrubOptions {
    removeAll?: boolean;
    removeExif?: boolean;
    removeGps?: boolean;
    removeXmp?: boolean;
    removeIptc?: boolean;
}

export interface FileMetadata {
    fileName: string;
    fileSize: number;
    fileType: string;
    detectedType: string;
    extractedMetadata: Record<string, unknown>;
    scrubbedMetadata?: Record<string, unknown>;
}

export type SupportedFileType = 'image' | 'pdf' | 'audio' | 'video' | 'unknown';

// Lazy-loaded FFmpeg instance
let ffmpegInstance: any = null;
let ffmpegLoading: Promise<any> | null = null;

async function getFFmpeg(): Promise<any> {
    if (ffmpegInstance) return ffmpegInstance;
    if (ffmpegLoading) return ffmpegLoading;

    ffmpegLoading = (async () => {
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const ffmpeg = new FFmpeg();

        // Load from CDN - this avoids bundling the 25MB WASM
        await ffmpeg.load({
            coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
            wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
        });

        ffmpegInstance = ffmpeg;
        return ffmpeg;
    })();

    return ffmpegLoading;
}

async function scrubWithFFmpeg(data: Uint8Array, extension: string): Promise<Uint8Array> {
    const ffmpeg = await getFFmpeg();
    const { fetchFile } = await import('@ffmpeg/util');

    const inputName = `input.${extension}`;
    const outputName = `output.${extension}`;

    await ffmpeg.writeFile(inputName, await fetchFile(new Blob([data.buffer as ArrayBuffer])));

    // Strip all metadata, copy streams without re-encoding
    await ffmpeg.exec(['-i', inputName, '-map_metadata', '-1', '-c', 'copy', '-y', outputName]);

    const result = await ffmpeg.readFile(outputName);

    // Cleanup
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    return result as Uint8Array;
}

export class MetadataScrubber {
    /**
     * Detect the general file type category from a File object.
     */
    static getFileType(file: File): SupportedFileType {
        const mime = file.type.toLowerCase();
        const ext = this.getFileExtension(file.name);

        if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'bmp', 'svg'].includes(ext)) {
            return 'image';
        }
        if (mime === 'application/pdf' || ext === 'pdf') {
            return 'pdf';
        }
        if (mime.startsWith('audio/') || ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a'].includes(ext)) {
            return 'audio';
        }
        if (mime.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
            return 'video';
        }
        return 'unknown';
    }

    /**
     * Extract the file extension from a filename, lowercased.
     */
    static getFileExtension(filename: string): string {
        const parts = filename.split('.');
        return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
    }

    /**
     * Extract metadata from a file for display.
     */
    static async getFileMetadata(file: File): Promise<FileMetadata> {
        const fileType = this.getFileType(file);
        let extractedMetadata: Record<string, unknown> = {};

        if (fileType === 'pdf') {
            extractedMetadata = await this.extractPdfMetadata(file);
        }
        // For images, we report basic file info; full EXIF extraction would require exifreader
        // but scrubbing works at the byte level without needing to parse first.

        return {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            detectedType: fileType,
            extractedMetadata,
        };
    }

    /**
     * Extract PDF metadata using pdf-lib.
     */
    private static async extractPdfMetadata(file: File): Promise<Record<string, unknown>> {
        try {
            const { PDFDocument } = await import('pdf-lib');
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

            return {
                title: pdf.getTitle() ?? '',
                author: pdf.getAuthor() ?? '',
                subject: pdf.getSubject() ?? '',
                creator: pdf.getCreator() ?? '',
                producer: pdf.getProducer() ?? '',
                creationDate: pdf.getCreationDate()?.toISOString() ?? '',
                modificationDate: pdf.getModificationDate()?.toISOString() ?? '',
                keywords: pdf.getKeywords() ?? '',
            };
        } catch (error) {
            console.error('Error extracting PDF metadata:', error);
            return {};
        }
    }

    /** Extensions that require FFmpeg (deferred to future update). */
    private static readonly FFMPEG_EXTENSIONS = [
        'mp4', 'mkv', 'avi', 'mov', 'webm', 'ogg', 'm4a', 'aac',
    ];

    /** Simple audio extensions we handle natively. */
    private static readonly SIMPLE_AUDIO_EXTENSIONS = ['mp3', 'flac', 'wav'];

    /**
     * Scrub metadata from a file, returning a cleaned copy and original metadata.
     */
    static async scrubFile(
        file: File,
        options: ScrubOptions = {},
    ): Promise<{ scrubbedFile: File; metadata: FileMetadata }> {
        const originalMetadata = await this.getFileMetadata(file);
        const buffer = await file.arrayBuffer();
        const fileType = this.getFileType(file);
        const ext = this.getFileExtension(file.name);

        // Video files and complex audio containers use FFmpeg WASM
        if (fileType === 'video' || (fileType === 'audio' && this.FFMPEG_EXTENSIONS.includes(ext))) {
            const data = new Uint8Array(buffer);
            const scrubbed = await scrubWithFFmpeg(data, ext);
            const scrubbedFile = new File([scrubbed.buffer as ArrayBuffer], `scrubbed_${file.name}`, { type: file.type });
            return {
                scrubbedFile,
                metadata: {
                    ...originalMetadata,
                    scrubbedMetadata: {},
                },
            };
        }

        let scrubbedBuffer: ArrayBuffer;

        if (fileType === 'image' && (ext === 'jpg' || ext === 'jpeg')) {
            scrubbedBuffer = this.scrubJpeg(buffer, options);
        } else if (fileType === 'image' && ext === 'png') {
            scrubbedBuffer = this.scrubPng(buffer, options);
        } else if (fileType === 'image' && ext === 'webp') {
            scrubbedBuffer = this.scrubWebP(buffer);
        } else if (fileType === 'image' && ext === 'gif') {
            scrubbedBuffer = this.scrubGif(buffer);
        } else if (fileType === 'image' && (ext === 'tiff' || ext === 'tif')) {
            scrubbedBuffer = this.scrubTiff(buffer);
        } else if (fileType === 'image' && ext === 'svg') {
            scrubbedBuffer = this.scrubSvg(buffer);
        } else if (fileType === 'audio' && ext === 'mp3') {
            scrubbedBuffer = this.scrubMp3(buffer);
        } else if (fileType === 'audio' && ext === 'flac') {
            scrubbedBuffer = this.scrubFlac(buffer);
        } else if (fileType === 'audio' && ext === 'wav') {
            scrubbedBuffer = this.scrubWav(buffer);
        } else if (fileType === 'pdf') {
            scrubbedBuffer = await this.scrubPdf(buffer);
        } else {
            // For unsupported formats, return as-is
            scrubbedBuffer = buffer;
        }

        const scrubbedBlob = new Blob([scrubbedBuffer], { type: file.type });
        const scrubbedFile = new File([scrubbedBlob], `scrubbed_${file.name}`, { type: file.type });

        return {
            scrubbedFile,
            metadata: {
                ...originalMetadata,
                scrubbedMetadata: {},
            },
        };
    }

    /**
     * Strip EXIF (APP1) and IPTC (APP13) metadata segments from JPEG files.
     */
    static scrubJpeg(buffer: ArrayBuffer, options: ScrubOptions): ArrayBuffer {
        const view = new DataView(buffer);
        const result: number[] = [];
        let i = 0;

        // Copy SOI marker
        result.push(view.getUint8(0), view.getUint8(1));
        i = 2;

        while (i < view.byteLength) {
            if (view.getUint8(i) !== 0xff) {
                // Not a marker, copy remaining data (image data)
                while (i < view.byteLength) {
                    result.push(view.getUint8(i++));
                }
                break;
            }

            const marker = view.getUint8(i + 1);

            // SOS marker -- everything after is image data, copy it all
            if (marker === 0xda) {
                while (i < view.byteLength) {
                    result.push(view.getUint8(i++));
                }
                break;
            }

            // Get segment length
            const segLength = view.getUint16(i + 2);

            // Check if this is a metadata segment we should strip
            const shouldStrip =
                ((options.removeAll || options.removeExif || options.removeGps || options.removeXmp) &&
                    marker === 0xe1) || // APP1 (EXIF, XMP)
                ((options.removeAll || options.removeIptc) && marker === 0xed); // APP13 (IPTC)

            if (shouldStrip) {
                // Skip this segment
                i += 2 + segLength;
            } else {
                // Copy this segment
                for (let j = 0; j < segLength + 2; j++) {
                    result.push(view.getUint8(i + j));
                }
                i += 2 + segLength;
            }
        }

        return new Uint8Array(result).buffer;
    }

    /**
     * Strip tEXt, iTXt, zTXt, and eXIf chunks from PNG files.
     */
    static scrubPng(buffer: ArrayBuffer, _options: ScrubOptions): ArrayBuffer {
        const view = new DataView(buffer);
        const result: number[] = [];

        // Copy PNG signature (8 bytes)
        for (let i = 0; i < 8; i++) {
            result.push(view.getUint8(i));
        }

        let offset = 8;
        const metadataChunks = ['tEXt', 'iTXt', 'zTXt', 'eXIf'];

        while (offset < view.byteLength) {
            const length = view.getUint32(offset);
            const chunkType = String.fromCharCode(
                view.getUint8(offset + 4),
                view.getUint8(offset + 5),
                view.getUint8(offset + 6),
                view.getUint8(offset + 7),
            );

            const totalChunkLength = 4 + 4 + length + 4; // length + type + data + CRC

            if (metadataChunks.includes(chunkType)) {
                // Skip metadata chunk
                offset += totalChunkLength;
                continue;
            }

            // Copy non-metadata chunk
            for (let i = 0; i < totalChunkLength; i++) {
                result.push(view.getUint8(offset + i));
            }
            offset += totalChunkLength;
        }

        return new Uint8Array(result).buffer;
    }

    /**
     * Strip metadata from PDF files using pdf-lib.
     */
    private static async scrubPdf(buffer: ArrayBuffer): Promise<ArrayBuffer> {
        const { PDFDocument } = await import('pdf-lib');
        const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });

        pdf.setTitle('');
        pdf.setAuthor('');
        pdf.setSubject('');
        pdf.setCreator('');
        pdf.setProducer('');
        pdf.setKeywords([]);

        const bytes = await pdf.save();
        return bytes.buffer as ArrayBuffer;
    }

    /**
     * Strip EXIF and XMP chunks from WebP files (RIFF container).
     *
     * WebP structure:
     *   'RIFF' (4 bytes) + fileSize (4 LE) + 'WEBP' (4 bytes)
     *   Then chunks: FourCC(4) + size(4 LE) + data (padded to even byte boundary)
     */
    static scrubWebP(buffer: ArrayBuffer): ArrayBuffer {
        // Minimum RIFF header is 12 bytes
        if (buffer.byteLength < 12) return buffer;

        const view = new DataView(buffer);
        const src = new Uint8Array(buffer);

        // Verify RIFF header
        const riff = String.fromCharCode(src[0], src[1], src[2], src[3]);
        const webp = String.fromCharCode(src[8], src[9], src[10], src[11]);
        if (riff !== 'RIFF' || webp !== 'WEBP') return buffer;

        const result: number[] = [];

        // Placeholder for RIFF header — we'll fill in the size later
        // 'RIFF' + size(4) + 'WEBP'
        for (let i = 0; i < 12; i++) result.push(src[i]);

        const metadataFourCCs = ['EXIF', 'XMP '];
        let offset = 12;

        while (offset + 8 <= buffer.byteLength) {
            const fourCC = String.fromCharCode(src[offset], src[offset + 1], src[offset + 2], src[offset + 3]);
            const chunkSize = view.getUint32(offset + 4, true); // little-endian
            const paddedSize = chunkSize + (chunkSize % 2); // pad to even
            const totalChunk = 8 + paddedSize; // FourCC + size + data (padded)

            if (metadataFourCCs.includes(fourCC)) {
                // Skip this metadata chunk
                offset += totalChunk;
                continue;
            }

            // Copy this chunk
            const end = Math.min(offset + totalChunk, buffer.byteLength);
            for (let i = offset; i < end; i++) {
                result.push(src[i]);
            }
            offset += totalChunk;
        }

        // Update RIFF file size (total size minus 8 for 'RIFF' + size field)
        const resultArray = new Uint8Array(result);
        const resultView = new DataView(resultArray.buffer);
        resultView.setUint32(4, resultArray.byteLength - 8, true);

        return resultArray.buffer;
    }

    /**
     * Strip Comment Extensions and Application Extensions from GIF files.
     *
     * GIF structure:
     *   Header (6 bytes: 'GIF87a' or 'GIF89a')
     *   Logical Screen Descriptor (7 bytes)
     *   Global Color Table (if present)
     *   Then blocks: extensions (0x21 + type) or image data (0x2C)
     *   Trailer: 0x3B
     */
    static scrubGif(buffer: ArrayBuffer): ArrayBuffer {
        if (buffer.byteLength < 13) return buffer;

        const src = new Uint8Array(buffer);

        // Verify GIF header
        const header = String.fromCharCode(src[0], src[1], src[2]);
        if (header !== 'GIF') return buffer;

        const result: number[] = [];
        let offset = 0;

        // Copy header (6 bytes)
        for (let i = 0; i < 6; i++) result.push(src[offset++]);

        // Copy Logical Screen Descriptor (7 bytes)
        const lsdStart = offset;
        for (let i = 0; i < 7; i++) result.push(src[offset++]);

        // Check for Global Color Table
        const packed = src[lsdStart + 4];
        const hasGCT = (packed & 0x80) !== 0;
        if (hasGCT) {
            const gctSize = 3 * (1 << ((packed & 0x07) + 1));
            for (let i = 0; i < gctSize; i++) result.push(src[offset++]);
        }

        // Process blocks
        while (offset < src.length) {
            const blockType = src[offset];

            if (blockType === 0x3b) {
                // Trailer
                result.push(0x3b);
                break;
            }

            if (blockType === 0x2c) {
                // Image Descriptor: 0x2C + left(2) + top(2) + width(2) + height(2) + packed(1) = 10 bytes
                result.push(src[offset++]); // 0x2C
                for (let i = 0; i < 9; i++) result.push(src[offset++]);

                // Check for Local Color Table
                const imgPacked = src[offset - 1]; // packed byte (last of the 9)
                const hasLCT = (imgPacked & 0x80) !== 0;
                if (hasLCT) {
                    const lctSize = 3 * (1 << ((imgPacked & 0x07) + 1));
                    for (let i = 0; i < lctSize; i++) result.push(src[offset++]);
                }

                // LZW Minimum Code Size
                result.push(src[offset++]);

                // Image data sub-blocks
                offset = this.copyGifSubBlocks(src, offset, result);
                continue;
            }

            if (blockType === 0x21) {
                // Extension
                if (offset + 1 >= src.length) break;
                const extType = src[offset + 1];

                if (extType === 0xfe || extType === 0xff) {
                    // Comment Extension (0xFE) or Application Extension (0xFF) — skip
                    offset += 2; // skip introducer + label
                    offset = this.skipGifSubBlocks(src, offset);
                    continue;
                }

                // Other extensions (e.g., Graphics Control 0xF9) — keep
                result.push(src[offset++]); // 0x21
                result.push(src[offset++]); // extension label

                if (extType === 0xf9) {
                    // Graphics Control Extension: fixed size block (4 bytes) + terminator
                    const blockSize = src[offset];
                    result.push(src[offset++]); // block size
                    for (let i = 0; i < blockSize; i++) result.push(src[offset++]);
                    result.push(src[offset++]); // block terminator (0x00)
                } else {
                    // Generic extension — copy sub-blocks
                    offset = this.copyGifSubBlocks(src, offset, result);
                }
                continue;
            }

            // Unknown block type — just copy the byte and move on
            result.push(src[offset++]);
        }

        return new Uint8Array(result).buffer;
    }

    /** Skip GIF sub-blocks (size + data, until 0x00 terminator). Returns new offset. */
    private static skipGifSubBlocks(src: Uint8Array, offset: number): number {
        while (offset < src.length) {
            const size = src[offset++];
            if (size === 0) break;
            offset += size;
        }
        return offset;
    }

    /** Copy GIF sub-blocks into result. Returns new offset. */
    private static copyGifSubBlocks(src: Uint8Array, offset: number, result: number[]): number {
        while (offset < src.length) {
            const size = src[offset];
            result.push(src[offset++]);
            if (size === 0) break;
            for (let i = 0; i < size; i++) result.push(src[offset++]);
        }
        return offset;
    }

    /**
     * Strip EXIF, GPS, IPTC, and XMP IFD tags from TIFF files.
     *
     * Strategy: parse the IFD, remove metadata-pointer tags, rewrite IFD in place.
     * We zero out removed tag entries and update the IFD entry count, keeping all
     * data offsets valid (since we only shrink the IFD entries region).
     */
    static scrubTiff(buffer: ArrayBuffer): ArrayBuffer {
        // Minimum TIFF: 8-byte header + 2-byte count + 4-byte next-IFD = 14 bytes
        if (buffer.byteLength < 14) return buffer;

        const src = new Uint8Array(buffer);
        const view = new DataView(buffer);

        // Determine byte order
        const bo0 = src[0];
        const bo1 = src[1];
        let littleEndian: boolean;
        if (bo0 === 0x49 && bo1 === 0x49) {
            littleEndian = true;
        } else if (bo0 === 0x4d && bo1 === 0x4d) {
            littleEndian = false;
        } else {
            return buffer; // Not a valid TIFF
        }

        // Verify magic number 42
        const magic = view.getUint16(2, littleEndian);
        if (magic !== 42) return buffer;

        // IFD0 offset
        const ifdOffset = view.getUint32(4, littleEndian);
        if (ifdOffset + 2 > buffer.byteLength) return buffer;

        const entryCount = view.getUint16(ifdOffset, littleEndian);

        // Tags to remove: EXIF IFD, GPS IFD, IPTC, XMP
        const metadataTags = new Set([0x8769, 0x8825, 0x83bb, 0x02bc]);

        // Collect entries to keep
        const keptEntries: { offset: number }[] = [];
        for (let i = 0; i < entryCount; i++) {
            const entryOffset = ifdOffset + 2 + i * 12;
            if (entryOffset + 12 > buffer.byteLength) break;
            const tag = view.getUint16(entryOffset, littleEndian);
            if (!metadataTags.has(tag)) {
                keptEntries.push({ offset: entryOffset });
            }
        }

        // If nothing was removed, return as-is
        if (keptEntries.length === entryCount) return buffer;

        // Build new buffer: copy everything, then rewrite the IFD region
        const result = new Uint8Array(buffer.byteLength);
        result.set(src);
        const resultView = new DataView(result.buffer);

        // Write new entry count
        resultView.setUint16(ifdOffset, keptEntries.length, littleEndian);

        // Rewrite kept entries contiguously
        for (let i = 0; i < keptEntries.length; i++) {
            const destOffset = ifdOffset + 2 + i * 12;
            const srcOffset = keptEntries[i].offset;
            if (destOffset !== srcOffset) {
                for (let j = 0; j < 12; j++) {
                    result[destOffset + j] = src[srcOffset + j];
                }
            }
        }

        // Zero out the remaining old entry slots
        const oldEntriesEnd = ifdOffset + 2 + entryCount * 12;
        const newEntriesEnd = ifdOffset + 2 + keptEntries.length * 12;
        // Copy the next-IFD pointer from old position to new position
        if (oldEntriesEnd + 4 <= buffer.byteLength) {
            const nextIfd = view.getUint32(oldEntriesEnd, littleEndian);
            resultView.setUint32(newEntriesEnd, nextIfd, littleEndian);
        }
        // Zero out the gap
        for (let i = newEntriesEnd + 4; i < oldEntriesEnd + 4 && i < result.byteLength; i++) {
            result[i] = 0;
        }

        return result.buffer;
    }

    /**
     * Strip metadata elements from SVG files.
     *
     * Removes: <metadata>, <rdf:*>, <dc:*>, <sodipodi:*>, <inkscape:*> elements
     * Uses regex-based approach (works in all environments without DOM parser).
     */
    static scrubSvg(buffer: ArrayBuffer): ArrayBuffer {
        if (buffer.byteLength === 0) return buffer;

        const decoder = new TextDecoder('utf-8');
        let svg = decoder.decode(buffer);

        // Remove <metadata>...</metadata> elements (including nested content)
        svg = svg.replace(/<metadata[\s>][\s\S]*?<\/metadata>/gi, '');

        // Remove self-closing <metadata ... />
        svg = svg.replace(/<metadata\s[^>]*\/>/gi, '');

        // Remove namespaced elements: rdf:*, dc:*, sodipodi:*, inkscape:*
        const nsPrefixes = ['rdf', 'dc', 'sodipodi', 'inkscape', 'cc'];
        for (const ns of nsPrefixes) {
            // Elements with content
            const openClose = new RegExp(`<${ns}:[^>]*>[\\s\\S]*?<\\/${ns}:[^>]*>`, 'gi');
            svg = svg.replace(openClose, '');
            // Self-closing elements
            const selfClose = new RegExp(`<${ns}:[^>]*\\/>`, 'gi');
            svg = svg.replace(selfClose, '');
        }

        const encoder = new TextEncoder();
        return encoder.encode(svg).buffer as ArrayBuffer;
    }

    /**
     * Strip ID3v2 (header) and ID3v1 (footer) tags from MP3 files.
     *
     * ID3v2: starts with 'ID3' at offset 0, header is 10 bytes,
     *   bytes 6-9 encode size as syncsafe integer (7 bits per byte).
     * ID3v1: last 128 bytes start with 'TAG'.
     */
    static scrubMp3(buffer: ArrayBuffer): ArrayBuffer {
        if (buffer.byteLength < 4) return buffer;

        const src = new Uint8Array(buffer);
        let start = 0;
        let end = buffer.byteLength;

        // Check for ID3v2 header
        if (src[0] === 0x49 && src[1] === 0x44 && src[2] === 0x33) { // 'ID3'
            if (buffer.byteLength >= 10) {
                // Syncsafe integer: each byte uses only 7 bits
                const size =
                    ((src[6] & 0x7f) << 21) |
                    ((src[7] & 0x7f) << 14) |
                    ((src[8] & 0x7f) << 7) |
                    (src[9] & 0x7f);
                start = 10 + size;
                if (start > buffer.byteLength) start = buffer.byteLength;
            }
        }

        // Check for ID3v1 tag (last 128 bytes starting with 'TAG')
        if (end - start >= 128) {
            const tagOffset = end - 128;
            if (src[tagOffset] === 0x54 && src[tagOffset + 1] === 0x41 && src[tagOffset + 2] === 0x47) { // 'TAG'
                end = tagOffset;
            }
        }

        if (start === 0 && end === buffer.byteLength) return buffer;
        if (start >= end) return buffer;

        return buffer.slice(start, end);
    }

    /**
     * Strip VORBIS_COMMENT and PICTURE metadata blocks from FLAC files.
     *
     * FLAC structure:
     *   'fLaC' magic (4 bytes)
     *   Metadata blocks: 1-byte header (bit 7 = last, bits 0-6 = type) + 3-byte size (big-endian)
     *   Block types to strip: 4 (VORBIS_COMMENT), 6 (PICTURE)
     */
    static scrubFlac(buffer: ArrayBuffer): ArrayBuffer {
        if (buffer.byteLength < 8) return buffer;

        const src = new Uint8Array(buffer);

        // Verify fLaC magic
        if (src[0] !== 0x66 || src[1] !== 0x4c || src[2] !== 0x61 || src[3] !== 0x43) {
            return buffer;
        }

        const result: number[] = [];

        // Copy magic
        result.push(src[0], src[1], src[2], src[3]);

        const stripTypes = new Set([4, 6]); // VORBIS_COMMENT, PICTURE
        let offset = 4;

        // Collect kept blocks and track where audio frames begin
        const keptBlocks: { headerByte: number; data: Uint8Array }[] = [];
        let audioStart = buffer.byteLength;

        while (offset + 4 <= buffer.byteLength) {
            const headerByte = src[offset];
            const isLast = (headerByte & 0x80) !== 0;
            const blockType = headerByte & 0x7f;
            const blockSize = (src[offset + 1] << 16) | (src[offset + 2] << 8) | src[offset + 3];

            const dataStart = offset + 4;
            const dataEnd = dataStart + blockSize;

            if (dataEnd > buffer.byteLength) break;

            if (!stripTypes.has(blockType)) {
                keptBlocks.push({
                    headerByte: headerByte & 0x7f, // clear the last-block flag; we'll set it ourselves
                    data: src.slice(dataStart, dataEnd),
                });
            }

            offset = dataEnd;

            if (isLast) {
                audioStart = offset;
                break;
            }
        }

        // If no blocks were removed, return as-is
        if (audioStart === buffer.byteLength && offset === buffer.byteLength) return buffer;

        // Write kept blocks, setting last-block flag on the final one
        for (let i = 0; i < keptBlocks.length; i++) {
            const block = keptBlocks[i];
            let hdr = block.headerByte;
            if (i === keptBlocks.length - 1) {
                hdr |= 0x80; // set last-block flag
            }
            result.push(hdr);
            const size = block.data.length;
            result.push((size >> 16) & 0xff, (size >> 8) & 0xff, size & 0xff);
            for (const b of block.data) result.push(b);
        }

        // Copy audio frames
        for (let i = audioStart; i < buffer.byteLength; i++) {
            result.push(src[i]);
        }

        return new Uint8Array(result).buffer;
    }

    /**
     * Strip metadata chunks from WAV files (RIFF/WAVE container).
     *
     * Keeps: 'fmt ', 'data', 'fact', 'cue ', 'smpl' (audio-structural chunks)
     * Drops: 'LIST', 'DISP', 'id3 ', 'ID3 ', 'IDVX' and other non-structural chunks
     */
    static scrubWav(buffer: ArrayBuffer): ArrayBuffer {
        // Minimum RIFF header is 12 bytes
        if (buffer.byteLength < 12) return buffer;

        const view = new DataView(buffer);
        const src = new Uint8Array(buffer);

        // Verify RIFF + WAVE header
        const riff = String.fromCharCode(src[0], src[1], src[2], src[3]);
        const wave = String.fromCharCode(src[8], src[9], src[10], src[11]);
        if (riff !== 'RIFF' || wave !== 'WAVE') return buffer;

        const result: number[] = [];

        // Copy RIFF header (placeholder — size will be updated)
        for (let i = 0; i < 12; i++) result.push(src[i]);

        const keepFourCCs = new Set(['fmt ', 'data', 'fact', 'cue ', 'smpl']);
        let offset = 12;

        while (offset + 8 <= buffer.byteLength) {
            const fourCC = String.fromCharCode(src[offset], src[offset + 1], src[offset + 2], src[offset + 3]);
            const chunkSize = view.getUint32(offset + 4, true); // little-endian
            const paddedSize = chunkSize + (chunkSize % 2); // pad to even boundary
            const totalChunk = 8 + paddedSize;

            if (keepFourCCs.has(fourCC)) {
                // Copy this chunk
                const end = Math.min(offset + totalChunk, buffer.byteLength);
                for (let i = offset; i < end; i++) {
                    result.push(src[i]);
                }
            }
            // else: drop the chunk (LIST, DISP, id3 , ID3 , IDVX, etc.)

            offset += totalChunk;
        }

        // Update RIFF file size
        const resultArray = new Uint8Array(result);
        const resultView = new DataView(resultArray.buffer);
        resultView.setUint32(4, resultArray.byteLength - 8, true);

        return resultArray.buffer;
    }
}
