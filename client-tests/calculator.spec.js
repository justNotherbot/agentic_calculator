import { test, expect } from '@playwright/test';

const timestamp = '2026-11-20T10:42:08.000Z';
const saved = { id: '123e4567-e89b-42d3-a456-426614174000', timestamp, expression: '0.1 + 0.2', result: '0.3' };

async function mockHistory(page, entries = []) {
  await page.route('**/api/history', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: entries });
    return route.fulfill({ status: 201, json: saved });
  });
}

test('empty history and labeled calculator are visible on load', async ({ page }) => {
  await mockHistory(page);
  await page.goto('/');
  await expect(page.getByLabel('First number')).toHaveValue('0.1');
  await expect(page.getByLabel('Second number')).toHaveValue('0.2');
  await expect(page.getByText('No calculations yet')).toBeVisible();
  await expect(page.locator('#history-count')).toHaveText('0');
});

test('loaded history shows server entries newest first', async ({ page }) => {
  const newer = { ...saved, id: '123e4567-e89b-42d3-a456-426614174001', expression: '1.25 × 4', result: '5' };
  await mockHistory(page, [newer, saved]);
  await page.goto('/');
  await expect(page.locator('#history-count')).toHaveText('2');
  await expect(page.locator('#history-content li').first()).toContainText('1.25 × 4');
  await expect(page.locator('#history-content li').last()).toContainText('= 0.3');
});

test('entering an expression submits it and shows the exact result in history', async ({ page }) => {
  const requests = [];
  await page.route('**/api/history', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: [] });
    requests.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: saved });
  });
  await page.goto('/');
  await page.getByLabel('First number').fill('0.1');
  await page.getByLabel('Second number').fill('0.2');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('#main-display')).toHaveText('0.3');
  await expect(page.locator('#feedback')).toContainText('saved to your history');
  await expect(page.locator('#history-content li')).toContainText('0.1 + 0.2');
  await expect(page.locator('#history-content li')).toContainText('= 0.3');
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ first: '0.1', second: '0.2', operation: '+' });
});

test('keypad edits the focused field and Enter calculates', async ({ page }) => {
  await mockHistory(page);
  await page.goto('/');
  await page.getByLabel('Second number').fill('0.');
  await page.locator('[data-digit="2"]').click();
  await expect(page.getByLabel('Second number')).toHaveValue('0.2');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-display')).toHaveText('0.3');
});

test('keyboard focus has a visible outline', async ({ page }) => {
  await mockHistory(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Calculate' }).focus();
  const outline = await page.getByRole('button', { name: 'Calculate' }).evaluate((button) => {
    const styles = getComputedStyle(button);
    return { width: styles.outlineWidth, style: styles.outlineStyle, color: styles.outlineColor };
  });
  expect(outline.width).not.toBe('0px');
  expect(outline.style).toBe('solid');
});

test('missing second number is highlighted and not submitted', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/history', (route) => {
    if (route.request().method() === 'POST') posts++;
    return route.fulfill({ json: [] });
  });
  await page.goto('/');
  await page.getByLabel('Second number').fill('');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('#feedback')).toContainText('Enter both numbers');
  await expect(page.getByLabel('Second number')).toHaveAttribute('aria-invalid', 'true');
  expect(posts).toBe(0);
});

test('invalid decimal is rejected and can be corrected', async ({ page }) => {
  await mockHistory(page);
  await page.goto('/');
  await page.getByLabel('First number').fill('not a number');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('#feedback')).toContainText('valid decimal numbers');
  await expect(page.getByLabel('First number')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('First number').fill('0.1');
  await expect(page.getByLabel('First number')).not.toHaveAttribute('aria-invalid');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('#main-display')).toHaveText('0.3');
});

test('delayed response disables inputs and repeated Enter makes only one request', async ({ page }) => {
  let posts = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/api/history', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: [] });
    posts++;
    await gate;
    return route.fulfill({ status: 201, json: saved });
  });
  await page.goto('/');
  try {
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('#feedback')).toContainText('Calculating and saving');
    await expect(page.getByRole('button', { name: 'Calculating…' })).toBeDisabled();
    await expect(page.getByLabel('First number')).toBeDisabled();
    await expect.poll(() => posts).toBe(1);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    expect(posts).toBe(1);
  } finally { release(); }
  await expect(page.locator('#history-count')).toHaveText('1');
  expect(posts).toBe(1);
});

test('server error keeps the input and retry reuses the same request ID', async ({ page }) => {
  const requests = [];
  await page.route('**/api/history', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: [] });
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) return route.fulfill({ status: 500, json: { error: 'Could not save calculation. Retry.' } });
    return route.fulfill({ status: 201, json: { ...saved, id: requests[0].id } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('#feedback')).toContainText('Could not save');
  await expect(page.getByLabel('Second number')).toHaveValue('0.2');
  await expect(page.getByRole('button', { name: 'Retry calculation' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry calculation' }).click();
  await expect(page.locator('#main-display')).toHaveText('0.3');
  expect(requests).toHaveLength(2);
  expect(requests[1].id).toBe(requests[0].id);
});

test('server math error displays ERROR without adding history', async ({ page }) => {
  await page.route('**/api/history', (route) => route.request().method() === 'GET'
    ? route.fulfill({ json: [] })
    : route.fulfill({ status: 422, json: { error: 'Cannot divide by zero. Change the second number.' } }));
  await page.goto('/');
  await page.getByLabel('Operation').selectOption('/');
  await page.getByLabel('Second number').fill('0');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('#main-display')).toHaveText('ERROR');
  await expect(page.locator('#feedback')).toContainText('Cannot divide by zero');
  await expect(page.locator('#history-count')).toHaveText('0');
});

test('history load failure shows a visible recovery message', async ({ page }) => {
  await page.route('**/api/history', (route) => route.fulfill({ status: 500, json: { error: 'Unavailable' } }));
  await page.goto('/');
  await expect(page.locator('#history-content')).toContainText('Could not load history. Refresh to retry.');
});

test('narrow screen keeps the calculator and history accessible', async ({ page }) => {
  await page.setViewportSize({ width: 342, height: 850 });
  await mockHistory(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Calculate' })).toBeVisible();
  await expect(page.getByText('No calculations yet')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('real API persists a completed calculation after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('First number').fill('0.1');
  await page.getByLabel('Second number').fill('0.2');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('#main-display')).toHaveText('0.3');
  await expect(page.locator('#history-content li').first()).toContainText('0.1 + 0.2');
  await page.reload();
  await expect(page.locator('#history-content li').first()).toContainText('= 0.3');
});

test('Escape clears fields while preserving loaded history', async ({ page }) => {
  await mockHistory(page, [saved]);
  await page.goto('/');
  await expect(page.locator('#history-count')).toHaveText('1');
  await page.getByLabel('First number').focus();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('First number')).toHaveValue('');
  await expect(page.getByLabel('Second number')).toHaveValue('');
  await expect(page.locator('#history-content li')).toContainText('= 0.3');
});

test('captures the main scenario states', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 950 });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let posts = 0;
  await page.route('**/api/history', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: [] });
    posts++;
    if (posts === 1) {
      await gate;
      return route.continue();
    }
    return route.fulfill({ status: 500, json: { error: 'Could not save calculation. Retry.' } });
  });
  await page.goto('/');
  await expect(page.getByText('No calculations yet')).toBeVisible();
  await page.screenshot({ path: 'evidence/empty.png' });

  try {
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('#feedback')).toContainText('Calculating and saving');
    await expect(page.getByRole('button', { name: 'Calculating…' })).toBeDisabled();
    await page.screenshot({ path: 'evidence/loading.png' });
  } finally { release(); }
  await expect(page.locator('#main-display')).toHaveText('0.3');
  await expect(page.locator('#history-content li')).toContainText('= 0.3');
  await page.screenshot({ path: 'evidence/success.png' });

  await page.getByLabel('First number').fill('1');
  await page.getByLabel('Second number').fill('2');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('#feedback')).toContainText('Could not save calculation');
  await expect(page.getByRole('button', { name: 'Retry calculation' })).toBeVisible();
  await expect(page.getByLabel('Second number')).toHaveValue('2');
  await page.screenshot({ path: 'evidence/error.png' });
});
