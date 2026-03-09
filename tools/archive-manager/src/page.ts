import { ArchiveManager } from './tool';
import type { ArchiveEntry, ExtractedFile } from './tool';

// Icons
const ICONS = {
    archive: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><rect x="10" y="5" width="4" height="2"/><rect x="10" y="9" width="4" height="2"/><rect x="10" y="13" width="4" height="2"/></svg>`,
    upload: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    file: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
    folder: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`,
    download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
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
      .entry-actions { flex-shrink: 0; }

      .status-msg { text-align: center; padding: 1rem; color: var(--lu-text-secondary, #6b7280); font-size: 0.9rem; }
      .status-msg.error { color: var(--lu-error, #ef4444); }
    </style>

    <header class="header">
      <h1 class="title">${ICONS.archive} Archive Manager</h1>
      <p class="subtitle">View and extract ZIP, TAR, and GZ archives in your browser</p>
      <div style="font-size: 0.8rem; color: var(--lu-text-muted, #9ca3af); margin-top: 0.5rem;">
        100% Local Execution (Zero External Dependencies).
      </div>
    </header>

    <div class="card">
      <div class="drop-zone" id="archive-drop-zone">
        <div style="margin-bottom: 0.5rem; color: var(--lu-text-muted, #9ca3af);">${ICONS.upload}</div>
        <div id="archive-file-label">Drop an archive file here or click to browse</div>
        <div style="font-size: 0.8rem; color: var(--lu-text-muted, #9ca3af); margin-top: 0.5rem;">Supports ZIP, TAR, GZ, TAR.GZ, TGZ</div>
        <input type="file" id="archive-file-input" accept=".zip,.tar,.gz,.tar.gz,.tgz" hidden>
      </div>

      <div class="progress-bar" id="archive-progress">
        <div class="progress-fill" id="archive-progress-fill"></div>
      </div>

      <div id="archive-status" class="status-msg" style="display:none;"></div>

      <div class="result-area" id="archive-results">
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
    const resultsArea = container.querySelector('#archive-results') as HTMLElement;
    const entryList = container.querySelector('#archive-entry-list') as HTMLElement;
    const resultTitle = container.querySelector('#archive-result-title') as HTMLElement;
    const resultSummary = container.querySelector('#archive-result-summary') as HTMLElement;
    const extractAllBtn = container.querySelector('#btn-extract-all') as HTMLButtonElement;

    let currentFile: File | null = null;
    let currentEntries: ArchiveEntry[] = [];

    // Cleanup hook to free references
    cleanupHook = () => {
        currentFile = null;
        currentEntries = [];
    };

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
            fileInput.files = e.dataTransfer.files;
            handleFile(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files?.length) {
            handleFile(fileInput.files[0]);
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

    async function handleFile(file: File) {
        currentFile = file;
        fileLabel.textContent = `${file.name} (${formatSize(file.size)})`;
        dropZone.classList.add('has-file');
        resultsArea.classList.remove('visible');
        hideStatus();

        // Show progress
        progressBar.style.display = 'block';
        progressFill.style.width = '30%';

        try {
            const format = ArchiveManager.detectFormat(file);
            if (format === 'unknown') {
                // Also try byte detection
                showStatus('Unsupported archive format. Please use ZIP, TAR, GZ, or TAR.GZ files.', true);
                progressBar.style.display = 'none';
                return;
            }

            progressFill.style.width = '60%';
            currentEntries = await ArchiveManager.listEntries(file);
            progressFill.style.width = '100%';

            // Render entries
            renderEntries();

            setTimeout(() => {
                progressBar.style.display = 'none';
            }, 300);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            showStatus(`Error reading archive: ${message}`, true);
            progressBar.style.display = 'none';
        }
    }

    function renderEntries() {
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
                if (!entryName || !currentFile) return;
                target.disabled = true;
                target.textContent = 'Extracting...';
                try {
                    const extracted = await ArchiveManager.extractFile(currentFile, entryName);
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

        resultsArea.classList.add('visible');
    }

    // Extract All
    extractAllBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        extractAllBtn.disabled = true;
        extractAllBtn.textContent = 'Extracting...';
        progressBar.style.display = 'block';
        progressFill.style.width = '0%';

        try {
            const files = await ArchiveManager.extractAll(currentFile);
            progressFill.style.width = '80%';

            if (files.length === 1) {
                // Single file — download directly
                downloadFile(files[0]);
            } else if (files.length > 1) {
                // Multiple files — download each individually
                for (const file of files) {
                    downloadFile(file);
                    // Small delay so the browser doesn't block multiple downloads
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
    // Use just the filename part (strip directory paths)
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
