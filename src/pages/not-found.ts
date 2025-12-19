/**
 * 404 Not Found Page
 */

export function renderNotFoundPage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'not-found-page';

    container.innerHTML = `
    <style>
      .not-found-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        text-align: center;
        padding: var(--lu-space-8, 2rem);
      }
      .not-found-icon {
        width: 64px;
        height: 64px;
        color: var(--lu-text-muted, #9ca3af);
        margin-bottom: var(--lu-space-6, 1.5rem);
      }
      .not-found-title {
        font-size: var(--lu-text-4xl, 2.25rem);
        font-weight: 700;
        margin-bottom: var(--lu-space-4, 1rem);
      }
      .not-found-description {
        color: var(--lu-text-secondary, #6b7280);
        margin-bottom: var(--lu-space-8, 2rem);
        max-width: 400px;
      }
      .not-found-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--lu-space-2, 0.5rem);
        padding: var(--lu-space-3, 0.75rem) var(--lu-space-6, 1.5rem);
        font-weight: 500;
        text-decoration: none;
        background: var(--lu-primary-500, #7c3aed);
        color: white;
        border-radius: var(--lu-radius-md, 0.5rem);
        transition: all var(--lu-transition-fast, 150ms ease);
      }
      .not-found-btn:hover {
        background: var(--lu-primary-600, #6d28d9);
        transform: translateY(-1px);
      }
      .not-found-btn svg {
        width: 18px;
        height: 18px;
      }
    </style>
    
    <svg class="not-found-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="11" cy="11" r="8"/>
      <path d="M21 21l-4.35-4.35"/>
      <path d="M8 8l6 6M14 8l-6 6"/>
    </svg>
    <h1 class="not-found-title">Page Not Found</h1>
    <p class="not-found-description">
      Sorry, the page you're looking for doesn't exist or has been moved.
    </p>
    <a href="#/" class="not-found-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Back to Home
    </a>
  `;

    return container;
}
