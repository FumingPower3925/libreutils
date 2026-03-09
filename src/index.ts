import { registerComponents, createRouter, type Route } from '@libreutils/shared';
import '@libreutils/shared/styles/index.css';

import { renderHomePage } from './pages/home';

function lazyTool(
    importFn: () => Promise<Record<string, any>>,
    renderKey: string,
    cleanupKey?: string,
) {
    let mod: Record<string, any> | null = null;
    return {
        render: async () => {
            mod = await importFn();
            return mod[renderKey]();
        },
        onLeave: cleanupKey
            ? () => { mod?.[cleanupKey]?.(); }
            : undefined,
    };
}

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
    {
        path: '/about',
        title: 'About',
        ...lazyTool(() => import('./pages/about'), 'renderAboutPage'),
    },
    {
        path: '/legal',
        title: 'Legal',
        ...lazyTool(() => import('./pages/legal'), 'renderLegalPage'),
    },
    {
        path: '/tools/text-encoder',
        title: 'Text Encoder / Decoder',
        ...lazyTool(() => import('../tools/text-encoder/src/page'), 'renderTextEncoderPage', 'secureCleanup'),
    },
    {
        path: '/tools/password-generator',
        title: 'Password Generator',
        ...lazyTool(() => import('../tools/password-generator/src/page'), 'renderPasswordGeneratorPage', 'secureCleanup'),
    },
    {
        path: '/tools/encryption-decryption',
        title: 'Encryptor / Decryptor',
        ...lazyTool(() => import('../tools/encryption-decryption/src/page'), 'renderEncryptorPage', 'secureCleanup'),
    },
    {
        path: '/tools/checksum-generator',
        title: 'Checksum Generator',
        ...lazyTool(() => import('../tools/checksum-generator/src/page'), 'renderChecksumPage'),
    },
    {
        path: '/tools/metadata-scrubber',
        title: 'Metadata Scrubber',
        ...lazyTool(() => import('../tools/metadata-scrubber/src/page'), 'renderMetadataScrubberPage', 'secureCleanup'),
    },
    {
        path: '/tools/archive-manager',
        title: 'Archive Manager',
        ...lazyTool(() => import('../tools/archive-manager/src/page'), 'renderArchiveManagerPage', 'secureCleanup'),
    },
    {
        path: '/tools/image-compressor',
        title: 'Image Compressor',
        ...lazyTool(() => import('../tools/image-compressor/src/page'), 'renderImageCompressorPage', 'secureCleanup'),
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
            notFound: async () => {
                const { renderNotFoundPage } = await import('./pages/not-found');
                return renderNotFoundPage();
            },
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
