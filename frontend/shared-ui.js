(function (global) {
  var BOOT_LOADING_CLASS = 'page-boot-loading';
  var pageLoaderState = {
    active: false,
    hideTimer: null,
    shownAt: 0
  };
  var PAGE_LOADER_MIN_DURATION = 500;
  var scrollState = {
    bound: false
  };
  var dialogEnhancementState = {
    observer: null
  };
  var dialogHistoryState = {
    depth: 0,
    closingViaPopstate: false
  };

  // Jeda baku (ms) untuk debounce input pencarian/filter di semua halaman -- supaya ketikan
  // beruntun tidak nembak API / re-render tiap huruf. Dipakai lewat PSUI.debounce(fn) atau
  // PSUI.AUTOSAVE_DEBOUNCE_MS langsung. Satu tempat biar gampang di-tune serentak.
  var AUTOSAVE_DEBOUNCE_MS = 350;

  if (global.document && global.document.documentElement) {
    global.document.documentElement.classList.add(BOOT_LOADING_CLASS);
    pageLoaderState.active = true;
    pageLoaderState.shownAt = Date.now();
  }

  function removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  function clearBootLoader() {
    if (global.document && global.document.documentElement) {
      global.document.documentElement.classList.remove(BOOT_LOADING_CLASS);
    }
  }

  // Bungkus fn supaya baru dijalankan `wait` ms setelah panggilan TERAKHIR (pola trailing
  // debounce). `this` & argumen (mis. event) diteruskan apa adanya, jadi bisa langsung dipakai
  // sebagai listener: el.addEventListener('input', PSUI.debounce(handler)). wait default =
  // AUTOSAVE_DEBOUNCE_MS. Return-nya punya .cancel() buat batalin timer yang lagi menunggu.
  function debounce(fn, wait) {
    var delay = (wait === undefined || wait === null) ? AUTOSAVE_DEBOUNCE_MS : wait;
    var timer = null;
    function debounced() {
      var context = this;
      var args = arguments;
      global.clearTimeout(timer);
      timer = global.setTimeout(function () {
        timer = null;
        fn.apply(context, args);
      }, delay);
    }
    debounced.cancel = function () { global.clearTimeout(timer); timer = null; };
    return debounced;
  }

  function getLayerMountTarget(kind) {
    var id = String(kind || '').toLowerCase() === 'dialog' ? 'dialogRoot' : 'pageRoot';
    return global.document.getElementById(id) || global.document.body || global.document.documentElement;
  }
  function ensurePageLoader() {
    var existing = global.document.getElementById('pageLoaderOverlay');
    var mountTarget;
    if (existing) {
      return existing;
    }
    var overlay = global.document.createElement('div');
    overlay.id = 'pageLoaderOverlay';
    overlay.className = 'page-loader-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="page-loader-spinner" aria-hidden="true"></div>';
    mountTarget = getLayerMountTarget('dialog') || global.document.body || global.document.documentElement;
    mountTarget.appendChild(overlay);
    return overlay;
  }

  function showPageLoader(options) {
    var settings = options || {};
    var overlay = ensurePageLoader();
    if (pageLoaderState.hideTimer) {
      global.clearTimeout(pageLoaderState.hideTimer);
      pageLoaderState.hideTimer = null;
    }
    pageLoaderState.active = true;
    pageLoaderState.shownAt = Number(settings.startedAt || Date.now());
    overlay.classList.add('is-mounted');
    overlay.setAttribute('aria-hidden', 'false');
    if (global.document.body) {
      global.document.body.classList.add('page-transition-loading');
    }
    global.requestAnimationFrame(function () {
      clearBootLoader();
      overlay.classList.add('is-visible');
    });
  }

  function finishHidePageLoader() {
    var overlay = global.document.getElementById('pageLoaderOverlay');
    pageLoaderState.active = false;
    pageLoaderState.shownAt = 0;
    pageLoaderState.hideTimer = null;
    if (global.document.body) {
      global.document.body.classList.remove('page-transition-loading');
    }
    clearBootLoader();
    if (!overlay) {
      return;
    }
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    global.setTimeout(function () {
      if (!pageLoaderState.active) {
        overlay.classList.remove('is-mounted');
      }
    }, 180);
  }

  function hidePageLoader(force) {
    var remaining = force ? 0 : Math.max(0, PAGE_LOADER_MIN_DURATION - (Date.now() - pageLoaderState.shownAt));
    if (pageLoaderState.hideTimer) {
      global.clearTimeout(pageLoaderState.hideTimer);
      pageLoaderState.hideTimer = null;
    }
    if (remaining > 0) {
      pageLoaderState.hideTimer = global.setTimeout(finishHidePageLoader, remaining);
      return;
    }
    finishHidePageLoader();
  }

  function handleDismissibleClick(event) {
    var target = event.target && event.target.closest ? event.target.closest('.notice, .message') : null;
    if (!target) {
      return;
    }
    removeElement(target);
  }

  function syncPaginationHosts(options) {
    var settings = options || {};
    var markup = settings.markup || '';
    var visibleCount = Number(settings.visibleCount || 0);
    var totalCount = Number(settings.totalCount || visibleCount);
    var minimumCount = settings.minimumCount != null ? Number(settings.minimumCount) : 7;
    var top = global.document.getElementById(settings.topId || 'paginationTop');
    var bottom = global.document.getElementById(settings.bottomId || 'paginationBottom');
    var showPagination = !!markup && totalCount > minimumCount;

    if (top) {
      top.innerHTML = showPagination ? markup : '';
      top.classList.toggle('is-empty', !showPagination);
    }

    if (bottom) {
      bottom.innerHTML = showPagination ? markup : '';
      bottom.classList.toggle('is-empty', !showPagination);
    }
  }

  function syncActionToolbar(options) {
    var settings = options || {};
    var toolbar = global.document.getElementById(settings.toolbarId || 'actionToolbar');
    var toggle = global.document.getElementById(settings.toggleId || 'toolbarCollapseToggle');
    var expanded = !!settings.expanded;
    var extraSelector = settings.extraSelector || '[data-toolbar-extra], .toolbar-extra-action';
    var extras;

    if (!toolbar || !toggle) {
      return;
    }

    extras = toolbar.querySelectorAll(extraSelector);
    toolbar.classList.toggle('is-expanded', expanded);
    Array.prototype.forEach.call(extras, function (element) {
      element.classList.toggle('is-visible', expanded);
    });
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    toggle.setAttribute('aria-label', expanded ? 'Tutup aksi tambahan' : 'Buka aksi tambahan');
    toggle.textContent = expanded ? '\u2212' : '+';
  }

  function collapseInitialDetails() {
    Array.prototype.forEach.call(global.document.querySelectorAll('details[open]'), function (element) {
      element.open = false;
    });

    Array.prototype.forEach.call(global.document.querySelectorAll('.minimal-list-card.is-expanded'), function (card) {
      card.classList.remove('is-expanded');
      Array.prototype.forEach.call(card.querySelectorAll('[data-collapse]'), function (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function mountBulkToolbar(targetId, markup, visible) {
    var target = global.document.getElementById(targetId);
    var expanded = target && target.dataset ? target.dataset.bulkExpanded === 'true' : false;
    if (!target) {
      return;
    }
    if (!visible) {
      target.classList.remove('is-mounted');
      target.innerHTML = '';
      target.dataset.bulkExpanded = 'false';
      if (global.document.body) {
        global.document.body.classList.remove('bulk-toolbar-visible', 'bulk-toolbar-expanded');
      }
      return;
    }

    target.classList.add('is-mounted');
    target.innerHTML = [
      '<div class="bulk-toolbar-shell">',
      '  <button class="bulk-toolbar-toggle" data-bulk-toolbar-toggle="true" type="button" aria-expanded="' + (expanded ? 'true' : 'false') + '">Edit</button>',
      '  <div class="bulk-toolbar-panel' + (expanded ? ' is-open' : '') + '">',
      markup,
      '  </div>',
      '</div>'
    ].join('');
    target.dataset.bulkExpanded = expanded ? 'true' : 'false';
    if (global.document.body) {
      global.document.body.classList.add('bulk-toolbar-visible');
      global.document.body.classList.toggle('bulk-toolbar-expanded', expanded);
    }
  }

  function setBulkToolbarExpanded(target, expanded) {
    var panel;
    var toggle;

    if (!target) {
      return;
    }

    panel = target.querySelector('.bulk-toolbar-panel');
    toggle = target.querySelector('[data-bulk-toolbar-toggle]');
    target.dataset.bulkExpanded = expanded ? 'true' : 'false';

    if (toggle) {
      toggle.textContent = expanded ? 'Tutup' : 'Edit';
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    if (panel) {
      panel.classList.toggle('is-open', expanded);
    }

    if (global.document.body) {
      global.document.body.classList.toggle('bulk-toolbar-visible', target.classList.contains('is-mounted'));
      global.document.body.classList.toggle('bulk-toolbar-expanded', target.classList.contains('is-mounted') && expanded);
    }
  }

  function closeBulkToolbars() {
    Array.prototype.forEach.call(global.document.querySelectorAll('.bulk-toolbar.is-mounted[data-bulk-expanded="true"]'), function (target) {
      setBulkToolbarExpanded(target, false);
    });
  }

  function handleBulkToolbarClick(event) {
    var toggle = event.target && event.target.closest ? event.target.closest('[data-bulk-toolbar-toggle]') : null;
    if (!toggle) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setBulkToolbarExpanded(toggle.closest('.bulk-toolbar'), toggle.getAttribute('aria-expanded') !== 'true');
  }

  function fallbackCopyText(text) {
    var textarea = global.document.createElement('textarea');
    var copied;

    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.left = '-1000px';
    textarea.style.opacity = '0';
    getLayerMountTarget('page').appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      copied = global.document.execCommand('copy');
    } finally {
      removeElement(textarea);
    }

    return copied ? Promise.resolve() : Promise.reject(new Error('copy_failed'));
  }

  function copyTextToClipboard(text) {
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      return global.navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopyText(text);
      });
    }
    return fallbackCopyText(text);
  }

  function getQuickImportExampleText(element) {
    return String(element.getAttribute('data-copy-text') || element.textContent || '').trim();
  }

  function setQuickImportExampleFeedback(element, label, className) {
    if (element._psQuickImportCopyTimer) {
      global.clearTimeout(element._psQuickImportCopyTimer);
    }

    element.dataset.copyLabel = label;
    element.classList.remove('is-copied', 'is-copy-error');
    if (className) {
      element.classList.add(className);
    }

    element._psQuickImportCopyTimer = global.setTimeout(function () {
      element.dataset.copyLabel = 'Klik untuk copy';
      element.classList.remove('is-copied', 'is-copy-error');
      element._psQuickImportCopyTimer = null;
    }, 1500);
  }

  function copyQuickImportExample(element) {
    var text = getQuickImportExampleText(element);
    if (!text) {
      return;
    }

    copyTextToClipboard(text).then(function () {
      setQuickImportExampleFeedback(element, 'Tersalin', 'is-copied');
    }).catch(function () {
      setQuickImportExampleFeedback(element, 'Gagal copy', 'is-copy-error');
    });
  }

  function enhanceQuickImportExample(element) {
    if (!element || element.dataset.psQuickImportExampleEnhanced === 'true') {
      return;
    }
    element.dataset.psQuickImportExampleEnhanced = 'true';
    element.dataset.copyLabel = element.dataset.copyLabel || 'Klik untuk copy';
    if (element.tagName === 'BUTTON') {
      if (!element.getAttribute('type')) {
        element.setAttribute('type', 'button');
      }
    } else {
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
    }
    element.setAttribute('aria-label', 'Klik untuk menyalin contoh format');
    element.title = element.title || 'Klik untuk copy contoh format';
  }

  function enhanceQuickImportExamplesWithin(root) {
    if (!root || !root.querySelectorAll) {
      return;
    }
    Array.prototype.forEach.call(root.querySelectorAll('.quick-import-example'), enhanceQuickImportExample);
  }

  function handleQuickImportExampleClick(event) {
    var example = event.target && event.target.closest ? event.target.closest('.quick-import-example') : null;
    if (!example) {
      return;
    }
    enhanceQuickImportExample(example);
    copyQuickImportExample(example);
  }

  function handleQuickImportExampleKeydown(event) {
    var example;
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    example = event.target && event.target.closest ? event.target.closest('.quick-import-example') : null;
    if (!example) {
      return;
    }
    if (example.tagName === 'BUTTON') {
      return;
    }
    event.preventDefault();
    enhanceQuickImportExample(example);
    copyQuickImportExample(example);
  }
  // Ikon gembok inline (tanpa Font Awesome) supaya seragam di semua halaman,
  // termasuk yang tidak memuat Font Awesome (mis. changePassword, editPengurus).
  var PASSWORD_ICON_SVG_ATTRS = 'viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var PASSWORD_ICON_LOCKED = '<svg ' + PASSWORD_ICON_SVG_ATTRS + '><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  var PASSWORD_ICON_UNLOCKED = '<svg ' + PASSWORD_ICON_SVG_ATTRS + '><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';

  function syncPasswordToggleState(input, button) {
    var visible = !!input && input.type === 'text';
    if (!input || !button) {
      return;
    }
    button.setAttribute('aria-pressed', visible ? 'true' : 'false');
    button.setAttribute('aria-label', visible ? 'Sembunyikan password' : 'Tampilkan password');
    button.innerHTML = visible ? PASSWORD_ICON_UNLOCKED : PASSWORD_ICON_LOCKED;
  }

  function enhancePasswordField(input) {
    var wrapper;
    var button;
    if (!input || input.dataset.psPasswordEnhanced === 'true') {
      return;
    }
    if (input.dataset.psPasswordToggle === 'off') {
      // Halaman menyediakan tombol lihat/sembunyikan sendiri (mis. login & loginSantri).
      input.dataset.psPasswordEnhanced = 'true';
      return;
    }
    wrapper = global.document.createElement('div');
    wrapper.className = 'ps-password-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    button = global.document.createElement('button');
    button.className = 'ps-password-toggle';
    button.type = 'button';
    button.setAttribute('data-ps-password-toggle', 'true');
    button.setAttribute('aria-pressed', 'false');
    wrapper.appendChild(button);
    syncPasswordToggleState(input, button);
    button.addEventListener('click', function () {
      input.type = input.type === 'password' ? 'text' : 'password';
      syncPasswordToggleState(input, button);
      input.focus({ preventScroll: true });
      if (typeof input.setSelectionRange === 'function') {
        var length = input.value ? input.value.length : 0;
        input.setSelectionRange(length, length);
      }
    });
    input.dataset.psPasswordEnhanced = 'true';
  }

  function enhancePasswordFieldsWithin(root) {
    if (!root) {
      return;
    }
    if (root.nodeType === 1 && root.matches && root.matches('input[type="password"]')) {
      enhancePasswordField(root);
    }
    if (!root.querySelectorAll) {
      return;
    }
    Array.prototype.forEach.call(root.querySelectorAll('input[type="password"]'), enhancePasswordField);
  }

  function ensureScrollButtons() {
    var existing = global.document.getElementById('pageScrollButtons');
    if (existing) {
      return existing;
    }
    var wrap = global.document.createElement('div');
    wrap.id = 'pageScrollButtons';
    wrap.className = 'page-scroll-buttons';
    wrap.innerHTML = [
      '<button class="page-scroll-button" id="scrollToTopButton" type="button" aria-label="Kembali ke atas">&uarr;</button>',
      '<button class="page-scroll-button" id="scrollToBottomButton" type="button" aria-label="Lanjut ke bawah">&darr;</button>'
    ].join('');
    getLayerMountTarget('page').appendChild(wrap);
    return wrap;
  }

  function syncScrollButtons() {
    var topButton = global.document.getElementById('scrollToTopButton');
    var bottomButton = global.document.getElementById('scrollToBottomButton');
    var scrollTop = global.scrollY || global.document.documentElement.scrollTop || 0;
    var viewport = global.innerHeight || global.document.documentElement.clientHeight || 0;
    var docHeight = Math.max(
      global.document.body ? global.document.body.scrollHeight : 0,
      global.document.documentElement ? global.document.documentElement.scrollHeight : 0
    );
    var nearTop = scrollTop < Math.max(220, viewport * 0.4);
    var nearBottom = (scrollTop + viewport) >= (docHeight - Math.max(220, viewport * 0.3));
    var scrollable = docHeight > (viewport + 120);

    if (topButton) {
      topButton.classList.toggle('is-visible', scrollable && !nearTop);
    }
    if (bottomButton) {
      bottomButton.classList.toggle('is-visible', scrollable && !nearBottom);
    }
  }

  function bindScrollButtons() {
    if (scrollState.bound) {
      syncScrollButtons();
      return;
    }
    scrollState.bound = true;
    global.addEventListener('scroll', syncScrollButtons, { passive: true });
    global.addEventListener('resize', syncScrollButtons);
    global.document.addEventListener('click', function (event) {
      if (event.target && event.target.id === 'scrollToTopButton') {
        global.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (event.target && event.target.id === 'scrollToBottomButton') {
        global.scrollTo({ top: global.document.documentElement.scrollHeight, behavior: 'smooth' });
      }
    });
  }

  function ensureFloatingDialogStyles() {
    var existing = global.document.getElementById('psFloatingDialogStyles');
    var style;

    if (existing) {
      return existing;
    }

    style = global.document.createElement('style');
    style.id = 'psFloatingDialogStyles';
    style.textContent = [
      'dialog.ps-floating-dialog{width:81%;min-width:95%;max-width:81%;overflow:hidden;box-sizing:border-box;/*height:95%;min-height:95%;max-height:95%;*/}',
      'dialog.ps-floating-dialog::backdrop{cursor:default;background:rgba(0, 0, 0, 0.9);}',
      'dialog {padding: 0px;}',
      '.dialog-body { padding: 22px; display: flex; gap: 14px; max-height: 109vh; overflow: auto; flex-direction: column; justify-content: space-between; height: 100% !important; }',
      '.duplicate-dialog-body {padding-top: 0;}',
      '.duplicate-dialog-head {gap: 10px;}',
      '.ps-dialog-shell{--ps-dialog-head-size:clamp(88px, 15vh, 148px);--ps-dialog-foot-size:clamp(88px, 15vh, 148px);position:relative;overflow:auto;scroll-padding-top:calc(var(--ps-dialog-head-size) + 14px);scroll-padding-bottom:calc(var(--ps-dialog-foot-size) + 14px); width: 100%; min-height: 100%}',
      '.ps-dialog-shell > .ps-dialog-header{position:sticky;top:calc(var(--ps-dialog-shell-padding-top, 20px) * -1);z-index:4;min-height:var(--ps-dialog-head-size);margin:calc(var(--ps-dialog-shell-padding-top, 20px) * -1) calc(var(--ps-dialog-shell-padding-right, 20px) * -1) 10px calc(var(--ps-dialog-shell-padding-left, 20px) * -1); padding:20px 82px 18px 22px; border-bottom:1px solid rgba(91, 73, 57, 0.16);backdrop-filter:blur(10px);display: flex;/*align-items: center;*/}',
      '.ps-dialog-shell > .ps-dialog-header > :first-child{margin-top:0;}',
      '.ps-dialog-shell > .ps-dialog-header > :last-child{margin-bottom:0;}',
      '.ps-dialog-shell > .ps-dialog-footer{position:sticky;bottom:calc(var(--ps-dialog-shell-padding-bottom, 20px) * -1);z-index:4;min-height:var(--ps-dialog-foot-size);margin:10px calc(var(--ps-dialog-shell-padding-right, 20px) * -1) calc(var(--ps-dialog-shell-padding-bottom, 20px) * -1) calc(var(--ps-dialog-shell-padding-left, 20px) * -1);padding:16px 22px 20px;border-top:1px solid rgba(91, 73, 57, 0.16);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}',
      '.ps-dialog-shell > .ps-dialog-footer.toolbar{justify-content:flex-end;}',
      '.ps-dialog-shell > .ps-dialog-footer > *{margin:0;}',
      '.ps-dialog-shell > .ps-dialog-footer .toolbar{margin:0;}',
      '.ps-dialog-close-floating{position:absolute;top:18px;right:18px;z-index:5;display:inline-flex;align-items:center;justify-content:center;width:48px;min-width:48px;min-height:48px;padding:0;border-radius:999px;font-size:26px;line-height:1;box-shadow:0 16px 30px rgba(63, 43, 27, 0.18);cursor:pointer;}',
      '.ps-dialog-shell > .ps-dialog-header .ps-dialog-close-floating + *{margin-right:0;}',
      '.issue-modal-card{--ps-issue-modal-head-size:clamp(88px, 15vh, 148px);--ps-issue-modal-foot-size:clamp(88px, 15vh, 144px);position:relative;overflow:auto;scroll-padding-top:calc(var(--ps-issue-modal-head-size) + 14px);scroll-padding-bottom:calc(var(--ps-issue-modal-foot-size) + 14px);}',
      '.issue-modal-head{position:sticky;top:-18px;z-index:4;min-height:var(--ps-issue-modal-head-size);margin:-18px -18px 10px;padding: 20px 25px 18px 22px;border-bottom:1px solid rgba(91, 73, 57, 0.16);background: unset;backdrop-filter:blur(10px);}',
      '.issue-modal-head strong{display:block;padding-right:16px;}',
      '.issue-modal-foot{position:sticky;bottom:-18px;z-index:4;min-height:var(--ps-issue-modal-foot-size);margin:10px -18px -18px;padding:16px 22px 20px;border-top:1px solid rgba(91, 73, 57, 0.16);background: unset;backdrop-filter:blur(10px);display:flex;justify-content:flex-end;align-items:center;gap:12px;flex-wrap:wrap;}',
      '.issue-modal-close,.issue-modal-foot button{box-shadow:0 16px 30px rgba(63, 43, 27, 0.18);}',
      '@media (max-width: 700px){.ps-dialog-shell > .ps-dialog-header{padding:18px 72px 16px 16px;}.ps-dialog-shell > .ps-dialog-footer{padding:14px 16px 18px;}.ps-dialog-close-floating{top:14px;right:14px;width:44px;min-width:44px;min-height:44px;font-size:24px;}.issue-modal-head{}.issue-modal-foot{padding:14px 16px 18px;}}'
    ].join('');
    (global.document.head || global.document.documentElement).appendChild(style);
    return style;
  }

  function isHiddenInput(element) {
    return !!element
      && element.tagName === 'INPUT'
      && String(element.getAttribute('type') || '').toLowerCase() === 'hidden';
  }

  function getDialogShell(dialog) {
    return dialog && dialog.firstElementChild ? dialog.firstElementChild : null;
  }

  function getVisibleShellChildren(shell) {
    return Array.prototype.filter.call(shell.children || [], function (child) {
      return !child.hasAttribute('hidden')
        && !isHiddenInput(child)
        && !child.classList.contains('ps-dialog-close-floating');
    });
  }

  function findDialogFooter(shell) {
    var children = getVisibleShellChildren(shell);
    var index;
    for (index = children.length - 1; index >= 0; index -= 1) {
      if (children[index].matches && children[index].matches('.toolbar, .ps-import-conflict-foot, .issue-modal-foot, [class*="footer"], [class*="foot"]')) {
        return children[index];
      }
    }
    return null;
  }

  function findDialogHeader(shell, footer) {
    var children = getVisibleShellChildren(shell);
    var index;
    for (index = 0; index < children.length; index += 1) {
      if (children[index] !== footer) {
        return children[index];
      }
    }
    return null;
  }

  function syncDialogShellMetrics(shell) {
    var styles = global.getComputedStyle(shell);
    shell.style.setProperty('--ps-dialog-shell-padding-top', styles.paddingTop || '20px');
    shell.style.setProperty('--ps-dialog-shell-padding-right', styles.paddingRight || '20px');
    shell.style.setProperty('--ps-dialog-shell-padding-bottom', styles.paddingBottom || '20px');
    shell.style.setProperty('--ps-dialog-shell-padding-left', styles.paddingLeft || '20px');
  }

  function syncAllDialogShellMetrics() {
    Array.prototype.forEach.call(global.document.querySelectorAll('.ps-dialog-shell'), syncDialogShellMetrics);
  }

  function countOpenDialogs() {
    return global.document.querySelectorAll
      ? global.document.querySelectorAll('dialog[open]').length
      : 0;
  }

  function pushDialogHistory() {
    if (!global.history || !global.history.pushState) {
      return;
    }
    dialogHistoryState.depth += 1;
    global.history.pushState({ psDialog: true, depth: dialogHistoryState.depth }, '');
  }

  function countOpenModals() {
    var modals = global.document.querySelectorAll ? global.document.querySelectorAll('.issue-modal:not(.is-hidden)') : [];
    return modals.length;
  }

  function closeTopmostModal() {
    var modals = global.document.querySelectorAll ? global.document.querySelectorAll('.issue-modal:not(.is-hidden)') : [];
    var topModal = modals.length > 0 ? modals[modals.length - 1] : null;
    if (topModal) {
      topModal.classList.add('is-hidden');
      global.document.body.classList.remove('issue-modal-open');
    }
  }

  var CLOSE_BUTTON_SELECTORS = [
    '[data-ps-dialog-close]',
    '[data-dialog-close]',
    '[data-issue-close]',
    '.ps-dialog-close-floating',
    '.issue-modal-close',
    '[aria-label*="Tutup"]',
    '[aria-label*="Close"]'
  ].join(',');

  function clickCloseButton(container) {
    var btn = container && container.querySelector ? container.querySelector(CLOSE_BUTTON_SELECTORS) : null;
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  function handleDialogPopstate() {
    var openDialogs = global.document.querySelectorAll ? global.document.querySelectorAll('dialog[open]') : [];
    var topDialog = openDialogs.length > 0 ? openDialogs[openDialogs.length - 1] : null;
    if (topDialog) {
      dialogHistoryState.closingViaPopstate = true;
      if (!clickCloseButton(topDialog)) {
        topDialog.close();
      }
      dialogHistoryState.closingViaPopstate = false;
      if (dialogHistoryState.depth > 0) {
        dialogHistoryState.depth -= 1;
      }
      return;
    }
    if (countOpenModals() > 0) {
      var modals = global.document.querySelectorAll('.issue-modal:not(.is-hidden)');
      var topModal = modals.length > 0 ? modals[modals.length - 1] : null;
      dialogHistoryState.closingViaPopstate = true;
      if (!clickCloseButton(topModal)) {
        closeTopmostModal();
      }
      dialogHistoryState.closingViaPopstate = false;
      if (dialogHistoryState.depth > 0) {
        dialogHistoryState.depth -= 1;
      }
    }
  }

  global.addEventListener('popstate', function (event) {
    if (countOpenDialogs() > 0 || countOpenModals() > 0) {
      handleDialogPopstate();
    }
  });

  global.psDialogHistory = {
    push: pushDialogHistory,
    isClosingViaPopstate: function () { return dialogHistoryState.closingViaPopstate; },
    back: function () {
      if (!dialogHistoryState.closingViaPopstate && dialogHistoryState.depth > 0 && global.history && global.history.back) {
        dialogHistoryState.depth -= 1;
        global.history.back();
      }
    }
  };

  function syncDialogScrollLock() {
    var pageRoot = global.document.getElementById('pageRoot') || global.document.body;
    var hasOpenDialogs = countOpenDialogs() > 0;
    if (!global.document.body || !global.document.documentElement || !pageRoot) {
      return;
    }
    if (hasOpenDialogs) {
      global.document.documentElement.classList.add('ps-dialog-open');
      global.document.body.classList.add('ps-dialog-open');
      pageRoot.setAttribute('inert', '');
      pageRoot.setAttribute('aria-hidden', 'true');
      return;
    }
    global.document.documentElement.classList.remove('ps-dialog-open');
    global.document.body.classList.remove('ps-dialog-open');
    pageRoot.removeAttribute('inert');
    pageRoot.removeAttribute('aria-hidden');
  }

  function bindDialogCloseButton(dialog, button) {
    if (!button || button.dataset.psDialogCloseBound === 'true') {
      return;
    }

    button.dataset.psDialogCloseBound = 'true';
    button.setAttribute('data-ps-dialog-close', 'true');
    if (!button.getAttribute('aria-label')) {
      button.setAttribute('aria-label', 'Tutup popup');
    }
    if (button.tagName === 'BUTTON' && !button.getAttribute('type')) {
      button.setAttribute('type', 'button');
    }

    button.addEventListener('click', function (event) {
      event.preventDefault();
      if (dialog.open) {
        dialog.close();
      }
    });
  }

  function ensureFloatingDialogClose(dialog, header) {
    var selectors = [
      '[data-ps-dialog-close]',
      '.duplicate-close',
      '.issue-modal-close',
      '[data-dialog-close]',
      '[aria-label*="Tutup"]',
      '[aria-label*="Close"]'
    ];
    var closeButton = null;
    var index;

    if (!header) {
      return;
    }

    for (index = 0; index < selectors.length; index += 1) {
      closeButton = header.querySelector(selectors[index]);
      if (closeButton) {
        break;
      }
    }

    if (!closeButton) {
      closeButton = global.document.createElement('button');
      closeButton.className = 'secondary ps-dialog-close-floating';
      closeButton.innerHTML = '&times;';
      header.appendChild(closeButton);
    } else {
      closeButton.classList.add('ps-dialog-close-floating');
      if (!closeButton.innerHTML.trim()) {
        closeButton.innerHTML = '&times;';
      }
    }

    bindDialogCloseButton(dialog, closeButton);
  }

  function enhanceDialog(dialog) {
    var shell;
    var header;
    var footer;

    if (!dialog || dialog.dataset.psFloatingDialogEnhanced === 'true') {
      return;
    }

    shell = getDialogShell(dialog);
    if (!shell) {
      return;
    }

    syncDialogShellMetrics(shell);
    dialog.classList.add('ps-floating-dialog');
    shell.classList.add('ps-dialog-shell');

    footer = findDialogFooter(shell);
    header = findDialogHeader(shell, footer);

    if (header) {
      header.classList.add('ps-dialog-header');
      ensureFloatingDialogClose(dialog, header);
    }
    if (footer) {
      footer.classList.add('ps-dialog-footer');
    }

    dialog.addEventListener('close', function () {
      syncDialogScrollLock();
      // `data-no-history` dialog tidak pernah push entry saat open (lihat observer di
      // observeDialogs), jadi jangan pop / history.back() saat close juga -- kalau tidak,
      // depth dari dialog INDUK yang masih terbuka akan ikut ke-pop dan induknya ikut
      // tertutup (bug dialog bertumpuk). `== null` sengaja: `data-no-history` polos =>
      // dataset.noHistory === "" (truthy? tidak, tapi bukan null) => tetap dihormati.
      if (dialog.dataset.noHistory == null && !dialogHistoryState.closingViaPopstate && dialogHistoryState.depth > 0 && global.history && global.history.back) {
        dialogHistoryState.depth -= 1;
        global.history.back();
      }
    });
    dialog.dataset.psFloatingDialogEnhanced = 'true';
  }

  function enhanceDialogsWithin(root) {
    if (!root || !root.querySelectorAll) {
      return;
    }
    Array.prototype.forEach.call(root.querySelectorAll('dialog'), enhanceDialog);
  }

  function observeDialogs() {
    if (dialogEnhancementState.observer || !global.MutationObserver || !global.document.body) {
      return;
    }

    dialogEnhancementState.observer = new global.MutationObserver(function (mutations) {
      var shouldSyncScrollLock = false;
      mutations.forEach(function (mutation) {
        if (!mutation) {
          return;
        }
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'open' && mutation.target && mutation.target.tagName === 'DIALOG') {
            shouldSyncScrollLock = true;
            // `== null`, BUKAN `!...`: `data-no-history` polos (tanpa nilai) => dataset.noHistory
            // === "" => `!""` === true => dulu history TETAP di-push (atribut polos tak berefek).
            // Sekarang atribut polos benar-benar men-skip push (dan close listener men-skip back).
            if (mutation.target.open && mutation.target.dataset.noHistory == null) {
              pushDialogHistory();
            }
          }
          return;
        }
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (!node || node.nodeType !== 1) {
            return;
          }
          if (node.tagName === 'DIALOG') {
            enhanceDialog(node);
            enhanceQuickImportExamplesWithin(node);
          enhancePasswordFieldsWithin(node);
            shouldSyncScrollLock = true;
            return;
          }
          enhanceDialogsWithin(node);
          enhanceQuickImportExamplesWithin(node);
          enhancePasswordFieldsWithin(node);
          if (node.querySelector && node.querySelector('dialog[open]')) {
            shouldSyncScrollLock = true;
          }
        });
        Array.prototype.forEach.call(mutation.removedNodes || [], function (node) {
          if (!node || node.nodeType !== 1) {
            return;
          }
          if (node.tagName === 'DIALOG' || (node.querySelector && node.querySelector('dialog'))) {
            shouldSyncScrollLock = true;
          }
        });
      });
      if (shouldSyncScrollLock) {
        syncDialogScrollLock();
      }
    });

    dialogEnhancementState.observer.observe(global.document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['open']
    });
  }

  function initEnhancements() {
    collapseInitialDetails();
    ensureFloatingDialogStyles();
    enhanceDialogsWithin(global.document);
    enhanceQuickImportExamplesWithin(global.document);
    enhancePasswordFieldsWithin(global.document);
    observeDialogs();
    syncAllDialogShellMetrics();
    syncDialogScrollLock();
    ensureScrollButtons();
    bindScrollButtons();
    syncScrollButtons();
    hidePageLoader();
  }

  global.document.addEventListener('click', handleDismissibleClick);
  global.document.addEventListener('click', handleBulkToolbarClick);
  global.document.addEventListener('click', handleQuickImportExampleClick);
  global.document.addEventListener('keydown', handleQuickImportExampleKeydown);
  global.document.addEventListener('click', function (event) {
    if (event.target && event.target.closest && event.target.closest('.bulk-toolbar')) {
      return;
    }
    closeBulkToolbars();
  });
  global.document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeBulkToolbars();
    }
  });
  global.addEventListener('resize', syncAllDialogShellMetrics);

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', initEnhancements, { once: true });
  } else {
    initEnhancements();
  }

  function selectAllVisible(targetId) {
    var container = global.document.getElementById(targetId);
    if (!container) return;
    var changed = false;
    container.querySelectorAll('label:not([hidden]) input[type="checkbox"]').forEach(function(cb) {
      if (!cb.checked) { cb.checked = true; changed = true; }
    });
    if (changed) container.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function handleChecklistItemCheck(event, targetId) {
    if (!event.target || event.target.type !== 'checkbox') return;
    var label = event.target.closest ? event.target.closest('label') : null;
    if (!label) return;
    var container = global.document.getElementById(targetId);
    if (!container) return;
    if (event.target.checked) {
      container.insertBefore(label, container.firstChild);
    }
  }

  function deselectAllVisible(targetId) {
    var container = global.document.getElementById(targetId);
    if (!container) return;
    var changed = false;
    container.querySelectorAll('label:not([hidden]) input[type="checkbox"]').forEach(function(cb) {
      if (cb.checked) { cb.checked = false; changed = true; }
    });
    if (changed) container.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyPermissionLock(el, allowed, reasonText) {
    if (!el) return;
    var locked = !allowed;
    el.disabled = locked;
    el.classList.toggle('ps-locked', locked);
    el.setAttribute('aria-disabled', locked ? 'true' : 'false');
    if (locked) {
      el.title = reasonText || 'Anda tidak memiliki izin untuk menggunakan fitur ini.';
    } else {
      el.removeAttribute('title');
    }
  }

  // Inject scopeLabel into every API request automatically
  (function () {
    var _origFetch = global.fetch;
    if (typeof _origFetch !== 'function') return;
    global.fetch = function (url, opts) {
      if (opts && opts.method === 'POST' && typeof opts.body === 'string') {
        try {
          var body = JSON.parse(opts.body);
          if (body && body.action && body.scopeLabel === undefined) {
            body.scopeLabel = (global.localStorage && global.localStorage.getItem('ps_role_scope')) || '';
            opts = Object.assign({}, opts, { body: JSON.stringify(body) });
          }
        } catch (e) {}
      }
      return _origFetch.call(this, url, opts);
    };
  })();

  // Dipanggil dari api() tiap halaman setelah dapat error dari server (perlu error.code atau
  // error.status berisi HTTP status-nya). Kalau 401 (token tidak valid/kadaluarsa): kasih tahu user,
  // bersihkan sesi lokal, lalu redirect ke login. Return true kalau ditangani (401), false kalau bukan
  // 401 (biar caller lanjut nampilin error generik seperti biasa).
  // Tiap halaman punya api() sendiri-sendiri (tidak ada wrapper fetch bersama), jadi helper ini dibuat
  // supaya pola "401 -> logout paksa" bisa dipakai ulang tanpa nulis ulang tiap halaman.
  function handleApiAuthError(error) {
    var code = error && (error.code !== undefined && error.code !== null ? error.code : error.status);
    if (Number(code) !== 401) return false;
    try {
      global.localStorage.removeItem('ps_token');
      global.localStorage.removeItem('ps_session');
    } catch (e) { /* ignore storage errors */ }
    try {
      global.alert('Sesi berakhir, silakan login ulang.');
    } catch (e) { /* ignore */ }
    try {
      global.location.replace('/pages/login/');
    } catch (e) { /* ignore */ }
    return true;
  }

  global.PSUI = {
    AUTOSAVE_DEBOUNCE_MS: AUTOSAVE_DEBOUNCE_MS,
    debounce: debounce,
    handleApiAuthError: handleApiAuthError,
    getLayerMountTarget: getLayerMountTarget,
    applyPermissionLock: applyPermissionLock,
    hidePageLoader: hidePageLoader,
    mountBulkToolbar: mountBulkToolbar,
    removeElement: removeElement,
    selectAllVisible: selectAllVisible,
    deselectAllVisible: deselectAllVisible,
    handleChecklistItemCheck: handleChecklistItemCheck,
    syncActionToolbar: syncActionToolbar,
    syncDialogScrollLock: syncDialogScrollLock,
    showPageLoader: showPageLoader,
    syncPaginationHosts: syncPaginationHosts,
    syncScrollButtons: syncScrollButtons
  };
}(window));







