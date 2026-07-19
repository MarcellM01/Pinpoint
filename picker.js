(() => {
  try {
    const KEY = '__pinpointPicker';
    if (globalThis[KEY]?.active) {
      globalThis[KEY].stop();
      return 'PINPOINT_CANCELLED';
    }

    let selectedElement = null;
    let host;
    let highlight;
    let label;
    let copying = false;
    const previousCursor = document.documentElement.style.cursor;

    const escapeCss = (value) => globalThis.CSS?.escape
      ? CSS.escape(value)
      : value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);

    const selectorSegment = (element) => {
      const tag = element.localName;
      if (element.id) return `${tag}#${escapeCss(element.id)}`;
      const classes = [...element.classList]
        .filter((name) => name && !/^(active|hover|focus|selected|open)$/i.test(name))
        .slice(0, 3)
        .map((name) => `.${escapeCss(name)}`)
        .join('');
      if (classes) return `${tag}${classes}`;
      const parent = element.parentElement;
      if (!parent) return tag;
      const siblings = [...parent.children].filter((child) => child.localName === tag);
      return siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(element) + 1})` : tag;
    };

    const selectorPath = (element) => {
      const segments = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE && segments.length < 8) {
        segments.unshift(selectorSegment(current));
        if (current.id) break;
        current = current.parentElement;
      }
      return segments.join(' > ');
    };

    const elementRef = (element) =>
      element.id ? `#${escapeCss(element.id)}` : selectorPath(element);

    const INHERITED_PROPS = new Set([
      'border-collapse', 'border-spacing', 'caption-side', 'color', 'cursor',
      'direction', 'empty-cells', 'font', 'font-family', 'font-feature-settings',
      'font-size', 'font-stretch', 'font-style', 'font-variant', 'font-weight',
      'hyphens', 'letter-spacing', 'line-height', 'list-style', 'list-style-image',
      'list-style-position', 'list-style-type', 'overflow-wrap', 'quotes',
      'tab-size', 'text-align', 'text-align-last', 'text-indent', 'text-shadow',
      'text-transform', 'visibility', 'white-space', 'word-break', 'word-spacing'
    ]);

    // Universal rules and tag-soup resets (`*`, `a, abbr, …, span { margin:0 }`)
    // match every element on the page and say nothing about this one. A single
    // bare-tag selector (`h1 { … }`) is kept — that is real styling.
    const isNoiseRule = (selectorText) => {
      const segments = selectorText.split(',').map((segment) => segment.trim());
      const generic = segments.every((segment) =>
        /^(\*|::?[a-z-]+|[a-z][a-z0-9-]*)$/i.test(segment)
      );
      return generic && (segments.length > 3 || segments.includes('*'));
    };

    const matchedRules = (element) => {
      const rules = [];
      const visit = (list) => {
        for (const rule of list) {
          try {
            if (rule.selectorText !== undefined) {
              if (element.matches(rule.selectorText) && !isNoiseRule(rule.selectorText)) {
                rules.push(rule);
              }
            } else if (rule.media) {
              if (matchMedia(rule.media.mediaText).matches) visit(rule.cssRules);
            } else if (rule.cssRules) {
              visit(rule.cssRules);
            }
          } catch {
            // Unparseable selector or unsupported rule type.
          }
        }
      };
      for (const sheet of document.styleSheets) {
        try {
          visit(sheet.cssRules);
        } catch {
          // Cross-origin stylesheet.
        }
      }
      return rules;
    };

    // `selector { first-decl;\n  rest… }` — one rule per block, matching how
    // DevTools presents matched rules.
    const formatRule = (selectorText, declarations) =>
      `${selectorText} { ${declarations.join(';\n  ')}${declarations.length ? ';' : ''} }`;

    // Split "a: b; c: d" on semicolons that sit outside quotes and parens —
    // values like url(data:…;base64,…) contain literal semicolons.
    const splitDeclarations = (styleText) => {
      const declarations = [];
      let depth = 0;
      let quote = null;
      let start = 0;
      for (let index = 0; index < styleText.length; index++) {
        const character = styleText[index];
        if (quote) {
          if (character === quote && styleText[index - 1] !== '\\') quote = null;
        } else if (character === '"' || character === "'") {
          quote = character;
        } else if (character === '(') {
          depth++;
        } else if (character === ')') {
          depth = Math.max(0, depth - 1);
        } else if (character === ';' && depth === 0) {
          const declaration = styleText.slice(start, index).trim();
          if (declaration) declarations.push(declaration);
          start = index + 1;
        }
      }
      const tail = styleText.slice(start).trim();
      if (tail) declarations.push(tail);
      return declarations;
    };

    const ruleDeclarations = (style, filter) => {
      const declarations = [];
      for (let index = 0; index < style.length; index++) {
        const property = style[index];
        if (filter && !filter(property)) continue;
        const priority = style.getPropertyPriority(property);
        declarations.push(
          `${property}: ${style.getPropertyValue(property).trim()}${priority ? ' !important' : ''}`
        );
      }
      return declarations;
    };

    const collectCss = (element) => {
      const matched = [];
      const ruleTexts = [];
      for (const rule of matchedRules(element).slice(0, 40)) {
        // style.cssText keeps authored shorthands and var() references that
        // per-property iteration would expand or drop.
        const declarations = splitDeclarations(rule.style.cssText);
        if (!declarations.length) continue;
        matched.push(formatRule(rule.selectorText, declarations));
        ruleTexts.push(rule.cssText);
      }
      const inlineStyle = element.style.cssText;
      if (inlineStyle) {
        matched.push(formatRule('element.style', splitDeclarations(inlineStyle)));
        ruleTexts.push(inlineStyle);
      }

      const inherited = [];
      for (
        let ancestor = element.parentElement;
        ancestor && inherited.length < 12;
        ancestor = ancestor.parentElement
      ) {
        for (const rule of matchedRules(ancestor)) {
          const declarations = ruleDeclarations(
            rule.style,
            (property) => INHERITED_PROPS.has(property)
          );
          if (!declarations.length) continue;
          inherited.push(formatRule(rule.selectorText, declarations));
          ruleTexts.push(rule.cssText);
          if (inherited.length >= 12) break;
        }
      }

      const computed = getComputedStyle(element);

      const variableNames = new Set();
      for (const text of ruleTexts) {
        for (const match of text.matchAll(/var\(\s*(--[\w-]+)/g)) variableNames.add(match[1]);
      }
      const variables = [...variableNames].slice(0, 40).map((name) => {
        const value = computed.getPropertyValue(name);
        return `${name}: ${value.trim() ? value : '(unset)'};`;
      });

      return {matched, inherited, resolved: resolvedValues(element, computed), variables};
    };

    // Diff the element's computed style against a pristine element of the same
    // tag so the resolved list only shows properties something actually set.
    const resolvedValues = (element, computed) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden;';
      try {
        document.documentElement.append(iframe);
        const probeDocument = iframe.contentDocument;
        const probe = probeDocument.createElement(element.localName);
        (probeDocument.body ?? probeDocument.documentElement).append(probe);
        const baseline = iframe.contentWindow.getComputedStyle(probe);

        // Logical aliases and geometry read-backs that only duplicate other
        // entries, plus color longhands that merely mirror `color`.
        const NOISE_PROPS = new Set([
          'block-size', 'inline-size', 'min-block-size', 'min-inline-size',
          'max-block-size', 'max-inline-size', 'perspective-origin', 'transform-origin'
        ]);
        const COLOR_MIRRORS = new Set([
          'caret-color', 'column-rule-color', 'text-decoration-color', 'text-emphasis-color'
        ]);
        const color = computed.getPropertyValue('color');

        const changed = new Set();
        for (let index = 0; index < computed.length; index++) {
          const property = computed[index];
          if (property.startsWith('-')) continue;
          if (NOISE_PROPS.has(property)) continue;
          if (property.startsWith('inset-') || property.startsWith('margin-block') ||
              property.startsWith('margin-inline') || property.startsWith('padding-block') ||
              property.startsWith('padding-inline')) continue;
          const value = computed.getPropertyValue(property);
          if (COLOR_MIRRORS.has(property) && value === color) continue;
          if (value !== baseline.getPropertyValue(property)) changed.add(property);
        }

        // Fold longhand groups back into their shorthand where the computed
        // shorthand has a single representable value.
        const lines = [];
        const shorthandGroups = [
          ['margin', (property) => property.startsWith('margin-')],
          ['padding', (property) => property.startsWith('padding-')],
          ['border-radius', (property) => /^border-.+-radius$/.test(property)],
          [
            'border',
            (property) =>
              property.startsWith('border-') &&
              !property.endsWith('-radius') &&
              !property.startsWith('border-image')
          ]
        ];
        for (const [shorthand, matches] of shorthandGroups) {
          const longhands = [...changed].filter(matches);
          if (!longhands.length) continue;
          const value = computed.getPropertyValue(shorthand);
          if (!value) continue;
          lines.push(`${shorthand}: ${value};`);
          for (const property of longhands) changed.delete(property);
        }
        for (const property of [...changed].sort()) {
          lines.push(`${property}: ${computed.getPropertyValue(property)};`);
        }
        return lines.slice(0, 200);
      } catch {
        return [];
      } finally {
        iframe.remove();
      }
    };

    const buildPayload = (element) => {
      const rect = element.getBoundingClientRect();
      const outerHTML = element.outerHTML;
      return {
        element: selectorSegment(element),
        path: selectorPath(element),
        url: location.href,
        outerHTML: outerHTML.length > 60000
          ? `${outerHTML.slice(0, 60000)}\n<!-- truncated: element markup exceeds 60 KB -->`
          : outerHTML,
        rect: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        css: collectCss(element)
      };
    };

    const copyText = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
        document.documentElement.append(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('Clipboard write failed');
      }
    };

    const createUi = () => {
      host = document.createElement('div');
      host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
      const root = host.attachShadow({mode: 'closed'});
      const style = document.createElement('style');
      style.textContent = `
        .highlight { position:fixed;box-sizing:border-box;border:2px solid #1689ff;
          background:rgb(22 137 255 / 14%);pointer-events:none }
        .label { position:fixed;max-width:min(480px,calc(100vw - 16px));padding:5px 8px;
          border-radius:5px;background:#0969da;color:white;font:600 12px/1.35
          ui-monospace,SFMono-Regular,Consolas,monospace;white-space:nowrap;overflow:hidden;
          text-overflow:ellipsis;box-shadow:0 2px 8px rgb(0 0 0 / 25%) }
      `;
      highlight = document.createElement('div');
      highlight.className = 'highlight';
      label = document.createElement('div');
      label.className = 'label';
      root.append(style, highlight, label);
      document.documentElement.append(host);
      return root;
    };

    const stop = () => {
      state.active = false;
      host?.remove();
      document.documentElement.style.cursor = previousCursor;
      removeEventListener('pointermove', onPointerMove, true);
      removeEventListener('click', onClick, true);
      removeEventListener('keydown', onKeyDown, true);
      removeEventListener('scroll', refreshHighlight, true);
      removeEventListener('resize', refreshHighlight, true);
    };

    const showToast = (message) => {
      const toastHost = document.createElement('div');
      toastHost.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
      const root = toastHost.attachShadow({mode: 'closed'});
      const style = document.createElement('style');
      style.textContent = '.t{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);padding:10px 14px;border-radius:7px;background:#1f2328;color:#fff;font:500 13px/1.4 system-ui,sans-serif;box-shadow:0 5px 20px #0005}';
      const toast = document.createElement('div');
      toast.className = 't';
      toast.textContent = message;
      root.append(style, toast);
      document.documentElement.append(toastHost);
      setTimeout(() => toastHost.remove(), 1800);
    };

    const refreshHighlight = () => {
      if (!selectedElement) return;
      const rect = selectedElement.getBoundingClientRect();
      Object.assign(highlight.style, {left:`${rect.left}px`, top:`${rect.top}px`, width:`${rect.width}px`, height:`${rect.height}px`});
      label.textContent = `${selectorSegment(selectedElement)}  ${Math.round(rect.width)} × ${Math.round(rect.height)}  •  click to capture  •  Esc to stop`;
      label.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - 220))}px`;
      label.style.top = `${Math.max(4, rect.top >= 32 ? rect.top - 29 : Math.min(innerHeight - 29, rect.bottom + 4))}px`;
    };

    const onPointerMove = (event) => {
      if (!(event.target instanceof Element) || event.target === host) return;
      selectedElement = event.target;
      refreshHighlight();
    };

    const onClick = async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const element = selectedElement;
      if (!element || copying) return;
      copying = true;
      const ref = elementRef(element);
      // Capture with the page's own cursor so the picker's crosshair does not
      // leak into the resolved styles.
      document.documentElement.style.cursor = previousCursor;
      let payload;
      try {
        payload = buildPayload(element);
      } finally {
        document.documentElement.style.setProperty('cursor', 'crosshair', 'important');
      }
      try {
        // Pinpoint's extension host watches the clipboard for this marker,
        // saves the payload to a temp file, and swaps in an @-mention.
        await copyText(`PINPOINT_CONTEXT:${JSON.stringify(payload)}`);
        showToast(`Captured ${ref} — paste the @-mention into your agent`);
      } catch {
        try {
          await copyText(ref);
          showToast(`Copied ${ref} — pick another or press Esc`);
        } catch {
          showToast('Could not copy the element reference');
        }
      } finally {
        copying = false;
      }
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      stop();
    };

    const state = {active: true, stop};
    globalThis[KEY] = state;
    createUi();
    document.documentElement.style.setProperty('cursor', 'crosshair', 'important');
    addEventListener('pointermove', onPointerMove, true);
    addEventListener('click', onClick, true);
    addEventListener('keydown', onKeyDown, true);
    addEventListener('scroll', refreshHighlight, true);
    addEventListener('resize', refreshHighlight, true);
    return 'PINPOINT_ACTIVE';
  } catch (error) {
    return `PINPOINT_ERROR:${error instanceof Error ? error.message : String(error)}`;
  }
})()
