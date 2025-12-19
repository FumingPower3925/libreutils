/**
 * Text Encoder Page Component
 * 
 * The UI for the text encoder tool.
 */

import { TextEncoderTool, ENCODING_OPTIONS, type EncodingType } from './tool';

export function renderTextEncoderPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'text-encoder-page';

  container.innerHTML = `
    <style>
      .text-encoder-page {
        max-width: 1000px;
        margin: 0 auto;
        padding: var(--lu-space-8, 2rem) var(--lu-space-6, 1.5rem);
      }

      .page-header {
        margin-bottom: var(--lu-space-8, 2rem);
      }

      .page-title {
        font-size: var(--lu-text-3xl, 1.875rem);
        font-weight: 700;
        margin-bottom: var(--lu-space-2, 0.5rem);
        display: flex;
        align-items: center;
        gap: var(--lu-space-3, 0.75rem);
      }

      .page-description {
        color: var(--lu-text-secondary, #6b7280);
      }

      .privacy-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--lu-space-2, 0.5rem);
        padding: var(--lu-space-1, 0.25rem) var(--lu-space-3, 0.75rem);
        background: var(--lu-success-light, #dcfce7);
        color: var(--lu-success, #22c55e);
        font-size: var(--lu-text-xs, 0.75rem);
        font-weight: 500;
        border-radius: var(--lu-radius-full, 9999px);
        margin-top: var(--lu-space-3, 0.75rem);
      }

      @media (prefers-color-scheme: dark) {
        .privacy-badge {
          background: rgba(34, 197, 94, 0.2);
        }
      }

      .tool-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--lu-space-6, 1.5rem);
      }

      @media (max-width: 768px) {
        .tool-content {
          grid-template-columns: 1fr;
        }
      }

      .panel {
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-lg, 0.75rem);
        padding: var(--lu-space-5, 1.25rem);
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--lu-space-4, 1rem);
      }

      .panel-title {
        font-size: var(--lu-text-lg, 1.125rem);
        font-weight: 600;
      }

      .char-count {
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-muted, #9ca3af);
      }

      .text-area {
        width: 100%;
        min-height: 200px;
        padding: var(--lu-space-4, 1rem);
        font-family: var(--lu-font-mono, monospace);
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-primary, #111827);
        background: var(--lu-bg-secondary, #f3f4f6);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-md, 0.5rem);
        resize: vertical;
        transition: border-color var(--lu-transition-fast, 150ms ease);
      }

      .text-area:focus {
        outline: none;
        border-color: var(--lu-primary-500, #7c3aed);
      }

      .controls {
        display: flex;
        flex-direction: column;
        gap: var(--lu-space-4, 1rem);
        margin-bottom: var(--lu-space-6, 1.5rem);
      }

      .control-row {
        display: flex;
        align-items: center;
        gap: var(--lu-space-4, 1rem);
        flex-wrap: wrap;
      }

      .select-wrapper {
        flex: 1;
        min-width: 200px;
      }

      .select-label {
        display: block;
        font-size: var(--lu-text-sm, 0.875rem);
        font-weight: 500;
        color: var(--lu-text-secondary, #6b7280);
        margin-bottom: var(--lu-space-2, 0.5rem);
      }

      .select-input {
        width: 100%;
        padding: var(--lu-space-3, 0.75rem) var(--lu-space-10, 2.5rem) var(--lu-space-3, 0.75rem) var(--lu-space-4, 1rem);
        font-family: inherit;
        font-size: var(--lu-text-base, 1rem);
        color: var(--lu-text-primary, #111827);
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-md, 0.5rem);
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23616161' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.75rem center;
        background-size: 16px;
      }

      .select-input:focus {
        outline: none;
        border-color: var(--lu-primary-500, #613E9C);
      }

      .button-group {
        display: flex;
        gap: var(--lu-space-2, 0.5rem);
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--lu-space-2, 0.5rem);
        padding: var(--lu-space-3, 0.75rem) var(--lu-space-5, 1.25rem);
        font-family: inherit;
        font-size: var(--lu-text-sm, 0.875rem);
        font-weight: 500;
        border: none;
        border-radius: var(--lu-radius-md, 0.5rem);
        cursor: pointer;
        transition: all var(--lu-transition-fast, 150ms ease);
      }

      .btn-primary {
        background: linear-gradient(135deg, var(--lu-primary-500, #7c3aed), var(--lu-primary-600, #6d28d9));
        color: white;
      }

      .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: var(--lu-shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1));
      }

      .btn-secondary {
        background: var(--lu-bg-card, white);
        color: var(--lu-text-primary, #111827);
        border: 1px solid var(--lu-border, #e5e7eb);
      }

      .btn-secondary:hover {
        background: var(--lu-bg-secondary, #f3f4f6);
      }

      .error-message {
        background: var(--lu-error-light, #fee2e2);
        color: var(--lu-error, #dc2626);
        padding: var(--lu-space-3, 0.75rem) var(--lu-space-4, 1rem);
        border-radius: var(--lu-radius-md, 0.5rem);
        font-size: var(--lu-text-sm, 0.875rem);
        margin-top: var(--lu-space-4, 1rem);
        display: none;
      }

      .error-message.visible {
        display: block;
      }

      .copy-feedback {
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
        z-index: 1000;
      }

      .copy-feedback.visible {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    </style>
    
    <header class="page-header">
      <h1 class="page-title">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--lu-primary-500, #7c3aed);">
          <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
        </svg>
        Text Encoder / Decoder
      </h1>
      <p class="page-description">
        Encode and decode text using various formats. Supports Base64, URL encoding, HTML entities, and more.
      </p>
      <div class="privacy-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        All processing happens in your browser
      </div>
    </header>

    <div class="controls">
      <div class="control-row">
        <div class="select-wrapper">
          <label class="select-label" for="encoding-type">Encoding Type</label>
          <select class="select-input" id="encoding-type">
            ${ENCODING_OPTIONS.map(opt => `
              <option value="${opt.id}" title="${opt.description}">${opt.name}</option>
            `).join('')}
          </select>
        </div>
        <div class="button-group" style="align-self: flex-end;">
          <button class="btn btn-primary" id="encode-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Encode
          </button>
          <button class="btn btn-secondary" id="decode-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
            </svg>
            Decode
          </button>
          <button class="btn btn-secondary" id="swap-btn" title="Swap input and output">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 16V4m0 12l-4-4m4 4l4-4M17 8v12m0-12l4 4m-4-4l-4 4"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <div class="tool-content">
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Input</h2>
          <span class="char-count" id="input-count">0 characters</span>
        </div>
        <textarea class="text-area" id="input-text" placeholder="Enter text to encode or decode..."></textarea>
      </div>
      
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Output</h2>
          <span class="char-count" id="output-count">0 characters</span>
        </div>
        <textarea class="text-area" id="output-text" placeholder="Result will appear here..." readonly></textarea>
        <button class="btn btn-secondary" id="copy-btn" style="margin-top: var(--lu-space-3, 0.75rem); width: 100%;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          Copy to Clipboard
        </button>
        <div class="error-message" id="error-message"></div>
      </div>
    </div>
    
    <div class="copy-feedback" id="copy-feedback">Copied to clipboard!</div>
  `;

  setupEventListeners(container);
  return container;
}

function setupEventListeners(container: HTMLElement): void {
  const inputText = container.querySelector('#input-text') as HTMLTextAreaElement;
  const outputText = container.querySelector('#output-text') as HTMLTextAreaElement;
  const encodingType = container.querySelector('#encoding-type') as HTMLSelectElement;
  const encodeBtn = container.querySelector('#encode-btn') as HTMLButtonElement;
  const decodeBtn = container.querySelector('#decode-btn') as HTMLButtonElement;
  const swapBtn = container.querySelector('#swap-btn') as HTMLButtonElement;
  const copyBtn = container.querySelector('#copy-btn') as HTMLButtonElement;
  const inputCount = container.querySelector('#input-count') as HTMLSpanElement;
  const outputCount = container.querySelector('#output-count') as HTMLSpanElement;
  const errorMessage = container.querySelector('#error-message') as HTMLDivElement;
  const copyFeedback = container.querySelector('#copy-feedback') as HTMLDivElement;

  // Update character counts
  const updateCounts = (): void => {
    inputCount.textContent = `${inputText.value.length} characters`;
    outputCount.textContent = `${outputText.value.length} characters`;
  };

  inputText.addEventListener('input', updateCounts);

  // Encode
  encodeBtn.addEventListener('click', () => {
    try {
      errorMessage.classList.remove('visible');
      const result = TextEncoderTool.encode(inputText.value, encodingType.value as EncodingType);
      outputText.value = result;
      updateCounts();
    } catch (error) {
      errorMessage.textContent = error instanceof Error ? error.message : 'Encoding failed';
      errorMessage.classList.add('visible');
    }
  });

  // Decode
  decodeBtn.addEventListener('click', () => {
    try {
      errorMessage.classList.remove('visible');
      const result = TextEncoderTool.decode(inputText.value, encodingType.value as EncodingType);
      outputText.value = result;
      updateCounts();
    } catch (error) {
      errorMessage.textContent = error instanceof Error ? error.message : 'Decoding failed';
      errorMessage.classList.add('visible');
    }
  });

  // Swap
  swapBtn.addEventListener('click', () => {
    const temp = inputText.value;
    inputText.value = outputText.value;
    outputText.value = temp;
    updateCounts();
  });

  // Copy
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(outputText.value);
      copyFeedback.classList.add('visible');
      setTimeout(() => copyFeedback.classList.remove('visible'), 2000);
    } catch {
      try {
        outputText.select();
        document.execCommand('copy');
        copyFeedback.classList.add('visible');
        setTimeout(() => copyFeedback.classList.remove('visible'), 2000);
      } catch {
        const errorToast = document.createElement('div');
        errorToast.className = 'error-toast';
        errorToast.textContent = 'Failed to copy. Please copy manually.';
        errorToast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#dc2626;color:white;padding:12px 20px;border-radius:8px;z-index:10000;';
        document.body.appendChild(errorToast);
        setTimeout(() => errorToast.remove(), 3000);
      }
    }
  });
}
