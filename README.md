<p align="center">
  <img src="resources/icon.png" width="128" height="128" alt="Pinpoint logo">
</p>

<h1 align="center">Pinpoint</h1>

<p align="center">
  <strong>Click the bug. Paste the context. Let your AI fix the right thing.</strong>
</p>

<p align="center">
  Turn any element in VS Code's Integrated Browser into clean, agent-readable<br>
  HTML and CSS context with a single click.
</p>

[![VS Marketplace Version](https://vsmarketplacebadges.dev/version-short/marcellm01.tinysuite-pinpoint.svg)](https://marketplace.visualstudio.com/items?itemName=marcellm01.tinysuite-pinpoint)
[![VS Marketplace Installs](https://vsmarketplacebadges.dev/installs-short/marcellm01.tinysuite-pinpoint.svg)](https://marketplace.visualstudio.com/items?itemName=marcellm01.tinysuite-pinpoint)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=marcellm01.tinysuite-pinpoint"><strong>Install Pinpoint →</strong></a>
</p>

<p align="center">
  <img src="resources/pinpoint-demo.gif" width="960" alt="Pinpoint selecting an element in VS Code's Integrated Browser and pasting its context into an AI chat">
</p>

> **Built at TinySuite**
>
> Pinpoint comes from [TinySuite](https://tinysuite.dev/), the same team behind [TinySearch](https://github.com/MarcellM01/TinySearch). We built it for our own frontend and agent workflows, kept reaching for it, and decided it was too useful to keep private, so we open-sourced it.

Your AI can read the code. It cannot see the element you are pointing at.

Pinpoint closes that gap. Pick an element in the live page and it captures the exact selector, markup, dimensions, matched and inherited CSS, resolved values, and CSS variables — plus a screenshot of the element itself. It writes everything to a small Markdown report, screenshot included, and puts an `@.pinpoint/…` mention on your clipboard.

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
| Screenshot                      | Shows what the element actually looks like, not just its markup        |

Reports are readable Markdown, not raw DevTools noise, and live inside the workspace so sandboxed coding agents can access them. The screenshot is saved alongside the report and embedded in it, so it's there even if your paste target only takes text.

## Install

Install **Pinpoint: Copy Frontend Context for AI** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=marcellm01.tinysuite-pinpoint), or run:

```bash
code --install-extension marcellm01.tinysuite-pinpoint
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
4. Click an element. Pinpoint creates a report such as `.pinpoint/weather-summary.md` plus a matching screenshot, and copies the report's `@` mention.
5. Paste into any AI chat that can read files in your workspace — the mention links straight to the report, screenshot included.
6. Keep clicking to capture more elements, or press <kbd>Esc</kbd> to stop.

Each click creates a cleanly named report and screenshot pair. Captures older than 24 hours are removed automatically, and the `.pinpoint/` directory ignores its own contents so reports never pollute your commits.

> [!NOTE]
> Some agents' `@` file pickers do not autocomplete gitignored paths ([including Codex](https://github.com/openai/codex/issues/2952)). Paste the mention anyway. The path arrives as plain text and the agent can still read the file.

## Built for the agent loop

- **Agent-agnostic.** No per-chat integration. If the agent can read your workspace, Pinpoint works with it.
- **Prompt-efficient.** Rich DOM and CSS context stays in an attached file instead of flooding the conversation.
- **Safe picking.** Pinpoint intercepts the click, so selecting a link, submit button, or delete button does not activate it.
- **Local by design.** Pinpoint itself makes no network requests. Captures stay in your workspace and clipboard.
- **Low-noise output.** Universal resets and unchanged browser defaults are filtered out.
- **Fast cleanup.** Reports expire automatically after one day.
- **Best-effort screenshots.** The screenshot is rendered from the live DOM, not a real browser screenshot API — video, `<canvas>`, and cross-origin images without CORS headers may render blank, and very large elements skip the screenshot entirely. The rest of the capture is unaffected either way.

## Security and privacy

- **No telemetry or accounts.** Pinpoint does not collect usage data and does not require a sign-in.
- **No network requests.** The extension does not send captured content anywhere. Rendering the screenshot may cause the *page itself* to re-fetch its own already-displayed images and fonts (subject to the browser's normal cache) so they can be embedded in the image — nothing leaves the page's own security boundary, and nothing is sent by Pinpoint.
- **User initiated.** Pinpoint attaches VS Code's JavaScript debugger only after you click its inspect icon, injects the picker, and disconnects immediately.
- **Local output.** Reports and screenshots are written to `.pinpoint/` in your workspace, and the report's `@` mention is copied to your clipboard.
- **Vendored screenshot renderer.** The in-page rendering code is a vendored, unmodified copy of the open-source [modern-screenshot](https://github.com/qq15725/modern-screenshot) library (MIT) — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). It is bundled with the extension; nothing is fetched at install or run time.
- **Sensitive content stays your responsibility.** A report can contain text, attributes, URLs, and styles rendered by the selected element, and the screenshot can contain anything visibly rendered on the page. Review captures before sharing them outside your machine.

Read the [security policy](SECURITY.md) for vulnerability reporting and [support guide](SUPPORT.md) when something is not working.

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
