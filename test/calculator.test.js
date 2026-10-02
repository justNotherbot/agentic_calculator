import test from 'node:test';
import assert from 'node:assert/strict';
import Decimal from 'decimal.js';
import { createCalculator } from '../calculator.js';

test('0.1 + 0.2 = 0.3', () => {
  const calc = createCalculator(Decimal);
  calc.appendDigit('0'); calc.appendDot(); calc.appendDigit('1');
  calc.chooseOperation('+');
  calc.appendDigit('0'); calc.appendDot(); calc.appendDigit('2');
  calc.compute();
  const { currentOperand } = calc.getState();
  assert.strictEqual(currentOperand, '0.3');
});

test('division by zero -> ERROR', () => {
  const calc = createCalculator(Decimal);
  calc.appendDigit('5');
  calc.chooseOperation('/');
  calc.appendDigit('0');
  calc.compute();
  assert.equal(calc.getState().currentOperand, 'ERROR');
});

test('sqrt 9 = 3', () => {
  const calc = createCalculator(Decimal);
  calc.appendDigit('9');
  calc.sqrtImmediate();
  assert.equal(calc.getState().currentOperand, '3');
});

test('pow 2 ^ 3 = 8', () => {
  const calc = createCalculator(Decimal);
  calc.appendDigit('2');
  calc.chooseOperation('^');
  calc.appendDigit('3');
  calc.compute();
  assert.equal(calc.getState().currentOperand, '8');
});

test('sin(0) = 0', () => {
  const calc = createCalculator(Decimal);
  // default 0
  calc.applyUnarySin();
  assert.equal(calc.getState().currentOperand, '0');
});

test('cos(0) = 1', () => {
  const calc = createCalculator(Decimal);
  calc.applyUnaryCos();
  assert.equal(calc.getState().currentOperand, '1');
});

test('exp(0) = 1', () => {
  const calc = createCalculator(Decimal);
  calc.applyUnaryExp();
  assert.equal(calc.getState().currentOperand, '1');
});
