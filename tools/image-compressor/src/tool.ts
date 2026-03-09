export interface CompressionOptions {
    quality: number;        // 0.0 to 1.0
    maxWidth?: number;      // Max output width (maintains aspect ratio)
    maxHeight?: number;     // Max output height (maintains aspect ratio)
    outputFormat: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface CompressionResult {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;  // e.g., 0.65 = 65% of original
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
    blob: Blob;
    dataUrl: string;
}

export class ImageCompressor {
    /**
     * Checks whether a real browser Canvas API is available.
     * happy-dom and other test DOM shims don't implement canvas,
     * so we verify getContext('2d') actually returns a context.
     */
    private static hasCanvasSupport(): boolean {
        if (typeof document === 'undefined') return false;
        try {
            const c = document.createElement('canvas');
            return c.getContext !== undefined && typeof c.toBlob === 'function' && c.getContext('2d') !== null;
        } catch {
            return false;
        }
    }

    /**
     * Loads an image file and returns an HTMLImageElement.
     * Works only in browser environments with Canvas support.
     */
    static loadImage(file: File): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            if (!this.hasCanvasSupport()) {
                reject(new Error('loadImage requires a browser environment with Canvas API support'));
                return;
            }

            const img = document.createElement('img');
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image. The file may be corrupted or not a supported format.'));
            };

            img.src = url;
        });
    }

    /**
     * Compresses an image using the Canvas API.
     */
    static async compress(file: File, options: CompressionOptions): Promise<CompressionResult> {
        if (!this.hasCanvasSupport()) {
            throw new Error('compress requires a browser environment with Canvas API support');
        }

        const img = await this.loadImage(file);

        // Calculate output dimensions
        const { width, height } = this.calculateDimensions(
            img.naturalWidth, img.naturalHeight,
            options.maxWidth, options.maxHeight
        );

        // Create canvas and draw
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get canvas 2D context');
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (b) => b ? resolve(b) : reject(new Error('Failed to compress image')),
                options.outputFormat,
                options.quality
            );
        });

        const dataUrl = canvas.toDataURL(options.outputFormat, options.quality);

        return {
            originalSize: file.size,
            compressedSize: blob.size,
            compressionRatio: blob.size / file.size,
            width,
            height,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
            blob,
            dataUrl,
        };
    }

    /**
     * Calculates output dimensions maintaining aspect ratio.
     * If both maxWidth and maxHeight are provided, the image is scaled
     * to fit within those bounds while preserving aspect ratio.
     */
    static calculateDimensions(
        srcWidth: number, srcHeight: number,
        maxWidth?: number, maxHeight?: number
    ): { width: number; height: number } {
        let width = srcWidth;
        let height = srcHeight;

        if (!maxWidth && !maxHeight) {
            return { width, height };
        }

        const aspectRatio = srcWidth / srcHeight;

        if (maxWidth && maxHeight) {
            // Fit within both constraints
            if (width > maxWidth) {
                width = maxWidth;
                height = Math.round(width / aspectRatio);
            }
            if (height > maxHeight) {
                height = maxHeight;
                width = Math.round(height * aspectRatio);
            }
        } else if (maxWidth) {
            if (width > maxWidth) {
                width = maxWidth;
                height = Math.round(width / aspectRatio);
            }
        } else if (maxHeight) {
            if (height > maxHeight) {
                height = maxHeight;
                width = Math.round(height * aspectRatio);
            }
        }

        return { width, height };
    }

    /**
     * Returns supported output formats.
     */
    static getSupportedFormats(): string[] {
        return ['image/jpeg', 'image/webp', 'image/png'];
    }

    /**
     * Formats file size for display.
     */
    static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const index = Math.min(i, units.length - 1);
        const value = bytes / Math.pow(k, index);
        return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
    }
}
