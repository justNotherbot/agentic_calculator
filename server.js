import { createServer } from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Decimal from 'decimal.js';
import { createCalculator } from './calculator.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const dataFile = resolve(process.env.HISTORY_FILE || join(root, 'history.json'));
const port = Number(process.env.PORT || 8000);
const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': 'xʸ', mod: 'mod' };
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.fig': 'application/octet-stream' };
const publicFiles = new Set(['/index.html', '/main.js', '/calculator.js', '/style.css', '/mockup.html', '/mockup.css', '/agentic_calculator.fig']);
let history = [];
let writes = Promise.resolve();

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function saveHistory(entries) {
  const temp = `${dataFile}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(entries, null, 2));
  await rename(temp, dataFile);
  history = entries;
}

async function handlePost(request, response) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 8192) return json(response, 413, { error: 'Request is too large.' });
  }
  let body;
  try { body = JSON.parse(raw); } catch { return json(response, 400, { error: 'Invalid JSON.' }); }
  const { id, first, second, operation } = body || {};
  if (typeof id !== 'string' || !/^[a-f\d-]{36}$/i.test(id) ||
      typeof first !== 'string' || typeof second !== 'string' ||
      first.length > 200 || second.length > 200 ||
      !decimalPattern.test(first) || !decimalPattern.test(second) || !Object.hasOwn(symbols, operation)) {
    return json(response, 400, { error: 'Enter two valid decimal numbers and an operation.' });
  }
  const existing = history.find((entry) => entry.id === id);
  if (existing) return json(response, 200, existing);
  const calc = createCalculator(Decimal);
  calc.setOperand('previousOperand', first);
  calc.setOperand('currentOperand', second);
  calc.setOperation(operation);
  calc.compute();
  const state = calc.getState();
  if (state.errorState) return json(response, 422, { error: new Decimal(second).isZero() && (operation === '/' || operation === 'mod') ? 'Cannot divide by zero. Change the second number.' : 'This calculation has no valid result. Check your numbers.' });
  const entry = { id, timestamp: new Date().toISOString(), expression: `${first} ${symbols[operation]} ${second}`, result: state.currentOperand };
  try {
    await saveHistory([entry, ...history]);
    json(response, 201, entry);
  } catch (error) {
    console.error('Could not persist history:', error);
    json(response, 500, { error: 'Could not save calculation. Retry.' });
  }
}

async function start() {
  try {
    const saved = JSON.parse(await readFile(dataFile, 'utf8'));
    if (!Array.isArray(saved)) throw new Error('History must be an array');
    history = saved;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/api/history' && request.method === 'GET') return json(response, 200, history);
    if (path === '/api/history' && request.method === 'POST') {
      writes = writes.then(() => handlePost(request, response)).catch((error) => {
        console.error('History request failed:', error);
        if (!response.headersSent) json(response, 500, { error: 'Could not save calculation. Retry.' });
      });
      return;
    }
    const file = path === '/' ? '/index.html' : path;
    if (request.method !== 'GET' || !publicFiles.has(file)) return json(response, 404, { error: 'Not found.' });
    try {
      const content = await readFile(join(root, file));
      response.writeHead(200, { 'Content-Type': `${mime[extname(file)]}; charset=utf-8` });
      response.end(content);
    } catch {
      json(response, 404, { error: 'Not found.' });
    }
  });
  server.listen(port, () => console.log(`Calculator running at http://localhost:${port}/`));
}

start().catch((error) => { console.error('Could not load history:', error); process.exitCode = 1; });
