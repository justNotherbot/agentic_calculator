import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const decimalSource = await readFile(new URL('../../node_modules/decimal.js/decimal.js', import.meta.url), 'utf8');

const storageFixture = `
const fixture = window.__storageFixture;
export const historyStore = {
  list: async () => {
    if (fixture.listFails) throw new Error('Storage unavailable');
    return [...fixture.entries];
  },
  save: async (entry) => {
    fixture.attempts.push(entry);
    if (fixture.delay) await new Promise((resolve) => { fixture.release = resolve; });
    if (fixture.saveFails) throw new Error('Storage unavailable');
    fixture.entries.push(entry);
  },
  clear: async () => {
    if (fixture.clearFails) throw new Error('Storage unavailable');
    fixture.entries = [];
  },
};
`;

async function open(page, options = {}) {
  await page.addInitScript((initial) => {
    window.__storageFixture = { entries: initial.entries || [], attempts: [], delay: !!initial.delay, saveFails: !!initial.saveFails, listFails: !!initial.listFails, clearFails: !!initial.clearFails, release: null };
  }, options);
  await page.route('**/history.js', (route) => route.fulfill({ contentType: 'text/javascript', body: storageFixture }));
  await page.route('**/decimal.min.js', (route) => route.fulfill({ contentType: 'text/javascript', body: decimalSource }));
  await page.route(/https:\/\/(cdn\.tailwindcss\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome)/, (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#main-display')).toHaveText('0');
}

test('empty history and a complete precise calculation become visible', async ({ page }) => {
  await open(page);
  await expect(page.locator('#history-empty')).toBeVisible();
  await page.keyboard.type('0.1+0.2');
  await expect(page.locator('#prev-display')).toHaveText('0.1 +');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-display')).toHaveText('0.3');
  await expect(page.locator('#history-list li')).toHaveCount(1);
  await expect(page.locator('#history-list li')).toContainText('0.1 + 0.2');
  await expect(page.locator('#history-list li')).toContainText('= 0.3');
  await expect(page.locator('#history-list time')).toHaveAttribute('datetime', /\d{4}-\d{2}-\d{2}T/);
  await expect(page.locator('#history-empty')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__storageFixture.attempts.length)).toBe(1);
});

test('keypad operations and clearing history update visible results', async ({ page }) => {
  await open(page);
  await page.locator('[data-digit="1"]').click();
  await page.locator('[data-digit="7"]').click();
  await page.locator('[data-action="mod"]').click();
  await page.locator('[data-digit="5"]').click();
  await page.locator('[data-action="eq"]').click();
  await expect(page.locator('#main-display')).toHaveText('2');
  await expect(page.locator('#history-list li')).toContainText('17 % 5');
  await page.locator('#clear-history').click();
  await expect(page.locator('#history-empty')).toBeVisible();
  await expect(page.locator('#history-list li')).toHaveCount(0);
});

test('missing operand and invalid operations display actionable errors', async ({ page }) => {
  await open(page);
  await page.keyboard.type('5+');
  await page.keyboard.press('Enter');
  await expect(page.locator('#history-error')).toContainText('Enter the second number');
  await expect(page.locator('#history-list li')).toHaveCount(0);
  await page.keyboard.type('0');
  await page.locator('[data-action="ac"]').click();
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.type('5/0');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-display')).toHaveText('ERROR');
  await expect(page.locator('#history-error')).toContainText('Invalid calculation');
  await page.keyboard.type('8');
  await expect(page.locator('#main-display')).toHaveText('8');
  await expect(page.locator('#history-error')).toBeHidden();
  await page.locator('[data-action="ac"]').click();
  await page.locator('[data-action="log"]').click();
  await expect(page.locator('#main-display')).toHaveText('ERROR');
  await expect(page.locator('#history-list li')).toHaveCount(0);
});

test('pending save blocks double click and repeated Enter', async ({ page }) => {
  await open(page, { delay: true });
  await page.keyboard.type('1+2');
  await page.locator('[data-action="eq"]').click();
  await expect(page.locator('#save-status')).toHaveText('Saving…');
  await expect(page.locator('[data-action="eq"]')).toBeDisabled();
  await page.keyboard.press('Enter');
  await page.locator('[data-action="eq"]').dispatchEvent('click');
  expect(await page.evaluate(() => window.__storageFixture.attempts.length)).toBe(1);
  await page.evaluate(() => window.__storageFixture.release());
  await expect(page.locator('#history-list li')).toHaveCount(1);
  await expect(page.locator('#history-list li')).toContainText('= 3');
  expect(await page.evaluate(() => window.__storageFixture.attempts.length)).toBe(1);
});

test('failed save shows retry and does not lose the result', async ({ page }) => {
  await open(page, { saveFails: true });
  await page.keyboard.type('4+5');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-display')).toHaveText('9');
  await expect(page.locator('#history-error')).toContainText('Could not save calculation');
  await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible();
  await page.evaluate(() => { window.__storageFixture.saveFails = false; });
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.locator('#history-list li')).toContainText('4 + 5');
  await expect(page.locator('#history-error')).toBeHidden();
  expect(await page.evaluate(() => window.__storageFixture.attempts.length)).toBe(2);
});

test('loaded history is visible and newest first', async ({ page }) => {
  await open(page, { entries: [
    { timestamp: '2026-01-01T10:00:00.000Z', expression: '2 + 2', result: '4' },
    { timestamp: '2026-01-02T10:00:00.000Z', expression: '3 + 3', result: '6' },
  ] });
  await expect(page.locator('#history-list li')).toHaveCount(2);
  await expect(page.locator('#history-list li').first()).toContainText('3 + 3');
  await expect(page.locator('#history-list li').last()).toContainText('2 + 2');
});

test('storage load error is shown without hiding calculator', async ({ page }) => {
  await open(page, { listFails: true });
  await expect(page.locator('#history-error')).toContainText('Could not load history');
  await expect(page.locator('#main-display')).toHaveText('0');
});

test('real IndexedDB keeps a calculation after reload', async ({ page }) => {
  await page.route('**/decimal.min.js', (route) => route.fulfill({ contentType: 'text/javascript', body: decimalSource }));
  await page.route(/https:\/\/(cdn\.tailwindcss\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome)/, (route) => route.abort());
  await page.goto('/');
  await page.keyboard.type('0.1+0.2');
  await page.keyboard.press('Enter');
  await expect(page.locator('#history-list li')).toContainText('= 0.3');
  await page.reload();
  await expect(page.locator('#history-list li')).toContainText('0.1 + 0.2');
});

test('mobile keypad is usable with visible keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await open(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-action="ac"]')).toBeFocused();
  await expect(page.locator('[data-action="ac"]')).toHaveCSS('outline-style', 'solid');
  await page.locator('[data-digit="7"]').click();
  await expect(page.locator('#main-display')).toHaveText('7');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('backspace, decimal point, and AC edit the displayed operand', async ({ page }) => {
  await open(page);
  await page.locator('[data-digit="1"]').click();
  await page.locator('[data-action="dot"]').click();
  await page.locator('[data-action="dot"]').click();
  await page.locator('[data-digit="2"]').click();
  await expect(page.locator('#main-display')).toHaveText('1.2');
  await page.locator('[data-action="del"]').click();
  await expect(page.locator('#main-display')).toHaveText('1.');
  await page.locator('[data-action="ac"]').click();
  await expect(page.locator('#main-display')).toHaveText('0');
  await expect(page.locator('#prev-display')).toBeEmpty();
  await expect(page.locator('#history-list li')).toHaveCount(0);
});

test('a chained operation and subtraction show the final value and history', async ({ page }) => {
  await open(page);
  await page.keyboard.type('8+2*3');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-display')).toHaveText('30');
  await expect(page.locator('#history-list li')).toContainText('10 * 3');
  await page.keyboard.press('Escape');
  await page.keyboard.type('5-1');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-display')).toHaveText('4');
  await expect(page.locator('#history-list li').first()).toContainText('5 - 1');
  await expect(page.locator('#history-list li')).toHaveCount(2);
});

test('logarithm button saves its operand and precise result', async ({ page }) => {
  await open(page);
  await page.keyboard.type('100');
  await page.locator('[data-action="log"]').click();
  await expect(page.locator('#main-display')).toHaveText('2');
  await expect(page.locator('#history-list li')).toContainText('log₁₀(100)');
  await expect(page.locator('#history-list li')).toContainText('= 2');
  expect(await page.evaluate(() => window.__storageFixture.attempts.length)).toBe(1);
});

test('square root button saves a result; negative input shows ERROR without saving', async ({ page }) => {
  await open(page);
  await page.locator('[data-digit="9"]').click();
  await page.locator('[data-action="sqrt"]').click();
  await expect(page.locator('#history-list li')).toContainText('√(9)');
  await expect(page.locator('#main-display')).toHaveText('3');
  await page.locator('[data-action="ac"]').click();
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.type('0-9');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-display')).toHaveText('-9');
  await page.locator('[data-action="sqrt"]').click();
  await expect(page.locator('#main-display')).toHaveText('ERROR');
  await expect(page.locator('#history-error')).toContainText('Invalid input');
  await expect(page.locator('#history-list li')).toHaveCount(2);
});

test('modulo by zero does not save and AC recovers', async ({ page }) => {
  await open(page);
  await page.keyboard.type('7%0');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-display')).toHaveText('ERROR');
  await expect(page.locator('#history-error')).toContainText('Invalid calculation');
  await expect(page.locator('#history-list li')).toHaveCount(0);
  expect(await page.evaluate(() => window.__storageFixture.attempts.length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#main-display')).toHaveText('0');
  await expect(page.locator('#history-error')).toBeHidden();
});

test('clearing history failure keeps old rows and gives feedback', async ({ page }) => {
  await open(page, { clearFails: true, entries: [
    { timestamp: '2026-01-01T10:00:00.000Z', expression: '2 + 2', result: '4' },
  ] });
  await expect(page.locator('#history-list li')).toHaveCount(1);
  await page.locator('#clear-history').click();
  await expect(page.locator('#history-error')).toContainText('Could not clear history');
  await expect(page.locator('#history-list li')).toContainText('2 + 2');
  await expect(page.locator('#clear-history')).toBeEnabled();
});

test('a committed save with failed history refresh does not offer duplicate retry', async ({ page }) => {
  await open(page);
  await page.keyboard.type('2+3');
  await page.evaluate(() => { window.__storageFixture.listFails = true; });
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-display')).toHaveText('5');
  await expect(page.locator('#history-error')).toContainText('Calculation saved, but history could not be refreshed');
  await expect(page.getByRole('button', { name: 'Retry save' })).toHaveCount(0);
  expect(await page.evaluate(() => window.__storageFixture.attempts.length)).toBe(1);
});

test('pending save rejects digit input and clear-history attempts', async ({ page }) => {
  await open(page, { delay: true });
  await page.keyboard.type('6+1');
  await page.keyboard.press('Enter');
  await expect(page.locator('#save-status')).toHaveText('Saving…');
  await expect(page.locator('#clear-history')).toBeDisabled();
  await page.keyboard.type('9');
  await page.locator('#clear-history').dispatchEvent('click');
  await expect(page.locator('#main-display')).toHaveText('7');
  await page.evaluate(() => window.__storageFixture.release());
  await expect(page.locator('#history-list li')).toContainText('6 + 1');
  await expect(page.locator('#clear-history')).toBeEnabled();
});

test('long precision result remains horizontally scrollable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await open(page);
  await page.keyboard.type('1/7');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-display')).toContainText('0.142857');
  await expect(page.locator('#history-list li')).toContainText('1 / 7');
  const display = page.locator('#main-display');
  expect(await display.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
});
