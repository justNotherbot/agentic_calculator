import { createCalculator } from './calculator.js';

const calculator = createCalculator(window.Decimal);
const first = document.getElementById('first-number');
const second = document.getElementById('second-number');
const operation = document.getElementById('operation');
const display = document.getElementById('main-display');
const resultLabel = document.getElementById('result-label');
const feedback = document.getElementById('feedback');
const calculateButton = document.getElementById('calculate');
const hint = document.getElementById('hint');
const historyContent = document.getElementById('history-content');
const historyCount = document.getElementById('history-count');
const keypad = document.getElementById('keypad');
const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
let history = [];
let pending = false;
let retry = false;
let activeInput = second;
let requestId = null;

function message(text, kind = 'neutral') {
  feedback.textContent = text;
  feedback.className = `flex min-h-9 items-center text-xs ${kind === 'error' ? 'text-red-700' : kind === 'success' ? 'text-emerald-700' : 'text-slate-500'}`;
}

function showHistory() {
  historyCount.textContent = String(history.length);
  historyContent.replaceChildren();
  if (!history.length) {
    const empty = document.createElement('div');
    empty.className = 'rounded-md bg-slate-100 px-3 py-5 text-center';
    const title = document.createElement('strong');
    title.className = 'text-[13px]';
    title.textContent = 'No calculations yet';
    const description = document.createElement('p');
    description.className = 'mt-2 text-xs text-slate-500';
    description.textContent = 'Your completed calculations will appear here with their timestamps.';
    empty.append(title, description);
    historyContent.append(empty);
    return;
  }
  const list = document.createElement('ol');
  list.className = 'grid gap-3';
  for (const entry of history) {
    const item = document.createElement('li');
    item.className = 'card history-entry';
    const time = document.createElement('time');
    time.className = 'text-[11px] text-slate-500';
    time.dateTime = entry.timestamp;
    time.textContent = new Date(entry.timestamp).toLocaleString();
    const expression = document.createElement('span');
    expression.className = 'text-[13px]';
    expression.textContent = entry.expression;
    const result = document.createElement('strong');
    result.textContent = `= ${entry.result}`;
    item.append(time, expression, result);
    list.append(item);
  }
  historyContent.append(list);
}

function setPending(value) {
  pending = value;
  calculateButton.disabled = value;
  for (const field of [first, second, operation]) field.disabled = value;
  for (const button of keypad.querySelectorAll('button')) button.disabled = value;
  calculateButton.textContent = value ? 'Calculating…' : retry ? 'Retry calculation' : 'Calculate';
  hint.textContent = value ? 'Submission disabled until complete' : 'Enter to calculate · Backspace to edit';
}

function edit() {
  retry = false;
  requestId = null;
  calculateButton.textContent = 'Calculate';
  first.removeAttribute('aria-invalid');
  second.removeAttribute('aria-invalid');
  message('Choose an operation, then calculate.');
  resultLabel.textContent = 'DISPLAY';
  display.textContent = '0';
}

function validate() {
  let invalid = false;
  for (const field of [first, second]) {
    const value = field.value.trim();
    if (!decimalPattern.test(value) || !new window.Decimal(value).isFinite()) {
      field.setAttribute('aria-invalid', 'true');
      invalid = true;
    } else {
      field.removeAttribute('aria-invalid');
    }
  }
  if (invalid) {
    message(!first.value.trim() || !second.value.trim()
      ? 'Enter both numbers to continue.' : 'Enter valid decimal numbers to continue.', 'error');
    display.textContent = '—';
    resultLabel.textContent = 'DISPLAY';
  }
  return !invalid;
}

async function submit() {
  if (pending || !validate()) return;
  const a = first.value.trim();
  const b = second.value.trim();
  const op = operation.value;
  requestId ||= crypto.randomUUID();
  retry = false;
  setPending(true);
  resultLabel.textContent = 'SUBMITTING';
  display.textContent = '…';
  message('Calculating and saving. Please wait.');
  let canRetry = true;
  try {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: requestId, first: a, second: b, operation: op }),
    });
    const entry = await response.json();
    if (!response.ok) {
      if (response.status < 500) {
        requestId = null;
        canRetry = false;
      }
      if (response.status === 422) display.textContent = 'ERROR';
      throw new Error(entry.error || 'Could not save calculation. Retry.');
    }
    requestId = null;
    if (!history.some((item) => item.id === entry.id)) history.unshift(entry);
    showHistory();
    resultLabel.textContent = 'EXACT RESULT';
    display.textContent = entry.result;
    display.scrollLeft = display.scrollWidth;
    message('Calculation saved to your history.', 'success');
  } catch (error) {
    retry = canRetry;
    resultLabel.textContent = 'DISPLAY';
    if (display.textContent !== 'ERROR') display.textContent = '—';
    message(error.message === 'Failed to fetch' ? 'Couldn’t reach the server. Check the connection and retry.' : error.message, 'error');
  } finally {
    setPending(false);
  }
}

function inputKey(button) {
  if (pending) return;
  const action = button.dataset.action;
  const digit = button.dataset.digit;
  const op = button.dataset.op;
  if (action === 'ac') {
    first.value = '';
    second.value = '';
    operation.value = '+';
    calculator.clearAll();
    edit();
    return;
  }
  if (op || action === 'power' || action === 'mod') {
    operation.value = op || (action === 'power' ? '^' : 'mod');
    edit();
    return;
  }
  const field = activeInput;
  if (digit || action === 'dot') {
    field.value += digit || '.';
  } else if (action === 'pi') {
    calculator.insertPi();
    field.value = calculator.getState().currentOperand;
  } else if (['sqrt', 'sin', 'cos', 'exp'].includes(action)) {
    if (!decimalPattern.test(field.value.trim())) {
      field.setAttribute('aria-invalid', 'true');
      message('Enter a valid number before using a function.', 'error');
      return;
    }
    calculator.setOperand('currentOperand', field.value.trim());
    ({ sqrt: calculator.sqrtImmediate, sin: calculator.applyUnarySin, cos: calculator.applyUnaryCos, exp: calculator.applyUnaryExp })[action]();
    const result = calculator.getState();
    field.value = result.errorState ? field.value : result.currentOperand;
    if (result.errorState) {
      display.textContent = 'ERROR';
      message('This function has no valid result for that number.', 'error');
      return;
    }
  }
  edit();
  field.focus();
}

keypad.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button) inputKey(button);
});
calculateButton.addEventListener('click', submit);
for (const field of [first, second]) {
  field.addEventListener('focus', () => { activeInput = field; });
  field.addEventListener('input', edit);
}
operation.addEventListener('change', edit);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    submit();
  } else if (event.key === 'Escape' && !pending) {
    inputKey({ dataset: { action: 'ac' } });
  }
});

async function loadHistory() {
  historyContent.textContent = 'Loading history…';
  try {
    const response = await fetch('/api/history');
    if (!response.ok) throw new Error('Could not load history. Refresh to retry.');
    history = await response.json();
    showHistory();
  } catch {
    historyContent.textContent = 'Could not load history. Refresh to retry.';
  }
}
loadHistory();
