/**
 * Password Generator Tool E2E Tests
 */
import { describe, test, expect } from 'bun:test';
import pkg from '../package.json';

describe('Password Generator Tool E2E', () => {
    describe('Package Configuration', () => {
        test('package has correct name', () => {
            expect(pkg.name).toBe('@libreutils/tool-password-generator');
        });

        test('package has version', () => {
            expect(pkg.version).toBeTruthy();
        });

        test('package has dependency on shared', () => {
            expect(pkg.dependencies).toHaveProperty('@libreutils/shared');
        });
    });

    describe('Tool Files', () => {
        test('tool exports generator class', async () => {
            const { PasswordGenerator } = await import('../src/tool');
            expect(typeof PasswordGenerator.generate).toBe('function');
            expect(typeof PasswordGenerator.calculateStrength).toBe('function');
        });

        test('tool exports UI renderer', async () => {
            const { renderPasswordGeneratorPage } = await import('../src/page');
            expect(typeof renderPasswordGeneratorPage).toBe('function');
        });

        test('tool exports default options', async () => {
            const { DEFAULT_OPTIONS } = await import('../src/tool');
            expect(DEFAULT_OPTIONS).toBeDefined();
            expect(DEFAULT_OPTIONS.length).toBe(16);
        });
    });

    describe('Tool Functionality Integration', () => {
        test('generator produces valid output', async () => {
            const { PasswordGenerator } = await import('../src/tool');
            const password = PasswordGenerator.generate();
            expect(typeof password).toBe('string');
            expect(password.length).toBe(16);
        });

        test('strength calculator works', async () => {
            const { PasswordGenerator } = await import('../src/tool');
            const strength = PasswordGenerator.calculateStrength('Password123!');
            expect(strength.score).toBeDefined();
            expect(strength.label).toBeDefined();
        });
    });
});
