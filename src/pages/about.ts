/**
 * About Page
 */

export function renderAboutPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'about-page';

  container.innerHTML = `
    <style>
      .about-page {
        max-width: 960px;
        margin: 0 auto;
        padding: var(--lu-space-8, 2rem) var(--lu-space-6, 1.5rem);
      }

      /* ── Header ───────────────────────────────────────────── */
      .about-header {
        text-align: center;
        margin-bottom: var(--lu-space-10, 2.5rem);
      }
      .about-title {
        font-size: var(--lu-text-4xl, 2.25rem);
        font-weight: 700;
        margin-bottom: var(--lu-space-2, 0.5rem);
      }
      .about-subtitle {
        font-size: var(--lu-text-lg, 1.125rem);
        color: var(--lu-text-secondary, #616161);
      }

      /* ── Section label (uppercase) ────────────────────────── */
      .section-label {
        font-size: var(--lu-text-xs, 0.75rem);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--lu-text-muted, #9e9e9e);
        margin-bottom: var(--lu-space-3, 0.75rem);
      }

      /* ── Info cards ───────────────────────────────────────── */
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

      /* Card icons — same color as dep-link in legal page */
      .card-icon {
        color: var(--lu-primary-500, #613E9C);
      }
      :root.lu-theme-dark .card-icon {
        color: #c3b3db;
      }
      @media (prefers-color-scheme: dark) {
        :root:not(.lu-theme-light) .card-icon {
          color: #c3b3db;
        }
      }

      /* ── Two-column layout ────────────────────────────────── */
      .two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--lu-space-5, 1.25rem);
        margin-bottom: var(--lu-space-8, 2rem);
      }
      @media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } }

      /* ── Mission card (full-width) ────────────────────────── */
      .mission-card {
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #eee);
        border-radius: var(--lu-radius-lg, 0.75rem);
        padding: var(--lu-space-6, 1.5rem);
        margin-bottom: var(--lu-space-8, 2rem);
      }
      .mission-card p {
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-secondary, #616161);
        line-height: 1.7;
        margin: 0 0 var(--lu-space-3, 0.75rem);
      }
      .mission-card p:last-child { margin-bottom: 0; }

      /* ── Privacy banner ───────────────────────────────────── */
      .privacy-banner {
        display: flex;
        align-items: flex-start;
        gap: var(--lu-space-4, 1rem);
        background: var(--lu-success-light, #e8f5e9);
        border: 1px solid var(--lu-success, #2e7d32);
        border-radius: var(--lu-radius-lg, 0.75rem);
        padding: var(--lu-space-5, 1.25rem) var(--lu-space-6, 1.5rem);
        margin-bottom: var(--lu-space-8, 2rem);
        user-select: none;
      }
      .privacy-banner-icon {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--lu-success, #2e7d32);
        color: white;
        border-radius: var(--lu-radius-md, 0.5rem);
      }
      .privacy-banner-body h3 {
        font-size: var(--lu-text-base, 1rem);
        font-weight: 600;
        color: var(--lu-success, #2e7d32);
        margin: 0 0 var(--lu-space-1, 0.25rem);
      }
      .privacy-banner-body p {
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-success, #2e7d32);
        margin: 0;
        line-height: 1.5;
      }
      :root.lu-theme-dark .privacy-banner {
        background: rgba(46, 125, 50, 0.12);
        border-color: rgba(46, 125, 50, 0.4);
      }
      :root.lu-theme-dark .privacy-banner-icon {
        background: rgba(46, 125, 50, 0.5);
      }
      :root.lu-theme-dark .privacy-banner-body h3,
      :root.lu-theme-dark .privacy-banner-body p {
        color: #6ee775;
      }
      @media (prefers-color-scheme: dark) {
        :root:not(.lu-theme-light) .privacy-banner {
          background: rgba(46, 125, 50, 0.12);
          border-color: rgba(46, 125, 50, 0.4);
        }
        :root:not(.lu-theme-light) .privacy-banner-icon {
          background: rgba(46, 125, 50, 0.5);
        }
        :root:not(.lu-theme-light) .privacy-banner-body h3,
        :root:not(.lu-theme-light) .privacy-banner-body p {
          color: #6ee775;
        }
      }

      /* ── Contact footer strip ─────────────────────────────── */
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
        flex-wrap: wrap;
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

      @media (max-width: 700px) {
        .about-page { padding: var(--lu-space-6, 1.5rem) var(--lu-space-4, 1rem); }
        .about-title { font-size: var(--lu-text-3xl, 1.875rem); }
      }
    </style>

    <!-- Header -->
    <header class="about-header">
      <h1 class="about-title">About LibreUtils</h1>
      <p class="about-subtitle">Privacy-first, open-source web tools for everyone</p>
    </header>

    <!-- Mission -->
    <div class="section-label">Our Mission</div>
    <div class="mission-card">
      <p>
        LibreUtils provides a collection of useful web tools that prioritize your privacy above all else.
        Every tool runs entirely in your browser — your data never touches our servers because there are no servers involved in processing your data to begin with!
      </p>
      <p>
        We believe that utility tools should be free, open-source, and respect user privacy.
        That's why LibreUtils is licensed under AGPL-3.0 and will always remain ad-free and tracker-free.
      </p>
    </div>

    <!-- Privacy Guarantee -->
    <div class="privacy-banner">
      <div class="privacy-banner-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div class="privacy-banner-body">
        <h3>Privacy Guarantee</h3>
        <p>All processing happens in your browser. We don't collect, store, or transmit any of your data. There are no analytics, no cookies, and no tracking scripts. You can verify this yourself — all our code is fully open source with no backend connections.</p>
      </div>
    </div>

    <!-- Why LibreUtils + Contribute side-by-side -->
    <div class="two-col">
      <div class="info-card">
        <h3>
          <svg class="card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Why LibreUtils?
        </h3>
        <ul>
          <li>100% client-side processing — your data never leaves your device</li>
          <li>No accounts, no sign-ups, no tracking</li>
          <li>Works offline as a Progressive Web App</li>
          <li>Open source and auditable code</li>
          <li>No ads, no premium tiers, completely free</li>
          <li>Modern, accessible, and responsive design</li>
        </ul>
      </div>

      <div class="info-card">
        <h3>
          <svg class="card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
          </svg>
          Open Source
        </h3>
        <p>LibreUtils is fully open source under the AGPL-3.0 license. Contributions are welcome — whether it's adding new tools, fixing bugs, or improving existing features.</p>
        <p>Every line of code is auditable. You can verify exactly what happens with your data.</p>
      </div>
    </div>

    <!-- Contact Footer -->
    <div class="contact-strip">
      <p>Want to contribute or report an issue?</p>
      <div class="contact-strip-btns">
        <a href="https://github.com/FumingPower3925/libreutils" class="contact-btn contact-btn-primary" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          View on GitHub
        </a>
        <a href="#/" class="contact-btn contact-btn-secondary">Browse Tools</a>
        <a href="#/legal" class="contact-btn contact-btn-secondary">Legal Information</a>
      </div>
    </div>
  `;

  return container;
}
