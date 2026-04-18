'use client';

import { useEffect } from 'react';

/**
 * Post-render enhancement for ``<pre><code>`` blocks inside
 * ``dangerouslySetInnerHTML`` content.
 *
 * For each ``<pre>`` we find, this hook:
 *   1. Adds a language pill in the top-left (from ``<code class="language-X">``
 *      or a ``data-lang`` attribute on the ``<pre>``).
 *   2. Injects a copy button in the top-right that writes the block's
 *      text content to the clipboard and flashes "Copied" on success.
 *   3. Leaves the existing styling untouched — the caller decides the
 *      panel's colours / padding / border.
 *
 * Idempotent — sets ``data-enhanced="1"`` on each ``<pre>`` so rerenders
 * don't stack buttons.
 */
export function useEnhanceCodeBlocks(
  ref: React.RefObject<HTMLElement | null>,
  deps: React.DependencyList
) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const pres = root.querySelectorAll<HTMLPreElement>('pre');
    const cleanups: Array<() => void> = [];

    pres.forEach((pre) => {
      if (pre.dataset.enhanced === '1') return;
      pre.dataset.enhanced = '1';

      // Ensure absolute-positioned overlay children land inside the pre.
      const existingPos = getComputedStyle(pre).position;
      if (existingPos === 'static') {
        pre.style.position = 'relative';
      }
      // Always reserve space at the top so the button / language pill
      // never collide with the first line of code. Force-overrides any
      // existing paddingTop inherited from the padding shorthand or prose.
      pre.style.paddingTop = '2.5rem';

      // Language label (if present)
      const codeEl = pre.querySelector('code');
      const lang = deriveLanguage(pre, codeEl);
      if (lang) {
        const label = document.createElement('span');
        label.textContent = lang;
        label.className = 'code-block-lang';
        pre.appendChild(label);
      }

      // Copy button
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-block-copy';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.innerHTML = copyIconSVG + '<span class="code-block-copy-label">Copy</span>';

      const onClick = async () => {
        const text = (codeEl?.textContent ?? pre.textContent ?? '').trim();
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Fallback for older browsers.
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'absolute';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand('copy');
          } finally {
            document.body.removeChild(ta);
          }
        }
        btn.classList.add('is-copied');
        btn.innerHTML = checkIconSVG + '<span class="code-block-copy-label">Copied</span>';
        window.setTimeout(() => {
          btn.classList.remove('is-copied');
          btn.innerHTML = copyIconSVG + '<span class="code-block-copy-label">Copy</span>';
        }, 1800);
      };

      btn.addEventListener('click', onClick);
      pre.appendChild(btn);
      cleanups.push(() => btn.removeEventListener('click', onClick));
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function deriveLanguage(pre: HTMLPreElement, code: HTMLElement | null): string | null {
  const fromData = pre.dataset.lang || pre.dataset.language;
  if (fromData) return fromData;
  const cls = code?.className || pre.className || '';
  const m = cls.match(/(?:^|\s)language-([\w-]+)/);
  if (m) return m[1];
  return null;
}

const copyIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round"
     stroke-linejoin="round" aria-hidden="true"
     style="width:14px;height:14px;">
  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
</svg>
`;

const checkIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
     stroke-linejoin="round" aria-hidden="true"
     style="width:14px;height:14px;">
  <polyline points="20 6 9 17 4 12"/>
</svg>
`;
