import { test, expect } from '@playwright/test';

test.describe('Dark Mode', () => {
  test('toggle dark mode via header button', async ({ page }) => {
    await page.goto('/');

    // Initially should not have dark mode class
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/lu-theme-dark/);

    // Click theme toggle in the header shadow DOM
    const themeToggle = page.locator('lu-header').locator('.theme-toggle');
    await themeToggle.click();

    // Should now have dark mode class
    await expect(html).toHaveClass(/lu-theme-dark/);

    // Toggle back
    await themeToggle.click();
    await expect(html).not.toHaveClass(/lu-theme-dark/);
    await expect(html).toHaveClass(/lu-theme-light/);
  });

  test('theme persists across navigation', async ({ page }) => {
    await page.goto('/');

    // Enable dark mode
    const themeToggle = page.locator('lu-header').locator('.theme-toggle');
    await themeToggle.click();

    const html = page.locator('html');
    await expect(html).toHaveClass(/lu-theme-dark/);

    // Navigate to About page
    await page.goto('/#/about');
    await expect(page.locator('.about-page')).toBeVisible();

    // Dark mode should persist
    await expect(html).toHaveClass(/lu-theme-dark/);

    // Navigate back to Home
    await page.goto('/#/');
    await expect(page.locator('.hero')).toBeVisible();

    // Still in dark mode
    await expect(html).toHaveClass(/lu-theme-dark/);
  });

  test('respects prefers-color-scheme', async ({ browser }) => {
    // Create context with dark color scheme preference
    const context = await browser.newContext({
      colorScheme: 'dark',
    });
    const page = await context.newPage();

    await page.goto('http://localhost:5173/');

    // Should automatically apply dark mode
    const html = page.locator('html');
    await expect(html).toHaveClass(/lu-theme-dark/);

    await context.close();
  });
});
