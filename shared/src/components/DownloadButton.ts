import '../types.d.ts';
/**
 * DownloadButton Web Component
 * 
 * A reusable download button that triggers file downloads with custom content.
 * Styled to match LuCopyToClipboard for consistent UI.
 */

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return ch;
    }
  });
}

// File System Access API type definitions are centralized in shared/src/types.d.ts for reuse across components.

export class LuDownloadButton extends HTMLElement {
  static tagName = 'lu-download-button';
  private _content: string | Uint8Array | undefined = undefined;
  private _filename: string = 'download.txt';
  private _mimeType: string = 'text/plain';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes(): string[] {
    return ['label', 'filename', 'mime-type'];
  }

  get content(): string | Uint8Array {
    return this._content ?? '';
  }

  set content(val: string | Uint8Array) {
    this._content = val;
  }

  get filename(): string {
    return this._filename;
  }

  set filename(val: string) {
    this._filename = val;
    this.setAttribute('filename', val);
  }

  get mimeType(): string {
    return this._mimeType;
  }

  set mimeType(val: string) {
    this._mimeType = val;
    this.setAttribute('mime-type', val);
  }

  connectedCallback(): void {
    const filenameAttr = this.getAttribute('filename');
    if (filenameAttr) this._filename = filenameAttr;
    const mimeAttr = this.getAttribute('mime-type');
    if (mimeAttr) this._mimeType = mimeAttr;
    this.render();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (oldValue === newValue) return;
    if (name === 'filename') this._filename = newValue;
    if (name === 'mime-type') this._mimeType = newValue;
    this.render();
  }

  private async handleDownload(e: Event): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const content = this._content;
    if (content === undefined || (typeof content === 'string' && !content)) return;

    const filename = this.getAttribute('filename') || this._filename || 'download.txt';
    const mimeType = this.getAttribute('mime-type') || this._mimeType || 'text/plain';

    const blobParts = typeof content === 'string'
      ? [content]
      : [content as unknown as BlobPart];
    const blob = new Blob(blobParts, { type: mimeType });

    const ext = filename.split('.').pop() || 'txt';
    const accept: Record<string, string[]> = {};
    accept[mimeType] = [`.${ext}`];

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: ext.toUpperCase() + ' file',
            accept,
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: unknown) {
        if (err && typeof err === 'object') {
          const anyErr = err as { name?: string };
          if (anyErr.name === 'AbortError') return;
        }
        throw err;
      }
    }

    let url: string | undefined;
    let a: HTMLAnchorElement | null = null;
    try {
      url = URL.createObjectURL(blob);
      a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      if (url && a) {
        setTimeout(() => {
          if (a && a.parentNode) a.parentNode.removeChild(a);
          URL.revokeObjectURL(url as string);
        }, 0);
      }
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const label = escapeHtml(this.getAttribute('label') || 'Download');

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
      </style>
      
      <button class="btn" type="button">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>${label}</span>
      </button>
    `;

    const btn = this.shadowRoot.querySelector('button');
    if (btn) {
      btn.onclick = (e) => this.handleDownload(e);
    }
  }
}
