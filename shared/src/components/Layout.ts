/**
 * Layout Web Component
 */

export class LuLayout extends HTMLElement {
    static tagName = 'lu-layout';

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback(): void {
        this.render();
    }

    private render(): void {
        if (!this.shadowRoot) return;

        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .layout-header {
          position: sticky;
          top: 0;
          z-index: 200;
        }
        .layout-main {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .layout-footer {
          margin-top: auto;
        }
      </style>
      <div class="layout-header">
        <slot name="header"></slot>
      </div>
      <main class="layout-main">
        <slot></slot>
      </main>
      <div class="layout-footer">
        <slot name="footer"></slot>
      </div>
    `;
    }
}
