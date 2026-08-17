(function () {
  var ISSUE_GROUP_META = {
    active_without_halaqoh: {
      title: 'Santri aktif belum masuk halaqoh',
      successText: 'Semua santri aktif sudah masuk halaqoh.'
    },
    santri_multiple_halaqoh: {
      title: 'Santri aktif masuk lebih dari 1 halaqoh',
      successText: 'Semua santri aktif sudah masuk pada satu halaqoh saja.'
    },
    active_without_three_classes: {
      title: 'Santri aktif belum masuk 3 kelas siang',
      successText: 'Semua santri aktif sudah masuk minimal 3 kelas siang.'
    },
    active_without_regu: {
      title: 'Santri aktif belum masuk regu',
      successText: 'Semua santri aktif sudah masuk regu.'
    },
    frozen_without_assignments: {
      title: 'Santri dibekukan belum lengkap penempatannya',
      state: 'info',
      successText: 'Tidak ada santri dibekukan yang belum lengkap penempatannya.'
    },
    inactive_still_assigned: {
      title: 'Santri inactive masih terdaftar di halaqoh, kelas, atau regu',
      successText: 'Tidak ada santri nonaktif yang masih terdaftar di halaqoh, kelas, atau regu.'
    },
    incomplete_documents: {
      title: 'Santri aktif dengan administrasi belum lengkap',
      successText: 'Dokumen administrasi santri aktif sudah lengkap.'
    },
    santri_incomplete_data: {
      title: 'Santri aktif dengan data penting yang kosong',
      successText: 'Semua santri aktif memiliki data penting yang lengkap.'
    },
    pengurus_without_jabatan: {
      title: 'Pengurus aktif belum punya jabatan aktif',
      successText: 'Semua pengurus aktif sudah punya jabatan aktif.'
    },
    halaqoh_without_pengampu: {
      title: 'Halaqoh aktif belum punya pengampu',
      successText: 'Semua halaqoh aktif sudah punya pengampu.'
    },
    halaqoh_gender_mismatch: {
      title: 'Halaqoh ikhwan/akhowat berisi santri tidak sesuai',
      successText: 'Semua halaqoh sudah sesuai dengan kategori gender santrinya.'
    },
    kelas_without_pengajar: {
      title: 'Kelas aktif belum punya pengajar',
      successText: 'Semua kelas aktif sudah punya pengajar.'
    },
    kelas_without_jam: {
      title: 'Kelas aktif belum memiliki jam',
      successText: 'Semua kelas aktif sudah memiliki jam.'
    },
    kelas_gender_mismatch: {
      title: 'Kelas ikhwan/akhowat berisi murid tidak sesuai',
      successText: 'Semua kelas sudah sesuai dengan kategori gender muridnya.'
    },
    regu_without_pembina: {
      title: 'Regu aktif belum memiliki pembina',
      successText: 'Semua regu aktif sudah memiliki pembina.'
    },
    regu_gender_mismatch: {
      title: 'Regu ikhwan/akhowat berisi santri tidak sesuai',
      successText: 'Semua regu sudah sesuai dengan kategori gender santrinya.'
    },
    kegiatan_sop_without_jabatan: {
      title: 'Kegiatan operasional aktif belum punya jabatan penanggung jawab',
      successText: 'Semua kegiatan operasional aktif sudah punya jabatan penanggung jawab.'
    },
    kegiatan_sop_without_primary_jabatan: {
      title: 'Kegiatan operasional aktif belum punya jabatan penanggung jawab utama',
      successText: 'Semua kegiatan operasional aktif sudah punya jabatan penanggung jawab utama.'
    },
    kegiatan_sop_without_category: {
      title: 'Kegiatan operasional aktif belum punya kategori',
      state: 'info',
      successText: 'Semua kegiatan operasional aktif sudah punya kategori.'
    },
    kegiatan_sop_without_sop: {
      title: 'Kegiatan operasional aktif belum punya SOP',
      successText: 'Semua kegiatan operasional aktif sudah punya SOP.'
    },
    kegiatan_sop_invalid_jabatan: {
      title: 'Kegiatan SOP memiliki referensi jabatan yang hilang',
      successText: 'Tidak ada referensi jabatan yang hilang pada kegiatan SOP.'
    },
    invalid_references: {
      title: 'Ada relasi menuju ID yang tidak ditemukan',
      successText: 'Tidak ada relasi yang mengarah ke ID hilang.'
    },
    duplicate_nik: {
      title: 'Ada NIK santri yang duplikat',
      successText: 'Tidak ada NIK santri yang duplikat.'
    },
    duplicate_no_induk: {
      title: 'Ada No Induk santri yang duplikat',
      successText: 'Tidak ada No Induk santri yang duplikat.'
    }
  };

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatIssueItem(groupKey, item) {
    switch (groupKey) {
      case 'active_without_halaqoh':
        return item.name + ' | No Induk ' + (item.noInduk || '-');
      case 'santri_multiple_halaqoh': {
        var halaqohNames = Array.isArray(item.halaqohNames) ? item.halaqohNames.filter(Boolean) : [];
        return item.name + ' | ' + (halaqohNames.length ? halaqohNames.join(', ') : Number(item.halaqohCount || 0) + ' halaqoh aktif');
      }
      case 'active_without_three_classes':
        return item.name + ' | baru ' + Number(item.kelasCount || 0) + ' kelas aktif';
      case 'active_without_regu':
        return item.name + ' | belum masuk regu';
      case 'frozen_without_assignments': {
        var frozenNotes = Array.isArray(item.missingParts) ? item.missingParts.filter(Boolean) : [];
        return item.name + ' | ' + (frozenNotes.join(', ') || 'penempatan perlu dipantau');
      }
      case 'inactive_still_assigned':
        return item.name + ' | halaqoh ' + Number(item.halaqohCount || 0) + ', kelas ' + Number(item.kelasCount || 0) + ', regu ' + Number(item.reguCount || 0);
      case 'incomplete_documents': {
        var missing = [];
        if (!item.kk) missing.push('KK');
        if (!item.ktp) missing.push('KTP');
        if (!item.akta) missing.push('Akta');
        return item.name + ' | dokumen kurang: ' + (missing.join(', ') || '-');
      }
      case 'santri_incomplete_data': {
        var missingF = Array.isArray(item.missingFields) ? item.missingFields.filter(Boolean) : [];
        return item.name + (item.noInduk ? ' | NIS: ' + item.noInduk : '') + ' | kosong: ' + (missingF.join(', ') || '-');
      }
      case 'pengurus_without_jabatan':
        return item.name + (item.email ? ' | ' + item.email : '');
      case 'halaqoh_without_pengampu':
      case 'halaqoh_gender_mismatch':
      case 'kelas_without_pengajar':
      case 'kelas_without_jam':
      case 'kelas_gender_mismatch':
      case 'regu_without_pembina':
      case 'regu_gender_mismatch':
        if (Array.isArray(item.mismatchNames) && item.mismatchNames.length) {
          return (item.name || item.id || '-') + ' | ' + (item.genderGroup || '-') + ' vs ' + item.mismatchNames.slice(0, 4).join(', ') + (item.mismatchCount > 4 ? ' +' + (item.mismatchCount - 4) + ' lainnya' : '');
        }
        return item.name || item.id || '-';
      case 'kegiatan_sop_without_jabatan':
      case 'kegiatan_sop_without_primary_jabatan':
      case 'kegiatan_sop_without_category':
      case 'kegiatan_sop_without_sop':
        return (item.name || item.id || '-') + (item.category ? ' | ' + item.category : '');
      case 'kegiatan_sop_invalid_jabatan':
        return (item.name || item.id || '-') + ' | field ' + (item.field || '-') + ' kehilangan ID ' + (item.missingId || '-');
      case 'invalid_references':
        return (item.entityName || item.entity || '-') + ' | field ' + (item.field || '-') + ' kehilangan ID ' + (item.missingId || '-');
      case 'duplicate_nik':
      case 'duplicate_no_induk': {
        var names = Array.isArray(item.items) ? item.items.map(function (entry) { return entry.name; }).join(', ') : '-';
        return (item.field || 'Data') + ' ' + (item.value || '-') + ' dipakai oleh ' + names;
      }
      default:
        if (item && item.name) return item.name;
        if (item && item.entityName) return item.entityName;
        return JSON.stringify(item);
    }
  }

  function normalizeConfigValue(value) {
    if (value === true) return {};
    return value && typeof value === 'object' ? value : null;
  }

  function getIssueGroupMeta(groupKey) {
    return ISSUE_GROUP_META[groupKey] || {};
  }

  function getConfiguredIssueKeys(issueConfig, issueGroups) {
    var keys = issueConfig && Object.keys(issueConfig).length ? Object.keys(issueConfig) : Object.keys(ISSUE_GROUP_META);
    (issueGroups || []).forEach(function (group) {
      if (keys.indexOf(group.key) === -1) {
        keys.push(group.key);
      }
    });
    return keys;
  }

  function buildAuditDisplayGroups(issueGroups, issueConfig) {
    var config = issueConfig || {};
    var keys = getConfiguredIssueKeys(config, issueGroups);
    var groupMap = {};
    var displayGroups = [];

    (issueGroups || []).forEach(function (group) {
      groupMap[group.key] = group;
    });

    keys.forEach(function (groupKey) {
      var hasOwnRule = Object.prototype.hasOwnProperty.call(config, groupKey);
      var rule = normalizeConfigValue(hasOwnRule ? config[groupKey] : true);
      var meta = getIssueGroupMeta(groupKey);
      var group = groupMap[groupKey];
      var items = group && Array.isArray(group.items) ? group.items.slice() : [];

      if (!rule) {
        return;
      }

      if (typeof rule.filter === 'function') {
        items = items.filter(rule.filter);
      }

      if (items.length) {
        var groupState = rule.state || meta.state || 'issue';
        displayGroups.push({
          key: groupKey,
          state: groupState === 'info' ? 'info' : 'issue',
          title: (group && group.title) || rule.title || meta.title || groupKey,
          severity: (group && group.severity) || rule.severity || meta.severity || (groupState === 'info' ? 'neutral' : 'medium'),
          shortText: rule.shortText || (group && group.shortText) || meta.shortText || '',
          count: items.length,
          items: items
        });
        return;
      }

      displayGroups.push({
        key: groupKey,
        state: 'resolved',
        title: rule.title || (group && group.title) || meta.title || groupKey,
        severity: 'ok',
        shortText: rule.successText || meta.successText || 'Pemeriksaan ini aman.',
        count: 0,
        items: []
      });
    });

    return displayGroups;
  }

  function createIssuePanelController(api, options) {
    var config = options || {};
    var issueConfig = config.issueConfig || {};
    var summaryId = config.summaryId || 'issueSummary';
    var listId = config.listId || 'issueList';
    var modalId = listId + 'ModalRoot';
    var modalSummaryId = summaryId + 'ModalSummary';
    var modalListId = listId + 'ModalList';
    var itemLimit = Number(config.itemLimit || 5);
    var groupLimit = Number(config.groupLimit || 3);
    var loadingText = config.loadingText || 'Memuat masalah terkait...';
    var emptySummary = config.emptySummary || 'Belum ada masalah terkait untuk halaman ini.';
    var emptyListText = config.emptyListText || 'Tidak ada temuan audit yang relevan saat ini.';
    var expandLabel = config.expandLabel || 'Lihat selengkapnya';
    var collapseLabel = config.collapseLabel || 'Ringkas lagi';
    var expanded = false;
    var cachedGroups = [];

    function getElements() {
      return {
        summary: document.getElementById(summaryId),
        list: document.getElementById(listId)
      };
    }

    function getPanel() {
      var elements = getElements();
      return (elements.summary && elements.summary.closest('.issue-panel'))
        || (elements.list && elements.list.closest('.issue-panel'))
        || null;
    }

    function getModalElements() {
      return {
        modal: document.getElementById(modalId),
        summary: document.getElementById(modalSummaryId),
        list: document.getElementById(modalListId)
      };
    }

    function closeModal() {
      var modal = getModalElements().modal;
      if (!modal) return;
      modal.classList.add('is-hidden');
      document.body.classList.remove('issue-modal-open');
      if (window.psDialogHistory) {
        window.psDialogHistory.back();
      }
    }

    function openModal() {
      var modal = getModalElements().modal;
      if (!modal) return;
      modal.classList.remove('is-hidden');
      document.body.classList.add('issue-modal-open');
      if (window.psDialogHistory) {
        window.psDialogHistory.push();
      }
    }

    function ensureModal() {
      var modal = document.getElementById(modalId);
      if (modal) {
        return modal;
      }

      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'issue-modal is-hidden';
      modal.innerHTML = ''
        + '<div class="issue-modal-card">'
        + '  <div class="issue-modal-head">'
        + '    <strong>Masalah Terkait</strong>'
        + '    <button class="secondary issue-modal-close" type="button" data-issue-close="true" aria-label="Tutup popup masalah">&times;</button>'
        + '  </div>'
        + '  <div class="issue-summary" id="' + modalSummaryId + '">' + escapeHtml(loadingText) + '</div>'
        + '  <ul class="issue-warning-list" id="' + modalListId + '"></ul>'
        + '  <div class="issue-modal-foot">'
        + '    <button class="secondary" type="button" data-issue-close="true">Selesai</button>'
        + '  </div>'
        + '</div>';

      modal.addEventListener('click', function (event) {
        if (event.target === modal || event.target.closest('[data-issue-close]')) {
          closeModal();
        }
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          closeModal();
        }
      });

      ((window.PSUI && typeof window.PSUI.getLayerMountTarget === 'function')
        ? window.PSUI.getLayerMountTarget('dialog')
        : (document.getElementById('dialogRoot') || document.body)).appendChild(modal);
      return modal;
    }

    function ensurePanelLauncher() {
      var panel = getPanel();
      var heading;
      var actionButton;
      var intro;
      var elements = getElements();
      var head;

      if (!panel) {
        return;
      }

      heading = panel.querySelector('h2');
      if (!heading) {
        return;
      }

      head = panel.querySelector('.issue-panel-head');
      if (!head) {
        head = document.createElement('div');
        head.className = 'issue-panel-head';
        panel.insertBefore(head, heading);
        head.appendChild(heading);
      }

      actionButton = head.querySelector('[data-issue-open]');
      if (!actionButton) {
        actionButton = document.createElement('button');
        actionButton.className = 'secondary issue-panel-open-button';
        actionButton.type = 'button';
        actionButton.setAttribute('data-issue-open', 'true');
        actionButton.textContent = 'Lihat';
        actionButton.addEventListener('click', openModal);
        head.appendChild(actionButton);
      }

      intro = panel.querySelector('p');
      if (intro) {
        intro.classList.add('issue-panel-source');
      }
      if (elements.summary) {
        elements.summary.classList.add('issue-panel-source');
      }
      if (elements.list) {
        elements.list.classList.add('issue-panel-source');
      }
    }

    function syncLauncherLabel(groups) {
      var panel = getPanel();
      var button = panel ? panel.querySelector('[data-issue-open]') : null;
      var total = (groups || []).reduce(function (sum, group) {
        return group.state === 'issue' ? sum + Number(group.count || 0) : sum;
      }, 0);
      var issueCount = (groups || []).filter(function (group) {
        return group.state === 'issue';
      }).length;
      var infoCount = (groups || []).filter(function (group) {
        return group.state === 'info';
      }).length;
      if (!button) {
        return;
      }
      button.textContent = total ? 'Lihat (' + total + ')' : 'Lihat';
      button.title = issueCount
        ? 'Lihat detail masalah terkait'
        : (infoCount ? 'Ada catatan informatif audit' : 'Semua pemeriksaan terkait saat ini aman');
    }

    function needsToggle(groups) {
      return groups.length > groupLimit || groups.some(function (group) {
        return group.count > itemLimit;
      });
    }

    function renderGroups(groups) {
      var elements = getModalElements();
      var issueGroups;
      var infoGroups;
      var resolvedGroups;
      if (!elements.summary || !elements.list) return;

      if (!groups.length) {
        elements.summary.textContent = emptySummary;
        elements.summary.classList.remove('is-success');
        elements.list.innerHTML = '<li class="issue-warning-empty">' + escapeHtml(emptyListText) + '</li>';
        return;
      }

      issueGroups = groups.filter(function (group) {
        return group.state === 'issue';
      });
      infoGroups = groups.filter(function (group) {
        return group.state === 'info';
      });
      resolvedGroups = groups.filter(function (group) {
        return group.state === 'resolved';
      });

      if (!issueGroups.length && !infoGroups.length && resolvedGroups.length) {
        elements.summary.textContent = 'Semua pemeriksaan terkait saat ini aman.';
        elements.summary.classList.add('is-success');
      } else {
        var total = issueGroups.reduce(function (sum, group) { return sum + group.count; }, 0);
        var infoTotal = infoGroups.reduce(function (sum, group) { return sum + group.count; }, 0);
        var summaryParts = [];
        if (issueGroups.length) {
          summaryParts.push(issueGroups.length + ' kelompok masalah | ' + total + ' item perlu dicek');
        } else {
          summaryParts.push('Tidak ada masalah prioritas');
        }
        if (infoGroups.length) {
          summaryParts.push(infoGroups.length + ' catatan informatif | ' + infoTotal + ' item dipantau');
        }
        if (resolvedGroups.length) {
          summaryParts.push(resolvedGroups.length + ' pemeriksaan aman');
        }
        elements.summary.textContent = summaryParts.join(' | ');
        elements.summary.classList.remove('is-success');
      }

      var visibleGroups = expanded ? groups : groups.slice(0, groupLimit);
      elements.list.innerHTML = visibleGroups.map(function (group) {
        if (group.state === 'resolved') {
          return ''
            + '<li class="issue-warning-item severity-ok">'
            + '  <div class="issue-warning-head">'
            + '    <strong>' + escapeHtml(group.title) + '</strong>'
            + '    <span class="issue-warning-count issue-warning-count-ok">Aman</span>'
            + '  </div>'
            + '  <p>' + escapeHtml(group.shortText) + '</p>'
            + '</li>';
        }
        if (group.state === 'info') {
          var infoVisibleItems = expanded ? group.items : group.items.slice(0, itemLimit);
          var infoPreviewItems = infoVisibleItems.map(function (item) {
            return '<li>' + escapeHtml(formatIssueItem(group.key, item)) + '</li>';
          }).join('');
          var infoRemainder = !expanded && group.count > itemLimit
            ? '<li class="issue-warning-more">Dan ' + (group.count - itemLimit) + ' item lainnya.</li>'
            : '';

          return ''
            + '<li class="issue-warning-item severity-neutral">'
            + '  <div class="issue-warning-head">'
            + '    <strong>' + escapeHtml(group.title) + '</strong>'
            + '    <span class="issue-warning-count issue-warning-count-neutral">' + group.count + ' item</span>'
            + '  </div>'
            + '  <p>' + escapeHtml(group.shortText) + '</p>'
            + '  <ul class="issue-warning-sublist">' + infoPreviewItems + infoRemainder + '</ul>'
            + '</li>';
        }

        var visibleItems = expanded ? group.items : group.items.slice(0, itemLimit);
        var previewItems = visibleItems.map(function (item) {
          return '<li>' + escapeHtml(formatIssueItem(group.key, item)) + '</li>';
        }).join('');
        var remainder = !expanded && group.count > itemLimit
          ? '<li class="issue-warning-more">Dan ' + (group.count - itemLimit) + ' item lainnya.</li>'
          : '';

        return ''
          + '<li class="issue-warning-item severity-' + escapeHtml(group.severity) + '">'
          + '  <div class="issue-warning-head">'
          + '    <strong>' + escapeHtml(group.title) + '</strong>'
          + '    <span class="issue-warning-count">' + group.count + ' item</span>'
          + '  </div>'
          + '  <p>' + escapeHtml(group.shortText) + '</p>'
          + '  <ul class="issue-warning-sublist">' + previewItems + remainder + '</ul>'
          + '</li>';
      }).join('');

      if (needsToggle(groups)) {
        elements.list.innerHTML += ''
          + '<li class="issue-warning-toggle-row">'
          + '  <button class="issue-warning-toggle" type="button" data-issue-toggle="true">' + escapeHtml(expanded ? collapseLabel : expandLabel) + '</button>'
          + '</li>';
      }
    }

    function render(issueGroups) {
      cachedGroups = buildAuditDisplayGroups(issueGroups, issueConfig);
      expanded = false;
      ensurePanelLauncher();
      ensureModal();
      syncLauncherLabel(cachedGroups);
      bindToggle();
      renderGroups(cachedGroups);
    }

    function bindToggle() {
      var elements = getModalElements();
      if (!elements.list || elements.list.dataset.issueToggleBound === 'true') {
        return;
      }
      elements.list.dataset.issueToggleBound = 'true';
      elements.list.addEventListener('click', function (event) {
        var button = event.target.closest('[data-issue-toggle]');
        if (!button) {
          return;
        }
        expanded = !expanded;
        renderGroups(cachedGroups);
      });
    }

    async function load() {
      ensurePanelLauncher();
      ensureModal();
      var elements = getModalElements();
      syncLauncherLabel([]);
      bindToggle();
      if (elements.summary) {
        elements.summary.textContent = loadingText;
      }
      if (elements.list) {
        elements.list.innerHTML = '';
      }
      try {
        var data = await api('audit');
        render(data && data.issueGroups ? data.issueGroups : []);
      } catch (error) {
        expanded = false;
        cachedGroups = [];
        if (!elements.summary || !elements.list) return;
        if (error && (error.code === 403 || error.status === 403)) {
          elements.summary.hidden = true;
          elements.list.innerHTML = '';
          syncLauncherLabel([]);
          return;
        }
        elements.summary.textContent = 'Masalah terkait gagal dimuat.';
        elements.list.innerHTML = ''
          + '<li class="issue-warning-item">'
          + '  <div class="issue-warning-head"><strong>Audit gagal dimuat</strong></div>'
          + '  <p>' + escapeHtml(error && error.message ? error.message : 'Tidak bisa memuat temuan audit.') + '</p>'
          + '</li>';
        syncLauncherLabel([]);
      }
    }

    return {
      load: load,
      render: render
    };
  }

  window.PSAudit = {
    buildAuditDisplayGroups: buildAuditDisplayGroups,
    formatIssueItem: formatIssueItem,
    getIssueGroupMeta: getIssueGroupMeta
  };
  window.createIssuePanelController = createIssuePanelController;
}());
