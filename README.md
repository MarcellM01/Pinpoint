<p align="center">
  <img src="resources/icon.png" width="128" height="128" alt="Pinpoint logo">
</p>

<h1 align="center">Pinpoint</h1>

<p align="center">
  <strong>Click the bug. Paste the context. Let your AI fix the right thing.</strong>
</p>

<p align="center">
  Turn any element in VS Code's Integrated Browser into clean, agent-readable<br>
  HTML and CSS context—with a single click.
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=marcellm01.pinpoint"><img src="https://img.shields.io/visual-studio-marketplace/v/marcellm01.pinpoint?style=for-the-badge&logo=visualstudiocode&label=VS%20Code" alt="VS Code Marketplace version"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=marcellm01.pinpoint"><img src="https://img.shields.io/visual-studio-marketplace/i/marcellm01.pinpoint?style=for-the-badge&logo=visualstudiocode&label=Installs" alt="VS Code Marketplace installs"></a>
  <a href="https://github.com/MarcellM01/Pinpoint/stargazers"><img src="https://img.shields.io/github/stars/MarcellM01/Pinpoint?style=for-the-badge&logo=github&label=Stars" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge" alt="MIT License"></a>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=marcellm01.pinpoint"><strong>Install Pinpoint →</strong></a>
</p>

<p align="center">
  <img src="resources/pinpoint-demo.gif" width="960" alt="Pinpoint selecting an element in VS Code's Integrated Browser and pasting its context into an AI chat">
</p>

Your AI can read the code. It cannot see the element you are pointing at.

Pinpoint closes that gap. Pick an element in the live page and it captures the exact selector, markup, dimensions, matched and inherited CSS, resolved values, and CSS variables. It writes everything to a small Markdown report and puts an `@.pinpoint/…` mention on your clipboard.

Paste it into your AI chat. That's it.

## Stop describing. Start pointing.

Instead of this:

> The spacing is wrong on that card. No, the other card. The one under the weather summary. I think the class has "bottom" in it…

Do this:

1. Click the **Pinpoint** icon in the Integrated Browser toolbar.
2. Hover and click the broken element.
3. Paste into your AI chat and say what you want changed.

```text
@.pinpoint/weather-summary.md make this card stack cleanly on mobile
```

The agent gets the evidence it needs without a screenshot scavenger hunt, a wall of prompt text, or a guess at which component you meant.

## What one click captures

| Context                         | Why your agent needs it                                                |
| ------------------------------- | ---------------------------------------------------------------------- |
| CSS selector and full DOM path  | Finds the right element and traces it back to the source               |
| Page URL and element dimensions | Understands where the bug appears and at what rendered size            |
| Outer HTML                      | Sees the real rendered structure, classes, attributes, and content     |
| Matched CSS rules               | Knows which authored styles actually target the element                |
| Inherited CSS                   | Finds typography, color, and layout coming from ancestors              |
| Resolved values                 | Sees what the browser computed, without hundreds of default properties |
| CSS variables                   | Connects `var(--token)` references to their live values                |

Reports are readable Markdown—not raw DevTools noise—and live inside the workspace so sandboxed coding agents can access them.

## Install

Install **Pinpoint – Copy Element for AI** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=marcellm01.pinpoint), or run:

```bash
code --install-extension marcellm01.pinpoint
```

### Install from source

Clone the repository, then run the installer from its root.

macOS and Linux:

```bash
./install.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

The script packages the extension with `vsce` and installs the resulting `.vsix`. Installation requires Node.js (`npx`) and the `code` CLI on your `PATH`. Reload VS Code after installation.

## Use it in 10 seconds

1. In VS Code, run **Browser: Open Integrated Browser** and load your app.
2. Click the **inspect icon** in the browser tab's title bar.
3. Hover over the page to preview selectors and dimensions.
4. Click an element. Pinpoint creates a report such as `.pinpoint/weather-summary.md` and copies its `@` mention.
5. Paste into any AI chat that can read files in your workspace.
6. Keep clicking to capture more elements, or press <kbd>Esc</kbd> to stop.

Each click creates a cleanly named report. Captures older than 24 hours are removed automatically, and the `.pinpoint/` directory ignores its own contents so reports never pollute your commits.

> [!NOTE]
> Some agents' `@` file pickers do not autocomplete gitignored paths ([including Codex](https://github.com/openai/codex/issues/2952)). Paste the mention anyway—the path arrives as plain text and the agent can still read the file.

## Built for the agent loop

- **Agent-agnostic.** No per-chat integration. If the agent can read your workspace, Pinpoint works with it.
- **Prompt-efficient.** Rich DOM and CSS context stays in an attached file instead of flooding the conversation.
- **Safe picking.** Pinpoint intercepts the click, so selecting a link, submit button, or delete button does not activate it.
- **Local by design.** Pinpoint itself makes no network requests. Captures stay in your workspace and clipboard.
- **Low-noise output.** Universal resets and unchanged browser defaults are filtered out.
- **Fast cleanup.** Reports expire automatically after one day.

## How it works

```text
Integrated Browser
       │
       │ click an element
       ▼
Pinpoint captures live DOM + CSS
       │
       │ writes a local Markdown report
       ▼
.pinpoint/element-name.md
       │
       │ copies @.pinpoint/element-name.md
       ▼
Your AI chat
```

VS Code does not expose the Integrated Browser's page DOM through its public extension API. Pinpoint briefly attaches VS Code's JavaScript debugger, injects an isolated picker, and disconnects immediately. The picker uses a closed shadow DOM so the page cannot style its overlay, and capture-phase listeners so your click never reaches the page.

## Requirements and limits

- VS Code **1.109** or newer
- The built-in **Integrated Browser**, not the legacy Simple Browser webview
- A loaded web page in the active Integrated Browser tab
- Cross-origin stylesheets follow the browser's security rules, so rules the page itself cannot inspect may be unavailable to Pinpoint

## Help Pinpoint grow

If Pinpoint saves you from explaining “the other div” one more time, [star the repo](https://github.com/MarcellM01/Pinpoint) and share it with someone building frontends with AI.

Found a bug or have an idea? [Open an issue](https://github.com/MarcellM01/Pinpoint/issues).

## License

[MIT](LICENSE) © 2026 TinySuite
