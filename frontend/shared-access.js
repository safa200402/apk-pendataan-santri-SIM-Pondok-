(function (global) {
  // SYNC: keyword di sini harus sama dengan ACCESS_CONTROL di backend/server.js
  var ACCESS_KEYWORDS = {
    superAdmin: ['super admin', 'superadmin'],
    admin: ['admin', 'administrator', 'operator'],
    mudir: ['mudir', 'mudiroh', "mudir 'amm", 'mudir amm', "mudirul ma'had", 'mudirul mahad'],
    halaqohCoordinator: ['koordinator halaqoh', 'kordinator halaqoh', 'koord halaqoh'],
    pengampuHalaqoh: ['pengampu halaqoh', 'pengampu', 'musyrif halaqoh', 'murobbi halaqoh'],
    pengujiHafalan: ['penguji hafalan', 'penguji'],
    academic: ['akademik'],
    teacher: ['pengajar', 'ustadz', 'ustadzah', 'guru'],
    jamDigitalOperator: ['operator jam digital'],
    hukuman: ['bagian hukuman', 'hukuman', 'seksi hukuman', 'bidang hukuman', 'keamanan', 'seksi keamanan', 'bagian keamanan'],
    ksantrian: ['ksantrian', 'kesantrian', 'bagian kesantrian', 'staf kesantrian', 'seksi kesantrian', 'bidang kesantrian'],
    kesehatan: ['kesehatan', 'bagian kesehatan', 'seksi kesehatan', 'bidang kesehatan', 'klinik', 'uks', 'kesehatan santri'],
    sdm: ['sdm', 'sumber daya manusia', 'hr', 'human resources', 'kepegawaian', 'personalia', 'bagian sdm', 'seksi sdm'],
    kebersihan: ['kebersihan', 'kebersihan lingkungan', 'bagian kebersihan', 'seksi kebersihan', 'bidang kebersihan', 'petugas kebersihan'],
    pembinaRegu: ['pembina regu', 'wali regu', 'musyrif regu'],
    mading: ['bagian mading', 'seksi mading', 'redaksi mading', 'tim mading', 'mading'],
    pengawasLapangan: ['pengawas lapangan'],
    ketuaYayasan: ['ketua yayasan'],
    pembinaYayasan: ['pembina yayasan']
  };
  var ROLE_SCOPE_STORAGE_KEY = 'ps_role_scope';

  var PAGE_RULES = {
    /* ── Dashboard ── */
    'dashboard.html':            function (session) { return isSuperAdmin(getScopedSession(session)); },
    'onlineSekarang.html':       function (session) { return isSuperAdmin(getScopedSession(session)); },
    'dashboardAdmin.html':       function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isMudir)); },
    'dashboardKoordHalaqoh.html':function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isHalaqohCoordinator || p.isMudir)); },
    'dashboardAkademik.html':    function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isAcademic || p.isMudir)); },
    'dashboardKesantrian.html':  function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isKsantrian || p.isMudir)); },
    'dashboardSdm.html':         function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isBagianSdm || p.isMudir)); },
    /* ── Jadwal ── */
    'jadwalIbadah.html': function (session) { return isPengurus(session) && isAddonActive(getScopedSession(session), 'jadwalIbadah'); },
    'jadwalPiket.html':  function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isKebersihan)); },
    /* ── Santri ── */
    'daftarSantri.html':  function (session) { var p = getPermissions(getScopedSession(session)); return isPengurus(session) && !!(p && (p.canManageSantri || p.canViewSantri)); },
    /* ── Tahun Ajaran ── */
    'tahunAjaran.html': function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isMudir)); },
    /* ── Halaqoh ── */
    'editHalaqoh.html':    function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isHalaqohCoordinator || p.isMudir)); },
    'riwayatPindahHalaqoh.html': function (session) { return canAccessLockedLevel(getScopedSession(session), 'riwayatLog', 'manage'); },
    'editHalaqohTasmi.html': function (session) { return canAccessLockedLevel(getScopedSession(session), 'halaqohTasmi', 'manageStruktur'); },
    'halaqohAbsensi.html': function (session) { return canAccessLockedLevel(getScopedSession(session), 'misiTahfizh', 'manage'); },
    'hafalanHarian.html':  function (session) { return canAccessLockedLevel(getScopedSession(session), 'misiTahfizh', 'manage'); },
    'tasmiSetoran.html':   function (session) { return canAccessLockedLevel(getScopedSession(session), 'halaqohTasmi', 'manageSetoran'); },
    'ujianHafalan.html':   function (session) { return canAccessLockedLevel(getScopedSession(session), 'misiTahfizh', 'manage'); },
    'nilaiUas.html':       function (session) { return canAccessLockedLevel(getScopedSession(session), 'misiTahfizh', 'manage'); },
    /* ── Kelas ── */
    'editKelas.html':      function (session) { var p = getPermissions(session); return isPengurusWith(session, 'canManageKelasSiang') || !!(p && p.isMudir); },
    'inputKelasLevel.html':function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && p.addonsCanManage && p.addonsCanManage.raportRekamJejak) && isAddonActive(getScopedSession(session), 'raportRekamJejak'); },
    'kelasAbsensi.html':   function (session) { return canAccessLockedLevel(getScopedSession(session), 'kelasSiangNilai', 'manage'); },
    'nilaiUjian.html':     function (session) { return canAccessLockedLevel(getScopedSession(session), 'kelasSiangNilai', 'manage'); },
    'editSoal.html':       function (session) { return canAccessLockedLevel(getScopedSession(session), 'kelasSiangNilai', 'manage'); },
    'quizDigital.html':    function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && p.addonsCanManage && p.addonsCanManage.quizDigital) && isAddonActive(getScopedSession(session), 'quizDigital'); },
    /* ── Regu ── */
    'editRegu.html':          function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isKsantrian || p.isMudir)); },
    'riwayatPindahRegu.html': function (session) { return canAccessLockedLevel(getScopedSession(session), 'riwayatLog', 'manage'); },
    'reguAbsensi.html':       function (session) { return canAccessLockedLevel(getScopedSession(session), 'reguPerkembangan', 'manage'); },
    'perkembanganSantri.html':function (session) { return canAccessLockedLevel(getScopedSession(session), 'reguPerkembangan', 'manage'); },
    'perkembanganTemplate.html':function (session) { return canAccessLockedLevel(getScopedSession(session), 'reguPerkembangan', 'manage'); },
    /* ── Data Kelompok (gabungan tabel Halaqoh/Regu/Kelas) ── */
    'dataKelompok.html': function (session) { return isPengurus(session); },
    /* ── Data Kelompok Manual (klon tampilan, tapi diisi bebas manual) ── */
    'dataKelompokManual.html': function (session) { return isPengurus(session); },
    /* ── Raport & Rekam Jejak ── */
    'raport&rekamJejak.html':  function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && p.canAccessPanel) && isAddonActive(getScopedSession(session), 'raportRekamJejak'); },
    'akhlakKepribadian.html':  function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && p.addonsCanManage && p.addonsCanManage.raportRekamJejak) && isAddonActive(getScopedSession(session), 'raportRekamJejak'); },
    'deskripsiSantri.html':    function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && p.addonsCanManage && p.addonsCanManage.raportRekamJejak) && isAddonActive(getScopedSession(session), 'raportRekamJejak'); },
    /* ── Pelanggaran & Kondisi ── */
    'pelanggaran.html':      function (session) { return isPengurus(session) && canAccessLockedLevel(getScopedSession(session), 'pelanggaranKondisi', 'input'); },
    'jenisPelanggaran.html': function (session) { return canAccessLockedLevel(getScopedSession(session), 'pelanggaranKondisi', 'manage'); },
    'santriSakit.html':      function (session) { return canAccessLockedLevel(getScopedSession(session), 'pelanggaranKondisi', 'manage'); },
    'izinPulang.html':       function (session) { return canAccessLockedLevel(getScopedSession(session), 'pelanggaranKondisi', 'manage'); },
    'bukuDigital.html':      function (session) { return isPengurus(session) && isAddonActive(getScopedSession(session), 'bukuDigital'); },
    'bankSoal.html':         function (session) { return isPengurus(session) && isAddonActive(getScopedSession(session), 'bankSoal'); },
    'masterPelajaran.html':  function (session) { return canAccessLockedLevel(getScopedSession(session), 'masterPelajaran', 'view'); },
    'progPelajaran.html':    function (session) { return canAccessLockedLevel(getScopedSession(session), 'masterPelajaran', 'view'); },
    'rekapZoom.html':        function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && p.addonsCanManage && p.addonsCanManage.rekapZoom) && isAddonActive(getScopedSession(session), 'rekapZoom'); },
    /* ── Pengurus ── */
    'strukturOrganisasi.html': function (session) { return isPengurus(session) || !!(session && session.role === 'santri'); },
    'masterJabatan.html':      function (session) { return isSuperAdmin(session); },
    'editPengurus.html':       function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isBagianSdm || p.isMudir)); },
    'kegiatanSop.html':        function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isBagianSdm || p.isMudir)); },
    'koordinatAbsensi.html':   function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isBagianSdm || p.isMudir)); },
    'inputAbsensiPengurus.html':   function (session) { return isPengurus(session); },
    'rekapAbsensiPengurus.html':   function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isMudir || p.isBagianSdm)); },
    'jurnalSdm.html':              function (session) { return isPengurus(session); },
    'catatanku.html':             function (session) { return isPengurus(session) && isAddonActive(getScopedSession(session), 'catatanku'); },
    'jadwalHarianPengurus.html':   function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isPengawasLapangan)); },
    'jadwalFingerprint.html':      function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isPengawasLapangan)); },
    /* ── Pengaturan ── */
    'portalSettings.html': function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin || p.isMudir)); },
    'madingDigital.html':  function (session) { return !!(session && (session.role === 'pengurus' || session.role === 'santri')) && isAddonActive(getScopedSession(session), 'madingDigital'); },
    'kelolaMading.html':   function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && p.addonsCanManage && p.addonsCanManage.madingDigital) && isAddonActive(getScopedSession(session), 'madingDigital'); },
    'pengumuman.html':     function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && p.addonsCanManage && p.addonsCanManage.pengumumanSurvey) && isAddonActive(getScopedSession(session), 'pengumumanSurvey'); },
    'survey.html':         function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && p.addonsCanManage && p.addonsCanManage.pengumumanSurvey) && isAddonActive(getScopedSession(session), 'pengumumanSurvey'); },
    'kelolaAudit.html':    function (session) { return canAccessLockedLevel(getScopedSession(session), 'sistemAudit', 'manage'); },
    'kelolaAuditBawahan.html': function (session) { return canAccessLockedLevel(getScopedSession(session), 'sistemAudit', 'manage'); },
    'superAdmin.html':     function (session) { return isSuperAdmin(session); },
    'backup.html':         function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin)); },
    'kelolaAddons.html':   function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && (p.isSuperAdmin || p.isAdmin)); },
    /* ── Kalender Akademik ── */
    // Santri SELALU boleh lihat kalender, tidak terpengaruh level akses "Lihat Kalender" --
    // itu murni jatah pengurus (jabatan hanya konsep pengurus, tidak berlaku untuk santri).
    'kaldik.html':    function (session) { return !!(session && session.role === 'santri') || (isPengurus(session) && canAccessLockedLevel(getScopedSession(session), 'kalenderAkademik', 'view')); },
    'editKaldik.html':function (session) { return canAccessLockedLevel(getScopedSession(session), 'kalenderAkademik', 'manage'); },
    /* ── Jam Digital ── */
    // 'return true' tanpa syarat dipertahankan (bukan bug) -- layar ini dipakai kiosk fisik
    // yang sering dibuka TANPA sesi login sama sekali. Kalau ada sesi & addon "Jam Digital"
    // memang sedang dimatikan, baru disembunyikan/ditolak; gerbang sungguhannya (data API +
    // alias publik /jam-digital) ada di backend/server.js, bukan di sini.
    'jamDigital.html':      function (session) { var p = getPermissions(getScopedSession(session)); if (p && p.addonsActive && p.addonsActive.jamDigital === false) return false; return true; },
    'jamDigitalRemote.html':function (session) { var p = getPermissions(getScopedSession(session)); return !!(p && p.addonsCanManage && p.addonsCanManage.jamDigital) && isAddonActive(getScopedSession(session), 'jamDigital'); },
    /* ── Lainnya ── */
    'skemaDb.html':    function (session) { return isSuperAdmin(session); },
    'aksesInfo.html':  function (session) { return isSuperAdmin(session); },
    'infoHalaman.html':function (session) { return isSuperAdmin(session); },
    /* ── Santri (role santri) ── */
    'santriProfile.html':        function (session) { return !!(session && session.role === 'santri'); },
    'santri/santriProfile.html': function (session) { return !!(session && session.role === 'santri'); },
    'rekamJejak.html':           function (session) { return !!(session && session.role === 'santri') && isAddonActive(getScopedSession(session), 'raportRekamJejak'); },
    'santri/rekamJejak.html':    function (session) { return !!(session && session.role === 'santri') && isAddonActive(getScopedSession(session), 'raportRekamJejak'); },
    'kondisiSantri.html':        function (session) { return !!(session && session.role === 'santri'); },
    'santri/kondisiSantri.html': function (session) { return !!(session && session.role === 'santri'); },
    'quizSantri.html':           function (session) { return !!(session && session.role === 'santri') && isAddonActive(getScopedSession(session), 'quizDigital'); },
    'santri/quizSantri.html':    function (session) { return !!(session && session.role === 'santri') && isAddonActive(getScopedSession(session), 'quizDigital'); },
    /* ── Akun ── */
    'riwayat.html':        function (session) { return !!(session && session.role === 'pengurus') && canAccessLockedLevel(getScopedSession(session), 'riwayatLog', 'view'); },
    'accountProfile.html': function (session) { return !!(session && (session.role === 'pengurus' || session.role === 'santri')); },
    'changePassword.html': function (session) { return !!(session && (session.role === 'pengurus' || session.role === 'santri')); },
    'logout.html':         function (session) { return !!(session && (session.role === 'pengurus' || session.role === 'santri')); },
    'beranda.html':        function (session) { return !!(session && (session.role === 'pengurus' || session.role === 'santri')); },
    /* ── Publik ── */
    'login.html':      function () { return true; },
    'loginSantri.html':function () { return true; },
    // 'return true' tanpa syarat dipertahankan (bukan bug) -- halaman ini boleh dilihat TANPA
    // login sama sekali (mading publik). Kalau ada sesi & addon Mading Digital memang sedang
    // dimatikan, baru disembunyikan/ditolak; gerbang sungguhannya ada di action
    // content.public.list (backend), sama seperti pola jamDigital.html di atas.
    'madingPublik.html':function (session) { var p = getPermissions(getScopedSession(session)); if (p && p.addonsActive && p.addonsActive.madingDigital === false) return false; return true; },
    'index.html':      function () { return true; }
  };

  function getPermissions(session) {
    return session && session.permissions ? session.permissions : null;
  }

  // Kelola Addons (2026-09-12): permissions.addonsActive dikirim backend (lihat `permissions`
  // di backend/server.js). Field tak dikenal/hilang dianggap AKTIF (true) -- sesi lama yang
  // permissions-nya belum sempat refresh, atau addon baru yang belum didaftarkan, tidak boleh
  // mendadak keblokir.
  function isAddonActive(session, key) {
    var p = getPermissions(session);
    if (!p || !p.addonsActive || p.addonsActive[key] === undefined) return true;
    return !!p.addonsActive[key];
  }

  // Level akses (Lihat/Kelola) untuk kelompok halaman TERKUNCI yang sudah diaktifkan
  // pengaturannya lewat Kelola Addons (lihat permissions.lockedLevelAccess di backend/server.js).
  // Kelompok/level yang tidak dikenal dianggap AKTIF (true) -- konsisten dgn isAddonActive,
  // aman kalau sesi lama belum sempat refresh atau kombinasi belum didaftarkan.
  function canAccessLockedLevel(session, groupKey, levelKey) {
    var p = getPermissions(session);
    if (!p || !p.lockedLevelAccess || !p.lockedLevelAccess[groupKey] || p.lockedLevelAccess[groupKey][levelKey] === undefined) return true;
    return !!p.lockedLevelAccess[groupKey][levelKey];
  }

  function clonePlainObject(object) {
    var result = {};
    Object.keys(object || {}).forEach(function (key) {
      result[key] = object[key];
    });
    return result;
  }

  function uniqueList(items) {
    var seen = {};
    return (items || []).filter(function (item) {
      var key = normalizeAccessText(item);
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function normalizeAccessText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isPengurus(session) {
    return !!(session && session.role === 'pengurus');
  }

  function getStoredRoleScope() {
    try {
      return global.localStorage.getItem(ROLE_SCOPE_STORAGE_KEY) || '';
    } catch (error) {
      return '';
    }
  }

  function clearRoleScope() {
    try {
      global.localStorage.removeItem(ROLE_SCOPE_STORAGE_KEY);
    } catch (error) {
      // Ignore storage failure.
    }
  }

  function getRoleScopeOptions(session) {
    if (!isPengurus(session)) {
      return [];
    }
    var permissions = getPermissions(session);
    var configuredOptions = uniqueList(
      (session && Array.isArray(session.roleScopeOptions) ? session.roleScopeOptions : [])
        .concat(permissions && Array.isArray(permissions.roleScopeOptions) ? permissions.roleScopeOptions : [])
    );
    if (!configuredOptions.length) {
      return [];
    }
    return configuredOptions.map(function (label) {
      return {
        key: normalizeAccessText(label),
        label: label
      };
    });
  }

  function buildScopedPermissions(session, scopeLabel) {
    var permissions = clonePlainObject(getPermissions(session) || {});
    var defaultLabel = permissions.label || 'Super Admin';
    if (!scopeLabel || normalizeAccessText(scopeLabel) === normalizeAccessText(defaultLabel)) {
      return permissions;
    }

    var tokens = [normalizeAccessText(scopeLabel)];
    var isSuperAdmin = false;
    var isJamDigitalOperator = hasKeyword(tokens, ACCESS_KEYWORDS.jamDigitalOperator);
    var isAdmin = !isJamDigitalOperator && hasKeyword(tokens, ACCESS_KEYWORDS.admin);
    var isBagianHukuman = hasKeyword(tokens, ACCESS_KEYWORDS.hukuman);
    var isKsantrian = hasKeyword(tokens, ACCESS_KEYWORDS.ksantrian);
    var isBagianKesehatan = hasKeyword(tokens, ACCESS_KEYWORDS.kesehatan);
    var isBagianSdm = hasKeyword(tokens, ACCESS_KEYWORDS.sdm);
    var isKebersihan = hasKeyword(tokens, ACCESS_KEYWORDS.kebersihan);
    var isMudir = hasKeyword(tokens, ACCESS_KEYWORDS.mudir);
    var isHalaqohCoordinator = hasKeyword(tokens, ACCESS_KEYWORDS.halaqohCoordinator);
    var isPengampuHalaqoh = hasKeyword(tokens, ACCESS_KEYWORDS.pengampuHalaqoh);
    var isPengujiHafalan = hasKeyword(tokens, ACCESS_KEYWORDS.pengujiHafalan);
    var isAcademic = hasKeyword(tokens, ACCESS_KEYWORDS.academic);
    var hasTeacherAccess = hasKeyword(tokens, ACCESS_KEYWORDS.teacher);
    var isPembinaRegu = hasKeyword(tokens, ACCESS_KEYWORDS.pembinaRegu);
    var hasMading = hasKeyword(tokens, ACCESS_KEYWORDS.mading);
    var isPengawasLapangan = hasKeyword(tokens, ACCESS_KEYWORDS.pengawasLapangan);
    var isKetuaYayasan = hasKeyword(tokens, ACCESS_KEYWORDS.ketuaYayasan);
    var isPembinaYayasan = hasKeyword(tokens, ACCESS_KEYWORDS.pembinaYayasan);
    var canManageHalaqoh = isAdmin || isHalaqohCoordinator || isPengampuHalaqoh;
    var canManageKelasSiang = isAdmin || isAcademic;
    var canManageNilaiUp = isAdmin || isAcademic || hasTeacherAccess;
    var canManageKelasLevel = isAdmin || isAcademic || hasTeacherAccess;
    var canManageAbsensi = isAdmin || isAcademic || isHalaqohCoordinator || isPengampuHalaqoh || hasTeacherAccess;
    var canManageContent = isAdmin;
    var canAccessJamDigital = isAdmin || isJamDigitalOperator;
    var canManageJadwalIbadah = isAdmin || isHalaqohCoordinator;
    var canManageJadwalPiket = isAdmin || isKebersihan;
    var canAccessPanel = true;
    // Semua pengurus boleh melihat data santri.
    var canViewSantri = canAccessPanel;
    var accessLevel = isAdmin ? 'admin' : (isMudir ? 'mudir' : (isJamDigitalOperator ? 'operator_jam_digital' : (isAcademic ? 'akademik' : (isHalaqohCoordinator ? 'koordinator_halaqoh' : (isPengampuHalaqoh ? 'pengampu_halaqoh' : (isPengujiHafalan ? 'penguji_hafalan' : (canManageNilaiUp ? 'pengajar' : (isBagianKesehatan ? 'kesehatan' : (isBagianSdm ? 'sdm' : (isKsantrian ? 'ksantrian' : (isKebersihan ? 'kebersihan' : (isPembinaRegu ? 'pembina_regu' : (hasMading ? 'mading' : (isPengawasLapangan ? 'pengawas_lapangan' : 'staff'))))))))))))));

    permissions.isSuperAdmin = isSuperAdmin;
    permissions.isAdmin = isAdmin;
    permissions.isHalaqohCoordinator = isHalaqohCoordinator;
    permissions.isPengampuHalaqoh = isPengampuHalaqoh;
    permissions.isPengujiHafalan = isPengujiHafalan;
    permissions.isAcademic = isAcademic;
    permissions.isMudir = isMudir;
    permissions.isPembinaRegu = isPembinaRegu;
    permissions.hasMading = hasMading;
    permissions.canDelete = false;
    permissions.canAccessPanel = canAccessPanel;
    permissions.canViewSantri = canViewSantri;
    permissions.canManageSantri = isAdmin;
    permissions.canManagePengurus = isAdmin;
    permissions.canManageJabatan = false;
    permissions.canManageRegu = isAdmin || isKsantrian;
    permissions.canManageHalaqoh = canManageHalaqoh;
    permissions.canManageKelasSiang = canManageKelasSiang;
    permissions.canManageNilaiUp = canManageNilaiUp;
    permissions.canManageKelasLevel = canManageKelasLevel;
    permissions.canManageAbsensi = canManageAbsensi;
    permissions.canManageKegiatanSop = isAdmin || isBagianSdm || isMudir;
    permissions.canManageContent = isAdmin || isMudir || hasMading || isAcademic;
    permissions.canAccessJamDigital = canAccessJamDigital;
    permissions.isBagianHukuman = isBagianHukuman;
    permissions.isBagianKesehatan = isBagianKesehatan;
    permissions.isBagianSdm = isBagianSdm;
    permissions.isKsantrian = isKsantrian;
    permissions.isKebersihan = isKebersihan;
    permissions.isPengawasLapangan = isPengawasLapangan;
    permissions.isKetuaYayasan = isKetuaYayasan;
    permissions.isPembinaYayasan = isPembinaYayasan;
    permissions.canManageJadwalIbadah = canManageJadwalIbadah;
    permissions.canManageJadwalPiket = canManageJadwalPiket;
    permissions.canAccessIzinPulang = isAdmin || isKsantrian;
    permissions.canManageBuku = isSuperAdmin || isAdmin || isAcademic;
    permissions.canUploadSoal = isSuperAdmin || isAdmin || isAcademic || hasTeacherAccess;
    permissions.canManageSoal = isSuperAdmin || isAdmin || isAcademic;
    permissions.canManageKoordinatAbsensi = isAdmin || isBagianSdm;
    permissions.canManageSdmJurnalAll = isAdmin || isBagianSdm;
    permissions.canViewSdmJurnalAll = isMudir;
    permissions.canInputPelanggaran = true;
    permissions.canAssignHukuman = isAdmin || isBagianHukuman;
    permissions.canAccessSantriSakit = isAdmin || isBagianKesehatan || isKsantrian;
    permissions.canEditSantriSakit = isAdmin || isBagianKesehatan || isKsantrian;
    permissions.canImportData = isSuperAdmin;
    permissions.canExportData = isSuperAdmin;
    permissions.canExportAll = false;
    permissions.accessLevel = accessLevel;
    permissions.label = scopeLabel;
    permissions.navVisiblePages = getScopedNavPages(accessLevel);
    return permissions;
  }

  function getScopedNavPages(accessLevel) {
    /* Halaman umum yang boleh diakses semua pengurus, termasuk struktur organisasi
       (bisa diakses oleh semua role pengurus + santri). */
    var base = ['index.html', 'kaldik.html', 'daftarSantri.html', 'strukturOrganisasi.html', 'pelanggaran.html', 'izinPulang.html', 'santriSakit.html', 'inputAbsensiPengurus.html', 'jurnalSdm.html', 'catatanku.html', 'accountProfile.html', 'changePassword.html', 'riwayat.html', 'logout.html', 'bukuDigital.html', 'bankSoal.html', 'dataKelompok.html', 'dataKelompokManual.html', 'raport&rekamJejak.html'];
    switch (String(accessLevel || '')) {
      case 'admin':
        return [];
      case 'operator_jam_digital':
        return ['index.html', 'daftarSantri.html', 'strukturOrganisasi.html', 'jamDigital.html', 'jamDigitalRemote.html', 'santriSakit.html', 'inputAbsensiPengurus.html', 'jurnalSdm.html', 'catatanku.html', 'accountProfile.html', 'changePassword.html', 'riwayat.html', 'logout.html', 'dataKelompok.html', 'dataKelompokManual.html', 'raport&rekamJejak.html'];
      case 'mudir':
        // Sama seperti 'admin': array kosong = tidak dibatasi daftar nav, cukup diserahkan ke canAccessPage()
        // (yang sudah mengizinkan hampir semua halaman admin untuk isMudir, tapi tetap menutup halaman khusus Super Admin).
        return [];
      case 'koordinator_halaqoh':
        return base.concat(['dashboardKoordHalaqoh.html', 'editHalaqoh.html', 'editHalaqohTasmi.html', 'riwayatPindahHalaqoh.html', 'halaqohAbsensi.html', 'hafalanHarian.html', 'tasmiSetoran.html', 'ujianHafalan.html', 'nilaiUas.html', 'raport&rekamJejak.html', 'jadwalIbadah.html']);
      case 'pengampu_halaqoh':
        return base.concat(['halaqohAbsensi.html', 'hafalanHarian.html', 'tasmiSetoran.html', 'ujianHafalan.html', 'jadwalIbadah.html']);
      case 'akademik':
        return base.concat(['dashboardAkademik.html', 'editKelas.html', 'inputKelasLevel.html', 'kelasAbsensi.html', 'nilaiUjian.html', 'editSoal.html', 'quizDigital.html', 'editKaldik.html', 'raport&rekamJejak.html', 'kelolaMading.html', 'jadwalIbadah.html']);
      case 'penguji_hafalan':
        return base.concat(['ujianHafalan.html', 'jadwalIbadah.html']);
      case 'pengajar':
        return base.concat(['inputKelasLevel.html', 'kelasAbsensi.html', 'nilaiUjian.html', 'editSoal.html', 'quizDigital.html', 'jadwalIbadah.html']);
      case 'kesehatan':
        return ['index.html', 'kaldik.html', 'daftarSantri.html', 'strukturOrganisasi.html', 'santriSakit.html', 'pelanggaran.html', 'izinPulang.html', 'inputAbsensiPengurus.html', 'jurnalSdm.html', 'catatanku.html', 'accountProfile.html', 'changePassword.html', 'logout.html', 'bukuDigital.html', 'bankSoal.html', 'dataKelompok.html', 'dataKelompokManual.html', 'raport&rekamJejak.html'];
      case 'sdm':
        return ['index.html', 'kaldik.html', 'daftarSantri.html', 'strukturOrganisasi.html', 'editPengurus.html', 'kegiatanSop.html', 'koordinatAbsensi.html', 'rekapAbsensiPengurus.html', 'jurnalSdm.html', 'pelanggaran.html', 'izinPulang.html', 'santriSakit.html', 'inputAbsensiPengurus.html', 'dashboardSdm.html', 'catatanku.html', 'accountProfile.html', 'changePassword.html', 'logout.html', 'bukuDigital.html', 'bankSoal.html', 'dataKelompok.html', 'dataKelompokManual.html', 'raport&rekamJejak.html'];
      case 'ksantrian':
        return base.concat(['dashboardKesantrian.html', 'editRegu.html', 'riwayatPindahRegu.html', 'reguAbsensi.html', 'perkembanganSantri.html', 'perkembanganTemplate.html', 'raport&rekamJejak.html', 'akhlakKepribadian.html', 'deskripsiSantri.html', 'jenisPelanggaran.html', 'jadwalIbadah.html']);
      case 'kebersihan':
        return ['index.html', 'kaldik.html', 'daftarSantri.html', 'strukturOrganisasi.html', 'jadwalPiket.html', 'pelanggaran.html', 'izinPulang.html', 'santriSakit.html', 'inputAbsensiPengurus.html', 'jurnalSdm.html', 'catatanku.html', 'accountProfile.html', 'changePassword.html', 'logout.html', 'bukuDigital.html', 'bankSoal.html', 'dataKelompok.html', 'dataKelompokManual.html', 'raport&rekamJejak.html'];
      case 'mading':
        return base.concat(['kelolaMading.html', 'jadwalIbadah.html']);
      case 'pengawas_lapangan':
        return ['index.html', 'kaldik.html', 'daftarSantri.html', 'jadwalIbadah.html', 'jadwalHarianPengurus.html', 'jadwalFingerprint.html', 'pelanggaran.html', 'izinPulang.html', 'santriSakit.html', 'inputAbsensiPengurus.html', 'jurnalSdm.html', 'catatanku.html', 'accountProfile.html', 'changePassword.html', 'logout.html', 'bukuDigital.html', 'bankSoal.html', 'dataKelompok.html', 'dataKelompokManual.html', 'raport&rekamJejak.html'];
      default:
        /* pembina regu dan role lainnya */
        return base.concat(['reguAbsensi.html', 'perkembanganSantri.html', 'akhlakKepribadian.html', 'deskripsiSantri.html', 'jadwalIbadah.html']);
    }
  }

  function getScopedSession(session) {
    var options = getRoleScopeOptions(session);
    if (!options.length) {
      return session;
    }

    var permissions = getPermissions(session);
    var isSuperAdmin = !!(permissions && permissions.isSuperAdmin);
    var selectedScope = getStoredRoleScope();

    // Non-super-admin dengan 2+ jabatan: default ke jabatan utama (opsi pertama)
    if (!selectedScope && !isSuperAdmin && options.length >= 2) {
      selectedScope = options[0].label || options[0];
    }

    if (!selectedScope) {
      return session;
    }

    var selected = options.filter(function (option) {
      return option.key === normalizeAccessText(selectedScope) ||
        normalizeAccessText(option.label || option) === normalizeAccessText(selectedScope);
    })[0];
    if (!selected) {
      clearRoleScope();
      return session;
    }

    var selectedLabel = selected.label || selected;
    if (normalizeAccessText(selectedLabel) === normalizeAccessText((permissions || {}).label || '')) {
      return session;
    }

    var scoped = clonePlainObject(session);
    scoped.permissions = buildScopedPermissions(session, selectedLabel);
    scoped.scopeLabel = selectedLabel;
    scoped.jabatanLabels = [selectedLabel];
    scoped.primaryJabatanLabel = selectedLabel;
    return scoped;
  }

  function setRoleScope(session, scopeLabel) {
    var options = getRoleScopeOptions(session);
    if (!options.length) {
      clearRoleScope();
      return;
    }

    var normalizedScope = normalizeAccessText(scopeLabel);
    var selected = options.filter(function (option) {
      return option.key === normalizedScope || normalizeAccessText(option.label) === normalizedScope;
    })[0];

    if (!selected) {
      clearRoleScope();
      return;
    }

    // Bandingkan dengan label scope yang sedang aktif (bisa auto-default primary jabatan)
    var activeLabel = getActiveRoleScopeLabel(session) || (getPermissions(session) || {}).label || '';
    if (normalizeAccessText(selected.label) === normalizeAccessText(activeLabel)) {
      // Switch ke scope yang sama dengan yang aktif = kembali ke default
      clearRoleScope();
      return;
    }

    // Jika yang dipilih adalah primary jabatan (opsi pertama), cukup clear scope
    var permissions = getPermissions(session);
    var isSuperAdmin = !!(permissions && permissions.isSuperAdmin);
    if (!isSuperAdmin && options.length >= 2 && normalizeAccessText(selected.label) === normalizeAccessText(options[0].label)) {
      clearRoleScope();
      return;
    }

    try {
      global.localStorage.setItem(ROLE_SCOPE_STORAGE_KEY, selected.label);
    } catch (error) {
      // Ignore storage failure.
    }
  }

  function getActiveRoleScopeLabel(session) {
    var scoped = getScopedSession(session);
    return scoped && scoped.scopeLabel ? scoped.scopeLabel : '';
  }

  function getSessionTokens(session) {
    var permissions = getPermissions(session) || {};
    var tokens = []
      .concat(session && session.jabatanLabels ? session.jabatanLabels : [])
      .concat(session && session.jabatanIds ? session.jabatanIds : [])
      .concat([
        permissions.label,
        permissions.accessLevel,
        session && session.role
      ]);

    return tokens.map(normalizeAccessText).filter(Boolean);
  }

  function hasKeyword(tokens, keywords) {
    return (keywords || []).some(function (keyword) {
      var target = normalizeAccessText(keyword);
      return tokens.some(function (token) {
        return token === target || token.indexOf(target) !== -1;
      });
    });
  }

  function isSuperAdmin(session) {
    var permissions = getPermissions(session);
    var tokens = getSessionTokens(session);
    return !!(isPengurus(session) && (
      (permissions && (
        permissions.isSuperAdmin ||
        permissions.canDelete ||
        permissions.accessLevel === 'super_admin'
      )) ||
      hasKeyword(tokens, ACCESS_KEYWORDS.superAdmin)
    ));
  }

  function hasAdminAccess(session) {
    var permissions = getPermissions(session);
    var tokens = getSessionTokens(session);
    return !!(isPengurus(session) && (
      isSuperAdmin(session) ||
      (permissions && (
        permissions.isAdmin ||
        permissions.accessLevel === 'admin'
      )) ||
      hasKeyword(tokens, ACCESS_KEYWORDS.admin)
    ));
  }

  function hasAcademicAccess(session) {
    var permissions = getPermissions(session);
    if (!isPengurus(session)) {
      return false;
    }
    if (hasAdminAccess(session)) {
      return true;
    }
    return !!(
      (permissions && permissions.isAcademic) ||
      hasKeyword(getSessionTokens(session), ACCESS_KEYWORDS.academic)
    );
  }

  function hasHalaqohCoordinatorAccess(session) {
    var permissions = getPermissions(session);
    if (!isPengurus(session)) {
      return false;
    }
    if (hasAdminAccess(session)) {
      return true;
    }
    return !!(
      (permissions && permissions.isHalaqohCoordinator) ||
      hasKeyword(getSessionTokens(session), ACCESS_KEYWORDS.halaqohCoordinator)
    );
  }

  function hasPengampuHalaqohAccess(session) {
    var permissions = getPermissions(session);
    if (!isPengurus(session)) {
      return false;
    }
    if (hasAdminAccess(session) || hasHalaqohCoordinatorAccess(session)) {
      return true;
    }
    return !!(
      (permissions && permissions.isPengampuHalaqoh) ||
      hasKeyword(getSessionTokens(session), ACCESS_KEYWORDS.pengampuHalaqoh)
    );
  }

  function hasTeacherAccess(session) {
    if (!isPengurus(session)) {
      return false;
    }
    if (hasAdminAccess(session) || hasAcademicAccess(session) || hasHalaqohCoordinatorAccess(session)) {
      return true;
    }
    return hasKeyword(getSessionTokens(session), ACCESS_KEYWORDS.teacher);
  }

  function hasJamDigitalOperatorAccess(session) {
    var permissions = getPermissions(session);
    if (!isPengurus(session)) return false;
    if (hasAdminAccess(session)) return true;
    return !!(
      (permissions && permissions.canAccessJamDigital) ||
      hasKeyword(getSessionTokens(session), ACCESS_KEYWORDS.jamDigitalOperator)
    );
  }

  function hasPanelAccess(session) {
    var permissions = getPermissions(session);
    return !!(isPengurus(session) && (
      (permissions && permissions.canAccessPanel) ||
      hasAdminAccess(session) ||
      hasAcademicAccess(session) ||
      hasHalaqohCoordinatorAccess(session) ||
      hasPengampuHalaqohAccess(session) ||
      hasTeacherAccess(session)
    ));
  }

  function canUseExcelTools(session) {
    session = getScopedSession(session);
    var permissions = getPermissions(session);
    return !!(isPengurus(session) && permissions && (
      permissions.isSuperAdmin ||
      permissions.canImportData ||
      permissions.canExportData ||
      permissions.canExportAll
    ));
  }

  function isPengurusWith(session, permissionKey) {
    var permissions = getPermissions(session);
    if (!isPengurus(session) || !permissions) {
      return false;
    }
    if (permissionKey === 'canAccessPanel') {
      return hasPanelAccess(session);
    }
    if (permissions[permissionKey]) {
      return true;
    }
    switch (permissionKey) {
      case 'canManageSantri':
      case 'canManagePengurus':
      case 'canManageJabatan':
      case 'canManageRegu':
      case 'canManageKegiatanSop':
      case 'canManageContent':
        return hasAdminAccess(session);
      case 'canManageHalaqoh':
        return hasHalaqohCoordinatorAccess(session) || hasPengampuHalaqohAccess(session);
      case 'canManageKelasSiang':
        return hasAcademicAccess(session);
      case 'canManageNilaiUp':
        return hasTeacherAccess(session);
      case 'canManageAbsensi':
        return hasTeacherAccess(session) || hasHalaqohCoordinatorAccess(session) || hasPengampuHalaqohAccess(session);
      default:
        return hasAdminAccess(session);
    }
  }

  function canAccessPage(session, href) {
    session = getScopedSession(session);
    var key = cleanFileName(href);
    var checker = PAGE_RULES[key];
    return checker ? checker(session) : hasPanelAccess(session);
  }

  function canShowNavItem(session, href) {
    var permissions;
    var visiblePages;
    var target = cleanFileName(href);

    session = getScopedSession(session);
    permissions = getPermissions(session);
    visiblePages = permissions && Array.isArray(permissions.navVisiblePages) ? permissions.navVisiblePages : [];

    if (visiblePages.length && visiblePages.indexOf(target) === -1) {
      return false;
    }

    return canAccessPage(session, target);
  }

  function filterNavItems(items, session) {
    session = getScopedSession(session);
    return (items || []).filter(function (item) {
      return canShowNavItem(session, item[0]);
    });
  }

  function cleanFileName(href) {
    var s = String(href || '').split('?')[0].replace(/\/$/, '');
    var last = s.split('/').filter(Boolean).pop() || '';
    if (!last) return 'index.html';
    return last.endsWith('.html') ? last : last + '.html';
  }

  function resolveHomePage(session) {
    session = getScopedSession(session);
    if (session && session.role === 'santri') {
      return '/pages/beranda/';
    }
    var priority = [
      'dashboard.html',
      'nilaiUjian.html',
      'editSoal.html',
      'kelasAbsensi.html',
      'halaqohAbsensi.html',
      'editHalaqoh.html',
      'editHalaqohTasmi.html',
      'editKelas.html',
      'daftarSantri.html',
      'editPengurus.html',
      'editRegu.html',
      'masterJabatan.html',
      'kegiatanSop.html',
      'tahunAjaran.html',
      'kelolaMading.html',
      'jamDigitalRemote.html',
      'accountProfile.html'
    ];
    for (var index = 0; index < priority.length; index += 1) {
      if (canAccessPage(session, priority[index])) {
        return '/' + priority[index].replace(/\.html$/, '') + '/';
      }
    }
    if (isPengurus(session)) {
      return '/pages/accountProfile/';
    }
    return '/pages/login/';
  }

  function resolveLoginPage(session) {
    return session && session.role === 'santri' ? '/pages/loginSantri/' : '/pages/login/';
  }

  var _sessionLoggedFor = '';
  function redirectIfForbidden(session, currentFile) {
    var rawSession = session;
    session = getScopedSession(session);
    if (_sessionLoggedFor !== currentFile) {
      _sessionLoggedFor = currentFile;
      var scopedPerms = getPermissions(session);
      console.group('%c[PSAccess] ' + currentFile, 'color:#c49a2c;font-weight:bold');
      console.log('Nama          :', (rawSession && rawSession.name) || '-');
      console.log('Semua jabatan :', (rawSession && rawSession.jabatanLabels && rawSession.jabatanLabels.join(', ')) || '(tidak ada)');
      console.log('Jabatan utama :', (rawSession && rawSession.primaryJabatanLabel) || '(tidak ada)');
      console.log('Role aktif    :', (scopedPerms && scopedPerms.label) || getActiveRoleScopeLabel(rawSession) || '(default)');
      console.log('Session       :', rawSession);
      console.groupEnd();
    }
    if (canAccessPage(session, currentFile)) {
      return false;
    }
    if (session && session.role === 'pengurus') {
      global.location.replace('/pages/beranda/');
    } else {
      global.location.replace(resolveHomePage(session));
    }
    return true;
  }

  global.PSAccess = {
    canAccessPage: canAccessPage,
    canUseExcelTools: canUseExcelTools,
    canShowNavItem: canShowNavItem,
    cleanFileName: cleanFileName,
    clearRoleScope: clearRoleScope,
    filterNavItems: filterNavItems,
    getActiveRoleScopeLabel: getActiveRoleScopeLabel,
    getRoleScopeOptions: getRoleScopeOptions,
    getScopedSession: getScopedSession,
    redirectIfForbidden: redirectIfForbidden,
    resolveHomePage: resolveHomePage,
    resolveLoginPage: resolveLoginPage,
    setRoleScope: setRoleScope
  };
}(window));