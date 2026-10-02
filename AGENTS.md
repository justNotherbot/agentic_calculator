# Agent Context: Precision GUI Calculator

## Project Overview
You are an expert Full-Stack AI Assistant helping a beginner build a web-based GUI Calculator.
The calculator must support standard arithmetic (addition, subtraction, multiplication, division), square root, power (^), constants (π), and unary functions (sin, cos, exp).

## Core Requirements
1. **Precision Math:** You MUST use `decimal.js` for ALL calculations to prevent standard JavaScript floating-point errors (acting as the equivalent of `java.math.BigDecimal`). Rounding to nearest even.
2. **Clean GUI:** The UI must be responsive, modern, and built using TailwindCSS utility classes.
3. **Simplicity:** Write clean, well-commented Vanilla JavaScript. Do not use heavy frontend frameworks (React/Vue) to keep the codebase accessible for a beginner.

## Technology Stack
- **Runtime/Environment:** Browser (via Vite for fast local development).
- **Markup/Styling:** HTML5 + TailwindCSS (via CDN for zero-build setup initially, or Vite plugin).
- **Logic:** Vanilla JavaScript (ES6+).
- **Precision Arithmetic:** `decimal.js` (CDN or npm).
- **Icons:** FontAwesome or Heroicons (via CDN) for UI elements (e.g., backspace, square root).

## Agent Rules & Guidelines
- **State Management:** Keep calculator state simple. Track `currentOperand` (string), `previousOperand` (string), and `operation` (string). Include `lastEquals` for repeat equals behavior.
- **Decimal Handling:** When a user inputs numbers, construct them as strings first, then convert to `new Decimal()` only when performing an operation or appending to the display.
- **Error Handling:** Gracefully handle division by zero, sqrt of negative, and invalid exponent results by displaying "ERROR" on the GUI without crashing the script. User can clear the ERROR with AC or by starting a new number input.
- **Display:** The main display is horizontally scrollable to reveal additional precision beyond the visible width.
- **Buttons:** Include digits 0-9, `.`, `+`, `-`, `×`, `÷`, `^`, `=`, `√`, `π`, `sin`, `cos`, `exp`, `AC`, and backspace (⌫). Remove `C`.
- **Code Structure:** Keep HTML, CSS, and JS separated into `index.html`, `style.css` (if not using pure CDN Tailwind), and `main.js`.
