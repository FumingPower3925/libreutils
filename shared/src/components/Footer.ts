/**
 * Footer Web Component
 */

export class LuFooter extends HTMLElement {
  static tagName = 'lu-footer';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const year = new Date().getFullYear();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--lu-bg-secondary, #f3f4f6);
          border-top: 1px solid var(--lu-border, #e5e7eb);
        }
        .footer {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--lu-space-8, 2rem) var(--lu-space-6, 1.5rem);
        }
        .footer-content {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: var(--lu-space-8, 2rem);
        }
        .footer-section {
          min-width: 150px;
        }
        .footer-title {
          font-size: var(--lu-text-sm, 0.875rem);
          font-weight: 600;
          color: var(--lu-text-primary, #111827);
          margin-bottom: var(--lu-space-3, 0.75rem);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .footer-text {
          font-size: var(--lu-text-sm, 0.875rem);
          color: var(--lu-text-secondary, #6b7280);
          max-width: 280px;
          margin: 0;
          line-height: 1.6;
        }
        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .footer-links li {
          margin-bottom: var(--lu-space-2, 0.5rem);
        }
        .footer-links a {
          font-size: var(--lu-text-sm, 0.875rem);
          color: var(--lu-text-secondary, #6b7280);
          text-decoration: none;
          transition: color var(--lu-transition-fast, 150ms ease);
        }
        .footer-links a:hover {
          color: var(--lu-primary-500, #7c3aed);
        }
        .footer-links-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--lu-space-1, 0.25rem) var(--lu-space-6, 1.5rem);
        }
        .privacy-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--lu-space-2, 0.5rem);
          padding: var(--lu-space-2, 0.5rem) var(--lu-space-3, 0.75rem);
          background: var(--lu-success-light, #dcfce7);
          color: var(--lu-success, #22c55e);
          font-size: var(--lu-text-xs, 0.75rem);
          font-weight: 500;
          border-radius: var(--lu-radius-full, 9999px);
          margin-top: var(--lu-space-4, 1rem);
        }
        @media (prefers-color-scheme: dark) {
          .privacy-badge {
            background: rgba(34, 197, 94, 0.15);
          }
        }
        .privacy-badge svg {
          width: 14px;
          height: 14px;
        }
        .footer-bottom {
          margin-top: var(--lu-space-8, 2rem);
          padding-top: var(--lu-space-6, 1.5rem);
          border-top: 1px solid var(--lu-border, #e5e7eb);
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: var(--lu-space-4, 1rem);
        }
        .copyright {
          font-size: var(--lu-text-sm, 0.875rem);
          color: var(--lu-text-muted, #9ca3af);
          margin: 0;
        }
        .license-link {
          font-size: var(--lu-text-sm, 0.875rem);
          color: var(--lu-text-secondary, #6b7280);
          text-decoration: none;
        }
        .license-link:hover {
          color: var(--lu-primary-500, #7c3aed);
        }
      </style>
      <footer class="footer">
        <div class="footer-content">
          <div class="footer-section">
            <h3 class="footer-title">About</h3>
            <p class="footer-text">
              Privacy-first web tools that run entirely in your browser. No server uploads, no tracking, no ads.
            </p>
            <div class="privacy-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              100% Client-Side
            </div>
          </div>
          <div class="footer-section">
            <h3 class="footer-title">Links</h3>
            <ul class="footer-links">
              <li><a href="#/">All Tools</a></li>
              <li><a href="#/about">About</a></li>
              <li><a href="https://github.com/FumingPower3925/libreutils" target="_blank" rel="noopener">Source Code</a></li>
            </ul>
          </div>
          <div class="footer-section">
            <h3 class="footer-title">Categories</h3>
            <ul class="footer-links footer-links-grid">
              <li><a href="#/?category=encryption">Encryption</a></li>
              <li><a href="#/?category=compression">Compression</a></li>
              <li><a href="#/?category=text">Text Tools</a></li>
              <li><a href="#/?category=image">Image Tools</a></li>
              <li><a href="#/?category=file">File Tools</a></li>
              <li><a href="#/?category=conversion">Conversion</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p class="copyright">&copy; ${year} LibreUtils. Open source under AGPL-3.0.</p>
          <a href="https://www.gnu.org/licenses/agpl-3.0.html" class="license-link" target="_blank" rel="noopener">License</a>
        </div>
      </footer>
    `;
  }
}
