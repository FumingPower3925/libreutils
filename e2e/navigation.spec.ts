import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('navigate between pages via header links', async ({ page }) => {
    await page.goto('/');

    // The header uses shadow DOM, so we need to pierce it
    const header = page.locator('lu-header');
    await expect(header).toBeVisible();

    // Navigate to About via header nav link
    const aboutLink = header.locator('a.nav-link', { hasText: 'About' });
    await aboutLink.click();

    await expect(page.locator('.about-page')).toBeVisible();
    await expect(page.locator('.about-title')).toContainText('About LibreUtils');

    // Navigate back to Tools (Home) via header nav link
    const toolsLink = header.locator('a.nav-link', { hasText: 'Tools' });
    await toolsLink.click();

    await expect(page.locator('.hero')).toBeVisible();
  });

  test('navigate to tool pages from home cards', async ({ page }) => {
    await page.goto('/');

    // Click on the first tool card link
    const firstCard = page.locator('lu-card').first();
    const cardLink = firstCard.locator('a');
    await cardLink.click();

    // Should navigate to a tool page (URL should contain #/tools/)
    await expect(page).toHaveURL(/\/#\/tools\//);
  });

  test('back navigation works', async ({ page }) => {
    await page.goto('/');

    // Navigate to About
    await page.goto('/#/about');
    await expect(page.locator('.about-page')).toBeVisible();

    // Navigate back
    await page.goBack();
    await expect(page.locator('.hero')).toBeVisible();
  });

  test('404 page shows for invalid routes', async ({ page }) => {
    await page.goto('/#/this-page-does-not-exist');

    const notFoundPage = page.locator('.not-found-page');
    await expect(notFoundPage).toBeVisible();

    const title = page.locator('.not-found-title');
    await expect(title).toContainText('Page Not Found');

    // "Back to Home" link should work
    const backLink = page.locator('.not-found-btn');
    await backLink.click();

    await expect(page.locator('.hero')).toBeVisible();
  });
});
