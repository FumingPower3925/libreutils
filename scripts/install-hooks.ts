#!/usr/bin/env bun
export { };

import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';

const HOOKS_DIR = '.git/hooks';
const SCRIPTS_DIR = 'scripts';

console.log('[*] Installing Git hooks...\n');

if (!existsSync('.git')) {
    console.log('[X] Not a git repository. Run this from the project root.');
    process.exit(1);
}

if (!existsSync(HOOKS_DIR)) {
    mkdirSync(HOOKS_DIR, { recursive: true });
}

const preCommitHook = `#!/bin/sh
bun run ${join(SCRIPTS_DIR, 'pre-commit.ts')}
`;

const hookPath = join(HOOKS_DIR, 'pre-commit');
writeFileSync(hookPath, preCommitHook);
chmodSync(hookPath, 0o755);

console.log('[OK] Git hooks installed!\n');
console.log('The following hooks are now active:');
console.log('  - pre-commit: runs typecheck, version:sync, and tests');
