import { test, expect } from '@playwright/test';

const toolPages = [
  { path: '/#/tools/text-encoder', name: 'Text Encoder / Decoder' },
  { path: '/#/tools/password-generator', name: 'Password Generator' },
  { path: '/#/tools/encryption-decryption', name: 'Encryptor / Decryptor' },
  { path: '/#/tools/checksum-generator', name: 'Checksum Generator' },
];

test.describe('Tool Pages', () => {
  for (const tool of toolPages) {
    test(`${tool.name} page loads without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.goto(tool.path);

      // Page should load without console errors
      expect(errors).toHaveLength(0);
    });

    test(`${tool.name} page has expected elements`, async ({ page }) => {
      await page.goto(tool.path);

      // The page content container should be visible
      const pageContent = page.locator('#page-content');
      await expect(pageContent).toBeVisible();

      // Should have some interactive elements (inputs, buttons, textareas, or selects)
      const formElements = page.locator('#page-content input, #page-content button, #page-content textarea, #page-content select');
      const count = await formElements.count();
      expect(count).toBeGreaterThan(0);
    });
  }

  test('tool pages handle cleanup on navigation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Navigate to a tool page
    await page.goto('/#/tools/text-encoder');
    await expect(page.locator('#page-content')).toBeVisible();

    // Navigate away to home
    await page.goto('/#/');
    await expect(page.locator('.hero')).toBeVisible();

    // Navigate to another tool
    await page.goto('/#/tools/password-generator');
    await expect(page.locator('#page-content')).toBeVisible();

    // Navigate to about
    await page.goto('/#/about');
    await expect(page.locator('.about-page')).toBeVisible();

    // No errors should have occurred during navigation
    expect(errors).toHaveLength(0);
  });
});
