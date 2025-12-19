export interface PasswordOptions {
    length: number;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
    excludeAmbiguous: boolean;
    excludeChars: string;
}

export interface PasswordStrength {
    score: number;
    label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
    color: string;
    entropy: number;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'Il1O0';

export const DEFAULT_OPTIONS: PasswordOptions = {
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
    excludeChars: '',
};

export class PasswordGenerator {
    static generate(options: PasswordOptions = DEFAULT_OPTIONS): string {
        let charset = '';

        if (options.uppercase) charset += UPPERCASE;
        if (options.lowercase) charset += LOWERCASE;
        if (options.numbers) charset += NUMBERS;
        if (options.symbols) charset += SYMBOLS;

        if (!charset) {
            throw new Error('At least one character type must be selected');
        }

        // Remove ambiguous characters if requested
        if (options.excludeAmbiguous) {
            for (const char of AMBIGUOUS) {
                charset = charset.replace(new RegExp(char, 'g'), '');
            }
        }

        // Remove custom excluded characters
        if (options.excludeChars) {
            for (const char of options.excludeChars) {
                charset = charset.replace(new RegExp(this.escapeRegExp(char), 'g'), '');
            }
        }

        if (charset.length === 0) {
            throw new Error('No characters available after exclusions');
        }

        // Use crypto.getRandomValues for cryptographically secure randomness
        const array = new Uint32Array(options.length);
        crypto.getRandomValues(array);

        let password = '';
        for (let i = 0; i < options.length; i++) {
            password += charset[array[i] % charset.length];
        }

        // Ensure at least one character from each selected type
        password = this.ensureCharacterTypes(password, options, charset);

        return password;
    }

    private static escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private static ensureCharacterTypes(
        password: string,
        options: PasswordOptions,
        charset: string
    ): string {
        const chars = password.split('');
        const positions = new Set<number>();

        const getRandomPosition = (): number => {
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);
            return array[0] % password.length;
        };

        const getRandomChar = (set: string): string => {
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);
            return set[array[0] % set.length];
        };

        const ensureType = (charSet: string): void => {
            let filtered = charSet;
            if (options.excludeAmbiguous) {
                for (const char of AMBIGUOUS) {
                    filtered = filtered.replace(new RegExp(char, 'g'), '');
                }
            }
            if (options.excludeChars) {
                for (const char of options.excludeChars) {
                    filtered = filtered.replace(new RegExp(this.escapeRegExp(char), 'g'), '');
                }
            }
            if (filtered.length === 0) return;

            const hasType = chars.some(c => filtered.includes(c));
            if (!hasType) {
                let pos: number;
                do {
                    pos = getRandomPosition();
                } while (positions.has(pos));
                positions.add(pos);
                chars[pos] = getRandomChar(filtered);
            }
        };

        if (options.uppercase) ensureType(UPPERCASE);
        if (options.lowercase) ensureType(LOWERCASE);
        if (options.numbers) ensureType(NUMBERS);
        if (options.symbols) ensureType(SYMBOLS);

        return chars.join('');
    }

    static calculateStrength(password: string): PasswordStrength {
        if (!password) {
            return { score: 0, label: 'Very Weak', color: '#dc2626', entropy: 0 };
        }

        // Calculate character set size
        let charsetSize = 0;
        if (/[a-z]/.test(password)) charsetSize += 26;
        if (/[A-Z]/.test(password)) charsetSize += 26;
        if (/[0-9]/.test(password)) charsetSize += 10;
        if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;

        // Calculate entropy: log2(charset^length)
        const entropy = password.length * Math.log2(charsetSize || 1);

        // Score based on entropy
        let score: number;
        let label: PasswordStrength['label'];
        let color: string;

        if (entropy < 28) {
            score = 1;
            label = 'Very Weak';
            color = '#dc2626';
        } else if (entropy < 36) {
            score = 2;
            label = 'Weak';
            color = '#f97316';
        } else if (entropy < 60) {
            score = 3;
            label = 'Fair';
            color = '#eab308';
        } else if (entropy < 80) {
            score = 4;
            label = 'Strong';
            color = '#22c55e';
        } else {
            score = 5;
            label = 'Very Strong';
            color = '#16a34a';
        }

        return { score, label, color, entropy: Math.round(entropy) };
    }

    static generateMultiple(count: number, options: PasswordOptions = DEFAULT_OPTIONS): string[] {
        const passwords: string[] = [];
        for (let i = 0; i < count; i++) {
            passwords.push(this.generate(options));
        }
        return passwords;
    }
}
