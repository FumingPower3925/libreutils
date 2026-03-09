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

        // Audio/video not yet supported
        if (fileType === 'audio' || fileType === 'video') {
            throw new Error(
                'Audio and video metadata scrubbing is coming in a future update. Currently supported: JPEG, PNG, and PDF files.',
            );
        }

        let scrubbedBuffer: ArrayBuffer;

        if (fileType === 'image' && (ext === 'jpg' || ext === 'jpeg')) {
            scrubbedBuffer = this.scrubJpeg(buffer, options);
        } else if (fileType === 'image' && ext === 'png') {
            scrubbedBuffer = this.scrubPng(buffer, options);
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
}
