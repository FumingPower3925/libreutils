import { WORD_LIST } from './wordlist';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'Il1O0';


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
    /** Separator for memorable passwords (default: random) */
    separator?: 'random' | '-' | '_' | ' ' | '.';
}

export interface PasswordStrength {
    score: number;
    label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong' | 'Unbreakable';
    color: string;
    entropy: number;
    isQuantumSafe: boolean;
}


export const DEFAULT_OPTIONS: PasswordOptions = {
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
    excludeChars: '',
    memorable: false,
    separator: 'random',
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
        let separator: string = options.separator || 'random';

        if (separator === 'random') {
            separator = this.getRandomSeparator(options.symbols);
        }
        const separatorLen = separator.length;

        let currentLength = 0;
        const targetLength = options.length;

        // Group words by length for O(1) access
        const wordsByLength: { [key: number]: string[] } = {};
        for (const word of WORD_LIST) {
            const len = word.length;
            if (!wordsByLength[len]) wordsByLength[len] = [];
            wordsByLength[len].push(word);
        }

        const getRandomWord = (len?: number): string => {
            let candidates = WORD_LIST;
            if (len !== undefined) {
                if (wordsByLength[len] && wordsByLength[len].length > 0) {
                    candidates = wordsByLength[len];
                } else {
                    // Fallback: anything that fits
                    candidates = WORD_LIST.filter(w => w.length <= len);
                    if (candidates.length === 0) candidates = WORD_LIST; // Last resort
                }
            }
            const index = this.getUnbiasedRandomInt(candidates.length);
            return candidates[index];
        };

        while (currentLength < targetLength) {
            const isFirst = words.length === 0;
            const overhead = isFirst ? 0 : separatorLen;
            const remaining = targetLength - currentLength - overhead;

            if (remaining <= 0) break;

            let selectedWord = '';

            // If we are close to the end, try to find an exact fit
            if (remaining <= 10) {
                selectedWord = getRandomWord(remaining);
            } else {
                selectedWord = getRandomWord();
            }

            // Transform case
            if (options.uppercase) {
                selectedWord = selectedWord.charAt(0).toUpperCase() + selectedWord.slice(1);
            }

            words.push(selectedWord);
            currentLength += selectedWord.length + overhead;

            if (currentLength >= targetLength) break;
        }

        let password = words.join(separator);

        if (options.numbers) {
            const num = this.getUnbiasedRandomInt(100);
            password = `${num}${separator}${password}`;
        }

        if (password.length > options.length) {
            password = password.slice(0, options.length);
        }

        return password;
    }

    private static getRandomSeparator(useSymbols: boolean = true): string {
        const separators = useSymbols ? '-_!@#$%^&*' : '-_';
        const index = this.getUnbiasedRandomInt(separators.length);
        return separators[index];
    }

    static calculateStrength(password: string, isMemorable: boolean = false): PasswordStrength {
        if (!password) {
            return { score: 0, label: 'Very Weak', color: '#dc2626', entropy: 0, isQuantumSafe: false };
        }

        let charsetSize = 0;
        if (/[a-z]/.test(password)) charsetSize += 26;
        if (/[A-Z]/.test(password)) charsetSize += 26;
        if (/[0-9]/.test(password)) charsetSize += 10;
        if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;

        if (charsetSize === 0) charsetSize = 1; // Fallback

        // Standard entropy
        let entropy = password.length * Math.log2(charsetSize);

        if (isMemorable) {
            // 1. Estimate number of words.
            // Average word length ~5.5, separator ~1.
            // Assume numbers added (~2 chars).
            const estimatedWords = Math.max(1, password.length / 6.5);

            // 2. Entropy = num_words * log2(dictionary_size) + padding_entropy
            // Dictionary size is WORD_LIST.length
            const dictEntropy = estimatedWords * Math.log2(WORD_LIST.length);

            // Conservative estimate: use dictEntropy
            entropy = dictEntropy;
        }

        const isQuantumSafe = entropy >= 256;

        return {
            score: this.getStrengthScore(entropy),
            label: this.getStrengthLabel(entropy),
            color: this.getStrengthColor(entropy),
            entropy: Math.round(entropy),
            isQuantumSafe
        };
    }

    private static getStrengthScore(entropy: number): number {
        if (entropy < 28) return 0;
        if (entropy < 36) return 1;
        if (entropy < 60) return 2;
        if (entropy < 128) return 3;
        if (entropy < 185) return 4;
        if (entropy < 512) return 5;
        return 6;
    }

    private static getStrengthLabel(entropy: number): PasswordStrength['label'] {
        if (entropy < 28) return 'Very Weak';
        if (entropy < 36) return 'Weak';
        if (entropy < 60) return 'Fair';
        if (entropy < 128) return 'Strong';
        if (entropy < 185) return 'Very Strong';
        return 'Unbreakable';
    }

    private static getStrengthColor(entropy: number): string {
        if (entropy < 28) return '#dc2626';
        if (entropy < 36) return '#ea580c'; // Orange-Red
        if (entropy < 60) return '#eab308'; // Yellow
        if (entropy < 128) return '#16a34a'; // Green
        if (entropy < 185) return '#059669'; // Emerald
        return '#7c3aed'; // Purple
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
