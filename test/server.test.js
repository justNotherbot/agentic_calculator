import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), 'calculator-history-'));
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const url = `http://127.0.0.1:${port}/api/history`;
  let server;

  async function start() {
    server = spawn(process.execPath, ['server.js'], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, PORT: String(port), HISTORY_FILE: join(directory, 'history.json') },
      stdio: 'ignore',
    });
    for (let attempt = 0; attempt < 100; attempt++) {
      try { await fetch(url); return; } catch { await new Promise((resolve) => setTimeout(resolve, 20)); }
    }
    throw new Error('Server did not start');
  }

  async function stop() {
    server.kill();
    await new Promise((resolve) => server.once('exit', resolve));
  }

  try { await start(); await run({ url, restart: async () => { await stop(); await start(); } }); } finally {
    if (server && server.exitCode === null) await stop();
    await rm(directory, { recursive: true, force: true });
  }
}

function request(url, body) {
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

test('GET history starts empty', () => withServer(async ({ url }) => {
  assert.deepEqual(await (await fetch(url)).json(), []);
}));

test('POST returns precise addition', () => withServer(async ({ url }) => {
  const response = await request(url, { id: '123e4567-e89b-42d3-a456-426614174000', first: '0.1', second: '0.2', operation: '+' });
  assert.equal(response.status, 201);
  const entry = await response.json();
  assert.equal(entry.result, '0.3');
  assert.equal(entry.expression, '0.1 + 0.2');
  assert.ok(entry.timestamp);
}));

test('supports subtraction and multiplication', () => withServer(async ({ url }) => {
  for (const [id, operation, expected] of [['123e4567-e89b-42d3-a456-426614174001', '-', '2'], ['123e4567-e89b-42d3-a456-426614174002', '*', '20']]) {
    const response = await request(url, { id, first: '5', second: operation === '-' ? '3' : '4', operation });
    assert.equal((await response.json()).result, expected);
  }
}));

test('supports division, power, and modulo', () => withServer(async ({ url }) => {
  const cases = [['123e4567-e89b-42d3-a456-426614174003', '/', '9', '3', '3'], ['123e4567-e89b-42d3-a456-426614174004', '^', '2', '3', '8'], ['123e4567-e89b-42d3-a456-426614174005', 'mod', '10', '3', '1']];
  for (const [id, operation, first, second, expected] of cases) {
    const response = await request(url, { id, first, second, operation });
    assert.equal((await response.json()).result, expected);
  }
}));

test('rejects malformed JSON', () => withServer(async ({ url }) => {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'Invalid JSON.');
}));

test('rejects an invalid request ID', () => withServer(async ({ url }) => {
  const response = await request(url, { id: 'not-a-uuid', first: '1', second: '2', operation: '+' });
  assert.equal(response.status, 400);
}));

test('rejects invalid numeric input and unknown operation', () => withServer(async ({ url }) => {
  const invalidNumber = await request(url, { id: '123e4567-e89b-42d3-a456-426614174006', first: 'NaN', second: '2', operation: '+' });
  const invalidOperation = await request(url, { id: '123e4567-e89b-42d3-a456-426614174007', first: '1', second: '2', operation: 'log' });
  assert.equal(invalidNumber.status, 400);
  assert.equal(invalidOperation.status, 400);
}));

test('rejects division and modulo by zero', () => withServer(async ({ url }) => {
  for (const [id, operation] of [['123e4567-e89b-42d3-a456-426614174008', '/'], ['123e4567-e89b-42d3-a456-426614174009', 'mod']]) {
    const response = await request(url, { id, first: '5', second: '0', operation });
    assert.equal(response.status, 422);
    assert.match((await response.json()).error, /divide by zero/);
  }
}));

test('serializes concurrent writes and returns newest first', () => withServer(async ({ url }) => {
  const first = request(url, { id: '123e4567-e89b-42d3-a456-426614174010', first: '1', second: '1', operation: '+' });
  const second = request(url, { id: '123e4567-e89b-42d3-a456-426614174011', first: '2', second: '2', operation: '+' });
  const responses = await Promise.all([first, second]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 201]);
  assert.deepEqual((await (await fetch(url)).json()).map((entry) => entry.result), ['4', '2']);
}));

test('same request ID is idempotent', () => withServer(async ({ url }) => {
  const body = { id: '123e4567-e89b-42d3-a456-426614174012', first: '0.1', second: '0.2', operation: '+' };
  assert.equal((await request(url, body)).status, 201);
  assert.equal((await request(url, body)).status, 200);
  assert.equal((await (await fetch(url)).json()).length, 1);
}));

test('history survives a server restart', () => withServer(async ({ url, restart }) => {
  await request(url, { id: '123e4567-e89b-42d3-a456-426614174013', first: '1.25', second: '4', operation: '*' });
  await restart();
  const saved = await (await fetch(url)).json();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].expression, '1.25 × 4');
  assert.equal(saved[0].result, '5');
}));

test('serves the application entry point', () => withServer(async ({ url }) => {
  const response = await fetch(url.replace('/api/history', '/'));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Decimal Calculator/);
}));

test('returns 404 for unknown paths', () => withServer(async ({ url }) => {
  const response = await fetch(url.replace('/api/history', '/missing'));
  assert.equal(response.status, 404);
}));
