import { describe, it, expect } from "bun:test";
import { ImageCompressor } from "../src/tool";

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
            // Landscape image constrained by width
            const result = ImageCompressor.calculateDimensions(3840, 2160, 1920, 1080);
            expect(result.width).toBe(1920);
            expect(result.height).toBe(1080);
        });

        it('should constrain by height when height is the limiting factor', () => {
            // Tall image: 1000x2000, max 800x800
            const result = ImageCompressor.calculateDimensions(1000, 2000, 800, 800);
            // Width first: 800x1600, then height: 800 -> width = 400
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
        it('should return JPEG, WebP, and PNG', () => {
            const formats = ImageCompressor.getSupportedFormats();
            expect(formats).toEqual(['image/jpeg', 'image/webp', 'image/png']);
        });

        it('should return exactly 3 formats', () => {
            expect(ImageCompressor.getSupportedFormats().length).toBe(3);
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
                // Should not reach here
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
