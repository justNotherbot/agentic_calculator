import { createCalculator } from './calculator.js';
import { historyStore } from './history.js';

const calc = createCalculator(Decimal);
const prevDisplay = document.getElementById('prev-display');
const mainDisplay = document.getElementById('main-display');
const saveStatus = document.getElementById('save-status');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const historyError = document.getElementById('history-error');
const clearHistory = document.getElementById('clear-history');
const keypad = document.querySelector('[aria-label="Calculator keypad"]');
let busy = false;
let retryEntry = null;

function display() {
  const state = calc.getState();
  prevDisplay.textContent = calc.prettyPrev();
  mainDisplay.textContent = state.errorState ? 'ERROR' : (state.currentOperand || '0');
  mainDisplay.scrollLeft = mainDisplay.scrollWidth;
}

function setBusy(value) {
  busy = value;
  keypad.classList.toggle('is-busy', value);
  keypad.querySelectorAll('button').forEach((button) => { button.disabled = value; });
  clearHistory.disabled = value;
  const retry = historyError.querySelector('button');
  if (retry) retry.disabled = value;
  saveStatus.textContent = value ? 'Saving…' : (retryEntry ? 'Not saved' : 'Ready');
}

function showError(message, retry = false) {
  historyError.replaceChildren();
  historyError.append(document.createTextNode(message));
  if (retry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Retry save';
    button.className = 'btn btn-ghost ml-2 rounded px-2 py-1 font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500';
    button.addEventListener('click', () => saveCalculation(retryEntry));
    historyError.append(button);
  }
  historyError.classList.remove('hidden');
}

function renderHistory(entries) {
  historyList.replaceChildren();
  historyEmpty.hidden = entries.length > 0;
  for (const entry of entries.slice().reverse()) {
    const item = document.createElement('li');
    item.className = 'card history-card';
    const time = document.createElement('time');
    time.dateTime = entry.timestamp;
    time.textContent = new Date(entry.timestamp).toLocaleString();
    const expression = document.createElement('div');
    expression.className = 'history-expression break-all';
    expression.textContent = entry.expression;
    const result = document.createElement('div');
    result.className = 'history-result break-all';
    result.textContent = `= ${entry.result}`;
    item.append(time, expression, result);
    historyList.append(item);
  }
}

async function loadHistory() {
  try {
    renderHistory(await historyStore.list());
    historyError.classList.add('hidden');
  } catch (_) {
    showError('Could not load history. Check browser storage settings and reload.');
  }
}

async function saveCalculation(entry) {
  if (busy || !entry) return;
  setBusy(true);
  historyError.classList.add('hidden');
  try {
    await historyStore.save(entry);
    retryEntry = null;
    try {
      renderHistory(await historyStore.list());
    } catch (_) {
      showError('Calculation saved, but history could not be refreshed. Reload the page to view it.');
    }
  } catch (_) {
    retryEntry = entry;
    showError('Could not save calculation. Your result remains on screen.', true);
  } finally {
    setBusy(false);
  }
}

function calculate() {
  if (busy) return;
  const before = calc.getState();
  if (!before.operation || !before.previousOperand || !before.currentOperand) {
    if (before.operation) showError('Enter the second number before calculating.');
    return;
  }
  calc.compute();
  const after = calc.getState();
  display();
  if (after.errorState) {
    showError('Invalid calculation. Check for division by zero or an invalid exponent, then press AC or enter a new number.');
    return;
  }
  saveCalculation({ expression: `${before.previousOperand} ${before.operation} ${before.currentOperand}`, result: after.currentOperand, timestamp: new Date().toISOString() });
}

function perform(action, value) {
  if (busy) return;
  const unary = ['sqrt', 'sin', 'cos', 'exp', 'log'].includes(action);
  const operand = unary ? calc.getState().currentOperand || calc.getState().previousOperand : null;
  switch (action) {
    case 'digit': calc.appendDigit(value); break;
    case 'dot': calc.appendDot(); break;
    case 'op': calc.chooseOperation(value); break;
    case 'mod': calc.chooseOperation('%'); break;
    case 'eq': calculate(); return;
    case 'ac': calc.clearAll(); break;
    case 'del': calc.backspace(); break;
    case 'pi': calc.insertPi(); break;
    case 'sqrt': calc.sqrtImmediate(); break;
    case 'sin': calc.applyUnarySin(); break;
    case 'cos': calc.applyUnaryCos(); break;
    case 'exp': calc.applyUnaryExp(); break;
    case 'log': calc.applyUnaryLog(); break;
    default: return;
  }
  if (calc.getState().errorState) showError('Invalid input. Press AC or a digit to start again.');
  else historyError.classList.add('hidden');
  display();
  if (unary && !calc.getState().errorState) {
    const label = { sqrt: '√', sin: 'sin', cos: 'cos', exp: 'exp', log: 'log₁₀' }[action];
    saveCalculation({ expression: `${label}(${operand})`, result: calc.getState().currentOperand, timestamp: new Date().toISOString() });
  }
}

keypad.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (button) perform(button.dataset.action, button.dataset.digit || button.dataset.op);
});

document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || busy) return;
  if (event.key === 'Enter' && event.target.closest('button')) return;
  let action;
  let value = event.key;
  if (/^[0-9]$/.test(value)) action = 'digit';
  else if (value === '.') action = 'dot';
  else if ('+-*/^%'.includes(value) && value.length === 1) action = 'op';
  else if (value === 'Enter' || value === '=') action = 'eq';
  else if (value === 'Backspace') action = 'del';
  else if (value === 'Escape') action = 'ac';
  else if (value.toLowerCase() === 'r' || value.toLowerCase() === 's') action = 'sqrt';
  else if (value.toLowerCase() === 'p') action = 'pi';
  else if (value.toLowerCase() === 'l') action = 'log';
  if (!action) return;
  event.preventDefault();
  perform(action, value);
});

clearHistory.addEventListener('click', async () => {
  if (busy) return;
  setBusy(true);
  try {
    await historyStore.clear();
    await loadHistory();
  } catch (_) {
    showError('Could not clear history. Please try again.');
  } finally {
    setBusy(false);
  }
});

display();
loadHistory();
