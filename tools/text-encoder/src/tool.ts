export type EncodingType =
    | 'base64'
    | 'base64url'
    | 'url'
    | 'urlComponent'
    | 'html'
    | 'unicode'
    | 'hex'
    | 'binary';

export interface EncodingOption {
    id: EncodingType;
    name: string;
    description: string;
}

export const ENCODING_OPTIONS: EncodingOption[] = [
    { id: 'base64', name: 'Base64', description: 'Standard Base64 encoding' },
    { id: 'base64url', name: 'Base64 URL', description: 'URL-safe Base64 encoding' },
    { id: 'url', name: 'URL Encode', description: 'Encode for URLs (encodeURI)' },
    { id: 'urlComponent', name: 'URL Component', description: 'Encode URL components (encodeURIComponent)' },
    { id: 'html', name: 'HTML Entities', description: 'Encode HTML special characters' },
    { id: 'unicode', name: 'Unicode Escape', description: 'JavaScript Unicode escape sequences' },
    { id: 'hex', name: 'Hexadecimal', description: 'Hexadecimal representation' },
    { id: 'binary', name: 'Binary', description: 'Binary representation (8-bit)' },
];

export class TextEncoderTool {
    static encode(text: string, type: EncodingType): string {
        switch (type) {
            case 'base64':
                return btoa(unescape(encodeURIComponent(text)));

            case 'base64url':
                const base64 = btoa(unescape(encodeURIComponent(text)));
                return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

            case 'url':
                return encodeURI(text);

            case 'urlComponent':
                return encodeURIComponent(text);

            case 'html':
                return text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');

            case 'unicode':
                return Array.from(text)
                    .map(char => {
                        const code = char.codePointAt(0);
                        if (code === undefined) return '';
                        if (code > 0xFFFF) {
                            return `\\u{${code.toString(16)}}`;
                        }
                        return `\\u${code.toString(16).padStart(4, '0')}`;
                    })
                    .join('');

            case 'hex':
                return Array.from(new TextEncoder().encode(text))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join(' ');

            case 'binary':
                return Array.from(new TextEncoder().encode(text))
                    .map(b => b.toString(2).padStart(8, '0'))
                    .join(' ');

            default:
                throw new Error(`Unknown encoding type: ${type}`);
        }
    }

    static decode(text: string, type: EncodingType): string {
        switch (type) {
            case 'base64':
                try {
                    return decodeURIComponent(escape(atob(text)));
                } catch {
                    throw new Error('Invalid Base64 string');
                }

            case 'base64url':
                try {
                    let base64 = text.replace(/-/g, '+').replace(/_/g, '/');
                    while (base64.length % 4) base64 += '=';
                    return decodeURIComponent(escape(atob(base64)));
                } catch {
                    throw new Error('Invalid Base64 URL string');
                }

            case 'url':
                try {
                    return decodeURI(text);
                } catch {
                    throw new Error('Invalid URL encoding');
                }

            case 'urlComponent':
                try {
                    return decodeURIComponent(text);
                } catch {
                    throw new Error('Invalid URL component encoding');
                }

            case 'html':
                const textarea = document.createElement('textarea');
                textarea.innerHTML = text;
                return textarea.value;

            case 'unicode':
                return text.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, (_, p1, p2) => {
                    const code = parseInt(p1 || p2, 16);
                    return String.fromCodePoint(code);
                });

            case 'hex':
                const hexBytes = text.replace(/\s+/g, '').match(/.{1,2}/g) || [];
                return new TextDecoder().decode(new Uint8Array(hexBytes.map(b => parseInt(b, 16))));

            case 'binary':
                const binaryBytes = text.split(/\s+/).filter(b => b);
                return new TextDecoder().decode(new Uint8Array(binaryBytes.map(b => parseInt(b, 2))));

            default:
                throw new Error(`Unknown encoding type: ${type}`);
        }
    }
}
