export interface PasswordOptions {
    /** Length of the generated password (4-2048) */
    length: number;
    /** Include uppercase letters (A-Z) */
    uppercase: boolean;
    /** Include lowercase letters (a-z) */
    lowercase: boolean;
    /** Include numbers (0-9) */
    numbers: boolean;
    /** Include special symbols (!@#$...) */
    symbols: boolean;
    /** Exclude visually similar characters (e.g. I, l, 1, O, 0) */
    excludeAmbiguous: boolean;
    /** String of specific characters to exclude */
    excludeChars: string;
    /** Generate a memorable password (words separated by symbols) */
    memorable: boolean;
}

export interface PasswordStrength {
    score: number;
    label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong' | 'Unbreakable';
    color: string;
    entropy: number;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'Il1O0';

const WORD_LIST = [
    'apple', 'arrow', 'beach', 'berry', 'bird', 'blade', 'blaze', 'bloom', 'blue', 'bolt',
    'brave', 'bread', 'brick', 'bridge', 'bright', 'brook', 'butter', 'cabin', 'cake', 'calm',
    'candy', 'cargo', 'castle', 'cedar', 'chain', 'chalk', 'charm', 'chase', 'chess', 'chill',
    'cliff', 'cloud', 'clover', 'coast', 'coral', 'cozy', 'crane', 'crisp', 'crown', 'crystal',
    'dance', 'dawn', 'delta', 'dream', 'drift', 'eagle', 'earth', 'echo', 'ember', 'fable',
    'falcon', 'field', 'flame', 'flash', 'fleet', 'flint', 'flora', 'forge', 'fox', 'frost',
    'garden', 'gem', 'ghost', 'glade', 'gleam', 'globe', 'glory', 'gold', 'grape', 'green',
    'grove', 'guide', 'halo', 'harbor', 'hawk', 'heart', 'hearth', 'hedge', 'hero', 'honey',
    'hope', 'horse', 'ice', 'iron', 'island', 'ivy', 'jade', 'jazz', 'jewel', 'jungle',
    'karma', 'kite', 'lake', 'lamp', 'lark', 'lemon', 'light', 'lily', 'lion', 'lotus',
    'lunar', 'magic', 'maple', 'marble', 'meadow', 'mist', 'moon', 'moss', 'mountain', 'nest',
    'noble', 'north', 'oak', 'ocean', 'olive', 'onyx', 'opal', 'orbit', 'orchid', 'owl',
    'palm', 'paper', 'path', 'pearl', 'pebble', 'pepper', 'pine', 'pixel', 'plain', 'planet',
    'plaza', 'plum', 'pond', 'prism', 'pulse', 'quartz', 'quest', 'quiet', 'rain', 'raven',
    'realm', 'reef', 'ridge', 'river', 'robin', 'rock', 'rose', 'ruby', 'sage', 'sail',
    'sand', 'sapphire', 'shade', 'shadow', 'shell', 'shine', 'silver', 'sky', 'slate', 'snow',
    'solar', 'song', 'spark', 'spice', 'spirit', 'spring', 'spruce', 'star', 'steam', 'steel',
    'stone', 'storm', 'stream', 'summit', 'sun', 'swift', 'temple', 'thistle', 'thunder', 'tide',
    'tiger', 'tower', 'trail', 'tree', 'tulip', 'twilight', 'valley', 'velvet', 'vine', 'violet',
    'wave', 'wheat', 'willow', 'wind', 'winter', 'wolf', 'wonder', 'wood', 'yarn', 'zenith'
];

export const DEFAULT_OPTIONS: PasswordOptions = {
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
    excludeChars: '',
    memorable: false,
};

export class PasswordGenerator {
    /**
     * Generates a cryptographically secure password based on the provided options.
     * @param options Configuration options for password generation
     * @returns The generated password string
     * @throws Error if options are invalid (e.g. no char types selected)
     */
    static generate(options: PasswordOptions = DEFAULT_OPTIONS): string {
        if (options.length < 4 || options.length > 2048) {
            throw new Error('Password length must be between 4 and 2048');
        }

        if (options.memorable) {
            return this.generateMemorable(options);
        }

        let charset = '';

        if (options.uppercase) charset += UPPERCASE;
        if (options.lowercase) charset += LOWERCASE;
        if (options.numbers) charset += NUMBERS;
        if (options.symbols) charset += SYMBOLS;

        if (!charset) {
            throw new Error('At least one character type must be selected');
        }

        if (options.excludeAmbiguous || options.excludeChars) {
            const excluded = new Set<string>();
            if (options.excludeAmbiguous) {
                for (const char of AMBIGUOUS) {
                    excluded.add(char);
                }
            }
            if (options.excludeChars) {
                for (const char of options.excludeChars) {
                    excluded.add(char);
                }
            }

            let filtered = '';
            for (const char of charset) {
                if (!excluded.has(char)) {
                    filtered += char;
                }
            }
            charset = filtered;
        }

        if (charset.length === 0) {
            throw new Error('No characters available after exclusions');
        }


        let password = '';
        for (let i = 0; i < options.length; i++) {
            const index = this.getUnbiasedRandomInt(charset.length);
            password += charset[index];
        }

        password = this.ensureCharacterTypes(password, options);

        return password;
    }

    private static escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private static ensureCharacterTypes(
        password: string,
        options: PasswordOptions
    ): string {
        const chars = password.split('');
        const positions = new Set<number>();

        const getRandomPosition = (): number => {
            return this.getUnbiasedRandomInt(password.length);
        };

        const getRandomChar = (set: string): string => {
            const index = this.getUnbiasedRandomInt(set.length);
            return set[index];
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
                const availablePositions: number[] = [];
                for (let i = 0; i < password.length; i++) {
                    if (!positions.has(i)) {
                        availablePositions.push(i);
                    }
                }

                if (availablePositions.length === 0) {
                    return;
                }

                const randomIndex = this.getUnbiasedRandomInt(availablePositions.length);
                const pos = availablePositions[randomIndex];
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

    /**
     * Generates a random integer between 0 (inclusive) and max (exclusive)
     * using rejection sampling to avoid modulo bias.
     */
    private static getUnbiasedRandomInt(max: number): number {
        if (max <= 0) throw new Error('max must be positive');

        const maxUint32 = 0xFFFFFFFF;
        const limit = maxUint32 - (maxUint32 % max);
        const array = new Uint32Array(1);

        let value: number;
        do {
            crypto.getRandomValues(array);
            value = array[0];
        } while (value >= limit);

        return value % max;
    }

    private static generateMemorable(options: PasswordOptions): string {
        const words: string[] = [];
        const separator = this.getRandomSeparator(options.symbols);

        // Calculate count accounting for average word length (5) + separator (1)
        // Ensure at least 2 words if length permits
        const count = Math.max(2, Math.floor(options.length / 6));

        const getRandomWord = (): string => {
            const index = this.getUnbiasedRandomInt(WORD_LIST.length);
            return WORD_LIST[index];
        };

        for (let i = 0; i < count; i++) {
            let word = getRandomWord();
            if (options.uppercase) {
                word = word.charAt(0).toUpperCase() + word.slice(1);
            }
            words.push(word);
        }

        let password = words.join(separator);

        if (options.numbers) {
            const num = this.getUnbiasedRandomInt(100);
            password = `${num}${separator}${password}`;
        }

        if (password.length > options.length) {
            // Prefer removing complete word segments before falling back to character-level truncation.
            const parts = password.split(separator);
            while (parts.length > 1 && parts.join(separator).length > options.length) {
                parts.pop();
            }
            password = parts.join(separator);
            // As a last resort, hard-truncate if still too long
            if (password.length > options.length) {
                password = password.slice(0, options.length);
            }
        }

        return password;
    }

    private static getRandomSeparator(useSymbols: boolean = true): string {
        const separators = useSymbols ? '-_!@#$%^&*' : '-_';
        const index = this.getUnbiasedRandomInt(separators.length);
        return separators[index];
    }

    static calculateStrength(password: string): PasswordStrength {
        if (!password) {
            return { score: 0, label: 'Very Weak', color: '#dc2626', entropy: 0 };
        }

        let charsetSize = 0;
        if (/[a-z]/.test(password)) charsetSize += 26;
        if (/[A-Z]/.test(password)) charsetSize += 26;
        if (/[0-9]/.test(password)) charsetSize += 10;
        if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;

        const entropy = password.length * Math.log2(charsetSize || 1);

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
        } else if (entropy < 128) {
            score = 4;
            label = 'Strong';
            color = '#22c55e';
        } else if (entropy < 512) {
            score = 5;
            label = 'Very Strong';
            color = '#16a34a';
        } else {
            score = 6;
            label = 'Unbreakable';
            color = '#7c3aed';
        }

        return { score, label, color, entropy: Math.round(entropy) };
    }

    /**
     * Generates multiple passwords.
     * @param count Number of passwords to generate
     * @param options Password generation options
     * @returns Array of generated passwords
     */
    static generateMultiple(count: number, options: PasswordOptions = DEFAULT_OPTIONS): string[] {
        if (count < 1 || count > 1000) {
            throw new Error('Count must be between 1 and 1000');
        }
        const passwords: string[] = [];
        for (let i = 0; i < count; i++) {
            passwords.push(this.generate(options));
        }
        return passwords;
    }
}
