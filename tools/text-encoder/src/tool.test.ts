import { describe, test, expect } from 'bun:test';
import { TextEncoderTool, ENCODING_OPTIONS, type EncodingType } from './tool';

describe('TextEncoderTool', () => {
    describe('encode', () => {
        test('encodes to Base64', () => {
            expect(TextEncoderTool.encode('Hello World', 'base64')).toBe('SGVsbG8gV29ybGQ=');
        });

        test('encodes to Base64 URL', () => {
            const result = TextEncoderTool.encode('Hello+World/Test', 'base64url');
            expect(result).not.toContain('+');
            expect(result).not.toContain('/');
            expect(result).not.toContain('=');
        });

        test('encodes URL', () => {
            expect(TextEncoderTool.encode('hello world', 'url')).toBe('hello%20world');
        });

        test('encodes URL Component', () => {
            expect(TextEncoderTool.encode('a=b&c=d', 'urlComponent')).toBe('a%3Db%26c%3Dd');
        });

        test('encodes HTML entities', () => {
            expect(TextEncoderTool.encode('<script>', 'html')).toBe('&lt;script&gt;');
            expect(TextEncoderTool.encode('A & B', 'html')).toBe('A &amp; B');
        });

        test('encodes to Unicode escape sequences', () => {
            const result = TextEncoderTool.encode('A', 'unicode');
            expect(result).toBe('\\u0041');
        });

        test('encodes to Hexadecimal', () => {
            expect(TextEncoderTool.encode('AB', 'hex')).toBe('41 42');
        });

        test('encodes to Binary', () => {
            expect(TextEncoderTool.encode('A', 'binary')).toBe('01000001');
        });

        test('throws on unknown encoding type', () => {
            expect(() => TextEncoderTool.encode('test', 'unknown' as unknown as EncodingType)).toThrow();
        });
    });

    describe('decode', () => {
        test('decodes from Base64', () => {
            expect(TextEncoderTool.decode('SGVsbG8gV29ybGQ=', 'base64')).toBe('Hello World');
        });

        test('decodes from Base64 URL', () => {
            const encoded = TextEncoderTool.encode('Hello World', 'base64url');
            expect(TextEncoderTool.decode(encoded, 'base64url')).toBe('Hello World');
        });

        test('decodes URL', () => {
            expect(TextEncoderTool.decode('hello%20world', 'url')).toBe('hello world');
        });

        test('decodes URL Component', () => {
            expect(TextEncoderTool.decode('a%3Db%26c%3Dd', 'urlComponent')).toBe('a=b&c=d');
        });

        test('decodes Unicode escape sequences', () => {
            expect(TextEncoderTool.decode('\\u0041\\u0042', 'unicode')).toBe('AB');
        });

        test('decodes Hexadecimal', () => {
            expect(TextEncoderTool.decode('41 42', 'hex')).toBe('AB');
        });

        test('decodes Binary', () => {
            expect(TextEncoderTool.decode('01000001', 'binary')).toBe('A');
        });

        test('throws on invalid Base64', () => {
            expect(() => TextEncoderTool.decode('!!!invalid!!!', 'base64')).toThrow('Invalid Base64');
        });

        test('throws on unknown decoding type', () => {
            expect(() => TextEncoderTool.decode('test', 'unknown' as unknown as EncodingType)).toThrow();
        });
    });

    describe('roundtrip', () => {
        const testString = 'Hello, \u4e16\u754c! \u2605';

        test('Base64 roundtrip', () => {
            const encoded = TextEncoderTool.encode(testString, 'base64');
            expect(TextEncoderTool.decode(encoded, 'base64')).toBe(testString);
        });

        test('Base64 URL roundtrip', () => {
            const encoded = TextEncoderTool.encode(testString, 'base64url');
            expect(TextEncoderTool.decode(encoded, 'base64url')).toBe(testString);
        });

        test('URL Component roundtrip', () => {
            const encoded = TextEncoderTool.encode(testString, 'urlComponent');
            expect(TextEncoderTool.decode(encoded, 'urlComponent')).toBe(testString);
        });

        test('Hex roundtrip', () => {
            const encoded = TextEncoderTool.encode(testString, 'hex');
            expect(TextEncoderTool.decode(encoded, 'hex')).toBe(testString);
        });
    });

    describe('ENCODING_OPTIONS', () => {
        test('has all required encoding types', () => {
            const ids = ENCODING_OPTIONS.map(o => o.id);
            expect(ids).toContain('base64');
            expect(ids).toContain('url');
            expect(ids).toContain('html');
            expect(ids).toContain('hex');
        });

        test('all options have name and description', () => {
            ENCODING_OPTIONS.forEach(option => {
                expect(option.name).toBeTruthy();
                expect(option.description).toBeTruthy();
            });
        });
    });
});
