import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/LibreUtils/);
  });

  test('hero section is visible', async ({ page }) => {
    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();

    const heroTitle = page.locator('.hero-title');
    await expect(heroTitle).toContainText('Privacy-First Toolkit');

    const heroDescription = page.locator('.hero-description');
    await expect(heroDescription).toBeVisible();
  });

  test('tool cards are rendered', async ({ page }) => {
    const toolsGrid = page.locator('#tools-grid');
    await expect(toolsGrid).toBeVisible();

    const cards = page.locator('lu-card');
    // Should have at least 5 tools (may grow over time)
    await expect(cards).toHaveCount(7);
  });

  test('category filter works', async ({ page }) => {
    // Click on "Encryption" category
    const encryptionBtn = page.locator('.category-btn', { hasText: 'Encryption' });
    await encryptionBtn.click();
    await expect(encryptionBtn).toHaveClass(/active/);

    // Should show only encryption tools (Password Generator and Encryptor/Decryptor)
    const cards = page.locator('lu-card');
    await expect(cards).toHaveCount(2);

    // Click "All Tools" to reset
    const allBtn = page.locator('.category-btn', { hasText: 'All Tools' });
    await allBtn.click();
    await expect(allBtn).toHaveClass(/active/);

    await expect(page.locator('lu-card')).toHaveCount(7);
  });

  test('search functionality works', async ({ page }) => {
    const searchInput = page.locator('#tool-search');
    await expect(searchInput).toBeVisible();

    // Search for "checksum" — unique to one tool
    await searchInput.fill('checksum');

    const cards = page.locator('lu-card');
    await expect(cards).toHaveCount(1);

    // Clear search to show all tools again
    await searchInput.fill('');
    await expect(page.locator('lu-card')).toHaveCount(7);
  });
});
