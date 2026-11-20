# Precision GUI Calculator

Browser-based calculator using decimal.js for precise arithmetic and Tailwind CSS for styling.

## Primary user scenario (Practice 8, part 1.1)

**User:** Someone who needs to calculate an expression without JavaScript floating-point rounding errors and review the result later.

**Task and expected result:** The user enters two numbers and an operation (for example, `0.1 + 0.2`), submits the calculation, and sees `0.3` on the display. The completed calculation also appears in a viewable, newest-first history list with its timestamp, expression, and result so it can be reviewed later. With no saved calculations, the list shows an empty state; while a calculation is being submitted, the interface shows progress and prevents duplicate submissions. An invalid expression or failed submission shows an actionable error, allowing the user to correct the input or retry. The scenario must work with both the keypad and keyboard on mobile and desktop.

The working calculator submits expressions to a Node backend using `decimal.js` and stores history in a server-side JSON file. Results and history persist across browser sessions and server restarts. Failed requests keep the input for retry.

## AI-assisted mockup (Practice 8, part 1.2)

[Download the editable Figma design](./agentic_calculator.fig) or [open the static scenario prototype](./mockup.html) in a browser (with [its styles](./mockup.css)). The HTML is a responsive storyboard that can be reviewed without a Figma account. Its six screens follow the Figma order: ready, completed, history, submitting, invalid input, and submission failed. Each shows a result display, three labeled expression fields, keypad, full-width blue Calculate button (or its disabled/retry state), and a history panel. The example is `0.1 + 0.2 = 0.3`. Timestamps are illustrative, not live data.

AI proposed a two-panel decimal calculator and history interface, with desktop and mobile frames for six states. After comparing the HTML prototype to the Figma layers, I replaced the unrelated three-column storyboard and integrated keypad with the design's stacked scenarios, labeled inputs, separate scientific and numeric keys, dedicated blue Calculate button, inline feedback, and newest-first history. The invalid-input screen keeps the first operand and highlights the missing second one; the failed-submission screen keeps both operands and offers Retry calculation. The prototype is **static**: buttons and retry illustrate intended behavior, not functioning actions. The working application now follows this layout; its dates and results are real, unlike the mockup's examples.

## Interface (Practice 8, part 2)

**Component library:** daisyUI 5 (CDN) on Tailwind CSS, using its `btn`, `input`, `select`, and `card` components for keypad/actions, labeled fields, and history. Shared refinements in `style.css` retain the Figma's indigo/slate colors, system sans-serif typography, spacing, and visible focus rings. No build step or secrets are needed. The interface reuses the existing `calculator.js` decimal arithmetic rather than duplicating calculation logic in the browser.

Enter both numbers (or use the keypad in the focused field), select an operation, and press Calculate or Enter. The server validates and calculates with `decimal.js`, saves the result, and returns the timestamped entry for the display and newest-first history. Missing/invalid values and divide-by-zero show corrective messages; server failure leaves the fields intact and offers Retry calculation. During the request, inputs and submission are disabled, and repeated Enter is ignored. Retry reuses the same request ID so a lost response does not create a duplicate. History is shared by everyone using this server (there are no accounts). AC clears the current fields, not history.

How to run:
1. Run `npm install` and `npm start`, then open `http://localhost:8000/`. Do not use a static file server: the history API is provided by `server.js`. An internet connection is needed for the Tailwind, daisyUI, and decimal.js CDNs.
2. History is stored in `history.json` in the project directory by default (git-ignored). Set `HISTORY_FILE=/path/to/history.json` to choose another existing writable directory and `PORT=8001` to change the port. Keep a backup of the file if you need durable data beyond this machine. Run `npm test` for arithmetic and API tests.

## Client Tests (Practice 8, part 3)

Install dependencies with `npm install`, install Chromium with `npx playwright install chromium`, then run `npm run test:client`. If Chrome is already installed, run `CHROME_PATH=/usr/bin/google-chrome npm run test:client` instead. The test runner starts its own Node server on port 8766 with an isolated temporary history file, removed after the suite. Run `npm test` separately for unit and backend API tests; both commands must pass. No credentials or external API are needed, but the page loads its CDN styles and decimal.js script over the internet.

Playwright browser tests check labels, keypad and keyboard interactions, missing/invalid fields, empty and loaded history, loading, success, math errors, server errors with retry, history-load failure, narrow screens, and a real-API submit-and-reload flow. For mocked calls, `GET /api/history` returns an array of `{id, timestamp, expression, result}` and `POST /api/history` returns one entry or `{error}` with an error status, matching `server.js`. The delayed-response test holds `POST` open, presses Enter twice, and confirms only one request was sent. There are no dialogs in this scenario.

AI helped propose the user actions and API states to cover (example requests: "Check the visible outcome of submitting 0.1 + 0.2" and "Hold a POST response and verify repeated Enter sends only one request"). I checked mock responses against the server, added a real-backend browser flow so the tests do not rely solely on mocks, and checked test sensitivity by temporarily removing the save-error message: its browser test failed as expected, then passed after restoring the message. The editable Figma design and static prototype are linked above.

Verified locally: `CHROME_PATH=/usr/bin/google-chrome npm run test:client` passed **15/15** browser tests; `npm test` passed **20/20** unit and API tests. Run these commands again for the current result on your machine. Browser tests include a computed-style check for the visible keyboard focus ring and generate [scenario screenshots](./evidence/README.md) showing [empty](./evidence/empty.png), [loading](./evidence/loading.png), [success](./evidence/success.png), and [error](./evidence/error.png) states.

Keyboard shortcuts:
- Tab moves between the labeled fields, operation selector, keypad, and Calculate button. Type numbers directly in either field; Backspace edits the focused field.
- Enter calculates; Escape clears the fields. Keypad buttons edit the last focused number field.

Precision:
- Uses decimal.js with precision 40 and ROUND_HALF_EVEN. The main display is horizontally scrollable to reveal additional precision.

Error handling:
- Invalid or missing fields show an inline message and highlight the affected field. Division by zero, invalid powers, and invalid unary results display `ERROR` with guidance; edit the field and retry or press AC to reset.
