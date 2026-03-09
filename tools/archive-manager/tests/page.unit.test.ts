import { describe, it, expect } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (!global.window) {
    GlobalRegistrator.register();
}

// Import after DOM registration
const { renderArchiveManagerPage, secureCleanup } = await import("../src/page");

describe('Archive Manager Page', () => {
    it('should render without errors', () => {
        const container = renderArchiveManagerPage();
        expect(container).toBeTruthy();
        expect(container.className).toBe('tool-page');
    });

    it('should contain the drop zone', () => {
        const container = renderArchiveManagerPage();
        const dropZone = container.querySelector('#archive-drop-zone');
        expect(dropZone).toBeTruthy();
    });

    it('should contain the file input with multiple attribute', () => {
        const container = renderArchiveManagerPage();
        const fileInput = container.querySelector('#archive-file-input') as HTMLInputElement;
        expect(fileInput).toBeTruthy();
        expect(fileInput.hasAttribute('multiple')).toBe(true);
    });

    it('should contain the extract all button', () => {
        const container = renderArchiveManagerPage();
        const extractBtn = container.querySelector('#btn-extract-all');
        expect(extractBtn).toBeTruthy();
    });

    it('should have decompress mode initially hidden', () => {
        const container = renderArchiveManagerPage();
        const decompressMode = container.querySelector('#decompress-mode') as HTMLElement;
        expect(decompressMode).toBeTruthy();
        expect(decompressMode.style.display).toBe('none');
    });

    it('should have compress mode initially hidden', () => {
        const container = renderArchiveManagerPage();
        const compressMode = container.querySelector('#compress-mode') as HTMLElement;
        expect(compressMode).toBeTruthy();
        expect(compressMode.style.display).toBe('none');
    });

    it('should contain format selector with 7 format options (RAR disabled)', () => {
        const container = renderArchiveManagerPage();
        const formatSelect = container.querySelector('#archive-format') as HTMLSelectElement;
        expect(formatSelect).toBeTruthy();
        const options = Array.from(formatSelect.options).map(o => o.value);
        expect(options).toEqual(['zip', 'tar', 'tar.gz', 'tar.bz2', 'tar.xz', '7z', 'rar']);
        const rarOption = formatSelect.querySelector('option[value="rar"]') as HTMLOptionElement;
        expect(rarOption.disabled).toBe(true);
    });

    it('should contain compression level slider', () => {
        const container = renderArchiveManagerPage();
        const slider = container.querySelector('#compression-level') as HTMLInputElement;
        expect(slider).toBeTruthy();
        expect(slider.getAttribute('min')).toBe('0');
        expect(slider.getAttribute('max')).toBe('9');
        expect(slider.value).toBe('6');
    });

    it('should contain create archive button', () => {
        const container = renderArchiveManagerPage();
        const createBtn = container.querySelector('#create-btn');
        expect(createBtn).toBeTruthy();
    });

    it('should contain masked password input with eye toggle', () => {
        const container = renderArchiveManagerPage();
        const passwordInput = container.querySelector('#archive-password') as HTMLInputElement;
        expect(passwordInput).toBeTruthy();
        expect(passwordInput.type).toBe('password');
        const eyeToggle = container.querySelector('#password-eye') as HTMLButtonElement;
        expect(eyeToggle).toBeTruthy();
    });

    it('should contain password hint (initially hidden)', () => {
        const container = renderArchiveManagerPage();
        const hint = container.querySelector('#password-hint') as HTMLElement;
        expect(hint).toBeTruthy();
        expect(hint.style.display).toBe('none');
    });

    it('should contain decrypt password input in decompress mode', () => {
        const container = renderArchiveManagerPage();
        const decryptInput = container.querySelector('#decrypt-password') as HTMLInputElement;
        expect(decryptInput).toBeTruthy();
        expect(decryptInput.type).toBe('password');
    });

    it('should contain encrypted archive notice (hidden)', () => {
        const container = renderArchiveManagerPage();
        const notice = container.querySelector('#encrypted-notice') as HTMLElement;
        expect(notice).toBeTruthy();
        expect(notice.style.display).toBe('none');
    });
});

describe('secureCleanup', () => {
    it('should handle null cleanupHook gracefully', () => {
        // Calling secureCleanup when no page has been rendered should not throw
        secureCleanup();
    });

    it('should run cleanup after page render without throwing', () => {
        renderArchiveManagerPage();
        secureCleanup();
        // Call again — should be idempotent
        secureCleanup();
    });
});
