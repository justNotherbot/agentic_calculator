# Precision GUI Calculator

Minimal browser-based calculator using decimal.js for precise arithmetic and TailwindCSS for styling.

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
