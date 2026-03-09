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
        expect(fileInput.accept).toBe('.jpg,.jpeg,.png,.webp');
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

    it('should have format select with JPEG, WebP, PNG options', () => {
        const select = container.querySelector('#format-select') as HTMLSelectElement;
        expect(select).toBeTruthy();
        const options = select.querySelectorAll('option');
        expect(options.length).toBe(3);
        expect(options[0].value).toBe('image/jpeg');
        expect(options[1].value).toBe('image/webp');
        expect(options[2].value).toBe('image/png');
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

    it('should update quality display when slider changes', () => {
        const slider = container.querySelector('#quality-slider') as HTMLInputElement;
        const valueDisplay = container.querySelector('#quality-value') as HTMLElement;

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
