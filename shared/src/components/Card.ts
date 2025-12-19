/**
 * Card Web Component
 */

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export class LuCard extends HTMLElement {
  static tagName = 'lu-card';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes(): string[] {
    return ['title', 'description', 'href', 'category'];
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const title = escapeHtml(this.getAttribute('title') || '');
    const description = escapeHtml(this.getAttribute('description') || '');
    const href = escapeHtml(this.getAttribute('href') || '#');
    const category = escapeHtml(this.getAttribute('category') || '');

    const isInteractive = href !== '#';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .card {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--lu-bg-card, white);
          border: 1px solid var(--lu-border, #e5e7eb);
          border-radius: var(--lu-radius-lg, 0.75rem);
          padding: var(--lu-space-5, 1.25rem);
          text-decoration: none;
          color: inherit;
          transition: all var(--lu-transition-normal, 250ms ease);
        }
        .card.interactive {
          cursor: pointer;
        }
        .card.interactive:hover {
          border-color: var(--lu-primary-300, #c4b5fd);
          box-shadow: var(--lu-shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1));
          transform: translateY(-2px);
        }
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--lu-space-3, 0.75rem);
        }
        .card-title {
          font-size: var(--lu-text-lg, 1.125rem);
          font-weight: 600;
          color: var(--lu-text-primary, #111827);
          margin: 0;
        }
        .card-category {
          font-size: var(--lu-text-xs, 0.75rem);
          font-weight: 500;
          color: var(--lu-primary-600, #7c3aed);
          background: var(--lu-primary-50, #f5f3ff);
          padding: 0.125rem 0.5rem;
          border-radius: var(--lu-radius-full, 9999px);
          text-transform: capitalize;
        }
        @media (prefers-color-scheme: dark) {
          .card-category {
            background: var(--lu-primary-900, #4c1d95);
            color: var(--lu-primary-200, #ddd6fe);
          }
        }
        .card-description {
          font-size: var(--lu-text-sm, 0.875rem);
          color: var(--lu-text-secondary, #6b7280);
          line-height: 1.6;
          margin: 0;
          flex: 1;
        }
        .card-footer {
          margin-top: var(--lu-space-4, 1rem);
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .card-arrow {
          color: var(--lu-primary-500, #7c3aed);
          opacity: 0;
          transform: translateX(-4px);
          transition: all var(--lu-transition-fast, 150ms ease);
        }
        .card-arrow svg {
          width: 16px;
          height: 16px;
        }
        .card.interactive:hover .card-arrow {
          opacity: 1;
          transform: translateX(0);
        }
      </style>
      ${isInteractive ? `<a href="${href}" class="card interactive">` : '<div class="card">'}
        <div class="card-header">
          <h3 class="card-title">${title}</h3>
          ${category ? `<span class="card-category">${category}</span>` : ''}
        </div>
        <p class="card-description">${description}</p>
        ${isInteractive ? `
        <div class="card-footer">
          <span class="card-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>
        ` : ''}
      ${isInteractive ? '</a>' : '</div>'}
    `;
  }
}
