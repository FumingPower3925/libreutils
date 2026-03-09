/**
 * Legal Page Component
 *
 * Displays legal information, licenses, and attributions.
 */

export function renderLegalPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'legal-page';

  container.innerHTML = `
    <style>
      .legal-page {
        max-width: 960px;
        margin: 0 auto;
        padding: var(--lu-space-8, 2rem) var(--lu-space-6, 1.5rem);
      }

      .legal-header {
        margin-bottom: var(--lu-space-8, 2rem);
      }
      .legal-header h1 {
        font-size: var(--lu-text-3xl, 1.875rem);
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: var(--lu-space-3, 0.75rem);
        margin-bottom: var(--lu-space-1, 0.25rem);
      }
      .legal-header p {
        color: var(--lu-text-secondary, #616161);
        margin: 0;
      }

      /* ── Project license card (clickable) ─────────────────── */
      .project-license {
        display: flex;
        align-items: flex-start;
        gap: var(--lu-space-5, 1.25rem);
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #eee);
        border-radius: var(--lu-radius-lg, 0.75rem);
        padding: var(--lu-space-5, 1.25rem) var(--lu-space-6, 1.5rem);
        margin-bottom: var(--lu-space-8, 2rem);
        text-decoration: none;
        color: inherit;
        cursor: pointer;
        transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
      }
      .project-license:hover {
        border-color: var(--lu-primary-300, #c3b3db);
        box-shadow: 0 4px 16px -4px rgba(97, 62, 156, 0.18);
        transform: translateY(-2px);
        color: inherit;
      }
      .project-license:active {
        transform: translateY(0);
        box-shadow: 0 2px 6px -2px rgba(97, 62, 156, 0.15);
      }
      .project-license-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--lu-primary-50, #f5f3f9);
        color: var(--lu-primary-500, #613E9C);
        border-radius: var(--lu-radius-md, 0.5rem);
        transition: background 0.2s, color 0.2s;
      }
      .project-license:hover .project-license-icon {
        background: var(--lu-primary-100, #ebe6f3);
      }
      :root.lu-theme-dark .project-license-icon {
        background: rgba(154, 123, 192, 0.15);
        color: #c3b3db;
      }
      :root.lu-theme-dark .project-license:hover .project-license-icon {
        background: rgba(154, 123, 192, 0.25);
        color: #d4bfee;
      }
      @media (prefers-color-scheme: dark) {
        :root:not(.lu-theme-light) .project-license-icon {
          background: rgba(154, 123, 192, 0.15);
          color: #c3b3db;
        }
        :root:not(.lu-theme-light) .project-license:hover .project-license-icon {
          background: rgba(154, 123, 192, 0.25);
          color: #d4bfee;
        }
      }
      .project-license-body { flex: 1; min-width: 0; }
      .project-license-body h2 {
        font-size: var(--lu-text-lg, 1.125rem);
        font-weight: 600;
        margin: 0 0 var(--lu-space-1, 0.25rem);
      }
      .project-license-body p {
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-secondary, #616161);
        margin: 0;
        line-height: 1.5;
      }

      /* ── Section titles ───────────────────────────────────── */
      .section-label {
        font-size: var(--lu-text-xs, 0.75rem);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--lu-text-muted, #9e9e9e);
        margin-bottom: var(--lu-space-3, 0.75rem);
      }

      /* ── Dependency table ─────────────────────────────────── */
      .dep-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #eee);
        border-radius: var(--lu-radius-lg, 0.75rem);
        overflow: hidden;
        margin-bottom: var(--lu-space-8, 2rem);
        font-size: var(--lu-text-sm, 0.875rem);
      }
      .dep-table th {
        text-align: left;
        padding: var(--lu-space-3, 0.75rem) var(--lu-space-4, 1rem);
        font-weight: 600;
        font-size: var(--lu-text-xs, 0.75rem);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--lu-text-muted, #9e9e9e);
        background: var(--lu-bg-secondary, #fafafa);
        border-bottom: 1px solid var(--lu-border, #eee);
      }
      .dep-table td {
        padding: var(--lu-space-3, 0.75rem) var(--lu-space-4, 1rem);
        border-bottom: 1px solid var(--lu-border, #eee);
        vertical-align: middle;
      }
      .dep-table tr:last-child td { border-bottom: none; }
      .dep-table tr:hover td {
        background: var(--lu-bg-secondary, #fafafa);
      }
      .dep-name {
        font-weight: 600;
        color: var(--lu-primary-500, #613E9C);
        text-decoration: none;
        white-space: nowrap;
        transition: color 0.15s;
      }
      .dep-name:hover {
        color: var(--lu-primary-400, #9a7bc0);
        text-decoration: underline;
      }
      :root.lu-theme-dark .dep-name {
        color: #c3b3db;
      }
      :root.lu-theme-dark .dep-name:hover {
        color: #d4bfee;
      }
      @media (prefers-color-scheme: dark) {
        :root:not(.lu-theme-light) .dep-name {
          color: #c3b3db;
        }
        :root:not(.lu-theme-light) .dep-name:hover {
          color: #d4bfee;
        }
      }
      .dep-desc {
        color: var(--lu-text-secondary, #616161);
      }
      .dep-badge {
        display: inline-block;
        padding: 0.125rem 0.5rem;
        background: var(--lu-primary-50, #f5f3f9);
        color: var(--lu-primary-600, #57388c);
        font-size: 0.6875rem;
        font-weight: 600;
        border-radius: var(--lu-radius-full, 9999px);
        text-decoration: none;
        letter-spacing: 0.02em;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .dep-badge:hover {
        background: var(--lu-primary-100, #ebe6f3);
        transform: translateY(-1px);
      }
      :root.lu-theme-dark .dep-badge {
        background: rgba(154, 123, 192, 0.2);
        color: #d4bfee;
      }
      :root.lu-theme-dark .dep-badge:hover {
        background: rgba(154, 123, 192, 0.3);
      }
      @media (prefers-color-scheme: dark) {
        :root:not(.lu-theme-light) .dep-badge {
          background: rgba(154, 123, 192, 0.2);
          color: #d4bfee;
        }
        :root:not(.lu-theme-light) .dep-badge:hover {
          background: rgba(154, 123, 192, 0.3);
        }
      }
      .dep-link {
        color: var(--lu-primary-500, #613E9C);
        text-decoration: none;
        white-space: nowrap;
        font-weight: 500;
        transition: color 0.15s;
      }
      .dep-link:hover { text-decoration: underline; color: var(--lu-primary-400, #9a7bc0); }
      :root.lu-theme-dark .dep-link {
        color: #c3b3db;
      }
      :root.lu-theme-dark .dep-link:hover {
        color: #d4bfee;
      }
      @media (prefers-color-scheme: dark) {
        :root:not(.lu-theme-light) .dep-link {
          color: #c3b3db;
        }
        :root:not(.lu-theme-light) .dep-link:hover {
          color: #d4bfee;
        }
      }
      .dep-note {
        font-size: var(--lu-text-xs, 0.75rem);
        color: var(--lu-text-muted, #9e9e9e);
        margin-top: 0.125rem;
      }

      /* ── Two-column layout ────────────────────────────────── */
      .two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--lu-space-5, 1.25rem);
        margin-bottom: var(--lu-space-8, 2rem);
      }
      @media (max-width: 700px) {
        .two-col { grid-template-columns: 1fr; }
      }
      .info-card {
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #eee);
        border-radius: var(--lu-radius-lg, 0.75rem);
        padding: var(--lu-space-5, 1.25rem);
      }
      .info-card h3 {
        font-size: var(--lu-text-base, 1rem);
        font-weight: 600;
        margin: 0 0 var(--lu-space-3, 0.75rem);
        display: flex;
        align-items: center;
        gap: var(--lu-space-2, 0.5rem);
      }
      .info-card p, .info-card li {
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-secondary, #616161);
        line-height: 1.6;
        margin: 0 0 var(--lu-space-2, 0.5rem);
      }
      .info-card ul {
        padding-left: var(--lu-space-5, 1.25rem);
        margin: 0;
      }
      .info-card li { margin-bottom: var(--lu-space-1, 0.25rem); }
      .info-card li::marker { color: var(--lu-primary-400, #9a7bc0); }

      /* Disclaimer variant */
      .info-card.warning {
        background: var(--lu-warning-light, #fef3c7);
        border-color: rgba(245, 158, 11, 0.3);
      }
      .info-card.warning h3 { color: #92400e; }
      .info-card.warning p, .info-card.warning li { color: #78350f; }
      :root.lu-theme-dark .info-card.warning {
        background: rgba(146, 64, 14, 0.12);
        border-color: rgba(251, 191, 36, 0.2);
      }
      :root.lu-theme-dark .info-card.warning h3 { color: #fbbf24; }
      :root.lu-theme-dark .info-card.warning p,
      :root.lu-theme-dark .info-card.warning li { color: #fde68a; }
      @media (prefers-color-scheme: dark) {
        :root:not(.lu-theme-light) .info-card.warning {
          background: rgba(146, 64, 14, 0.12);
          border-color: rgba(251, 191, 36, 0.2);
        }
        :root:not(.lu-theme-light) .info-card.warning h3 { color: #fbbf24; }
        :root:not(.lu-theme-light) .info-card.warning p,
        :root:not(.lu-theme-light) .info-card.warning li { color: #fde68a; }
      }

      /* Privacy variant — icon color inherits from h3 */
      .info-card.privacy h3 { color: var(--lu-success, #2e7d32); }
      .info-card.privacy h3 svg { color: inherit; }
      :root.lu-theme-dark .info-card.privacy h3 { color: #6ee775; }
      @media (prefers-color-scheme: dark) {
        :root:not(.lu-theme-light) .info-card.privacy h3 { color: #6ee775; }
      }

      /* ── Contact footer ───────────────────────────────────── */
      .contact-strip {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--lu-space-4, 1rem);
        padding: var(--lu-space-5, 1.25rem) var(--lu-space-6, 1.5rem);
        background: var(--lu-bg-secondary, #fafafa);
        border-radius: var(--lu-radius-lg, 0.75rem);
      }
      .contact-strip p {
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-secondary, #616161);
        margin: 0;
      }
      .contact-strip-btns {
        display: flex;
        gap: var(--lu-space-3, 0.75rem);
      }
      .contact-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.5rem 1rem;
        font-size: var(--lu-text-sm, 0.875rem);
        font-weight: 500;
        text-decoration: none;
        border-radius: var(--lu-radius-md, 0.5rem);
        transition: all var(--lu-transition-fast, 150ms ease);
      }
      .contact-btn svg { width: 16px; height: 16px; }
      .contact-btn-primary {
        background: var(--lu-primary-500, #613E9C);
        color: white;
      }
      .contact-btn-primary:hover {
        background: var(--lu-primary-600, #57388c);
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px -2px rgba(97, 62, 156, 0.4);
      }
      .contact-btn-secondary {
        background: var(--lu-bg-card, white);
        color: var(--lu-text-primary, #212121);
        border: 1px solid var(--lu-border, #eee);
      }
      .contact-btn-secondary:hover {
        border-color: var(--lu-primary-300, #c3b3db);
        color: var(--lu-primary-600, #57388c);
      }
      :root.lu-theme-dark .contact-btn-secondary:hover {
        border-color: var(--lu-primary-400, #9a7bc0);
        color: var(--lu-primary-300, #c3b3db);
      }
      @media (prefers-color-scheme: dark) {
        :root:not(.lu-theme-light) .contact-btn-secondary:hover {
          border-color: var(--lu-primary-400, #9a7bc0);
          color: var(--lu-primary-300, #c3b3db);
        }
      }

      /* ── Responsive table ─────────────────────────────────── */
      @media (max-width: 700px) {
        .dep-table thead { display: none; }
        .dep-table, .dep-table tbody, .dep-table tr, .dep-table td {
          display: block;
        }
        .dep-table tr {
          padding: var(--lu-space-3, 0.75rem) var(--lu-space-4, 1rem);
          border-bottom: 1px solid var(--lu-border, #eee);
        }
        .dep-table tr:last-child { border-bottom: none; }
        .dep-table td {
          padding: 0;
          border: none;
        }
        .dep-table td:first-child {
          display: flex;
          align-items: center;
          gap: var(--lu-space-2, 0.5rem);
          margin-bottom: var(--lu-space-1, 0.25rem);
        }
        .dep-table td:nth-child(2) { display: none; }
        .dep-table td:nth-child(3) { margin-bottom: var(--lu-space-1, 0.25rem); }
        .legal-page { padding: var(--lu-space-6, 1.5rem) var(--lu-space-4, 1rem); }
      }
    </style>

    <!-- Header -->
    <header class="legal-header">
      <h1>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--lu-primary-500, #613E9C);">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Legal Information
      </h1>
      <p>Licenses, attributions, and legal disclaimers for LibreUtils</p>
    </header>

    <!-- Project License (clickable link) -->
    <a href="https://github.com/FumingPower3925/libreutils/blob/main/LICENSE" class="project-license" target="_blank" rel="noopener noreferrer">
      <div class="project-license-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      </div>
      <div class="project-license-body">
        <h2>AGPL-3.0</h2>
        <p>LibreUtils is licensed under the GNU Affero General Public License v3.0 — strong copyleft requiring source availability for modifications and network use.</p>
      </div>
    </a>

    <!-- Third-Party Dependencies -->
    <div class="section-label">Third-Party Dependencies</div>
    <table class="dep-table">
      <thead>
        <tr>
          <th>Library</th>
          <th>License</th>
          <th>Used For</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><a href="https://github.com/mattiasw/exifreader" class="dep-name" target="_blank" rel="noopener">exifreader</a></td>
          <td><a href="https://github.com/mattiasw/exifreader/blob/master/LICENSE" class="dep-badge" target="_blank" rel="noopener">MIT</a></td>
          <td class="dep-desc">EXIF metadata parsing in Metadata Scrubber</td>
          <td><a href="https://github.com/mattiasw/exifreader" class="dep-link" target="_blank" rel="noopener">GitHub</a></td>
        </tr>
        <tr>
          <td>
            <a href="https://github.com/paulmillr/noble-hashes" class="dep-name" target="_blank" rel="noopener">@noble/hashes</a>
            <div class="dep-note">Vendored at tools/checksum-generator/src/lib/noble/</div>
          </td>
          <td><a href="https://github.com/paulmillr/noble-hashes/blob/main/LICENSE" class="dep-badge" target="_blank" rel="noopener">MIT</a></td>
          <td class="dep-desc">Cryptographic hash functions in Checksum Generator</td>
          <td><a href="https://github.com/paulmillr/noble-hashes" class="dep-link" target="_blank" rel="noopener">GitHub</a></td>
        </tr>
        <tr>
          <td><a href="https://github.com/Hopding/pdf-lib" class="dep-name" target="_blank" rel="noopener">pdf-lib</a></td>
          <td><a href="https://github.com/Hopding/pdf-lib/blob/master/LICENSE" class="dep-badge" target="_blank" rel="noopener">MIT</a></td>
          <td class="dep-desc">PDF metadata manipulation in Metadata Scrubber</td>
          <td><a href="https://github.com/Hopding/pdf-lib" class="dep-link" target="_blank" rel="noopener">GitHub</a></td>
        </tr>
        <tr>
          <td><a href="https://github.com/nika-begiashvili/libarchivejs" class="dep-name" target="_blank" rel="noopener">libarchive.js</a></td>
          <td><a href="https://github.com/nika-begiashvili/libarchivejs/blob/master/LICENSE" class="dep-badge" target="_blank" rel="noopener">MIT</a></td>
          <td class="dep-desc">WASM archive extraction in Archive Manager</td>
          <td><a href="https://github.com/nika-begiashvili/libarchivejs" class="dep-link" target="_blank" rel="noopener">GitHub</a></td>
        </tr>
        <tr>
          <td><a href="https://github.com/101arrowz/fflate" class="dep-name" target="_blank" rel="noopener">fflate</a></td>
          <td><a href="https://github.com/101arrowz/fflate/blob/master/LICENSE" class="dep-badge" target="_blank" rel="noopener">MIT</a></td>
          <td class="dep-desc">Fast ZIP creation &amp; extraction in Archive Manager</td>
          <td><a href="https://github.com/101arrowz/fflate" class="dep-link" target="_blank" rel="noopener">GitHub</a></td>
        </tr>
        <tr>
          <td>
            <a href="https://github.com/ffmpegwasm/ffmpeg.wasm" class="dep-name" target="_blank" rel="noopener">@ffmpeg/ffmpeg</a>
            <div class="dep-note">WASM core (~25 MB) loaded on demand from CDN</div>
          </td>
          <td><a href="https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/LICENSE" class="dep-badge" target="_blank" rel="noopener">MIT</a></td>
          <td class="dep-desc">Video &amp; audio metadata stripping in Metadata Scrubber</td>
          <td><a href="https://github.com/ffmpegwasm/ffmpeg.wasm" class="dep-link" target="_blank" rel="noopener">GitHub</a></td>
        </tr>
      </tbody>
    </table>

    <!-- Build tools -->
    <div class="section-label">Build Tools</div>
    <table class="dep-table" style="margin-bottom: var(--lu-space-8, 2rem);">
      <thead>
        <tr>
          <th>Tool</th>
          <th>License</th>
          <th>Role</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><a href="https://bun.sh" class="dep-name" target="_blank" rel="noopener">Bun</a></td>
          <td><a href="https://github.com/oven-sh/bun/blob/main/LICENSE" class="dep-badge" target="_blank" rel="noopener">MIT</a></td>
          <td class="dep-desc">JavaScript runtime, bundler, and test runner</td>
          <td><a href="https://bun.sh" class="dep-link" target="_blank" rel="noopener">bun.sh</a></td>
        </tr>
        <tr>
          <td><a href="https://www.typescriptlang.org" class="dep-name" target="_blank" rel="noopener">TypeScript</a></td>
          <td><a href="https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt" class="dep-badge" target="_blank" rel="noopener">Apache-2.0</a></td>
          <td class="dep-desc">Type-safe language and compiler</td>
          <td><a href="https://www.typescriptlang.org" class="dep-link" target="_blank" rel="noopener">typescriptlang.org</a></td>
        </tr>
      </tbody>
    </table>

    <!-- Privacy & Disclaimer side-by-side -->
    <div class="two-col">
      <div class="info-card privacy">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Privacy Policy
        </h3>
        <p>LibreUtils is designed with privacy as a core principle:</p>
        <ul>
          <li>All tools run 100% in your browser</li>
          <li>No data collection, tracking, or analytics</li>
          <li>No cookies or third-party requests</li>
          <li>Files never leave your device</li>
        </ul>
      </div>

      <div class="info-card warning">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none"/>
          </svg>
          Disclaimer
        </h3>
        <p>While LibreUtils strives for accuracy and reliability, all tools are provided as-is without warranty. Results depend on file format, browser capabilities, and container structure. You are responsible for verifying outputs before relying on them.</p>
      </div>
    </div>

    <!-- Contact Footer -->
    <div class="contact-strip">
      <p>Questions about licensing or legal matters?</p>
      <div class="contact-strip-btns">
        <a href="https://github.com/FumingPower3925/libreutils" class="contact-btn contact-btn-primary" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          Repository
        </a>
        <a href="https://github.com/FumingPower3925/libreutils/issues" class="contact-btn contact-btn-secondary" target="_blank" rel="noopener noreferrer">
          Report Issue
        </a>
      </div>
    </div>
  `;

  return container;
}
