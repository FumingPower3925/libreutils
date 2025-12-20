import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { renderPasswordGeneratorPage, secureCleanup } from '../src/page';

// Mock DOM interfaces
class MockHTMLElement {
    public value: string = '';
    public textContent: string = '';
    public innerHTML: string = '';
    public style = { width: '', background: '', display: '' };
    public classList = {
        add: () => { },
        remove: () => { },
        contains: () => false,
    };
    public checked: boolean = false;

    getAttribute(name: string) { return this.checked ? 'true' : 'false'; } // simplified
    setAttribute(name: string, value: string) { }
    querySelector(selector: string) { return new MockHTMLElement(); }
    addEventListener(event: string, handler: Function) { }
    dispatchEvent(event: any) { }
}

// Global mocks
const originalDocument = global.document;

describe('PasswordGenerator Page Cleanup', () => {
    let mockPasswordText: MockHTMLElement;
    let mockStaticInput: MockHTMLElement;
    let mockContainer: MockHTMLElement;

    beforeAll(() => {
        // Setup document mock
        const docMock = {
            createElement: (tag: string) => {
                if (tag === 'div' && !mockContainer) { // simplistic singleton check for page root
                    mockContainer = new MockHTMLElement();
                    return mockContainer;
                }
                return new MockHTMLElement();
            },
            querySelector: (sel: string) => new MockHTMLElement(),
        };
        global.document = docMock as any;
    });

    afterAll(() => {
        global.document = originalDocument;
    });

    test('secureCleanup clears password display and static string input', () => {
        // 1. Prepare mocks
        mockPasswordText = new MockHTMLElement();
        mockPasswordText.textContent = 'SecretPassword123';

        mockStaticInput = new MockHTMLElement();
        mockStaticInput.value = 'StaticPrefix';

        // 2. Reset container mock behavior for this test
        // When renderPasswordGeneratorPage runs, it makes a div.
        // We intercept querySelector on that div.
        mockContainer = new MockHTMLElement();
        mockContainer.querySelector = (selector: string) => {
            if (selector === '#password-text') return mockPasswordText;
            if (selector === '#opt-static-string') return mockStaticInput;
            // Return valid mocks for everything else to avoid null pointer in setup
            return new MockHTMLElement();
        };

        // Override createElement for this run
        global.document.createElement = ((tag: string) => {
            if (tag === 'div') return mockContainer;
            return new MockHTMLElement();
        }) as any;

        // 3. Render
        renderPasswordGeneratorPage();

        // 4. Verify initial state
        expect(mockPasswordText.textContent).toBe('SecretPassword123');
        expect(mockStaticInput.value).toBe('StaticPrefix');

        // 5. Cleanup
        secureCleanup();

        // 6. Verify cleared
        expect(mockPasswordText.textContent).toBe('');
        expect(mockStaticInput.value).toBe('');

        // Note: We cannot verify passwordHistory array directly as it is private closure state,
        // but verifying the DOM side effects is the best proxy we have for this unit test.
    });
});
