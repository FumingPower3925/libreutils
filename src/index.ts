import { registerComponents, createRouter, type Route } from '@libreutils/shared';
import '@libreutils/shared/styles/index.css';

import { renderHomePage } from './pages/home';
import { renderAboutPage } from './pages/about';
import { renderNotFoundPage } from './pages/not-found';
import { renderTextEncoderPage, secureCleanup as cleanupTextEncoder } from '../tools/text-encoder/src/page';
import { renderPasswordGeneratorPage, secureCleanup as cleanupPasswordGenerator } from '../tools/password-generator/src/page';

function initTheme(): void {
    const stored = localStorage.getItem('lu-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (stored === 'dark' || (!stored && prefersDark)) {
        document.documentElement.classList.add('lu-theme-dark');
    } else if (stored === 'light') {
        document.documentElement.classList.add('lu-theme-light');
    }
}

async function registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateToast();
                        }
                    });
                }
            });
        } catch (error) {
            console.log('ServiceWorker registration failed:', error);
        }
    }

    navigator.serviceWorker?.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATED') {
            showUpdateToast(event.data.version);
        }
    });
}

function showUpdateToast(version?: string): void {
    if (document.getElementById('update-toast')) return;

    const toast = document.createElement('div');
    toast.id = 'update-toast';

    const style = document.createElement('style');
    style.textContent = `
        #update-toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--lu-primary-500, #613E9C);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10000;
            font-family: var(--lu-font-sans, system-ui);
            animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
            from { transform: translateX(-50%) translateY(100px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        #update-toast button {
            background: white;
            color: var(--lu-primary-500, #613E9C);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
        }
        #update-toast .dismiss {
            background: transparent;
            color: white;
            opacity: 0.7;
        }
    `;

    const message = document.createElement('span');
    message.textContent = `New version${version ? ` (v${version})` : ''} available!`;

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh';
    refreshBtn.addEventListener('click', () => location.reload());

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'dismiss';
    dismissBtn.textContent = 'X';
    dismissBtn.addEventListener('click', () => toast.remove());

    toast.appendChild(style);
    toast.appendChild(message);
    toast.appendChild(refreshBtn);
    toast.appendChild(dismissBtn);
    document.body.appendChild(toast);
}

const routes: Route[] = [
    { path: '/', title: 'Home', render: renderHomePage },
    { path: '/about', title: 'About', render: renderAboutPage },
    {
        path: '/tools/text-encoder',
        title: 'Text Encoder / Decoder',
        render: renderTextEncoderPage,
        onLeave: cleanupTextEncoder
    },
    {
        path: '/tools/password-generator',
        title: 'Password Generator',
        render: renderPasswordGeneratorPage,
        onLeave: cleanupPasswordGenerator
    },
];

function init(): void {
    initTheme();
    registerComponents();

    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    appContainer.innerHTML = `
    <lu-layout>
      <lu-header slot="header"></lu-header>
      <div id="page-content"></div>
      <lu-footer slot="footer"></lu-footer>
    </lu-layout>
  `;

    const pageContent = document.getElementById('page-content');
    if (pageContent) {
        createRouter({
            routes,
            container: pageContent,
            notFound: renderNotFoundPage,
        });
    }

    if ('serviceWorker' in navigator) {
        registerServiceWorker();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
