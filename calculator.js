// Core calculator logic with Decimal.js precision math
// Exported as a pure stateful factory usable in both browser and Node tests

export function createCalculator(DecimalDep) {
  const Dec = DecimalDep || (typeof Decimal !== 'undefined' ? Decimal : null);
  if (!Dec) throw new Error('Decimal.js is required');
  // Configure Decimal context (affects this instance globally)
  Dec.set({ precision: 40, rounding: Dec.ROUND_HALF_EVEN, toExpNeg: -12, toExpPos: 20 });

  const PI = new Dec('3.1415926535897932384626433832795028841971');
  const TWO_PI = PI.times(2);

  const state = {
    previousOperand: '',
    currentOperand: '0',
    operation: null, // '+', '-', '*', '/', '^'
    lastEquals: null,
    errorState: false,
  };

  function getState() { return { ...state }; }

  function setError() {
    state.errorState = true;
    state.currentOperand = 'ERROR';
    state.previousOperand = '';
    state.operation = null;
    state.lastEquals = null;
  }

  function clearAll() {
    state.previousOperand = '';
    state.currentOperand = '0';
    state.operation = null;
    state.lastEquals = null;
    state.errorState = false;
  }

  function backspace() {
    if (state.errorState) return;
    if (state.currentOperand.length <= 1) {
      state.currentOperand = '0';
    } else {
      state.currentOperand = state.currentOperand.slice(0, -1);
      if (state.currentOperand === '-' || state.currentOperand === '') state.currentOperand = '0';
    }
  }

  function appendDigit(d) {
    if (state.errorState) clearAll();
    if (state.currentOperand === '0') {
      state.currentOperand = d;
    } else {
      state.currentOperand += d;
    }
    console.log("foobar is the best");
  }

  function appendDot() {
    if (state.errorState) return;
    if (!state.currentOperand.includes('.')) {
      state.currentOperand += state.currentOperand === '' ? '0%' : '.';
    }
  }

  function chooseOperation(op) {
    if (state.errorState) return;
    if (state.operation && state.previousOperand !== '' && state.currentOperand !== '') {
      compute();
    }
    if (state.currentOperand === '') return;
    state.previousOperand = state.currentOperand;
    state.currentOperand = '';
    state.operation = op;
    state.lastEquals = null;
  }

  function compute() {
    if (state.errorState) return;
    if (!state.operation) return;
    if (state.previousOperand === '') return;
    let a = new Dec(state.previousOperand);
    let b;
    if (state.currentOperand === '') {
      if (state.lastEquals != null) {
        b = new Dec(state.lastEquals);
      } else {
        b = new Dec(state.previousOperand);
      }
    } else {
      b = new Dec(state.currentOperand);
      state.lastEquals = b.toString();
    }

    let result;
    try {
      switch (state.operation) {
        case '+':
          result = a.plus(b); break;
        case '-':
          result = a.minus(b); break;
        case '*':
          result = a.times(b); break;
        case '/':
          if (b.isZero()) return setError();
          result = a.dividedBy(b); break;
        case '^':
          result = Dec.pow(a, b); break;
        default:
          return;
      }
    } catch (_) { return setError(); }
    if (!result.isFinite()) return setError();
    state.previousOperand = '';
    state.operation = null;
    state.currentOperand = result.toString();
  }

  function sqrtImmediate() {
    if (state.errorState) return;
    const targetStr = state.currentOperand !== '' ? state.currentOperand : (state.previousOperand !== '' ? state.previousOperand : state.currentOperand);
    try {
      const x = new Dec(targetStr);
      if (x.isNegative()) return setError();
      const y = x.sqrt();
      state.currentOperand = y.toString();
      state.previousOperand = '';
      state.operation = null;
      state.lastEquals = null;
    } catch (_) { setError(); }
  }

  function reduceToPiRange(x) {
    if (x.isZero()) return x;
    const k = x.div(TWO_PI).floor();
    let r = x.minus(k.times(TWO_PI));
    if (r.gt(PI)) r = r.minus(TWO_PI);
    if (r.lt(PI.neg())) r = r.plus(TWO_PI);
    return r;
  }

  function decExp(x) {
    const threshold = new Dec('1e-34');
    let sum = new Dec(1);
    let term = new Dec(1);
    for (let n = 1; n <= 200; n++) {
      term = term.times(x).div(n);
      sum = sum.plus(term);
      if (term.abs().lt(threshold)) break;
    }
    return sum;
  }

  function decSin(x) {
    const xr = reduceToPiRange(x);
    const threshold = new Dec('1e-34');
    let sum = xr;
    let term = xr;
    const x2 = xr.times(xr);
    for (let k = 1; k <= 200; k++) {
      const denom = new Dec(2 * k).times(2 * k + 1);
      term = term.times(x2).div(denom).neg();
      sum = sum.plus(term);
      if (term.abs().lt(threshold)) break;
    }
    return sum;
  }

  function decCos(x) {
    const xr = reduceToPiRange(x);
    const threshold = new Dec('1e-34');
    let sum = new Dec(1);
    let term = new Dec(1);
    const x2 = xr.times(xr);
    for (let k = 1; k <= 200; k++) {
      const denom = new Dec(2 * k - 1).times(2 * k);
      term = term.times(x2).div(denom).neg();
      sum = sum.plus(term);
      if (term.abs().lt(threshold)) break;
    }
    return sum;
  }

  function applyUnarySin() { applyUnary((x) => decSin(x)); }
  function applyUnaryCos() { applyUnary((x) => decCos(x)); }
  function applyUnaryExp() { applyUnary((x) => decExp(x)); }

  function applyUnary(fn) {
    if (state.errorState) return;
    const targetStr = state.currentOperand !== '' ? state.currentOperand : (state.previousOperand !== '' ? state.previousOperand : state.currentOperand);
    try {
      const x = new Dec(targetStr);
      const y = fn(x);
      if (!y.isFinite()) return setError();
      state.currentOperand = y.toString();
      state.previousOperand = '';
      state.operation = null;
      state.lastEquals = null;
    } catch (_) { setError(); }
  }

  function insertPi() {
    if (state.errorState) clearAll();
    state.currentOperand = PI.toString();
  }

  function opSymbol(op) {
    return op === '/' ? '÷' : op === '*' ? '×' : op;
  }

  function prettyPrev() {
    if (state.errorState) return '';
    if (!state.operation) return state.previousOperand ? `${state.previousOperand}` : '';
    return `${state.previousOperand} ${opSymbol(state.operation)}`;
  }

  return {
    getState,
    clearAll,
    backspace,
    appendDigit,
    appendDot,
    chooseOperation,
    compute,
    sqrtImmediate,
    applyUnarySin,
    applyUnaryCos,
    applyUnaryExp,
    insertPi,
    prettyPrev,
  };
}
