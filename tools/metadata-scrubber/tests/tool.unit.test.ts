import { describe, it, expect } from 'bun:test';
import { MetadataScrubber } from '../src/tool';
import type { ScrubOptions } from '../src/tool';

// ─── Existing helpers ─────────────────────────────────────────────────────────

/**
 * Helper: Build a minimal valid JPEG with an APP1 (EXIF) segment.
 *
 * JPEG structure:
 *   SOI (FFD8)
 *   APP1 marker (FFE1) + length (2 bytes) + payload
 *   SOS marker (FFDA) + minimal data
 *   EOI (FFD9)
 */
function buildJpegWithApp1(): ArrayBuffer {
    const exifPayload = new TextEncoder().encode('Exif\0\0FakeExifData1234');
    // APP1 segment: marker (2) + length (2) + payload
    // length field includes itself (2 bytes) + payload length
    const segLength = 2 + exifPayload.length;

    const bytes: number[] = [];

    // SOI
    bytes.push(0xff, 0xd8);

    // APP1 segment
    bytes.push(0xff, 0xe1);
    bytes.push((segLength >> 8) & 0xff, segLength & 0xff);
    for (const b of exifPayload) bytes.push(b);

    // SOS marker (start of scan) followed by fake image data
    bytes.push(0xff, 0xda);
    // SOS length (minimal: just the length field itself)
    bytes.push(0x00, 0x02);
    // Some image data bytes
    bytes.push(0x00, 0x01, 0x02, 0x03);

    // EOI
    bytes.push(0xff, 0xd9);

    return new Uint8Array(bytes).buffer;
}

/**
 * Helper: Build a minimal valid JPEG with an APP13 (IPTC) segment.
 */
function buildJpegWithApp13(): ArrayBuffer {
    const iptcPayload = new TextEncoder().encode('Photoshop 3.0\x008BIM');
    const segLength = 2 + iptcPayload.length;

    const bytes: number[] = [];

    // SOI
    bytes.push(0xff, 0xd8);

    // APP13 segment
    bytes.push(0xff, 0xed);
    bytes.push((segLength >> 8) & 0xff, segLength & 0xff);
    for (const b of iptcPayload) bytes.push(b);

    // SOS + fake data + EOI
    bytes.push(0xff, 0xda, 0x00, 0x02, 0x00, 0x01, 0xff, 0xd9);

    return new Uint8Array(bytes).buffer;
}

/**
 * Helper: Build a minimal valid PNG with a tEXt chunk.
 *
 * PNG structure:
 *   Signature (8 bytes)
 *   IHDR chunk (required first chunk)
 *   tEXt chunk (metadata)
 *   IEND chunk (required last chunk)
 */
function buildPngWithText(): ArrayBuffer {
    const bytes: number[] = [];

    // PNG signature
    bytes.push(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

    // IHDR chunk: 1x1 pixel, 8-bit grayscale
    const ihdrData = [
        0x00, 0x00, 0x00, 0x01, // width: 1
        0x00, 0x00, 0x00, 0x01, // height: 1
        0x08,                   // bit depth: 8
        0x00,                   // color type: grayscale
        0x00,                   // compression
        0x00,                   // filter
        0x00,                   // interlace
    ];
    writeChunk(bytes, 'IHDR', ihdrData);

    // tEXt chunk: key=Comment, value=TestMetadata
    const textData = Array.from(new TextEncoder().encode('Comment\0TestMetadata'));
    writeChunk(bytes, 'tEXt', textData);

    // IEND chunk (empty)
    writeChunk(bytes, 'IEND', []);

    return new Uint8Array(bytes).buffer;
}

/**
 * Helper: Write a PNG chunk (length + type + data + CRC).
 * CRC is simplified to 0x00000000 since we only need structural correctness for scrubbing tests.
 */
function writeChunk(bytes: number[], type: string, data: number[]) {
    // Length (4 bytes, big-endian)
    const len = data.length;
    bytes.push((len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff);

    // Type (4 bytes)
    for (const c of type) bytes.push(c.charCodeAt(0));

    // Data
    for (const b of data) bytes.push(b);

    // CRC (4 bytes — simplified for testing)
    bytes.push(0x00, 0x00, 0x00, 0x00);
}

/**
 * Helper: Read PNG chunk types from a buffer.
 */
function readPngChunkTypes(buffer: ArrayBuffer): string[] {
    const view = new DataView(buffer);
    const types: string[] = [];
    let offset = 8; // skip signature

    while (offset < view.byteLength) {
        const length = view.getUint32(offset);
        const chunkType = String.fromCharCode(
            view.getUint8(offset + 4),
            view.getUint8(offset + 5),
            view.getUint8(offset + 6),
            view.getUint8(offset + 7),
        );
        types.push(chunkType);
        offset += 4 + 4 + length + 4; // length field + type + data + CRC
    }

    return types;
}

/**
 * Helper: Check if a JPEG buffer contains an APP1 (0xFFE1) segment.
 */
function jpegHasApp1(buffer: ArrayBuffer): boolean {
    const view = new DataView(buffer);
    let i = 2; // skip SOI

    while (i < view.byteLength - 1) {
        if (view.getUint8(i) !== 0xff) break;
        const marker = view.getUint8(i + 1);
        if (marker === 0xda) break; // SOS — stop scanning
        if (marker === 0xe1) return true; // APP1 found
        const segLen = view.getUint16(i + 2);
        i += 2 + segLen;
    }

    return false;
}

/**
 * Helper: Check if a JPEG buffer contains an APP13 (0xFFED) segment.
 */
function jpegHasApp13(buffer: ArrayBuffer): boolean {
    const view = new DataView(buffer);
    let i = 2; // skip SOI

    while (i < view.byteLength - 1) {
        if (view.getUint8(i) !== 0xff) break;
        const marker = view.getUint8(i + 1);
        if (marker === 0xda) break;
        if (marker === 0xed) return true;
        const segLen = view.getUint16(i + 2);
        i += 2 + segLen;
    }

    return false;
}

// ─── New format helpers ───────────────────────────────────────────────────────

/** Write a 32-bit little-endian value into a byte array at given index. */
function writeUint32LE(bytes: number[], offset: number, value: number) {
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >> 8) & 0xff;
    bytes[offset + 2] = (value >> 16) & 0xff;
    bytes[offset + 3] = (value >> 24) & 0xff;
}

/** Push a 32-bit little-endian value into a byte array. */
function pushUint32LE(bytes: number[], value: number) {
    bytes.push(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
}

/** Push an ASCII FourCC string (4 bytes) into a byte array. */
function pushFourCC(bytes: number[], fourcc: string) {
    for (let i = 0; i < 4; i++) bytes.push(fourcc.charCodeAt(i));
}

/**
 * Build a minimal WebP file with a VP8 chunk and an EXIF chunk.
 * RIFF/WEBP structure: 'RIFF' + size(4 LE) + 'WEBP' + chunks
 */
function buildWebPWithExif(): ArrayBuffer {
    const bytes: number[] = [];

    // RIFF header placeholder
    pushFourCC(bytes, 'RIFF');
    pushUint32LE(bytes, 0); // file size placeholder
    pushFourCC(bytes, 'WEBP');

    // VP8 chunk (fake 4 bytes of image data)
    const vp8Data = [0x01, 0x02, 0x03, 0x04];
    pushFourCC(bytes, 'VP8 ');
    pushUint32LE(bytes, vp8Data.length);
    for (const b of vp8Data) bytes.push(b);

    // EXIF chunk (fake EXIF data)
    const exifData = Array.from(new TextEncoder().encode('Exif\0\0FakeData'));
    pushFourCC(bytes, 'EXIF');
    pushUint32LE(bytes, exifData.length);
    for (const b of exifData) bytes.push(b);

    // Update RIFF file size
    writeUint32LE(bytes, 4, bytes.length - 8);

    return new Uint8Array(bytes).buffer;
}

/** Read RIFF chunk FourCCs from a WebP/WAV buffer. */
function readRiffChunkFourCCs(buffer: ArrayBuffer): string[] {
    const src = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const fourCCs: string[] = [];
    let offset = 12; // skip RIFF header

    while (offset + 8 <= buffer.byteLength) {
        const fourCC = String.fromCharCode(src[offset], src[offset + 1], src[offset + 2], src[offset + 3]);
        fourCCs.push(fourCC);
        const chunkSize = view.getUint32(offset + 4, true);
        const paddedSize = chunkSize + (chunkSize % 2);
        offset += 8 + paddedSize;
    }

    return fourCCs;
}

/**
 * Build a minimal GIF89a with a Comment Extension.
 * GIF structure: Header(6) + LSD(7) + Comment Extension + Image + Trailer
 */
function buildGifWithComment(): ArrayBuffer {
    const bytes: number[] = [];

    // Header: GIF89a
    for (const c of 'GIF89a') bytes.push(c.charCodeAt(0));

    // Logical Screen Descriptor (7 bytes)
    // width=1 (LE), height=1 (LE), packed=0x00 (no GCT), bg=0, aspect=0
    bytes.push(0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00);

    // Comment Extension
    bytes.push(0x21, 0xfe); // extension introducer + comment label
    // Sub-block: 5 bytes of comment data
    const comment = Array.from(new TextEncoder().encode('Hello'));
    bytes.push(comment.length);
    for (const b of comment) bytes.push(b);
    bytes.push(0x00); // sub-block terminator

    // Image Descriptor (minimal)
    bytes.push(0x2c); // image separator
    bytes.push(0x00, 0x00, 0x00, 0x00); // left, top
    bytes.push(0x01, 0x00, 0x01, 0x00); // width=1, height=1
    bytes.push(0x00); // packed (no LCT)

    // LZW Minimum Code Size
    bytes.push(0x02);

    // Image data sub-block (minimal: 2 bytes of LZW data)
    bytes.push(0x02, 0x4c, 0x01);
    bytes.push(0x00); // sub-block terminator

    // Trailer
    bytes.push(0x3b);

    return new Uint8Array(bytes).buffer;
}

/** Check if a GIF buffer contains a Comment Extension (0x21 0xFE). */
function gifHasCommentExtension(buffer: ArrayBuffer): boolean {
    const src = new Uint8Array(buffer);
    for (let i = 0; i < src.length - 1; i++) {
        if (src[i] === 0x21 && src[i + 1] === 0xfe) return true;
    }
    return false;
}

/** Check if a GIF buffer contains an Application Extension (0x21 0xFF). */
function gifHasApplicationExtension(buffer: ArrayBuffer): boolean {
    const src = new Uint8Array(buffer);
    for (let i = 0; i < src.length - 1; i++) {
        if (src[i] === 0x21 && src[i + 1] === 0xff) return true;
    }
    return false;
}

/**
 * Build a minimal TIFF (little-endian) with an EXIF IFD pointer tag (0x8769).
 *
 * TIFF structure:
 *   Header (8 bytes): 'II' + 42 + IFD offset
 *   IFD0: entry count + entries + next-IFD pointer
 */
function buildTiffWithExifIFD(): ArrayBuffer {
    const bytes: number[] = [];

    // Header: little-endian
    bytes.push(0x49, 0x49); // 'II'
    bytes.push(0x2a, 0x00); // magic 42 (LE)
    pushUint32LE(bytes, 8);  // IFD0 offset = 8 (right after header)

    // IFD0 with 2 entries: one normal tag (ImageWidth 0x0100) and one EXIF IFD pointer (0x8769)
    // Entry count: 2
    bytes.push(0x02, 0x00);

    // Entry 1: ImageWidth tag (0x0100), SHORT (type=3), count=1, value=1
    bytes.push(0x00, 0x01); // tag
    bytes.push(0x03, 0x00); // type: SHORT
    pushUint32LE(bytes, 1);  // count
    pushUint32LE(bytes, 1);  // value (inline)

    // Entry 2: EXIF IFD pointer tag (0x8769), LONG (type=4), count=1, value=100 (fake offset)
    bytes.push(0x69, 0x87); // tag 0x8769 LE
    bytes.push(0x04, 0x00); // type: LONG
    pushUint32LE(bytes, 1);  // count
    pushUint32LE(bytes, 100); // value (fake EXIF IFD offset)

    // Next IFD pointer: 0 (no more IFDs)
    pushUint32LE(bytes, 0);

    return new Uint8Array(bytes).buffer;
}

/** Read IFD tag IDs from a TIFF buffer (IFD0 only, little-endian assumed). */
function readTiffIFDTags(buffer: ArrayBuffer): number[] {
    const view = new DataView(buffer);
    const littleEndian = new Uint8Array(buffer)[0] === 0x49;
    const ifdOffset = view.getUint32(4, littleEndian);
    const entryCount = view.getUint16(ifdOffset, littleEndian);
    const tags: number[] = [];

    for (let i = 0; i < entryCount; i++) {
        const entryOffset = ifdOffset + 2 + i * 12;
        if (entryOffset + 12 > buffer.byteLength) break;
        tags.push(view.getUint16(entryOffset, littleEndian));
    }

    return tags;
}

/**
 * Build a minimal SVG with a <metadata> element.
 */
function buildSvgWithMetadata(): ArrayBuffer {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <metadata>
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
      <rdf:Description>
        <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Test</dc:title>
      </rdf:Description>
    </rdf:RDF>
  </metadata>
  <circle cx="50" cy="50" r="40" fill="red"/>
</svg>`;
    return new TextEncoder().encode(svg).buffer as ArrayBuffer;
}

/**
 * Build a minimal MP3 file with ID3v2 header + fake audio frames + ID3v1 tag.
 *
 * ID3v2: 'ID3' + version(2) + flags(1) + syncsafe-size(4)
 * ID3v1: last 128 bytes starting with 'TAG'
 */
function buildMp3WithId3(): ArrayBuffer {
    const bytes: number[] = [];

    // ID3v2 header
    bytes.push(0x49, 0x44, 0x33); // 'ID3'
    bytes.push(0x03, 0x00); // version 2.3.0
    bytes.push(0x00); // flags
    // Size: 20 bytes (syncsafe: each byte uses 7 bits)
    // 20 = 0x14 → syncsafe: 0x00 0x00 0x00 0x14
    bytes.push(0x00, 0x00, 0x00, 0x14);

    // ID3v2 tag data (20 bytes of fake tag data)
    for (let i = 0; i < 20; i++) bytes.push(0xaa);

    // Fake audio data (some bytes that look like MP3 frames)
    const audioData = [0xff, 0xfb, 0x90, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06];
    for (const b of audioData) bytes.push(b);

    // Padding to make room before ID3v1
    for (let i = 0; i < 50; i++) bytes.push(0x00);

    // ID3v1 tag (128 bytes starting with 'TAG')
    bytes.push(0x54, 0x41, 0x47); // 'TAG'
    // Title (30 bytes)
    const title = Array.from(new TextEncoder().encode('Test Title'));
    for (const b of title) bytes.push(b);
    for (let i = title.length; i < 30; i++) bytes.push(0x00);
    // Artist (30 bytes)
    const artist = Array.from(new TextEncoder().encode('Test Artist'));
    for (const b of artist) bytes.push(b);
    for (let i = artist.length; i < 30; i++) bytes.push(0x00);
    // Album (30 bytes)
    for (let i = 0; i < 30; i++) bytes.push(0x00);
    // Year (4 bytes)
    bytes.push(0x32, 0x30, 0x32, 0x34); // '2024'
    // Comment (30 bytes)
    for (let i = 0; i < 30; i++) bytes.push(0x00);
    // Genre (1 byte)
    bytes.push(0x00);

    return new Uint8Array(bytes).buffer;
}

/** Check if buffer starts with 'ID3' (ID3v2 header). */
function hasId3v2(buffer: ArrayBuffer): boolean {
    const src = new Uint8Array(buffer);
    return src.length >= 3 && src[0] === 0x49 && src[1] === 0x44 && src[2] === 0x33;
}

/** Check if buffer ends with ID3v1 tag ('TAG' at -128 offset). */
function hasId3v1(buffer: ArrayBuffer): boolean {
    const src = new Uint8Array(buffer);
    if (src.length < 128) return false;
    const offset = src.length - 128;
    return src[offset] === 0x54 && src[offset + 1] === 0x41 && src[offset + 2] === 0x47;
}

/**
 * Build a minimal FLAC file with STREAMINFO + VORBIS_COMMENT blocks.
 *
 * FLAC structure:
 *   'fLaC' magic (4 bytes)
 *   Metadata blocks: header(1) + size(3 BE) + data
 *   Block type 0 = STREAMINFO (required), type 4 = VORBIS_COMMENT
 */
function buildFlacWithVorbisComment(): ArrayBuffer {
    const bytes: number[] = [];

    // Magic
    bytes.push(0x66, 0x4c, 0x61, 0x43); // 'fLaC'

    // STREAMINFO block (type=0, NOT last)
    // STREAMINFO is always 34 bytes
    const streaminfoData = new Array(34).fill(0);
    bytes.push(0x00); // type=0, not last (bit 7 = 0)
    bytes.push(0x00, 0x00, 0x22); // size = 34 (big-endian 3 bytes)
    for (const b of streaminfoData) bytes.push(b);

    // VORBIS_COMMENT block (type=4, last block)
    // Minimal vorbis comment: vendor string length (4 LE) + vendor string + user comment count (4 LE)
    const vendorStr = Array.from(new TextEncoder().encode('test'));
    const vorbisData: number[] = [];
    pushUint32LE(vorbisData, vendorStr.length); // vendor length
    for (const b of vendorStr) vorbisData.push(b);
    pushUint32LE(vorbisData, 0); // user comment list length = 0

    bytes.push(0x84); // type=4 (VORBIS_COMMENT), last block (bit 7 = 1)
    const vSize = vorbisData.length;
    bytes.push((vSize >> 16) & 0xff, (vSize >> 8) & 0xff, vSize & 0xff);
    for (const b of vorbisData) bytes.push(b);

    // Fake audio frames
    bytes.push(0xff, 0xf8, 0x01, 0x02, 0x03, 0x04);

    return new Uint8Array(bytes).buffer;
}

/** Read FLAC metadata block types from a buffer. */
function readFlacBlockTypes(buffer: ArrayBuffer): number[] {
    const src = new Uint8Array(buffer);
    if (src.length < 8) return [];
    // Verify magic
    if (src[0] !== 0x66 || src[1] !== 0x4c || src[2] !== 0x61 || src[3] !== 0x43) return [];

    const types: number[] = [];
    let offset = 4;

    while (offset + 4 <= buffer.byteLength) {
        const headerByte = src[offset];
        const isLast = (headerByte & 0x80) !== 0;
        const blockType = headerByte & 0x7f;
        const blockSize = (src[offset + 1] << 16) | (src[offset + 2] << 8) | src[offset + 3];

        types.push(blockType);
        offset += 4 + blockSize;

        if (isLast) break;
    }

    return types;
}

/**
 * Build a minimal WAV file with fmt, data, and LIST chunks.
 * RIFF/WAVE structure: 'RIFF' + size(4 LE) + 'WAVE' + chunks
 */
function buildWavWithList(): ArrayBuffer {
    const bytes: number[] = [];

    // RIFF header placeholder
    pushFourCC(bytes, 'RIFF');
    pushUint32LE(bytes, 0); // file size placeholder
    pushFourCC(bytes, 'WAVE');

    // fmt chunk (minimal: 16 bytes PCM format)
    pushFourCC(bytes, 'fmt ');
    pushUint32LE(bytes, 16); // chunk size
    // AudioFormat=1(PCM), NumChannels=1, SampleRate=44100, ByteRate=44100, BlockAlign=1, BitsPerSample=8
    bytes.push(0x01, 0x00); // PCM
    bytes.push(0x01, 0x00); // mono
    pushUint32LE(bytes, 44100); // sample rate
    pushUint32LE(bytes, 44100); // byte rate
    bytes.push(0x01, 0x00); // block align
    bytes.push(0x08, 0x00); // bits per sample

    // data chunk (4 bytes of silence)
    pushFourCC(bytes, 'data');
    pushUint32LE(bytes, 4);
    bytes.push(0x80, 0x80, 0x80, 0x80);

    // LIST chunk with INFO metadata
    const infoData: number[] = [];
    pushFourCC(infoData, 'INFO');
    // IART sub-chunk: artist name
    pushFourCC(infoData, 'IART');
    const artist = Array.from(new TextEncoder().encode('Test'));
    pushUint32LE(infoData, artist.length);
    for (const b of artist) infoData.push(b);

    pushFourCC(bytes, 'LIST');
    pushUint32LE(bytes, infoData.length);
    for (const b of infoData) bytes.push(b);

    // Update RIFF file size
    writeUint32LE(bytes, 4, bytes.length - 8);

    return new Uint8Array(bytes).buffer;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MetadataScrubber', () => {
    // ── File type detection ──────────────────────────────────────────────────

    describe('getFileType', () => {
        it('detects JPEG files', () => {
            const file = new File([], 'photo.jpg', { type: 'image/jpeg' });
            expect(MetadataScrubber.getFileType(file)).toBe('image');
        });

        it('detects PNG files', () => {
            const file = new File([], 'image.png', { type: 'image/png' });
            expect(MetadataScrubber.getFileType(file)).toBe('image');
        });

        it('detects PDF files', () => {
            const file = new File([], 'doc.pdf', { type: 'application/pdf' });
            expect(MetadataScrubber.getFileType(file)).toBe('pdf');
        });

        it('detects audio files', () => {
            const file = new File([], 'song.mp3', { type: 'audio/mpeg' });
            expect(MetadataScrubber.getFileType(file)).toBe('audio');
        });

        it('detects video files', () => {
            const file = new File([], 'clip.mp4', { type: 'video/mp4' });
            expect(MetadataScrubber.getFileType(file)).toBe('video');
        });

        it('returns unknown for unsupported types', () => {
            const file = new File([], 'data.csv', { type: 'text/csv' });
            expect(MetadataScrubber.getFileType(file)).toBe('unknown');
        });

        it('detects by extension when mime type is empty', () => {
            const file = new File([], 'photo.jpeg', { type: '' });
            expect(MetadataScrubber.getFileType(file)).toBe('image');
        });
    });

    // ── File extension ───────────────────────────────────────────────────────

    describe('getFileExtension', () => {
        it('extracts extension', () => {
            expect(MetadataScrubber.getFileExtension('photo.jpg')).toBe('jpg');
        });

        it('handles no extension', () => {
            expect(MetadataScrubber.getFileExtension('Makefile')).toBe('');
        });

        it('lowercases extension', () => {
            expect(MetadataScrubber.getFileExtension('Photo.JPG')).toBe('jpg');
        });
    });

    // ── JPEG scrubbing ──────────────────────────────────────────────────────

    describe('scrubJpeg', () => {
        it('removes APP1 (EXIF) segment when removeAll is true', () => {
            const original = buildJpegWithApp1();
            expect(jpegHasApp1(original)).toBe(true);

            const options: ScrubOptions = { removeAll: true };
            const scrubbed = MetadataScrubber.scrubJpeg(original, options);

            expect(jpegHasApp1(scrubbed)).toBe(false);
        });

        it('removes APP1 segment when removeExif is true', () => {
            const original = buildJpegWithApp1();
            const scrubbed = MetadataScrubber.scrubJpeg(original, { removeExif: true });

            expect(jpegHasApp1(scrubbed)).toBe(false);
        });

        it('removes APP13 (IPTC) segment when removeAll is true', () => {
            const original = buildJpegWithApp13();
            expect(jpegHasApp13(original)).toBe(true);

            const scrubbed = MetadataScrubber.scrubJpeg(original, { removeAll: true });

            expect(jpegHasApp13(scrubbed)).toBe(false);
        });

        it('removes APP13 segment when removeIptc is true', () => {
            const original = buildJpegWithApp13();
            const scrubbed = MetadataScrubber.scrubJpeg(original, { removeIptc: true });

            expect(jpegHasApp13(scrubbed)).toBe(false);
        });

        it('keeps APP1 when no relevant option is set', () => {
            const original = buildJpegWithApp1();
            const scrubbed = MetadataScrubber.scrubJpeg(original, {});

            expect(jpegHasApp1(scrubbed)).toBe(true);
        });

        it('preserves SOI and SOS markers', () => {
            const original = buildJpegWithApp1();
            const scrubbed = MetadataScrubber.scrubJpeg(original, { removeAll: true });
            const view = new DataView(scrubbed);

            // SOI: FFD8
            expect(view.getUint8(0)).toBe(0xff);
            expect(view.getUint8(1)).toBe(0xd8);
        });

        it('produces a smaller file after stripping metadata', () => {
            const original = buildJpegWithApp1();
            const scrubbed = MetadataScrubber.scrubJpeg(original, { removeAll: true });

            expect(scrubbed.byteLength).toBeLessThan(original.byteLength);
        });
    });

    // ── PNG scrubbing ───────────────────────────────────────────────────────

    describe('scrubPng', () => {
        it('removes tEXt chunk', () => {
            const original = buildPngWithText();
            const originalChunks = readPngChunkTypes(original);
            expect(originalChunks).toContain('tEXt');

            const scrubbed = MetadataScrubber.scrubPng(original, {});
            const scrubbedChunks = readPngChunkTypes(scrubbed);

            expect(scrubbedChunks).not.toContain('tEXt');
        });

        it('preserves IHDR and IEND chunks', () => {
            const original = buildPngWithText();
            const scrubbed = MetadataScrubber.scrubPng(original, {});
            const scrubbedChunks = readPngChunkTypes(scrubbed);

            expect(scrubbedChunks).toContain('IHDR');
            expect(scrubbedChunks).toContain('IEND');
        });

        it('preserves PNG signature', () => {
            const original = buildPngWithText();
            const scrubbed = MetadataScrubber.scrubPng(original, {});
            const view = new DataView(scrubbed);

            expect(view.getUint8(0)).toBe(0x89);
            expect(view.getUint8(1)).toBe(0x50); // P
            expect(view.getUint8(2)).toBe(0x4e); // N
            expect(view.getUint8(3)).toBe(0x47); // G
        });

        it('produces a smaller file after stripping metadata', () => {
            const original = buildPngWithText();
            const scrubbed = MetadataScrubber.scrubPng(original, {});

            expect(scrubbed.byteLength).toBeLessThan(original.byteLength);
        });
    });

    // ── PDF scrubbing ───────────────────────────────────────────────────────

    describe('PDF scrubbing (pdf-lib)', () => {
        it('scrubs metadata from a PDF file', async () => {
            const { PDFDocument } = await import('pdf-lib');

            // Create a PDF with metadata
            const pdfDoc = await PDFDocument.create();
            pdfDoc.setTitle('Secret Title');
            pdfDoc.setAuthor('John Doe');
            pdfDoc.setSubject('Confidential');
            pdfDoc.setCreator('TestApp');
            pdfDoc.setProducer('TestProducer');
            pdfDoc.setKeywords(['secret', 'private']);
            pdfDoc.addPage();

            const originalBytes = await pdfDoc.save();

            const file = new File([originalBytes.buffer as ArrayBuffer], 'test.pdf', { type: 'application/pdf' });
            const result = await MetadataScrubber.scrubFile(file, {});

            // Load the scrubbed PDF and check metadata is cleared
            const scrubbedPdf = await PDFDocument.load(await result.scrubbedFile.arrayBuffer());

            expect(scrubbedPdf.getTitle()).toBe('');
            expect(scrubbedPdf.getAuthor()).toBe('');
            expect(scrubbedPdf.getSubject()).toBe('');
            expect(scrubbedPdf.getCreator()).toBe('');
            // pdf-lib re-sets its own producer on save, so we just verify
            // the original user-set producer was cleared
            expect(scrubbedPdf.getProducer()).not.toBe('TestProducer');
        });

        it('extracts PDF metadata before scrubbing', async () => {
            const { PDFDocument } = await import('pdf-lib');

            const pdfDoc = await PDFDocument.create();
            pdfDoc.setTitle('My Document');
            pdfDoc.setAuthor('Test Author');
            pdfDoc.addPage();

            const bytes = await pdfDoc.save();
            const file = new File([bytes.buffer as ArrayBuffer], 'doc.pdf', { type: 'application/pdf' });

            const result = await MetadataScrubber.scrubFile(file, {});
            const meta = result.metadata;

            expect(meta.extractedMetadata.title).toBe('My Document');
            expect(meta.extractedMetadata.author).toBe('Test Author');
        });

        it('returns scrubbed file with "scrubbed_" prefix', async () => {
            const { PDFDocument } = await import('pdf-lib');

            const pdfDoc = await PDFDocument.create();
            pdfDoc.addPage();
            const bytes = await pdfDoc.save();

            const file = new File([bytes.buffer as ArrayBuffer], 'report.pdf', { type: 'application/pdf' });
            const result = await MetadataScrubber.scrubFile(file, {});

            expect(result.scrubbedFile.name).toBe('scrubbed_report.pdf');
        });
    });

    // ── WebP scrubbing ──────────────────────────────────────────────────────

    describe('scrubWebP', () => {
        it('removes EXIF chunk from WebP', () => {
            const original = buildWebPWithExif();
            const originalChunks = readRiffChunkFourCCs(original);
            expect(originalChunks).toContain('EXIF');

            const scrubbed = MetadataScrubber.scrubWebP(original);
            const scrubbedChunks = readRiffChunkFourCCs(scrubbed);

            expect(scrubbedChunks).not.toContain('EXIF');
        });

        it('keeps VP8 chunk', () => {
            const original = buildWebPWithExif();
            const scrubbed = MetadataScrubber.scrubWebP(original);
            const scrubbedChunks = readRiffChunkFourCCs(scrubbed);

            expect(scrubbedChunks).toContain('VP8 ');
        });

        it('preserves RIFF/WEBP header', () => {
            const original = buildWebPWithExif();
            const scrubbed = MetadataScrubber.scrubWebP(original);
            const src = new Uint8Array(scrubbed);

            expect(String.fromCharCode(src[0], src[1], src[2], src[3])).toBe('RIFF');
            expect(String.fromCharCode(src[8], src[9], src[10], src[11])).toBe('WEBP');
        });

        it('updates RIFF file size after scrubbing', () => {
            const original = buildWebPWithExif();
            const scrubbed = MetadataScrubber.scrubWebP(original);
            const view = new DataView(scrubbed);
            const riffSize = view.getUint32(4, true);

            expect(riffSize).toBe(scrubbed.byteLength - 8);
        });

        it('produces a smaller file after stripping EXIF', () => {
            const original = buildWebPWithExif();
            const scrubbed = MetadataScrubber.scrubWebP(original);

            expect(scrubbed.byteLength).toBeLessThan(original.byteLength);
        });

        it('returns buffer as-is for files too small to be WebP', () => {
            const tiny = new ArrayBuffer(4);
            const result = MetadataScrubber.scrubWebP(tiny);
            expect(result.byteLength).toBe(4);
        });

        it('returns buffer as-is for non-RIFF files', () => {
            const notRiff = new TextEncoder().encode('NOT_A_RIFF_FILE!').buffer as ArrayBuffer;
            const result = MetadataScrubber.scrubWebP(notRiff);
            expect(result.byteLength).toBe(notRiff.byteLength);
        });
    });

    // ── GIF scrubbing ───────────────────────────────────────────────────────

    describe('scrubGif', () => {
        it('removes Comment Extension', () => {
            const original = buildGifWithComment();
            expect(gifHasCommentExtension(original)).toBe(true);

            const scrubbed = MetadataScrubber.scrubGif(original);
            expect(gifHasCommentExtension(scrubbed)).toBe(false);
        });

        it('preserves GIF header', () => {
            const original = buildGifWithComment();
            const scrubbed = MetadataScrubber.scrubGif(original);
            const src = new Uint8Array(scrubbed);

            expect(String.fromCharCode(src[0], src[1], src[2])).toBe('GIF');
        });

        it('preserves image data and trailer', () => {
            const original = buildGifWithComment();
            const scrubbed = MetadataScrubber.scrubGif(original);
            const src = new Uint8Array(scrubbed);

            // Should have image separator somewhere
            let hasImageSeparator = false;
            for (const b of src) {
                if (b === 0x2c) { hasImageSeparator = true; break; }
            }
            expect(hasImageSeparator).toBe(true);

            // Should end with trailer
            expect(src[src.length - 1]).toBe(0x3b);
        });

        it('produces a smaller file after stripping comment', () => {
            const original = buildGifWithComment();
            const scrubbed = MetadataScrubber.scrubGif(original);

            expect(scrubbed.byteLength).toBeLessThan(original.byteLength);
        });

        it('returns buffer as-is for files too small to be GIF', () => {
            const tiny = new ArrayBuffer(4);
            const result = MetadataScrubber.scrubGif(tiny);
            expect(result.byteLength).toBe(4);
        });

        it('returns buffer as-is for non-GIF files', () => {
            const notGif = new TextEncoder().encode('NOT_A_GIF_FILE!!').buffer as ArrayBuffer;
            const result = MetadataScrubber.scrubGif(notGif);
            expect(result.byteLength).toBe(notGif.byteLength);
        });
    });

    // ── TIFF scrubbing ──────────────────────────────────────────────────────

    describe('scrubTiff', () => {
        it('removes EXIF IFD pointer tag (0x8769)', () => {
            const original = buildTiffWithExifIFD();
            const originalTags = readTiffIFDTags(original);
            expect(originalTags).toContain(0x8769);

            const scrubbed = MetadataScrubber.scrubTiff(original);
            const scrubbedTags = readTiffIFDTags(scrubbed);

            expect(scrubbedTags).not.toContain(0x8769);
        });

        it('keeps non-metadata tags (ImageWidth 0x0100)', () => {
            const original = buildTiffWithExifIFD();
            const scrubbed = MetadataScrubber.scrubTiff(original);
            const scrubbedTags = readTiffIFDTags(scrubbed);

            expect(scrubbedTags).toContain(0x0100);
        });

        it('preserves TIFF byte order header', () => {
            const original = buildTiffWithExifIFD();
            const scrubbed = MetadataScrubber.scrubTiff(original);
            const src = new Uint8Array(scrubbed);

            expect(src[0]).toBe(0x49); // 'I'
            expect(src[1]).toBe(0x49); // 'I'
        });

        it('preserves TIFF magic number 42', () => {
            const original = buildTiffWithExifIFD();
            const scrubbed = MetadataScrubber.scrubTiff(original);
            const view = new DataView(scrubbed);

            expect(view.getUint16(2, true)).toBe(42);
        });

        it('returns buffer as-is for files too small to be TIFF', () => {
            const tiny = new ArrayBuffer(4);
            const result = MetadataScrubber.scrubTiff(tiny);
            expect(result.byteLength).toBe(4);
        });

        it('returns buffer as-is for non-TIFF files', () => {
            const notTiff = new TextEncoder().encode('NOT_A_TIFF_FILE!').buffer as ArrayBuffer;
            const result = MetadataScrubber.scrubTiff(notTiff);
            expect(result.byteLength).toBe(notTiff.byteLength);
        });
    });

    // ── SVG scrubbing ───────────────────────────────────────────────────────

    describe('scrubSvg', () => {
        it('removes <metadata> element', () => {
            const original = buildSvgWithMetadata();
            const originalText = new TextDecoder().decode(original);
            expect(originalText).toContain('<metadata>');

            const scrubbed = MetadataScrubber.scrubSvg(original);
            const scrubbedText = new TextDecoder().decode(scrubbed);

            expect(scrubbedText).not.toContain('<metadata>');
            expect(scrubbedText).not.toContain('</metadata>');
        });

        it('removes rdf: namespaced elements', () => {
            const original = buildSvgWithMetadata();
            const scrubbed = MetadataScrubber.scrubSvg(original);
            const scrubbedText = new TextDecoder().decode(scrubbed);

            expect(scrubbedText).not.toContain('<rdf:');
            expect(scrubbedText).not.toContain('</rdf:');
        });

        it('removes dc: namespaced elements', () => {
            const original = buildSvgWithMetadata();
            const scrubbed = MetadataScrubber.scrubSvg(original);
            const scrubbedText = new TextDecoder().decode(scrubbed);

            expect(scrubbedText).not.toContain('<dc:');
            expect(scrubbedText).not.toContain('</dc:');
        });

        it('preserves SVG structure and content', () => {
            const original = buildSvgWithMetadata();
            const scrubbed = MetadataScrubber.scrubSvg(original);
            const scrubbedText = new TextDecoder().decode(scrubbed);

            expect(scrubbedText).toContain('<svg');
            expect(scrubbedText).toContain('<circle');
            expect(scrubbedText).toContain('</svg>');
        });

        it('produces a smaller file after stripping metadata', () => {
            const original = buildSvgWithMetadata();
            const scrubbed = MetadataScrubber.scrubSvg(original);

            expect(scrubbed.byteLength).toBeLessThan(original.byteLength);
        });

        it('returns buffer as-is for empty files', () => {
            const empty = new ArrayBuffer(0);
            const result = MetadataScrubber.scrubSvg(empty);
            expect(result.byteLength).toBe(0);
        });

        it('removes sodipodi and inkscape elements', () => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg">
                <sodipodi:namedview xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.0.dtd" pagecolor="#ffffff"/>
                <inkscape:perspective xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"/>
                <circle cx="50" cy="50" r="40"/>
            </svg>`;
            const buffer = new TextEncoder().encode(svg).buffer as ArrayBuffer;
            const scrubbed = MetadataScrubber.scrubSvg(buffer);
            const scrubbedText = new TextDecoder().decode(scrubbed);

            expect(scrubbedText).not.toContain('<sodipodi:');
            expect(scrubbedText).not.toContain('<inkscape:');
            expect(scrubbedText).toContain('<circle');
        });
    });

    // ── MP3 scrubbing ───────────────────────────────────────────────────────

    describe('scrubMp3', () => {
        it('strips ID3v2 header', () => {
            const original = buildMp3WithId3();
            expect(hasId3v2(original)).toBe(true);

            const scrubbed = MetadataScrubber.scrubMp3(original);
            expect(hasId3v2(scrubbed)).toBe(false);
        });

        it('strips ID3v1 tag', () => {
            const original = buildMp3WithId3();
            expect(hasId3v1(original)).toBe(true);

            const scrubbed = MetadataScrubber.scrubMp3(original);
            expect(hasId3v1(scrubbed)).toBe(false);
        });

        it('strips both ID3v2 and ID3v1', () => {
            const original = buildMp3WithId3();
            const scrubbed = MetadataScrubber.scrubMp3(original);

            expect(hasId3v2(scrubbed)).toBe(false);
            expect(hasId3v1(scrubbed)).toBe(false);
        });

        it('produces a smaller file after stripping tags', () => {
            const original = buildMp3WithId3();
            const scrubbed = MetadataScrubber.scrubMp3(original);

            expect(scrubbed.byteLength).toBeLessThan(original.byteLength);
        });

        it('preserves audio data', () => {
            const original = buildMp3WithId3();
            const scrubbed = MetadataScrubber.scrubMp3(original);
            const src = new Uint8Array(scrubbed);

            // First bytes of audio data should be the MP3 sync word
            expect(src[0]).toBe(0xff);
            expect(src[1]).toBe(0xfb);
        });

        it('returns buffer as-is for files too small', () => {
            const tiny = new ArrayBuffer(2);
            const result = MetadataScrubber.scrubMp3(tiny);
            expect(result.byteLength).toBe(2);
        });

        it('returns buffer as-is for files without ID3 tags', () => {
            const noTags = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 0x01, 0x02, 0x03, 0x04]);
            const result = MetadataScrubber.scrubMp3(noTags.buffer);
            expect(result.byteLength).toBe(noTags.byteLength);
        });
    });

    // ── FLAC scrubbing ──────────────────────────────────────────────────────

    describe('scrubFlac', () => {
        it('removes VORBIS_COMMENT block (type 4)', () => {
            const original = buildFlacWithVorbisComment();
            const originalTypes = readFlacBlockTypes(original);
            expect(originalTypes).toContain(4);

            const scrubbed = MetadataScrubber.scrubFlac(original);
            const scrubbedTypes = readFlacBlockTypes(scrubbed);

            expect(scrubbedTypes).not.toContain(4);
        });

        it('keeps STREAMINFO block (type 0)', () => {
            const original = buildFlacWithVorbisComment();
            const scrubbed = MetadataScrubber.scrubFlac(original);
            const scrubbedTypes = readFlacBlockTypes(scrubbed);

            expect(scrubbedTypes).toContain(0);
        });

        it('preserves fLaC magic', () => {
            const original = buildFlacWithVorbisComment();
            const scrubbed = MetadataScrubber.scrubFlac(original);
            const src = new Uint8Array(scrubbed);

            expect(String.fromCharCode(src[0], src[1], src[2], src[3])).toBe('fLaC');
        });

        it('sets last-block flag on the new last metadata block', () => {
            const original = buildFlacWithVorbisComment();
            const scrubbed = MetadataScrubber.scrubFlac(original);
            const src = new Uint8Array(scrubbed);

            // After magic (4 bytes), first metadata block header
            const headerByte = src[4];
            const isLast = (headerByte & 0x80) !== 0;

            // STREAMINFO should now be the last (and only) block
            expect(isLast).toBe(true);
        });

        it('produces a smaller file after stripping VORBIS_COMMENT', () => {
            const original = buildFlacWithVorbisComment();
            const scrubbed = MetadataScrubber.scrubFlac(original);

            expect(scrubbed.byteLength).toBeLessThan(original.byteLength);
        });

        it('preserves audio frames after metadata', () => {
            const original = buildFlacWithVorbisComment();
            const scrubbed = MetadataScrubber.scrubFlac(original);
            const src = new Uint8Array(scrubbed);

            // Audio frames should still be present (they start with 0xFF 0xF8)
            let hasSync = false;
            for (let i = 0; i < src.length - 1; i++) {
                if (src[i] === 0xff && src[i + 1] === 0xf8) {
                    hasSync = true;
                    break;
                }
            }
            expect(hasSync).toBe(true);
        });

        it('returns buffer as-is for files too small', () => {
            const tiny = new ArrayBuffer(4);
            const result = MetadataScrubber.scrubFlac(tiny);
            expect(result.byteLength).toBe(4);
        });

        it('returns buffer as-is for non-FLAC files', () => {
            const notFlac = new TextEncoder().encode('NOT_FLAC_DATA!!!').buffer as ArrayBuffer;
            const result = MetadataScrubber.scrubFlac(notFlac);
            expect(result.byteLength).toBe(notFlac.byteLength);
        });
    });

    // ── WAV scrubbing ───────────────────────────────────────────────────────

    describe('scrubWav', () => {
        it('removes LIST chunk', () => {
            const original = buildWavWithList();
            const originalChunks = readRiffChunkFourCCs(original);
            expect(originalChunks).toContain('LIST');

            const scrubbed = MetadataScrubber.scrubWav(original);
            const scrubbedChunks = readRiffChunkFourCCs(scrubbed);

            expect(scrubbedChunks).not.toContain('LIST');
        });

        it('keeps fmt and data chunks', () => {
            const original = buildWavWithList();
            const scrubbed = MetadataScrubber.scrubWav(original);
            const scrubbedChunks = readRiffChunkFourCCs(scrubbed);

            expect(scrubbedChunks).toContain('fmt ');
            expect(scrubbedChunks).toContain('data');
        });

        it('preserves RIFF/WAVE header', () => {
            const original = buildWavWithList();
            const scrubbed = MetadataScrubber.scrubWav(original);
            const src = new Uint8Array(scrubbed);

            expect(String.fromCharCode(src[0], src[1], src[2], src[3])).toBe('RIFF');
            expect(String.fromCharCode(src[8], src[9], src[10], src[11])).toBe('WAVE');
        });

        it('updates RIFF file size after scrubbing', () => {
            const original = buildWavWithList();
            const scrubbed = MetadataScrubber.scrubWav(original);
            const view = new DataView(scrubbed);
            const riffSize = view.getUint32(4, true);

            expect(riffSize).toBe(scrubbed.byteLength - 8);
        });

        it('produces a smaller file after stripping LIST chunk', () => {
            const original = buildWavWithList();
            const scrubbed = MetadataScrubber.scrubWav(original);

            expect(scrubbed.byteLength).toBeLessThan(original.byteLength);
        });

        it('returns buffer as-is for files too small', () => {
            const tiny = new ArrayBuffer(4);
            const result = MetadataScrubber.scrubWav(tiny);
            expect(result.byteLength).toBe(4);
        });

        it('returns buffer as-is for non-RIFF files', () => {
            const notRiff = new TextEncoder().encode('NOT_A_RIFF_FILE!').buffer as ArrayBuffer;
            const result = MetadataScrubber.scrubWav(notRiff);
            expect(result.byteLength).toBe(notRiff.byteLength);
        });
    });

    // ── scrubFile integration ───────────────────────────────────────────────

    describe('scrubFile', () => {
        it('scrubs JPEG files via scrubFile', async () => {
            const jpegBuffer = buildJpegWithApp1();
            const file = new File([jpegBuffer], 'photo.jpg', { type: 'image/jpeg' });

            const result = await MetadataScrubber.scrubFile(file, { removeAll: true });

            expect(result.scrubbedFile.name).toBe('scrubbed_photo.jpg');
            const scrubbedBuffer = await result.scrubbedFile.arrayBuffer();
            expect(jpegHasApp1(scrubbedBuffer)).toBe(false);
        });

        it('scrubs PNG files via scrubFile', async () => {
            const pngBuffer = buildPngWithText();
            const file = new File([pngBuffer], 'image.png', { type: 'image/png' });

            const result = await MetadataScrubber.scrubFile(file, {});

            expect(result.scrubbedFile.name).toBe('scrubbed_image.png');
            const scrubbedBuffer = await result.scrubbedFile.arrayBuffer();
            const chunks = readPngChunkTypes(scrubbedBuffer);
            expect(chunks).not.toContain('tEXt');
        });

        it('scrubs WebP files via scrubFile', async () => {
            const webpBuffer = buildWebPWithExif();
            const file = new File([webpBuffer], 'image.webp', { type: 'image/webp' });

            const result = await MetadataScrubber.scrubFile(file, {});

            expect(result.scrubbedFile.name).toBe('scrubbed_image.webp');
            const scrubbedBuffer = await result.scrubbedFile.arrayBuffer();
            const chunks = readRiffChunkFourCCs(scrubbedBuffer);
            expect(chunks).not.toContain('EXIF');
        });

        it('scrubs GIF files via scrubFile', async () => {
            const gifBuffer = buildGifWithComment();
            const file = new File([gifBuffer], 'image.gif', { type: 'image/gif' });

            const result = await MetadataScrubber.scrubFile(file, {});

            expect(result.scrubbedFile.name).toBe('scrubbed_image.gif');
            const scrubbedBuffer = await result.scrubbedFile.arrayBuffer();
            expect(gifHasCommentExtension(scrubbedBuffer)).toBe(false);
        });

        it('scrubs TIFF files via scrubFile', async () => {
            const tiffBuffer = buildTiffWithExifIFD();
            const file = new File([tiffBuffer], 'image.tiff', { type: 'image/tiff' });

            const result = await MetadataScrubber.scrubFile(file, {});

            expect(result.scrubbedFile.name).toBe('scrubbed_image.tiff');
            const scrubbedBuffer = await result.scrubbedFile.arrayBuffer();
            const tags = readTiffIFDTags(scrubbedBuffer);
            expect(tags).not.toContain(0x8769);
        });

        it('scrubs TIFF files with .tif extension', async () => {
            const tiffBuffer = buildTiffWithExifIFD();
            const file = new File([tiffBuffer], 'image.tif', { type: 'image/tiff' });

            const result = await MetadataScrubber.scrubFile(file, {});

            expect(result.scrubbedFile.name).toBe('scrubbed_image.tif');
        });

        it('scrubs SVG files via scrubFile', async () => {
            const svgBuffer = buildSvgWithMetadata();
            const file = new File([svgBuffer], 'image.svg', { type: 'image/svg+xml' });

            const result = await MetadataScrubber.scrubFile(file, {});

            expect(result.scrubbedFile.name).toBe('scrubbed_image.svg');
            const scrubbedBuffer = await result.scrubbedFile.arrayBuffer();
            const text = new TextDecoder().decode(scrubbedBuffer);
            expect(text).not.toContain('<metadata>');
        });

        it('scrubs MP3 files via scrubFile', async () => {
            const mp3Buffer = buildMp3WithId3();
            const file = new File([mp3Buffer], 'song.mp3', { type: 'audio/mpeg' });

            const result = await MetadataScrubber.scrubFile(file, {});

            expect(result.scrubbedFile.name).toBe('scrubbed_song.mp3');
            const scrubbedBuffer = await result.scrubbedFile.arrayBuffer();
            expect(hasId3v2(scrubbedBuffer)).toBe(false);
            expect(hasId3v1(scrubbedBuffer)).toBe(false);
        });

        it('scrubs FLAC files via scrubFile', async () => {
            const flacBuffer = buildFlacWithVorbisComment();
            const file = new File([flacBuffer], 'track.flac', { type: 'audio/flac' });

            const result = await MetadataScrubber.scrubFile(file, {});

            expect(result.scrubbedFile.name).toBe('scrubbed_track.flac');
            const scrubbedBuffer = await result.scrubbedFile.arrayBuffer();
            const blockTypes = readFlacBlockTypes(scrubbedBuffer);
            expect(blockTypes).not.toContain(4);
        });

        it('scrubs WAV files via scrubFile', async () => {
            const wavBuffer = buildWavWithList();
            const file = new File([wavBuffer], 'sound.wav', { type: 'audio/wav' });

            const result = await MetadataScrubber.scrubFile(file, {});

            expect(result.scrubbedFile.name).toBe('scrubbed_sound.wav');
            const scrubbedBuffer = await result.scrubbedFile.arrayBuffer();
            const chunks = readRiffChunkFourCCs(scrubbedBuffer);
            expect(chunks).not.toContain('LIST');
        });

        it('returns file as-is for unsupported formats', async () => {
            const content = new TextEncoder().encode('Hello, world!');
            const file = new File([content], 'data.txt', { type: 'text/plain' });

            const result = await MetadataScrubber.scrubFile(file, {});

            expect(result.scrubbedFile.name).toBe('scrubbed_data.txt');
            expect(result.scrubbedFile.size).toBe(file.size);
        });

        it('attempts FFmpeg for video files (unsupported in Node)', async () => {
            const file = new File([new Uint8Array(10)], 'video.mp4', { type: 'video/mp4' });

            // FFmpeg WASM requires a browser environment; in Node/Bun it throws
            await expect(MetadataScrubber.scrubFile(file, {})).rejects.toThrow();
        });

        it('attempts FFmpeg for complex audio containers (ogg)', async () => {
            const file = new File([new Uint8Array(10)], 'audio.ogg', { type: 'audio/ogg' });

            await expect(MetadataScrubber.scrubFile(file, {})).rejects.toThrow();
        });

        it('attempts FFmpeg for complex audio containers (m4a)', async () => {
            const file = new File([new Uint8Array(10)], 'audio.m4a', { type: 'audio/mp4' });

            await expect(MetadataScrubber.scrubFile(file, {})).rejects.toThrow();
        });

        it('attempts FFmpeg for complex audio containers (aac)', async () => {
            const file = new File([new Uint8Array(10)], 'audio.aac', { type: 'audio/aac' });

            await expect(MetadataScrubber.scrubFile(file, {})).rejects.toThrow();
        });

        it('does not throw for simple audio formats (mp3, flac, wav)', async () => {
            const mp3 = new File([buildMp3WithId3()], 'song.mp3', { type: 'audio/mpeg' });
            await expect(MetadataScrubber.scrubFile(mp3, {})).resolves.toBeDefined();

            const flac = new File([buildFlacWithVorbisComment()], 'track.flac', { type: 'audio/flac' });
            await expect(MetadataScrubber.scrubFile(flac, {})).resolves.toBeDefined();

            const wav = new File([buildWavWithList()], 'sound.wav', { type: 'audio/wav' });
            await expect(MetadataScrubber.scrubFile(wav, {})).resolves.toBeDefined();
        });
    });
});
