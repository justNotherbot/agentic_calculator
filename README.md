# Precision GUI Calculator

Minimal browser-based calculator using decimal.js for precise arithmetic and TailwindCSS for styling.

## Component system and frontend implementation (Practice 8, part 2)

The selected component system is **DaisyUI 4.12.24 via CDN**, built on **TailwindCSS via CDN**. The project remains vanilla HTML and JavaScript; DaisyUI supplies the ready-made `btn`, `card`, and `alert` components, Tailwind utilities provide the page layout, typography, spacing, panels, and responsive breakpoints, and reusable project-specific variants are defined in `style.css`:

**Why DaisyUI?** The calculator already used Tailwind and plain HTML, so DaisyUI adds reusable visual components through CSS classes without introducing a framework or changing the calculation logic. React-oriented libraries such as MUI or shadcn/ui would require a React migration and a build pipeline for a small vanilla-JS project. Tailwind alone supplies utilities but not the ready-made buttons, cards, and alerts requested by the assignment. We keep project-specific keypad colors and focus treatment in `style.css` so the library fits the mockup rather than dictating a new design. Keyboard behavior and accessible labels remain our responsibility, not the CSS library's.

- `.key` with `.key-number`, `.key-control`, `.key-operator`, and `.key-equals` variants for the calculator buttons;
- the DaisyUI display card with live result output and horizontally scrollable precision;
- the history card with timestamp, expression, and result;
- status cards for empty, saving, and error states.

Shared visual tokens are the indigo brand color, slate surfaces/text, amber keyboard-focus ring, consistent rounded corners, and the same spacing scale across the calculator and history panel.

The complete implemented scenario is: enter an expression with the keypad or keyboard → calculate with `=` or `Enter` → save the completed result asynchronously to browser IndexedDB → see the timestamped expression and result in newest-first history. The UI disables controls while the save is pending, shows an empty state when there are no records, and shows an actionable retry message if storage fails. `log` is base-10 logarithm and `%`/`mod` is remainder; invalid domains and division/modulo by zero show `ERROR`.

Run the frontend from a local web server rather than opening the HTML file directly, because ES modules and browser storage are part of the scenario. With Python 3 installed:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The history is local to the browser and can be removed with **Clear history**. Client tests: `npm test`.

## Primary user scenario (Practice 8, part 1.1)

**User:** Someone who needs to calculate an expression without JavaScript floating-point rounding errors and review the result later.

**Task and expected result:** The user enters two numbers and an operation (for example, `0.1 + 0.2`), submits the calculation, and sees `0.3` on the display. The completed calculation also appears in a viewable, newest-first history list with its timestamp, expression, and result so it can be reviewed later. With no saved calculations, the list shows an empty state; while a calculation is being submitted, the interface shows progress and prevents duplicate submissions. An invalid expression or failed submission shows an actionable error, allowing the user to correct the input or retry. The scenario must work with both the keypad and keyboard on mobile and desktop.

The calculator computes locally and saves results to browser IndexedDB; it does not require a remote API.

## AI-assisted mockup (Practice 8, part 1.2)

[Open the static scenario prototype](./mockup.html) in a browser, or view it directly in the repository along with [its styles](./mockup.css). It is a self-contained, responsive storyboard; no account or design-tool link is required to review it. The six screens show the initial calculator, expression input with a visible keyboard focus, loading while saving, a successful result in a scrollable history with timestamp, expression, and result, empty history, and a failed save with a retry action. The input example is `0.1 + 0.2 = 0.3`. Timestamps in the mockup are illustrative, not live data.

AI proposed a single-screen calculator with a history area and distinct loading, success, empty, and failure states, using the existing slate/indigo palette. On review, I retained the full existing keypad (including unary functions), added `log₁₀` and `mod` controls and a timestamped calculation list, added a visible focus example, kept the result visible on save failure, and specified that the save action is disabled while pending. `log₁₀(x)` means base-10 logarithm (only for positive x); `a mod b` means remainder (b cannot be zero). The prototype is **static**: buttons and retry illustrate intended behavior, not functioning actions. The working implementation follows the same states, though its desktop layout places history alongside the keypad.

How to run:
1. Start the local server as shown above, then open `http://localhost:8000` in a modern browser.
2. No build step required; UI dependencies load via CDN. An internet connection is required for the CDN styles and decimal.js.

Keyboard shortcuts:
- Digits `0-9`, `.` for decimal point.
- Operators `+ - * / ^`.
- `%` for modulo and `l` for base-10 logarithm.
- `Enter` or `=` computes.
- `Backspace` deletes last digit.
- `Escape` clears all (AC).
- `r` or `s` runs square root, `p` inserts π.

Precision:
- Uses decimal.js with precision 40 and ROUND_HALF_EVEN. Large/small numbers may switch to scientific notation. The main display is horizontally scrollable to reveal additional precision.

Error handling:
- Division by zero, sqrt of negative, or invalid exponent sets display to `ERROR`. Press any digit to start fresh or press AC to reset. DEL is ignored during ERROR.
