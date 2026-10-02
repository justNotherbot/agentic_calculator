// Precision GUI Calculator using decimal.js for all arithmetic
// State: previousOperand (string), currentOperand (string), operation (string|null)
// Error handling: display 'Error' and lock until AC or first digit (as per UX choice below)

// Configure Decimal global context
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -12, toExpPos: 20 });

const prevDisplay = document.getElementById('prev-display');
const mainDisplay = document.getElementById('main-display');

let previousOperand = '';
let currentOperand = '0';
let operation = null; // '+', '-', '*', '/', '^'
let lastEquals = null; // stores last second operand for repeated '='
let errorState = false;

function updateDisplays() {
  prevDisplay.textContent = formatPrevLine();
  mainDisplay.textContent = formatMainDisplay();
  // Keep view anchored to the right; user can scroll left to see more digits
  mainDisplay.scrollLeft = mainDisplay.scrollWidth;
}

function formatPrevLine() {
  if (errorState) return '';
  if (!operation) return previousOperand ? `${pretty(previousOperand)}` : '';
  return `${pretty(previousOperand)} ${opSymbol(operation)}`;
}

function formatMainDisplay() {
  if (errorState) return 'ERROR';
  return pretty(currentOperand);
}

function pretty(s) {
  // Render full precision string (scrollable display reveals overflow)
  if (s === '' || s === '.') s = '0';
  try {
    const d = new Decimal(s);
    return d.toString();
  } catch (e) {
    return s;
  }
}

function clearAll() {
  previousOperand = '';
  currentOperand = '0';
  operation = null;
  lastEquals = null;
  errorState = false;
}

function clearEntry() {
  if (errorState) return; // CE does nothing in error; AC required
  currentOperand = '0';
}

function backspace() {
  if (errorState) return; // ignore while in error
  if (currentOperand.length <= 1) {
    currentOperand = '0';
  } else {
    currentOperand = currentOperand.slice(0, -1);
    if (currentOperand === '-' || currentOperand === '') currentOperand = '0';
  }
}

function appendDigit(d) {
  if (errorState) {
    // First digit press clears and starts fresh
    clearAll();
  }
  if (currentOperand === '0') {
    currentOperand = d;
  } else {
    currentOperand += d;
  }
}

function appendDot() {
  if (errorState) return; // ignore until cleared
  if (!currentOperand.includes('.')) {
    currentOperand += currentOperand === '' ? '0.' : '.';
  }
}

function chooseOperation(op) {
  if (errorState) return;
  if (operation && previousOperand !== '' && currentOperand !== '') {
    // compute pending then set new op
    compute();
  }
  if (currentOperand === '') return;
  previousOperand = currentOperand;
  currentOperand = '';
  operation = op;
  lastEquals = null;
}

function compute() {
  if (errorState) return;
  if (!operation) return;
  if (previousOperand === '') return;
  // if no current operand, use previous lastEquals for repeat, or repeat op with previousOperand as second? We'll default to use previousOperand if lastEquals present
  let a = new Decimal(previousOperand);
  let b;
  if (currentOperand === '') {
    if (lastEquals != null) {
      b = new Decimal(lastEquals);
    } else {
      // repeat using same b = previousOperand (acts like doing op with itself)
      b = new Decimal(previousOperand);
    }
  } else {
    b = new Decimal(currentOperand);
    lastEquals = b.toString();
  }

  let result;
  try {
    switch (operation) {
      case '+':
        result = a.plus(b);
        break;
      case '-':
        result = a.minus(b);
        break;
      case '*':
        result = a.times(b);
        break;
      case '/':
        if (b.isZero()) return setError();
        result = a.dividedBy(b);
        break;
      case '^':
        // Decimal.pow supports arbitrary exponents; invalid cases may throw
        result = Decimal.pow(a, b);
        break;
      default:
        return;
    }
  } catch (e) {
    return setError();
  }
  if (!result.isFinite()) return setError();
  previousOperand = '';
  operation = null;
  currentOperand = result.toString();
}

function sqrtImmediate() {
  if (errorState) return;
  // Apply to current if present, else to previous/current display value
  let targetStr = currentOperand !== '' ? currentOperand : (previousOperand !== '' ? previousOperand : currentOperand);
  try {
    const x = new Decimal(targetStr);
    if (x.isNegative()) return setError();
    const y = x.sqrt();
    currentOperand = y.toString();
    previousOperand = '';
    operation = null;
  } catch (e) {
    setError();
  }
}

function applyUnary(fn) {
  if (errorState) return;
  const targetStr = currentOperand !== '' ? currentOperand : (previousOperand !== '' ? previousOperand : currentOperand);
  try {
    const x = new Decimal(targetStr);
    const y = fn(x);
    if (!y.isFinite()) return setError();
    currentOperand = y.toString();
    previousOperand = '';
    operation = null;
    lastEquals = null;
  } catch (e) {
    setError();
  }
}

// High-precision constants
const PI = new Decimal('3.1415926535897932384626433832795028841971');
const TWO_PI = PI.times(2);

function insertPi() {
  if (errorState) clearAll();
  currentOperand = PI.toString();
}

function reduceToPiRange(x) {
  // Reduce x to [-pi, pi]
  if (x.isZero()) return x;
  const k = x.div(TWO_PI).floor();
  let r = x.minus(k.times(TWO_PI));
  if (r.gt(PI)) r = r.minus(TWO_PI);
  if (r.lt(PI.neg())) r = r.plus(TWO_PI);
  return r;
}

function decExp(x) {
  // exp series: sum_{n=0..∞} x^n / n!
  const threshold = new Decimal('1e-34');
  let sum = new Decimal(1);
  let term = new Decimal(1);
  for (let n = 1; n <= 200; n++) {
    term = term.times(x).div(n);
    sum = sum.plus(term);
    if (term.abs().lt(threshold)) break;
  }
  return sum;
}

function decSin(x) {
  // Reduce argument to improve convergence
  const xr = reduceToPiRange(x);
  const threshold = new Decimal('1e-34');
  let sum = xr;
  let term = xr;
  const x2 = xr.times(xr);
  for (let k = 1; k <= 200; k++) {
    const denom = new Decimal(2 * k).times(2 * k + 1);
    term = term.times(x2).div(denom).neg();
    sum = sum.plus(term);
    if (term.abs().lt(threshold)) break;
  }
  return sum;
}

function decCos(x) {
  const xr = reduceToPiRange(x);
  const threshold = new Decimal('1e-34');
  let sum = new Decimal(1);
  let term = new Decimal(1);
  const x2 = xr.times(xr);
  for (let k = 1; k <= 200; k++) {
    const denom = new Decimal(2 * k - 1).times(2 * k);
    term = term.times(x2).div(denom).neg();
    sum = sum.plus(term);
    if (term.abs().lt(threshold)) break;
  }
  return sum;
}

function setError() {
  errorState = true;
  currentOperand = 'ERROR';
  previousOperand = '';
  operation = null;
}

function opSymbol(op) {
  return op === '/' ? '÷' : op === '*' ? '×' : op;
}

// Event delegation for buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.action;
  switch (action) {
    case 'digit':
      appendDigit(btn.dataset.digit);
      break;
    case 'dot':
      appendDot();
      break;
    case 'op':
      chooseOperation(btn.dataset.op);
      break;
    case 'eq':
      compute();
      break;
    case 'ac':
      clearAll();
      break;
    case 'del':
      backspace();
      break;
    case 'sqrt':
      sqrtImmediate();
      break;
    case 'pi':
      insertPi();
      break;
    case 'sin':
      applyUnary((x) => decSin(x));
      break;
    case 'cos':
      applyUnary((x) => decCos(x));
      break;
    case 'exp':
      applyUnary((x) => decExp(x));
      break;
  }
  updateDisplays();
});

// Keyboard support
document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') {
    appendDigit(e.key);
  } else if (e.key === '.') {
    appendDot();
  } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/' || e.key === '^') {
    chooseOperation(e.key);
  } else if (e.key === 'Enter' || e.key === '=') {
    e.preventDefault();
    compute();
  } else if (e.key === 'Backspace') {
    backspace();
  } else if (e.key === 'Escape') {
    clearAll();
  } else if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 's') { // sqrt shortcut
    sqrtImmediate();
  } else if (e.key.toLowerCase() === 'p') {
    insertPi();
  }
  updateDisplays();
});

// Initialize
updateDisplays();

// Tap/click zones to scroll like Pixel calculator: left half scrolls left, right half scrolls right
// Also support press-and-hold auto-scroll
(function setupTapScrollZones() {
  let scrolling = false;
  let dir = 0; // -1 left, +1 right
  let rafId = null;
  const step = () => {
    if (!scrolling) return;
    mainDisplay.scrollLeft += dir * 12; // pixels per frame
    rafId = requestAnimationFrame(step);
  };

  const start = (event) => {
    const rect = mainDisplay.getBoundingClientRect();
    const x = (event.touches ? event.touches[0].clientX : event.clientX) - rect.left;
    dir = x < rect.width / 2 ? -1 : 1;
    scrolling = true;
    if (!rafId) rafId = requestAnimationFrame(step);
  };
  const stop = () => {
    scrolling = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  };

  mainDisplay.addEventListener('mousedown', start);
  mainDisplay.addEventListener('touchstart', start, { passive: true });
  window.addEventListener('mouseup', stop);
  window.addEventListener('touchend', stop);
})();
