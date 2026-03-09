import { describe, it, expect } from "bun:test";
import { ImageCompressor } from "../src/tool";

describe('ImageCompressor E2E / Integration', () => {
    describe('calculateDimensions edge cases', () => {
        it('should handle landscape images constrained only by height', () => {
            // 4000x1000, max height 500
            const result = ImageCompressor.calculateDimensions(4000, 1000, undefined, 500);
            expect(result.width).toBe(2000);
            expect(result.height).toBe(500);
        });

        it('should handle portrait images constrained only by width', () => {
            // 1000x4000, max width 500
            const result = ImageCompressor.calculateDimensions(1000, 4000, 500);
            expect(result.width).toBe(500);
            expect(result.height).toBe(2000);
        });

        it('should handle exact boundary dimensions', () => {
            const result = ImageCompressor.calculateDimensions(1920, 1080, 1920, 1080);
            expect(result).toEqual({ width: 1920, height: 1080 });
        });

        it('should handle extreme aspect ratios (panoramic)', () => {
            // Very wide: 10000x100, max 1000x1000
            const result = ImageCompressor.calculateDimensions(10000, 100, 1000, 1000);
            expect(result.width).toBe(1000);
            expect(result.height).toBe(10);
        });

        it('should handle extreme aspect ratios (very tall)', () => {
            // Very tall: 100x10000, max 1000x1000
            // Width 100 < 1000, no width constraint. Height 10000 > 1000, scale to 1000.
            // New width = round(1000 * (100/10000)) = 10
            const result = ImageCompressor.calculateDimensions(100, 10000, 1000, 1000);
            expect(result.width).toBe(10);
            expect(result.height).toBe(1000);
            // Now constrain by height 500
            const result2 = ImageCompressor.calculateDimensions(100, 10000, 1000, 500);
            expect(result2.height).toBe(500);
            expect(result2.width).toBe(5);
        });

        it('should handle 1x1 pixel image', () => {
            const result = ImageCompressor.calculateDimensions(1, 1, 100, 100);
            expect(result).toEqual({ width: 1, height: 1 });
        });
    });

    describe('format detection', () => {
        it('should return all three supported formats', () => {
            const formats = ImageCompressor.getSupportedFormats();
            expect(formats).toContain('image/jpeg');
            expect(formats).toContain('image/webp');
            expect(formats).toContain('image/png');
        });

        it('should not include unsupported formats', () => {
            const formats = ImageCompressor.getSupportedFormats();
            expect(formats).not.toContain('image/gif');
            expect(formats).not.toContain('image/bmp');
            expect(formats).not.toContain('image/tiff');
        });
    });

    describe('formatFileSize edge cases', () => {
        it('should handle sub-kilobyte values', () => {
            expect(ImageCompressor.formatFileSize(1)).toBe('1 B');
            expect(ImageCompressor.formatFileSize(1023)).toBe('1023 B');
        });

        it('should handle exact power-of-two boundaries', () => {
            expect(ImageCompressor.formatFileSize(1024)).toBe('1.0 KB');
            expect(ImageCompressor.formatFileSize(1048576)).toBe('1.0 MB');
            expect(ImageCompressor.formatFileSize(1073741824)).toBe('1.0 GB');
        });

        it('should handle large file sizes', () => {
            // 5.5 GB
            const size = 5.5 * 1024 * 1024 * 1024;
            expect(ImageCompressor.formatFileSize(size)).toBe('5.5 GB');
        });

        it('should handle typical image sizes', () => {
            // 2.4 MB
            expect(ImageCompressor.formatFileSize(2516582)).toBe('2.4 MB');
            // 890 KB
            expect(ImageCompressor.formatFileSize(911360)).toBe('890.0 KB');
        });
    });

    describe('compress validation without browser', () => {
        it('should provide meaningful error for compress without Canvas', async () => {
            const file = new File([new Uint8Array(100)], 'photo.jpg', { type: 'image/jpeg' });

            await expect(
                ImageCompressor.compress(file, {
                    quality: 0.8,
                    outputFormat: 'image/jpeg',
                })
            ).rejects.toThrow('Canvas API');
        });

        it('should provide meaningful error for loadImage without Canvas', async () => {
            const file = new File([new Uint8Array(100)], 'photo.png', { type: 'image/png' });

            await expect(
                ImageCompressor.loadImage(file)
            ).rejects.toThrow('Canvas API');
        });
    });
});
