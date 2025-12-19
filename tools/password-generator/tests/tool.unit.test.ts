import { describe, expect, test } from 'bun:test';
import { PasswordGenerator, DEFAULT_OPTIONS, type PasswordOptions } from '../src/tool';

describe('PasswordGenerator', () => {
    describe('generate', () => {
        test('generates password of specified length', () => {
            const password = PasswordGenerator.generate({ ...DEFAULT_OPTIONS, length: 20 });
            expect(password).toHaveLength(20);
        });

        test('generates password with default length of 16', () => {
            const password = PasswordGenerator.generate();
            expect(password).toHaveLength(16);
        });

        test('throws error for invalid length', () => {
            expect(() => PasswordGenerator.generate({ ...DEFAULT_OPTIONS, length: 3 })).toThrow('Password length must be between 4 and 2048');
            expect(() => PasswordGenerator.generate({ ...DEFAULT_OPTIONS, length: 2049 })).toThrow('Password length must be between 4 and 2048');
        });

        test('generates password with only uppercase', () => {
            const options: PasswordOptions = {
                ...DEFAULT_OPTIONS,
                length: 10,
                uppercase: true,
                lowercase: false,
                numbers: false,
                symbols: false,
            };
            const password = PasswordGenerator.generate(options);
            expect(password).toMatch(/^[A-Z]+$/);
        });

        test('generates password with only lowercase', () => {
            const options: PasswordOptions = {
                ...DEFAULT_OPTIONS,
                length: 10,
                uppercase: false,
                lowercase: true,
                numbers: false,
                symbols: false,
            };
            const password = PasswordGenerator.generate(options);
            expect(password).toMatch(/^[a-z]+$/);
        });

        test('generates password with only numbers', () => {
            const options: PasswordOptions = {
                ...DEFAULT_OPTIONS,
                length: 10,
                uppercase: false,
                lowercase: false,
                numbers: true,
                symbols: false,
            };
            const password = PasswordGenerator.generate(options);
            expect(password).toMatch(/^[0-9]+$/);
        });

        test('excludes ambiguous characters when requested', () => {
            const options: PasswordOptions = {
                ...DEFAULT_OPTIONS,
                length: 100,
                excludeAmbiguous: true,
            };
            const password = PasswordGenerator.generate(options);
            expect(password).not.toMatch(/[Il1O0]/);
        });

        test('throws error when no character types selected', () => {
            const options: PasswordOptions = {
                ...DEFAULT_OPTIONS,
                uppercase: false,
                lowercase: false,
                numbers: false,
                symbols: false,
            };
            expect(() => PasswordGenerator.generate(options)).toThrow('At least one character type must be selected');
        });

        test('generates unique passwords each time', () => {
            const passwords = new Set<string>();
            for (let i = 0; i < 100; i++) {
                passwords.add(PasswordGenerator.generate());
            }
            expect(passwords.size).toBe(100);
        });
    });

    describe('calculateStrength', () => {
        test('returns Very Weak for empty password', () => {
            const strength = PasswordGenerator.calculateStrength('');
            expect(strength.label).toBe('Very Weak');
            expect(strength.score).toBe(0);
        });

        test('returns Very Weak for short password', () => {
            const strength = PasswordGenerator.calculateStrength('abc');
            expect(strength.label).toBe('Very Weak');
        });

        test('returns Strong for 16-char mixed password', () => {
            const password = PasswordGenerator.generate({ ...DEFAULT_OPTIONS, length: 16 });
            const strength = PasswordGenerator.calculateStrength(password);
            expect(strength.label).toBe('Strong');
            expect(strength.score).toBe(4);
        });

        test('returns Very Strong for 32-char password', () => {
            const password = PasswordGenerator.generate({ ...DEFAULT_OPTIONS, length: 32 });
            const strength = PasswordGenerator.calculateStrength(password);
            expect(strength.label).toBe('Very Strong');
            expect(strength.score).toBe(5);
        });

        test('returns Unbreakable for extremely long password (entropy > 512)', () => {
            const password = PasswordGenerator.generate({ ...DEFAULT_OPTIONS, length: 100 });
            const strength = PasswordGenerator.calculateStrength(password);
            expect(strength.label).toBe('Unbreakable');
            expect(strength.score).toBe(6);
        });

        test('calculates entropy correctly', () => {
            const strength = PasswordGenerator.calculateStrength('AAAAAAAA');
            expect(strength.entropy).toBeGreaterThan(0);
        });
    });

    describe('generateMultiple', () => {
        test('generates specified number of passwords', () => {
            const passwords = PasswordGenerator.generateMultiple(5);
            expect(passwords).toHaveLength(5);
        });

        test('generates unique passwords', () => {
            const passwords = PasswordGenerator.generateMultiple(10);
            const uniquePasswords = new Set(passwords);
            expect(uniquePasswords.size).toBe(10);
        });

        test('throws error for invalid count', () => {
            expect(() => PasswordGenerator.generateMultiple(0)).toThrow('Count must be between 1 and 1000');
            expect(() => PasswordGenerator.generateMultiple(1001)).toThrow('Count must be between 1 and 1000');
        });
    });

    describe('generateMemorable', () => {
        test('generates memorable password with words', () => {
            const options: PasswordOptions = { ...DEFAULT_OPTIONS, memorable: true, length: 20 };
            const password = PasswordGenerator.generate(options);
            // Should contain words separated by something
            expect(password).toMatch(/[a-z]+/i);
            expect(password.length).toBeLessThanOrEqual(20);
        });

        test('respects uppercase option in memorable passwords', () => {
            const options: PasswordOptions = { ...DEFAULT_OPTIONS, memorable: true, uppercase: true };
            const password = PasswordGenerator.generate(options);
            // Words should be capitalized
            expect(password).toMatch(/[A-Z][a-z]*/);
        });

        test('includes numbers if requested', () => {
            const options: PasswordOptions = { ...DEFAULT_OPTIONS, memorable: true, numbers: true };
            // Generate multiple to ensure we catch the number addition
            const passwords = PasswordGenerator.generateMultiple(5, options);
            const hasNumbers = passwords.some(p => /\d/.test(p));
            expect(hasNumbers).toBe(true);
        });
    });
});
