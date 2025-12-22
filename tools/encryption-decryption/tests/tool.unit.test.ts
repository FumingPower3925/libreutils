import { describe, it, expect, beforeAll } from 'bun:test';
import { EncryptorTool, ENCRYPTION_OPTIONS } from '../src/tool';
import type { EncryptionAlgorithm } from '../src/tool';

// Mock crypto for tests if not available (Bun should have it)
beforeAll(() => {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        throw new Error('WebCrypto API not available in test environment');
    }
});

describe('EncryptorTool', () => {
    const testPassword = 'SecureP@ssw0rd!123';
    const testText = 'Hello, World! This is a secret message. 🔐';
    const testData = new TextEncoder().encode(testText);

    describe('encrypt', () => {
        it('encrypts data with AES-256-GCM', async () => {
            const encrypted = await EncryptorTool.encrypt(testData, testPassword, 'AES-256-GCM');

            expect(encrypted).toBeDefined();
            expect(typeof encrypted).toBe('string');
            expect(encrypted.length).toBeGreaterThan(0);
            // Should be Base64 encoded
            expect(() => atob(encrypted)).not.toThrow();
        });

        it('encrypts data with AES-128-GCM', async () => {
            const encrypted = await EncryptorTool.encrypt(testData, testPassword, 'AES-128-GCM');

            expect(encrypted).toBeDefined();
            expect(typeof encrypted).toBe('string');
        });

        it('throws error for empty password', async () => {
            await expect(EncryptorTool.encrypt(testData, '', 'AES-256-GCM'))
                .rejects.toThrow('Password is required');
        });

        it('throws error for empty data', async () => {
            await expect(EncryptorTool.encrypt(new Uint8Array(0), testPassword, 'AES-256-GCM'))
                .rejects.toThrow('No data to encrypt');
        });

        it('produces different ciphertext for same plaintext (unique salt/IV)', async () => {
            const encrypted1 = await EncryptorTool.encrypt(testData, testPassword, 'AES-256-GCM');
            const encrypted2 = await EncryptorTool.encrypt(testData, testPassword, 'AES-256-GCM');

            // Same plaintext + password should produce different ciphertexts due to random salt/IV
            expect(encrypted1).not.toBe(encrypted2);
        });
    });

    describe('decrypt', () => {
        it('decrypts AES-256-GCM encrypted data', async () => {
            const encrypted = await EncryptorTool.encrypt(testData, testPassword, 'AES-256-GCM');
            const decrypted = await EncryptorTool.decrypt(encrypted, testPassword);

            expect(decrypted).toEqual(testData);
        });

        it('decrypts AES-128-GCM encrypted data', async () => {
            const encrypted = await EncryptorTool.encrypt(testData, testPassword, 'AES-128-GCM');
            const decrypted = await EncryptorTool.decrypt(encrypted, testPassword);

            expect(decrypted).toEqual(testData);
        });

        it('throws error for empty password', async () => {
            const encrypted = await EncryptorTool.encrypt(testData, testPassword, 'AES-256-GCM');

            await expect(EncryptorTool.decrypt(encrypted, ''))
                .rejects.toThrow('Password is required');
        });

        it('throws error for empty encrypted data', async () => {
            await expect(EncryptorTool.decrypt('', testPassword))
                .rejects.toThrow('No data to decrypt');
        });

        it('throws error for invalid encrypted data format', async () => {
            await expect(EncryptorTool.decrypt('not-valid-base64!!!', testPassword))
                .rejects.toThrow();
        });

        it('throws error for wrong password', async () => {
            const encrypted = await EncryptorTool.encrypt(testData, testPassword, 'AES-256-GCM');

            await expect(EncryptorTool.decrypt(encrypted, 'wrongpassword'))
                .rejects.toThrow('Decryption failed');
        });
    });

    describe('encryptText / decryptText', () => {
        it('encrypts and decrypts text with AES-256-GCM', async () => {
            const encrypted = await EncryptorTool.encryptText(testText, testPassword, 'AES-256-GCM');
            const decrypted = await EncryptorTool.decryptText(encrypted, testPassword);

            expect(decrypted).toBe(testText);
        });

        it('encrypts and decrypts text with AES-128-GCM', async () => {
            const encrypted = await EncryptorTool.encryptText(testText, testPassword, 'AES-128-GCM');
            const decrypted = await EncryptorTool.decryptText(encrypted, testPassword);

            expect(decrypted).toBe(testText);
        });

        it('handles Unicode text correctly', async () => {
            const unicodeText = '日本語テスト 🎉 العربية 中文 한국어';
            const encrypted = await EncryptorTool.encryptText(unicodeText, testPassword);
            const decrypted = await EncryptorTool.decryptText(encrypted, testPassword);

            expect(decrypted).toBe(unicodeText);
        });

        it('handles empty string (edge case for text, not bytes)', async () => {
            // Empty text should still work (empty string encodes to empty bytes)
            // But our encrypt throws for empty data, so we expect an error
            await expect(EncryptorTool.encryptText('', testPassword))
                .rejects.toThrow('No data to encrypt');
        });
    });

    describe('roundtrip', () => {
        const algorithms: EncryptionAlgorithm[] = ['AES-128-GCM', 'AES-192-GCM', 'AES-256-GCM'];

        for (const algorithm of algorithms) {
            it(`${algorithm} roundtrip preserves data integrity`, async () => {
                const originalData = new Uint8Array(1024);
                crypto.getRandomValues(originalData);

                const encrypted = await EncryptorTool.encrypt(originalData, testPassword, algorithm);
                const decrypted = await EncryptorTool.decrypt(encrypted, testPassword);

                expect(decrypted).toEqual(originalData);
            });
        }

        it('handles large data (1MB)', async () => {
            const largeData = new Uint8Array(1024 * 1024); // 1MB
            crypto.getRandomValues(largeData);

            const encrypted = await EncryptorTool.encrypt(largeData, testPassword, 'AES-256-GCM');
            const decrypted = await EncryptorTool.decrypt(encrypted, testPassword);

            expect(decrypted.length).toBe(largeData.length);
            expect(decrypted).toEqual(largeData);
        });
    });

    describe('file encryption with filename preservation', () => {
        const algorithms: EncryptionAlgorithm[] = ['AES-128-GCM', 'AES-192-GCM', 'AES-256-GCM'];

        // Simulate binary file content (like an image)
        const createMockBinaryFile = (size: number): Uint8Array => {
            const data = new Uint8Array(size);
            // Fill with random binary data to simulate a file
            crypto.getRandomValues(data);
            return data;
        };

        for (const algorithm of algorithms) {
            describe(`${algorithm}`, () => {
                it('preserves original filename in encrypted payload', async () => {
                    const mockFileData = createMockBinaryFile(2048);
                    const originalFilename = 'test-image.png';

                    const encrypted = await EncryptorTool.encrypt(mockFileData, testPassword, algorithm, {
                        filename: originalFilename
                    });

                    const { data: decrypted, filename } = await EncryptorTool.decryptWithMetadata(encrypted, testPassword);

                    expect(filename).toBe(originalFilename);
                    expect(decrypted).toEqual(mockFileData);
                });

                it('handles files with special characters in filename', async () => {
                    const mockFileData = createMockBinaryFile(512);
                    const originalFilename = 'my file (2024) - copy [final].pdf';

                    const encrypted = await EncryptorTool.encrypt(mockFileData, testPassword, algorithm, {
                        filename: originalFilename
                    });

                    const { data: decrypted, filename } = await EncryptorTool.decryptWithMetadata(encrypted, testPassword);

                    expect(filename).toBe(originalFilename);
                    expect(decrypted).toEqual(mockFileData);
                });

                it('handles Unicode filenames', async () => {
                    const mockFileData = createMockBinaryFile(256);
                    const originalFilename = '日本語ファイル_🎨.jpg';

                    const encrypted = await EncryptorTool.encrypt(mockFileData, testPassword, algorithm, {
                        filename: originalFilename
                    });

                    const { data: decrypted, filename } = await EncryptorTool.decryptWithMetadata(encrypted, testPassword);

                    expect(filename).toBe(originalFilename);
                    expect(decrypted).toEqual(mockFileData);
                });

                it('works without filename (undefined)', async () => {
                    const mockFileData = createMockBinaryFile(256);

                    const encrypted = await EncryptorTool.encrypt(mockFileData, testPassword, algorithm);
                    const { data: decrypted, filename } = await EncryptorTool.decryptWithMetadata(encrypted, testPassword);

                    expect(filename).toBeUndefined();
                    expect(decrypted).toEqual(mockFileData);
                });
            });
        }

        it('preserves binary data integrity (various file sizes)', async () => {
            const sizes = [1, 100, 1024, 10 * 1024, 100 * 1024]; // 1B to 100KB

            for (const size of sizes) {
                const mockFileData = createMockBinaryFile(size);
                const originalFilename = `file_${size}bytes.bin`;

                const encrypted = await EncryptorTool.encrypt(mockFileData, testPassword, 'AES-256-GCM', {
                    filename: originalFilename
                });

                const { data: decrypted, filename } = await EncryptorTool.decryptWithMetadata(encrypted, testPassword);

                expect(filename).toBe(originalFilename);
                expect(decrypted.length).toBe(size);
                expect(decrypted).toEqual(mockFileData);
            }
        });

        it('preserves binary data with null bytes', async () => {
            // Create data with null bytes (common in binary files)
            const mockFileData = new Uint8Array([0, 1, 0, 0, 255, 0, 128, 0, 0, 64]);
            const originalFilename = 'binary_with_nulls.dat';

            const encrypted = await EncryptorTool.encrypt(mockFileData, testPassword, 'AES-256-GCM', {
                filename: originalFilename
            });

            const { data: decrypted, filename } = await EncryptorTool.decryptWithMetadata(encrypted, testPassword);

            expect(filename).toBe(originalFilename);
            expect(decrypted).toEqual(mockFileData);
        });

        it('handles various file extensions correctly', async () => {
            const extensions = ['.png', '.jpg', '.pdf', '.docx', '.mp4', '.zip', '.exe', '.tar.gz'];

            for (const ext of extensions) {
                const mockFileData = createMockBinaryFile(128);
                const originalFilename = `testfile${ext}`;

                const encrypted = await EncryptorTool.encrypt(mockFileData, testPassword, 'AES-256-GCM', {
                    filename: originalFilename
                });

                const { data: decrypted, filename } = await EncryptorTool.decryptWithMetadata(encrypted, testPassword);

                expect(filename).toBe(originalFilename);
                expect(decrypted).toEqual(mockFileData);
            }
        });

        it('preserves mimeType in encrypted payload', async () => {
            const mockFileData = createMockBinaryFile(512);
            const testMimeType = 'image/png';

            const encrypted = await EncryptorTool.encrypt(mockFileData, testPassword, 'AES-256-GCM', {
                filename: 'test.png',
                mimeType: testMimeType
            });

            const { mimeType } = await EncryptorTool.decryptWithMetadata(encrypted, testPassword);

            expect(mimeType).toBe(testMimeType);
        });

        it('handles various mimeTypes correctly', async () => {
            const mimeTypes = [
                'image/png',
                'image/jpeg',
                'application/pdf',
                'video/mp4',
                'application/octet-stream'
            ];

            for (const testMimeType of mimeTypes) {
                const mockFileData = createMockBinaryFile(128);

                const encrypted = await EncryptorTool.encrypt(mockFileData, testPassword, 'AES-256-GCM', {
                    mimeType: testMimeType
                });

                const { mimeType } = await EncryptorTool.decryptWithMetadata(encrypted, testPassword);

                expect(mimeType).toBe(testMimeType);
            }
        });

        it('works without mimeType (undefined)', async () => {
            const mockFileData = createMockBinaryFile(128);

            const encrypted = await EncryptorTool.encrypt(mockFileData, testPassword, 'AES-256-GCM');
            const { mimeType } = await EncryptorTool.decryptWithMetadata(encrypted, testPassword);

            expect(mimeType).toBeUndefined();
        });
    });

    describe('ENCRYPTION_OPTIONS', () => {
        it('has all required encryption algorithms', () => {
            const ids = ENCRYPTION_OPTIONS.map(opt => opt.id);

            expect(ids).toContain('AES-256-GCM');
            expect(ids).toContain('AES-192-GCM');
            expect(ids).toContain('AES-128-GCM');
            expect(ids).toContain('ChaCha20-Poly1305');
        });

        it('all options have required fields', () => {
            for (const option of ENCRYPTION_OPTIONS) {
                expect(option.id).toBeDefined();
                expect(option.name).toBeDefined();
                expect(option.description).toBeDefined();
                expect(option.keyLength).toBeGreaterThan(0);
            }
        });
    });

    describe('getAlgorithmInfo', () => {
        it('returns info for valid algorithm', () => {
            const info = EncryptorTool.getAlgorithmInfo('AES-256-GCM');

            expect(info).toBeDefined();
            expect(info?.id).toBe('AES-256-GCM');
            expect(info?.keyLength).toBe(256);
        });

        it('returns undefined for invalid algorithm', () => {
            const info = EncryptorTool.getAlgorithmInfo('INVALID' as any);

            expect(info).toBeUndefined();
        });
    });
});
