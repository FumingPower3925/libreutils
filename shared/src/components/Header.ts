/**
 * Header Web Component
 */

export class LuHeader extends HTMLElement {
  static tagName = 'lu-header';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const themeToggle = this.shadowRoot?.querySelector('.theme-toggle');
    themeToggle?.addEventListener('click', () => this.toggleTheme());
  }

  private toggleTheme(): void {
    const root = document.documentElement;
    const isDark = root.classList.contains('lu-theme-dark');

    if (isDark) {
      root.classList.remove('lu-theme-dark');
      root.classList.add('lu-theme-light');
      localStorage.setItem('lu-theme', 'light');
    } else {
      root.classList.remove('lu-theme-light');
      root.classList.add('lu-theme-dark');
      localStorage.setItem('lu-theme', 'dark');
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const siteName = this.getAttribute('site-name') || 'LibreUtils';
    const homeUrl = this.getAttribute('home-url') || '#/';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--lu-bg-card, white);
          border-bottom: 1px solid var(--lu-border, #e5e7eb);
        }
        .header {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--lu-space-4, 1rem) var(--lu-space-6, 1.5rem);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--lu-space-4, 1rem);
        }
        .logo {
          display: flex;
          align-items: center;
          gap: var(--lu-space-3, 0.75rem);
          text-decoration: none;
          color: var(--lu-text-primary, #111827);
        }
        .logo-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-icon svg {
          width: 100%;
          height: 100%;
        }
        .logo-text {
          font-size: var(--lu-text-xl, 1.25rem);
          font-weight: 700;
          background: linear-gradient(135deg, #613E9C, #D3381C);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        nav {
          display: flex;
          align-items: center;
          gap: var(--lu-space-6, 1.5rem);
        }
        .nav-link {
          font-size: var(--lu-text-sm, 0.875rem);
          font-weight: 500;
          color: var(--lu-text-secondary, #6b7280);
          text-decoration: none;
          transition: color var(--lu-transition-fast, 150ms ease);
        }
        .nav-link:hover {
          color: var(--lu-primary-500, #7c3aed);
        }
        .actions {
          display: flex;
          align-items: center;
          gap: var(--lu-space-2, 0.5rem);
        }
        .icon-btn {
          padding: var(--lu-space-2, 0.5rem);
          background: transparent;
          border: none;
          border-radius: var(--lu-radius-md, 0.5rem);
          cursor: pointer;
          color: var(--lu-text-secondary, #6b7280);
          transition: all var(--lu-transition-fast, 150ms ease);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:hover {
          background: var(--lu-bg-secondary, #f3f4f6);
          color: var(--lu-text-primary, #111827);
        }
        .icon-btn svg {
          width: 20px;
          height: 20px;
        }
        @media (max-width: 640px) {
          nav { display: none; }
        }
      </style>
      <header class="header">
        <a href="${homeUrl}" class="logo">
          <div class="logo-icon">
            <svg viewBox="0 0 100 100" fill="none">
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#613E9C"/>
                  <stop offset="100%" stop-color="#D3381C"/>
                </linearGradient>
              </defs>
              <rect width="100" height="100" rx="16" fill="url(#logo-grad)"/>
              <text x="50" y="68" font-family="serif" font-size="52" font-weight="400" fill="white" text-anchor="middle">L</text>
            </svg>
          </div>
          <span class="logo-text">${siteName}</span>
        </a>
        <nav>
          <slot name="nav">
            <a href="#/" class="nav-link">Tools</a>
            <a href="#/about" class="nav-link">About</a>
          </slot>
        </nav>
        <div class="actions">
          <button class="icon-btn theme-toggle" aria-label="Toggle theme">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
          <a href="https://github.com/FumingPower3925/libreutils" class="icon-btn" target="_blank" rel="noopener noreferrer" aria-label="View on GitHub">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </header>
    `;
  }
}
