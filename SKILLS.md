# AI Skills & MCP Configuration

## Required Skills (Knowledge Base)
1. **Frontend Web Development:** Deep knowledge of HTML5 semantics and DOM manipulation. Use https://agenticskills.io/skills/frontend-design
2. **TailwindCSS Design:** Ability to create grid layouts and responsive buttons for a calculator UI using utility classes.
3. **Decimal.js API:** Expertise in `decimal.js` methods (`.plus()`, `.minus()`, `.times()`, `.dividedBy()`, `.sqrt()`, `.pow()`, `.toString()`) to replace standard `+ - * / ^` operators. Configure context: precision=40, rounding=ROUND_HALF_EVEN, toExpNeg=-12, toExpPos=20.
4. **Calculator Logic:** Understanding of edge cases in calculator UI/UX (e.g., chaining operations, replacing the current operand when an operator is clicked, handling decimal points correctly, repeat equals behavior, unary functions application order).

5. **Unary Functions:** Implement `sin`, `cos`, `exp`, `√` as immediate operations on the current operand or last result; handle domain errors (e.g., sqrt of negative) by setting ERROR.

## MCP Servers (Model Context Protocol)
To successfully build and test this GUI app, the following MCP servers should be active:

### 1. `@modelcontextprotocol/server-filesystem`
- **Purpose:** Allows the AI to create the project structure, write `index.html`, `main.js`, and manage the `package.json` file to install `decimal.js`.
- **Paths:** `./` (Project Root)

### 2. `@anthropic/mcp-server-puppeteer` (or `@browserbase/mcp-server`)
- **Purpose:** Headless browser automation. The AI will use this to:
  - Launch the local dev server or open index.html via a simple static server.
  - Click the GUI buttons.
  - Read the screen output to verify that `0.1 + 0.2` accurately equals `0.3`, `2 ^ 3 = 8`, `√9 = 3`, and domain errors show `ERROR`.
  - Verify the UI is rendering correctly.

### 3. `@modelcontextprotocol/server-git`
- **Purpose:** Version control. Allows the AI to commit working versions of the calculator (e.g., "feat: add decimal.js support") and create branches if experimenting with different UI layouts.

### 4. `@modelcontextprotocol/server-sequential-thinking`
- **Purpose:** Useful for mapping out the state machine of the calculator (e.g., handling what happens if a user presses `5` `+` `*` `2`) before writing the JavaScript code.
