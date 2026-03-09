import { encodeBMP, encodeTIFF, encodeGIF, canvasSupportsFormat } from './encoders';

export type OutputFormat =
    | 'image/jpeg'
    | 'image/webp'
    | 'image/png'
    | 'image/avif'
    | 'image/gif'
    | 'image/bmp'
    | 'image/tiff';

export interface CropRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface CompressionOptions {
    quality: number;        // 0.0 to 1.0
    maxWidth?: number;      // Max output width (maintains aspect ratio)
    maxHeight?: number;     // Max output height (maintains aspect ratio)
    outputFormat: OutputFormat;
    crop?: CropRegion;
    lossless?: boolean;
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

/** Formats that use custom encoders instead of canvas.toBlob() */
const CUSTOM_FORMATS = new Set<string>(['image/bmp', 'image/tiff', 'image/gif']);

export class ImageCompressor {
    private static hasCanvasSupport(): boolean {
        if (typeof document === 'undefined') return false;
        try {
            const c = document.createElement('canvas');
            return c.getContext !== undefined && typeof c.toBlob === 'function' && c.getContext('2d') !== null;
        } catch {
            return false;
        }
    }

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

    static async compress(file: File, options: CompressionOptions): Promise<CompressionResult> {
        if (!this.hasCanvasSupport()) {
            throw new Error('compress requires a browser environment with Canvas API support');
        }

        const img = await this.loadImage(file);

        // Determine source region (crop or full image)
        const crop = options.crop;
        const srcX = crop ? crop.x : 0;
        const srcY = crop ? crop.y : 0;
        const srcW = crop ? crop.width : img.naturalWidth;
        const srcH = crop ? crop.height : img.naturalHeight;

        // Calculate output dimensions from cropped source
        const { width, height } = this.calculateDimensions(
            srcW, srcH,
            options.maxWidth, options.maxHeight
        );

        // Create canvas and draw (with crop if specified)
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get canvas 2D context');
        }
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, width, height);

        // Encode to output format
        let blob: Blob;
        let dataUrl: string;

        if (CUSTOM_FORMATS.has(options.outputFormat)) {
            blob = this.encodeCustomFormat(canvas, options.outputFormat, options.quality);
            dataUrl = await this.blobToDataUrl(blob);
        } else {
            // For lossless WebP/AVIF, use quality 1.0
            const effectiveQuality = options.lossless ? 1.0 : options.quality;
            // Native canvas formats (JPEG, PNG, WebP, AVIF)
            blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (b) => b ? resolve(b) : reject(new Error('Failed to compress image')),
                    options.outputFormat,
                    effectiveQuality
                );
            });
            dataUrl = canvas.toDataURL(options.outputFormat, effectiveQuality);
        }

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
     * Returns all supported output formats.
     * Native canvas formats are always listed; AVIF is feature-detected.
     */
    static getSupportedFormats(): OutputFormat[] {
        const formats: OutputFormat[] = [
            'image/jpeg', 'image/webp', 'image/png',
            'image/gif', 'image/bmp', 'image/tiff',
        ];
        // AVIF: only include if the browser's canvas supports it
        if (typeof document !== 'undefined' && canvasSupportsFormat('image/avif')) {
            formats.splice(3, 0, 'image/avif'); // insert after PNG
        }
        return formats;
    }

    static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const index = Math.min(i, units.length - 1);
        const value = bytes / Math.pow(k, index);
        return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
    }

    // ─── Private Helpers ─────────────────────────────────────────

    private static encodeCustomFormat(canvas: HTMLCanvasElement, format: string, quality?: number): Blob {
        switch (format) {
            case 'image/bmp':  return encodeBMP(canvas);
            case 'image/tiff': return encodeTIFF(canvas, true);
            case 'image/gif':  return encodeGIF(canvas, quality);
            default: throw new Error(`Unsupported custom format: ${format}`);
        }
    }

    private static blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read blob'));
            reader.readAsDataURL(blob);
        });
    }
}
