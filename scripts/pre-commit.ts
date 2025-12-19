#!/usr/bin/env bun
export { };

import { $ } from 'bun';

console.log('[*] Running pre-commit checks...\n');

console.log('  > Type checking...');
const typecheck = await $`bun run typecheck`.quiet().nothrow();
if (typecheck.exitCode !== 0) {
    console.log('[X] Type check failed. Fix errors before committing.\n');
    console.log(typecheck.stderr.toString() || typecheck.stdout.toString());
    process.exit(1);
}

console.log('  > Syncing version...');
const versionSync = await $`bun run version:sync`.quiet().nothrow();
if (versionSync.exitCode !== 0) {
    console.log('[X] Version sync failed.\n');
    console.log(versionSync.stderr.toString());
    process.exit(1);
}

await $`git add public/manifest.json public/sw.js`.quiet().nothrow();

console.log('  > Running tests...');
const tests = await $`bun test`.quiet().nothrow();
if (tests.exitCode !== 0) {
    console.log('[X] Tests failed. Fix before committing.\n');
    console.log(tests.stdout.toString());
    process.exit(1);
}

console.log('\n[OK] All pre-commit checks passed!');
