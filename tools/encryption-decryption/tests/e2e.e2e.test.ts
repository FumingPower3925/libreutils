import { describe, it, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const TOOL_ROOT = path.join(import.meta.dir, '..');

describe('Encryptor Tool E2E', () => {
    describe('Package Configuration', () => {
        it('package has correct name', () => {
            const pkg = JSON.parse(fs.readFileSync(path.join(TOOL_ROOT, 'package.json'), 'utf-8'));
            expect(pkg.name).toBe('@libreutils/encryption-decryption');
        });

        it('package has version', () => {
            const pkg = JSON.parse(fs.readFileSync(path.join(TOOL_ROOT, 'package.json'), 'utf-8'));
            expect(pkg.version).toBeDefined();
            expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
        });

        it('package has dependency on shared', () => {
            const pkg = JSON.parse(fs.readFileSync(path.join(TOOL_ROOT, 'package.json'), 'utf-8'));
            expect(pkg.dependencies['@libreutils/shared']).toBeDefined();
        });
    });

    describe('Tool Files', () => {
        it('tool exports encryptor class', () => {
            const indexPath = path.join(TOOL_ROOT, 'src/index.ts');
            const content = fs.readFileSync(indexPath, 'utf-8');
            expect(content).toContain('EncryptorTool');
        });

        it('tool exports UI renderer', () => {
            const indexPath = path.join(TOOL_ROOT, 'src/index.ts');
            const content = fs.readFileSync(indexPath, 'utf-8');
            expect(content).toContain('renderEncryptorPage');
        });

        it('tool exports encryption options', () => {
            const indexPath = path.join(TOOL_ROOT, 'src/index.ts');
            const content = fs.readFileSync(indexPath, 'utf-8');
            expect(content).toContain('ENCRYPTION_OPTIONS');
        });
    });

    describe('Tool Functionality Integration', () => {
        it('encryptor produces valid output', async () => {
            const { EncryptorTool } = await import('../src/tool');
            const result = await EncryptorTool.encryptText('test', 'password123');
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('encryption and decryption roundtrip works', async () => {
            const { EncryptorTool } = await import('../src/tool');
            const original = 'Hello, secure world!';
            const password = 'StrongP@ss123';

            const encrypted = await EncryptorTool.encryptText(original, password);
            const decrypted = await EncryptorTool.decryptText(encrypted, password);

            expect(decrypted).toBe(original);
        });

        it('wrong password fails decryption', async () => {
            const { EncryptorTool } = await import('../src/tool');
            const encrypted = await EncryptorTool.encryptText('secret', 'correct_password');

            await expect(EncryptorTool.decryptText(encrypted, 'wrong_password'))
                .rejects.toThrow();
        });
    });
});
