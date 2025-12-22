import { describe, it, expect, beforeEach, afterEach, spyOn, mock, beforeAll } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { LuDownloadButton as LuDownloadButtonType } from "../src/components/DownloadButton";

GlobalRegistrator.register();

// Delay import until after DOM registration
const { LuDownloadButton } = await import("../src/components/DownloadButton");

// Register the custom element
if (!customElements.get('lu-download-button')) {
    customElements.define('lu-download-button', LuDownloadButton);
}

describe('LuDownloadButton', () => {
    let element: LuDownloadButtonType;

    beforeEach(() => {
        element = new LuDownloadButton();
        document.body.appendChild(element);
    });

    afterEach(() => {
        document.body.removeChild(element);
    });

    it('should be defined', () => {
        expect(element).toBeInstanceOf(HTMLElement);
    });

    it('should escape HTML in label', () => {
        element.setAttribute('label', '<script>alert(1)</script>');
        const shadow = element.shadowRoot;
        const btn = shadow?.querySelector('button');
        const span = btn?.querySelector('span');
        // The span content should be the escaped string, not executed HTML
        // Note: innerHTML of the span will contain &lt;...
        expect(span?.innerHTML).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('should use File System Access API if available', async () => {
        const showSaveFilePicker = mock(async () => ({
            createWritable: async () => ({
                write: async () => { },
                close: async () => { }
            })
        }));
        (window as any).showSaveFilePicker = showSaveFilePicker;

        element.content = 'test content';
        element.filename = 'test.txt';

        // Trigger download
        const btn = element.shadowRoot?.querySelector('button');
        await btn?.click(); // This is async but click() is sync. The handler is async.

        // Wait for async handler
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(showSaveFilePicker).toHaveBeenCalled();
        delete (window as any).showSaveFilePicker;
    });

    it('should throw error if File System Access API fails (non-abort)', async () => {
        // Mock error
        (window as any).showSaveFilePicker = mock(async () => {
            throw new Error('Some other error');
        });

        const createObjectURL = spyOn(URL, 'createObjectURL');

        element.content = 'test content';
        element.filename = 'test.txt';

        // Expect promise rejection
        await expect((element as any).handleDownload(new Event('click'))).rejects.toThrow('Some other error');

        // Should NOT fallback
        expect(createObjectURL).not.toHaveBeenCalled();

        delete (window as any).showSaveFilePicker;
        createObjectURL.mockRestore();
    });

    it('should fallback if showSaveFilePicker is not available', async () => {
        delete (window as any).showSaveFilePicker;

        const createObjectURL = spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
        const revokeObjectURL = spyOn(URL, 'revokeObjectURL');

        const clickSpy = mock(() => { });
        const originalCreateElement = document.createElement;
        document.createElement = ((tagName: string, options?: ElementCreationOptions) => {
            const el = originalCreateElement.call(document, tagName, options);
            if (tagName === 'a') {
                el.click = clickSpy;
            }
            return el;
        }) as any;

        element.content = 'fallback content';
        await (element as any).handleDownload(new Event('click'));

        expect(createObjectURL).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();

        // Cleanup
        document.createElement = originalCreateElement;
        createObjectURL.mockRestore();
        revokeObjectURL.mockRestore();
    });

    it('should handle AbortError gracefully (no throw, no fallback)', async () => {
        const abortError = new Error('Abort');
        abortError.name = 'AbortError';
        (window as any).showSaveFilePicker = mock(async () => { throw abortError; });

        const createObjectURL = spyOn(URL, 'createObjectURL');

        element.content = 'cancelled content';
        await (element as any).handleDownload(new Event('click'));

        expect(createObjectURL).not.toHaveBeenCalled();
        delete (window as any).showSaveFilePicker;
        createObjectURL.mockRestore();
    });
});
