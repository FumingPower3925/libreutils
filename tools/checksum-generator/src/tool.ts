import { sha256 } from './lib/noble/sha256';
import { sha512 } from './lib/noble/sha512';
import { sha1 } from './lib/noble/sha1';
import { blake2b } from './lib/noble/blake2b';
// @ts-ignore
import SparkMD5 from './lib/spark-md5.js';

export type ChecksumAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512' | 'BLAKE2b';

export interface AlgorithmOption {
    id: ChecksumAlgorithm;
    name: string;
    description: string;
}

export const CHECKSUM_ALGORITHMS: AlgorithmOption[] = [
    { id: 'MD5', name: 'MD5', description: 'Fast, common but insecure' },
    { id: 'SHA-1', name: 'SHA-1', description: 'Legacy, commonly used' },
    { id: 'SHA-256', name: 'SHA-256', description: 'Secure, industry standard' },
    { id: 'SHA-512', name: 'SHA-512', description: 'High security' },
    { id: 'BLAKE2b', name: 'BLAKE2b', description: 'High speed and security' },
];

export class ChecksumTool {
    static getAlgorithms(): AlgorithmOption[] {
        return CHECKSUM_ALGORITHMS;
    }

    /**
     * Calculate hash for text input
     */
    static async calculateText(text: string, algorithm: ChecksumAlgorithm): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        return this.calculateBytes(data, algorithm);
    }

    /**
     * Calculate hash for byte array
     */
    static async calculateBytes(data: Uint8Array, algorithm: ChecksumAlgorithm): Promise<string> {
        // Use Web Crypto API for SHA family if available (much faster)
        if (['SHA-1', 'SHA-256', 'SHA-512'].includes(algorithm) && crypto.subtle) {
            try {
                const algoName = algorithm === 'SHA-1' ? 'SHA-1' : algorithm; // Names match
                const hashBuffer = await crypto.subtle.digest(algoName, data as BufferSource);
                return this.bytesToHex(new Uint8Array(hashBuffer));
            } catch (e) {
                console.warn('Web Crypto failed, falling back to JS implementation', e);
            }
        }

        switch (algorithm) {
            case 'MD5': {
                const spark = new SparkMD5.ArrayBuffer();
                spark.append(data.buffer as ArrayBuffer);
                return spark.end();
            }
            case 'SHA-1':
                return this.bytesToHex(sha1(data));
            case 'SHA-256':
                return this.bytesToHex(sha256(data));
            case 'SHA-512':
                return this.bytesToHex(sha512(data));
            case 'BLAKE2b':
                return this.bytesToHex(blake2b(data));
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
    }

    /**
     * Calculate hash for file (streaming)
     */
    static async calculateFile(
        file: File,
        algorithm: ChecksumAlgorithm,
        onProgress?: (percent: number) => void
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunkSize = 10 * 1024 * 1024; // 10MB chunks
            const fileSize = file.size;
            let offset = 0;

            // Initialize hasher
            let hasher: any;
            if (algorithm === 'MD5') {
                hasher = new SparkMD5.ArrayBuffer();
            } else if (algorithm === 'SHA-1') {
                hasher = sha1.create();
            } else if (algorithm === 'SHA-256') {
                hasher = sha256.create();
            } else if (algorithm === 'SHA-512') {
                hasher = sha512.create();
            } else if (algorithm === 'BLAKE2b') {
                hasher = blake2b.create({});
            } else {
                reject(new Error(`Unsupported algorithm: ${algorithm}`));
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                if (!e.target?.result) return;

                const buffer = e.target.result as ArrayBuffer;
                const uint8 = new Uint8Array(buffer); // Noble requires Uint8Array, Spark requires ArrayBuffer?

                // Update hasher
                if (algorithm === 'MD5') {
                    hasher.append(buffer); // SparkMD5.ArrayBuffer takes ArrayBuffer
                } else {
                    hasher.update(uint8); // Noble takes Uint8Array
                }

                offset += buffer.byteLength;

                if (onProgress) {
                    onProgress(Math.min(100, Math.round((offset / fileSize) * 100)));
                }

                if (offset < fileSize) {
                    readNextChunk();
                } else {
                    // Finalize
                    if (algorithm === 'MD5') {
                        resolve(hasher.end());
                    } else {
                        resolve(this.bytesToHex(hasher.digest()));
                    }
                }
            };

            reader.onerror = (e) => reject(new Error('File read error'));

            function readNextChunk() {
                const slice = file.slice(offset, offset + chunkSize);
                reader.readAsArrayBuffer(slice);
            }

            readNextChunk();
        });
    }

    static bytesToHex(uint8a: Uint8Array): string {
        let hex = '';
        for (let i = 0; i < uint8a.length; i++) {
            hex += uint8a[i].toString(16).padStart(2, '0');
        }
        return hex;
    }
}
