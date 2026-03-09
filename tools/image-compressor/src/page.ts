import { ImageCompressor, type CompressionOptions, type CompressionResult, type OutputFormat } from './tool';
import { CropTool } from './crop-ui';

const ICONS = {
    image: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>`,
    upload: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    compress: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
    crop: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v4h12v12h4"/><path d="M18 22v-4H6V6H2"/></svg>`,
};

let cleanupHook: (() => void) | null = null;

export function secureCleanup(): void {
    if (cleanupHook) {
        try { cleanupHook(); } finally { cleanupHook = null; }
    }
}

const FORMAT_LABELS: Record<string, string> = {
    'image/jpeg': 'JPEG / JPG',
    'image/webp': 'WebP',
    'image/png':  'PNG',
    'image/avif': 'AVIF',
    'image/gif':  'GIF',
    'image/bmp':  'BMP (uncompressed)',
    'image/tiff': 'TIFF (LZW compressed)',
};

export function renderImageCompressorPage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tool-page';

    // Build format options dynamically
    const formats = ImageCompressor.getSupportedFormats();
    const formatOptions = formats
        .map(f => {
            const supported = ImageCompressor.isFormatSupported(f);
            const label = supported ? (FORMAT_LABELS[f] || f) : `${FORMAT_LABELS[f] || f} (not supported)`;
            return `<option value="${f}"${supported ? '' : ' disabled'}>${label}</option>`;
        })
        .join('\n              ');

    container.innerHTML = `
    <style>
      .tool-page { max-width: 900px; margin: 0 auto; padding: 1.5rem; }
      .header { text-align: center; margin-bottom: 2rem; }
      .title { font-size: 1.875rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
      .subtitle { color: var(--lu-text-secondary, #6b7280); }

      .card { background: var(--lu-bg-card, white); border: 1px solid var(--lu-border, #e5e7eb); border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; }

      .drop-zone { border: 2px dashed var(--lu-border, #e5e7eb); border-radius: 0.5rem; padding: 2.5rem; text-align: center; cursor: pointer; transition: all 0.2s; }
      .drop-zone:hover, .drop-zone.dragover { border-color: var(--lu-primary-500, #613E9C); background: var(--lu-bg-secondary, #f9fafb); }
      .drop-zone.has-file { border-color: var(--lu-success, #10b981); background: var(--lu-success-light, #ecfdf5); }

      .controls-panel { display: none; }
      .controls-panel.visible { display: block; }

      .crop-toggle-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
      .crop-toggle {
        display: inline-flex; align-items: center; gap: 0.375rem;
        padding: 0.375rem 0.875rem; border-radius: 0.375rem; cursor: pointer;
        font-size: 0.8rem; font-weight: 500;
        border: 1px solid var(--lu-border, #e5e7eb);
        background: var(--lu-bg-card, white);
        color: var(--lu-text-secondary, #6b7280);
        transition: all 0.15s;
      }
      .crop-toggle:hover { border-color: var(--lu-primary-300, #c4b5fd); color: var(--lu-primary-600, #613E9C); }
      .crop-toggle.active {
        border-color: var(--lu-primary-500, #613E9C);
        background: var(--lu-primary-50, #f5f3ff);
        color: var(--lu-primary-600, #613E9C);
      }
      .crop-container { display: none; margin-bottom: 1rem; }
      .crop-container.visible { display: block; }

      .controls-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
      @media (max-width: 600px) { .controls-grid { grid-template-columns: 1fr; } }

      .input-group { margin-bottom: 1rem; }
      .label { display: block; font-weight: 500; margin-bottom: 0.5rem; color: var(--lu-text-primary, #111827); font-size: 0.875rem; }

      .text-input { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid var(--lu-border, #e5e7eb); border-radius: 0.5rem; background: var(--lu-bg-card, white); color: var(--lu-text-primary, #111827); font-size: 0.875rem; box-sizing: border-box; }

      .select-wrapper { position: relative; width: 100%; }
      .select { width: 100%; padding: 0.625rem 0.75rem; padding-right: 3rem; border: 1px solid var(--lu-border, #e5e7eb); border-radius: 0.5rem; background: var(--lu-bg-card, white); color: var(--lu-text-primary, #111827); cursor: pointer; appearance: none; -webkit-appearance: none; -moz-appearance: none; font-size: 0.875rem; box-sizing: border-box; color-scheme: light dark; }
      .select option { background: var(--lu-bg-card, white); color: var(--lu-text-primary, #111827); }
      .select-chevron { position: absolute; right: 1.25rem; top: 50%; transform: translateY(-50%); width: 1.25rem; height: 1.25rem; pointer-events: none; color: var(--lu-text-secondary, #6b7280); }

      .slider-group { display: flex; align-items: center; gap: 0.75rem; }
      .slider { flex: 1; accent-color: var(--lu-primary-500, #613E9C); }
      .slider:disabled { opacity: 0.4; }
      .slider-value { min-width: 3rem; text-align: right; font-weight: 600; font-size: 0.875rem; }
      .quality-note { font-size: 0.75rem; color: var(--lu-text-muted, #9ca3af); margin-top: 0.25rem; }

      .btn { width: 100%; padding: 0.75rem; background: var(--lu-primary-500, #613E9C); color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.95rem; }
      .btn:hover { background: var(--lu-primary-600, #4e3280); }
      .btn:disabled { background: var(--lu-text-muted, #9ca3af); cursor: not-allowed; }

      .btn-download { background: var(--lu-success, #10b981); margin-top: 1rem; }
      .btn-download:hover { background: #059669; }

      .preview-section { display: none; }
      .preview-section.visible { display: block; }

      .preview-container { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      @media (max-width: 600px) { .preview-container { grid-template-columns: 1fr; } }

      .preview-panel { border: 1px solid var(--lu-border, #e5e7eb); border-radius: 0.5rem; padding: 1rem; text-align: center; background: var(--lu-bg-secondary, #f9fafb); }
      .preview-panel h3 { margin: 0 0 0.75rem; font-size: 1rem; color: var(--lu-text-primary, #111827); }
      .preview-panel img { max-width: 100%; max-height: 300px; border-radius: 0.25rem; object-fit: contain; background: repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 50% / 16px 16px; }
      .preview-info { margin-top: 0.5rem; font-size: 0.8rem; color: var(--lu-text-secondary, #6b7280); }

      .savings-bar { margin-top: 1rem; padding: 1rem; background: var(--lu-bg-secondary, #f9fafb); border-radius: 0.5rem; border: 1px solid var(--lu-border, #e5e7eb); }
      .savings-bar-inner { height: 8px; background: var(--lu-border, #e5e7eb); border-radius: 4px; overflow: hidden; margin-top: 0.5rem; }
      .savings-bar-fill { height: 100%; background: var(--lu-success, #10b981); transition: width 0.5s ease; }
      .savings-text { font-weight: 600; font-size: 0.95rem; color: var(--lu-text-primary, #111827); }
      .savings-detail { font-size: 0.8rem; color: var(--lu-text-secondary, #6b7280); margin-top: 0.25rem; }

      .size-increased { color: var(--lu-error, #ef4444); }
    </style>

    <header class="header">
      <h1 class="title">${ICONS.image} Image Compressor</h1>
      <p class="subtitle">Compress, resize, crop, and convert images with side-by-side preview</p>
      <div style="font-size: 0.8rem; color: var(--lu-text-muted, #9ca3af); margin-top: 0.5rem;">
        Uses built-in Canvas API. 100% Local Processing.
      </div>
    </header>

    <!-- Upload Section -->
    <div class="card">
      <div class="drop-zone" id="drop-zone">
        <div style="margin-bottom: 0.5rem; color: var(--lu-text-muted, #9ca3af);">${ICONS.upload}</div>
        <div id="file-label">Drop an image here or click to browse</div>
        <div style="font-size: 0.8rem; color: var(--lu-text-muted, #9ca3af); margin-top: 0.5rem;">Supports JPEG, PNG, WebP, GIF, BMP, TIFF, AVIF</div>
        <input type="file" id="file-input" accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,.avif" hidden>
      </div>
    </div>

    <!-- Controls Panel -->
    <div class="card controls-panel" id="controls-panel">
      <!-- Crop Section -->
      <div class="crop-toggle-row">
        <button class="crop-toggle" id="crop-toggle">${ICONS.crop} Crop</button>
      </div>
      <div class="crop-container" id="crop-container"></div>

      <div class="controls-grid">
        <div class="input-group">
          <label class="label" for="quality-slider">Quality</label>
          <div class="slider-group">
            <input type="range" class="slider" id="quality-slider" min="1" max="100" value="80">
            <span class="slider-value" id="quality-value">80%</span>
          </div>
          <div class="quality-note" id="quality-note"></div>
        </div>

        <div class="input-group">
          <label class="label" for="format-select">Output Format</label>
          <div class="select-wrapper">
            <select class="select" id="format-select">
              ${formatOptions}
            </select>
            <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="input-group" id="lossless-group" style="display:none; margin-top: 0.75rem;">
            <label class="label" style="display: flex; align-items: center; margin-bottom: 0;">
              <input type="checkbox" id="lossless-toggle" style="accent-color: var(--lu-primary-500, #613E9C); margin-right: 0.5rem;">
              Lossless mode
            </label>
            <div class="quality-note" id="lossless-note"></div>
          </div>
        </div>

        <div class="input-group">
          <label class="label" for="max-width-input">Max Width (px)</label>
          <input type="number" class="text-input" id="max-width-input" placeholder="Optional" min="1">
        </div>

        <div class="input-group">
          <label class="label" for="max-height-input">Max Height (px)</label>
          <input type="number" class="text-input" id="max-height-input" placeholder="Optional" min="1">
        </div>
      </div>

      <button class="btn" id="compress-btn">${ICONS.compress} Compress Image</button>
    </div>

    <!-- Preview Section -->
    <div class="card preview-section" id="preview-section">
      <div class="preview-container">
        <div class="preview-panel">
          <h3>Original</h3>
          <img id="original-preview" alt="Original image">
          <div class="preview-info" id="original-size">Size: --</div>
          <div class="preview-info" id="original-dimensions">Dimensions: --</div>
        </div>
        <div class="preview-panel">
          <h3>Compressed</h3>
          <img id="compressed-preview" alt="Compressed image">
          <div class="preview-info" id="compressed-size">Size: --</div>
          <div class="preview-info" id="compressed-dimensions">Dimensions: --</div>
        </div>
      </div>

      <div class="savings-bar">
        <div class="savings-text" id="savings-text">Saved: --</div>
        <div class="savings-detail" id="savings-detail"></div>
        <div class="savings-bar-inner">
          <div class="savings-bar-fill" id="savings-fill" style="width: 0%;"></div>
        </div>
      </div>

      <button class="btn btn-download" id="download-btn">${ICONS.download} Download Compressed Image</button>
    </div>
    `;

    setupEventListeners(container);
    return container;
}

function setupEventListeners(container: HTMLElement) {
    const dropZone = container.querySelector('#drop-zone') as HTMLElement;
    const fileInput = container.querySelector('#file-input') as HTMLInputElement;
    const fileLabel = container.querySelector('#file-label') as HTMLElement;
    const controlsPanel = container.querySelector('#controls-panel') as HTMLElement;
    const previewSection = container.querySelector('#preview-section') as HTMLElement;
    const qualitySlider = container.querySelector('#quality-slider') as HTMLInputElement;
    const qualityValue = container.querySelector('#quality-value') as HTMLElement;
    const qualityNote = container.querySelector('#quality-note') as HTMLElement;
    const formatSelect = container.querySelector('#format-select') as HTMLSelectElement;
    const losslessGroup = container.querySelector('#lossless-group') as HTMLElement;
    const losslessToggle = container.querySelector('#lossless-toggle') as HTMLInputElement;
    const losslessNote = container.querySelector('#lossless-note') as HTMLElement;
    const maxWidthInput = container.querySelector('#max-width-input') as HTMLInputElement;
    const maxHeightInput = container.querySelector('#max-height-input') as HTMLInputElement;
    const compressBtn = container.querySelector('#compress-btn') as HTMLButtonElement;
    const downloadBtn = container.querySelector('#download-btn') as HTMLButtonElement;
    const originalPreview = container.querySelector('#original-preview') as HTMLImageElement;
    const compressedPreview = container.querySelector('#compressed-preview') as HTMLImageElement;
    const originalSize = container.querySelector('#original-size') as HTMLElement;
    const originalDimensions = container.querySelector('#original-dimensions') as HTMLElement;
    const compressedSize = container.querySelector('#compressed-size') as HTMLElement;
    const compressedDimensions = container.querySelector('#compressed-dimensions') as HTMLElement;
    const savingsText = container.querySelector('#savings-text') as HTMLElement;
    const savingsDetail = container.querySelector('#savings-detail') as HTMLElement;
    const savingsFill = container.querySelector('#savings-fill') as HTMLElement;
    const cropToggle = container.querySelector('#crop-toggle') as HTMLButtonElement;
    const cropContainer = container.querySelector('#crop-container') as HTMLElement;

    let selectedFile: File | null = null;
    let lastResult: CompressionResult | null = null;
    let originalObjectUrl: string | null = null;
    let cropTool: CropTool | null = null;
    let cropActive = false;
    let loadedImg: HTMLImageElement | null = null;

    cleanupHook = () => {
        if (originalObjectUrl) {
            URL.revokeObjectURL(originalObjectUrl);
            originalObjectUrl = null;
        }
        if (cropTool) {
            cropTool.destroy();
            cropTool = null;
        }
        selectedFile = null;
        lastResult = null;
        loadedImg = null;
    };

    // ─── Quality + Format feedback ──────────────────────────────

    function updateQualityNote() {
        const fmt = formatSelect.value;
        const q = parseInt(qualitySlider.value, 10);

        // Show/hide lossless toggle (only for WebP and AVIF)
        const showLossless = fmt === 'image/webp' || fmt === 'image/avif';
        losslessGroup.style.display = showLossless ? '' : 'none';
        if (!showLossless) {
            losslessToggle.checked = false;
        }

        // Handle lossless mode for WebP/AVIF
        if (showLossless && losslessToggle.checked) {
            qualitySlider.disabled = true;
            qualityValue.textContent = 'N/A';
            qualityNote.textContent = '';
            losslessNote.textContent = 'Lossless encoding — no quality loss';
            return;
        } else {
            losslessNote.textContent = '';
        }

        if (fmt === 'image/png' || fmt === 'image/bmp' || fmt === 'image/tiff') {
            qualitySlider.disabled = true;
            qualityValue.textContent = 'N/A';
            const labels: Record<string, string> = {
                'image/png': 'PNG is always lossless — quality slider not applicable.',
                'image/bmp': 'BMP is uncompressed — quality slider not applicable.',
                'image/tiff': 'LZW compression applied automatically.',
            };
            qualityNote.textContent = labels[fmt] || '';
        } else if (fmt === 'image/gif') {
            qualitySlider.disabled = false;
            qualityValue.textContent = `${q}%`;
            qualityNote.textContent = 'Controls palette size (2\u2013256 colors)';
        } else {
            qualitySlider.disabled = false;
            qualityValue.textContent = `${q}%`;
            if (q === 100) {
                qualityNote.textContent = 'Maximum quality — re-encodes and strips metadata.';
            } else {
                qualityNote.textContent = '';
            }
        }
    }

    qualitySlider.addEventListener('input', () => updateQualityNote());
    formatSelect.addEventListener('change', () => updateQualityNote());
    losslessToggle.addEventListener('change', () => updateQualityNote());
    updateQualityNote();

    // ─── Crop toggle ────────────────────────────────────────────

    cropToggle.addEventListener('click', () => {
        cropActive = !cropActive;
        cropToggle.classList.toggle('active', cropActive);
        cropContainer.classList.toggle('visible', cropActive);

        if (cropActive && loadedImg && !cropTool) {
            cropTool = new CropTool();
            cropContainer.appendChild(cropTool.el);
            cropTool.setImage(loadedImg);
        }
    });

    // ─── Drop zone ──────────────────────────────────────────────

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer?.files.length) {
            const file = e.dataTransfer.files[0];
            if (isImageFile(file)) handleFileSelect(file);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files?.length) handleFileSelect(fileInput.files[0]);
    });

    function isImageFile(file: File): boolean {
        return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/avif'].includes(file.type);
    }

    async function handleFileSelect(file: File) {
        selectedFile = file;
        fileLabel.textContent = `${file.name} (${ImageCompressor.formatFileSize(file.size)})`;
        dropZone.classList.add('has-file');
        controlsPanel.classList.add('visible');
        previewSection.classList.remove('visible');

        if (originalObjectUrl) URL.revokeObjectURL(originalObjectUrl);
        originalObjectUrl = URL.createObjectURL(file);
        originalPreview.src = originalObjectUrl;

        // Pre-load for crop tool
        try {
            loadedImg = await ImageCompressor.loadImage(file);
            if (cropTool && cropActive) {
                cropTool.setImage(loadedImg);
            }
        } catch {
            // If loadImage fails (no canvas), crop will be unavailable
            loadedImg = null;
        }
    }

    // ─── Compress ───────────────────────────────────────────────

    compressBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        compressBtn.disabled = true;
        compressBtn.innerHTML = 'Compressing...';

        try {
            const fmt = formatSelect.value;
            const options: CompressionOptions = {
                quality: parseInt(qualitySlider.value, 10) / 100,
                outputFormat: fmt as OutputFormat,
            };

            const maxW = parseInt(maxWidthInput.value, 10);
            const maxH = parseInt(maxHeightInput.value, 10);
            if (maxW > 0) options.maxWidth = maxW;
            if (maxH > 0) options.maxHeight = maxH;

            // Apply crop if active and not full-image
            if (cropActive && cropTool && !cropTool.isFullImage()) {
                options.crop = cropTool.getCropRegion();
            }

            // Apply lossless mode for WebP/AVIF
            if (losslessToggle.checked && (fmt === 'image/webp' || fmt === 'image/avif')) {
                options.lossless = true;
            }

            const result = await ImageCompressor.compress(selectedFile, options);
            lastResult = result;

            // Show preview
            originalSize.textContent = `Size: ${ImageCompressor.formatFileSize(result.originalSize)}`;
            originalDimensions.textContent = `${result.originalWidth} \u00d7 ${result.originalHeight}`;
            compressedPreview.src = result.dataUrl;
            compressedSize.textContent = `Size: ${ImageCompressor.formatFileSize(result.compressedSize)}`;
            compressedDimensions.textContent = `${result.width} \u00d7 ${result.height}`;

            // Savings
            const savedPercent = Math.round((1 - result.compressionRatio) * 100);
            const savedBytes = result.originalSize - result.compressedSize;

            if (result.preservedOriginal) {
                savingsText.textContent = 'Already optimally compressed — original file preserved';
                savingsText.classList.remove('size-increased');
                savingsFill.style.width = '100%';
                savingsFill.style.background = 'var(--lu-primary-500, #613E9C)';
                savingsDetail.textContent = `${ImageCompressor.formatFileSize(result.originalSize)} (no change)`;
            } else if (savedBytes > 0) {
                savingsText.textContent = `Saved: ${savedPercent}% (${ImageCompressor.formatFileSize(savedBytes)} reduction)`;
                savingsText.classList.remove('size-increased');
                savingsFill.style.width = `${savedPercent}%`;
                savingsFill.style.background = 'var(--lu-success, #10b981)';
                savingsDetail.textContent = `${ImageCompressor.formatFileSize(result.originalSize)} \u2192 ${ImageCompressor.formatFileSize(result.compressedSize)}`;
            } else {
                savingsText.textContent = `Size increased by ${ImageCompressor.formatFileSize(Math.abs(savedBytes))}`;
                savingsText.classList.add('size-increased');
                savingsFill.style.width = '100%';
                savingsFill.style.background = 'var(--lu-error, #ef4444)';
                savingsDetail.textContent = `${ImageCompressor.formatFileSize(result.originalSize)} \u2192 ${ImageCompressor.formatFileSize(result.compressedSize)}`;
            }

            previewSection.classList.add('visible');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            alert(`Error: ${message}`);
        } finally {
            compressBtn.disabled = false;
            compressBtn.innerHTML = `${ICONS.compress} Compress Image`;
        }
    });

    // ─── Download ───────────────────────────────────────────────

    downloadBtn.addEventListener('click', () => {
        if (!lastResult || !selectedFile) return;

        const ext = getExtension(formatSelect.value);
        const baseName = selectedFile.name.replace(/\.[^.]+$/, '');
        const fileName = `${baseName}-compressed.${ext}`;

        const a = document.createElement('a');
        a.href = URL.createObjectURL(lastResult.blob);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    });
}

function getExtension(mimeType: string): string {
    const map: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'image/png':  'png',
        'image/avif': 'avif',
        'image/gif':  'gif',
        'image/bmp':  'bmp',
        'image/tiff': 'tiff',
    };
    return map[mimeType] || 'jpg';
}
