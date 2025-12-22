import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { renderTextEncoderPage, secureCleanup } from '../src/page';

// Mock DOM interfaces
class MockHTMLElement {
    public value: string = '';
    public textContent: string = '';
    public innerHTML: string = '';
    public style = { width: '', background: '', display: '' };
    public classList = {
        add: () => { },
        remove: () => { },
        toggle: () => { }
    };
    public tagName: string;
    public listeners: Record<string, () => void> = {};
    public children: MockHTMLElement[] = [];

    constructor(tagName: string = 'div') {
        this.tagName = tagName.toUpperCase();
    }

    getAttribute(_name: string) { return null; }
    setAttribute(_name: string, _value: string) { /* unused */ }
    querySelector(_selector: string) { return new MockHTMLElement(); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appendChild(child: any) { this.children.push(child); return child; }
    addEventListener(event: string, handler: () => void) {
        this.listeners[event] = handler;
    }
    click() {
        if (this.listeners['click']) this.listeners['click']();
    }
}

// Global mocks
const originalDocument = global.document;

describe('TextEncoder Page Cleanup', () => {
    let mockInput: MockHTMLElement;
    let mockOutput: MockHTMLElement;

    beforeAll(() => {
        // Setup document mock
        const docMock = {
            createElement: (tag: string) => new MockHTMLElement(tag),
            querySelector: (sel: string) => { void sel; return new MockHTMLElement(); },
            body: { appendChild: () => { } },
            execCommand: () => { }
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        global.document = docMock as any;

        // We need to intercept querySelector checks inside setupEventListeners
        // to return our controlled mocks for input and output.
        // However, renderTextEncoderPage calls setupEventListeners internally with the container.
        // The container.querySelector is what we rely on.
    });

    afterAll(() => {
        global.document = originalDocument;
    });

    test('secureCleanup clears input and output textareas', () => {
        // 1. Create specific mocks
        mockInput = new MockHTMLElement('textarea');
        mockInput.value = 'Secret Data';

        mockOutput = new MockHTMLElement('textarea');
        mockOutput.value = 'Encoded Data';

        // 2. Mock container.querySelector to return our specific mocks
        const container = new MockHTMLElement('div');

        container.querySelector = (selector: string) => {
            if (selector === '#input-text') return mockInput;
            if (selector === '#output-text') return mockOutput;
            // Return dummy mocks for others specific to text-encoder page
            if (['#encoding-type', '#decode-btn', '#swap-btn', '#copy-btn', '#input-count', '#output-count', '#error-message', '#copy-feedback', '#encode-btn'].includes(selector)) {
                return new MockHTMLElement();
            }
            return new MockHTMLElement(); // fallback
        };

        // 3. Spy on container creation? 
        // renderTextEncoderPage creates a generic container.
        // We can't inject our container into renderTextEncoderPage clearly.
        // BUT checking source: `setupEventListeners(container)` is called with the container it created.
        // It creates: const container = document.createElement('div');
        // We can verify if document.createElement works as we mocked.

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        global.document.createElement = ((tag: string) => {
            if (tag === 'div') return container;
            return new MockHTMLElement(tag);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any;
        // 4. Render page -> initializes hooks
        renderTextEncoderPage();

        // 5. Verify initial state (simulated usage)
        expect(mockInput.value).toBe('Secret Data');
        expect(mockOutput.value).toBe('Encoded Data');

        // 6. Run cleanup
        secureCleanup();

        // 7. Assert cleared
        expect(mockInput.value).toBe('');
        expect(mockOutput.value).toBe('');
    });

    test('secureCleanup handles null hook gracefully', () => {
        // Should not throw
        secureCleanup();
        secureCleanup();
    });
});
