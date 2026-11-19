# Precision GUI Calculator

Minimal browser-based calculator using decimal.js for precise arithmetic and TailwindCSS for styling.

## Primary user scenario (Practice 8, part 1.1)

**User:** Someone who needs to calculate an expression without JavaScript floating-point rounding errors and review the result later.

**Task and expected result:** The user enters two numbers and an operation (for example, `0.1 + 0.2`), submits the calculation, and sees `0.3` on the display. The completed calculation also appears in a viewable, newest-first history list with its timestamp, expression, and result so it can be reviewed later. With no saved calculations, the list shows an empty state; while a calculation is being submitted, the interface shows progress and prevents duplicate submissions. An invalid expression or failed submission shows an actionable error, allowing the user to correct the input or retry. The scenario must work with both the keypad and keyboard on mobile and desktop.

The calculator currently computes and displays results locally. History, asynchronous submission, progress/empty states, and retry behavior above describe the **target scenario**, not features already implemented.

## AI-assisted mockup (Practice 8, part 1.2)

[Open the static scenario prototype](./mockup.html) in a browser, or view it directly in the repository along with [its styles](./mockup.css). It is a self-contained, responsive storyboard; no account or design-tool link is required to review it. The six screens show the initial calculator, expression input with a visible keyboard focus, loading while saving, a successful result in a scrollable history with timestamp, expression, and result, empty history, and a failed save with a retry action. The input example is `0.1 + 0.2 = 0.3`. Timestamps in the mockup are illustrative, not live data.

AI proposed a single-screen calculator with a history area and distinct loading, success, empty, and failure states, using the existing slate/indigo palette. On review, I retained the full existing keypad (including unary functions), added `log₁₀` and `mod` controls and a timestamped calculation list, added a visible focus example, kept the result visible on save failure, and specified that the save action is disabled while pending. `log₁₀(x)` means base-10 logarithm (only for positive x); `a mod b` means remainder (b cannot be zero). The prototype is **static**: buttons and retry illustrate intended behavior, not functioning actions. Logarithm, modulo, history, and saving still need implementation in the working application; its final interface should be checked against these screens.

How to run:
1. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari - latest 2 versions).
2. No build step required; all dependencies load via CDN.

Keyboard shortcuts:
- Digits `0-9`, `.` for decimal point.
- Operators `+ - * / ^`.
- `Enter` or `=` computes.
- `Backspace` deletes last digit.
- `Escape` clears all (AC).
- `r` or `s` runs square root, `p` inserts π.

Precision:
- Uses decimal.js with precision 40 and ROUND_HALF_EVEN. Display clamps to ~14 significant digits; large/small numbers may switch to scientific notation. The main display is horizontally scrollable to reveal additional precision.

Error handling:
- Division by zero, sqrt of negative, or invalid exponent sets display to `ERROR`. Press any digit to start fresh or press AC to reset. DEL is ignored during ERROR.
