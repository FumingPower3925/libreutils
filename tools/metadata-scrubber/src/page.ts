import { MetadataScrubber } from './tool';
import type { ScrubOptions } from './tool';

// Icons
const ICONS = {
    shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    upload: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
    check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
};

export function renderMetadataScrubberPage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tool-page';

    container.innerHTML = `
    <style>
      .tool-page { max-width: 800px; margin: 0 auto; padding: 1.5rem; }
      .header { text-align: center; margin-bottom: 2rem; }
      .title { font-size: 1.875rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
      .subtitle { color: var(--lu-text-secondary, #6b7280); }

      .card { background: var(--lu-bg-card, white); border: 1px solid var(--lu-border, #e5e7eb); border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; }

      .drop-zone { border: 2px dashed var(--lu-border, #e5e7eb); border-radius: 0.5rem; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.2s; }
      .drop-zone:hover, .drop-zone.dragover { border-color: var(--lu-primary-500); background: var(--lu-bg-secondary); }
      .drop-zone.has-file { border-color: var(--lu-success, #10b981); background: var(--lu-success-light, #ecfdf5); }

      .options-group { margin: 1.5rem 0; }
      .options-group label { display: block; font-weight: 500; margin-bottom: 0.75rem; color: var(--lu-text-primary); }
      .option-item { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
      .option-item input[type="checkbox"] { accent-color: var(--lu-primary-500); }

      .btn { padding: 0.75rem 1.5rem; background: var(--lu-primary-500); color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; }
      .btn:hover { background: var(--lu-primary-600); }
      .btn:disabled { background: var(--lu-text-muted); cursor: not-allowed; }
      .btn-full { width: 100%; }
      .btn-secondary { background: var(--lu-bg-secondary); color: var(--lu-text-primary); border: 1px solid var(--lu-border); }
      .btn-secondary:hover { background: var(--lu-border); }
      .btn-danger { background: var(--lu-error, #ef4444); }
      .btn-danger:hover { background: #dc2626; }

      .btn-group { display: flex; gap: 0.75rem; margin-top: 1rem; }

      .metadata-display { margin-top: 1.5rem; display: none; }
      .metadata-display.visible { display: block; }
      .metadata-table { width: 100%; border-collapse: collapse; }
      .metadata-table td { padding: 0.5rem; border-bottom: 1px solid var(--lu-border, #e5e7eb); }
      .metadata-table td:first-child { font-weight: 500; width: 40%; color: var(--lu-text-secondary); }
      .metadata-table td:last-child { word-break: break-all; }

      .status-message { margin-top: 1rem; padding: 0.75rem; border-radius: 0.5rem; display: none; }
      .status-message.visible { display: block; }
      .status-message.success { background: var(--lu-success-light, #ecfdf5); color: var(--lu-success, #10b981); border: 1px solid var(--lu-success, #10b981); }
      .status-message.error { background: #fef2f2; color: var(--lu-error, #ef4444); border: 1px solid var(--lu-error, #ef4444); }

      .processing-overlay { display: none; text-align: center; padding: 1rem; }
      .processing-overlay.visible { display: block; }
    </style>

    <header class="header">
      <h1 class="title">${ICONS.shield} Metadata Scrubber</h1>
      <p class="subtitle">Remove hidden metadata from files to protect your privacy</p>
      <div style="font-size: 0.8rem; color: var(--lu-text-muted); margin-top: 0.5rem;">
        Powered by <a href="https://github.com/Hopding/pdf-lib" target="_blank" style="color:inherit; text-decoration:underline;">pdf-lib</a>.
        <br>
        100% Local Execution. Your files never leave your browser.
      </div>
    </header>

    <div class="card">
      <div class="drop-zone" id="scrub-drop-zone">
        <div style="margin-bottom:0.5rem; color: var(--lu-text-muted);">${ICONS.upload}</div>
        <div id="scrub-file-label">Drop a file here or click to browse</div>
        <div style="font-size: 0.8rem; color: var(--lu-text-muted); margin-top: 0.5rem;">Supports: JPEG, PNG, PDF</div>
        <input type="file" id="scrub-file-input" hidden accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf">
      </div>

      <div class="options-group" id="options-group" style="display:none;">
        <label>Scrubbing Options</label>
        <div class="option-item">
          <input type="checkbox" id="opt-all" checked>
          <span>Remove all metadata</span>
        </div>
        <div class="option-item">
          <input type="checkbox" id="opt-exif" checked disabled>
          <span>Remove EXIF data (camera info, settings)</span>
        </div>
        <div class="option-item">
          <input type="checkbox" id="opt-gps" checked disabled>
          <span>Remove GPS location data</span>
        </div>
        <div class="option-item">
          <input type="checkbox" id="opt-xmp" checked disabled>
          <span>Remove XMP data (editing software info)</span>
        </div>
        <div class="option-item">
          <input type="checkbox" id="opt-iptc" checked disabled>
          <span>Remove IPTC data (copyright, captions)</span>
        </div>
      </div>

      <div class="metadata-display" id="metadata-display">
        <h3 style="margin-bottom: 0.75rem;">Detected Metadata</h3>
        <table class="metadata-table" id="metadata-table"></table>
      </div>

      <div class="processing-overlay" id="processing-overlay">
        <div>Processing file...</div>
      </div>

      <div class="status-message" id="status-message"></div>

      <div class="btn-group" id="action-buttons" style="display:none;">
        <button class="btn btn-full" id="scrub-btn">${ICONS.check} Scrub Metadata</button>
      </div>

      <div class="btn-group" id="result-buttons" style="display:none;">
        <button class="btn" id="download-btn">${ICONS.download} Download Clean File</button>
        <button class="btn btn-secondary" id="clear-btn">${ICONS.trash} Clear</button>
      </div>
    </div>
    `;

    setupEventListeners(container);
    return container;
}

function setupEventListeners(container: HTMLElement) {
    const dropZone = container.querySelector('#scrub-drop-zone') as HTMLElement;
    const fileInput = container.querySelector('#scrub-file-input') as HTMLInputElement;
    const fileLabel = container.querySelector('#scrub-file-label') as HTMLElement;
    const optionsGroup = container.querySelector('#options-group') as HTMLElement;
    const metadataDisplay = container.querySelector('#metadata-display') as HTMLElement;
    const metadataTable = container.querySelector('#metadata-table') as HTMLElement;
    const processingOverlay = container.querySelector('#processing-overlay') as HTMLElement;
    const statusMessage = container.querySelector('#status-message') as HTMLElement;
    const actionButtons = container.querySelector('#action-buttons') as HTMLElement;
    const resultButtons = container.querySelector('#result-buttons') as HTMLElement;
    const scrubBtn = container.querySelector('#scrub-btn') as HTMLButtonElement;
    const downloadBtn = container.querySelector('#download-btn') as HTMLButtonElement;
    const clearBtn = container.querySelector('#clear-btn') as HTMLButtonElement;

    const optAll = container.querySelector('#opt-all') as HTMLInputElement;
    const optExif = container.querySelector('#opt-exif') as HTMLInputElement;
    const optGps = container.querySelector('#opt-gps') as HTMLInputElement;
    const optXmp = container.querySelector('#opt-xmp') as HTMLInputElement;
    const optIptc = container.querySelector('#opt-iptc') as HTMLInputElement;

    let selectedFile: File | null = null;
    let scrubbedFile: File | null = null;

    // "Remove all" toggle controls individual options
    optAll.addEventListener('change', () => {
        const checked = optAll.checked;
        [optExif, optGps, optXmp, optIptc].forEach((opt) => {
            opt.checked = checked;
            opt.disabled = checked;
        });
    });

    // File selection
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
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files?.length) handleFileSelect(fileInput.files[0]);
    });

    async function handleFileSelect(file: File) {
        selectedFile = file;
        scrubbedFile = null;
        resultButtons.style.display = 'none';
        statusMessage.classList.remove('visible');

        fileLabel.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        dropZone.classList.add('has-file');

        const fileType = MetadataScrubber.getFileType(file);

        if (fileType === 'audio' || fileType === 'video') {
            showStatus('Audio and video metadata scrubbing is coming in a future update. Currently supported: JPEG, PNG, and PDF files.', 'error');
            actionButtons.style.display = 'none';
            optionsGroup.style.display = 'none';
            return;
        }

        // Show options for images
        if (fileType === 'image') {
            optionsGroup.style.display = 'block';
        } else {
            optionsGroup.style.display = 'none';
        }

        // Try to extract and show metadata
        try {
            const metadata = await MetadataScrubber.getFileMetadata(file);
            showMetadata(metadata.extractedMetadata, metadata);
        } catch {
            // Metadata extraction failed, still allow scrubbing
        }

        actionButtons.style.display = 'flex';
    }

    function showMetadata(extracted: Record<string, unknown>, fileInfo: { fileName: string; fileSize: number; fileType: string; detectedType: string }) {
        let rows = `
            <tr><td>File Name</td><td>${fileInfo.fileName}</td></tr>
            <tr><td>File Size</td><td>${(fileInfo.fileSize / 1024).toFixed(1)} KB</td></tr>
            <tr><td>File Type</td><td>${fileInfo.fileType || 'Unknown'}</td></tr>
            <tr><td>Detected As</td><td>${fileInfo.detectedType}</td></tr>
        `;

        for (const [key, value] of Object.entries(extracted)) {
            if (value !== '' && value !== undefined && value !== null) {
                rows += `<tr><td>${key}</td><td>${String(value)}</td></tr>`;
            }
        }

        metadataTable.innerHTML = rows;
        metadataDisplay.classList.add('visible');
    }

    function showStatus(message: string, type: 'success' | 'error') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message visible ${type}`;
    }

    // Scrub action
    scrubBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        const options: ScrubOptions = {
            removeAll: optAll.checked,
            removeExif: optExif.checked,
            removeGps: optGps.checked,
            removeXmp: optXmp.checked,
            removeIptc: optIptc.checked,
        };

        scrubBtn.disabled = true;
        processingOverlay.classList.add('visible');
        statusMessage.classList.remove('visible');

        try {
            const result = await MetadataScrubber.scrubFile(selectedFile, options);
            scrubbedFile = result.scrubbedFile;

            const savedBytes = selectedFile.size - scrubbedFile.size;
            const savedPercent = ((savedBytes / selectedFile.size) * 100).toFixed(1);

            showStatus(
                `Metadata removed successfully! File size reduced by ${(savedBytes / 1024).toFixed(1)} KB (${savedPercent}%).`,
                'success',
            );

            actionButtons.style.display = 'none';
            resultButtons.style.display = 'flex';
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            showStatus(message, 'error');
        } finally {
            scrubBtn.disabled = false;
            processingOverlay.classList.remove('visible');
        }
    });

    // Download action
    downloadBtn.addEventListener('click', () => {
        if (!scrubbedFile) return;

        const url = URL.createObjectURL(scrubbedFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = scrubbedFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Clear action
    clearBtn.addEventListener('click', () => {
        selectedFile = null;
        scrubbedFile = null;
        fileInput.value = '';
        fileLabel.textContent = 'Drop a file here or click to browse';
        dropZone.classList.remove('has-file');
        optionsGroup.style.display = 'none';
        metadataDisplay.classList.remove('visible');
        statusMessage.classList.remove('visible');
        actionButtons.style.display = 'none';
        resultButtons.style.display = 'none';
    });
}

export function secureCleanup(): void {
    // No sensitive data stored in-memory beyond file references
    // which are released on clear
}
