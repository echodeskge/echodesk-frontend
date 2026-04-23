/*!
 * EchoDesk chat widget bootstrap
 * ---------------------------------------------------------------
 * Paste this on your site:
 *   <script async src="https://echodesk.ge/widget.js?t=wgt_live_XXX"></script>
 *
 * What it does:
 *   1. Reads the `?t=` token from its own <script src=""> URL.
 *   2. Fetches /api/widget/public/config/?token= once (cached 10 min in LS).
 *   3. Injects a floating button in the corner; on click opens an <iframe>
 *      pointing at https://echodesk.ge/widget/embed/?t=TOKEN.
 *   4. Listens for window.postMessage from the iframe to update unread badge
 *      and close state.
 *
 * Design rules:
 *   - No external deps. No ES modules. No optional chaining in hot paths.
 *   - Never throw — a broken tenant config must never break the host page.
 *   - Max z-index 2147483000 (just below 2^31-1 so native dialogs win).
 */
(function () {
  'use strict';

  var API_ORIGIN = 'https://api.echodesk.ge';
  // Where the iframe UI is hosted. Keep hardcoded for production; override
  // via data-embed-origin attribute only if a tenant explicitly needs it.
  var EMBED_ORIGIN = 'https://echodesk.ge';

  // ---- Locate the <script> tag that loaded us --------------------------
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();
  if (!currentScript || !currentScript.src) return;

  // Allow a tenant to override the embed origin via data-embed-origin="..."
  // on their <script> tag. Useful for staging / self-hosted setups.
  var overrideEmbed = currentScript.getAttribute && currentScript.getAttribute('data-embed-origin');
  if (overrideEmbed) EMBED_ORIGIN = overrideEmbed;
  var overrideApi = currentScript.getAttribute && currentScript.getAttribute('data-api-origin');
  if (overrideApi) API_ORIGIN = overrideApi;

  var scriptUrl;
  try {
    scriptUrl = new URL(currentScript.src);
  } catch (_e) {
    return;
  }
  var token = scriptUrl.searchParams.get('t');
  if (!token) {
    try { console.warn('[EchoDesk widget] missing ?t=token in script src'); } catch (_e) {}
    return;
  }

  // Refuse to mount twice (e.g. someone pasted the snippet on every layout).
  if (window.__echodeskWidgetLoaded) return;
  window.__echodeskWidgetLoaded = true;

  // ---- Config fetch + short-lived LS cache -----------------------------
  var CACHE_TTL_MS = 10 * 60 * 1000;
  var CACHE_KEY = 'echodesk.widget.cfg.' + token;

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.t !== 'number') return null;
      if (Date.now() - parsed.t > CACHE_TTL_MS) return null;
      return parsed.data || null;
    } catch (_e) { return null; }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: data }));
    } catch (_e) { /* storage blocked / quota exceeded — fine */ }
  }

  function fetchConfig(cb) {
    var cached = readCache();
    if (cached) { cb(cached); return; }

    var url = API_ORIGIN + '/api/widget/public/config/?token=' + encodeURIComponent(token);
    try {
      fetch(url, { credentials: 'omit' })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
        .then(function (res) {
          if (!res.ok || (res.body && res.body.error)) {
            try { console.warn('[EchoDesk widget] config error:', res.body && res.body.error); } catch (_e) {}
            return;
          }
          writeCache(res.body);
          cb(res.body);
        })
        .catch(function () { /* silent — don't break the host page */ });
    } catch (_e) { /* fetch unavailable (very old browser) */ }
  }

  // ---- Mount once DOM is ready -----------------------------------------
  function mount(cfg) {
    var positionCss = cfg.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;';
    var brandColor = cfg.brand_color || '#2A2B7D';

    // Floating button ----------------------------------------------------
    var btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Open chat');
    btn.setAttribute('type', 'button');
    btn.style.cssText =
      'position:fixed;bottom:20px;' + positionCss +
      'width:56px;height:56px;border-radius:50%;border:0;' +
      'background:' + brandColor + ';color:#fff;cursor:pointer;' +
      'box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:2147483000;' +
      'display:flex;align-items:center;justify-content:center;padding:0;' +
      'transition:transform .12s ease;';
    btn.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
      '</svg>';
    btn.onmouseenter = function () { btn.style.transform = 'scale(1.05)'; };
    btn.onmouseleave = function () { btn.style.transform = ''; };

    // Unread badge (hidden until we receive a count > 0) -----------------
    var badge = document.createElement('span');
    badge.style.cssText =
      'position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;' +
      'border-radius:999px;min-width:20px;height:20px;font-size:11px;' +
      'font-weight:600;display:none;align-items:center;justify-content:center;' +
      'padding:0 6px;box-sizing:border-box;pointer-events:none;';
    btn.appendChild(badge);

    var iframe = null;
    var isOpen = false;

    function createIframe() {
      iframe = document.createElement('iframe');
      iframe.title = 'EchoDesk chat';
      iframe.src = EMBED_ORIGIN + '/widget/embed/?t=' + encodeURIComponent(token);
      iframe.style.cssText =
        'position:fixed;bottom:90px;' + positionCss +
        'width:380px;max-width:calc(100vw - 40px);' +
        'height:600px;max-height:calc(100vh - 110px);' +
        'border:0;border-radius:16px;background:#fff;' +
        'box-shadow:0 12px 32px rgba(0,0,0,.18);z-index:2147483000;' +
        'transition:opacity .15s ease, transform .15s ease;' +
        'opacity:0;transform:translateY(8px);';
      iframe.setAttribute('allow', 'clipboard-write');
      document.body.appendChild(iframe);
      // Fade in after mount.
      if (window.requestAnimationFrame) {
        requestAnimationFrame(function () {
          iframe.style.opacity = '1';
          iframe.style.transform = '';
        });
      } else {
        iframe.style.opacity = '1';
        iframe.style.transform = '';
      }
    }

    function toggle() {
      isOpen = !isOpen;
      if (isOpen) {
        if (!iframe) createIframe();
        else iframe.style.display = '';
        // Clear unread when opened.
        badge.style.display = 'none';
        badge.textContent = '';
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.postMessage({ type: 'echodesk:open' }, EMBED_ORIGIN);
          } catch (_e) {}
        }
      } else if (iframe) {
        iframe.style.display = 'none';
      }
    }
    btn.onclick = toggle;

    // Inter-frame messaging ---------------------------------------------
    window.addEventListener('message', function (e) {
      // Lock origin — ignore anything not from our own embed page.
      if (e.origin !== EMBED_ORIGIN) return;
      var msg = e.data || {};
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'echodesk:unread' && typeof msg.count === 'number') {
        if (msg.count > 0 && !isOpen) {
          badge.style.display = 'flex';
          badge.textContent = msg.count > 99 ? '99+' : String(msg.count);
        } else {
          badge.style.display = 'none';
          badge.textContent = '';
        }
      } else if (msg.type === 'echodesk:close') {
        isOpen = false;
        if (iframe) iframe.style.display = 'none';
      } else if (msg.type === 'echodesk:ready' && iframe && iframe.contentWindow) {
        // Iframe signalled it's hydrated; re-send "open" if user clicked fast.
        if (isOpen) {
          try {
            iframe.contentWindow.postMessage({ type: 'echodesk:open' }, EMBED_ORIGIN);
          } catch (_err) {}
        }
      }
    });

    try { document.body.appendChild(btn); }
    catch (_e) { /* body gone? bail silently */ }

    // ---- Proactive message ---------------------------------------------
    // After the tenant-configured delay, show a speech-bubble nudge next
    // to the floating button. Skipped on repeat tabs / repeat sessions so
    // visitors don't see it every page load.
    if (cfg && cfg.proactive_enabled && !isOpen) {
      var delayMs = Math.max(1, Number(cfg.proactive_delay_seconds) || 30) * 1000;
      var proactiveKey = 'echodesk.widget.proactive.' + token;
      var alreadyShown = false;
      try { alreadyShown = sessionStorage.getItem(proactiveKey) === '1'; } catch (_e) {}
      if (!alreadyShown) {
        setTimeout(function () {
          if (isOpen) return;
          var text = pickLocalized(cfg.proactive_message);
          if (!text) return;
          showProactive(text);
          try { sessionStorage.setItem(proactiveKey, '1'); } catch (_e) {}
        }, delayMs);
      }
    }

    function pickLocalized(value) {
      if (!value) return '';
      if (typeof value === 'string') return value;
      var pref = (navigator.language || 'en').slice(0, 2);
      return value[pref] || value.en || (Object.values ? Object.values(value).find(function (v) { return typeof v === 'string' && v; }) : '') || '';
    }

    function showProactive(text) {
      var bubble = document.createElement('div');
      bubble.setAttribute('role', 'dialog');
      bubble.setAttribute('aria-label', 'Chat prompt');
      bubble.style.cssText =
        'position:fixed;bottom:86px;' + positionCss +
        'max-width:260px;background:#fff;color:#111827;' +
        'border:1px solid #e5e7eb;border-radius:14px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.12);' +
        'padding:10px 32px 10px 14px;font-size:13px;line-height:1.4;' +
        'z-index:2147483000;cursor:pointer;' +
        'opacity:0;transform:translateY(6px);' +
        'transition:opacity .18s ease,transform .18s ease;';
      bubble.textContent = text;

      var close = document.createElement('button');
      close.setAttribute('aria-label', 'Dismiss');
      close.setAttribute('type', 'button');
      close.style.cssText =
        'position:absolute;top:4px;right:4px;width:22px;height:22px;' +
        'border:0;background:transparent;color:#9ca3af;font-size:16px;' +
        'line-height:1;cursor:pointer;border-radius:4px;padding:0;';
      close.textContent = '×';
      close.onclick = function (e) {
        e.stopPropagation();
        dismiss();
      };
      bubble.appendChild(close);

      bubble.onclick = function () {
        dismiss();
        if (!isOpen) toggle();
      };

      function dismiss() {
        bubble.style.opacity = '0';
        bubble.style.transform = 'translateY(6px)';
        setTimeout(function () {
          if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
        }, 200);
      }

      document.body.appendChild(bubble);
      if (window.requestAnimationFrame) {
        requestAnimationFrame(function () {
          bubble.style.opacity = '1';
          bubble.style.transform = '';
        });
      } else {
        bubble.style.opacity = '1';
        bubble.style.transform = '';
      }

      // Auto-dismiss after 45 seconds if the visitor doesn't engage.
      setTimeout(dismiss, 45000);
    }
  }

  function onReady(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb);
    } else {
      cb();
    }
  }

  fetchConfig(function (cfg) {
    if (!cfg) return;
    onReady(function () { mount(cfg); });
  });
})();
