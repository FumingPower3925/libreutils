
import { describe, it, expect, beforeAll } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (!global.window) {
    GlobalRegistrator.register();
}

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

        expect(areaFile.style.display).not.toBe('none');
        expect(areaText.style.display).toBe('none');

        btnText.click();
        expect(areaFile.style.display).toBe('none');
        expect(areaText.style.display).toBe('block');

        btnFile.click();
        expect(areaFile.style.display).toBe('block');
        expect(areaText.style.display).toBe('none');
    });

    it('should verify hash logic (mocked) on UI', async () => {
        const btnText = container.querySelector('#btn-mode-text') as HTMLButtonElement;
        btnText.click();

        const textarea = container.querySelector('#gen-text-input') as HTMLTextAreaElement;
        textarea.value = 'hello';

        const btnGen = container.querySelector('#gen-btn') as HTMLButtonElement;
        btnGen.click();

        await new Promise(resolve => setTimeout(resolve, 100));

        const resultBox = container.querySelector('#gen-result') as HTMLElement;
        expect(resultBox.innerHTML).toContain('MD5');
        expect(resultBox.innerHTML).toContain('5d41402abc4b2a76b9719d911017c592');
    });

    it('should handle "ALL" algorithm selection', async () => {
        const select = container.querySelector('#gen-algo') as HTMLSelectElement;
        select.value = 'ALL';

        const btnGen = container.querySelector('#gen-btn') as HTMLButtonElement;
        btnGen.click();

        await new Promise(resolve => setTimeout(resolve, 200));

        const resultBox = container.querySelector('#gen-result') as HTMLElement;
        // Should contain result items for MD5, SHA-1, SHA-256, SHA-512
        expect(resultBox.querySelectorAll('.algo-result-item').length).toBeGreaterThan(1);
        expect(resultBox.innerHTML).toContain('SHA-256');
    });
});
