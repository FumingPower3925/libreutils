/**
 * Encryptor / Decryptor Page - UI Implementation
 * 
 * Features:
 * - Text/File input toggle
 * - Password input with confirmation for encryption
 * - Algorithm selection with feature detection (AES-128/192/256-GCM, ChaCha20-Poly1305)
 * - Advanced options (iterations, salt length, IV length)
 * - Encrypt/Decrypt actions
 * - Output display with copy and download options
 */

import {
  EncryptorTool,
  getEncryptionOptions,
  DEFAULT_PBKDF2_ITERATIONS,
  DEFAULT_SALT_LENGTH,
  DEFAULT_IV_LENGTH
} from './tool';
import type { EncryptionAlgorithm, AdvancedOptions } from './tool';

let cleanupHook: (() => void) | null = null;

export function secureCleanup(): void {
  if (cleanupHook) {
    cleanupHook();
  }
}

// Best-effort helpers to overwrite sensitive data before clearing.
// Note: JavaScript cannot guarantee secure memory wiping. These functions
// reduce, but do not eliminate, the risk of sensitive data lingering.
const secureRandomString = (length: number): string => {
  if (length <= 0) return '';
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charsetLen = charset.length;
  let result = '';

  const globalWithCrypto = globalThis as typeof globalThis & {
    crypto?: Crypto;
    msCrypto?: Crypto;
  };
  const cryptoObj: Crypto | undefined =
    (typeof globalThis !== 'undefined' &&
      (globalWithCrypto.crypto || globalWithCrypto.msCrypto)) as Crypto | undefined;

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const randomValues = new Uint32Array(length);
    cryptoObj.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charsetLen];
    }
  } else {
    // Fallback to Math.random if crypto is not available.
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * charsetLen);
      result += charset[idx];
    }
  }

  return result;
};

const scrubValueElement = (el: { value: string } | null | undefined): void => {
  if (!el) return;
  const len = el.value ? el.value.length : 0;
  if (len > 0) {
    // Overwrite with random data before clearing.
    el.value = secureRandomString(len);
  }
  el.value = '';
};

// Maximum size for text display in output (100MB) - larger files only show download option
const MAX_TEXT_DISPLAY_SIZE = 100 * 1024 * 1024;

// Get MIME type from file extension
function getMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    // Text
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',
    md: 'text/markdown',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

// SVG Icons
const ICONS = {
  lock: `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  unlock: `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>`,
  file: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
  eye: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  x: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  settings: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  chevronDown: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
};

export function renderEncryptorPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'tool-page';

  container.innerHTML = `
    <style>
      .tool-page {
        max-width: 800px;
        margin: 0 auto;
        padding: var(--lu-space-6, 1.5rem);
      }
      
      .page-header {
        text-align: center;
        margin-bottom: var(--lu-space-8, 2rem);
      }
      
      .page-title {
        font-size: var(--lu-text-3xl, 1.875rem);
        font-weight: 700;
        color: var(--lu-text-primary, #111827);
        margin: 0 0 var(--lu-space-2, 0.5rem) 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--lu-space-3, 0.75rem);
      }
      
      .page-title-icon {
        color: var(--lu-primary-500, #613E9C);
      }
      
      .page-description {
        color: var(--lu-text-secondary, #6b7280);
        font-size: var(--lu-text-base, 1rem);
        margin: 0;
      }
      
      .main-card {
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-lg, 0.75rem);
        padding: var(--lu-space-6, 1.5rem);
        margin-bottom: var(--lu-space-4, 1rem);
      }
      
      .mode-toggle {
        display: flex;
        gap: var(--lu-space-2, 0.5rem);
        margin-bottom: var(--lu-space-4, 1rem);
      }
      
      .mode-btn {
        flex: 1;
        padding: var(--lu-space-3, 0.75rem);
        border: 1px solid var(--lu-border, #e5e7eb);
        background: var(--lu-bg-card, white);
        border-radius: var(--lu-radius-md, 0.5rem);
        cursor: pointer;
        font-size: var(--lu-text-sm, 0.875rem);
        font-weight: 500;
        color: var(--lu-text-primary, #111827);
        transition: all 0.15s ease;
      }
      
      .mode-btn:hover {
        background: var(--lu-bg-secondary, #f9fafb);
      }
      
      .mode-btn.active {
        background: var(--lu-primary-500, #613E9C);
        color: white;
        border-color: var(--lu-primary-500, #613E9C);
      }
      
      .input-group {
        margin-bottom: var(--lu-space-4, 1rem);
      }
      
      .input-label {
        display: block;
        font-size: var(--lu-text-sm, 0.875rem);
        font-weight: 500;
        color: var(--lu-text-primary, #111827);
        margin-bottom: var(--lu-space-2, 0.5rem);
      }
      
      .text-area {
        width: 100%;
        min-height: 150px;
        padding: var(--lu-space-3, 0.75rem);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-md, 0.5rem);
        font-family: var(--lu-font-mono, monospace);
        font-size: var(--lu-text-sm, 0.875rem);
        resize: vertical;
        background: var(--lu-bg-card, white);
        color: var(--lu-text-primary, #111827);
      }
      
      .text-area:focus {
        outline: none;
        border-color: var(--lu-primary-500, #613E9C);
        box-shadow: 0 0 0 3px rgba(97, 62, 156, 0.1);
      }
      
      .password-input-wrapper {
        position: relative;
      }
      
      .password-input {
        width: 100%;
        padding: var(--lu-space-3, 0.75rem);
        padding-right: 44px;
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-md, 0.5rem);
        font-size: var(--lu-text-sm, 0.875rem);
        background: var(--lu-bg-card, white);
        color: var(--lu-text-primary, #111827);
      }
      
      .password-input:focus {
        outline: none;
        border-color: var(--lu-primary-500, #613E9C);
        box-shadow: 0 0 0 3px rgba(97, 62, 156, 0.1);
      }
      
      .password-toggle {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        color: var(--lu-text-muted, #9ca3af);
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .password-toggle:hover {
        color: var(--lu-text-primary, #111827);
      }
      
      .select-wrapper {
        position: relative;
      }
      
      .select-input {
        width: 100%;
        padding: var(--lu-space-3, 0.75rem);
        padding-right: 40px;
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-md, 0.5rem);
        font-size: var(--lu-text-sm, 0.875rem);
        background: var(--lu-bg-card, white);
        color: var(--lu-text-primary, #111827);
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
      }
      
      .select-chevron {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: var(--lu-text-muted, #9ca3af);
      }
      
      .select-input option:disabled {
        color: var(--lu-text-muted, #9ca3af);
      }
      
      .file-drop-zone {
        border: 2px dashed var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-md, 0.5rem);
        padding: var(--lu-space-8, 2rem);
        text-align: center;
        cursor: pointer;
        transition: all 0.15s ease;
        display: none;
      }
      
      .file-drop-zone.visible {
        display: block;
      }
      
      .file-drop-zone:hover,
      .file-drop-zone.dragover {
        border-color: var(--lu-primary-500, #613E9C);
        background: rgba(97, 62, 156, 0.05);
      }
      
      .file-drop-icon {
        margin-bottom: var(--lu-space-2, 0.5rem);
        color: var(--lu-text-muted, #9ca3af);
      }
      
      .file-drop-text {
        color: var(--lu-text-secondary, #6b7280);
        font-size: var(--lu-text-sm, 0.875rem);
      }
      
      .file-info {
        display: none;
        align-items: center;
        gap: var(--lu-space-3, 0.75rem);
        padding: var(--lu-space-3, 0.75rem);
        background: var(--lu-bg-secondary, #f9fafb);
        border-radius: var(--lu-radius-md, 0.5rem);
        margin-top: var(--lu-space-2, 0.5rem);
      }
      
      .file-info.visible {
        display: flex;
      }
      
      .file-name {
        flex: 1;
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-primary, #111827);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .file-size {
        font-size: var(--lu-text-xs, 0.75rem);
        color: var(--lu-text-muted, #9ca3af);
      }
      
      .file-remove {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--lu-text-muted, #9ca3af);
        padding: 4px;
        display: flex;
        align-items: center;
      }
      
      .file-remove:hover {
        color: var(--lu-error, #dc2626);
      }
      
      .advanced-toggle {
        display: flex;
        align-items: center;
        gap: var(--lu-space-2, 0.5rem);
        cursor: pointer;
        color: var(--lu-text-secondary, #6b7280);
        font-size: var(--lu-text-sm, 0.875rem);
        padding: var(--lu-space-2, 0.5rem) 0;
        border: none;
        background: none;
        margin-bottom: var(--lu-space-2, 0.5rem);
      }
      
      .advanced-toggle:hover {
        color: var(--lu-text-primary, #111827);
      }
      
      .advanced-options {
        display: none;
        padding: var(--lu-space-4, 1rem);
        background: var(--lu-bg-secondary, #f9fafb);
        border-radius: var(--lu-radius-md, 0.5rem);
        margin-bottom: var(--lu-space-4, 1rem);
      }
      
      .advanced-options.visible {
        display: block;
      }
      
      .advanced-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--lu-space-3, 0.75rem);
      }
      
      .advanced-input {
        width: 100%;
        padding: var(--lu-space-2, 0.5rem);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-md, 0.5rem);
        font-size: var(--lu-text-sm, 0.875rem);
        background: var(--lu-bg-card, white);
        color: var(--lu-text-primary, #111827);
      }
      
      .advanced-label {
        font-size: var(--lu-text-xs, 0.75rem);
        color: var(--lu-text-muted, #9ca3af);
        margin-bottom: var(--lu-space-1, 0.25rem);
        display: block;
      }
      
      .action-buttons {
        display: flex;
        gap: var(--lu-space-3, 0.75rem);
        margin-top: var(--lu-space-4, 1rem);
      }
      
      .btn {
        flex: 1;
        padding: var(--lu-space-3, 0.75rem) var(--lu-space-4, 1rem);
        border: none;
        border-radius: var(--lu-radius-md, 0.5rem);
        font-size: var(--lu-text-sm, 0.875rem);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--lu-space-2, 0.5rem);
      }
      
      .btn-primary {
        background: var(--lu-primary-500, #613E9C);
        color: white;
      }
      
      .btn-primary:hover {
        background: var(--lu-primary-600, #57388c);
      }
      
      .btn-primary:disabled {
        background: var(--lu-gray-400, #9ca3af);
        cursor: not-allowed;
      }
      
      .btn-icon {
        width: 18px;
        height: 18px;
      }
      
      .output-section {
        display: none;
      }
      
      .output-section.visible {
        display: block;
      }
      
      .output-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--lu-space-2, 0.5rem);
      }
      
      .output-label {
        font-size: var(--lu-text-sm, 0.875rem);
        font-weight: 500;
        color: var(--lu-text-primary, #111827);
      }
      
      .output-actions {
        display: flex;
        gap: var(--lu-space-2, 0.5rem);
      }
      
      
      .output-text {
        width: 100%;
        min-height: 100px;
        padding: var(--lu-space-3, 0.75rem);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-md, 0.5rem);
        font-family: var(--lu-font-mono, monospace);
        font-size: var(--lu-text-sm, 0.875rem);
        background: var(--lu-bg-secondary, #f9fafb);
        color: var(--lu-text-primary, #111827);
        resize: vertical;
      }
      
      .error-message {
        background: var(--lu-error-light, #fef2f2);
        color: var(--lu-error, #dc2626);
        padding: var(--lu-space-3, 0.75rem);
        border-radius: var(--lu-radius-md, 0.5rem);
        font-size: var(--lu-text-sm, 0.875rem);
        margin-top: var(--lu-space-3, 0.75rem);
        display: none;
      }
      
      .error-message.visible {
        display: block;
      }
      
      .success-message {
        background: var(--lu-success-light, #f0fdf4);
        color: var(--lu-success, #16a34a);
        padding: var(--lu-space-3, 0.75rem);
        border-radius: var(--lu-radius-md, 0.5rem);
        font-size: var(--lu-text-sm, 0.875rem);
        margin-top: var(--lu-space-3, 0.75rem);
        display: none;
      }
      
      .success-message.visible {
        display: block;
      }
      
      .confirm-password-group {
        display: none;
      }
      
      .confirm-password-group.visible {
        display: block;
      }
      
      .lu-theme-dark .main-card {
        background: var(--lu-bg-card, #252525);
        border-color: var(--lu-border, #333333);
      }
      
      .lu-theme-dark .text-area,
      .lu-theme-dark .password-input,
      .lu-theme-dark .select-input,
      .lu-theme-dark .advanced-input {
        background: var(--lu-bg-secondary, #1e1e1e);
        border-color: var(--lu-border, #333333);
        color: var(--lu-text-primary, #fafafa);
      }
      
      .lu-theme-dark .output-text {
        background: var(--lu-bg-secondary, #1e1e1e);
        color: var(--lu-text-primary, #fafafa);
      }
      
      .lu-theme-dark .file-drop-zone {
        border-color: var(--lu-border, #333333);
      }
      
      .lu-theme-dark .file-info,
      .lu-theme-dark .advanced-options {
        background: var(--lu-bg-secondary, #1e1e1e);
      }
    </style>
    
    <header class="page-header">
      <h1 class="page-title">
        <span class="page-title-icon">${ICONS.lock}</span>
        Encryptor / Decryptor
      </h1>
      <p class="page-description">Encrypt and decrypt text or files with AES and ChaCha20 encryption</p>
    </header>
    
    <div class="main-card">
      <div class="mode-toggle">
        <button class="mode-btn active" id="mode-encrypt" type="button">Encrypt</button>
        <button class="mode-btn" id="mode-decrypt" type="button">Decrypt</button>
      </div>
      
      <div class="mode-toggle">
        <button class="mode-btn active" id="input-text-mode" type="button">Text Input</button>
        <button class="mode-btn" id="input-file-mode" type="button">File Input</button>
      </div>
      
      <div class="input-group" id="text-input-group">
        <label class="input-label" for="input-text">
          <span id="input-label-text">Text to Encrypt</span>
        </label>
        <textarea class="text-area" id="input-text" placeholder="Enter text here..." autocomplete="off"></textarea>
      </div>
      
      <div class="input-group" id="file-input-group">
        <label class="input-label">File to Process</label>
        <div class="file-drop-zone visible" id="file-drop-zone">
          <div class="file-drop-icon">${ICONS.file}</div>
          <div class="file-drop-text">Drop file here or click to browse</div>
          <input type="file" id="file-input" hidden>
        </div>
        <div class="file-info" id="file-info">
          <span class="file-name" id="file-name"></span>
          <span class="file-size" id="file-size"></span>
          <button class="file-remove" id="file-remove" type="button" title="Remove file">${ICONS.x}</button>
        </div>
      </div>
      
      <div class="input-group">
        <label class="input-label" for="password">Password</label>
        <div class="password-input-wrapper">
          <input type="password" class="password-input" id="password" placeholder="Enter password" autocomplete="new-password">
          <button class="password-toggle" id="password-toggle" type="button" title="Toggle password visibility">${ICONS.eye}</button>
        </div>
      </div>
      
      <div class="input-group confirm-password-group" id="confirm-password-group">
        <label class="input-label" for="confirm-password">Confirm Password</label>
        <div class="password-input-wrapper">
          <input type="password" class="password-input" id="confirm-password" placeholder="Confirm password" autocomplete="new-password">
        </div>
      </div>
      
      <div class="input-group" id="algorithm-group">
        <label class="input-label" for="algorithm">Encryption Algorithm</label>
        <div class="select-wrapper">
          <select class="select-input" id="algorithm">
            <!-- Populated by JavaScript with feature detection -->
          </select>
          <span class="select-chevron">${ICONS.chevronDown}</span>
        </div>
      </div>
      
      <button class="advanced-toggle" id="advanced-toggle" type="button">
        ${ICONS.settings}
        <span>Advanced Options</span>
      </button>
      
      <div class="advanced-options" id="advanced-options">
        <div class="advanced-row">
          <div>
            <label class="advanced-label" for="iterations">PBKDF2 Iterations</label>
            <input type="number" class="advanced-input" id="iterations" value="${DEFAULT_PBKDF2_ITERATIONS}" min="100000" max="1000000">
          </div>
          <div>
            <label class="advanced-label" for="salt-length">Salt Length (bytes)</label>
            <input type="number" class="advanced-input" id="salt-length" value="${DEFAULT_SALT_LENGTH}" min="8" max="64">
          </div>
          <div>
            <label class="advanced-label" for="iv-length">IV Length (bytes)</label>
            <input type="number" class="advanced-input" id="iv-length" value="${DEFAULT_IV_LENGTH}" min="12" max="16">
          </div>
        </div>
      </div>
      
      <div class="action-buttons">
        <button class="btn btn-primary" id="action-btn" type="button">
          <span id="action-btn-icon">${ICONS.lock}</span>
          <span id="action-btn-text">Encrypt</span>
        </button>
      </div>
      
      <div class="error-message" id="error-message"></div>
      <div class="success-message" id="success-message"></div>
    </div>
    
    <div class="main-card output-section" id="output-section">
      <div class="output-header">
        <span class="output-label" id="output-label">Encrypted Output</span>
        <div class="output-actions">
          <lu-copy-to-clipboard id="copy-output-btn" label="Copy"></lu-copy-to-clipboard>
          <lu-download-button id="download-btn" label="Download" filename="encrypted.txt"></lu-download-button>
        </div>
      </div>
      <textarea class="output-text" id="output-text" readonly></textarea>
    </div>
  `;

  setupEventListeners(container);
  return container;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function populateAlgorithmSelect(select: HTMLSelectElement): Promise<void> {
  const options = await getEncryptionOptions();
  select.innerHTML = '';

  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt.id;
    option.textContent = `${opt.name} - ${opt.description}`;
    option.disabled = !opt.supported;
    select.appendChild(option);
  }
}

function setupEventListeners(container: HTMLElement): void {
  const modeEncrypt = container.querySelector('#mode-encrypt') as HTMLButtonElement;
  const modeDecrypt = container.querySelector('#mode-decrypt') as HTMLButtonElement;
  const inputTextMode = container.querySelector('#input-text-mode') as HTMLButtonElement;
  const inputFileMode = container.querySelector('#input-file-mode') as HTMLButtonElement;
  const textInputGroup = container.querySelector('#text-input-group') as HTMLDivElement;
  const fileInputGroup = container.querySelector('#file-input-group') as HTMLDivElement;
  const inputText = container.querySelector('#input-text') as HTMLTextAreaElement;
  const inputLabelText = container.querySelector('#input-label-text') as HTMLSpanElement;
  const fileDropZone = container.querySelector('#file-drop-zone') as HTMLDivElement;
  const fileInput = container.querySelector('#file-input') as HTMLInputElement;
  const fileInfo = container.querySelector('#file-info') as HTMLDivElement;
  const fileName = container.querySelector('#file-name') as HTMLSpanElement;
  const fileSize = container.querySelector('#file-size') as HTMLSpanElement;
  const fileRemove = container.querySelector('#file-remove') as HTMLButtonElement;
  const password = container.querySelector('#password') as HTMLInputElement;
  const passwordToggle = container.querySelector('#password-toggle') as HTMLButtonElement;
  const confirmPasswordGroup = container.querySelector('#confirm-password-group') as HTMLDivElement;
  const confirmPassword = container.querySelector('#confirm-password') as HTMLInputElement;
  const algorithm = container.querySelector('#algorithm') as HTMLSelectElement;
  const algorithmGroup = container.querySelector('#algorithm-group') as HTMLDivElement;
  const advancedToggle = container.querySelector('#advanced-toggle') as HTMLButtonElement;
  const advancedOptions = container.querySelector('#advanced-options') as HTMLDivElement;
  const iterationsInput = container.querySelector('#iterations') as HTMLInputElement;
  const saltLengthInput = container.querySelector('#salt-length') as HTMLInputElement;
  const ivLengthInput = container.querySelector('#iv-length') as HTMLInputElement;
  const actionBtn = container.querySelector('#action-btn') as HTMLButtonElement;
  const actionBtnIcon = container.querySelector('#action-btn-icon') as HTMLSpanElement;
  const actionBtnText = container.querySelector('#action-btn-text') as HTMLSpanElement;
  const errorMessage = container.querySelector('#error-message') as HTMLDivElement;
  const successMessage = container.querySelector('#success-message') as HTMLDivElement;
  const outputSection = container.querySelector('#output-section') as HTMLDivElement;
  const outputLabel = container.querySelector('#output-label') as HTMLSpanElement;
  const outputText = container.querySelector('#output-text') as HTMLTextAreaElement;
  const copyOutputBtn = container.querySelector('#copy-output-btn') as HTMLElement & { value: string };
  const downloadBtn = container.querySelector('#download-btn') as HTMLElement & {
    content: string | Uint8Array;
    filename: string;
    mimeType: string;
  };

  let isEncryptMode = true;
  let isTextInputMode = true;
  let isPasswordVisible = false;
  let selectedFile: File | null = null;
  let fileData: Uint8Array | null = null;

  // Populate algorithm options with feature detection
  populateAlgorithmSelect(algorithm);


  // Cleanup hook
  cleanupHook = () => {
    // Best-effort scrubbing of sensitive text fields.
    scrubValueElement(inputText);
    scrubValueElement(password);
    scrubValueElement(confirmPassword);
    scrubValueElement(outputText);

    // copyOutputBtn is not expected to hold sensitive data, so a simple clear is used.
    if (copyOutputBtn) copyOutputBtn.value = '';

    selectedFile = null;

    // Best-effort scrubbing of in-memory file data.
    if (fileData) {
      const globalWithCrypto = globalThis as typeof globalThis & {
        crypto?: Crypto;
        msCrypto?: Crypto;
      };
      const cryptoObj: Crypto | undefined =
        (typeof globalThis !== 'undefined' &&
          (globalWithCrypto.crypto || globalWithCrypto.msCrypto)) as Crypto | undefined;
      if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
        cryptoObj.getRandomValues(fileData);
      }
      // Overwrite again with zeros to reduce residual data.
      fileData.fill(0);
    }
    fileData = null;
  };

  const updateMode = () => {
    modeEncrypt.classList.toggle('active', isEncryptMode);
    modeDecrypt.classList.toggle('active', !isEncryptMode);
    confirmPasswordGroup.classList.toggle('visible', isEncryptMode);
    algorithmGroup.style.display = isEncryptMode ? 'block' : 'none';
    advancedToggle.style.display = isEncryptMode ? 'flex' : 'none';
    if (!isEncryptMode) advancedOptions.classList.remove('visible');
    inputLabelText.textContent = isEncryptMode ? 'Text to Encrypt' : 'Encrypted Text to Decrypt';
    actionBtnIcon.innerHTML = isEncryptMode ? ICONS.lock : ICONS.unlock;
    actionBtnText.textContent = isEncryptMode ? 'Encrypt' : 'Decrypt';
    outputLabel.textContent = isEncryptMode ? 'Encrypted Output' : 'Decrypted Output';
    inputText.placeholder = isEncryptMode ? 'Enter text here...' : 'Paste encrypted text here...';
    downloadBtn.filename = isEncryptMode ? 'encrypted.txt' : 'decrypted.txt';
  };

  modeEncrypt.addEventListener('click', () => {
    isEncryptMode = true;
    updateMode();
    clearMessages();
  });

  modeDecrypt.addEventListener('click', () => {
    isEncryptMode = false;
    updateMode();
    clearMessages();
  });

  const updateInputMode = () => {
    inputTextMode.classList.toggle('active', isTextInputMode);
    inputFileMode.classList.toggle('active', !isTextInputMode);
    textInputGroup.style.display = isTextInputMode ? 'block' : 'none';
    fileInputGroup.style.display = isTextInputMode ? 'none' : 'block';
  };

  inputTextMode.addEventListener('click', () => {
    isTextInputMode = true;
    updateInputMode();
    clearMessages();
  });

  inputFileMode.addEventListener('click', () => {
    isTextInputMode = false;
    updateInputMode();
    clearMessages();
  });

  // File handling
  fileDropZone.addEventListener('click', () => fileInput.click());

  fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('dragover');
  });

  fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('dragover');
  });

  fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('dragover');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  const handleFile = async (file: File) => {
    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileDropZone.classList.remove('visible');
    fileInfo.classList.add('visible');

    // Read file data
    const buffer = await file.arrayBuffer();
    fileData = new Uint8Array(buffer);
  };

  fileRemove.addEventListener('click', () => {
    selectedFile = null;
    fileData = null;
    fileInput.value = '';
    fileDropZone.classList.add('visible');
    fileInfo.classList.remove('visible');
  });

  // Password toggle
  passwordToggle.addEventListener('click', () => {
    isPasswordVisible = !isPasswordVisible;
    const type = isPasswordVisible ? 'text' : 'password';
    password.type = type;
    confirmPassword.type = type;
    passwordToggle.innerHTML = isPasswordVisible ? ICONS.eyeOff : ICONS.eye;
  });

  // Advanced options toggle
  advancedToggle.addEventListener('click', () => {
    advancedOptions.classList.toggle('visible');
  });

  // Clear messages
  const clearMessages = () => {
    errorMessage.classList.remove('visible');
    successMessage.classList.remove('visible');
    outputSection.classList.remove('visible');
  };

  // Show error
  const showError = (msg: string) => {
    errorMessage.textContent = msg;
    errorMessage.classList.add('visible');
    successMessage.classList.remove('visible');
  };

  // Show success
  const showSuccess = (msg: string) => {
    successMessage.textContent = msg;
    successMessage.classList.add('visible');
    errorMessage.classList.remove('visible');
  };

  // Main action
  actionBtn.addEventListener('click', async () => {
    clearMessages();

    const pwd = password.value;

    if (!pwd) {
      showError('Password is required');
      return;
    }

    if (isEncryptMode && pwd !== confirmPassword.value) {
      showError('Passwords do not match');
      return;
    }

    try {
      actionBtn.disabled = true;
      actionBtnText.textContent = isEncryptMode ? 'Encrypting...' : 'Decrypting...';

      let result: string;

      if (isEncryptMode) {
        const alg = algorithm.value as EncryptionAlgorithm;

        // Get advanced options
        const advOptions: AdvancedOptions = {
          iterations: parseInt(iterationsInput.value) || DEFAULT_PBKDF2_ITERATIONS,
          saltLength: parseInt(saltLengthInput.value) || DEFAULT_SALT_LENGTH,
          ivLength: parseInt(ivLengthInput.value) || DEFAULT_IV_LENGTH,
        };

        if (isTextInputMode) {
          const text = inputText.value;
          if (!text) {
            showError('Please enter text to encrypt');
            return;
          }
          result = await EncryptorTool.encryptText(text, pwd, alg, advOptions);
        } else {
          if (!fileData || !selectedFile) {
            showError('Please select a file to encrypt');
            return;
          }
          advOptions.filename = selectedFile.name;
          advOptions.mimeType = selectedFile.type;
          if (!advOptions.mimeType) {
            advOptions.mimeType = getMimeType(selectedFile.name.split('.').pop()?.toLowerCase() || '');
          }
          result = await EncryptorTool.encrypt(fileData, pwd, alg, advOptions);
        }

        // Check if result is too large to display
        if (result.length > MAX_TEXT_DISPLAY_SIZE) {
          outputText.value = '[Output too large to display. Use the Download button to save the encrypted data.]';
          copyOutputBtn.value = '';
        } else {
          outputText.value = result;
          copyOutputBtn.value = result;
        }
        downloadBtn.content = result;
        downloadBtn.filename = isTextInputMode ? 'encrypted.txt' : (selectedFile?.name || 'encrypted') + '.enc';
        downloadBtn.mimeType = 'text/plain';
        outputSection.classList.add('visible');
        showSuccess('Encryption successful!');

      } else {
        let input: string;

        if (isTextInputMode) {
          input = inputText.value;
          if (!input) {
            showError('Please enter encrypted text to decrypt');
            return;
          }
        } else {
          if (!fileData) {
            showError('Please select an encrypted file to decrypt');
            return;
          }
          // File is expected to contain the encrypted text
          input = new TextDecoder().decode(fileData);
        }

        // Decrypt with metadata to get original filename
        const { data: decrypted, filename: originalFilename, mimeType: originalMimeType } = await EncryptorTool.decryptWithMetadata(input, pwd);

        // Check if data looks like valid UTF-8 text (heuristic)
        const isLikelyText = (() => {
          // Check first 1024 bytes for text characteristics
          const sample = decrypted.slice(0, 1024);
          let printableCount = 0;
          for (let i = 0; i < sample.length; i++) {
            const byte = sample[i];
            // ASCII printable (32-126), newline, tab, carriage return
            if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
              printableCount++;
            }
          }
          // If >90% are printable characters, likely text
          return (printableCount / sample.length) > 0.9;
        })();

        if (isLikelyText) {
          // Text data
          result = new TextDecoder().decode(decrypted);
          if (result.length > MAX_TEXT_DISPLAY_SIZE) {
            outputText.value = '[Output too large to display. Use the Download button to save the decrypted data.]';
            copyOutputBtn.value = '';
          } else {
            outputText.value = result;
            copyOutputBtn.value = result;
          }
          downloadBtn.content = result;
          downloadBtn.mimeType = 'text/plain';
          downloadBtn.filename = originalFilename || 'decrypted.txt';
        } else {
          outputText.value = '[Binary file - use Download to save]';
          copyOutputBtn.value = '';
          downloadBtn.content = decrypted;

          let mimeType = originalMimeType;
          if (!mimeType) {
            const ext = originalFilename?.split('.').pop()?.toLowerCase() || '';
            mimeType = getMimeType(ext) || 'application/octet-stream';
          }
          downloadBtn.mimeType = mimeType;
          downloadBtn.filename = originalFilename || 'decrypted.bin';
        }

        outputSection.classList.add('visible');
        showSuccess('Decryption successful!');
      }

    } catch (error) {
      showError(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      actionBtn.disabled = false;
      actionBtnText.textContent = isEncryptMode ? 'Encrypt' : 'Decrypt';
      // Enhance security by scrubbing password inputs after operation
      scrubValueElement(password);
      scrubValueElement(confirmPassword);
    }
  });

  // Initialize state
  updateMode();
  updateInputMode();
}
