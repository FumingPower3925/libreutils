/**
 * Encryptor / Decryptor Tool - Core Cryptographic Logic
 * 
 * Security Design:
 * - PBKDF2-SHA256 for key derivation (configurable iterations, default 100,000)
 * - Random salt per encryption (configurable length, default 16 bytes)
 * - Random IV/nonce per encryption (12 bytes for GCM, 12 bytes for ChaCha20)
 * - Authenticated encryption (GCM mode for AES, Poly1305 for ChaCha20)
 * - No password storage
 */

export type EncryptionAlgorithm = 'AES-128-GCM' | 'AES-192-GCM' | 'AES-256-GCM' | 'ChaCha20-Poly1305';

export interface EncryptionOption {
    id: EncryptionAlgorithm;
    name: string;
    description: string;
    keyLength: number;
    supported: boolean;
}

// Default values for encryption parameters
export const DEFAULT_PBKDF2_ITERATIONS = 100000;
export const DEFAULT_SALT_LENGTH = 16;  // 128 bits
export const DEFAULT_IV_LENGTH = 12;    // 96 bits (GCM/ChaCha20 standard)

// Cache for ChaCha20 support detection
let _chacha20Supported: boolean | null = null;

/**
 * Check if ChaCha20-Poly1305 is supported in this browser
 */
export async function isChaCha20Supported(): Promise<boolean> {
    if (_chacha20Supported !== null) return _chacha20Supported;

    try {
        // Try to generate a ChaCha20-Poly1305 key
        await crypto.subtle.generateKey(
            { name: 'ChaCha20-Poly1305', length: 256 } as Algorithm,
            false,
            ['encrypt', 'decrypt']
        );
        _chacha20Supported = true;
    } catch {
        _chacha20Supported = false;
    }

    return _chacha20Supported;
}

/**
 * Get available encryption options with support status
 */
export async function getEncryptionOptions(): Promise<EncryptionOption[]> {
    const chacha20Supported = await isChaCha20Supported();

    return [
        {
            id: 'AES-256-GCM',
            name: 'AES-256-GCM',
            description: 'Strongest AES encryption (256-bit key)',
            keyLength: 256,
            supported: true
        },
        {
            id: 'AES-192-GCM',
            name: 'AES-192-GCM',
            description: 'Strong AES encryption (192-bit key)',
            keyLength: 192,
            supported: true
        },
        {
            id: 'AES-128-GCM',
            name: 'AES-128-GCM',
            description: 'Fast AES encryption (128-bit key)',
            keyLength: 128,
            supported: true
        },
        {
            id: 'ChaCha20-Poly1305',
            name: 'ChaCha20-Poly1305',
            description: chacha20Supported
                ? 'Modern stream cipher (256-bit key)'
                : 'Not supported in this browser',
            keyLength: 256,
            supported: chacha20Supported
        },
    ];
}

// Static list for immediate access (ChaCha20 shown but may be unsupported)
export const ENCRYPTION_OPTIONS: EncryptionOption[] = [
    { id: 'AES-256-GCM', name: 'AES-256-GCM', description: 'Strongest AES encryption (256-bit key)', keyLength: 256, supported: true },
    { id: 'AES-192-GCM', name: 'AES-192-GCM', description: 'Strong AES encryption (192-bit key)', keyLength: 192, supported: true },
    { id: 'AES-128-GCM', name: 'AES-128-GCM', description: 'Fast AES encryption (128-bit key)', keyLength: 128, supported: true },
    { id: 'ChaCha20-Poly1305', name: 'ChaCha20-Poly1305', description: 'Modern stream cipher (256-bit key)', keyLength: 256, supported: true },
];

export interface EncryptedPayload {
    v: number;
    alg: EncryptionAlgorithm;
    salt: string;
    iv: string;
    data: string;
    iter: number;
    filename?: string;
    mimeType?: string;
}

export interface AdvancedOptions {
    iterations?: number;
    saltLength?: number;
    ivLength?: number;
    filename?: string;
    mimeType?: string;
}

/**
 * Generate cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Convert Uint8Array to Base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Get key length for algorithm
 */
function getKeyLength(algorithm: EncryptionAlgorithm): number {
    switch (algorithm) {
        case 'AES-128-GCM': return 128;
        case 'AES-192-GCM': return 192;
        case 'AES-256-GCM': return 256;
        case 'ChaCha20-Poly1305': return 256;
        default: throw new Error(`Unknown algorithm: ${algorithm}`);
    }
}

/**
 * Get algorithm name for Web Crypto API
 */
function getCryptoAlgorithmName(algorithm: EncryptionAlgorithm): string {
    return algorithm.startsWith('AES') ? 'AES-GCM' : 'ChaCha20-Poly1305';
}

/**
 * Derive a CryptoKey from password using PBKDF2
 */
async function deriveKey(
    password: string,
    salt: Uint8Array,
    algorithm: EncryptionAlgorithm,
    iterations: number
): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    // Import password as raw key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBytes,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    const keyLength = getKeyLength(algorithm);
    const cryptoAlgName = getCryptoAlgorithmName(algorithm);

    // Derive the actual encryption key
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as BufferSource,
            iterations: iterations,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: cryptoAlgName, length: keyLength } as AesKeyGenParams,
        false,
        ['encrypt', 'decrypt']
    );
}

export class EncryptorTool {
    /**
     * Encrypt data with password
     * @param data - Raw bytes to encrypt
     * @param password - User password (never stored)
     * @param algorithm - Encryption algorithm to use
     * @param options - Advanced options for encryption parameters
     * @returns Base64-encoded JSON payload containing all encryption metadata
     */
    static async encrypt(
        data: Uint8Array,
        password: string,
        algorithm: EncryptionAlgorithm = 'AES-256-GCM',
        options: AdvancedOptions = {}
    ): Promise<string> {
        if (!password) {
            throw new Error('Password is required');
        }

        if (data.length === 0) {
            throw new Error('No data to encrypt');
        }

        // Check ChaCha20 support if needed
        if (algorithm === 'ChaCha20-Poly1305') {
            const supported = await isChaCha20Supported();
            if (!supported) {
                throw new Error('ChaCha20-Poly1305 is not supported in this browser');
            }
        }

        const iterations = options.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
        const saltLength = options.saltLength ?? DEFAULT_SALT_LENGTH;
        const ivLength = options.ivLength ?? DEFAULT_IV_LENGTH;

        // Generate unique salt and IV for this encryption
        const salt = generateRandomBytes(saltLength);
        const iv = generateRandomBytes(ivLength);

        // Derive key from password
        const key = await deriveKey(password, salt, algorithm, iterations);

        const cryptoAlgName = getCryptoAlgorithmName(algorithm);

        // Encrypt the data
        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: cryptoAlgName, iv: iv as BufferSource } as AesGcmParams,
            key,
            data as BufferSource
        );

        // Create payload with all necessary decryption info
        const payload: EncryptedPayload = {
            v: 1,
            alg: algorithm,
            salt: bytesToBase64(salt),
            iv: bytesToBase64(iv),
            data: bytesToBase64(new Uint8Array(encryptedBuffer)),
            iter: iterations,
            ...(options.filename && { filename: options.filename }),
            ...(options.mimeType && { mimeType: options.mimeType })
        };

        // Return as Base64-encoded JSON for easy copy/paste
        return bytesToBase64(new TextEncoder().encode(JSON.stringify(payload)));
    }

    /**
     * Encrypt text string with password
     */
    static async encryptText(
        text: string,
        password: string,
        algorithm: EncryptionAlgorithm = 'AES-256-GCM',
        options: AdvancedOptions = {}
    ): Promise<string> {
        const encoder = new TextEncoder();
        return this.encrypt(encoder.encode(text), password, algorithm, options);
    }

    /**
     * Decrypt encrypted payload with password
     * @param encrypted - Base64-encoded JSON payload from encrypt()
     * @param password - User password
     * @returns Decrypted raw bytes
     */
    static async decrypt(
        encrypted: string,
        password: string
    ): Promise<Uint8Array> {
        if (!password) {
            throw new Error('Password is required');
        }

        if (!encrypted) {
            throw new Error('No data to decrypt');
        }

        // Parse the payload
        let payload: EncryptedPayload;
        try {
            const jsonStr = new TextDecoder().decode(base64ToBytes(encrypted));
            payload = JSON.parse(jsonStr);
        } catch {
            throw new Error('Invalid encrypted data format');
        }

        // Validate payload version
        if (payload.v !== 1) {
            throw new Error(`Unsupported encryption version: ${payload.v}`);
        }

        // Validate algorithm
        const validAlgorithms: EncryptionAlgorithm[] = ['AES-128-GCM', 'AES-192-GCM', 'AES-256-GCM', 'ChaCha20-Poly1305'];
        if (!validAlgorithms.includes(payload.alg)) {
            throw new Error(`Unsupported algorithm: ${payload.alg}`);
        }

        // Check ChaCha20 support if needed
        if (payload.alg === 'ChaCha20-Poly1305') {
            const supported = await isChaCha20Supported();
            if (!supported) {
                throw new Error('ChaCha20-Poly1305 is not supported in this browser');
            }
        }

        // Decode components
        const salt = base64ToBytes(payload.salt);
        const iv = base64ToBytes(payload.iv);
        const ciphertext = base64ToBytes(payload.data);

        // Derive key using same parameters
        const key = await deriveKey(password, salt, payload.alg, payload.iter);

        const cryptoAlgName = getCryptoAlgorithmName(payload.alg);

        // Decrypt
        try {
            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: cryptoAlgName, iv: iv as BufferSource } as AesGcmParams,
                key,
                ciphertext as BufferSource
            );

            return new Uint8Array(decryptedBuffer);
        } catch {
            throw new Error('Decryption failed: incorrect password or corrupted data');
        }
    }

    /**
     * Decrypt to text string
     */
    static async decryptText(
        encrypted: string,
        password: string
    ): Promise<string> {
        const decrypted = await this.decrypt(encrypted, password);
        return new TextDecoder().decode(decrypted);
    }

    /**
     * Decrypt with metadata (returns data, filename, and mimeType if present)
     */
    static async decryptWithMetadata(
        encrypted: string,
        password: string
    ): Promise<{ data: Uint8Array; filename?: string; mimeType?: string }> {
        if (!password) {
            throw new Error('Password is required');
        }

        if (!encrypted) {
            throw new Error('No data to decrypt');
        }

        let payload: EncryptedPayload;
        try {
            const jsonStr = new TextDecoder().decode(base64ToBytes(encrypted));
            payload = JSON.parse(jsonStr);
        } catch {
            throw new Error('Invalid encrypted data format');
        }

        const data = await this.decrypt(encrypted, password);

        return {
            data,
            filename: payload.filename,
            mimeType: payload.mimeType
        };
    }

    /**
     * Get algorithm info
     */
    static getAlgorithmInfo(algorithm: EncryptionAlgorithm): EncryptionOption | undefined {
        return ENCRYPTION_OPTIONS.find(opt => opt.id === algorithm);
    }
}
