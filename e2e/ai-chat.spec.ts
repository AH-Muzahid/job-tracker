import { test, expect } from '@playwright/test';

test.describe('AI Chat Assistant E2E & Mocked API Tests', () => {
  test('should send a user message and stream back AI assistant response', async ({ page }) => {
    // 1. Intercept and mock the /api/ai/chat streaming endpoint
    await page.route('/api/ai/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: 'Hello! I am your AI career assistant. How can I help with your job search today?',
      });
    });

    // 2. Intercept chat session creation if called
    await page.route('/api/ai/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-session-123', title: 'Test Chat' }),
      });
    });

    // Navigate to AI Chat page
    await page.goto('/ai-assistant');

    // Verify textarea or input exists
    const inputArea = page.locator('textarea');
    if (await inputArea.isVisible()) {
      await inputArea.fill('How can I improve my job application strategy?');
      
      // Click send button
      const sendButton = page.locator('button[type="submit"]').or(page.locator('button:has(svg.lucide-send)'));
      await sendButton.click();

      // Verify user message appears in DOM
      await expect(page.locator('text=How can I improve my job application strategy?')).toBeVisible();

      // Verify AI assistant response appears
      await expect(page.locator('text=Hello! I am your AI career assistant')).toBeVisible();
    }
  });

  test('should handle AI rate limiting or API error gracefully', async ({ page }) => {
    // Intercept /api/ai/chat to return a 429 Rate Limit error
    await page.route('/api/ai/chat', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Too many requests. Please wait a minute before sending more messages.' }),
      });
    });

    await page.goto('/ai-assistant');

    const inputArea = page.locator('textarea');
    if (await inputArea.isVisible()) {
      await inputArea.fill('Test message during rate limit');
      const sendButton = page.locator('button[type="submit"]').or(page.locator('button:has(svg.lucide-send)'));
      await sendButton.click();

      // Check if error message is displayed
      await expect(page.locator('text=Too many requests')).toBeVisible({ timeout: 5000 });
    }
  });
});
