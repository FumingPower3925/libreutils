/**
 * About Page
 */

export function renderAboutPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'about-page';

  container.innerHTML = `
    <style>
      .about-page {
        max-width: 800px;
        margin: 0 auto;
        padding: var(--lu-space-12, 3rem) var(--lu-space-6, 1.5rem);
      }
      .about-header {
        text-align: center;
        margin-bottom: var(--lu-space-12, 3rem);
      }
      .about-title {
        font-size: var(--lu-text-4xl, 2.25rem);
        font-weight: 700;
        margin-bottom: var(--lu-space-4, 1rem);
      }
      .about-subtitle {
        font-size: var(--lu-text-lg, 1.125rem);
        color: var(--lu-text-secondary, #6b7280);
      }
      .about-section {
        margin-bottom: var(--lu-space-10, 2.5rem);
      }
      .section-title {
        font-size: var(--lu-text-2xl, 1.5rem);
        font-weight: 600;
        margin-bottom: var(--lu-space-4, 1rem);
      }
      .section-content {
        color: var(--lu-text-secondary, #6b7280);
        line-height: 1.7;
      }
      .section-content p {
        margin-bottom: var(--lu-space-4, 1rem);
      }
      .section-content ul {
        list-style: none;
        padding: 0;
      }
      .section-content li {
        padding-left: var(--lu-space-6, 1.5rem);
        position: relative;
        margin-bottom: var(--lu-space-2, 0.5rem);
      }
      .section-content li::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0.5em;
        width: 6px;
        height: 6px;
        background: var(--lu-success, #22c55e);
        border-radius: 50%;
      }
      .privacy-card {
        background: var(--lu-success-light, #dcfce7);
        border: 1px solid var(--lu-success, #22c55e);
        border-radius: var(--lu-radius-lg, 0.75rem);
        padding: var(--lu-space-6, 1.5rem);
        margin: var(--lu-space-8, 2rem) 0;
      }
      @media (prefers-color-scheme: dark) {
        .privacy-card {
          background: rgba(34, 197, 94, 0.1);
        }
      }
      .privacy-card-title {
        color: var(--lu-success, #22c55e);
        font-weight: 600;
        margin-bottom: var(--lu-space-2, 0.5rem);
        display: flex;
        align-items: center;
        gap: var(--lu-space-2, 0.5rem);
      }
      .privacy-card-title svg {
        width: 20px;
        height: 20px;
      }
      .tech-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: var(--lu-space-4, 1rem);
        margin-top: var(--lu-space-4, 1rem);
      }
      .tech-item {
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-md, 0.5rem);
        padding: var(--lu-space-4, 1rem);
        text-align: center;
      }
      .tech-name {
        font-weight: 600;
        color: var(--lu-text-primary, #111827);
        margin-bottom: var(--lu-space-1, 0.25rem);
      }
      .tech-desc {
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-muted, #9ca3af);
      }
      .cta-section {
        text-align: center;
        margin-top: var(--lu-space-12, 3rem);
        padding: var(--lu-space-8, 2rem);
        background: var(--lu-bg-secondary, #f3f4f6);
        border-radius: var(--lu-radius-xl, 1rem);
      }
      .cta-title {
        font-size: var(--lu-text-xl, 1.25rem);
        font-weight: 600;
        margin-bottom: var(--lu-space-4, 1rem);
      }
      .cta-buttons {
        display: flex;
        justify-content: center;
        gap: var(--lu-space-4, 1rem);
        flex-wrap: wrap;
      }
      .cta-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--lu-space-2, 0.5rem);
        padding: var(--lu-space-3, 0.75rem) var(--lu-space-6, 1.5rem);
        font-weight: 500;
        text-decoration: none;
        border-radius: var(--lu-radius-md, 0.5rem);
        transition: all var(--lu-transition-fast, 150ms ease);
      }
      .cta-btn svg {
        width: 18px;
        height: 18px;
      }
      .cta-btn-primary {
        background: var(--lu-primary-500, #7c3aed);
        color: white;
      }
      .cta-btn-primary:hover {
        background: var(--lu-primary-600, #6d28d9);
        transform: translateY(-1px);
      }
      .cta-btn-secondary {
        background: var(--lu-bg-card, white);
        color: var(--lu-text-primary, #111827);
        border: 1px solid var(--lu-border, #e5e7eb);
      }
      .cta-btn-secondary:hover {
        border-color: var(--lu-primary-300, #c4b5fd);
      }
    </style>
    
    <header class="about-header">
      <h1 class="about-title">About LibreUtils</h1>
      <p class="about-subtitle">Privacy-first, open-source web tools for everyone</p>
    </header>
    
    <section class="about-section">
      <h2 class="section-title">Our Mission</h2>
      <div class="section-content">
        <p>
          LibreUtils provides a collection of useful web tools that prioritize your privacy above all else. 
          Every tool runs entirely in your browser—your data never touches our servers because there are no servers involved in processing your data to begin with!
        </p>
        <p>
          We believe that utility tools should be free, open-source, and respect user privacy. 
          That's why LibreUtils is licensed under AGPL-3.0 and will always remain ad-free and tracker-free.
        </p>
      </div>
    </section>

    <div class="privacy-card">
      <h3 class="privacy-card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Privacy Guarantee
      </h3>
      <p style="margin: 0; color: var(--lu-success);">
        All processing happens in your browser. We don't collect, store, or transmit any of your data. 
        There are no analytics, no cookies, and no tracking scripts.
      </p>
    </div>
    
    <section class="about-section">
      <h2 class="section-title">Why LibreUtils?</h2>
      <div class="section-content">
        <ul>
          <li>100% client-side processing—your data never leaves your device</li>
          <li>No accounts, no sign-ups, no tracking</li>
          <li>Works offline as a Progressive Web App (PWA)</li>
          <li>Open source and auditable code</li>
          <li>No ads, no premium tiers, completely free</li>
          <li>Modern, accessible, and responsive design</li>
        </ul>
      </div>
    </section>
    
    <section class="cta-section">
      <h2 class="cta-title">Contribute to LibreUtils</h2>
      <p style="color: var(--lu-text-secondary); margin-bottom: var(--lu-space-6);">
        LibreUtils is open source. Help us add more tools or improve existing ones!
      </p>
      <div class="cta-buttons">
        <a href="https://github.com/FumingPower3925/libreutils" class="cta-btn cta-btn-primary" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          View on GitHub
        </a>
        <a href="#/" class="cta-btn cta-btn-secondary">
          Browse Tools
        </a>
      </div>
    </section>
  `;

  return container;
}
