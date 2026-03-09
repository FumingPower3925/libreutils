import { describe, it, expect } from "bun:test";
import { ImageCompressor, type CompressionOptions } from "../src/tool";
import { encodeBMP, encodeTIFF, encodeGIF } from "../src/encoders";

describe('ImageCompressor', () => {
    describe('calculateDimensions', () => {
        it('should return original dimensions when no limits are set', () => {
            const result = ImageCompressor.calculateDimensions(1920, 1080);
            expect(result).toEqual({ width: 1920, height: 1080 });
        });

        it('should return original dimensions when image is smaller than limits', () => {
            const result = ImageCompressor.calculateDimensions(800, 600, 1920, 1080);
            expect(result).toEqual({ width: 800, height: 600 });
        });

        it('should scale down by maxWidth maintaining aspect ratio', () => {
            const result = ImageCompressor.calculateDimensions(1920, 1080, 960);
            expect(result.width).toBe(960);
            expect(result.height).toBe(540);
        });

        it('should scale down by maxHeight maintaining aspect ratio', () => {
            const result = ImageCompressor.calculateDimensions(1920, 1080, undefined, 540);
            expect(result.width).toBe(960);
            expect(result.height).toBe(540);
        });

        it('should scale down to fit within both maxWidth and maxHeight', () => {
            const result = ImageCompressor.calculateDimensions(3840, 2160, 1920, 1080);
            expect(result.width).toBe(1920);
            expect(result.height).toBe(1080);
        });

        it('should constrain by height when height is the limiting factor', () => {
            const result = ImageCompressor.calculateDimensions(1000, 2000, 800, 800);
            expect(result.width).toBe(400);
            expect(result.height).toBe(800);
        });

        it('should not upscale when dimensions are already within limits', () => {
            const result = ImageCompressor.calculateDimensions(500, 500, 1000, 1000);
            expect(result).toEqual({ width: 500, height: 500 });
        });

        it('should handle square images', () => {
            const result = ImageCompressor.calculateDimensions(2000, 2000, 1000);
            expect(result).toEqual({ width: 1000, height: 1000 });
        });

        it('should not scale when maxWidth equals source width', () => {
            const result = ImageCompressor.calculateDimensions(1920, 1080, 1920);
            expect(result).toEqual({ width: 1920, height: 1080 });
        });

        it('should handle very small dimensions', () => {
            const result = ImageCompressor.calculateDimensions(1, 1, 100, 100);
            expect(result).toEqual({ width: 1, height: 1 });
        });
    });

    describe('formatFileSize', () => {
        it('should format 0 bytes', () => {
            expect(ImageCompressor.formatFileSize(0)).toBe('0 B');
        });

        it('should format bytes', () => {
            expect(ImageCompressor.formatFileSize(500)).toBe('500 B');
        });

        it('should format kilobytes', () => {
            expect(ImageCompressor.formatFileSize(1024)).toBe('1.0 KB');
        });

        it('should format kilobytes with decimals', () => {
            expect(ImageCompressor.formatFileSize(1536)).toBe('1.5 KB');
        });

        it('should format megabytes', () => {
            expect(ImageCompressor.formatFileSize(1048576)).toBe('1.0 MB');
        });

        it('should format megabytes with decimals', () => {
            expect(ImageCompressor.formatFileSize(2621440)).toBe('2.5 MB');
        });

        it('should format gigabytes', () => {
            expect(ImageCompressor.formatFileSize(1073741824)).toBe('1.0 GB');
        });
    });

    describe('getSupportedFormats', () => {
        it('should return at least JPEG, WebP, PNG, GIF, BMP, TIFF', () => {
            const formats = ImageCompressor.getSupportedFormats();
            expect(formats).toContain('image/jpeg');
            expect(formats).toContain('image/webp');
            expect(formats).toContain('image/png');
            expect(formats).toContain('image/gif');
            expect(formats).toContain('image/bmp');
            expect(formats).toContain('image/tiff');
        });

        it('should return at least 6 formats', () => {
            expect(ImageCompressor.getSupportedFormats().length).toBeGreaterThanOrEqual(6);
        });
    });

    describe('CompressionOptions interface', () => {
        it('should accept lossless option', () => {
            const options: CompressionOptions = {
                quality: 0.8,
                outputFormat: 'image/webp',
                lossless: true,
            };
            expect(options.lossless).toBe(true);
        });

        it('should accept lossless as undefined', () => {
            const options: CompressionOptions = {
                quality: 0.8,
                outputFormat: 'image/jpeg',
            };
            expect(options.lossless).toBeUndefined();
        });

        it('should accept crop option', () => {
            const options: CompressionOptions = {
                quality: 0.8,
                outputFormat: 'image/jpeg',
                crop: { x: 10, y: 20, width: 100, height: 200 },
            };
            expect(options.crop).toBeDefined();
            expect(options.crop!.x).toBe(10);
        });
    });

    describe('compress (non-browser environment)', () => {
        it('should throw an error when Canvas API is not available', async () => {
            const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            try {
                await ImageCompressor.compress(file, {
                    quality: 0.8,
                    outputFormat: 'image/jpeg',
                });
                expect(true).toBe(false);
            } catch (err) {
                expect(err).toBeInstanceOf(Error);
                expect((err as Error).message).toContain('Canvas API');
            }
        });
    });

    describe('loadImage (non-browser environment)', () => {
        it('should throw an error when Canvas API is not available', async () => {
            const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            try {
                await ImageCompressor.loadImage(file);
                expect(true).toBe(false);
            } catch (err) {
                expect(err).toBeInstanceOf(Error);
                expect((err as Error).message).toContain('Canvas API');
            }
        });
    });
});

describe('Custom Encoders (non-browser - import validation)', () => {
    it('should export encodeBMP function', () => {
        expect(typeof encodeBMP).toBe('function');
    });

    it('should export encodeTIFF function', () => {
        expect(typeof encodeTIFF).toBe('function');
    });

    it('should export encodeGIF function', () => {
        expect(typeof encodeGIF).toBe('function');
    });
});
