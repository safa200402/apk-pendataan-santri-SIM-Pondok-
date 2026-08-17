(function (global) {
  var shellState = {
    desktopSidebar: null,
    brand: null,
    brandPromise: null,
    resizeBound: false,
    lastResizeWidth: null,
    roleScopeBound: false,
    roleScopeHideTimer: null,
    userMenuBound: false,
    userMenuHideTimer: null,
    pwaPrompt: null,
    pwaPromptBound: false
  };
  var SIDEBAR_SCROLL_KEY = 'ps_sidebar_scroll';
  var SIDEBAR_COLLAPSE_KEY = 'ps_sidebar_collapse_v2';
  var SIDEBAR_NAV_FILTER_KEY = 'ps_sidebar_nav_filter';
  var TAHUN_AJARAN_KEY = 'ps_tahun_ajaran';

  function getStoredTahunAjaranId() {
    try { return global.localStorage.getItem(TAHUN_AJARAN_KEY) || ''; } catch (e) { return ''; }
  }

  function setStoredTahunAjaranId(id) {
    try {
      if (id) { global.localStorage.setItem(TAHUN_AJARAN_KEY, id); }
      else { global.localStorage.removeItem(TAHUN_AJARAN_KEY); }
    } catch (e) {}
  }
  var DEFAULT_PORTAL_BRAND = {
    organizationName: 'Pendataan Santri',
    logoUrl: '/icons/icon-192.svg'
  };
  var SHELL_DISABLED_PAGES = {
    'login.html': true,
    'loginSantri.html': true
  };

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function resolveAssetUrl(url) {
    if (!url) return '';
    var s = String(url);
    if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) return s;
    return '/' + s;
  }

  function getContentMountTarget() {
    if (global.PSUI && typeof global.PSUI.getLayerMountTarget === 'function') {
      return global.PSUI.getLayerMountTarget('page');
    }
    return global.document.getElementById('pageRoot') || global.document.body;
  }

  function getStoredSessionFallback(storageKey) {
    try {
      return JSON.parse(global.localStorage.getItem(storageKey || 'ps_session') || 'null');
    } catch (error) {
      return null;
    }
  }

  function resolveSession(options) {
    if (options && options.session) {
      return options.session;
    }
    if (options && typeof options.getStoredSession === 'function') {
      return options.getStoredSession() || null;
    }
    return getStoredSessionFallback(options && options.storageKey);
  }

  function persistSession(session, options) {
    if (!session) return;
    try {
      global.localStorage.setItem((options && options.storageKey) || 'ps_session', JSON.stringify(session));
    } catch (error) {
      // Ignore storage write failures so the shell still renders.
    }
  }

  function getApiBase() {
    try {
      var stored = global.localStorage.getItem('ps_api_base');
      if (stored) {
        return stored;
      }
    } catch (error) {
      // Ignore storage read failures and fall back to hostname detection.
    }

    return global.location.origin + '/api';
  }

  function normalizePortalBrand(brand) {
    return {
      organizationName: String(brand && brand.organizationName ? brand.organizationName : DEFAULT_PORTAL_BRAND.organizationName).trim() || DEFAULT_PORTAL_BRAND.organizationName,
      logoUrl: resolveAssetUrl(String(brand && brand.logoUrl ? brand.logoUrl : DEFAULT_PORTAL_BRAND.logoUrl).trim() || DEFAULT_PORTAL_BRAND.logoUrl)
    };
  }

  function loadPortalBrand() {
    if (shellState.brand) {
      return Promise.resolve(shellState.brand);
    }
    if (shellState.brandPromise) {
      return shellState.brandPromise;
    }

    shellState.brandPromise = global.fetch(getApiBase() + '?action=portal.brand.public.get', { cache: 'no-store' })
      .then(function (response) { return response.json(); })
      .then(function (json) {
        return normalizePortalBrand(json && json.ok && json.data ? json.data.brand : null);
      })
      .catch(function () {
        return normalizePortalBrand(null);
      })
      .then(function (brand) {
        shellState.brand = brand;
        shellState.brandPromise = null;
        return brand;
      });

    return shellState.brandPromise;
  }

  function applyPortalBrand(brand) {
    var normalized = normalizePortalBrand(brand);
    var headerBrand = global.document.getElementById('shellHeaderBrandName');
    var sidebarBrand = global.document.getElementById('shellSidebarBrandName');
    var sidebarLogo = global.document.getElementById('shellSidebarBrandLogo');

    if (headerBrand) {
      headerBrand.textContent = normalized.organizationName;
    }
    if (sidebarBrand) {
      sidebarBrand.textContent = normalized.organizationName;
    }
    if (sidebarLogo) {
      sidebarLogo.dataset.fallbackSrc = DEFAULT_PORTAL_BRAND.logoUrl;
      sidebarLogo.alt = 'Logo ' + normalized.organizationName;
      sidebarLogo.removeAttribute('srcset');
      sidebarLogo.onerror = function () {
        if (sidebarLogo.src.indexOf(DEFAULT_PORTAL_BRAND.logoUrl) !== -1) {
          return;
        }
        sidebarLogo.src = DEFAULT_PORTAL_BRAND.logoUrl;
      };
      sidebarLogo.setAttribute('src', normalized.logoUrl);
      sidebarLogo.src = normalized.logoUrl;
    }

    // Update browser tab favicon if a custom logo is set
    var isCustomLogo = normalized.logoUrl !== DEFAULT_PORTAL_BRAND.logoUrl;
    if (isCustomLogo) {
      var existingFavicon = global.document.querySelector('link[rel="icon"]');
      var faviconUrl = normalized.logoUrl;
      if (existingFavicon) {
        existingFavicon.setAttribute('href', faviconUrl);
      } else {
        var newFavicon = global.document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.href = faviconUrl;
        global.document.head.appendChild(newFavicon);
      }
    }
  }

  function syncPortalBrand() {
    return loadPortalBrand().then(function (brand) {
      applyPortalBrand(brand);
      return brand;
    });
  }

  function getCurrentPage(options) {
    if (options && options.currentPage) {
      return options.currentPage;
    }
    if (global.PSAccess && typeof global.PSAccess.cleanFileName === 'function') {
      return global.PSAccess.cleanFileName(global.location.pathname);
    }
    var parts = String(global.location.pathname || '').split('/').filter(Boolean);
    var last = parts[parts.length - 1] || '';
    if (!last) return 'dashboard.html';
    return last.endsWith('.html') ? last : last + '.html';
  }

  function isShellDisabled(options, currentPage) {
    var body = global.document.body;
    if (options && options.disabled) {
      return true;
    }
    if (body && body.dataset && body.dataset.shell === 'off') {
      return true;
    }
    return !!SHELL_DISABLED_PAGES[currentPage];
  }

  function getCurrentItem(currentPage) {
    return global.PSNav && typeof global.PSNav.findItem === 'function'
      ? global.PSNav.findItem(currentPage)
      : null;
  }

  function stripAccessMark(label) {
    return String(label || '').replace(/^\*+\s*/, '');
  }

  function getCurrentTitle(currentPage) {
    var item = getCurrentItem(currentPage);
    return item ? stripAccessMark(item.label) : 'Panel';
  }

  function getScopedSession(session) {
    return global.PSAccess && typeof global.PSAccess.getScopedSession === 'function'
      ? global.PSAccess.getScopedSession(session)
      : session;
  }

  function getRoleLabel(session) {
    if (session && session.primaryJabatanLabel) {
      return session.primaryJabatanLabel;
    }
    if (session && session.permissions && session.permissions.label) {
      return session.permissions.label;
    }
    if (session && session.role === 'santri') {
      return 'Santri';
    }
    return 'Admin';
  }

  function getUserName(session) {
    return session && session.name ? session.name : 'Pengguna';
  }

  function getUserInitials(session) {
    var words = getUserName(session).split(/\s+/).filter(Boolean);
    if (!words.length) {
      return 'PG';
    }
    return words.slice(0, 2).map(function (word) {
      return word.charAt(0).toUpperCase();
    }).join('');
  }

  function getUserPhotoUrl(session) {
    return session && session.photoUrl ? resolveAssetUrl(session.photoUrl) : '';
  }

  function buildUserAvatarHtml(session) {
    var photoUrl = getUserPhotoUrl(session);
    if (photoUrl) {
      return '<img src="' + escapeHtml(photoUrl) + '" alt="' + escapeHtml(getUserName(session)) + '">';
    }
    return escapeHtml(getUserInitials(session));
  }

  function getVisibleGroups(session) {
    session = getScopedSession(session);
    var groups = global.PSNav && global.PSNav.groups ? global.PSNav.groups : [];
    return groups.reduce(function (list, group) {
      if (group.hidden) return list;
      var items = (group.items || []).filter(function (item) {
        if (global.PSAccess && typeof global.PSAccess.canShowNavItem === 'function') {
          return global.PSAccess.canShowNavItem(session, item.href);
        }
        if (typeof item.isVisible === 'function') {
          return item.isVisible(session, global.PSAccess || null);
        }
        if (global.PSAccess && typeof global.PSAccess.canAccessPage === 'function') {
          return global.PSAccess.canAccessPage(session, item.href);
        }
        return true;
      });
      if (items.length) {
        list.push({
          title: group.title,
          pinned: !!group.pinned,
          items: items
        });
      }
      return list;
    }, []);
  }

  function ensureHeader(title) {
    var header = global.document.querySelector('.app-header');
    var host = getContentMountTarget();
    if (!header) {
      header = global.document.createElement('header');
      header.className = 'app-header';
      if (host && host.firstChild) {
        host.insertBefore(header, host.firstChild);
      } else if (host) {
        host.appendChild(header);
      }
    } else {
      header.hidden = false;
    }

    header.innerHTML = [
      '<div class="header-left">',
      '  <button class="drawer-toggle" id="navToggle" type="button" aria-label="Toggle sidebar">Menu</button>',
      '  <div class="header-brand" id="shellHeaderBrandName">Pendataan Santri</div>',
      '  <div class="header-page">' + escapeHtml(title) + '</div>',
      '</div>',
      '<div class="header-right">',
      '  <span class="header-chip" id="headerRole">Admin</span>',
      '  <div class="role-scope-menu" id="headerRoleMenu" hidden></div>',
      '</div>'
    ].join('');
  }

  function ensureBackdrop() {
    var backdrop = global.document.getElementById('navBackdrop');
    var host = getContentMountTarget();
    if (!backdrop) {
      backdrop = global.document.createElement('div');
      backdrop.className = 'drawer-backdrop';
      backdrop.id = 'navBackdrop';
      var noticeStack = global.document.getElementById('noticeStack');
      if (noticeStack && noticeStack.parentNode === host) {
        host.insertBefore(backdrop, noticeStack);
      } else {
        host.appendChild(backdrop);
      }
    }
  }

  function ensureContentStack(appLayout, navSection) {
    var contentStack = appLayout.querySelector('.content-stack');
    if (!contentStack) {
      contentStack = global.document.createElement('div');
      contentStack.className = 'content-stack';
      var siblings = [];
      var cursor = navSection.nextSibling;
      while (cursor) {
        siblings.push(cursor);
        cursor = cursor.nextSibling;
      }
      appLayout.appendChild(contentStack);
      siblings.forEach(function (node) {
        if (node.nodeType === 1) {
          contentStack.appendChild(node);
        }
      });
    }
    return contentStack;
  }

  function ensureSidebarLayer(navElement) {
    if (!navElement) {
      return null;
    }

    var body = getContentMountTarget();
    var noticeStack = global.document.getElementById('noticeStack');
    var backdrop = global.document.getElementById('navBackdrop');

    if (navElement.parentNode === body) {
      if (noticeStack && noticeStack.parentNode === body && navElement.nextSibling !== noticeStack) {
        body.insertBefore(navElement, noticeStack);
      } else if ((!noticeStack || noticeStack.parentNode !== body) && backdrop && navElement.previousSibling !== backdrop) {
        if (backdrop.nextSibling) {
          body.insertBefore(navElement, backdrop.nextSibling);
        } else {
          body.appendChild(navElement);
        }
      }
      return navElement;
    }

    if (noticeStack && noticeStack.parentNode === body) {
      body.insertBefore(navElement, noticeStack);
      return navElement;
    }

    if (backdrop && backdrop.parentNode === body) {
      if (backdrop.nextSibling) {
        body.insertBefore(navElement, backdrop.nextSibling);
      } else {
        body.appendChild(navElement);
      }
      return navElement;
    }

    body.appendChild(navElement);
    return navElement;
  }

  function convertLegacyNav(navElement) {
    var navPanel = navElement.closest('.panel') || navElement;
    var appLayout = global.document.createElement('div');
    var sidebar = global.document.createElement('section');
    var contentStack = global.document.createElement('div');
    var cursor = navPanel.nextSibling;
    var moveNodes = [];

    appLayout.className = 'app-layout';
    sidebar.className = 'shell-sidebar';
    sidebar.id = 'nav';
    contentStack.className = 'content-stack';

    while (cursor) {
      moveNodes.push(cursor);
      cursor = cursor.nextSibling;
    }

    navPanel.parentNode.insertBefore(appLayout, navPanel);
    navPanel.parentNode.removeChild(navPanel);
    appLayout.appendChild(sidebar);
    appLayout.appendChild(contentStack);

    moveNodes.forEach(function (node) {
      if (node.nodeType === 1) {
        contentStack.appendChild(node);
      }
    });

    return sidebar;
  }

  function ensureShellLayout() {
    global.document.body.classList.add('page-shell');

    var navElement = global.document.getElementById('nav');
    if (!navElement) {
      return null;
    }

    var isAlreadyShellSidebar = navElement.tagName === 'SECTION' && navElement.classList.contains('shell-sidebar');
    var isInsideAppLayout = !!navElement.closest('.app-layout');
    if (!isAlreadyShellSidebar && !isInsideAppLayout) {
      navElement = convertLegacyNav(navElement);
    }
    navElement.className = 'shell-sidebar';

    var appLayout = navElement.closest('.app-layout');
    if (!appLayout) {
      appLayout = global.document.createElement('div');
      appLayout.className = 'app-layout';
      navElement.parentNode.insertBefore(appLayout, navElement);
      appLayout.appendChild(navElement);
    }

    ensureContentStack(appLayout, navElement);
    ensureSidebarLayer(navElement);
    return navElement;
  }

  function renderSidebar(navElement, currentPage, session) {
    if (!navElement) return;

    var scopedSession = getScopedSession(session);
    var visibleGroups = getVisibleGroups(session);
    var currentTitle = getCurrentTitle(currentPage);
    var collapseState = getCollapseState();
    var sectionHtml = visibleGroups.map(function (group) {
      var isPinned = !!group.pinned;
      var sectionKey = getSectionKey(group.title);

      var hasActive = group.items.some(function (item) {
        var cleanedHref = global.PSAccess && typeof global.PSAccess.cleanFileName === 'function'
          ? global.PSAccess.cleanFileName(item.href) : item.href;
        return cleanedHref === currentPage;
      });

      if (hasActive && !collapseState[sectionKey]) {
        collapseState[sectionKey] = 1;
        setCollapseState(collapseState);
      }

      var isCollapsed = !hasActive && !collapseState[sectionKey];

      var items = group.items.map(function (item) {
        var cleanedHref = global.PSAccess && typeof global.PSAccess.cleanFileName === 'function' ? global.PSAccess.cleanFileName(item.href) : item.href;
        var active = cleanedHref === currentPage ? ' active' : '';
        var linkExtra = isPinned ? ' sidebar-link--pinned' : '';
        return '<a class="sidebar-link' + active + linkExtra + '" href="' + escapeHtml(item.href) + '" title="' + escapeHtml(item.description || '') + '"' + (active ? ' aria-current="page"' : '') + '><span class="sidebar-link-label">' + escapeHtml(item.label) + '</span></a>';
      }).join('');

      var sectionClasses = 'sidebar-section'
        + (isPinned ? ' sidebar-section--pinned' : '')
        + (isCollapsed ? ' sidebar-section--collapsed' : '');
      return [
        '<section class="' + sectionClasses + '" data-section-key="' + escapeHtml(sectionKey) + '">',
        '  <h3 class="sidebar-section-title" role="button" tabindex="0">' + escapeHtml(group.title) + '</h3>',
        '  <div class="sidebar-links">' + items + '</div>',
        '</section>'
      ].join('');
    }).join('');

    var totalLinks = visibleGroups.reduce(function (acc, g) { return acc + g.items.length; }, 0);
    var savedNavFilter = '';
    try { savedNavFilter = global.sessionStorage.getItem(SIDEBAR_NAV_FILTER_KEY) || ''; } catch (e) {}
    var navFilterHtml = totalLinks > 7
      ? '<div class="sidebar-nav-search"><input type="search" id="sidebarNavFilter" class="sidebar-nav-filter" placeholder="Cari menu..." autocomplete="off" spellcheck="false" value="' + escapeHtml(savedNavFilter) + '"></div>'
      : '';

    navElement.innerHTML = [
      '<div class="sidebar-brand" data-no-collapse>',
      '  <img class="sidebar-logo" id="shellSidebarBrandLogo" src="/icons/icon-192.svg" alt="Logo Pendataan Santri">',
      '  <div class="sidebar-copy">',
      '    <strong id="shellSidebarBrandName">Pendataan Santri</strong>',
      '    <span>' + escapeHtml(currentTitle) + '</span>',
      '  </div>',
      '</div>',
      '<div class="sidebar-scroll">',
      navFilterHtml,
      '  <div class="sidebar-sections">',
      sectionHtml || '<div class="sidebar-empty">Belum ada menu yang bisa diakses pada akun ini.</div>',
      '  </div>',
      '</div>',
      '<div class="sidebar-footer">',
      '  <span class="sidebar-user-label">User Aktif</span>',
      '  <div class="sidebar-user-menu" id="sidebarUserMenu" hidden aria-hidden="true">',
      '    <div class="sidebar-links">',
      '      <a class="sidebar-link" href="/pages/beranda/"><span class="sidebar-link-label">Beranda</span></a>',
      '      <a class="sidebar-link" href="/pages/accountProfile/"><span class="sidebar-link-label">Profil Akun</span></a>',
      '      <a class="sidebar-link" href="/pages/changePassword/"><span class="sidebar-link-label">Ganti Password</span></a>',
      (session && session.role === 'pengurus' ? '      <a class="sidebar-link" href="/pages/riwayat/"><span class="sidebar-link-label">Riwayat</span></a>' : ''),
      '      <a class="sidebar-link" href="/pages/logout/"><span class="sidebar-link-label">Logout</span></a>',
      '      <button class="sidebar-link" id="pwaInstallBtn" type="button" hidden><span class="sidebar-link-label">Download App</span></button>',
      '    </div>',
      '  </div>',
      '  <div class="sidebar-user-card" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false">',
      '    <div class="sidebar-user-avatar' + (getUserPhotoUrl(scopedSession) ? ' has-photo' : '') + '" id="sidebarUserInitials">' + buildUserAvatarHtml(scopedSession) + '</div>',
      '    <div class="sidebar-user-meta">',
      '      <strong class="sidebar-user-name" id="sidebarUserName">' + escapeHtml(getUserName(scopedSession)) + '</strong>',
      '      <span class="sidebar-role-pill" id="sidebarRoleLabel">' + escapeHtml(getRoleLabel(scopedSession)) + '</span>',
      '    </div>',
      '  </div>',
      '  <p class="sidebar-copyright">&copy; Darul Istifadah Wal Ifadah</p>',
      '</div>'
    ].join('');

    bindSidebarCollapse(navElement);
  }

  function saveSidebarScroll(scrollTop) {
    try {
      global.localStorage.setItem(SIDEBAR_SCROLL_KEY, String(Math.round(scrollTop)));
    } catch (e) {}
  }

  function getSavedSidebarScroll() {
    try {
      var v = global.localStorage.getItem(SIDEBAR_SCROLL_KEY);
      return v !== null ? Math.max(0, Number(v) || 0) : -1;
    } catch (e) { return -1; }
  }

  function getSectionKey(title) {
    return String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function getCollapseState() {
    try {
      return JSON.parse(global.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) || '{}');
    } catch (e) { return {}; }
  }

  function setCollapseState(state) {
    try {
      global.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function bindSidebarCollapse(navElement) {
    if (!navElement) return;

    var titles = navElement.querySelectorAll('.sidebar-section-title');
    for (var j = 0; j < titles.length; j++) {
      (function (title) {
        var sec = title.closest('.sidebar-section[data-section-key]');
        if (!sec) return;
        var k = sec.getAttribute('data-section-key');

        function onToggle() {
          var collapsed = sec.classList.toggle('sidebar-section--collapsed');
          var st = getCollapseState();
          if (collapsed) { delete st[k]; } else { st[k] = 1; }
          setCollapseState(st);
        }

        title.addEventListener('click', onToggle);
        title.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }
        });
      }(titles[j]));
    }

    var sectionsEl = navElement.querySelector('.sidebar-sections');
    if (sectionsEl) {
      var lastClickTarget = null;
      var lastClickTime = 0;

      sectionsEl.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        var now = Date.now();
        var sameTarget = e.target === lastClickTarget;
        var withinHalfSecond = (now - lastClickTime) <= 150;

        if (sameTarget && withinHalfSecond) {
          lastClickTarget = null;
          lastClickTime = 0;
          var sections = navElement.querySelectorAll('.sidebar-section[data-section-key]');
          var anyCollapsed = false;
          for (var i = 0; i < sections.length; i++) {
            if (sections[i].classList.contains('sidebar-section--collapsed')) { anyCollapsed = true; break; }
          }
          var st = getCollapseState();
          for (var j = 0; j < sections.length; j++) {
            var k = sections[j].getAttribute('data-section-key');
            if (anyCollapsed) {
              sections[j].classList.remove('sidebar-section--collapsed');
              st[k] = 1;
            } else {
              sections[j].classList.add('sidebar-section--collapsed');
              delete st[k];
            }
          }
          setCollapseState(st);
        } else {
          lastClickTarget = e.target;
          lastClickTime = now;
        }
      });
    }
  }

  function applySidebarNavFilter(navElement, query) {
    if (!navElement) return;
    var q = (query || '').toLowerCase().trim();
    var sections = navElement.querySelectorAll('.sidebar-section');
    for (var i = 0; i < sections.length; i++) {
      var section = sections[i];
      var links = section.querySelectorAll('.sidebar-link');
      var anyVisible = false;
      for (var j = 0; j < links.length; j++) {
        var isActive = links[j].classList.contains('active');
        var label = (links[j].textContent || '').toLowerCase();
        var show = !q || isActive || label.indexOf(q) !== -1;
        links[j].style.display = show ? '' : 'none';
        if (show) anyVisible = true;
      }
      section.style.display = (!q || anyVisible) ? '' : 'none';
    }
  }

  function bindSidebarNavFilter(navElement) {
    if (!navElement) return;
    var filterInput = navElement.querySelector('#sidebarNavFilter');
    if (!filterInput || filterInput.dataset.filterBound) return;
    filterInput.dataset.filterBound = 'true';

    var savedValue = '';
    try { savedValue = global.sessionStorage.getItem(SIDEBAR_NAV_FILTER_KEY) || ''; } catch (e) {}
    if (savedValue) applySidebarNavFilter(navElement, savedValue);

    filterInput.addEventListener('input', function () {
      var q = filterInput.value;
      try { global.sessionStorage.setItem(SIDEBAR_NAV_FILTER_KEY, q); } catch (e) {}
      applySidebarNavFilter(navElement, q);
    });

    filterInput.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        filterInput.value = '';
        try { global.sessionStorage.removeItem(SIDEBAR_NAV_FILTER_KEY); } catch (e) {}
        applySidebarNavFilter(navElement, '');
      }
    });
  }

  function restoreAndBindSidebarScroll(navElement) {
    if (!navElement) return;
    var scrollContainer = navElement.querySelector('.sidebar-scroll');
    if (!scrollContainer) return;
    var saved = getSavedSidebarScroll();
    if (saved >= 0) {
      scrollContainer.scrollTop = saved;
    }
    if (!scrollContainer.dataset.scrollBound) {
      scrollContainer.addEventListener('scroll', function () {
        saveSidebarScroll(scrollContainer.scrollTop);
      }, { passive: true });
      scrollContainer.dataset.scrollBound = 'true';
    }
    bindSidebarNavFilter(navElement);
  }

  function scrollSidebarToActiveLink(navElement) {
    if (!navElement) return;
    var activeLink = navElement.querySelector('.sidebar-link.active');
    if (!activeLink) return;
    var scrollContainer = navElement.querySelector('.sidebar-scroll');
    if (!scrollContainer) return;
    var linkOffsetTop = activeLink.offsetTop - 125;
    var containerScrollTop = scrollContainer.scrollTop;
    var containerHeight = scrollContainer.clientHeight;
    var linkHeight = activeLink.clientHeight;
    var targetScroll = linkOffsetTop - 16;
    if (targetScroll < containerScrollTop || linkOffsetTop + linkHeight > containerScrollTop + containerHeight) {
      scrollContainer.scrollTop = Math.max(0, targetScroll);
    }
  }

  function setRoleScopeMenuState(menu, chip, shouldOpen) {
    if (!menu) {
      return;
    }

    if (shellState.roleScopeHideTimer) {
      global.clearTimeout(shellState.roleScopeHideTimer);
      shellState.roleScopeHideTimer = null;
    }

    if (shouldOpen) {
      menu.hidden = false;
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      menu.inert = false;
      global.document.body.classList.add('role-scope-open');
      if (chip) {
        chip.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    menu.inert = true;
    global.document.body.classList.remove('role-scope-open');
    if (chip) {
      chip.setAttribute('aria-expanded', 'false');
    }
    shellState.roleScopeHideTimer = global.setTimeout(function () {
      menu.hidden = true;
    }, 180);
  }

  function closeRoleScopeMenu() {
    var menu = global.document.getElementById('headerRoleMenu');
    var chip = global.document.getElementById('headerRole');
    setRoleScopeMenuState(menu, chip, false);
  }

  function setUserMenuState(shouldOpen, anchorCard) {
    var menu = global.document.getElementById('sidebarUserMenu');
    if (!menu) return;

    if (shellState.userMenuHideTimer) {
      global.clearTimeout(shellState.userMenuHideTimer);
      shellState.userMenuHideTimer = null;
    }

    if (shouldOpen) {
      if (anchorCard) {
        var rect = anchorCard.getBoundingClientRect();
        // menu.style.left = rect.left + 'px';
        // menu.style.width = rect.width + 'px';
        // menu.style.bottom = (global.innerHeight - rect.top + 8) + 'px';
        // menu.style.top = 'auto';
        anchorCard.setAttribute('aria-expanded', 'true');
      }
      menu.hidden = false;
      void menu.offsetWidth; // paksa reflow agar transisi CSS berjalan
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      return;
    }

    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    var card = global.document.querySelector('#nav .sidebar-user-card');
    if (card) card.setAttribute('aria-expanded', 'false');
    shellState.userMenuHideTimer = global.setTimeout(function () {
      menu.hidden = true;
    }, 200);
  }

  function closeUserMenu() {
    setUserMenuState(false);
  }

  function bindUserMenu() {
    var nav = global.document.getElementById('nav');
    if (!nav) return;

    var card = nav.querySelector('.sidebar-user-card');
    if (!card) return;

    // Hapus semua salinan menu yang sudah ada di body (stale dari render sebelumnya)
    for (var i = global.document.body.children.length - 1; i >= 0; i--) {
      if (global.document.body.children[i].id === 'sidebarUserMenu') {
        global.document.body.removeChild(global.document.body.children[i]);
      }
    }
    // Pindahkan menu dari nav ke body agar lepas dari transform/overflow sidebar
    var navMenu = nav.querySelector('#sidebarUserMenu');
    if (navMenu) {
      global.document.body.appendChild(navMenu);
    }

    card.onclick = function (event) {
      event.stopPropagation();
      var menu = global.document.getElementById('sidebarUserMenu');
      var isOpen = menu && !menu.hidden && menu.classList.contains('is-open');
      setUserMenuState(!isOpen, card);
    };

    card.onkeydown = function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.onclick(event);
      }
    };

    if (!shellState.userMenuBound) {
      global.document.addEventListener('click', function () {
        closeUserMenu();
      });
      global.document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          closeUserMenu();
        }
      });
      shellState.userMenuBound = true;
    }
  }

  // Urutan prioritas tampilan dropdown ganti jabatan (.role-scope-options) -- jabatan di daftar
  // ini SELALU ditaruh paling atas (sesuai urutan di sini), sisanya menyusul dgn urutan aslinya.
  // Ini murni urutan TAMPILAN; tidak mempengaruhi getRoleScopeOptions/getScopedSession (jabatan
  // "utama"/default scope tetap ditentukan dari urutan asli session.roleScopeOptions).
  var ROLE_SCOPE_DISPLAY_PRIORITY_ = ['super admin', 'ketua yayasan', 'dewan penasehat', 'pengampu halaqoh', 'pembina yayasan'];
  function sortRoleScopeOptionsForDisplay_(options) {
    return (options || []).slice().sort(function (a, b) {
      var ai = ROLE_SCOPE_DISPLAY_PRIORITY_.indexOf(String((a && a.label) || '').toLowerCase());
      var bi = ROLE_SCOPE_DISPLAY_PRIORITY_.indexOf(String((b && b.label) || '').toLowerCase());
      var aRank = ai === -1 ? ROLE_SCOPE_DISPLAY_PRIORITY_.length : ai;
      var bRank = bi === -1 ? ROLE_SCOPE_DISPLAY_PRIORITY_.length : bi;
      return aRank - bRank;
    });
  }

  function renderRoleScopeMenu(currentPage, session) {
    var menu = global.document.getElementById('headerRoleMenu');
    var chip = global.document.getElementById('headerRole');
    var options = global.PSAccess && typeof global.PSAccess.getRoleScopeOptions === 'function'
      ? global.PSAccess.getRoleScopeOptions(session)
      : [];
    options = sortRoleScopeOptionsForDisplay_(options);
    var activeLabel = global.PSAccess && typeof global.PSAccess.getActiveRoleScopeLabel === 'function'
      ? (global.PSAccess.getActiveRoleScopeLabel(session) || getRoleLabel(session))
      : getRoleLabel(session);

    if (!menu || !chip) {
      return;
    }

    if (!options.length) {
      chip.classList.remove('role-switchable');
      setRoleScopeMenuState(menu, chip, false);
      menu.innerHTML = '';
      chip.removeAttribute('aria-haspopup');
      chip.removeAttribute('aria-expanded');
      return;
    }

    chip.classList.add('role-switchable');
    chip.setAttribute('aria-haspopup', 'true');
    chip.setAttribute('aria-expanded', 'false');
    var searchHtml = options.length > 7
      ? '<div class="role-scope-search"><input type="text" class="role-scope-filter" placeholder="Cari jabatan..." autocomplete="off" spellcheck="false"></div>'
      : '';
    menu.innerHTML = searchHtml + '<div class="role-scope-options">' + options.map(function (option) {
      var active = String(option.label || '').toLowerCase() === String(activeLabel || '').toLowerCase() ? ' active' : '';
      return '<button class="role-scope-option' + active + '" type="button" data-role-scope="' + escapeHtml(option.label) + '">' + escapeHtml(option.label) + '</button>';
    }).join('') + '</div>';
    setRoleScopeMenuState(menu, chip, false);
  }

  function syncIdentity(options) {
    var session = resolveSession(options || {});
    var scopedSession = getScopedSession(session);
    var currentPage = getCurrentPage(options || {});
    if (session) {
      persistSession(session, options || {});
    }

    var navElement = global.document.getElementById('nav');
    if (navElement) {
      renderSidebar(navElement, currentPage, session);
      restoreAndBindSidebarScroll(navElement);
      scrollSidebarToActiveLink(navElement);
    }
    applyPortalBrand(shellState.brand || DEFAULT_PORTAL_BRAND);
    renderRoleScopeMenu(currentPage, session);
    bindRoleScope(currentPage, session);
    bindUserMenu();
    bindPwaInstall();

    var title = getCurrentTitle(currentPage);
    var headerPage = global.document.querySelector('.header-page');
    if (headerPage) {
      headerPage.textContent = title;
    }

    var roleLabel = getRoleLabel(scopedSession);
    var headerRole = global.document.getElementById('headerRole');
    if (headerRole) {
      headerRole.textContent = roleLabel;
    }

    var sidebarRole = global.document.getElementById('sidebarRoleLabel');
    if (sidebarRole) {
      sidebarRole.textContent = roleLabel;
    }

    var sidebarUser = global.document.getElementById('sidebarUserName');
    if (sidebarUser) {
      sidebarUser.textContent = getUserName(scopedSession);
    }

    var sidebarInitials = global.document.getElementById('sidebarUserInitials');
    if (sidebarInitials) {
      sidebarInitials.classList.toggle('has-photo', !!getUserPhotoUrl(scopedSession));
      sidebarInitials.innerHTML = buildUserAvatarHtml(scopedSession);
      var avatarImage = sidebarInitials.querySelector('img');
      if (avatarImage) {
        avatarImage.addEventListener('error', function () {
          sidebarInitials.classList.remove('has-photo');
          sidebarInitials.textContent = getUserInitials(scopedSession);
        }, { once: true });
      }
    }
  }

  function syncDrawer(force) {
    var desktop = global.matchMedia('(min-width: 961px)').matches;
    if (force || shellState.desktopSidebar === null || shellState.desktopSidebar !== desktop) {
      global.document.body.classList.toggle('sidebar-open', desktop);
    }
    shellState.desktopSidebar = desktop;
  }

  function toggleDrawer(forceOpen) {
    var shouldOpen = typeof forceOpen === 'boolean'
      ? forceOpen
      : !global.document.body.classList.contains('sidebar-open');
    global.document.body.classList.toggle('sidebar-open', shouldOpen);
  }

  function bindDrawer() {
    var navToggle = global.document.getElementById('navToggle');
    var navBackdrop = global.document.getElementById('navBackdrop');
    var nav = global.document.getElementById('nav');

    if (navToggle) {
      navToggle.onclick = function () {
        toggleDrawer();
      };
    }

    if (navBackdrop) {
      navBackdrop.onclick = function () {
        toggleDrawer(false);
        closeRoleScopeMenu();
      };
    }

    if (nav) {
      nav.onclick = function (event) {
        if (event.target.closest('a') && !global.matchMedia('(min-width: 961px)').matches) {
          toggleDrawer(false);
        }
      };
    }

    if (!shellState.resizeBound) {
      shellState.lastResizeWidth = global.innerWidth;
      global.addEventListener('resize', function () {
        var currentWidth = global.innerWidth;
        if (currentWidth === shellState.lastResizeWidth) {
          // Lebar tidak berubah -> ini kemungkinan keyboard mobile muncul/hilang
          // (viewport height berubah), bukan resize/orientation sungguhan. Abaikan
          // agar role-scope-menu tidak ikut tertutup saat filter input di-fokus.
          return;
        }
        shellState.lastResizeWidth = currentWidth;
        syncDrawer(false);
        closeRoleScopeMenu();
      });
      shellState.resizeBound = true;
    }
  }

  function bindRoleScope(currentPage, session) {
    var chip = global.document.getElementById('headerRole');
    var menu = global.document.getElementById('headerRoleMenu');
    var options = global.PSAccess && typeof global.PSAccess.getRoleScopeOptions === 'function'
      ? global.PSAccess.getRoleScopeOptions(session)
      : [];

    if (!chip || !menu || !options.length) {
      if (chip) {
        chip.onclick = null;
      }
      if (menu) {
        menu.onclick = null;
      }
      closeRoleScopeMenu();
      return;
    }

    chip.onclick = function (event) {
      event.stopPropagation();
      var shouldOpen = menu.hidden || !menu.classList.contains('is-open');
      closeRoleScopeMenu();
      if (shouldOpen) {
        setRoleScopeMenuState(menu, chip, true);
        var filterInput = menu.querySelector('.role-scope-filter');
        if (filterInput) {
          filterInput.value = '';
          menu.querySelectorAll('[data-role-scope]').forEach(function (btn) { btn.hidden = false; });
          global.setTimeout(function () { filterInput.focus(); }, 60);
        }
      }
    };

    menu.onclick = function (event) {
      if (event.target.closest('.role-scope-filter')) {
        event.stopPropagation();
        return;
      }
      var option = event.target.closest('[data-role-scope]');
      if (!option) {
        return;
      }
      event.stopPropagation();
      if (global.PSAccess && typeof global.PSAccess.setRoleScope === 'function') {
        global.PSAccess.setRoleScope(session, option.getAttribute('data-role-scope'));
      }
      closeRoleScopeMenu();
      if (global.PSAccess && typeof global.PSAccess.redirectIfForbidden === 'function' && global.PSAccess.redirectIfForbidden(session, currentPage)) {
        return;
      }
      global.location.reload();
    };

    var filterInput = menu.querySelector('.role-scope-filter');
    if (filterInput) {
      filterInput.oninput = function () {
        var query = filterInput.value.trim().toLowerCase();
        menu.querySelectorAll('[data-role-scope]').forEach(function (btn) {
          btn.hidden = !!(query && (btn.getAttribute('data-role-scope') || '').toLowerCase().indexOf(query) === -1);
        });
      };
    }

    if (!shellState.roleScopeBound) {
      global.document.addEventListener('click', function () {
        closeRoleScopeMenu();
      });
      global.document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          closeRoleScopeMenu();
        }
      });
      shellState.roleScopeBound = true;
    }
  }

  function refreshSessionInBackground(storageKey) {
    var session = getStoredSessionFallback(storageKey);
    var token = session && session.token;
    if (!token) return;
    global.fetch(getApiBase() + '?action=session&token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json || !json.ok || !json.data || !json.data.session) return;
        var fresh = json.data.session;
        var cached = getStoredSessionFallback(storageKey);
        var freshOpts = JSON.stringify((fresh.roleScopeOptions || []).slice().sort());
        var cachedOpts = JSON.stringify(((cached && cached.roleScopeOptions) || []).slice().sort());
        var freshNav = JSON.stringify((fresh.permissions && fresh.permissions.navVisiblePages || []).slice().sort());
        var cachedNav = JSON.stringify(((cached && cached.permissions && cached.permissions.navVisiblePages) || []).slice().sort());
        var freshLevel = (fresh.permissions && fresh.permissions.accessLevel) || '';
        var cachedLevel = ((cached && cached.permissions && cached.permissions.accessLevel) || '');
        var navRelevantChanged = !(freshOpts === cachedOpts && freshNav === cachedNav && freshLevel === cachedLevel);
        // Selalu simpan sesi terbaru (field permission lain—di luar nav—bisa saja berubah di server
        // tanpa mengubah navVisiblePages/accessLevel/roleScopeOptions, mis. flag hak akses fitur baru).
        // Render ulang sidebar/menu scope cuma kalau memang ada yg relevan buat nav yang berubah,
        // supaya tidak ada re-render/flicker yang tak perlu.
        try {
          global.localStorage.setItem(storageKey || 'ps_session', JSON.stringify(fresh));
        } catch (e) { return; }
        if (!navRelevantChanged) return;
        var currentPage = getCurrentPage({});
        renderRoleScopeMenu(currentPage, fresh);
        bindRoleScope(currentPage, fresh);
        var navEl = global.document.getElementById('nav');
        if (navEl) renderSidebar(navEl, currentPage, fresh);
      })
      .catch(function () {});
  }

  function bindPwaInstall() {
    if (!shellState.pwaPromptBound) {
      shellState.pwaPromptBound = true;
      global.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        shellState.pwaPrompt = e;
        var btn = global.document.getElementById('pwaInstallBtn');
        if (btn) { btn.hidden = false; btn.disabled = false; }
      });
      global.addEventListener('appinstalled', function () {
        shellState.pwaPrompt = null;
        var btn = global.document.getElementById('pwaInstallBtn');
        if (btn) { btn.disabled = true; }
      });
    }
    var btn = global.document.getElementById('pwaInstallBtn');
    if (!btn) return;
    if (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) {
      btn.hidden = true;
      return;
    }
    btn.hidden = !shellState.pwaPrompt;
    btn.disabled = false;
    btn.onclick = function () {
      var prompt = shellState.pwaPrompt;
      if (!prompt) return;
      prompt.prompt();
      prompt.userChoice.then(function (choice) {
        if (choice.outcome === 'accepted') {
          shellState.pwaPrompt = null;
          btn.disabled = true;
        }
      });
    };
  }

  function mount(options) {
    var currentPage = getCurrentPage(options || {});
    if (isShellDisabled(options || {}, currentPage)) {
      return null;
    }
    var session = resolveSession(options || {});
    ensureHeader(getCurrentTitle(currentPage));
    ensureBackdrop();
    var navElement = ensureShellLayout();
    renderSidebar(navElement, currentPage, session);
    restoreAndBindSidebarScroll(navElement);
    scrollSidebarToActiveLink(navElement);
    syncIdentity({
      currentPage: currentPage,
      session: session,
      getStoredSession: options && options.getStoredSession,
      storageKey: options && options.storageKey
    });
    renderRoleScopeMenu(currentPage, session);
    bindDrawer();
    bindRoleScope(currentPage, session);
    syncDrawer(false);
    syncPortalBrand();
    refreshSessionInBackground(options && options.storageKey);
    listenForSwUpdate();
    bindPwaInstall();
    syncMaintenanceBanner(options);
    syncAnnouncementPopup(options);
    syncAbsensiHalaqohAudit(options);
    syncAuditBawahanWidget(options);
    syncSurveyQueue(options);
    return navElement;
  }

  function syncMaintenanceBanner(options) {
    var session = resolveSession(options || {});
    var token = (session && session.token) || '';
    if (!token) return;
    fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'system.maintenance.get', token: token })
    }).then(function (r) { return r.json(); }).then(function (json) {
      if (!json.ok || !json.data || !json.data.active) return;
      if (/\/pages\/superAdmin\//i.test(global.location.pathname)) return;
      var existing = global.document.getElementById('_maintenanceBanner');
      if (existing) return;
      var msg = json.data.message || 'Sistem sedang dalam maintenance. Perubahan data sementara dinonaktifkan.';
      var banner = global.document.createElement('div');
      banner.id = '_maintenanceBanner';
      banner.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'z-index:9999',
        'width:100%', 'height:100%', 'margin:0',
        'background:rgb(146,64,14)', 'color:rgb(254,243,199)',
        'padding:10px 20px', 'font-size:13px', 'font-weight:700',
        'display:flex', 'align-items:center', 'gap:10px',
        'border-bottom:2px solid rgb(180,83,9)', 'letter-spacing:0.02em', 'justify-content: center;'
      ].join(';');
      banner.innerHTML = '<span style="font-size:16px">🔧</span><span>' + escapeHtml(msg) + '</span>';
      var main = global.document.querySelector('main') || global.document.body;
      main.insertBefore(banner, main.firstChild);
    }).catch(function () {});
  }

  // Pengumuman/pengingat popup per jabatan — dicek sekali tiap halaman dimuat (sama seperti
  // syncMaintenanceBanner), tapi TIDAK memblokir halaman: cuma kartu kecil mengambang yang bisa
  // ditutup. Menutup popup = 1 kali "sudah lihat" (dihitung server, per akun per pengumuman).
  var _announcementQueue = [];

  function syncAnnouncementPopup(options) {
    var session = resolveSession(options || {});
    var token = (session && session.token) || '';
    if (!token) return;
    fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pengumuman.owed', token: token })
    }).then(function (r) { return r.json(); }).then(function (json) {
      if (!json.ok || !json.data || !json.data.items || !json.data.items.length) return;
      // Yang fullscreen didahulukan biar tidak "ketutup" nunggu antrean kartu kecil selesai.
      var items = json.data.items.slice();
      var fullscreenItems = items.filter(function (item) { return item.isFullscreen; });
      var otherItems = items.filter(function (item) { return !item.isFullscreen; });
      _announcementQueue = fullscreenItems.concat(otherItems);
      showNextAnnouncement(token);
    }).catch(function () {});
  }

  var ANNOUNCEMENT_THEMES = {
    biasa: { bg: '#fff6df', ink: '#2b2620', border: 'rgba(41,23,15,0.12)', hint: 'rgba(41,23,15,0.65)', surface: 'rgba(255,255,255,0.5)' },
    merah: { bg: '#c62828', ink: '#fff5f5', border: 'rgba(255,255,255,0.35)', hint: 'rgba(255,245,245,0.75)', surface: 'rgba(255,255,255,0.14)' },
    jingga: { bg: '#ffe9d1', ink: '#5a3410', border: 'rgba(184,110,30,0.28)', hint: 'rgba(90,52,16,0.65)', surface: 'rgba(255,255,255,0.5)' },
    hijau: { bg: '#e0f0dc', ink: '#1f3a17', border: 'rgba(58,90,48,0.28)', hint: 'rgba(31,58,23,0.65)', surface: 'rgba(255,255,255,0.5)' },
    // Dipakai showAuditBawahanPopup_ -- sengaja beda dari merah (pelanggaran self-audit) &
    // hijau (pengingat santai self-audit): ini info buat ATASAN, bukan tagihan ke diri
    // sendiri, jadi warnanya netral (biru gelap) supaya tidak terkesan alarm.
    biru: { bg: '#1f3a5f', ink: '#eef4ff', border: 'rgba(255,255,255,0.3)', hint: 'rgba(238,244,255,0.75)', surface: 'rgba(255,255,255,0.12)' }
  };

  // Klik gambar lampiran pengumuman -> tampil 100% x 100% di atas popup, tutup lagi dengan klik.
  function openAnnouncementImageLightbox(src) {
    var existing = global.document.getElementById('_announcementImageLightbox');
    if (existing) existing.remove();
    var box = global.document.createElement('div');
    box.id = '_announcementImageLightbox';
    box.style.cssText = 'position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.92);cursor:zoom-out;padding:16px;box-sizing:border-box;';
    var img = global.document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
    box.appendChild(img);
    box.addEventListener('click', function (event) { event.stopPropagation(); box.remove(); });
    global.document.body.appendChild(box);
  }

  // Popup peringatan kecil (bukan alert() native -- konsisten dgn gaya overlay custom lain di
  // app ini) dipakai saat user coba tutup popup / kirim respon padahal video wajib-tonton belum
  // sampai 'ended'. z-index sengaja di atas SEMUA overlay lain di sistem ini (termasuk pseudo-
  // fullscreen video 10010) supaya selalu kelihatan di manapun ke-trigger-nya.
  function showAnnouncementVideoWarning_(message) {
    if (global.document.getElementById('_announcementVideoWarning')) return;
    var overlay = global.document.createElement('div');
    overlay.id = '_announcementVideoWarning';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10020;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    overlay.innerHTML =
      '<div style="background:#1f2430;color:#f5f3ee;border-radius:14px;max-width:360px;width:100%;padding:22px;box-sizing:border-box;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.4);">' +
        '<div style="font-size:28px;">&#9888;</div>' +
        '<div style="margin-top:10px;font-size:14px;line-height:1.6;">' + escapeHtml(message) + '</div>' +
        '<button type="button" id="_announcementVideoWarningOkBtn" style="margin-top:16px;border:none;border-radius:10px;background:#e0a458;color:#1f2430;padding:10px 24px;font-size:13px;font-weight:700;cursor:pointer;">Mengerti</button>' +
      '</div>';
    global.document.body.appendChild(overlay);
    overlay.addEventListener('click', function (event) { if (event.target === overlay) overlay.remove(); });
    overlay.querySelector('#_announcementVideoWarningOkBtn').addEventListener('click', function () { overlay.remove(); });
  }

  function showNextAnnouncement(token) {
    if (global.document.getElementById('_announcementPopup')) return; // satu popup dalam satu waktu
    var item = _announcementQueue.shift();
    if (!item) return;

    var theme = ANNOUNCEMENT_THEMES[item.colorType] || ANNOUNCEMENT_THEMES.biasa;
    var fullscreen = !!item.isFullscreen;

    var popup = global.document.createElement('div');
    popup.id = '_announcementPopup';
    if (!fullscreen) {
      popup.setAttribute('role', 'button');
      popup.setAttribute('aria-label', item.wajibRespon ? 'Pengumuman (wajib direspon dulu)' : 'Tutup pengumuman');
    }
    popup.style.cssText = fullscreen
      ? [
          'position:fixed', 'inset:0', 'z-index:9999',
          'display:flex', 'flex-direction:column',
          'box-sizing:border-box',
          'background:' + theme.bg, 'color:' + theme.ink, 'font-size:16px', 'line-height:1.6'
        ].join(';')
      : [
          'position:fixed', 'right:16px', 'bottom:16px', 'z-index:9998',
          'max-width:360px', 'width:calc(100% - 32px)', 'cursor:pointer',
          'max-height:calc(100vh - 32px)', 'overflow-y:auto', 'box-sizing:border-box',
          'background:' + theme.bg, 'color:' + theme.ink, 'border-radius:14px',
          'box-shadow:0 18px 40px rgba(0,0,0,0.28)', 'padding:16px 18px',
          'border:1px solid ' + theme.border, 'font-size:13px', 'line-height:1.5'
        ].join(';');
    var quickBtnStyle = 'border:1px solid ' + theme.border + ';background:transparent;color:' + theme.ink + ';border-radius:999px;padding:5px 12px;font-size:12px;cursor:pointer;';
    var mediaHtml = '';
    if (item.media && item.media.length) {
      mediaHtml = '<div id="_announcementMediaArea" style="margin-top:10px;display:grid;gap:10px;' + (fullscreen ? 'max-width:480px;width:100%;' : '') + '">' +
        item.media.map(function (m, mediaIndex) {
          if (m.type === 'video' && m.mustWatchFull) {
            // Wajib-tonton: TIDAK PAKAI native 'controls' sama sekali (tidak ada scrubber yg bisa
            // disentuh/di-skip) -- interaksi cuma lewat tombol custom di bawah. Putar/Jeda/-5 detik
            // SEMBUNYI sampai user klik "Open" dulu (video juga BELUM main sebelum itu) -- begitu
            // "Open" diklik, ketiganya dimunculkan DAN videonya otomatis mulai diputar sekaligus.
            // "Open" cuma styling CSS (wrap jadi position:fixed;inset:0, 100% lebar x 100% tinggi
            // layar), BUKAN Fullscreen API browser. Tombolnya toggle: "Open" jadi "Close" begitu
            // aktif (Close ikut nyembunyikan Putar/Jeda/-5 detik lagi & pause videonya), lihat
            // enterVideoFullscreen/exitVideoFullscreen di bawah. "-5 detik" cuma mengizinkan mundur
            // (bukan maju -- anti-skip tetap berlaku, lihat listener 'seeking').
            return '<div class="_announcementVideoWrap" data-media-index="' + mediaIndex + '" style="background:#000;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;justify-content:center;">' +
              '<div style="position:relative;">' +
                '<video data-media-index="' + mediaIndex + '" src="/' + escapeHtml(m.url) + '" playsinline' +
                  ' controlsList="nodownload noplaybackrate" disablePictureInPicture' +
                  ' style="max-width:100%;width:100%;max-height:71vh;display:block;"></video>' +
                '<div class="_announcementVideoLoading" data-media-index="' + mediaIndex + '" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);pointer-events:none;">' +
                  '<i class="fa-solid fa-spinner fa-spin" style="color:#fff;font-size:30px;"></i>' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;gap:8px;padding:8px;flex-wrap:wrap;">' +
                '<button type="button" class="_announcementVideoFsBtn" data-media-index="' + mediaIndex + '" style="' + quickBtnStyle + 'font-weight:700;border-color:#fff;color:#fff;">&#9974;&ensp;Open</button>' +
                '<button type="button" class="_announcementVideoPlayBtn" data-media-index="' + mediaIndex + '" hidden style="' + quickBtnStyle + 'font-weight:700;border-color:#fff;color:#fff;">&#9654;&ensp;Putar</button>' +
                '<button type="button" class="_announcementVideoPauseBtn" data-media-index="' + mediaIndex + '" hidden style="' + quickBtnStyle + 'font-weight:700;border-color:#fff;color:#fff;">&#10074;&#10074;&ensp;Jeda</button>' +
                '<button type="button" class="_announcementVideoBackBtn" data-media-index="' + mediaIndex + '" hidden style="' + quickBtnStyle + 'font-weight:700;border-color:#fff;color:#fff;">&#9664;&#9664;&ensp;-5 detik</button>' +
              '</div>' +
              '<div style="padding:0 8px 8px;font-size:11px;font-weight:700;color:#fff;">&#9888;&ensp;Klik Open untuk mulai menonton. Wajib ditonton sampai habis (tidak bisa dipercepat/digeser, cuma bisa dijeda/mundur 5 detik) sebelum popup ini bisa ditutup</div>' +
              (m.caption ? '<div style="padding:0 8px 10px;font-size:11px;color:#ddd;">' + escapeHtml(m.caption) + '</div>' : '') +
            '</div>';
          }
          // Video BIASA (bukan mustWatchFull): kontainer hitam yg sama gaya dgn wrap video
          // wajib-tonton di atas (biar konsisten tampilannya), tapi TETAP pakai native
          // 'controls' & tidak ada tombol/gembok apa pun -- bebas ditonton/skip kapan saja.
          var mediaEl = m.type === 'video'
            ? '<div style="background:#000;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;justify-content:center;">' +
                '<div style="position:relative;">' +
                  '<video data-media-index="' + mediaIndex + '" src="/' + escapeHtml(m.url) + '" controls style="max-width:100%;width:100%;max-height:45vh;display:block;"></video>' +
                  '<div class="_announcementVideoLoading" data-media-index="' + mediaIndex + '" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);pointer-events:none;">' +
                    '<i class="fa-solid fa-spinner fa-spin" style="color:#fff;font-size:30px;"></i>' +
                  '</div>' +
                '</div>' +
              '</div>'
            : '<img src="/' + escapeHtml(m.url) + '" alt="" style="max-width:100%;max-height:45vh;object-fit:contain;border-radius:10px;display:block;cursor:zoom-in;">';
          var captionHtml = m.caption ? '<div style="margin-top:4px;font-size:11px;color:' + theme.hint + ';">' + escapeHtml(m.caption) + '</div>' : '';
          return mediaEl + captionHtml;
        }).join('') +
      '</div>';
    }
    // Kalau wajibRespon: panel langsung terbuka (tidak perlu toggle) + hint peringatan,
    // krn popup TIDAK BISA ditutup sebelum kirim respon -- lihat gating di closeAndAdvance.
    var wajibHint = item.wajibRespon
      ? '<div style="font-size:11px;font-weight:700;margin-bottom:8px;' + (fullscreen ? 'text-align:right;' : '') + '">&#9888;&ensp;Wajib direspon dulu sebelum popup ini bisa ditutup</div>'
      : '';
    var responHtml =
      '<div id="_announcementResponArea" style="' + (fullscreen ? 'text-align:right;' : 'margin-top:12px;text-align:left;') + '">' +
        wajibHint +
        (item.wajibRespon ? '' : '<button type="button" id="_announcementResponToggle" style="' + quickBtnStyle + 'font-weight:700;">&#128172;&ensp;Respon</button>') +
        '<div id="_announcementResponPanel" ' + (item.wajibRespon ? '' : 'hidden') + ' style="margin-top:10px;text-align:left;">' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;' + (fullscreen ? 'justify-content:flex-end;' : '') + '">' +
            '<button type="button" class="_announcementQuickBtn" data-quick="paham" style="' + quickBtnStyle + '">&#128077;&ensp;Sudah Paham</button>' +
            '<button type="button" class="_announcementQuickBtn" data-quick="tanya" style="' + quickBtnStyle + '">&#10067;&ensp;Ada Pertanyaan</button>' +
          '</div>' +
          '<textarea id="_announcementResponNote" rows="2" placeholder="Tulis respon Anda di sini (wajib diisi)" style="width:100%;margin-top:8px;box-sizing:border-box;border:1px solid ' + theme.border + ';border-radius:8px;padding:8px;font:inherit;font-size:12px;color:' + theme.ink + ';background:' + theme.surface + ';resize:vertical;"></textarea>' +
          '<button type="button" id="_announcementResponSend" style="margin-top:8px;border:none;border-radius:8px;background:' + theme.ink + ';color:' + theme.bg + ';padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;' + (fullscreen ? 'float:right;' : '') + '">Kirim Respon</button>' +
          '<div id="_announcementResponStatus" style="margin-top:6px;font-size:11px;' + (fullscreen ? 'clear:both;text-align:right;' : '') + '"></div>' +
        '</div>' +
      '</div>';

    if (fullscreen) {
      popup.innerHTML =
        '<div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid ' + theme.border + ';">' +
          '<strong style="font-size:20px;">' + escapeHtml(item.title) + '</strong>' +
          '<button type="button" id="_announcementCloseBtn" aria-label="Tutup" style="border:none;background:transparent;color:' + theme.ink + ';font-size:26px;line-height:1;cursor:pointer;padding:2px 6px;">&times;</button>' +
        '</div>' +
        '<div style="flex:1 1 auto;overflow-y:auto;box-sizing:border-box;padding:24px 20px;display:flex;flex-direction:column;align-items:center;text-align:center;">' +
          '<div style="white-space:pre-wrap;max-width:640px;">' + escapeHtml(item.message) + '</div>' +
          mediaHtml +
          (_announcementQueue.length ? '<div style="margin-top:8px;font-size:11px;color:' + theme.hint + ';">Masih ada ' + _announcementQueue.length + ' pengumuman lain</div>' : '') +
        '</div>' +
        '<div style="flex-shrink:0;box-sizing:border-box;padding:14px 20px;border-top:1px solid ' + theme.border + ';">' +
          responHtml +
        '</div>';
    } else {
      popup.innerHTML =
        '<strong style="font-size:14px;display:block;">' + escapeHtml(item.title) + '</strong>' +
        '<div style="margin-top:8px;white-space:pre-wrap;">' + escapeHtml(item.message) + '</div>' +
        mediaHtml +
        (_announcementQueue.length ? '<div style="margin-top:8px;font-size:11px;color:' + theme.hint + ';">Masih ada ' + _announcementQueue.length + ' pengumuman lain</div>' : '') +
        responHtml;
    }

    global.document.body.appendChild(popup);

    var responArea = popup.querySelector('#_announcementResponArea');
    responArea.addEventListener('click', function (event) { event.stopPropagation(); });
    var mediaArea = popup.querySelector('#_announcementMediaArea');
    if (mediaArea) {
      mediaArea.addEventListener('click', function (event) { event.stopPropagation(); });
      mediaArea.querySelectorAll('img').forEach(function (img) {
        img.addEventListener('click', function () { openAnnouncementImageLightbox(img.src); });
      });
      // Overlay spinner di tengah video selagi masih loading/buffering -- berlaku utk SEMUA
      // video (mustWatchFull maupun biasa), lepas dari logika anti-skip di bawah. Muncul lagi
      // saat 'waiting' (network stall di tengah putar, mis. video besar/koneksi lambat).
      mediaArea.querySelectorAll('video[data-media-index]').forEach(function (video) {
        var idx = video.dataset.mediaIndex;
        var overlay = mediaArea.querySelector('._announcementVideoLoading[data-media-index="' + idx + '"]');
        if (!overlay) return;
        var hideOverlay = function () { overlay.style.display = 'none'; };
        var showOverlay = function () { overlay.style.display = 'flex'; };
        video.addEventListener('loadeddata', hideOverlay);
        video.addEventListener('canplay', hideOverlay);
        video.addEventListener('playing', hideOverlay);
        video.addEventListener('waiting', showOverlay);
        video.addEventListener('error', hideOverlay);
        if (video.readyState >= 2) hideOverlay();
      });
    }

    // Video yg ditandai mustWatchFull HARUS sampai event 'ended' native browser dulu sebelum
    // ikut mengizinkan popup ditutup (lihat gating gabungan di closeAndAdvance). Tidak ada native
    // 'controls' sama sekali (jadi tidak ada scrubber yg bisa disentuh) -- satu2nya interaksi
    // lewat tombol custom Open/Close, Putar, Jeda, -5 detik. Putar/Jeda/-5 detik SEMBUNYI & video
    // TIDAK main sampai user klik "Open" (lihat enterVideoFullscreen) -- lastGoodTime/seeking
    // listener tetap dipasang sbg satu2nya penegak anti-skip-maju (jaga2 kalau ada browser yg
    // tetap nampilin kontrol bawaan meski 'controls' dihapus).
    var unfinishedRequiredVideoCount = 0;
    if (mediaArea) {
      mediaArea.querySelectorAll('video[data-media-index]').forEach(function (video) {
        var media = item.media[Number(video.dataset.mediaIndex)];
        if (!media || !media.mustWatchFull) return;
        unfinishedRequiredVideoCount += 1;
        var idx = video.dataset.mediaIndex;
        var wrap = mediaArea.querySelector('._announcementVideoWrap[data-media-index="' + idx + '"]');
        var fsBtn = mediaArea.querySelector('._announcementVideoFsBtn[data-media-index="' + idx + '"]');
        var playBtn = mediaArea.querySelector('._announcementVideoPlayBtn[data-media-index="' + idx + '"]');
        var pauseBtn = mediaArea.querySelector('._announcementVideoPauseBtn[data-media-index="' + idx + '"]');
        var backBtn = mediaArea.querySelector('._announcementVideoBackBtn[data-media-index="' + idx + '"]');

        // "Open" di sini BUKAN Fullscreen API browser (requestFullscreen/webkitEnterFullscreen)
        // -- itu sengaja dibuang krn tidak konsisten di semua WebView/PWA (izin bisa ditolak
        // diam2, atau di iOS malah ganti ke player native Apple yg scrubber-nya ikut nongol
        // lagi). Sebagai gantinya WRAP cuma di-CSS jadi overlay fixed 100% lebar x 100% tinggi
        // layar (position:fixed;inset:0) -- visualnya tetap "penuh layar", tapi mekanismenya cuma
        // styling biasa, jadi selalu jalan sama di semua browser/WebView tanpa perlu izin apa pun.
        // Tombolnya sendiri TOGGLE 1 tombol (bukan 2 tombol Fullscreen/Keluar terpisah spt
        // sebelumnya): label "Open" <-> "Close" mengikuti status aktifnya.
        var wrapOriginalStyle = wrap.getAttribute('style');
        var videoOriginalMaxHeight = video.style.maxHeight;

        function isVideoFullscreen() {
          return wrap.classList.contains('_pseudoFsActive');
        }
        function enterVideoFullscreen() {
          if (isVideoFullscreen()) return;
          wrap.classList.add('_pseudoFsActive');
          wrap.style.cssText = 'position:fixed;inset:0;z-index:10010;background:#000;overflow:hidden;display:flex;flex-direction:column;justify-content:center;';
          video.style.maxHeight = 'calc(100vh - 54px)';
          if (fsBtn) fsBtn.innerHTML = '&#9974;&ensp;Close';
          if (playBtn) playBtn.hidden = false;
          if (pauseBtn) pauseBtn.hidden = false;
          if (backBtn) backBtn.hidden = false;
          video.play().catch(function () {});
        }
        function exitVideoFullscreen() {
          if (!isVideoFullscreen()) return;
          wrap.classList.remove('_pseudoFsActive');
          wrap.setAttribute('style', wrapOriginalStyle);
          video.style.maxHeight = videoOriginalMaxHeight;
          if (fsBtn) fsBtn.innerHTML = '&#9974;&ensp;Open';
          if (playBtn) playBtn.hidden = true;
          if (pauseBtn) pauseBtn.hidden = true;
          if (backBtn) backBtn.hidden = true;
          video.pause();
        }

        if (fsBtn) fsBtn.addEventListener('click', function () {
          if (isVideoFullscreen()) exitVideoFullscreen(); else enterVideoFullscreen();
        });
        if (playBtn) playBtn.addEventListener('click', function () {
          video.play().catch(function () {});
        });
        if (pauseBtn) pauseBtn.addEventListener('click', function () {
          video.pause();
        });

        video.addEventListener('contextmenu', function (event) { event.preventDefault(); });
        var lastGoodTime = 0;
        // "-5 detik": satu2nya cara mundur yg diizinkan (anti-skip MAJU tetap berlaku lewat
        // listener 'seeking' di bawah) -- lastGoodTime di-update DULU sebelum currentTime
        // diset, supaya listener 'seeking' tidak balikin lagi mundurnya.
        if (backBtn) backBtn.addEventListener('click', function () {
          var target = Math.max(0, video.currentTime - 5);
          lastGoodTime = target;
          video.currentTime = target;
        });
        video.addEventListener('timeupdate', function () {
          if (!video.seeking) lastGoodTime = video.currentTime;
        });
        video.addEventListener('seeking', function () {
          if (Math.abs(video.currentTime - lastGoodTime) > 0.5) video.currentTime = lastGoodTime;
        });
        video.addEventListener('ratechange', function () {
          if (video.playbackRate !== 1) video.playbackRate = 1;
        });
        video.addEventListener('ended', function () {
          // dataset.watched dipakai buat itung unfinishedRequiredVideoCount -- cuma boleh kepotong
          // SEKALI (video boleh diputar ulang lewat tombol Putar berkali-kali stlh ini -- browser
          // otomatis balik currentTime ke 0 kalau play() dipanggil lagi stlh 'ended' -- tapi syarat
          // "sudah pernah tonton sampai habis" sudah kepenuhi & tidak perlu diitung ulang lagi).
          if (!video.dataset.watched) {
            video.dataset.watched = '1';
            unfinishedRequiredVideoCount -= 1;
          }
        });
      });
    }

    var selectedQuick = '';
    var quickButtons = popup.querySelectorAll('._announcementQuickBtn');
    quickButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var quick = btn.dataset.quick;
        selectedQuick = selectedQuick === quick ? '' : quick;
        quickButtons.forEach(function (b) {
          var active = b.dataset.quick === selectedQuick;
          b.style.background = active ? theme.ink : 'transparent';
          b.style.color = active ? theme.bg : theme.ink;
        });
      });
    });

    var responToggleBtn = popup.querySelector('#_announcementResponToggle');
    if (responToggleBtn) {
      responToggleBtn.addEventListener('click', function () {
        var panel = popup.querySelector('#_announcementResponPanel');
        panel.hidden = !panel.hidden;
      });
    }

    var hasResponded = false;
    popup.querySelector('#_announcementResponSend').addEventListener('click', function () {
      var statusEl = popup.querySelector('#_announcementResponStatus');
      var noteEl = popup.querySelector('#_announcementResponNote');
      var note = noteEl.value.trim();
      if (unfinishedRequiredVideoCount > 0) {
        showAnnouncementVideoWarning_('Anda wajib menonton video sampai habis dulu sebelum bisa mengirim respon.');
        var pendingVideoForRespon = mediaArea && mediaArea.querySelector('video[data-media-index]:not([data-watched])');
        if (pendingVideoForRespon) { pendingVideoForRespon.scrollIntoView({ block: 'center' }); pendingVideoForRespon.focus(); }
        return;
      }
      if (!note) {
        statusEl.textContent = 'Isi teks respon dulu, tidak cukup cuma pilih respon cepat.';
        statusEl.style.color = '#a55a52';
        return;
      }
      var sendBtn = popup.querySelector('#_announcementResponSend');
      sendBtn.disabled = true;
      fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pengumuman.respond', id: item.id, quick_type: selectedQuick, note: note, token: token })
      }).then(function (r) { return r.json(); }).then(function (json) {
        sendBtn.disabled = false;
        if (!json.ok) { statusEl.textContent = (json.error && json.error.message) || 'Gagal mengirim respon.'; statusEl.style.color = '#a55a52'; return; }
        hasResponded = true;
        statusEl.textContent = 'Respon terkirim.';
        statusEl.style.color = theme.hint;
        // Respon berhasil dikirim = pengumuman dianggap selesai ditindaklanjuti, langsung tutup
        // popup tanpa perlu klik lagi di luar area respon.
        setTimeout(closeAndAdvance, 500);
      }).catch(function () {
        sendBtn.disabled = false;
        statusEl.textContent = 'Gagal mengirim respon.';
        statusEl.style.color = '#a55a52';
      });
    });

    var closed = false;
    function closeAndAdvance() {
      if (closed) return;
      if (unfinishedRequiredVideoCount > 0) {
        // Ada video wajib yg belum ditonton sampai 'ended' -- jangan tutup, kasih peringatan +
        // scroll & sorot videonya.
        showAnnouncementVideoWarning_('Anda wajib menonton video sampai habis dulu sebelum bisa menutup pengumuman ini.');
        var pendingVideo = mediaArea && mediaArea.querySelector('video[data-media-index]:not([data-watched])');
        if (pendingVideo) { pendingVideo.scrollIntoView({ block: 'center' }); pendingVideo.focus(); }
        return;
      }
      if (item.wajibRespon && !hasResponded) {
        // Belum kirim respon -- jangan tutup, cuma buka panel & kasih hint (server juga TIDAK
        // pernah diberitahu popup ini "wajib", ini murni gating UI; markSeen/close beneran cuma
        // kepanggil setelah pengumuman.respond sukses di atas).
        var panel = popup.querySelector('#_announcementResponPanel');
        if (panel) panel.hidden = false;
        var statusEl = popup.querySelector('#_announcementResponStatus');
        if (statusEl) { statusEl.textContent = 'Wajib mengisi respon dulu sebelum bisa menutup pengumuman ini.'; statusEl.style.color = '#a55a52'; }
        var noteEl = popup.querySelector('#_announcementResponNote');
        if (noteEl) noteEl.focus();
        return;
      }
      closed = true;
      popup.remove();
      fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pengumuman.markSeen', id: item.id, token: token })
      }).catch(function () {});
      showNextAnnouncement(token);
    }
    if (fullscreen) {
      // Fullscreen: tutup cuma lewat tombol "x", supaya tidak ketutup gak sengaja saat baca/scroll.
      popup.querySelector('#_announcementCloseBtn').addEventListener('click', closeAndAdvance);
    } else {
      popup.addEventListener('click', closeAndAdvance);
    }
  }

  // Audit kepatuhan absensi halaqoh -- dicek sekali tiap halaman dimuat (mirip syncAnnouncementPopup),
  // tapi murni derived dari data live: kalau halaqoh pengampu sudah punya minimal 1 absensi, popup
  // ini otomatis berhenti muncul dengan sendirinya (tidak ada state "sudah dilihat" yang disimpan).
  // Satu action ('absensi.owed') & satu antrean utk 2 jenis entitas (halaqoh + kelas siang) --
  // biar cuma 1 popup yg nongol, bukan 2 sistem terpisah yang bisa numpuk.
  var AUDIT_KIND_CONFIG = {
    halaqoh: {
      entityLabel: 'Absensi Halaqoh',
      scopeKeywords: ['pengampu halaqoh', 'pengampu', 'musyrif halaqoh', 'murobbi halaqoh'],
      redirectPath: '/pages/halaqohAbsensi/',
      queryParam: 'openHalaqoh'
    },
    kelas: {
      entityLabel: 'Absensi Kelas',
      scopeKeywords: ['pengajar', 'ustadz', 'ustadzah', 'guru'],
      redirectPath: '/pages/kelasAbsensi/',
      queryParam: 'openKelas'
    },
    regu: {
      entityLabel: 'Absensi Regu',
      scopeKeywords: ['pembina regu', 'wali regu', 'musyrif regu'],
      redirectPath: '/pages/reguAbsensi/',
      queryParam: 'openRegu'
    },
    hafalan: {
      entityLabel: 'Hafalan Harian',
      scopeKeywords: ['pengampu halaqoh', 'pengampu', 'musyrif halaqoh', 'murobbi halaqoh'],
      redirectPath: '/pages/hafalanHarian/',
      queryParam: 'openHalaqoh'
    },
    perkembangan: {
      entityLabel: 'Perkembangan Regu',
      scopeKeywords: ['pembina regu', 'wali regu', 'musyrif regu'],
      redirectPath: '/pages/perkembanganSantri/',
      queryParam: 'openRegu',
      missingLabel: 'pekan belum memenuhi target'
    },
    tasmi: {
      entityLabel: 'Setoran Tasmi\' Halaqoh',
      scopeKeywords: ['pengampu halaqoh', 'pengampu', 'musyrif halaqoh', 'murobbi halaqoh'],
      redirectPath: '/pages/tasmiSetoran/',
      queryParam: 'openHalaqoh',
      missingLabel: 'Sabtu belum lengkap status tasmi\'nya'
    },
    jurnalSdm: {
      entityLabel: 'Jurnal SDM',
      scopeKeywords: [],
      redirectPath: '/pages/jurnalSdm/',
      missingLabel: 'belum diisi hari ini'
    },
    // Khusus PENGAJAR kelas siang -- menagih kalau ada aturan nilai wajib (ditetapkan
    // Akademik di halaman nilaiUjian) yang sudah lewat tenggat tapi kelas yg dia ampu
    // masih ada santri kosong nilainya. item.missingLines (bukan missingDates/missingSantri)
    // dipakai di sini -- lihat currentLines() di showAuditDetailDialog_.
    nilaiWajib: {
      entityLabel: 'Nilai Ujian Wajib',
      scopeKeywords: ['pengajar', 'ustadz', 'ustadzah', 'guru'],
      redirectPath: '/pages/nilaiUjian/',
      queryParam: 'openKelas',
      missingLabel: 'santri belum dinilai'
    },
    // Redirect ke kelasAbsensi (BUKAN editKelas) -- dialog "Daftar Materi Silabus" (centang
    // selesai) yg direferensikan user ada di dialog input Absensi Kelas, sama persis dgn
    // deep-link kind 'kelas' di atas (queryParam openKelas).
    silabus: {
      entityLabel: 'Materi Silabus Kelas',
      scopeKeywords: ['pengajar', 'ustadz', 'ustadzah', 'guru'],
      redirectPath: '/pages/kelasAbsensi/',
      queryParam: 'openKelas',
      missingLabel: 'materi sudah lewat batas belum dicentang selesai'
    },
    // 3 kind di bawah ini beda dari semua kind di atas: bukan soal 1 entitas (halaqoh/kelas/
    // regu) tertentu yg dimiliki pengurus ybs, tapi rekap "berapa santri aktif yg jumlah
    // keanggotaannya salah" secara sistem-wide (lihat collectSantriMembershipMismatchCount_
    // di backend) -- makanya tidak ada queryParam (redirect polos ke halaman listing
    // editKelas/editHalaqoh/editRegu terkait, BUKAN ke dashboard & BUKAN ke 1 record
    // spesifik -- diputuskan user 2026-08-03) dan item.id cuma placeholder ('global'),
    // bukan ID entitas asli.
    akademikKelas: {
      entityLabel: 'Santri Aktif Tidak Tepat 3 Kelas Siang',
      // SAMA persis dgn ACCESS_KEYWORDS.academic di shared-access.js -- Bereskan pindah
      // scope ke jabatan "Akademik" kalau pengurus ybs juga pegang jabatan lain.
      scopeKeywords: ['akademik'],
      redirectPath: '/pages/editKelas/',
      missingLabel: 'santri aktif belum tepat 3 kelas siang',
      unitLabel: 'kelas siang',
      dibekukanWajibLabel: 'Santri dibekukan wajib punya 3 kelas siang.',
      // 2026-08-15: "Bereskan" 3 kind ini nyimpen item.missingSantri ke sessionStorage &
      // redirect dgn marker ?auditFix=1 (BUKAN queryParam=id spt kind lain, krn item.id di
      // sini cuma placeholder 'global') -- lihat storeAuditMismatchSantriAndRedirect_ &
      // consumeAuditMismatchSantriPanel di bawah.
      membershipMismatch: true
    },
    akademikHalaqoh: {
      entityLabel: 'Santri Aktif Tidak Tepat 1 Halaqoh',
      // SAMA persis dgn ACCESS_KEYWORDS.halaqohCoordinator di shared-access.js.
      scopeKeywords: ['koordinator halaqoh', 'kordinator halaqoh', 'koord halaqoh'],
      redirectPath: '/pages/editHalaqoh/',
      missingLabel: 'santri aktif belum tepat 1 halaqoh',
      unitLabel: 'halaqoh',
      dibekukanWajibLabel: 'Santri dibekukan wajib punya 1 halaqoh.',
      membershipMismatch: true
    },
    akademikRegu: {
      entityLabel: 'Santri Aktif Tidak Tepat 1 Regu',
      // SAMA persis dgn ACCESS_KEYWORDS.ksantrian di shared-access.js.
      scopeKeywords: ['ksantrian', 'kesantrian', 'bagian kesantrian', 'staf kesantrian', 'seksi kesantrian', 'bidang kesantrian'],
      redirectPath: '/pages/editRegu/',
      missingLabel: 'santri aktif belum tepat 1 regu',
      unitLabel: 'regu',
      dibekukanWajibLabel: 'Santri dibekukan wajib punya 1 regu.',
      membershipMismatch: true
    }
  };
  // 3 audit akademik baru (akademikKelas/Halaqoh/Regu, soal jumlah keanggotaan santri) --
  // dipakai showAuditPopup utk kasih label teks "(Penting)" di judulnya, biar beda dari 7
  // audit "lama" (backlog harian per entitas) yg dibiarkan polos. Keputusan user 2026-08-03.
  var AUDIT_NEW_KINDS_ = { akademikKelas: 1, akademikHalaqoh: 1, akademikRegu: 1 };
  var AUDIT_BULAN_NAMES_ = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  function formatAuditDateIndo_(dateStr) {
    var parts = String(dateStr || '').split('-');
    if (parts.length !== 3) return String(dateStr || '');
    var day = parseInt(parts[2], 10);
    var month = parseInt(parts[1], 10);
    return day + ' ' + (AUDIT_BULAN_NAMES_[month - 1] || parts[1]) + ' ' + parts[0];
  }

  // Kelompokkan tanggal2 yg belum diisi per bulan, biar rincian di dialog tidak jadi 1 baris
  // raksasa kalau bolongnya sudah berbulan-bulan -- tiap bulan maks AUDIT_DETAIL_DAY_CAP_
  // tanggal ditampilkan, sisanya diringkas "dll".
  var AUDIT_DETAIL_DAY_CAP_ = 20;
  function formatMissingDatesDetail_(dates) {
    var groups = {};
    var order = [];
    (dates || []).forEach(function (d) {
      var parts = String(d).split('-');
      if (parts.length !== 3) return;
      var key = parts[0] + '-' + parts[1];
      if (!groups[key]) { groups[key] = { year: parts[0], month: parseInt(parts[1], 10), days: [] }; order.push(key); }
      groups[key].days.push(parseInt(parts[2], 10));
    });
    return order.map(function (key) {
      var g = groups[key];
      var days = g.days.slice().sort(function (a, b) { return a - b; });
      var shown = days.slice(0, AUDIT_DETAIL_DAY_CAP_);
      var suffix = days.length > shown.length ? ', dll' : '';
      return days.length + ' hari (tanggal ' + shown.join(', ') + suffix + ') bulan ' + AUDIT_BULAN_NAMES_[g.month - 1] + ' ' + g.year;
    });
  }
  function formatMissingWeeksDetail_(weeks) {
    return (weeks || []).map(function (w) {
      return 'Pekan ' + formatAuditDateIndo_(w.start) + ' – ' + formatAuditDateIndo_(w.end);
    });
  }
  // Dipakai 3 kind akademik (akademikKelas/akademikHalaqoh/akademikRegu) -- item-nya bukan
  // rincian tanggal/pekan spt kind lain, tapi daftar santri beserta jumlah keanggotaan
  // aktualnya + status (aktif/dibekukan) + keterangan bebas (lihat
  // collectSantriMembershipMismatchItems_ di backend). Santri dibekukan cuma info (tidak
  // dihitung ke missingCount/badge/blokir Jurnal SDM, lihat handleAbsensiOwed_), tapi tetap
  // ditampilkan di sini -- labelnya pakai s.keterangan (isian bebas admin di daftarSantri,
  // mis. "cuti"/"pengabdian"/"mau keluar") kalau diisi, bukan cuma kata generik 'Dibekukan'
  // -- keputusan user 2026-08-03.
  function formatMissingSantriDetail_(missingSantri, unitLabel) {
    return (missingSantri || []).map(function (s) {
      var statusLabel = s.status === 'dibekukan' ? (s.keterangan || 'Dibekukan') : 'Aktif';
      var count = Number(s.count || 0);
      var text = (s.name || '(tanpa nama)') + ' — ' + count + ' ' + (unitLabel || '') + ' (' + statusLabel + ')';
      // Santri aktif dibiarkan warna default (itu yg sesungguhnya dihitung ke
      // missingCount/badge). Santri dibekukan dikasih hijau -- daftarnya disembunyikan
      // secara default & cuma kelihatan lewat tombol toggle "Tampilkan Dibekukan" di dialog
      // (lihat showAuditDetailDialog_) -- keputusan user 2026-08-04.
      var color = s.status === 'dibekukan' ? '#2e7d32' : '';
      return { text: text, color: color, status: s.status };
    });
  }
  function closeAuditDetailDialog_() {
    var el = global.document.getElementById('_auditDetailOverlay');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  // Pagination angka saja (tanpa tombol prev/next), maks AUDIT_DETAIL_PAGE_BTN_CAP_ tombol
  // angka -- kalau totalnya lebih banyak, dipotong pakai titik2 ('...') tapi halaman
  // pertama & terakhir selalu kelihatan. Contoh (total 22, halaman aktif 1):
  // 1 2 3 4 5 6 7 8 9 ... 21 22 -- 9 angka dari ujung yg dekat halaman aktif + titik2 +
  // 2 angka dari ujung seberang (edge). Kalau halaman aktif di tengah, kedua ujung dapat
  // 2 angka + titik2 + jendela 7 angka di sekitar halaman aktif = tetap 11 angka.
  var AUDIT_DETAIL_PAGE_SIZE_ = 10;
  var AUDIT_DETAIL_PAGE_BTN_CAP_ = 11;
  function buildAuditDetailPaginationHtml_(page, totalPages) {
    if (totalPages <= 1) return '';
    var maxBtn = AUDIT_DETAIL_PAGE_BTN_CAP_;
    var edge = 2;
    var i;
    var pageNumbers = [];
    // Ambang batas dibuat 1 lebih ketat dari lebar jendela (maxBtn-edge) -- kalau tidak,
    // pas PERSIS di halaman terakhir jendela statis (mis. halaman 9 dari jendela 1..9),
    // tetangganya (halaman 10) tidak ikut kelihatan (langsung loncat ke titik2 lalu halaman
    // terakhir). Dengan -1 ini, halaman 9 sudah masuk cabang "tengah" di bawah yg jendelanya
    // otomatis mengikuti halaman aktif, jadi tetangga kiri-kanan selalu ikut tampil.
    if (totalPages <= maxBtn) {
      for (i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else if (page < maxBtn - edge) {
      for (i = 1; i <= maxBtn - edge; i++) pageNumbers.push(i);
      pageNumbers.push('...');
      for (i = totalPages - edge + 1; i <= totalPages; i++) pageNumbers.push(i);
    } else if (page > totalPages - (maxBtn - edge) + 1) {
      for (i = 1; i <= edge; i++) pageNumbers.push(i);
      pageNumbers.push('...');
      for (i = totalPages - (maxBtn - edge) + 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      var half = Math.floor((maxBtn - 2 * edge) / 2);
      for (i = 1; i <= edge; i++) pageNumbers.push(i);
      pageNumbers.push('...');
      for (i = page - half; i <= page + half; i++) pageNumbers.push(i);
      pageNumbers.push('...');
      for (i = totalPages - edge + 1; i <= totalPages; i++) pageNumbers.push(i);
    }
    var html = '<div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;margin-top:12px;">';
    pageNumbers.forEach(function (n) {
      if (n === '...') {
        html += '<span style="min-width:16px;text-align:center;color:#999;font-size:12px;">…</span>';
        return;
      }
      var active = n === page;
      html += '<button type="button" class="_auditDetailPageBtn" data-page="' + n + '" style="min-width:28px;height:28px;border-radius:6px;border:1px solid ' + (active ? '#1a1a1a' : '#ddd') + ';background:' + (active ? '#1a1a1a' : '#fff') + ';color:' + (active ? '#fff' : '#1a1a1a') + ';font-size:12px;font-weight:700;cursor:pointer;padding:0;">' + n + '</button>';
    });
    html += '</div>';
    return html;
  }
  function showAuditDetailDialog_(kindConfig, item) {
    closeAuditDetailDialog_();
    var isSantriKind = !!item.missingSantri;
    // Kind akademik (isSantriKind) dipecah 2 kelompok -- default cuma tampilkan santri AKTIF
    // (yg sesungguhnya dihitung ke missingCount/badge), santri dibekukan disembunyikan dari
    // rincian utama & cuma kelihatan lewat tombol toggle "Tampilkan Dibekukan" (warna hijau) --
    // keputusan user 2026-08-04, biar rincian tidak bercampur & santri aktif tidak
    // "tenggelam" di antara santri dibekukan yg cuma info.
    var activeLines = [], dibekukanLines = [];
    if (isSantriKind) {
      formatMissingSantriDetail_(item.missingSantri, kindConfig.unitLabel).forEach(function (l) {
        if (l.status === 'dibekukan') dibekukanLines.push(l); else activeLines.push(l);
      });
    }
    var viewMode = 'active'; // 'active' | 'dibekukan' -- cuma relevan kalau isSantriKind
    function currentLines() {
      if (!isSantriKind) {
        // item.missingLines: rincian sudah berupa baris teks jadi (lihat kind 'nilaiWajib',
        // collectNilaiWajibGapItems_ di backend) -- beda dari missingDates/missingWeeks yg
        // masih perlu dikelompokkan per-bulan/pekan di sini.
        if (item.missingLines) return item.missingLines;
        return item.missingWeeks ? formatMissingWeeksDetail_(item.missingWeeks) : formatMissingDatesDetail_(item.missingDates);
      }
      return viewMode === 'dibekukan' ? dibekukanLines : activeLines;
    }
    var titleText = kindConfig.entityLabel + (item.name ? ' ' + escapeHtml(item.name) : '');
    var currentPage = 1;

    var overlay = global.document.createElement('div');
    overlay.id = '_auditDetailOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

    var card = global.document.createElement('div');
    card.style.cssText = 'background:#fff;color:#1a1a1a;border-radius:14px;max-width:420px;width:100%;max-height:80vh;overflow-y:auto;box-sizing:border-box;padding:18px 20px;box-shadow:0 20px 50px rgba(0,0,0,0.3);font-size:13px;line-height:1.5;';
    var toggleBtnHtml = (isSantriKind && dibekukanLines.length)
      ? '<button type="button" id="_auditDetailToggleBtn" style="margin-top:8px;border:1px solid #2e7d32;background:#fff;color:#2e7d32;font-size:11px;font-weight:700;border-radius:6px;padding:4px 10px;cursor:pointer;"></button>'
      : '';
    card.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
        '<strong style="font-size:15px;">' + titleText + '</strong>' +
        '<button type="button" id="_auditDetailCloseBtn" aria-label="Tutup" style="border:none;background:transparent;color:#1a1a1a;font-size:20px;line-height:1;cursor:pointer;padding:0 2px;flex-shrink:0;">&times;</button>' +
      '</div>' +
      '<div style="margin-top:4px;font-size:11px;color:#666;">' + Number(item.missingCount || 0) + ' ' + (kindConfig.missingLabel || 'hari belum diisi') + '</div>' +
      toggleBtnHtml +
      '<div id="_auditDetailListWrap"></div>';

    overlay.appendChild(card);
    global.document.body.appendChild(overlay);

    var toggleBtn = card.querySelector('#_auditDetailToggleBtn');
    function updateToggleBtn() {
      if (!toggleBtn) return;
      toggleBtn.textContent = viewMode === 'dibekukan'
        ? 'Tampilkan Aktif (' + activeLines.length + ')'
        : 'Tampilkan Dibekukan (' + dibekukanLines.length + ')';
    }
    if (toggleBtn) {
      updateToggleBtn();
      toggleBtn.addEventListener('click', function () {
        viewMode = viewMode === 'dibekukan' ? 'active' : 'dibekukan';
        currentPage = 1;
        updateToggleBtn();
        renderPage();
      });
    }

    var listWrap = card.querySelector('#_auditDetailListWrap');
    function renderPage() {
      var lines = currentLines();
      var totalPages = Math.max(1, Math.ceil(lines.length / AUDIT_DETAIL_PAGE_SIZE_));
      if (currentPage > totalPages) currentPage = totalPages;
      if (!lines.length) {
        listWrap.innerHTML = '<div style="margin-top:12px;color:#666;">Tidak ada rincian.</div>';
        return;
      }
      var start = (currentPage - 1) * AUDIT_DETAIL_PAGE_SIZE_;
      var pageLines = lines.slice(start, start + AUDIT_DETAIL_PAGE_SIZE_);
      listWrap.innerHTML =
        '<div style="margin-top:12px;">' + pageLines.map(function (l, idx) {
          // Kind lain (halaqoh/kelas/regu/hafalan/dst) ngasih line berupa string polos;
          // akademikKelas/Halaqoh/Regu ngasih {text, color} (lihat formatMissingSantriDetail_)
          // supaya bisa dikasih warna per-baris (hijau utk santri dibekukan). Nomor
          // urut (bukan bullet) & lanjut antar halaman -- halaman 2 mulai dari 11, dst
          // (bukan reset ke 1 tiap halaman).
          var isObj = l && typeof l === 'object';
          var text = isObj ? l.text : l;
          var colorStyle = isObj && l.color ? 'color:' + l.color + ';font-weight:600;' : '';
          var number = start + idx + 1;
          return '<div style="display:flex;gap:6px;margin-bottom:4px;' + colorStyle + '"><span style="flex-shrink:0;opacity:.6;">' + number + '.</span><span>' + escapeHtml(text) + '</span></div>';
        }).join('') + '</div>' +
        (isSantriKind ? '<div style="margin-top:10px;font-size:11px;color:#999;">Dibekukan itu antara baru keluar, cuti, dan pengabdian. Jadi kalau sudah pengabdian maka harus diubah jadi Dibekukan, dan ini hanya bisa dilakukan oleh Admin.</div>' : '') +
        (item.dibekukanWajib && kindConfig.dibekukanWajibLabel ? '<div style="margin-top:6px;font-size:11px;color:#999;">' + kindConfig.dibekukanWajibLabel + '</div>' : '') +
        buildAuditDetailPaginationHtml_(currentPage, totalPages);
      listWrap.querySelectorAll('._auditDetailPageBtn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          currentPage = Number(btn.dataset.page);
          renderPage();
        });
      });
    }
    renderPage();

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeAuditDetailDialog_(); });
    card.querySelector('#_auditDetailCloseBtn').addEventListener('click', closeAuditDetailDialog_);
  }

  function syncAbsensiHalaqohAudit(options) {
    var session = resolveSession(options || {});
    var token = (session && session.token) || '';
    if (!token) return;
    fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'absensi.owed', token: token })
    }).then(function (r) { return r.json(); }).then(function (json) {
      if (!json.ok || !json.data || !json.data.items || !json.data.items.length) return;
      showAuditPopup(session, json.data.items);
    }).catch(function () {});
  }

  // Satu kartu berisi SEMUA item sekaligus (halaqoh + kelas digabung dalam satu daftar),
  // bukan antrean bergantian -- supaya di layar cuma pernah ada 1 popup, titik.
  function showAuditPopup(session, items) {
    if (global.document.getElementById('_auditPopup')) return;

    // Kalau SATU-SATUNYA item yang tersisa adalah pengingat "belum isi jurnal hari ini"
    // (blocksJurnal: false, lihat collectJurnalSdmGapItem_ di backend) -- artinya semua
    // audit yang benar-benar "melanggar" sudah beres -- popup tampil hijau (pengingat
    // santai), bukan merah (pelanggaran), supaya tidak terkesan sama seriusnya.
    var isOnlyGentleReminder = items.length > 0 && items.every(function (item) { return item.blocksJurnal === false; });
    var theme = isOnlyGentleReminder ? ANNOUNCEMENT_THEMES.hijau : ANNOUNCEMENT_THEMES.merah;
    var popup = global.document.createElement('div');
    popup.id = '_auditPopup';
    popup.style.cssText = [
      'position:fixed', 'left:16px', 'bottom:16px', 'z-index:9998',
      'max-width:360px', 'width:calc(100% - 32px)',
      'max-height:calc(100vh - 32px)', 'overflow-y:auto', 'box-sizing:border-box',
      'background:' + theme.bg, 'color:' + theme.ink, 'border-radius:14px',
      'box-shadow:0 18px 40px rgba(0,0,0,0.28)', 'padding:16px 18px',
      'border:1px solid ' + theme.border, 'font-size:13px', 'line-height:1.5'
    ].join(';');

    var rowsHtml = items.map(function (item, index) {
      var kindConfig = AUDIT_KIND_CONFIG[item.kind] || AUDIT_KIND_CONFIG.halaqoh;
      // 3 audit akademik baru (akademikKelas/Halaqoh/Regu, soal jumlah keanggotaan santri)
      // dikasih simbol 💠 di sebelah judulnya -- biar beda dari 7 audit "lama" (backlog
      // harian per entitas) yg dibiarkan tanpa penanda tambahan. Keputusan user 2026-08-03
      // (awalnya coba warna biru, lalu label teks "(Penting)", akhirnya simbol saja).
      var titleText = kindConfig.entityLabel + (item.name ? ' ' + escapeHtml(item.name) : '') + (AUDIT_NEW_KINDS_[item.kind] ? ' 💠' : '');
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;' + (index ? 'border-top:1px solid ' + theme.border + ';' : '') + '">' +
          '<div style="min-width:0;">' +
            '<div style="font-weight:700;">' + titleText + '</div>' +
            '<div style="font-size:11px;color:' + theme.hint + ';margin-top:2px;">' + Number(item.missingCount || 0) + ' ' + (kindConfig.missingLabel || 'hari belum diisi') + '</div>' +
          '</div>' +
          '<div style="flex-shrink:0;display:flex;gap:6px;">' +
            '<button type="button" class="_auditDetailBtn" data-index="' + index + '" aria-label="Rincian" title="Rincian" style="border:1px solid ' + theme.border + ';border-radius:8px;background:transparent;color:' + theme.ink + ';padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;">&#8505;</button>' +
            '<button type="button" class="_auditFixBtn" data-index="' + index + '" style="border:none;border-radius:8px;background:' + theme.ink + ';color:' + theme.bg + ';padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;">Bereskan</button>' +
          '</div>' +
        '</div>';
    }).join('');

    popup.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
        '<strong style="font-size:14px;">' + (isOnlyGentleReminder ? '&#128221;&ensp;Pengingat' : '&#9888;&ensp;Audit') + '</strong>' +
        '<button type="button" id="_auditCloseBtn" aria-label="Tutup" style="border:none;background:transparent;color:' + theme.ink + ';font-size:18px;line-height:1;cursor:pointer;padding:0 2px;flex-shrink:0;">&times;</button>' +
      '</div>' +
      '<div style="margin-top:4px;">' + rowsHtml + '</div>';

    global.document.body.appendChild(popup);

    popup.querySelectorAll('._auditDetailBtn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = items[Number(btn.dataset.index)];
        var kindConfig = AUDIT_KIND_CONFIG[item.kind] || AUDIT_KIND_CONFIG.halaqoh;
        showAuditDetailDialog_(kindConfig, item);
      });
    });

    popup.querySelectorAll('._auditFixBtn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = items[Number(btn.dataset.index)];
        var kindConfig = AUDIT_KIND_CONFIG[item.kind] || AUDIT_KIND_CONFIG.halaqoh;
        if (global.PSAccess && typeof global.PSAccess.getRoleScopeOptions === 'function' && typeof global.PSAccess.setRoleScope === 'function' && typeof global.PSAccess.getScopedSession === 'function') {
          var scopeOptions = global.PSAccess.getRoleScopeOptions(session) || [];
          var match = scopeOptions.filter(function (opt) {
            return kindConfig.scopeKeywords.some(function (kw) { return (opt.label || '').toLowerCase().indexOf(kw) !== -1; });
          })[0];
          if (match) {
            // setRoleScope() punya semantik TOGGLE (klik scope yg sama dgn yg lagi aktif =
            // dianggap "batalkan", balik ke default) -- pas buat dropdown manual, tapi SALAH
            // di sini karena klik "Bereskan" harus idempoten (services scope jadi X, titik,
            // bukan nyalakan/matikan X). Kalau scope yg lagi aktif KEBETULAN sudah = match
            // (mis. audit kelas diklik dua kali, atau abis pindah scope manual ke situ),
            // manggil setRoleScope tetap bakal MENGHAPUS scope itu -- makanya di-skip kalau
            // sudah sama persis (lihat CATATAN-POPUP-PENGUMUMAN-DAN-AUDIT-ABSENSI.txt bag. 5).
            var currentScoped = global.PSAccess.getScopedSession(session);
            var currentLabel = (currentScoped && currentScoped.primaryJabatanLabel) || '';
            if (currentLabel.toLowerCase() !== String(match.label).toLowerCase()) {
              global.PSAccess.setRoleScope(session, match.label);
            }
          }
        }
        if (kindConfig.membershipMismatch) {
          storeAuditMismatchSantriAndRedirect_(kindConfig, item);
          return;
        }
        global.location.href = kindConfig.queryParam
          ? kindConfig.redirectPath + '?' + kindConfig.queryParam + '=' + encodeURIComponent(item.id)
          : kindConfig.redirectPath;
      });
    });
    popup.querySelector('#_auditCloseBtn').addEventListener('click', function () {
      popup.remove();
    });
  }

  // ── "Bereskan" utk 3 audit membership-mismatch (akademikKelas/Halaqoh/Regu) ─────────────
  // BEDA dari kind lain: item.id di kind ini cuma placeholder 'global' (bukan 1 entitas asli,
  // lihat komentar AUDIT_KIND_CONFIG di atas), jadi tidak bisa deep-link ke 1 dialog tertentu
  // spt kind lain (queryParam openKelas dst). Sebagai gantinya: simpan daftar santri
  // bermasalah (item.missingSantri) ke sessionStorage, redirect polos ke halaman listing
  // (editKelas/editHalaqoh/editRegu) dgn marker ?auditFix=1 di URL. Halaman tujuan (dipanggil
  // scriptnya SENDIRI, lihat consumeAuditMismatchSantriPanel di bawah) baca marker itu, ambil
  // data dari sessionStorage, lalu tampilkan overlay daftar nama santrinya -- keputusan user
  // 2026-08-15 (sebelumnya "Bereskan" di 3 kind ini cuma redirect polos tanpa nampilin apa2).
  var AUDIT_MISMATCH_STORAGE_KEY_ = 'ps_audit_mismatch_santri';

  function storeAuditMismatchSantriAndRedirect_(kindConfig, item) {
    try {
      global.sessionStorage.setItem(AUDIT_MISMATCH_STORAGE_KEY_, JSON.stringify({
        unitLabel: kindConfig.unitLabel || '',
        missingSantri: item.missingSantri || []
      }));
    } catch (_) {}
    global.location.href = kindConfig.redirectPath + '?auditFix=1';
  }

  // Dipanggil DARI HALAMAN editKelas/editHalaqoh/editRegu sendiri (setelah loadData pertama
  // selesai) buat cek apakah baru saja datang dari tombol "Bereskan". Kalau ya: bersihkan URL
  // & sessionStorage, lalu tampilkan overlay. onPickSantri(name) dipanggil kalau user klik
  // salah satu nama di overlay -- halaman pemanggil yang atur searchInput & loadData()-nya
  // sendiri (tiap halaman punya closure `state` sendiri-sendiri, tidak bisa digeneralisasi di
  // sini).
  function consumeAuditMismatchSantriPanel(onPickSantri) {
    var params = new global.URLSearchParams(global.location.search);
    if (params.get('auditFix') !== '1') return;
    global.history.replaceState(null, '', global.location.pathname);
    var raw = null;
    try {
      raw = global.sessionStorage.getItem(AUDIT_MISMATCH_STORAGE_KEY_);
      global.sessionStorage.removeItem(AUDIT_MISMATCH_STORAGE_KEY_);
    } catch (_) {}
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (_) { return; }
    var list = (data && data.missingSantri) || [];
    if (!list.length) return;
    showAuditMismatchSantriPanel_(data.unitLabel, list, onPickSantri);
  }

  function showAuditMismatchSantriPanel_(unitLabel, list, onPickSantri) {
    var overlay = global.document.createElement('div');
    overlay.id = '_auditMismatchSantriOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

    var rowsHtml = list.map(function (s, index) {
      var statusLabel = s.status === 'dibekukan' ? (s.keterangan || 'Dibekukan') : 'Aktif';
      return '<div class="_auditMismatchRow" data-index="' + index + '" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-top:1px dashed rgba(41,23,15,0.15);cursor:pointer;">' +
        '<span><strong>' + escapeHtml(s.name || '(tanpa nama)') + '</strong><br><span style="font-size:11px;color:#7b6a58;">' + escapeHtml(statusLabel) + '</span></span>' +
        '<span style="color:#a55a52;font-weight:700;font-size:12px;flex-shrink:0;">' + Number(s.count || 0) + ' ' + escapeHtml(unitLabel || '') + '</span>' +
      '</div>';
    }).join('');

    var card = global.document.createElement('div');
    card.style.cssText = 'background:#fff8ec;color:#2b2620;border-radius:16px;max-width:460px;width:100%;max-height:calc(100vh - 32px);overflow-y:auto;box-sizing:border-box;padding:20px 22px;box-shadow:0 24px 60px rgba(0,0,0,0.35);';
    card.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">' +
        '<strong style="font-size:15px;">Santri Bermasalah (' + list.length + ')</strong>' +
        '<button type="button" id="_auditMismatchCloseBtn" aria-label="Tutup" style="border:none;background:transparent;font-size:20px;line-height:1;cursor:pointer;padding:0 2px;">&times;</button>' +
      '</div>' +
      '<div style="font-size:12px;color:#7b6a58;margin-top:4px;">Klik nama santri utk cari &amp; tampilkan di daftar bawah.</div>' +
      '<div style="margin-top:8px;">' + rowsHtml + '</div>';

    overlay.appendChild(card);
    global.document.body.appendChild(overlay);

    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    card.querySelector('#_auditMismatchCloseBtn').addEventListener('click', close);
    card.querySelectorAll('._auditMismatchRow').forEach(function (row) {
      row.addEventListener('click', function () {
        var s = list[Number(row.dataset.index)];
        close();
        if (typeof onPickSantri === 'function' && s) onPickSantri(s.name || '');
      });
    });
  }

  // ── Kelola Audit Bawahan ────────────────────────────────────────────────────────
  // Popup pojok KANAN-bawah (sengaja beda sisi dari popup self-audit di pojok KIRI-bawah
  // di atas, biar tidak numpuk) -- MUNCUL OTOMATIS tiap halaman dimuat, gaya kartu identik
  // dgn showAuditPopup di atas (rows + tombol Rincian + tombol &times; buat nutup), BUKAN
  // tombol yang harus diklik dulu (keputusan user 2026-08-05). TIDAK ADA konsekuensi/
  // lockout apa pun -- beda mendasar dari showAuditPopup (yang bisa memblokir akses Jurnal
  // SDM). Tidak ada state "sudah dilihat" yang disimpan (sama spt showAuditPopup): popup
  // ini murni derived dari data live, akan tetap muncul lagi di halaman berikutnya kalau
  // masih ada bawahan yang bolong, walau baru saja ditutup manual. 3 kind (akademik ->
  // pengajar kelas siang; koordHalaqohAbsensi & koordHalaqohHafalan -> pengampu halaqoh,
  // masing2 utk Koordinator Halaqoh), definisi "bolong" sama persis dgn kind sepadan di
  // absensi.owed (lihat AUDIT_BAWAHAN_KINDS_ di backend). Backend (action 'auditBawahan.list')
  // sudah menggerbang siapa yang boleh lihat & apakah item-nya aktif (diatur di halaman
  // kelolaAuditBawahan), PAKAI rawPermissions (bukan permissions) supaya TIDAK PEDULI scope
  // aktif di UI -- lihat canManageAuditBawahan_ di backend.
  function syncAuditBawahanWidget(options) {
    var session = resolveSession(options || {});
    var token = (session && session.token) || '';
    if (!token) return;
    fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auditBawahan.list', token: token })
    }).then(function (r) { return r.json(); }).then(function (json) {
      if (!json.ok || !json.data || !json.data.items || !json.data.items.length) return;
      showAuditBawahanPopup_(json.data.items);
    }).catch(function () {});
  }

  // Simbol peringatan (⚠️) buat penanda cepat "sudah cukup parah" -- keputusan user
  // 2026-08-07, DI DEPAN nama/labelnya (bukan di belakang angka), di SEMUA level popup
  // (ringkasan kind, daftar nama, rincian per-entitas). Ambang "parah"-nya beda per kind,
  // makanya dihitung di BACKEND (field `warn` per entitas & `hasWarn` per bawahan/kind di
  // handleAuditBawahanList_, backend/server.js) bukan di sini -- utk absensi/hafalan artinya
  // missingCount total >=5 hari (kumulatif sejak awal TA), tapi utk nilaiWajib artinya
  // "sudah lewat >=5 hari dari tanggal ujian/tenggatnya" (bukan jumlah santri, itu makna yg
  // beda sama sekali). Frontend cuma nampilin flag booleannya.
  function auditBawahanWarningIcon_(warn) {
    return warn ? '⚠️ ' : '';
  }

  // 1 baris per KIND (bukan per bawahan) -- sama pola dgn 3 kind akademik di showAuditPopup
  // (akademikKelas/Halaqoh/Regu, yg juga 1 baris polos "Santri Aktif Tidak Tepat 3 Kelas
  // Siang" dgn jumlah santri bermasalah, BUKAN 1 baris per santri). Klik "Rincian" baru
  // pecah jadi daftar nama bawahan (keputusan user 2026-08-05, awalnya popup ini langsung
  // 1 baris per bawahan -- terlalu panjang kalau bawahannya banyak).
  function showAuditBawahanPopup_(items) {
    if (global.document.getElementById('_auditBawahanPopup')) return;
    var visibleItems = items.filter(function (item) { return (item.bawahan || []).length; });
    if (!visibleItems.length) return;

    var theme = ANNOUNCEMENT_THEMES.biru;
    var popup = global.document.createElement('div');
    popup.id = '_auditBawahanPopup';
    popup.style.cssText = [
      'position:fixed', 'right:16px', 'bottom:16px', 'z-index:9998',
      'max-width:360px', 'width:calc(100% - 32px)',
      'max-height:calc(100vh - 32px)', 'overflow-y:auto', 'box-sizing:border-box',
      'background:' + theme.bg, 'color:' + theme.ink, 'border-radius:14px',
      'box-shadow:0 18px 40px rgba(0,0,0,0.28)', 'padding:16px 18px',
      'border:1px solid ' + theme.border, 'font-size:13px', 'line-height:1.5'
    ].join(';');

    var rowsHtml = visibleItems.map(function (item, index) {
      var count = (item.bawahan || []).length;
      var titleText = auditBawahanWarningIcon_(item.hasWarn) + escapeHtml(item.title || item.kind) + (item.roleLabel ? ' (' + escapeHtml(item.roleLabel) + ')' : '');
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;' + (index ? 'border-top:1px solid ' + theme.border + ';' : '') + '">' +
          '<div style="min-width:0;">' +
            '<div style="font-weight:700;">' + titleText + '</div>' +
            '<div style="font-size:11px;color:' + theme.hint + ';margin-top:2px;">' + count + ' ' + escapeHtml(item.target || 'bawahan') + ' belum menyelesaikan tugas</div>' +
          '</div>' +
          '<button type="button" class="_auditBawahanDetailBtn" data-index="' + index + '" aria-label="Rincian" title="Rincian" style="border:1px solid ' + theme.border + ';border-radius:8px;background:transparent;color:' + theme.ink + ';padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;">&#8505;</button>' +
        '</div>';
    }).join('');

    // Legenda simbol, cuma ditampilkan kalau ada ⚠️ yg BENERAN kepakai di salah satu baris
    // (keputusan user 2026-08-07, sama pola dgn footer pesan WA broadcast).
    var anyWarn = visibleItems.some(function (item) { return !!item.hasWarn; });
    var legendHtml = anyWarn ? '<div style="font-size:11px;color:' + theme.hint + ';margin-top:10px;padding-top:8px;border-top:1px solid ' + theme.border + ';">⚠️ = Kalau sudah lebih dari 5 hari</div>' : '';

    popup.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
        '<strong style="font-size:14px;color:' + theme.ink + ';">&#128203;&ensp;Audit Bawahan</strong>' +
        '<button type="button" id="_auditBawahanCloseBtn" aria-label="Tutup" style="border:none;background:transparent;color:' + theme.ink + ';font-size:18px;line-height:1;cursor:pointer;padding:0 2px;flex-shrink:0;">&times;</button>' +
      '</div>' +
      '<div style="font-size:11px;color:' + theme.hint + ';margin-top:2px;">Murni informasi, tidak memblokir akses siapa pun.</div>' +
      '<div style="margin-top:4px;">' + rowsHtml + '</div>' + legendHtml;

    global.document.body.appendChild(popup);

    popup.querySelectorAll('._auditBawahanDetailBtn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showAuditBawahanNamesDialog_(visibleItems[Number(btn.dataset.index)]);
      });
    });
    popup.querySelector('#_auditBawahanCloseBtn').addEventListener('click', function () {
      popup.remove();
    });
  }

  function closeAuditBawahanNamesDialog_() {
    var el = global.document.getElementById('_auditBawahanNamesOverlay');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // Overlay level-1 (diklik dari tombol Rincian di popup): daftar NAMA bawahan yang
  // bermasalah utk 1 kind. Klik salah satu nama buka overlay level-2 (showAuditBawahanDetailDialog_,
  // breakdown per-kelas + deep-link ke halaman absensinya).
  function showAuditBawahanNamesDialog_(item) {
    closeAuditBawahanNamesDialog_();
    var overlay = global.document.createElement('div');
    overlay.id = '_auditBawahanNamesOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

    var bawahanList = item.bawahan || [];
    var rowsHtml = bawahanList.map(function (b, index) {
      return '<div class="_auditBawahanNameRow" data-index="' + index + '" style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px dashed rgba(41,23,15,0.12);cursor:pointer;">' +
        '<span>' + auditBawahanWarningIcon_(b.hasWarn) + escapeHtml(b.pengurusName || '(tidak diketahui)') + '</span>' +
        '<span style="color:#a55a52;font-weight:700;flex-shrink:0;">' + Number(b.totalMissing || 0) + ' ' + escapeHtml(item.unitLabel || 'hari bolong') + '</span>' +
      '</div>';
    }).join('');

    var card = global.document.createElement('div');
    card.style.cssText = 'background:#fff8ec;color:#2b2620;border-radius:16px;max-width:460px;width:100%;max-height:calc(100vh - 32px);overflow-y:auto;box-sizing:border-box;padding:20px 22px;box-shadow:0 24px 60px rgba(0,0,0,0.35);';
    card.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">' +
        '<strong style="font-size:15px;text-transform:uppercase;letter-spacing:0.03em;">' + auditBawahanWarningIcon_(item.hasWarn) + escapeHtml(item.title || item.kind) + (item.roleLabel ? ' (' + escapeHtml(item.roleLabel) + ')' : '') + '</strong>' +
        '<button type="button" id="_auditBawahanNamesCloseBtn" aria-label="Tutup" style="border:none;background:transparent;font-size:20px;line-height:1;cursor:pointer;padding:0 2px;">&times;</button>' +
      '</div>' +
      '<div style="font-size:12px;color:#7b6a58;margin-top:4px;">' + escapeHtml(item.target || '') + ' &middot; klik nama untuk lihat rincian per-kelas.</div>' +
      '<div style="margin-top:10px;">' + (rowsHtml || '<div style="padding:12px 0;color:#7b6a58;font-size:12.5px;">Tidak ada yang bermasalah.</div>') + '</div>';

    overlay.appendChild(card);
    global.document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeAuditBawahanNamesDialog_(); });
    card.querySelector('#_auditBawahanNamesCloseBtn').addEventListener('click', closeAuditBawahanNamesDialog_);
    card.querySelectorAll('._auditBawahanNameRow').forEach(function (row) {
      row.addEventListener('click', function () {
        showAuditBawahanDetailDialog_(item, bawahanList[Number(row.dataset.index)]);
      });
    });
  }

  function closeAuditBawahanDetailDialog_() {
    var el = global.document.getElementById('_auditBawahanDetailOverlay');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function showAuditBawahanDetailDialog_(item, bawahan) {
    closeAuditBawahanDetailDialog_();
    var overlay = global.document.createElement('div');
    overlay.id = '_auditBawahanDetailOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

    var entitiesHtml = (bawahan.entities || []).map(function (e) {
      // e.missingDates cuma ada di kind yg gap-nya "hari bolong" (absensi/hafalan) -- kind
      // nilaiWajib tidak punya (gap-nya "santri belum dinilai", bukan hari), jadi dateHtml
      // otomatis kosong lewat formatMissingDatesDetail_([]) -> [] -- keputusan user
      // 2026-08-07: rincian per-entitas kurang detail tanpa tanggal persis, sama kayak yg
      // sudah ditambahkan ke pesan broadcast WA (formatBawahanMissingDatesForBroadcast_ di
      // backend/server.js), sekarang popup-nya juga dikasih.
      var dateLines = formatMissingDatesDetail_(e.missingDates);
      var dateHtml = dateLines.length
        ? '<div style="font-size:11px;color:#7b6a58;margin-top:2px;">' + dateLines.map(escapeHtml).join('; ') + '</div>'
        : '';
      return '<div style="padding:8px 0;border-top:1px dashed rgba(41,23,15,0.12);">' +
        '<div style="display:flex;justify-content:space-between;gap:10px;">' +
          '<span>' + auditBawahanWarningIcon_(e.warn) + escapeHtml(e.name || '(tanpa nama)') + '</span>' +
          '<span style="color:#a55a52;font-weight:700;flex-shrink:0;">' + Number(e.missingCount || 0) + ' ' + escapeHtml(item.unitLabel || 'hari bolong') + '</span>' +
        '</div>' + dateHtml +
      '</div>';
    }).join('');

    var card = global.document.createElement('div');
    card.style.cssText = 'background:#fff8ec;color:#2b2620;border-radius:16px;max-width:460px;width:100%;max-height:calc(100vh - 32px);overflow-y:auto;box-sizing:border-box;padding:20px 22px;box-shadow:0 24px 60px rgba(0,0,0,0.35);';
    card.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">' +
        '<strong style="font-size:15px;text-transform:uppercase;letter-spacing:0.03em;">' + auditBawahanWarningIcon_(bawahan.hasWarn) + escapeHtml(bawahan.pengurusName || '(tidak diketahui)') + '</strong>' +
        '<button type="button" id="_auditBawahanDetailCloseBtn" aria-label="Tutup" style="border:none;background:transparent;font-size:20px;line-height:1;cursor:pointer;padding:0 2px;">&times;</button>' +
      '</div>' +
      '<div style="font-size:12px;color:#7b6a58;margin-top:4px;">' + escapeHtml(item.target || '') + '</div>' +
      '<div style="margin-top:10px;">' + entitiesHtml + '</div>';

    overlay.appendChild(card);
    global.document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeAuditBawahanDetailDialog_(); });
    card.querySelector('#_auditBawahanDetailCloseBtn').addEventListener('click', closeAuditBawahanDetailDialog_);
  }

  // ── Survey wajib ────────────────────────────────────────────────────────────────
  // Beda mendasar dari syncAnnouncementPopup: popup ini TIDAK BISA ditutup (tidak ada
  // tombol x, tidak bisa klik di luar, tidak ada ESC) sampai SEMUA pertanyaan terjawab
  // benar. Jawaban benar/salah divalidasi lewat server (action 'survey.answer.check'),
  // BUKAN di JS ini -- kunci jawaban tidak pernah ikut termuat di awal (per-soal, cuma
  // dikirim balik server SETELAH dijawab, dan hanya kalau salah) jadi tidak bisa diintip
  // lewat DevTools sebelum menjawab. Jawaban yang dipilih diberi warna (merah kalau
  // salah, hijau kalau itu jawaban benar) + suara "Benar"/"Salah" via speechSynthesis,
  // lalu pertanyaan yang dijawab salah dipindah ke akhir antrean (requeue) dengan opsi
  // pilihan ganda diacak ULANG.
  var _surveyQueue = [];

  function shuffleArray_(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }

  // Suara "Benar"/"Salah" lewat Web Speech API bawaan browser (bukan file audio) --
  // supaya tidak perlu asset tambahan & otomatis pakai suara bahasa Indonesia kalau ada.
  function speakSurveyResult_(correct) {
    try {
      if (!global.speechSynthesis || !global.SpeechSynthesisUtterance) return;
      global.speechSynthesis.cancel();
      var utter = new global.SpeechSynthesisUtterance(correct ? 'Benar' : 'Salah');
      utter.lang = 'id-ID';
      utter.rate = 1;
      global.speechSynthesis.speak(utter);
    } catch (_) {}
  }

  function surveyApiPost(action, payload, token) {
    return fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action: action, token: token }, payload || {}))
    }).then(function (r) { return r.json(); });
  }

  function syncSurveyQueue(options) {
    var session = resolveSession(options || {});
    var token = (session && session.token) || '';
    if (!token) return;
    fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'survey.owed', token: token })
    }).then(function (r) { return r.json(); }).then(function (json) {
      if (!json.ok || !json.data || !json.data.items || !json.data.items.length) return;
      _surveyQueue = json.data.items;
      showNextSurvey(token);
    }).catch(function () {});
  }

  function showNextSurvey(token) {
    if (global.document.getElementById('_surveyOverlay')) return;
    var survey = _surveyQueue.shift();
    if (!survey) return;
    runSurveyFlow(survey, token);
  }

  function runSurveyFlow(survey, token) {
    var queue = (survey.questions || []).map(function (q) { return prepareSurveyQuestionRuntime_(q); });
    var finalAnswers = {};
    var wrongCount = 0;

    var overlay = global.document.createElement('div');
    overlay.id = '_surveyOverlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:10000',
      'display:flex', 'flex-direction:column',
      'box-sizing:border-box', 'background:#1f2430', 'color:#f5f3ee',
      'font-size:15px', 'line-height:1.6'
    ].join(';');
    overlay.innerHTML =
      '<div style="flex-shrink:0;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.12);">' +
        '<div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#e0a458;">Survey Wajib &mdash; harus dituntaskan</div>' +
        '<strong style="font-size:19px;display:block;margin-top:4px;color:#f5f3ee !important;">' + escapeHtml(survey.title) + '</strong>' +
        (survey.description ? '<div style="margin-top:8px;font-size:13px;color:rgba(245,243,238,0.75);white-space:pre-wrap;">' + escapeHtml(survey.description) + '</div>' : '') +
      '</div>' +
      '<div id="_surveyBody" style="flex:1 1 auto;overflow-y:auto;padding:24px 22px;display:flex;flex-direction:column;align-items:center;">' +
      '</div>';
    global.document.body.appendChild(overlay);

    renderCurrentQuestion();

    function prepareSurveyQuestionRuntime_(q) {
      if (q.type === 'mc') {
        return { id: q.id, type: 'mc', text: q.text, options: shuffleArray_(q.options || []) };
      }
      return { id: q.id, type: 'short', text: q.text };
    }

    function finishSurvey() {
      surveyApiPost('survey.complete', {
        surveyId: survey.id,
        answers: Object.keys(finalAnswers).map(function (qid) { return { questionId: qid, answer: finalAnswers[qid] }; }),
        wrongCount: wrongCount
      }, token).then(function (json) {
        if (!json.ok) {
          // Harusnya tidak pernah kejadian (semua sudah divalidasi benar per-soal via
          // survey.answer.check) -- kalau tetap gagal, main aman: ulang dari awal
          // drpd macet di popup yg tidak bisa ditutup.
          queue = (survey.questions || []).map(function (q) { return prepareSurveyQuestionRuntime_(q); });
          finalAnswers = {};
          renderCurrentQuestion('Terjadi kendala validasi, mari ulangi dari awal.');
          return;
        }
        overlay.remove();
        showNextSurvey(token);
      }).catch(function () {
        renderCurrentQuestion('Gagal terhubung ke server. Coba jawab ulang pertanyaan terakhir.');
      });
    }

    function renderCurrentQuestion(feedbackText) {
      if (!queue.length) { finishSurvey(); return; }
      var q = queue[0];
      var body = overlay.querySelector('#_surveyBody');
      var remainingNote = queue.length > 1 ? ('<div style="margin-top:6px;font-size:11px;color:rgba(245,243,238,0.6);">Masih ada ' + (queue.length - 1) + ' pertanyaan lagi (termasuk yang diulang).</div>') : '';
      var feedbackHtml = feedbackText ? ('<div style="margin-top:14px;padding:10px 16px;border-radius:10px;background:rgba(224,164,88,0.18);color:#f3cf9a;font-size:13px;max-width:520px;width:100%;box-sizing:border-box;text-align:center;">' + escapeHtml(feedbackText) + '</div>') : '';
      var answerAreaHtml = q.type === 'mc'
        ? q.options.map(function (opt, idx) {
            return '<label style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:10px;background:rgba(255,255,255,0.06);cursor:pointer;margin-top:8px;color:#f5f3ee !important;font-weight:400 !important;text-transform:none !important;" data-survey-option>' +
              '<input type="radio" name="_surveyMcOption" value="' + idx + '" style="width:auto;">' +
              '<span>' + escapeHtml(opt) + '</span>' +
            '</label>';
          }).join('')
        : '<input type="text" id="_surveyShortAnswer" placeholder="Ketik jawaban di sini..." style="width:100%;max-width:520px;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.25);background:rgba(255,255,255,0.06);color:#f5f3ee;font:inherit;box-sizing:border-box;margin-top:10px;">';

      body.innerHTML =
        '<div style="max-width:560px;width:100%;">' +
          '<strong style="font-size:16px;display:block;color:#f5f3ee !important;">' + escapeHtml(q.text) + '</strong>' +
          remainingNote +
          '<div style="margin-top:14px;">' + answerAreaHtml + '</div>' +
          '<div style="margin-top:8px;font-size:12px;color:#e07a6b;display:none;" id="_surveyInlineError"></div>' +
          '<div id="_surveyResultFeedback" style="display:none;margin-top:14px;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:600;max-width:520px;width:100%;box-sizing:border-box;text-align:center;"></div>' +
          '<button type="button" id="_surveySubmitBtn" style="display:block;margin-top:18px;margin-left:auto;border:none;border-radius:10px;background:#e0a458;color:#1f2430;padding:12px 22px;font-size:14px;font-weight:700;cursor:pointer;">Jawab</button>' +
          feedbackHtml +
        '</div>';

      body.querySelector('#_surveySubmitBtn').addEventListener('click', function () {
        submitCurrentAnswer(q);
      });
      if (q.type === 'short') {
        var input = body.querySelector('#_surveyShortAnswer');
        input.addEventListener('keydown', function (event) {
          if (event.key === 'Enter') submitCurrentAnswer(q);
        });
        input.focus();
      }
    }

    // Setelah dijawab, TIDAK langsung pindah ke soal berikutnya -- soal yg sama tetap
    // ditampilkan dulu dengan opsi yg dipilih diwarnai (merah kalau salah, hijau kalau
    // jawaban itu benar), suara "Benar"/"Salah" diucapkan, lalu baru lanjut otomatis
    // (atau via tombol "Lanjut") supaya user sempat lihat feedback-nya.
    function submitCurrentAnswer(q) {
      var body = overlay.querySelector('#_surveyBody');
      var errorEl = body.querySelector('#_surveyInlineError');
      var answer = '';
      var selectedLabel = null;
      if (q.type === 'mc') {
        var checked = body.querySelector('input[name="_surveyMcOption"]:checked');
        if (!checked) { errorEl.textContent = 'Pilih salah satu opsi dulu.'; errorEl.style.display = 'block'; return; }
        answer = q.options[parseInt(checked.value, 10)];
        selectedLabel = checked.closest('[data-survey-option]');
      } else {
        answer = body.querySelector('#_surveyShortAnswer').value.trim();
        if (!answer) { errorEl.textContent = 'Isi jawaban dulu.'; errorEl.style.display = 'block'; return; }
      }
      errorEl.style.display = 'none';
      var submitBtn = body.querySelector('#_surveySubmitBtn');
      submitBtn.disabled = true;
      body.querySelectorAll('input').forEach(function (el) { el.disabled = true; });
      surveyApiPost('survey.answer.check', { surveyId: survey.id, questionId: q.id, answer: answer }, token).then(function (json) {
        if (!json.ok) {
          submitBtn.disabled = false;
          body.querySelectorAll('input').forEach(function (el) { el.disabled = false; });
          errorEl.textContent = (json.error && json.error.message) || 'Gagal memeriksa jawaban.'; errorEl.style.display = 'block';
          return;
        }
        var correct = !!json.data.correct;
        var correctAnswerText = json.data.correctAnswerText || '';
        speakSurveyResult_(correct);
        queue.shift();

        var GREEN_BG = 'rgba(116,196,120,0.32)', GREEN_BORDER = '1px solid rgba(116,196,120,0.85)';
        var RED_BG = 'rgba(224,90,90,0.32)', RED_BORDER = '1px solid rgba(224,90,90,0.85)';
        if (q.type === 'mc') {
          body.querySelectorAll('[data-survey-option]').forEach(function (label) {
            var span = label.querySelector('span');
            var isSelected = label === selectedLabel;
            var isCorrectOption = correct ? isSelected : (span && span.textContent === correctAnswerText);
            if (isCorrectOption) { label.style.background = GREEN_BG; label.style.border = GREEN_BORDER; }
            else if (isSelected) { label.style.background = RED_BG; label.style.border = RED_BORDER; }
          });
        } else {
          var shortInput = body.querySelector('#_surveyShortAnswer');
          if (shortInput) {
            shortInput.style.background = correct ? GREEN_BG : RED_BG;
            shortInput.style.border = correct ? GREEN_BORDER : RED_BORDER;
            if (!correct && correctAnswerText) {
              var hint = global.document.createElement('div');
              hint.style.cssText = 'margin-top:8px;font-size:13px;color:#8fd18f;font-weight:600;';
              hint.textContent = 'Jawaban yang benar: ' + correctAnswerText;
              shortInput.insertAdjacentElement('afterend', hint);
            }
          }
        }

        var feedbackEl = body.querySelector('#_surveyResultFeedback');
        feedbackEl.style.display = 'block';
        feedbackEl.style.background = correct ? 'rgba(116,196,120,0.18)' : 'rgba(224,90,90,0.18)';
        feedbackEl.style.color = correct ? '#bfe8bf' : '#f3b0a8';
        feedbackEl.textContent = correct ? 'Benar!' : (q.type === 'mc' ? 'Salah. Jawaban benar ditandai hijau di atas.' : 'Salah.');

        if (correct) {
          finalAnswers[q.id] = answer;
        } else {
          wrongCount += 1;
          if (q.type === 'mc') q.options = shuffleArray_(q.options);
          queue.push(q);
        }

        // Ganti tombol Jawab jadi Lanjut (clone utk buang listener submit lama), lalu
        // otomatis lanjut setelah jeda singkat kalau user tidak klik duluan.
        var nextBtn = submitBtn.cloneNode(true);
        nextBtn.disabled = false;
        nextBtn.textContent = queue.length ? 'Lanjut' : 'Lihat Hasil';
        submitBtn.parentNode.replaceChild(nextBtn, submitBtn);
        var advanced = false;
        function proceed() {
          if (advanced) return;
          advanced = true;
          clearTimeout(autoTimer);
          renderCurrentQuestion();
        }
        nextBtn.addEventListener('click', proceed);
        var autoTimer = setTimeout(proceed, correct ? 1400 : 2600);
      }).catch(function () {
        submitBtn.disabled = false;
        body.querySelectorAll('input').forEach(function (el) { el.disabled = false; });
        errorEl.textContent = 'Gagal terhubung ke server. Coba lagi.';
        errorEl.style.display = 'block';
      });
    }
  }

  function listenForSwUpdate() {
    if (!('serviceWorker' in global.navigator)) return;
    // Show a reload banner when a new service worker takes control
    global.navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (global._swUpdateBannerShown) return;
      global._swUpdateBannerShown = true;
      var banner = global.document.createElement('div');
      banner.style.cssText = [
        'position:fixed',
        'bottom:20px',
        'left:50%',
        'transform:translateX(-50%)',
        'background:#1e293b',
        'color:#f8fafc',
        'padding:14px 20px',
        'border-radius:14px',
        'z-index:99999',
        'display:flex',
        'align-items:center',
        'gap:14px',
        'box-shadow:0 8px 32px rgba(0,0,0,0.35)',
        'font-size:14px',
        'font-weight:600',
        'white-space:nowrap',
        'max-width:calc(100vw - 32px)'
      ].join(';');
      banner.innerHTML = '⚡ Versi baru tersedia. <button onclick="location.reload(true)" style="background:#3b82f6;border:0;color:#fff;padding:8px 16px;border-radius:10px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;white-space:nowrap">Muat Ulang</button>';
      global.document.body.appendChild(banner);
    });
  }

  global.PSShell = {
    applyPortalBrand: applyPortalBrand,
    mount: mount,
    syncPortalBrand: syncPortalBrand,
    syncIdentity: syncIdentity,
    toggleDrawer: toggleDrawer,
    getStoredTahunAjaranId: getStoredTahunAjaranId,
    setStoredTahunAjaranId: setStoredTahunAjaranId,
    consumeAuditMismatchSantriPanel: consumeAuditMismatchSantriPanel
  };
}(window));
