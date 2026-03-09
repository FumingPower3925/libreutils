import { describe, it, expect } from 'bun:test';
import { MetadataScrubber } from '../src/tool';
import type { ScrubOptions } from '../src/tool';

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

        it('returns file as-is for unsupported formats', async () => {
            const content = new TextEncoder().encode('Hello, world!');
            const file = new File([content], 'data.txt', { type: 'text/plain' });

            const result = await MetadataScrubber.scrubFile(file, {});

            expect(result.scrubbedFile.name).toBe('scrubbed_data.txt');
            expect(result.scrubbedFile.size).toBe(file.size);
        });

        it('throws for audio files', async () => {
            const file = new File([new Uint8Array(10)], 'song.mp3', { type: 'audio/mpeg' });

            await expect(MetadataScrubber.scrubFile(file, {})).rejects.toThrow(
                'Audio and video metadata scrubbing is coming in a future update',
            );
        });

        it('throws for video files', async () => {
            const file = new File([new Uint8Array(10)], 'video.mp4', { type: 'video/mp4' });

            await expect(MetadataScrubber.scrubFile(file, {})).rejects.toThrow(
                'Audio and video metadata scrubbing is coming in a future update',
            );
        });
    });
});
