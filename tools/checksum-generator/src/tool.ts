
import { sha256, sha512, sha384 } from './lib/noble/sha2';
import { sha1, md5 } from './lib/noble/legacy';
import { blake3 } from './lib/noble/blake3';

export type ChecksumAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' | 'BLAKE3';

export interface AlgorithmOption {
    id: ChecksumAlgorithm;
    name: string;
    description: string;
}

export const CHECKSUM_ALGORITHMS: AlgorithmOption[] = [
    { id: 'MD5', name: 'MD5', description: 'Legacy, commonly used (insecure)' },
    { id: 'SHA-1', name: 'SHA-1', description: 'Legacy, commonly used (weak)' },
    { id: 'SHA-256', name: 'SHA-256', description: 'Secure standard' },
    { id: 'SHA-384', name: 'SHA-384', description: 'Secure (NSA)' },
    { id: 'SHA-512', name: 'SHA-512', description: 'High security' },
    { id: 'BLAKE3', name: 'BLAKE3', description: 'Ultra fast (next-gen)' },
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
        // Web Crypto Optimization for SHA family
        if (['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'].includes(algorithm) && crypto.subtle) {
            try {
                const hashBuffer = await crypto.subtle.digest(algorithm, data as BufferSource);
                return this.bytesToHex(new Uint8Array(hashBuffer));
            } catch (e) {
                // Fallback
            }
        }

        let hasher;
        switch (algorithm) {
            case 'MD5': hasher = md5.create(); break;
            case 'SHA-1': hasher = sha1.create(); break;
            case 'SHA-256': hasher = sha256.create(); break;
            case 'SHA-384': hasher = sha384.create(); break;
            case 'SHA-512': hasher = sha512.create(); break;
            case 'BLAKE3': hasher = blake3.create({}); break;
            default: throw new Error(`Unknown algorithm: ${algorithm}`);
        }

        hasher.update(data);
        return this.bytesToHex(hasher.digest());
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
            const chunkSize = 10 * 1024 * 1024; // 10MB
            const fileSize = file.size;
            let offset = 0;

            let hasher: any;
            switch (algorithm) {
                case 'MD5': hasher = md5.create(); break;
                case 'SHA-1': hasher = sha1.create(); break;
                case 'SHA-256': hasher = sha256.create(); break;
                case 'SHA-384': hasher = sha384.create(); break;
                case 'SHA-512': hasher = sha512.create(); break;
                case 'BLAKE3': hasher = blake3.create({}); break;
                default:
                    reject(new Error(`Unknown algorithm: ${algorithm}`));
                    return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                if (!e.target?.result) return;
                const buffer = e.target.result as ArrayBuffer;
                const uint8 = new Uint8Array(buffer);

                hasher.update(uint8);

                offset += buffer.byteLength;

                if (onProgress) {
                    onProgress(Math.min(100, Math.round((offset / fileSize) * 100)));
                }

                if (offset < fileSize) {
                    readNextChunk();
                } else {
                    resolve(this.bytesToHex(hasher.digest()));
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
