const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SESSION_NAME = 'Pinpoint (Integrated Browser)';
const CLIPBOARD_MARKER = 'PINPOINT_CONTEXT:';
const WATCH_INTERVAL_MS = 300;
const WATCH_MAX_MS = 15 * 60 * 1000;
const CONTEXT_FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const STOP_EXPRESSION = `(() => {
  const picker = globalThis.__pinpointPicker;
  if (picker && picker.active) picker.stop();
  return 'PINPOINT_CANCELLED';
})()`;

let browserSession;
let attachSession;

const isBrowserTargetSession = (session) =>
  session?.type === 'pwa-editor-browser' &&
  session.parentSession?.name === SESSION_NAME;

const isAttachParentSession = (session) =>
  session?.name === SESSION_NAME && !session.parentSession;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const setArmed = (armed) =>
  vscode.commands.executeCommand('setContext', 'pinpoint.armed', armed);

const disarm = () => setArmed(false);

function formatReport(payload, screenshotFile) {
  const {element, path: htmlPath, url, viewport, outerHTML, rect, css} = payload;
  const lines = [
    `# ${element}`,
    '',
    'Element captured from the live page with Pinpoint.',
    ''
  ];
  if (screenshotFile) {
    lines.push(
      'Screenshot of the element as rendered, before its markup and styles below:',
      '',
      `![Screenshot of ${element}](${screenshotFile})`,
      ''
    );
  }
  lines.push(
    `- Page: ${url}`,
    `- Viewport: ${viewport.width} × ${viewport.height} px, ${viewport.devicePixelRatio}x pixel ratio`,
    `- Rendered size: ${rect.width} × ${rect.height} px at (${rect.left}, ${rect.top})`,
    `- DOM path: ${htmlPath}`,
    '',
    '## Markup',
    '',
    '```html',
    outerHTML,
    '```',
    '',
    '## Styles'
  );
  const section = (heading, body) =>
    lines.push('', `### ${heading}`, '', '```css', body.join('\n'), '```');
  if (css.matched.length) section('Matching rules, as authored', css.matched);
  if (css.media.length) section('Other breakpoints (not currently active)', css.media);
  if (css.states.hover.length) section(':hover', css.states.hover);
  if (css.states.focus.length) section(':focus', css.states.focus);
  if (css.states.active.length) section(':active', css.states.active);
  if (css.inherited.length) section('Inherited from ancestors', css.inherited);
  if (css.pseudos.before) section('::before', css.pseudos.before);
  if (css.pseudos.after) section('::after', css.pseudos.after);
  if (css.resolved.length) {
    section('Computed values that differ from the browser default', css.resolved);
  }
  if (css.variables.length) section('CSS variables referenced above', css.variables);
  lines.push('');
  return lines.join('\n');
}

// AI agents sandbox reads to the workspace, so the context file must live
// inside it — a `@.pinpoint/…` relative mention pastes cleanly where an
// absolute temp path would be blocked or ignored. Falls back to the OS temp
// dir only when no folder is open.
function contextDirectory() {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  return workspaceRoot
    ? {directory: path.join(workspaceRoot, '.pinpoint'), root: workspaceRoot}
    : {directory: path.join(os.tmpdir(), 'pinpoint'), root: null};
}

// "span.weather__summary.weather__summary__bottom" → "weather-summary":
// the first id or class names the capture better than the tag or the full
// selector, and BEM underscores read as hyphens.
function prettyName(element) {
  const raw = String(element || 'element');
  const match = raw.match(/[#.]([^#.]+)/);
  const base = (match ? match[1] : raw)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return base.slice(0, 40) || 'element';
}

function writeContextFile(payload) {
  const {directory, root} = contextDirectory();
  fs.mkdirSync(directory, {recursive: true});
  // Keep the folder out of version control without touching the repo's own
  // .gitignore.
  const ignorePath = path.join(directory, '.gitignore');
  if (!fs.existsSync(ignorePath)) fs.writeFileSync(ignorePath, '*\n', 'utf8');
  for (const entry of fs.readdirSync(directory)) {
    if (entry === '.gitignore') continue;
    const entryPath = path.join(directory, entry);
    try {
      if (Date.now() - fs.statSync(entryPath).mtimeMs > CONTEXT_FILE_MAX_AGE_MS) {
        fs.unlinkSync(entryPath);
      }
    } catch {
      // Another window may have pruned it already.
    }
  }
  const name = prettyName(payload.element);
  let filePath = path.join(directory, `${name}.md`);
  // Each click gets its own file — the previous capture may still be open in
  // a chat — so number the collisions instead of overwriting.
  for (let counter = 2; fs.existsSync(filePath); counter++) {
    filePath = path.join(directory, `${name}-${counter}.md`);
  }
  // Screenshot shares the report's base name, so a numbered collision on one
  // always numbers the other the same way.
  let screenshotPath = null;
  if (payload.screenshot) {
    screenshotPath = filePath.replace(/\.md$/, '.png');
    const base64 = payload.screenshot.slice(payload.screenshot.indexOf(',') + 1);
    fs.writeFileSync(screenshotPath, Buffer.from(base64, 'base64'));
  }
  fs.writeFileSync(filePath, formatReport(payload, screenshotPath && path.basename(screenshotPath)), 'utf8');
  const mention = root ? path.relative(root, filePath).split(path.sep).join('/') : filePath;
  return {filePath, mention, screenshotPath};
}

let clipboardWatcher;

function stopClipboardWatcher() {
  if (clipboardWatcher) clearInterval(clipboardWatcher);
  clipboardWatcher = undefined;
}

// The picker runs detached from any debug session, so the page hands its
// payload to the extension through the clipboard: the picker copies a marked
// JSON blob, and this watcher swaps it for an @-mention of the context file —
// ready to paste into any chat.
function startClipboardWatcher() {
  stopClipboardWatcher();
  const deadline = Date.now() + WATCH_MAX_MS;
  let busy = false;
  clipboardWatcher = setInterval(async () => {
    if (busy) return;
    if (Date.now() > deadline) {
      stopClipboardWatcher();
      return;
    }
    busy = true;
    try {
      const text = await vscode.env.clipboard.readText();
      if (text.startsWith(CLIPBOARD_MARKER)) {
        const payload = JSON.parse(text.slice(CLIPBOARD_MARKER.length));
        const {mention, screenshotPath} = writeContextFile(payload);
        const mentionText = `@${mention}`;
        await vscode.env.clipboard.writeText(mentionText);
        vscode.window.setStatusBarMessage(
          screenshotPath
            ? `Pinpoint: captured ${payload.element} — ${mentionText} copied (with screenshot in the report), paste it into your chat`
            : `Pinpoint: captured ${payload.element} — ${mentionText} copied, paste it into your chat`,
          5000
        );
      }
    } catch {
      // Partial clipboard read or unwritable temp dir; try again next tick.
    } finally {
      busy = false;
    }
  }, WATCH_INTERVAL_MS);
}

// The picker lives entirely in the page once injected, so the debug session is
// only needed long enough to evaluate a script — disconnecting right away keeps
// VS Code's floating debug toolbar from appearing.
async function detachBrowserSession() {
  // Stop the parent attach session even when no page target ever appeared
  // (e.g. the browser tab is open but blank) — otherwise the debug session
  // lingers and the floating toolbar never goes away.
  const sessions = new Set(
    [browserSession?.parentSession ?? browserSession, attachSession].filter(Boolean)
  );
  browserSession = undefined;
  attachSession = undefined;
  for (const session of sessions) {
    try {
      // stopDebugging never settles while the attach is still waiting for a
      // page target, so don't block on it — js-debug's own attach `timeout`
      // tears the session down in that case.
      await Promise.race([vscode.debug.stopDebugging(session), delay(1500)]);
    } catch {
      // Session already gone.
    }
  }
}

async function evaluatePicker(session, pickerSource) {
  let lastError;
  let lastResult;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const response = await session.customRequest('evaluate', {
        expression: pickerSource,
        context: 'repl'
      });
      lastResult = String(response?.result ?? '');
      if (lastResult.includes('PINPOINT_ACTIVE') || lastResult.includes('PINPOINT_CANCELLED')) {
        return lastResult;
      }
      if (lastResult.includes('PINPOINT_ERROR:')) {
        throw new Error(lastResult.slice(lastResult.indexOf('PINPOINT_ERROR:') + 19));
      }
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  if (lastError) throw lastError;
  throw new Error(`The browser did not activate the picker. Debugger response: ${lastResult || '(empty)'}`);
}

const NO_PAGE_MESSAGE = 'No page found in the Integrated Browser — the tab looks empty.';

function waitForSession(name, timeoutMs = 6000) {
  const existing = vscode.debug.activeDebugSession;
  if (isBrowserTargetSession(existing)) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const finish = (settle, value) => {
      clearTimeout(timer);
      startSubscription.dispose();
      endSubscription.dispose();
      settle(value);
    };
    const timer = setTimeout(() => finish(reject, new Error(NO_PAGE_MESSAGE)), timeoutMs);
    const startSubscription = vscode.debug.onDidStartDebugSession((session) => {
      if (isBrowserTargetSession(session)) finish(resolve, session);
    });
    // js-debug gives up on the attach (config `timeout`) when the browser tab
    // has no page to connect to; surface that right away instead of waiting.
    const endSubscription = vscode.debug.onDidTerminateDebugSession((session) => {
      if (isAttachParentSession(session)) finish(reject, new Error(NO_PAGE_MESSAGE));
    });
  });
}

async function getBrowserSession() {
  if (browserSession) return browserSession;

  const matchingSession = isBrowserTargetSession(vscode.debug.activeDebugSession)
    ? vscode.debug.activeDebugSession
    : undefined;
  if (matchingSession) {
    browserSession = matchingSession;
    return matchingSession;
  }

  const sessionPromise = waitForSession(SESSION_NAME);
  const started = await vscode.debug.startDebugging(
    undefined,
    {
      type: 'editor-browser',
      request: 'attach',
      name: SESSION_NAME,
      urlFilter: '*',
      // Give up quickly when there is no page to attach to, so the debug
      // session (and its floating toolbar) tears itself down.
      timeout: 4000,
      internalConsoleOptions: 'neverOpen'
    },
    {
      suppressDebugToolbar: true,
      suppressDebugStatusbar: true,
      suppressDebugView: true,
      suppressSaveBeforeStart: true
    }
  );
  if (!started) {
    sessionPromise.catch(() => {});
    throw new Error('Could not attach to the Integrated Browser.');
  }
  browserSession = await sessionPromise;
  return browserSession;
}

async function pickElement(context) {
  try {
    const session = await getBrowserSession();
    const pickerPath = vscode.Uri.joinPath(context.extensionUri, 'picker.js');
    const vendorPath = vscode.Uri.joinPath(context.extensionUri, 'vendor', 'modern-screenshot.js');
    // The vendored bundle sets globalThis.modernScreenshot; picker.js reads
    // that reference (and deletes it) as the first thing it does.
    const pickerSource = `${fs.readFileSync(vendorPath.fsPath, 'utf8')}\n${fs.readFileSync(pickerPath.fsPath, 'utf8')}`;
    const result = await evaluatePicker(session, pickerSource);
    const active = result.includes('PINPOINT_ACTIVE');
    setArmed(active);
    if (active) startClipboardWatcher();
    else stopClipboardWatcher();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    disarm();
    stopClipboardWatcher();
    vscode.window.showErrorMessage(
      `Pinpoint: ${message} Load a website in the Integrated Browser tab, then try again.`
    );
  } finally {
    await detachBrowserSession();
  }
}

async function stopPicking() {
  disarm();
  stopClipboardWatcher();
  try {
    const session = await getBrowserSession();
    await session.customRequest('evaluate', {
      expression: STOP_EXPRESSION,
      context: 'repl'
    });
  } catch {
    // No browser to reach; the picker is not running anyway.
  } finally {
    await detachBrowserSession();
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pinpoint.pick', () => pickElement(context)),
    vscode.commands.registerCommand('pinpoint.stop', () => stopPicking()),
    vscode.debug.onDidStartDebugSession((session) => {
      if (isBrowserTargetSession(session)) browserSession = session;
      if (isAttachParentSession(session)) attachSession = session;
    }),
    vscode.debug.onDidTerminateDebugSession((session) => {
      if (session === browserSession || isBrowserTargetSession(session)) {
        browserSession = undefined;
      }
      if (session === attachSession) attachSession = undefined;
    })
  );
  setArmed(false);
}

function deactivate() {
  stopClipboardWatcher();
}

module.exports = {activate, deactivate};
