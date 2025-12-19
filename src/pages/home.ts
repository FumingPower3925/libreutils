/**
 * Home Page
 */

import type { ToolMeta } from '@libreutils/shared';

const tools: ToolMeta[] = [
  {
    id: 'text-encoder',
    name: 'Text Encoder / Decoder',
    description: 'Encode and decode text using various formats like Base64, URL encoding, HTML entities, and more.',
    category: 'text',
    keywords: ['base64', 'url', 'encode', 'decode', 'html', 'escape'],
  },
];

const categories = [
  { id: 'all', name: 'All Tools' },
  { id: 'encryption', name: 'Encryption' },
  { id: 'compression', name: 'Compression' },
  { id: 'text', name: 'Text' },
  { id: 'image', name: 'Image' },
  { id: 'file', name: 'File' },
  { id: 'conversion', name: 'Conversion' },
];

export function renderHomePage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'home-page';

  container.innerHTML = `
    <style>
      .home-page {
        min-height: 100%;
      }
      .hero {
        text-align: center;
        padding: var(--lu-space-16, 4rem) var(--lu-space-6, 1.5rem);
        background: linear-gradient(135deg, #f5f3f9 0%, #fafafa 100%);
      }
      :root.lu-theme-dark .hero {
        background: linear-gradient(135deg, #1f1432 0%, #121212 100%);
      }
      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--lu-space-2, 0.5rem);
        padding: var(--lu-space-2, 0.5rem) var(--lu-space-4, 1rem);
        background: var(--lu-success-light, #e8f5e9);
        color: var(--lu-success, #2e7d32);
        font-size: var(--lu-text-sm, 0.875rem);
        font-weight: 500;
        border-radius: var(--lu-radius-full, 9999px);
        margin-bottom: var(--lu-space-6, 1.5rem);
      }
      .hero-badge svg {
        width: 16px;
        height: 16px;
      }
      .hero-title {
        font-size: var(--lu-text-4xl, 2.25rem);
        font-weight: 800;
        margin-bottom: var(--lu-space-4, 1rem);
        background: linear-gradient(135deg, #613E9C, #D3381C);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      @media (max-width: 640px) {
        .hero-title {
          font-size: var(--lu-text-3xl, 1.875rem);
        }
      }
      .hero-description {
        font-size: var(--lu-text-lg, 1.125rem);
        color: var(--lu-text-secondary, #6b7280);
        max-width: 600px;
        margin: 0 auto var(--lu-space-8, 2rem);
        line-height: 1.6;
      }
      .features {
        display: flex;
        justify-content: center;
        gap: var(--lu-space-8, 2rem);
        flex-wrap: wrap;
      }
      .feature {
        display: flex;
        align-items: center;
        gap: var(--lu-space-2, 0.5rem);
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-secondary, #6b7280);
      }
      .feature svg {
        width: 18px;
        height: 18px;
        color: var(--lu-primary-500, #7c3aed);
      }
      .main-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: var(--lu-space-12, 3rem) var(--lu-space-6, 1.5rem);
      }
      .category-nav {
        display: flex;
        gap: var(--lu-space-2, 0.5rem);
        margin-bottom: var(--lu-space-8, 2rem);
        overflow-x: auto;
        padding-bottom: var(--lu-space-2, 0.5rem);
      }
      .category-btn {
        padding: var(--lu-space-2, 0.5rem) var(--lu-space-4, 1rem);
        font-family: inherit;
        font-size: var(--lu-text-sm, 0.875rem);
        font-weight: 500;
        color: var(--lu-text-secondary, #6b7280);
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-full, 9999px);
        cursor: pointer;
        transition: all var(--lu-transition-fast, 150ms ease);
        white-space: nowrap;
      }
      .category-btn:hover {
        border-color: var(--lu-primary-300, #c4b5fd);
        color: var(--lu-primary-600, #7c3aed);
      }
      .category-btn.active {
        background: var(--lu-primary-500, #7c3aed);
        border-color: var(--lu-primary-500, #7c3aed);
        color: white;
      }
      .section-title {
        font-size: var(--lu-text-2xl, 1.5rem);
        font-weight: 600;
        margin-bottom: var(--lu-space-6, 1.5rem);
      }
      .tools-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: var(--lu-space-6, 1.5rem);
      }
      .empty-state {
        text-align: center;
        padding: var(--lu-space-12, 3rem);
        color: var(--lu-text-muted, #9ca3af);
        grid-column: 1 / -1;
      }
      .search-container {
        margin-bottom: var(--lu-space-8, 2rem);
      }
      .search-wrapper {
        position: relative;
        display: inline-block;
        width: 100%;
        max-width: 400px;
      }
      .search-input {
        width: 100%;
        padding: var(--lu-space-3, 0.75rem) var(--lu-space-4, 1rem);
        padding-left: var(--lu-space-12, 3rem);
        font-family: inherit;
        font-size: var(--lu-text-base, 1rem);
        color: var(--lu-text-primary, #111827);
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-lg, 0.75rem);
        transition: all var(--lu-transition-fast, 150ms ease);
      }
      .search-input:focus {
        outline: none;
        border-color: var(--lu-primary-500, #7c3aed);
        box-shadow: 0 0 0 3px var(--lu-primary-100, #ede9fe);
      }
      .search-icon {
        position: absolute;
        left: var(--lu-space-4, 1rem);
        top: 50%;
        transform: translateY(-50%);
        color: var(--lu-text-muted, #9ca3af);
        width: 20px;
        height: 20px;
      }
    </style>
    
    <section class="hero">
      <span class="hero-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        100% Private &amp; Client-Side
      </span>
      <h1 class="hero-title">Your Privacy-First Toolkit</h1>
      <p class="hero-description">
        Free, open-source web tools that run entirely in your browser. 
        No server uploads, no tracking, no ads. Your data never leaves your device.
      </p>
      <div class="features">
        <div class="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span>Fast &amp; Lightweight</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <span>No Data Collection</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z"/>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
          </svg>
          <span>Works Offline</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
          </svg>
          <span>Open Source</span>
        </div>
      </div>
    </section>
    
    <main class="main-content">
      <div class="search-container">
        <div class="search-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="search" class="search-input" placeholder="Search tools..." id="tool-search">
        </div>
      </div>
      
      <nav class="category-nav" aria-label="Tool categories">
        ${categories.map(cat => `
          <button class="category-btn ${cat.id === 'all' ? 'active' : ''}" data-category="${cat.id}">
            ${cat.name}
          </button>
        `).join('')}
      </nav>
      
      <h2 class="section-title">Available Tools</h2>
      
      <div class="tools-grid" id="tools-grid">
        ${tools.length > 0 ? tools.map(tool => `
          <lu-card
            title="${tool.name}"
            description="${tool.description}"
            category="${tool.category}"
            href="#/tools/${tool.id}"
          ></lu-card>
        `).join('') : `
          <div class="empty-state">
            <p>Tools are being added. Check back soon!</p>
          </div>
        `}
      </div>
    </main>
  `;

  setupSearch(container, tools);
  setupCategoryFilter(container, tools);

  // Apply category filter from URL if present
  applyCategoryFromUrl(container, tools);

  return container;
}

function getCategoryFromUrl(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/\?category=([^&]+)/);
  return match ? match[1] : null;
}

function applyCategoryFromUrl(container: HTMLElement, tools: ToolMeta[]): void {
  const category = getCategoryFromUrl();
  if (!category) return;

  const buttons = container.querySelectorAll('.category-btn');
  const toolsGrid = container.querySelector('#tools-grid') as HTMLElement;

  if (!toolsGrid) return;

  // Find and activate the matching category button
  buttons.forEach(btn => {
    const btnCategory = (btn as HTMLElement).dataset.category;
    if (btnCategory === category) {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  });

  // Filter tools
  const filtered = tools.filter(t => t.category === category);
  renderTools(toolsGrid, filtered);
}

function setupSearch(container: HTMLElement, tools: ToolMeta[]): void {
  const searchInput = container.querySelector('#tool-search') as HTMLInputElement;
  const toolsGrid = container.querySelector('#tools-grid') as HTMLElement;

  if (!searchInput || !toolsGrid) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = query
      ? tools.filter(tool =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.keywords?.some((k: string) => k.toLowerCase().includes(query))
      )
      : tools;

    renderTools(toolsGrid, filtered);
  });
}

function setupCategoryFilter(container: HTMLElement, tools: ToolMeta[]): void {
  const buttons = container.querySelectorAll('.category-btn');
  const toolsGrid = container.querySelector('#tools-grid') as HTMLElement;

  if (!toolsGrid) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const category = (btn as HTMLElement).dataset.category;
      const filtered = category === 'all'
        ? tools
        : tools.filter(t => t.category === category);

      renderTools(toolsGrid, filtered);
    });
  });
}

function renderTools(container: HTMLElement, tools: ToolMeta[]): void {
  if (tools.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No tools found matching your criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tools.map(tool => `
    <lu-card
      title="${tool.name}"
      description="${tool.description}"
      category="${tool.category}"
      href="#/tools/${tool.id}"
    ></lu-card>
  `).join('');
}
