/**
 * Custom image format encoders for formats not natively supported by canvas.toBlob().
 * All encoders take a canvas with the final image already drawn.
 */

// ─── BMP Encoder (24-bit uncompressed) ──────────────────────────────

export function encodeBMP(canvas: HTMLCanvasElement): Blob {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    const rowSize = Math.ceil((width * 3) / 4) * 4; // Rows padded to 4 bytes
    const dataSize = rowSize * height;
    const fileSize = 54 + dataSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);

    // File Header (14 bytes)
    view.setUint8(0, 0x42); // 'B'
    view.setUint8(1, 0x4D); // 'M'
    view.setUint32(2, fileSize, true);
    view.setUint32(10, 54, true); // Pixel data offset

    // BITMAPINFOHEADER (40 bytes)
    view.setUint32(14, 40, true);
    view.setInt32(18, width, true);
    view.setInt32(22, height, true); // Positive = bottom-up
    view.setUint16(26, 1, true);     // Color planes
    view.setUint16(28, 24, true);    // Bits per pixel
    view.setUint32(34, dataSize, true);
    view.setInt32(38, 2835, true);   // 72 DPI horizontal
    view.setInt32(42, 2835, true);   // 72 DPI vertical

    // Pixel data: BGR, bottom-up rows, padded
    for (let y = 0; y < height; y++) {
        const srcRow = height - 1 - y;
        for (let x = 0; x < width; x++) {
            const si = (srcRow * width + x) * 4;
            const di = 54 + y * rowSize + x * 3;
            uint8[di] = pixels[si + 2];     // B
            uint8[di + 1] = pixels[si + 1]; // G
            uint8[di + 2] = pixels[si];     // R
        }
    }

    return new Blob([buffer], { type: 'image/bmp' });
}

// ─── TIFF LZW Compression (MSB-first) ──────────────────────────────

function tiffLzwEncode(data: Uint8Array): Uint8Array {
    const CLEAR = 256;
    const EOI = 257;
    const output: number[] = [];
    let bitBuf = 0;
    let bitCnt = 0;

    const writeBits = (code: number, size: number) => {
        // MSB-first: shift code into high bits
        bitBuf = (bitBuf << size) | code;
        bitCnt += size;
        while (bitCnt >= 8) {
            bitCnt -= 8;
            output.push((bitBuf >> bitCnt) & 0xFF);
        }
    };

    let codeSize = 9;
    let nextCode = 258;
    let dict = new Map<string, number>();
    for (let i = 0; i < 256; i++) dict.set(String(i), i);

    writeBits(CLEAR, codeSize);

    if (data.length === 0) {
        writeBits(EOI, codeSize);
        if (bitCnt > 0) output.push((bitBuf << (8 - bitCnt)) & 0xFF);
        return new Uint8Array(output);
    }

    let cur = String(data[0]);

    for (let i = 1; i < data.length; i++) {
        const next = cur + ',' + data[i];
        if (dict.has(next)) {
            cur = next;
        } else {
            writeBits(dict.get(cur)!, codeSize);
            if (nextCode < 4094) {
                dict.set(next, nextCode++);
                if (nextCode > (1 << codeSize)) codeSize++;
            } else {
                // Table full: emit clear code, reset
                dict.set(next, nextCode++); // one more entry
                writeBits(CLEAR, codeSize);
                dict = new Map<string, number>();
                for (let j = 0; j < 256; j++) dict.set(String(j), j);
                codeSize = 9;
                nextCode = 258;
            }
            cur = String(data[i]);
        }
    }

    writeBits(dict.get(cur)!, codeSize);
    writeBits(EOI, codeSize);
    if (bitCnt > 0) output.push((bitBuf << (8 - bitCnt)) & 0xFF);

    return new Uint8Array(output);
}

// ─── TIFF Encoder (RGB, optional LZW compression) ──────────────────

export function encodeTIFF(canvas: HTMLCanvasElement, compressed?: boolean): Blob {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // RGBA → RGB
    const rgbData = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < pixels.length; i += 4, j += 3) {
        rgbData[j] = pixels[i];
        rgbData[j + 1] = pixels[i + 1];
        rgbData[j + 2] = pixels[i + 2];
    }

    // Optionally compress the strip data with LZW
    const stripData = compressed ? tiffLzwEncode(rgbData) : rgbData;
    const compressionValue = compressed ? 5 : 1; // 5 = LZW, 1 = none

    const numTags = 10;
    const ifdOffset = 8;
    const ifdSize = 2 + numTags * 12 + 4;
    const bpsOffset = ifdOffset + ifdSize;       // BitsPerSample data (3 × uint16)
    const stripOffset = bpsOffset + 6;
    const fileSize = stripOffset + stripData.length;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);

    // Header
    view.setUint16(0, 0x4949, false); // 'II' little-endian
    view.setUint16(2, 42, true);
    view.setUint32(4, ifdOffset, true);

    // IFD entries
    let pos = ifdOffset;
    view.setUint16(pos, numTags, true);
    pos += 2;

    const writeTag = (tag: number, type: number, count: number, value: number) => {
        view.setUint16(pos, tag, true); pos += 2;
        view.setUint16(pos, type, true); pos += 2;
        view.setUint32(pos, count, true); pos += 4;
        view.setUint32(pos, value, true); pos += 4;
    };

    writeTag(256, 4, 1, width);              // ImageWidth (LONG)
    writeTag(257, 4, 1, height);             // ImageLength (LONG)
    writeTag(258, 3, 3, bpsOffset);          // BitsPerSample → offset
    writeTag(259, 3, 1, compressionValue);   // Compression: none(1) or LZW(5)
    writeTag(262, 3, 1, 2);                  // PhotometricInterpretation: RGB
    writeTag(273, 4, 1, stripOffset);        // StripOffsets
    writeTag(277, 3, 1, 3);                  // SamplesPerPixel
    writeTag(278, 4, 1, height);             // RowsPerStrip
    writeTag(279, 4, 1, stripData.length);   // StripByteCounts
    writeTag(284, 3, 1, 1);                  // PlanarConfiguration: chunky

    view.setUint32(pos, 0, true); // Next IFD: none

    // BitsPerSample values
    view.setUint16(bpsOffset, 8, true);
    view.setUint16(bpsOffset + 2, 8, true);
    view.setUint16(bpsOffset + 4, 8, true);

    // Pixel data (raw or LZW-compressed)
    uint8.set(stripData, stripOffset);

    return new Blob([buffer], { type: 'image/tiff' });
}

// ─── GIF Encoder (single-frame GIF89a, quality-controlled palette) ──

export function encodeGIF(canvas: HTMLCanvasElement, quality?: number): Blob {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // Map quality (0.0–1.0) to maxColors (2–256). Default to 256.
    const maxColors = quality != null
        ? Math.max(2, Math.round(quality * 254 + 2))
        : 256;

    const palette = medianCutQuantize(pixels, maxColors);

    // Calculate GCT size bits: ceil(log2(maxColors)) - 1, clamped to [0, 7]
    const gctSizeBits = Math.min(7, Math.max(0, Math.ceil(Math.log2(Math.max(2, palette.length))) - 1));
    const bitsPerPixel = gctSizeBits + 1;
    const actualGctSize = 1 << bitsPerPixel; // 2^(gctSizeBits + 1)

    const indices = mapToPalette(pixels, palette);
    const lzwMinCodeSize = Math.max(2, bitsPerPixel); // minimum 2 per GIF spec
    const lzwData = lzwEncode(indices, lzwMinCodeSize);

    const parts: BlobPart[] = [];

    // Header: GIF89a
    parts.push(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));

    // Logical Screen Descriptor
    const lsd = new Uint8Array(7);
    lsd[0] = width & 0xFF;
    lsd[1] = (width >> 8) & 0xFF;
    lsd[2] = height & 0xFF;
    lsd[3] = (height >> 8) & 0xFF;
    // Packed byte: GCT flag (1) | color resolution (bitsPerPixel-1) | sort (0) | GCT size
    lsd[4] = 0x80 | ((bitsPerPixel - 1) << 4) | gctSizeBits;
    parts.push(lsd);

    // Global Color Table (actualGctSize × RGB, padded with zeros)
    const gct = new Uint8Array(actualGctSize * 3);
    for (let i = 0; i < palette.length; i++) {
        gct[i * 3] = palette[i][0];
        gct[i * 3 + 1] = palette[i][1];
        gct[i * 3 + 2] = palette[i][2];
    }
    parts.push(gct);

    // Image Descriptor
    const imgDesc = new Uint8Array(10);
    imgDesc[0] = 0x2C; // separator
    imgDesc[5] = width & 0xFF;
    imgDesc[6] = (width >> 8) & 0xFF;
    imgDesc[7] = height & 0xFF;
    imgDesc[8] = (height >> 8) & 0xFF;
    parts.push(imgDesc);

    // LZW min code size
    parts.push(new Uint8Array([lzwMinCodeSize]));

    // Sub-blocks (max 255 bytes each)
    for (let i = 0; i < lzwData.length;) {
        const chunk = Math.min(255, lzwData.length - i);
        parts.push(new Uint8Array([chunk]));
        parts.push(lzwData.slice(i, i + chunk));
        i += chunk;
    }

    // Block terminator + trailer
    parts.push(new Uint8Array([0x00, 0x3B]));

    return new Blob(parts, { type: 'image/gif' });
}

// ─── Color Quantization (Median Cut) ────────────────────────────────

type RGB = [number, number, number];

function medianCutQuantize(pixels: Uint8ClampedArray, maxColors: number): RGB[] {
    // Sample pixels for performance (up to ~50 000)
    const step = Math.max(1, Math.floor(pixels.length / 4 / 50000));
    const colorMap = new Map<number, number>();

    for (let i = 0; i < pixels.length; i += 4 * step) {
        const key = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    type Entry = [number, number, number, number]; // r, g, b, count
    let boxes: Entry[][] = [
        Array.from(colorMap.entries()).map(([k, c]) => [
            (k >> 16) & 0xFF, (k >> 8) & 0xFF, k & 0xFF, c,
        ]),
    ];

    while (boxes.length < maxColors) {
        let bestBox = -1, bestRange = -1, bestCh = 0;

        for (let b = 0; b < boxes.length; b++) {
            if (boxes[b].length <= 1) continue;
            for (let c = 0; c < 3; c++) {
                let min = 255, max = 0;
                for (const e of boxes[b]) {
                    if (e[c] < min) min = e[c];
                    if (e[c] > max) max = e[c];
                }
                const range = max - min;
                if (range > bestRange) {
                    bestRange = range;
                    bestBox = b;
                    bestCh = c;
                }
            }
        }

        if (bestBox === -1) break;

        const box = boxes[bestBox];
        box.sort((a, b) => a[bestCh] - b[bestCh]);
        const mid = box.length >> 1;
        boxes.splice(bestBox, 1, box.slice(0, mid), box.slice(mid));
    }

    return boxes.map(box => {
        let rS = 0, gS = 0, bS = 0, t = 0;
        for (const [r, g, b, c] of box) {
            rS += r * c; gS += g * c; bS += b * c; t += c;
        }
        return [Math.round(rS / t), Math.round(gS / t), Math.round(bS / t)] as RGB;
    });
}

function mapToPalette(pixels: Uint8ClampedArray, palette: RGB[]): Uint8Array {
    const n = pixels.length / 4;
    const out = new Uint8Array(n);
    const cache = new Map<number, number>();

    for (let i = 0; i < n; i++) {
        const o = i * 4;
        const key = (pixels[o] << 16) | (pixels[o + 1] << 8) | pixels[o + 2];

        const cached = cache.get(key);
        if (cached !== undefined) { out[i] = cached; continue; }

        let best = 0, bestD = Infinity;
        for (let p = 0; p < palette.length; p++) {
            const dr = pixels[o] - palette[p][0];
            const dg = pixels[o + 1] - palette[p][1];
            const db = pixels[o + 2] - palette[p][2];
            const d = dr * dr + dg * dg + db * db;
            if (d < bestD) { bestD = d; best = p; if (d === 0) break; }
        }

        out[i] = best;
        cache.set(key, best);
    }

    return out;
}

// ─── GIF LZW Encoder (LSB-first) ────────────────────────────────────

function lzwEncode(indices: Uint8Array, minCodeSize: number): Uint8Array {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    const output: number[] = [];
    let bitBuf = 0, bitCnt = 0;

    const writeBits = (code: number, size: number) => {
        bitBuf |= code << bitCnt;
        bitCnt += size;
        while (bitCnt >= 8) {
            output.push(bitBuf & 0xFF);
            bitBuf >>= 8;
            bitCnt -= 8;
        }
    };

    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;

    let dict = new Map<string, number>();
    for (let i = 0; i < clearCode; i++) dict.set(String(i), i);

    writeBits(clearCode, codeSize);
    let cur = String(indices[0]);

    for (let i = 1; i < indices.length; i++) {
        const next = cur + ',' + indices[i];
        if (dict.has(next)) {
            cur = next;
        } else {
            writeBits(dict.get(cur)!, codeSize);
            if (nextCode < 4096) {
                dict.set(next, nextCode++);
                if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
            } else {
                writeBits(clearCode, codeSize);
                dict = new Map<string, number>();
                for (let j = 0; j < clearCode; j++) dict.set(String(j), j);
                codeSize = minCodeSize + 1;
                nextCode = eoiCode + 1;
            }
            cur = String(indices[i]);
        }
    }

    writeBits(dict.get(cur)!, codeSize);
    writeBits(eoiCode, codeSize);
    if (bitCnt > 0) output.push(bitBuf & 0xFF);

    return new Uint8Array(output);
}

// ─── Format Detection ───────────────────────────────────────────────

export function canvasSupportsFormat(format: string): boolean {
    try {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        return c.toDataURL(format).startsWith(`data:${format}`);
    } catch {
        return false;
    }
}
