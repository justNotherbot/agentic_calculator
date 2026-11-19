import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const decimalSource = await readFile(new URL('../../node_modules/decimal.js/decimal.js', import.meta.url), 'utf8');

test('desktop and mobile layouts and scenario evidence with CDN styles', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route('**/decimal.min.js', (route) => route.fulfill({ contentType: 'text/javascript', body: decimalSource }));
  const failedResources = [];
  page.on('requestfailed', (request) => failedResources.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.goto('/');
  await expect(page.locator('#history-empty')).toBeVisible();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('main')).gridTemplateColumns.split(' ').length)).toBe(2);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('[data-action="eq"]')).backgroundColor)).toBe('rgb(79, 70, 229)');
  await page.screenshot({ path: 'evidence/desktop-empty.png', fullPage: true });
  await page.keyboard.type('0.1+0.2');
  await page.keyboard.press('Enter');
  await expect(page.locator('#history-list li')).toContainText('= 0.3');
  await page.screenshot({ path: 'evidence/desktop-success.png', fullPage: true });
  await page.setViewportSize({ width: 360, height: 740 });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('main')).gridTemplateColumns.split(' ').length)).toBe(1);
  await page.screenshot({ path: 'evidence/mobile-success.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const button of await page.locator('.key, #clear-history').all()) {
    const box = await button.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(361);
    expect(box.height).toBeGreaterThanOrEqual(40);
  }
  expect(failedResources).toEqual([]);
});

test('pending and error evidence with controlled save outcomes and CDN styles', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route('**/decimal.min.js', (route) => route.fulfill({ contentType: 'text/javascript', body: decimalSource }));
  await page.addInitScript(() => {
    window.__visualStore = { release: null, fails: false };
  });
  await page.route('**/history.js', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    export const historyStore = {
      list: async () => [],
      save: async () => {
        await new Promise((resolve) => { window.__visualStore.release = resolve; });
        if (window.__visualStore.fails) throw new Error('Storage unavailable');
      },
      clear: async () => {},
    };
  ` }));
  await page.goto('/');
  await page.keyboard.type('0.1+0.2');
  await page.keyboard.press('Enter');
  await expect(page.locator('#save-status')).toHaveText('Saving…');
  await expect(page.locator('[data-action="eq"]')).toBeDisabled();
  await page.screenshot({ path: 'evidence/desktop-pending.png', fullPage: true });
  await page.evaluate(() => { window.__visualStore.fails = true; window.__visualStore.release(); });
  await expect(page.locator('#history-error')).toContainText('Could not save calculation');
  await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible();
  await page.screenshot({ path: 'evidence/desktop-error.png', fullPage: true });
  await page.setViewportSize({ width: 360, height: 740 });
  await page.screenshot({ path: 'evidence/mobile-error.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
