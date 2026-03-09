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

    it('should contain the file input', () => {
        const container = renderArchiveManagerPage();
        const fileInput = container.querySelector('#archive-file-input') as HTMLInputElement;
        expect(fileInput).toBeTruthy();
        expect(fileInput.getAttribute('accept')).toBe('.zip,.tar,.gz,.tar.gz,.tgz');
    });

    it('should contain the extract all button', () => {
        const container = renderArchiveManagerPage();
        const extractBtn = container.querySelector('#btn-extract-all');
        expect(extractBtn).toBeTruthy();
    });

    it('should have results area initially hidden', () => {
        const container = renderArchiveManagerPage();
        const results = container.querySelector('#archive-results') as HTMLElement;
        expect(results).toBeTruthy();
        expect(results.classList.contains('visible')).toBe(false);
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
