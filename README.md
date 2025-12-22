# LibreUtils

**Privacy-first web tools that run entirely in your browser**

No server uploads · No tracking · No ads · Open Source (AGPL-3.0)

---

## Features

- **100% Client-Side**: All processing happens in your browser. Your data never leaves your device.
- **Minimal Dependencies**: Built with Bun, TypeScript, and Web Components.
- **Offline Support**: Installable as a PWA for offline use.
- **Modular Architecture**: Each tool is an independent package that can be developed and used standalone.

## Available Tools

| Tool | Description | Status |
|------|-------------|--------|
| Text Encoder | Encode/decode text (Base64, URL, HTML entities, etc.) | Ready |
| Password Generator | Secure, unique, and memorable password generation | Ready |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.0 or higher

### Installation

```bash
git clone https://github.com/FumingPower3925/libreutils.git
cd libreutils
bun install
```

### Development

```bash
# Run the full website
bun run dev

# Run a specific tool standalone
cd tools/text-encoder
bun run dev
```

Development server: `http://localhost:3000` (main site) or `http://localhost:3001` (standalone tool).

### Production Build

```bash
bun run build
```

## Project Structure

```
libreutils/
├── src/                   # Main website
│   ├── pages/             # Page components
│   ├── index.html         # HTML template
│   ├── index.ts           # Entry point
│   └── dev.ts             # Development server
├── shared/                # Shared code
│   └── src/
│       ├── components/    # Web Components
│       ├── styles/        # CSS design system
│       └── utils/         # Utilities
├── tools/                 # Individual tools
│   └── text-encoder/      # Example tool
├── public/                # Static assets
└── package.json           # Workspace configuration
```

## Adding a New Tool

1. Create `tools/my-tool/` with `package.json`, `tsconfig.json`
2. Add files: `meta.ts`, `tool.ts` (logic), `page.ts` (UI), `standalone.ts`, `dev.ts`
3. Register in `src/pages/home.ts`
4. Run `bun install` and test with `cd tools/my-tool && bun run dev`

See `tools/text-encoder/` for the template.

## Design System

The shared package provides CSS variables, typography, spacing, and component styles. All components use CSS custom properties for theming and dark mode support.

### Web Components

- `<lu-layout>` - Page layout with header/footer slots
- `<lu-header>` - Site header with navigation and theme toggle
- `<lu-footer>` - Site footer
- `<lu-card>` - Tool card

## Privacy

- **No Server Processing**: All tools run 100% in your browser
- **No Analytics**: We don't track page views or behavior
- **No Cookies**: Only `localStorage` for theme preference
- **Open Source**: Auditable under AGPL-3.0

## License

GNU Affero General Public License v3.0 (AGPL-3.0)

See [LICENSE](./LICENSE) for details.

---

Made with care for privacy.
