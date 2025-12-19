# Contributing to LibreUtils

## Quick Start

```bash
git clone https://github.com/FumingPower3925/libreutils.git
cd libreutils
bun install
bun run hooks:install   # Required!
bun run dev
```

> **Important**: You MUST run `bun run hooks:install` after cloning. This sets up pre-commit hooks that ensure code quality.

## Pre-commit Hooks

The hooks automatically run on every commit:
- **Type checking** (`bun run typecheck`)
- **Version sync** (`bun run version:sync`)
- **Tests** (`bun test`)

If any check fails, the commit is blocked until you fix it.

## Adding a Tool

1. Copy `tools/text-encoder` as a template
2. Update `package.json` name to `@libreutils/tool-<name>`
3. Implement your tool in `src/tool.ts`
4. Add unit tests in `src/tool.test.ts`
5. Register the tool route in `src/index.ts`

## Releasing New Versions

Version is managed in `package.json` only:

```bash
# 1. Update version in package.json
# 2. Commit (hooks will auto-sync version to manifest.json + sw.js)
```

## Code Style

- TypeScript, strict mode
- No external dependencies (pure browser APIs)
- All processing client-side only
- No emojis in code (use text like [OK], [X], etc.) (No AI Slop pls)

## License

AGPL-3.0 - contributions must maintain this license.
