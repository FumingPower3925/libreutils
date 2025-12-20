/**
 * CopyToClipboard Web Component
 */

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export class LuCopyToClipboard extends HTMLElement {
    static tagName = 'lu-copy-to-clipboard';
    private _value: string = '';
    private _timer: number | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes(): string[] {
        return ['label', 'text'];
    }

    get value(): string {
        return this._value || this.getAttribute('text') || '';
    }

    set value(val: string) {
        this._value = val;
        this.setAttribute('text', val);
    }

    connectedCallback(): void {
        this.render();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
        if (oldValue === newValue) return;
        if (name === 'text') this._value = newValue;
        this.render();
    }

    private async handleCopy(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        const text = this.value;
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            this.showFeedback();
        } catch {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                this.showFeedback();
            } catch (err) {
                console.error('Copy failed', err);
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }

    private showFeedback(): void {
        if (!this.shadowRoot) return;

        const feedback = this.shadowRoot.querySelector('.feedback');
        if (feedback) {
            feedback.classList.add('visible');

            if (this._timer) window.clearTimeout(this._timer);
            this._timer = window.setTimeout(() => {
                feedback.classList.remove('visible');
                this._timer = null;
            }, 2000);
        }
    }

    private render(): void {
        if (!this.shadowRoot) return;

        // Don't re-render if we are just updating text attribute to avoid losing focus or animation state
        // But for simplicity in this version, we re-render on most changes except if we optimize later.
        // Actually, checking if shadowRoot has content might be enough for initial render, 
        // but observedAttributes will trigger this. 
        // Let's implement a simple check to avoid full re-render if only text changed?
        // For now, full render is safer to ensure state consistency.

        const label = escapeHtml(this.getAttribute('label') || 'Copy');

        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--lu-space-2, 0.5rem);
          padding: var(--lu-space-2, 0.5rem) var(--lu-space-4, 1rem);
          font-family: inherit;
          font-size: var(--lu-text-sm, 0.875rem);
          font-weight: 500;
          border: 1px solid var(--lu-border, #e5e7eb);
          border-radius: var(--lu-radius-md, 0.5rem);
          cursor: pointer;
          background: var(--lu-bg-card, white);
          color: var(--lu-text-primary, #111827);
          transition: all var(--lu-transition-fast, 150ms ease);
          width: 100%;
        }
        .btn:hover {
          background: var(--lu-bg-secondary, #f3f4f6);
          border-color: var(--lu-border-hover, #d1d5db);
        }
        .btn:active {
          transform: translateY(1px);
        }
        .icon {
          width: 16px;
          height: 16px;
        }
        
        .feedback {
          position: fixed;
          bottom: var(--lu-space-6, 1.5rem);
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          background: var(--lu-gray-900, #171717);
          color: white;
          padding: var(--lu-space-3, 0.75rem) var(--lu-space-6, 1.5rem);
          border-radius: var(--lu-radius-full, 9999px);
          font-size: var(--lu-text-sm, 0.875rem);
          font-weight: 500;
          opacity: 0;
          transition: all 0.3s ease;
          pointer-events: none;
          z-index: 10000;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }
        
        .feedback.visible {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      </style>
      
      <button class="btn" type="button" aria-label="${label}">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        <span>${label}</span>
      </button>
      
      <div class="feedback">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied to clipboard!
      </div>
    `;

        const btn = this.shadowRoot.querySelector('button');
        if (btn) {
            btn.onclick = (e) => this.handleCopy(e);
        }
    }
}
