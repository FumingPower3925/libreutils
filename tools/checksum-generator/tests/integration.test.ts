
import { describe, it, expect, beforeAll } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (!global.window) {
    GlobalRegistrator.register();
}

// Import after DOM registration
// Import after DOM registration
const { renderChecksumPage } = await import("../src/page");

describe('Checksum Generator UI', () => {
    let container: HTMLElement;

    beforeAll(() => {
        container = renderChecksumPage();
        document.body.appendChild(container);
    });

    it('should show Generate tab by default', () => {
        const generateSection = container.querySelector('#section-generate');
        expect(generateSection?.classList.contains('active')).toBe(true);
    });

    it('should switch between File and Text modes', () => {
        const btnFile = container.querySelector('#btn-mode-file') as HTMLButtonElement;
        const btnText = container.querySelector('#btn-mode-text') as HTMLButtonElement;
        const areaFile = container.querySelector('#input-file-area') as HTMLElement;
        const areaText = container.querySelector('#input-text-area') as HTMLElement;

        // Default is File
        expect(areaFile.style.display).not.toBe('none');
        expect(areaText.style.display).toBe('none');

        // Click Text
        btnText.click();
        expect(areaFile.style.display).toBe('none');
        expect(areaText.style.display).toBe('block');

        // Click File
        btnFile.click();
        expect(areaFile.style.display).toBe('block');
        expect(areaText.style.display).toBe('none');
    });

    it('should verify hash logic (mocked) on UI', async () => {
        // We test if the button triggers the calculate function
        // But since ChecksumTool is imported in the module, mocking it might be tricky
        // without jest.mock or similar in bun.
        // We will rely on real calculation for small text.

        // Switch to text mode
        const btnText = container.querySelector('#btn-mode-text') as HTMLButtonElement;
        btnText.click();

        const textarea = container.querySelector('#gen-text-input') as HTMLTextAreaElement;
        textarea.value = 'hello';

        const btnGen = container.querySelector('#gen-btn') as HTMLButtonElement;
        btnGen.click();

        // Wait for async
        await new Promise(resolve => setTimeout(resolve, 100)); // basic wait

        const resultBox = container.querySelector('#gen-result') as HTMLElement;
        expect(resultBox.innerHTML).toContain('MD5'); // Default algo or first result
        expect(resultBox.innerHTML).toContain('5d41402abc4b2a76b9719d911017c592'); // MD5 of 'hello'
    });

    it('should handle "ALL" algorithm selection', async () => {
        const select = container.querySelector('#gen-algo') as HTMLSelectElement;
        select.value = 'ALL';

        const btnGen = container.querySelector('#gen-btn') as HTMLButtonElement;
        btnGen.click();

        await new Promise(resolve => setTimeout(resolve, 200));

        const resultBox = container.querySelector('#gen-result') as HTMLElement;
        // Should contain result items for multiple algos
        expect(resultBox.querySelectorAll('.algo-result-item').length).toBeGreaterThan(1);
        expect(resultBox.innerHTML).toContain('SHA-256');
        expect(resultBox.innerHTML).toContain('BLAKE2b');
    });
});
