
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const wordlistPath = join(process.cwd(), 'tools/password-generator/src/wordlist.ts');
const content = readFileSync(wordlistPath, 'utf-8');

// Extract words
const match = content.match(/export const WORD_LIST = \[(.*?)\];/s);
if (!match) {
    console.error('Could not find WORD_LIST');
    process.exit(1);
}

const rawArray = match[1];
// Split by comma, remove quotes and whitespace
const words = rawArray
    .split(',')
    .map(w => w.replace(/['"\s\n\r]/g, '').trim())
    .filter(w => w.length > 0 && !w.startsWith('//')); // Filter empty and comments

// Deduplicate
const uniqueWords = [...new Set(words)];

// Group by length
const byLength: Record<number, string[]> = {};
uniqueWords.forEach(w => {
    const len = w.length;
    if (!byLength[len]) byLength[len] = [];
    byLength[len].push(w);
});

// Sort lengths
const lengths = Object.keys(byLength).map(Number).sort((a, b) => a - b);

let newContent = `export const WORD_LIST = [\n`;

lengths.forEach(len => {
    newContent += `    // ${len} letters\n`;
    const sortedWords = byLength[len].sort();

    let line = '    ';
    sortedWords.forEach((word, index) => {
        const isLast = index === sortedWords.length - 1 && len === lengths[lengths.length - 1];
        const item = `'${word}'${isLast ? '' : ','}`;

        if (line.length + item.length > 100) {
            newContent += line + '\n';
            line = '    ' + item;
        } else {
            line += (line === '    ' ? '' : ' ') + item;
        }
    });
    newContent += line + '\n\n';
});

// Remove last comma if needed (handled in loop logic roughly, but let's be safe with JS array syntax)
// Actually trailing comma is valid.

newContent = newContent.trimEnd() + '\n];\n';

writeFileSync(wordlistPath, newContent);
console.log('Wordlist cleaned and sorted!');
