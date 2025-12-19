/**
 * Standalone Entry Point for Text Encoder Tool
 * 
 * This file enables the tool to run independently.
 */

import { registerComponents } from '@libreutils/shared';
import '@libreutils/shared/styles/index.css';
import { renderTextEncoderPage } from './page';

// Initialize theme
function initTheme(): void {
    const stored = localStorage.getItem('lu-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (stored === 'dark' || (!stored && prefersDark)) {
        document.documentElement.classList.add('lu-theme-dark');
    } else if (stored === 'light') {
        document.documentElement.classList.add('lu-theme-light');
    }
}

function init(): void {
    initTheme();
    registerComponents();

    const appContainer = document.getElementById('app');
    if (!appContainer) {
        console.error('App container not found');
        return;
    }

    // Create standalone layout
    appContainer.innerHTML = `
    <lu-layout>
      <lu-header slot="header" site-name="LibreUtils" home-url="/"></lu-header>
      <div id="page-content"></div>
      <lu-footer slot="footer"></lu-footer>
    </lu-layout>
  `;

    const pageContent = document.getElementById('page-content');
    if (pageContent) {
        pageContent.appendChild(renderTextEncoderPage());
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
