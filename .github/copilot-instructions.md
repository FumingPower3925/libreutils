# Copilot Instructions

## Files to Ignore During Code Review

The following paths contain vendored third-party code and should not receive review comments:

- `tools/checksum-generator/src/lib/noble/**` - Vendored [@noble/hashes](https://github.com/paulmillr/noble-hashes) library (MIT licensed)

These files are intentionally kept close to their upstream implementation to:
1. Preserve cryptographic correctness
2. Make future updates easier
3. Maintain audit trail with upstream

Please do not suggest changes to code style, variable declarations, or type annotations in these files.
