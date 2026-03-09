import { describe, it, expect, beforeAll } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (!global.window) {
    GlobalRegistrator.register();
}

// Import after DOM registration
const { renderImageCompressorPage, secureCleanup } = await import("../src/page");

describe('Image Compressor Page', () => {
    let container: HTMLElement;

    beforeAll(() => {
        container = renderImageCompressorPage();
        document.body.appendChild(container);
    });

    it('should render without errors', () => {
        expect(container).toBeTruthy();
        expect(container.className).toBe('tool-page');
    });

    it('should have a title', () => {
        const title = container.querySelector('.title');
        expect(title).toBeTruthy();
        expect(title!.textContent).toContain('Image Compressor');
    });

    it('should have a drop zone for file upload', () => {
        const dropZone = container.querySelector('#drop-zone');
        expect(dropZone).toBeTruthy();
    });

    it('should have a file input accepting image formats', () => {
        const fileInput = container.querySelector('#file-input') as HTMLInputElement;
        expect(fileInput).toBeTruthy();
        expect(fileInput.accept).toBe('.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,.avif');
    });

    it('should have controls panel hidden initially', () => {
        const controlsPanel = container.querySelector('#controls-panel');
        expect(controlsPanel).toBeTruthy();
        expect(controlsPanel!.classList.contains('visible')).toBe(false);
    });

    it('should have a quality slider defaulting to 80%', () => {
        const slider = container.querySelector('#quality-slider') as HTMLInputElement;
        expect(slider).toBeTruthy();
        expect(slider.value).toBe('80');
    });

    it('should have format select with at least 6 format options', () => {
        const select = container.querySelector('#format-select') as HTMLSelectElement;
        expect(select).toBeTruthy();
        const options = select.querySelectorAll('option');
        expect(options.length).toBeGreaterThanOrEqual(6);
        // Check key formats are present
        const values = Array.from(options).map(o => o.value);
        expect(values).toContain('image/jpeg');
        expect(values).toContain('image/webp');
        expect(values).toContain('image/png');
        expect(values).toContain('image/gif');
        expect(values).toContain('image/bmp');
        expect(values).toContain('image/tiff');
    });

    it('should have max width and height inputs', () => {
        const maxWidth = container.querySelector('#max-width-input') as HTMLInputElement;
        const maxHeight = container.querySelector('#max-height-input') as HTMLInputElement;
        expect(maxWidth).toBeTruthy();
        expect(maxHeight).toBeTruthy();
    });

    it('should have compress button', () => {
        const btn = container.querySelector('#compress-btn') as HTMLButtonElement;
        expect(btn).toBeTruthy();
        expect(btn.textContent).toContain('Compress');
    });

    it('should have preview section hidden initially', () => {
        const preview = container.querySelector('#preview-section');
        expect(preview).toBeTruthy();
        expect(preview!.classList.contains('visible')).toBe(false);
    });

    it('should have original and compressed preview panels', () => {
        const originalPreview = container.querySelector('#original-preview');
        const compressedPreview = container.querySelector('#compressed-preview');
        expect(originalPreview).toBeTruthy();
        expect(compressedPreview).toBeTruthy();
    });

    it('should have download button', () => {
        const btn = container.querySelector('#download-btn') as HTMLButtonElement;
        expect(btn).toBeTruthy();
        expect(btn.textContent).toContain('Download');
    });

    it('should have crop toggle button', () => {
        const cropToggle = container.querySelector('#crop-toggle') as HTMLButtonElement;
        expect(cropToggle).toBeTruthy();
        expect(cropToggle.textContent).toContain('Crop');
    });

    it('should have lossless toggle (hidden by default for JPEG)', () => {
        const losslessGroup = container.querySelector('#lossless-group') as HTMLElement;
        expect(losslessGroup).toBeTruthy();
        // JPEG is the default format; lossless should be hidden
        expect(losslessGroup.style.display).toBe('none');
    });

    it('should show lossless toggle when WebP is selected', () => {
        const formatSelect = container.querySelector('#format-select') as HTMLSelectElement;
        const losslessGroup = container.querySelector('#lossless-group') as HTMLElement;

        formatSelect.value = 'image/webp';
        formatSelect.dispatchEvent(new Event('change'));

        expect(losslessGroup.style.display).not.toBe('none');
    });

    it('should disable quality slider when lossless is checked for WebP', () => {
        const formatSelect = container.querySelector('#format-select') as HTMLSelectElement;
        const qualitySlider = container.querySelector('#quality-slider') as HTMLInputElement;
        const losslessToggle = container.querySelector('#lossless-toggle') as HTMLInputElement;

        formatSelect.value = 'image/webp';
        formatSelect.dispatchEvent(new Event('change'));

        losslessToggle.checked = true;
        losslessToggle.dispatchEvent(new Event('change'));

        expect(qualitySlider.disabled).toBe(true);

        // Uncheck to restore
        losslessToggle.checked = false;
        losslessToggle.dispatchEvent(new Event('change'));
        expect(qualitySlider.disabled).toBe(false);
    });

    it('should enable quality slider for GIF with palette note', () => {
        const formatSelect = container.querySelector('#format-select') as HTMLSelectElement;
        const qualitySlider = container.querySelector('#quality-slider') as HTMLInputElement;
        const qualityNote = container.querySelector('#quality-note') as HTMLElement;

        formatSelect.value = 'image/gif';
        formatSelect.dispatchEvent(new Event('change'));

        expect(qualitySlider.disabled).toBe(false);
        expect(qualityNote.textContent).toContain('palette size');
    });

    it('should disable quality slider for TIFF with LZW note', () => {
        const formatSelect = container.querySelector('#format-select') as HTMLSelectElement;
        const qualitySlider = container.querySelector('#quality-slider') as HTMLInputElement;
        const qualityNote = container.querySelector('#quality-note') as HTMLElement;

        formatSelect.value = 'image/tiff';
        formatSelect.dispatchEvent(new Event('change'));

        expect(qualitySlider.disabled).toBe(true);
        expect(qualityNote.textContent).toContain('LZW');
    });

    it('should disable quality slider for BMP', () => {
        const formatSelect = container.querySelector('#format-select') as HTMLSelectElement;
        const qualitySlider = container.querySelector('#quality-slider') as HTMLInputElement;

        formatSelect.value = 'image/bmp';
        formatSelect.dispatchEvent(new Event('change'));

        expect(qualitySlider.disabled).toBe(true);
    });

    it('should disable quality slider for PNG', () => {
        const formatSelect = container.querySelector('#format-select') as HTMLSelectElement;
        const qualitySlider = container.querySelector('#quality-slider') as HTMLInputElement;

        formatSelect.value = 'image/png';
        formatSelect.dispatchEvent(new Event('change'));

        expect(qualitySlider.disabled).toBe(true);
    });

    it('should update quality display when slider changes', () => {
        const formatSelect = container.querySelector('#format-select') as HTMLSelectElement;
        const slider = container.querySelector('#quality-slider') as HTMLInputElement;
        const valueDisplay = container.querySelector('#quality-value') as HTMLElement;

        // Switch to JPEG first so the slider is enabled
        formatSelect.value = 'image/jpeg';
        formatSelect.dispatchEvent(new Event('change'));

        slider.value = '50';
        slider.dispatchEvent(new Event('input'));
        expect(valueDisplay.textContent).toBe('50%');

        slider.value = '100';
        slider.dispatchEvent(new Event('input'));
        expect(valueDisplay.textContent).toBe('100%');
    });

    it('secureCleanup should handle null gracefully', () => {
        // Call cleanup multiple times without error
        secureCleanup();
        secureCleanup();
    });
});
