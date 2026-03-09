import { ArchiveManager } from './tool';
import type { ArchiveEntry, ExtractedFile, InputFile, CreateArchiveFormat } from './tool';

// Icons
const ICONS = {
    archive: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><rect x="10" y="5" width="4" height="2"/><rect x="10" y="9" width="4" height="2"/><rect x="10" y="13" width="4" height="2"/></svg>`,
    upload: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    file: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
    folder: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`,
    download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    remove: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    eyeOpen: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeClosed: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
};

function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

let cleanupHook: (() => void) | null = null;

export function secureCleanup(): void {
    if (cleanupHook) {
        try { cleanupHook(); } finally { cleanupHook = null; }
    }
}

export function renderArchiveManagerPage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tool-page';

    container.innerHTML = `
    <style>
      .tool-page { max-width: 800px; margin: 0 auto; padding: 1.5rem; }
      .header { text-align: center; margin-bottom: 2rem; }
      .title { font-size: 1.875rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
      .subtitle { color: var(--lu-text-secondary, #6b7280); }

      .card { background: var(--lu-bg-card, white); border: 1px solid var(--lu-border, #e5e7eb); border-radius: 0.75rem; padding: 1.5rem; }

      .drop-zone { border: 2px dashed var(--lu-border, #e5e7eb); border-radius: 0.5rem; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.2s; }
      .drop-zone:hover, .drop-zone.dragover { border-color: var(--lu-primary-500, #613E9C); background: var(--lu-bg-secondary, #f9fafb); }
      .drop-zone.has-file { border-color: var(--lu-success, #10b981); background: var(--lu-success-light, #ecfdf5); }

      .btn { padding: 0.75rem 1.5rem; background: var(--lu-primary-500, #613E9C); color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; }
      .btn:hover { background: var(--lu-primary-600, #4e3280); }
      .btn:disabled { background: var(--lu-text-muted, #9ca3af); cursor: not-allowed; }
      .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8rem; border-radius: 0.375rem; }
      .btn-full { width: 100%; }
      .btn-secondary { background: var(--lu-bg-secondary, #f3f4f6); color: var(--lu-text-primary, #111827); border: 1px solid var(--lu-border, #e5e7eb); }
      .btn-secondary:hover { background: var(--lu-border, #e5e7eb); }
      .btn-danger { background: transparent; color: var(--lu-error, #ef4444); border: none; padding: 0.25rem; cursor: pointer; display: inline-flex; align-items: center; }
      .btn-danger:hover { color: var(--lu-error, #dc2626); }

      .progress-bar { height: 4px; background: var(--lu-bg-secondary, #f3f4f6); border-radius: 2px; overflow: hidden; margin-top: 0.75rem; display: none; }
      .progress-fill { height: 100%; background: var(--lu-primary-500, #613E9C); width: 0%; transition: width 0.2s; }

      .result-area { margin-top: 1.5rem; display: none; }
      .result-area.visible { display: block; }

      .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
      .result-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
      .result-summary { font-size: 0.85rem; color: var(--lu-text-secondary, #6b7280); }

      .entry-list { border: 1px solid var(--lu-border, #e5e7eb); border-radius: 0.5rem; overflow: hidden; }
      .entry-item { display: flex; align-items: center; justify-content: space-between; padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--lu-border, #e5e7eb); font-size: 0.875rem; gap: 0.5rem; }
      .entry-item:last-child { border-bottom: none; }
      .entry-item:nth-child(even) { background: var(--lu-bg-secondary, #f9fafb); }

      .entry-info { display: flex; align-items: center; gap: 0.5rem; min-width: 0; flex: 1; }
      .entry-icon { flex-shrink: 0; color: var(--lu-text-secondary, #6b7280); display: flex; align-items: center; }
      .entry-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .entry-size { flex-shrink: 0; color: var(--lu-text-secondary, #6b7280); font-size: 0.8rem; margin-right: 0.5rem; }
      .entry-actions { flex-shrink: 0; display: flex; align-items: center; gap: 0.25rem; }

      .status-msg { text-align: center; padding: 1rem; color: var(--lu-text-secondary, #6b7280); font-size: 0.9rem; }
      .status-msg.error { color: var(--lu-error, #ef4444); }

      .compress-controls { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
      .control-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
      .control-row label { font-size: 0.85rem; font-weight: 600; color: var(--lu-text-primary, #111827); min-width: 5rem; }
      .control-row select { font-size: 0.85rem; padding: 0.375rem 0.5rem; border: 1px solid var(--lu-border, #e5e7eb); border-radius: 0.375rem; background: var(--lu-bg-card, white); color: var(--lu-text-primary, #111827); color-scheme: light dark; min-width: 6rem; }
      .control-row select option { background: var(--lu-bg-card, white); color: var(--lu-text-primary, #111827); }
      .control-row select option:disabled { color: var(--lu-text-muted, #9ca3af); font-style: italic; }
      .format-hint { font-size: 0.75rem; color: var(--lu-text-muted, #9ca3af); margin-top: 0.125rem; display: none; }

      /* Custom range slider */
      .slider-wrap { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0; }
      .slider-wrap input[type="range"] {
        -webkit-appearance: none; appearance: none; flex: 1; height: 6px;
        background: var(--lu-border-strong, #e0e0e0); border-radius: 3px; outline: none;
        cursor: pointer;
      }
      .slider-wrap input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
        background: var(--lu-primary-500, #613E9C); border: 2px solid var(--lu-bg-card, white);
        box-shadow: 0 1px 4px rgb(0 0 0 / 0.25); cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .slider-wrap input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.15); box-shadow: 0 2px 6px rgb(0 0 0 / 0.3);
      }
      .slider-wrap input[type="range"]::-moz-range-thumb {
        width: 18px; height: 18px; border-radius: 50%;
        background: var(--lu-primary-500, #613E9C); border: 2px solid var(--lu-bg-card, white);
        box-shadow: 0 1px 4px rgb(0 0 0 / 0.25); cursor: pointer;
      }
      .slider-wrap input[type="range"]::-moz-range-track {
        height: 6px; background: var(--lu-border-strong, #e0e0e0); border-radius: 3px; border: none;
      }
      .level-badge {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 1.75rem; height: 1.75rem; border-radius: 0.375rem;
        background: var(--lu-bg-secondary, #fafafa); color: var(--lu-text-primary, #212121);
        font-size: 0.8rem; font-weight: 700;
        border: 1px solid var(--lu-border, #eeeeee);
      }

      /* Password input with eye toggle */
      .password-wrap {
        display: flex; align-items: center; flex: 1; position: relative;
      }
      .password-wrap input {
        font-size: 0.85rem; padding: 0.375rem 2rem 0.375rem 0.5rem;
        border: 1px solid var(--lu-border, #e5e7eb); border-radius: 0.375rem;
        background: var(--lu-bg-card, white); color: var(--lu-text-primary, #111827);
        width: 100%; color-scheme: light dark;
      }
      .password-wrap input:focus { border-color: var(--lu-primary-400, #9a7bc0); outline: none; box-shadow: 0 0 0 2px rgba(97, 62, 156, 0.15); }
      .eye-toggle {
        position: absolute; right: 0.375rem; top: 50%; transform: translateY(-50%);
        background: none; border: none; cursor: pointer; padding: 0.125rem;
        color: var(--lu-text-muted, #9ca3af); display: flex; align-items: center;
        transition: color 0.15s;
      }
      .eye-toggle:hover { color: var(--lu-primary-500, #613E9C); }

      .encrypted-notice { background: var(--lu-warning-light, #fffbeb); border: 1px solid var(--lu-warning, #f59e0b); border-radius: 0.5rem; padding: 0.75rem 1rem; font-size: 0.85rem; color: var(--lu-warning-dark, #92400e); margin-top: 0.75rem; }
    </style>

    <header class="header">
      <h1 class="title">${ICONS.archive} Archive Manager</h1>
      <p class="subtitle">Create and extract ZIP, TAR, GZ, BZ2, XZ, 7Z, and RAR archives in your browser</p>
      <div style="font-size: 0.8rem; color: var(--lu-text-muted); margin-top: 0.5rem;">
        Powered by <a href="https://github.com/101arrowz/fflate" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">fflate</a>, <a href="https://gildas-lormeau.github.io/zip.js/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">zip.js</a>, <a href="https://github.com/nicka-begiashvili/libarchivejs" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">libarchive.js</a> &amp; <a href="https://github.com/nicka-begiashvili/7z-wasm" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">7z-wasm</a>.
        <br>
        100% Local Execution.
      </div>
    </header>

    <div class="card">
      <div class="drop-zone" id="archive-drop-zone">
        <div style="margin-bottom: 0.5rem; color: var(--lu-text-muted, #9ca3af);">${ICONS.upload}</div>
        <div id="archive-file-label">Drop files here or click to browse</div>
        <div style="font-size: 0.8rem; color: var(--lu-text-muted, #9ca3af); margin-top: 0.5rem;">Drop an archive to extract, or regular files to create an archive</div>
        <input type="file" id="archive-file-input" multiple hidden>
      </div>

      <div class="progress-bar" id="archive-progress">
        <div class="progress-fill" id="archive-progress-fill"></div>
      </div>

      <div id="archive-status" class="status-msg" style="display:none;"></div>

      <!-- Compress Mode -->
      <div id="compress-mode" style="display:none;">
        <div class="result-header">
          <div>
            <h3>Files to Archive</h3>
            <div class="result-summary" id="compress-summary"></div>
          </div>
        </div>
        <div class="entry-list" id="compress-file-list"></div>

        <div class="compress-controls">
          <div class="control-row" style="flex-wrap: wrap;">
            <label for="archive-format">Format</label>
            <select id="archive-format">
              <option value="zip">ZIP</option>
              <option value="tar">TAR</option>
              <option value="tar.gz">TAR.GZ</option>
              <option value="tar.bz2">TAR.BZ2</option>
              <option value="tar.xz">TAR.XZ</option>
              <option value="7z">7Z</option>
              <option value="rar" disabled>RAR (read-only)</option>
            </select>
            <div class="format-hint" id="format-hint">RAR is a proprietary format — creation requires a commercial license. Extraction is supported.</div>
          </div>

          <div class="control-row" id="compression-options">
            <label for="compression-level">Level</label>
            <div class="slider-wrap">
              <input type="range" id="compression-level" min="0" max="9" value="6">
              <span class="level-badge" id="level-value">6</span>
            </div>
          </div>

          <div class="control-row" id="password-row">
            <label for="archive-password">Password</label>
            <div class="password-wrap">
              <input type="password" id="archive-password" placeholder="Optional — encrypt archive (AES-256)" autocomplete="off">
              <button type="button" class="eye-toggle" id="password-eye" title="Show password">${ICONS.eyeClosed}</button>
            </div>
          </div>
          <div class="format-hint" id="password-hint" style="display:none;"></div>

          <button class="btn btn-full" id="create-btn">${ICONS.archive} Create Archive</button>
        </div>
      </div>

      <!-- Decompress Mode -->
      <div id="decompress-mode" style="display:none;">
        <div id="encrypted-notice" class="encrypted-notice" style="display:none;">
          This archive is password-protected. Enter the password to extract files.
          <div class="control-row" style="margin-top: 0.5rem;">
            <div class="password-wrap">
              <input type="password" id="decrypt-password" placeholder="Enter password" autocomplete="off">
              <button type="button" class="eye-toggle" id="decrypt-password-eye" title="Show password">${ICONS.eyeClosed}</button>
            </div>
            <button class="btn btn-sm" id="btn-unlock" style="display:none;">Unlock</button>
          </div>
        </div>
        <div class="result-area visible" id="archive-results">
          <div class="result-header">
            <div>
              <h3 id="archive-result-title">Archive Contents</h3>
              <div class="result-summary" id="archive-result-summary"></div>
            </div>
            <button class="btn btn-sm" id="btn-extract-all">${ICONS.download} Extract All</button>
          </div>
          <div class="entry-list" id="archive-entry-list"></div>
        </div>
      </div>
    </div>
    `;

    setupEventListeners(container);
    return container;
}

function setupEventListeners(container: HTMLElement) {
    const dropZone = container.querySelector('#archive-drop-zone') as HTMLElement;
    const fileInput = container.querySelector('#archive-file-input') as HTMLInputElement;
    const fileLabel = container.querySelector('#archive-file-label') as HTMLElement;
    const progressBar = container.querySelector('#archive-progress') as HTMLElement;
    const progressFill = container.querySelector('#archive-progress-fill') as HTMLElement;
    const statusMsg = container.querySelector('#archive-status') as HTMLElement;

    // Compress mode elements
    const compressMode = container.querySelector('#compress-mode') as HTMLElement;
    const compressFileList = container.querySelector('#compress-file-list') as HTMLElement;
    const compressSummary = container.querySelector('#compress-summary') as HTMLElement;
    const formatSelect = container.querySelector('#archive-format') as HTMLSelectElement;
    const compressionOptions = container.querySelector('#compression-options') as HTMLElement;
    const compressionLevel = container.querySelector('#compression-level') as HTMLInputElement;
    const levelValue = container.querySelector('#level-value') as HTMLElement;
    const createBtn = container.querySelector('#create-btn') as HTMLButtonElement;
    const passwordInput = container.querySelector('#archive-password') as HTMLInputElement;
    const passwordEye = container.querySelector('#password-eye') as HTMLButtonElement;
    const passwordHint = container.querySelector('#password-hint') as HTMLElement;
    const formatHint = container.querySelector('#format-hint') as HTMLElement;

    // Decompress mode elements
    const decompressMode = container.querySelector('#decompress-mode') as HTMLElement;
    const entryList = container.querySelector('#archive-entry-list') as HTMLElement;
    const resultTitle = container.querySelector('#archive-result-title') as HTMLElement;
    const resultSummary = container.querySelector('#archive-result-summary') as HTMLElement;
    const extractAllBtn = container.querySelector('#btn-extract-all') as HTMLButtonElement;
    const encryptedNotice = container.querySelector('#encrypted-notice') as HTMLElement;
    const decryptPasswordInput = container.querySelector('#decrypt-password') as HTMLInputElement;
    const decryptPasswordEye = container.querySelector('#decrypt-password-eye') as HTMLButtonElement;
    const unlockBtn = container.querySelector('#btn-unlock') as HTMLButtonElement;
    const passwordRow = container.querySelector('#password-row') as HTMLElement;

    let currentArchiveFile: File | null = null;
    let currentEntries: ArchiveEntry[] = [];
    let compressFiles: InputFile[] = [];
    let currentMode: 'none' | 'compress' | 'decompress' = 'none';

    // Cleanup hook to free references
    cleanupHook = () => {
        currentArchiveFile = null;
        currentEntries = [];
        compressFiles = [];
    };

    // Format selector updates
    formatSelect.addEventListener('change', () => {
        const fmt = formatSelect.value;
        const hasCompression = fmt !== 'tar';
        compressionOptions.style.display = hasCompression ? 'flex' : 'none';
        formatHint.style.display = 'none';

        // Show/hide password row based on format encryption support
        const supportsEncryption = fmt === 'zip' || fmt === '7z';
        passwordRow.style.display = supportsEncryption ? 'flex' : 'none';

        if (!supportsEncryption) {
            passwordInput.value = '';
            passwordHint.textContent = 'TAR formats don\'t support encryption. Use ZIP or 7z for password protection.';
            passwordHint.style.display = 'block';
        } else if (fmt === 'zip') {
            passwordHint.textContent = 'AES-256 encryption — compatible with all tools.';
            passwordHint.style.display = passwordInput.value.trim() ? 'block' : 'none';
        } else if (fmt === '7z') {
            passwordHint.textContent = 'AES-256 encryption with encrypted headers.';
            passwordHint.style.display = passwordInput.value.trim() ? 'block' : 'none';
        }
    });

    // Show RAR hint when dropdown is opened (user will see the disabled option)
    formatSelect.addEventListener('mousedown', () => {
        formatHint.style.display = 'block';
    });
    formatSelect.addEventListener('blur', () => {
        formatHint.style.display = 'none';
    });

    compressionLevel.addEventListener('input', () => {
        levelValue.textContent = compressionLevel.value;
    });

    // Show encryption method hint when password is entered
    passwordInput.addEventListener('input', () => {
        const fmt = formatSelect.value;
        if (passwordInput.value.trim()) {
            passwordHint.textContent = fmt === '7z'
                ? 'AES-256 encryption with encrypted headers.'
                : 'AES-256 encryption — compatible with all tools.';
            passwordHint.style.display = 'block';
        } else {
            passwordHint.style.display = 'none';
        }
    });

    // Password eye toggles
    passwordEye.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        passwordEye.innerHTML = isHidden ? ICONS.eyeOpen : ICONS.eyeClosed;
        passwordEye.title = isHidden ? 'Hide password' : 'Show password';
    });
    decryptPasswordEye.addEventListener('click', () => {
        const isHidden = decryptPasswordInput.type === 'password';
        decryptPasswordInput.type = isHidden ? 'text' : 'password';
        decryptPasswordEye.innerHTML = isHidden ? ICONS.eyeOpen : ICONS.eyeClosed;
        decryptPasswordEye.title = isHidden ? 'Hide password' : 'Show password';
    });

    // Unlock button — re-lists 7z entries with the provided password
    unlockBtn.addEventListener('click', async () => {
        if (!currentArchiveFile) return;
        const password = decryptPasswordInput.value.trim();
        if (!password) {
            showStatus('Please enter the password.', true);
            return;
        }
        unlockBtn.disabled = true;
        unlockBtn.textContent = 'Unlocking...';
        try {
            progressBar.style.display = 'block';
            progressFill.style.width = '50%';
            currentEntries = await ArchiveManager.listEntriesVia7zWasm(currentArchiveFile, password);
            progressFill.style.width = '100%';
            renderDecompressEntries();
            hideStatus();
            setTimeout(() => { progressBar.style.display = 'none'; }, 300);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            showStatus(`Failed to unlock: ${message}`, true);
            progressBar.style.display = 'none';
        } finally {
            unlockBtn.disabled = false;
            unlockBtn.textContent = 'Unlock';
        }
    });

    // Drop zone events
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer?.files.length) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files?.length) {
            handleFiles(Array.from(fileInput.files));
        }
    });

    function showStatus(msg: string, isError = false) {
        statusMsg.textContent = msg;
        statusMsg.className = isError ? 'status-msg error' : 'status-msg';
        statusMsg.style.display = 'block';
    }

    function hideStatus() {
        statusMsg.style.display = 'none';
    }

    function resetToInitial() {
        currentArchiveFile = null;
        currentEntries = [];
        compressFiles = [];
        currentMode = 'none';
        fileLabel.textContent = 'Drop files here or click to browse';
        dropZone.classList.remove('has-file');
        compressMode.style.display = 'none';
        decompressMode.style.display = 'none';
        encryptedNotice.style.display = 'none';
        progressBar.style.display = 'none';
        hideStatus();
        fileInput.value = '';
    }

    async function handleFiles(files: File[]) {
        hideStatus();

        if (files.length === 0) return;

        // Check if the first file looks like an archive
        const firstFile = files[0];
        const format = ArchiveManager.detectFormat(firstFile);

        // Also try magic bytes if extension-based detection fails
        let isArchive = format !== 'unknown';
        if (!isArchive && files.length === 1) {
            // Try reading first few bytes
            try {
                const headerSlice = await firstFile.slice(0, 512).arrayBuffer();
                const headerBytes = new Uint8Array(headerSlice);
                const byteFormat = ArchiveManager.detectFormatFromBytes(headerBytes);
                isArchive = byteFormat !== 'unknown';
            } catch {
                // Ignore errors in byte detection
            }
        }

        if (isArchive && files.length === 1) {
            // Decompress mode
            enterDecompressMode(firstFile);
        } else if (currentMode === 'compress') {
            // Already in compress mode — add files
            addFilesToCompress(files);
        } else {
            // Compress mode
            enterCompressMode(files);
        }
    }

    async function enterDecompressMode(file: File) {
        currentMode = 'decompress';
        currentArchiveFile = file;
        compressFiles = [];

        fileLabel.textContent = `${file.name} (${formatSize(file.size)})`;
        dropZone.classList.add('has-file');
        compressMode.style.display = 'none';
        decompressMode.style.display = 'block';
        encryptedNotice.style.display = 'none';
        unlockBtn.style.display = 'none';
        decryptPasswordInput.value = '';

        // Show progress
        progressBar.style.display = 'block';
        progressFill.style.width = '30%';

        try {
            const data = new Uint8Array(await file.arrayBuffer());
            const byteFormat = ArchiveManager.detectFormatFromBytes(data);

            // Show password input for encrypted ZIPs
            if (byteFormat === 'zip' && ArchiveManager.isZipEncrypted(data)) {
                encryptedNotice.style.display = 'block';
            }

            progressFill.style.width = '60%';
            currentEntries = await ArchiveManager.listEntries(file);
            progressFill.style.width = '100%';

            // Show password input for 7z when listing returns empty or all-zero sizes
            // (indicates encrypted headers — 7z-wasm couldn't list without password)
            if (byteFormat === '7z') {
                const hasContent = currentEntries.length > 0 && currentEntries.some(e => e.size > 0 || e.isDirectory);
                if (!hasContent) {
                    encryptedNotice.style.display = 'block';
                    unlockBtn.style.display = '';
                }
            }

            renderDecompressEntries();

            setTimeout(() => {
                progressBar.style.display = 'none';
            }, 300);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            showStatus(`Error reading archive: ${message}`, true);
            progressBar.style.display = 'none';
        }
    }

    async function enterCompressMode(files: File[]) {
        currentMode = 'compress';
        currentArchiveFile = null;
        currentEntries = [];
        compressFiles = [];

        dropZone.classList.add('has-file');
        compressMode.style.display = 'block';
        decompressMode.style.display = 'none';
        encryptedNotice.style.display = 'none';

        await addFilesToCompress(files);
    }

    async function addFilesToCompress(files: File[]) {
        for (const file of files) {
            const data = new Uint8Array(await file.arrayBuffer());
            // Use webkitRelativePath if available (folder upload), otherwise just file name
            const name = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
            compressFiles.push({ name, data });
        }

        renderCompressFileList();
    }

    function renderCompressFileList() {
        const totalSize = compressFiles.reduce((sum, f) => sum + f.data.length, 0);
        const count = compressFiles.length;
        fileLabel.textContent = `${count} file${count !== 1 ? 's' : ''} selected (${formatSize(totalSize)})`;
        compressSummary.textContent = `${count} file${count !== 1 ? 's' : ''} | Total: ${formatSize(totalSize)}`;

        compressFileList.innerHTML = '';
        compressFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'entry-item';
            item.innerHTML = `
                <div class="entry-info">
                    <span class="entry-icon">${ICONS.file}</span>
                    <span class="entry-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                </div>
                <span class="entry-size">${formatSize(file.data.length)}</span>
                <div class="entry-actions">
                    <button class="btn-danger btn-remove-file" data-index="${index}" title="Remove">${ICONS.remove}</button>
                </div>
            `;
            compressFileList.appendChild(item);
        });

        // Attach remove handlers
        compressFileList.querySelectorAll('.btn-remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLButtonElement;
                const idx = parseInt(target.getAttribute('data-index') || '0', 10);
                compressFiles.splice(idx, 1);
                if (compressFiles.length === 0) {
                    resetToInitial();
                } else {
                    renderCompressFileList();
                }
            });
        });
    }

    // Create archive button
    createBtn.addEventListener('click', async () => {
        if (compressFiles.length === 0) {
            showStatus('Please add files to create an archive.', true);
            return;
        }

        createBtn.disabled = true;
        createBtn.textContent = 'Creating...';
        progressBar.style.display = 'block';
        progressFill.style.width = '30%';
        hideStatus();

        try {
            const format = formatSelect.value as CreateArchiveFormat;
            const level = parseInt(compressionLevel.value, 10);

            progressFill.style.width = '60%';

            const password = passwordInput.value.trim() || undefined;
            // Clone file data so the original Uint8Arrays remain valid for subsequent creations
            const fileCopies = compressFiles.map(f => ({ name: f.name, data: new Uint8Array(f.data) }));
            const blob = await ArchiveManager.createArchive(fileCopies, {
                format,
                compressionLevel: level,
                password,
            });

            progressFill.style.width = '100%';

            // Generate filename
            const extMap: Record<string, string> = {
                'zip': '.zip', 'tar': '.tar', 'tar.gz': '.tar.gz',
                'tar.bz2': '.tar.bz2', 'tar.xz': '.tar.xz', '7z': '.7z',
            };
            const ext = extMap[format] || `.${format}`;
            const archiveName = `archive${ext}`;

            // Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = archiveName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showStatus(`Archive created successfully (${formatSize(blob.size)})`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            showStatus(`Error creating archive: ${message}`, true);
        } finally {
            createBtn.disabled = false;
            createBtn.innerHTML = `${ICONS.archive} Create Archive`;
            setTimeout(() => {
                progressBar.style.display = 'none';
            }, 300);
        }
    });

    function renderDecompressEntries() {
        const fileCount = currentEntries.filter(e => !e.isDirectory).length;
        const dirCount = currentEntries.filter(e => e.isDirectory).length;
        const totalSize = currentEntries.reduce((sum, e) => sum + e.size, 0);

        resultTitle.textContent = `Archive Contents`;
        const parts: string[] = [];
        if (fileCount > 0) parts.push(`${fileCount} file${fileCount !== 1 ? 's' : ''}`);
        if (dirCount > 0) parts.push(`${dirCount} folder${dirCount !== 1 ? 's' : ''}`);
        parts.push(`Total: ${formatSize(totalSize)}`);
        resultSummary.textContent = parts.join(' | ');

        entryList.innerHTML = '';

        for (const entry of currentEntries) {
            const item = document.createElement('div');
            item.className = 'entry-item';

            const icon = entry.isDirectory ? ICONS.folder : ICONS.file;

            item.innerHTML = `
                <div class="entry-info">
                    <span class="entry-icon">${icon}</span>
                    <span class="entry-name" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</span>
                </div>
                <span class="entry-size">${formatSize(entry.size)}</span>
                ${!entry.isDirectory ? `<div class="entry-actions"><button class="btn btn-sm btn-secondary btn-extract" data-name="${escapeAttr(entry.name)}">${ICONS.download} Extract</button></div>` : ''}
            `;

            entryList.appendChild(item);
        }

        // Attach individual extract handlers
        entryList.querySelectorAll('.btn-extract').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const target = e.currentTarget as HTMLButtonElement;
                const entryName = target.getAttribute('data-name');
                if (!entryName || !currentArchiveFile) return;
                target.disabled = true;
                target.textContent = 'Extracting...';
                try {
                    const decryptPw = decryptPasswordInput.value.trim() || undefined;
                    const extracted = await ArchiveManager.extractFile(currentArchiveFile, entryName, decryptPw);
                    downloadFile(extracted);
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    showStatus(`Error extracting: ${message}`, true);
                } finally {
                    target.disabled = false;
                    target.innerHTML = `${ICONS.download} Extract`;
                }
            });
        });
    }

    // Extract All
    extractAllBtn.addEventListener('click', async () => {
        if (!currentArchiveFile) return;
        extractAllBtn.disabled = true;
        extractAllBtn.textContent = 'Extracting...';
        progressBar.style.display = 'block';
        progressFill.style.width = '0%';

        try {
            const decryptPw = decryptPasswordInput.value.trim() || undefined;
            const files = await ArchiveManager.extractAll(currentArchiveFile, decryptPw);
            progressFill.style.width = '80%';

            if (files.length === 1) {
                downloadFile(files[0]);
            } else if (files.length > 1) {
                for (const file of files) {
                    downloadFile(file);
                    await new Promise(r => setTimeout(r, 100));
                }
            }

            progressFill.style.width = '100%';
            showStatus(`Successfully extracted ${files.length} file${files.length !== 1 ? 's' : ''}.`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            showStatus(`Error extracting files: ${message}`, true);
        } finally {
            extractAllBtn.disabled = false;
            extractAllBtn.innerHTML = `${ICONS.download} Extract All`;
            setTimeout(() => {
                progressBar.style.display = 'none';
            }, 300);
        }
    });
}

function downloadFile(file: ExtractedFile) {
    const blob = new Blob([file.data as BlobPart]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.split('/').pop() || file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
