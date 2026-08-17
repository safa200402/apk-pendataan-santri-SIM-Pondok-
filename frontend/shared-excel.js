(function (global) {
  var XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  // ExcelJS dipakai KHUSUS utk workbook yang perlu warna (fill/font cell) — SheetJS community
  // edition (XLSX_URL di atas) tidak mendukung menulis style warna saat writeFile, cuma bisa
  // baca. ExcelJS punya API styling penuh & tetap murni client-side (CDN, sama seperti XLSX).
  var EXCELJS_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
  var SCHEMAS = {
    santri: [
      ['id', 'ID internal'],
      ['nama_lengkap_akte', 'Nama lengkap sesuai akte'],
      ['nama_lengkap_kk', 'Nama lengkap sesuai KK'],
      ['nama_setelah_diubah', 'Nama setelah diubah'],
      ['nama_panggilan', 'Nama panggilan'],
      ['catatan', 'Catatan'],
      ['password', 'Password login santri'],
      ['no_induk', 'No induk'],
      ['nik', 'NIK'],
      ['jenis_kelamin_singkat', 'Jenis kelamin singkat'],
      ['status', 'Status'],
      ['keterangan_status', 'Keterangan status'],
      ['tempat_tanggal_lahir', 'Tempat tanggal lahir'],
      ['tempat_lahir', 'Tempat lahir'],
      ['tanggal_lahir', 'Tanggal lahir'],
      ['jenis_kelamin', 'Jenis kelamin'],
      ['alamat_sekarang_tempat', 'Alamat sekarang tempat'],
      ['alamat_sekarang_rt', 'Alamat sekarang RT'],
      ['alamat_sekarang_rw', 'Alamat sekarang RW'],
      ['alamat_sekarang_desa', 'Alamat sekarang desa'],
      ['alamat_sekarang_kecamatan', 'Alamat sekarang kecamatan'],
      ['alamat_sekarang_kota', 'Alamat sekarang kota'],
      ['alamat_sekarang_provinsi', 'Alamat sekarang provinsi'],
      ['alamat_sekarang_kode_pos', 'Alamat sekarang kode pos'],
      ['ayah_nama', 'Nama ayah'],
      ['ayah_ttl', 'TTL ayah'],
      ['ayah_pekerjaan', 'Pekerjaan ayah'],
      ['ibu_nama', 'Nama ibu'],
      ['ibu_ttl', 'TTL ibu'],
      ['ibu_pekerjaan', 'Pekerjaan ibu'],
      ['wali_nama', 'Nama wali'],
      ['wali_ttl', 'TTL wali'],
      ['wali_pekerjaan', 'Pekerjaan wali'],
      ['alamat_ktp_tempat', 'Alamat KTP tempat'],
      ['alamat_ktp_rt', 'Alamat KTP RT'],
      ['alamat_ktp_rw', 'Alamat KTP RW'],
      ['alamat_ktp_desa', 'Alamat KTP desa'],
      ['alamat_ktp_kecamatan', 'Alamat KTP kecamatan'],
      ['alamat_ktp_kota', 'Alamat KTP kota'],
      ['alamat_ktp_provinsi', 'Alamat KTP provinsi'],
      ['admin_kk', 'Dokumen KK'],
      ['admin_ktp', 'Dokumen KTP'],
      ['admin_akta', 'Dokumen akta'],
      ['no_hp', 'No HP'],
      ['tanggal_keluar', 'Tanggal keluar'],
      ['infaq_pengajar', 'Infaq pengajar'],
      ['jaminan', 'Jaminan'],
      ['asal_sekolah', 'Asal sekolah']
    ],
    pengurus: [
      ['id', 'ID internal'],
      ['name', 'Nama pengurus'],
      ['password', 'Password login pengurus'],
      ['email', 'Email'],
      ['gender', 'Gender'],
      ['no_hp', 'No HP'],
      ['tanggal_lahir', 'Tanggal lahir'],
      ['status', 'Status'],
      ['jabatanIds', 'Daftar ID jabatan aktif, format {1, 2}'],
      ['primaryJabatanId', 'ID jabatan utama']
    ],
    jabatan: [
      ['id', 'ID internal'],
      ['name', 'Nama jabatan'],
      ['level', 'Level jabatan'],
      ['deskription', 'Deskripsi'],
      ['status', 'Status']
    ],
    halaqoh: [
      ['id', 'ID internal'],
      ['name', 'Nama halaqoh'],
      ['id_pengampu_halaqoh', 'Daftar ID pengampu utama, format {1, 2}'],
      ['id_pengampu_badal', 'Daftar ID pengampu badal, format {3, 4}'],
      ['id_santri', 'Daftar ID santri, format {10, 11}'],
      ['description', 'Deskripsi'],
      ['status', 'Status']
    ],
    kelasSiang: [
      ['id', 'ID internal'],
      ['name', 'Nama kelas'],
      ['jam', 'Jam'],
      ['id_pengajar', 'Daftar ID pengajar utama, format {1, 2}'],
      ['id_pengajar_badal', 'Daftar ID pengajar badal, format {3, 4}'],
      ['id_murid', 'Daftar ID santri, format {10, 11}'],
      ['description', 'Deskripsi'],
      ['status', 'Status']
    ],
    regu: [
      ['id', 'ID internal'],
      ['name', 'Nama regu'],
      ['id_pembina', 'Daftar ID pembina, format {1, 2}'],
      ['id_santri', 'Daftar ID santri, format {10, 11}'],
      ['description', 'Deskripsi'],
      ['status', 'Status']
    ],
    nilaiUp: [
      ['id', 'ID internal'],
      ['tanggal', 'Tanggal penilaian'],
      ['id_kelas', 'ID kelas'],
      ['id_pengajar', 'ID pengajar'],
      ['detail_nilai', 'JSON array nilai per santri'],
      ['catatan', 'Catatan'],
      ['status', 'Status']
    ],
    absensiGuru: [
      ['id', 'ID internal'],
      ['tanggal', 'Tanggal absensi'],
      ['day_status', 'aktif/libur/nonaktif'],
      ['nonaktif_reason', 'Alasan jika libur/nonaktif'],
      ['data_absensi', 'JSON array absensi guru'],
      ['status', 'Status']
    ],
    kegiatanSop: [
      ['id', 'ID internal'],
      ['name', 'Nama kegiatan operasional'],
      ['description', 'Deskripsi singkat kegiatan'],
      ['category', 'Kategori kegiatan'],
      ['id_jabatan', 'Daftar ID jabatan penanggung jawab, format {1, 2}'],
      ['id_jabatan_utama', 'ID jabatan penanggung jawab utama'],
      ['sop_body', 'Isi SOP dalam HTML/teks'],
      ['sop_updated_at', 'Tanggal update SOP (otomatis, boleh kosong saat import)'],
      ['status', 'Status']
    ],
    content: [
      ['id', 'ID internal'],
      ['title', 'Judul content'],
      ['slug', 'Slug URL'],
      ['summary', 'Ringkasan'],
      ['body', 'Isi lengkap'],
      ['target_role', 'pengurus/santri/umum'],
      ['published_at', 'Tanggal publish'],
      ['status', 'Published/Draft']
    ]
  };

  var LABELS = {
    santri: 'Santri',
    pengurus: 'Pengurus',
    jabatan: 'Jabatan',
    halaqoh: 'Halaqoh',
    kelasSiang: 'Kelas Siang',
    regu: 'Regu',
    nilaiUp: 'Nilai Ujian',
    absensiGuru: 'Absensi Guru',
    kegiatanSop: 'Kegiatan SOP',
    content: 'Content',
    izinPulang: 'Izin Pulang',
    santriSakit: 'Santri Sakit',
    pelanggaran: 'Pelanggaran'
  };

  function ensureXlsxLib() {
    if (global.XLSX) {
      return Promise.resolve(global.XLSX);
    }
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = XLSX_URL;
      script.onload = function () { resolve(global.XLSX); };
      script.onerror = function () { reject(new Error('Gagal memuat library Excel.')); };
      document.head.appendChild(script);
    });
  }

  function ensureExcelJsLib() {
    if (global.ExcelJS) {
      return Promise.resolve(global.ExcelJS);
    }
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = EXCELJS_URL;
      script.onload = function () { resolve(global.ExcelJS); };
      script.onerror = function () { reject(new Error('Gagal memuat library Excel (ExcelJS).')); };
      document.head.appendChild(script);
    });
  }

  function makeSheetName(name) {
    return String(name || 'Sheet').replace(/[\\/?*:[\]]/g, ' ').slice(0, 31) || 'Sheet';
  }

  function schemaFor(sheetKey) {
    var key = normalizeSheetKey(sheetKey);
    if (!SCHEMAS[key]) {
      throw new Error('Template untuk dataset ini belum tersedia.');
    }
    return SCHEMAS[key];
  }

  function decorateTemplateSchema(schema) {
    return (schema || []).map(function (item) {
      if (item[0] === 'id') {
        return [item[0], item[1] + ' (boleh kosong, diabaikan saat import)'];
      }
      return item;
    });
  }

  function normalizeSheetKey(sheetKey) {
    if (sheetKey === 'kelas') return 'kelasSiang';
    if (sheetKey === 'nilaiup') return 'nilaiUp';
    if (sheetKey === 'absensi') return 'absensiGuru';
    if (sheetKey === 'kegiatan_sop' || sheetKey === 'kegiatansop') return 'kegiatanSop';
    if (sheetKey === 'izin_pulang' || sheetKey === 'izinpulang') return 'izinPulang';
    if (sheetKey === 'santri_sakit' || sheetKey === 'santrisakit') return 'santriSakit';
    return sheetKey;
  }

  function resolveWorkbookSheetKey(sheetName) {
    var normalized = normalizeImportFieldKey(sheetName);
    var aliases = {
      santri: 'santri',
      pengurus: 'pengurus',
      jabatan: 'jabatan',
      halaqoh: 'halaqoh',
      kelas: 'kelasSiang',
      kelas_siang: 'kelasSiang',
      regu: 'regu',
      nilai_up: 'nilaiUp',
      nilaiup: 'nilaiUp',
      absensi: 'absensiGuru',
      absensi_guru: 'absensiGuru',
      kegiatan_sop: 'kegiatanSop',
      kegiatansop: 'kegiatanSop',
      content: 'content'
    };
    return aliases[normalized] || '';
  }

  function referenceSheets(refs) {
    var result = [];
    if (!refs) {
      return result;
    }
    if (Array.isArray(refs.pengurus)) {
      result.push(['Referensi Pengurus', refs.pengurus.map(function (item) {
        return { id: item.id, name: item.name };
      })]);
    }
    if (Array.isArray(refs.santri)) {
      result.push(['Referensi Santri', refs.santri.map(function (item) {
        return { id: item.id, noInduk: item.noInduk || '', name: item.name };
      })]);
    }
    if (Array.isArray(refs.jabatan)) {
      result.push(['Referensi Jabatan', refs.jabatan.map(function (item) {
        return { id: item.id, name: item.name, level: item.level || '' };
      })]);
    }
    if (Array.isArray(refs.kelas)) {
      result.push(['Referensi Kelas', refs.kelas.map(function (item) {
        return { id: item.id, name: item.name, jam: item.jam || '' };
      })]);
    }
    if (Array.isArray(refs.halaqoh)) {
      result.push(['Referensi Halaqoh', refs.halaqoh.map(function (item) {
        return { id: item.id, name: item.name };
      })]);
    }
    if (Array.isArray(refs.regu)) {
      result.push(['Referensi Regu', refs.regu.map(function (item) {
        return { id: item.id, name: item.name };
      })]);
    }
    return result;
  }

  function buildTemplateWorkbook(sheetKey, refs) {
    var schema = decorateTemplateSchema(schemaFor(sheetKey));
    var keys = schema.map(function (item) { return item[0]; });
    var guideRows = schema.map(function (item) {
      return { key: item[0], keterangan: item[1] };
    });
    return ensureXlsxLib().then(function (XLSX) {
      var workbook = XLSX.utils.book_new();
      var templateRows = [Object.fromEntries(keys.map(function (key) { return [key, '']; }))];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(templateRows, { header: keys }), makeSheetName((LABELS[normalizeSheetKey(sheetKey)] || sheetKey) + ' Template'));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(guideRows, { header: ['key', 'keterangan'] }), 'Petunjuk');
      referenceSheets(refs).forEach(function (item) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(item[1]), makeSheetName(item[0]));
      });
      return workbook;
    });
  }

  function writeWorkbook(workbook, fileName) {
    return ensureXlsxLib().then(function (XLSX) {
      XLSX.writeFile(workbook, fileName);
    });
  }

  function downloadTemplate(api, sheetKey) {
    return Promise.all([
      ensureXlsxLib(),
      api('excel.template', { sheetKey: sheetKey })
    ]).then(function (results) {
      var refs = results[1];
      return buildTemplateWorkbook(sheetKey, refs);
    }).then(function (workbook) {
      var key = normalizeSheetKey(sheetKey);
      return writeWorkbook(workbook, 'template-' + key + '.xlsx');
    });
  }

  function exportDatasets(api, sheetKeys, fileName) {
    var keys = (sheetKeys || []).map(normalizeSheetKey);
    return ensureXlsxLib().then(function (XLSX) {
      return api('export.data', { sheetKeys: keys.join(',') });
    }).then(function (data) {
      var workbook = global.XLSX.utils.book_new();
      Object.keys(data.datasets || {}).forEach(function (sheetKey) {
        var dataset = data.datasets[sheetKey];
        var rows = dataset.rows || [];
        var headers = (dataset.columns || []).map(function (column) { return column.key; });
        var worksheet = global.XLSX.utils.json_to_sheet(rows, { header: headers });
        global.XLSX.utils.book_append_sheet(workbook, worksheet, makeSheetName(LABELS[sheetKey] || dataset.sheetName || sheetKey));
      });
      return writeWorkbook(workbook, fileName || 'export-data.xlsx');
    });
  }

  /* ── buildReportWorkbookAndDownload ───────────────────────────────────────
     Laporan Excel berformat rapi (judul, subjudul, header, data) dari data
     yang sedang ditampilkan di layar — beda dengan exportDatasets() yang
     men-dump data mentah sesuai skema untuk keperluan import ulang.
     options: { title, subtitle, columns: [{label, width}], rows: [[...]], fileName, sheetName } */
  function buildReportWorkbookAndDownload(options) {
    var opts = options || {};
    var title = opts.title || 'Laporan';
    var subtitle = opts.subtitle || '';
    var columns = opts.columns || [];
    var rows = opts.rows || [];
    var fileName = opts.fileName || 'laporan.xlsx';
    var sheetName = opts.sheetName || 'Laporan';
    var colCount = Math.max(1, columns.length);

    return ensureXlsxLib().then(function (XLSX) {
      var aoa = [[title]];
      if (subtitle) aoa.push([subtitle]);
      aoa.push([]);
      aoa.push(columns.map(function (c) { return c.label; }));
      rows.forEach(function (r) { aoa.push(r); });

      var worksheet = XLSX.utils.aoa_to_sheet(aoa);
      worksheet['!cols'] = columns.map(function (c) { return { wch: Math.max(10, Math.round((c.width || 80) / 6)) }; });
      var merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
      if (subtitle) merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } });
      worksheet['!merges'] = merges;

      var workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, makeSheetName(sheetName));
      return writeWorkbook(workbook, fileName);
    });
  }

  /* ── buildColoredTablesWorkbookAndDownload ────────────────────────────────
     Workbook Excel BERWARNA, satu sheet per tabel DB — dipakai tombol "Download Tabel
     Mentah" (ganti dari PDF tabel mentah yang lama, per permintaan user), dan laporan tabel
     datar lain yang minta versi berwarna (mis. rekapZoom). Pakai ExcelJS (bukan XLSX/SheetJS
     di atas) karena cuma ExcelJS yang bisa nulis warna cell/font.
     options: { fileName, tables: [{ title, subtitle, columns: [{key,header,width}], rows: string[][] }, ...] }
     - subtitle: opsional, baris banner italic di atas header (mis. info periode/filter/total).
     - columns[].width: opsional, satuan sama seperti buildReportWorkbookAndDownload (px-ish,
       dibagi 6); kalau tidak diisi lebar kolom dihitung otomatis dari panjang label header.
  ─────────────────────────────────────────────────────────────────────────── */
  function buildColoredTablesWorkbookAndDownload(options) {
    var opts = options || {};
    var tables = Array.isArray(opts.tables) ? opts.tables : [];
    var fileName = opts.fileName || 'tabel-mentah.xlsx';
    var HDR_ARGB = 'FF4D4034';
    var SUB_ARGB = 'FFF8EEE1';
    var ROW1_ARGB = 'FFFFFBF5';
    var ROW2_ARGB = 'FFF2EBDA';
    var WHITE_ARGB = 'FFFFFFFF';
    var INK_ARGB = 'FF2A1712';

    return ensureExcelJsLib().then(function (ExcelJS) {
      var workbook = new ExcelJS.Workbook();
      workbook.creator = 'Pendataan Santri';
      workbook.created = new Date();
      var usedNames = {};
      function uniqueSheetName(base) {
        var name = makeSheetName(base);
        var n = name, i = 1;
        while (usedNames[n]) { n = makeSheetName(name.slice(0, 28) + '-' + (++i)); }
        usedNames[n] = true;
        return n;
      }

      (tables.length ? tables : [{ title: 'Kosong', columns: [{ key: 'info', header: 'Info' }], rows: [] }]).forEach(function (tbl) {
        var columns = Array.isArray(tbl.columns) ? tbl.columns : [];
        var rows = Array.isArray(tbl.rows) ? tbl.rows : [];
        var colCount = Math.max(1, columns.length);
        var ws = workbook.addWorksheet(uniqueSheetName(tbl.title || 'Tabel'));
        ws.columns = columns.map(function (c) {
          var label = String((c && c.header) || (c && c.key) || '');
          var width = (c && c.width) ? Math.max(10, Math.round(c.width / 6)) : Math.max(12, Math.min(40, label.length + 4));
          return { key: c && c.key, width: width };
        });

        if (tbl.subtitle) {
          var subRow = ws.addRow([tbl.subtitle]);
          ws.mergeCells(subRow.number, 1, subRow.number, colCount);
          subRow.height = 20;
          subRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUB_ARGB } };
          subRow.getCell(1).font = { italic: true, color: { argb: INK_ARGB } };
          subRow.getCell(1).alignment = { vertical: 'middle' };
        }

        var headerRow = ws.addRow(columns.map(function (c) { return (c && c.header) || (c && c.key) || ''; }));
        headerRow.height = 20;
        headerRow.eachCell(function (cell) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HDR_ARGB } };
          cell.font = { color: { argb: WHITE_ARGB }, bold: true };
          cell.alignment = { vertical: 'middle' };
        });
        if (!rows.length) {
          var emptyRow = ws.addRow(['Tidak ada data pada tabel ini.']);
          emptyRow.getCell(1).font = { italic: true, color: { argb: INK_ARGB } };
        }
        rows.forEach(function (rowArr, idx) {
          var row = ws.addRow(rowArr);
          var bg = idx % 2 === 0 ? ROW1_ARGB : ROW2_ARGB;
          row.eachCell({ includeEmpty: true }, function (cell) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.font = { color: { argb: INK_ARGB } };
            cell.alignment = { vertical: 'top', wrapText: true };
          });
        });
        ws.views = [{ state: 'frozen', ySplit: tbl.subtitle ? 2 : 1 }];
      });

      return workbook.xlsx.writeBuffer();
    }).then(function (buffer) {
      var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      var mountTarget = (global.PSUI && typeof global.PSUI.getLayerMountTarget === 'function')
        ? global.PSUI.getLayerMountTarget('page')
        : (document.getElementById('pageRoot') || document.body);
      link.href = url;
      link.download = fileName;
      mountTarget.appendChild(link);
      link.click();
      link.remove();
      global.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  /* ── buildColoredSectionsWorkbookAndDownload ──────────────────────────────
     Workbook Excel BERWARNA, satu SHEET per SECTION — dipakai tombol "Download Excel" di
     daftarSantri (ganti dari PDF kartu warna-warni yang lama, per permintaan user: "biar
     gampang jadikan excel aja... tapi pakai warna"). Tiap section (mis. "Biodata Santri",
     "Rekap Absensi") jadi satu sheet; tiap CARD di dalamnya jadi blok: baris judul card
     (border aksen warna section), baris badges (kalau ada, italic), lalu baris per baris teks
     "Label: Value" dipecah 2 kolom — kolom Value selalu HIJAU terang (sama seperti versi PDF).
     Baris yang tidak mengandung ": " ditulis apa adanya (digabung 2 kolom).
     options: { fileName, sections: [{ title, cards: [{ title, badges, lines }] }] }
  ─────────────────────────────────────────────────────────────────────────── */
  function buildColoredSectionsWorkbookAndDownload(options) {
    var opts = options || {};
    var sections = Array.isArray(opts.sections) ? opts.sections : [];
    var fileName = opts.fileName || 'detail-santri.xlsx';
    var ACCENT_ARGB_LIST = ['FF576B95', 'FFAB6658', 'FF976E4D', 'FF5A7A5A', 'FF8F5E99', 'FFB28A3A', 'FF468290', 'FF8C5C5C'];
    var WHITE_ARGB = 'FFFFFFFF';
    var INK_ARGB = 'FF2A1712';
    var GREEN_ARGB = 'FF15803D';
    var CARD_BG_ARGB = 'FFFFFBF5';
    var BADGE_ARGB = 'FFF8EEE1';

    return ensureExcelJsLib().then(function (ExcelJS) {
      var workbook = new ExcelJS.Workbook();
      workbook.creator = 'Pendataan Santri';
      workbook.created = new Date();
      var usedNames = {};
      function uniqueSheetName(base) {
        var name = makeSheetName(base);
        var n = name, i = 1;
        while (usedNames[n]) { n = makeSheetName(name.slice(0, 28) + '-' + (++i)); }
        usedNames[n] = true;
        return n;
      }

      (sections.length ? sections : [{ title: 'Kosong', cards: [] }]).forEach(function (section, sIndex) {
        var accent = ACCENT_ARGB_LIST[sIndex % ACCENT_ARGB_LIST.length];
        var ws = workbook.addWorksheet(uniqueSheetName(section.title || 'Section'));
        ws.columns = [{ width: 42 }, { width: 60 }];

        var titleRow = ws.addRow([section.title || 'Section']);
        ws.mergeCells(titleRow.number, 1, titleRow.number, 2);
        titleRow.height = 22;
        titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } };
        titleRow.getCell(1).font = { color: { argb: WHITE_ARGB }, bold: true, size: 13 };
        titleRow.getCell(1).alignment = { vertical: 'middle' };

        var cards = Array.isArray(section.cards) ? section.cards : [];
        if (!cards.length) {
          var emptyRow = ws.addRow(['Tidak ada data pada section ini.']);
          ws.mergeCells(emptyRow.number, 1, emptyRow.number, 2);
          emptyRow.getCell(1).font = { italic: true, color: { argb: INK_ARGB } };
        }
        cards.forEach(function (card) {
          var cardTitleText = String((card && card.title) || 'Tanpa judul');
          var badges = Array.isArray(card && card.badges) ? card.badges : [];
          var lines = Array.isArray(card && card.lines) ? card.lines : [];

          var cardRow = ws.addRow([cardTitleText]);
          ws.mergeCells(cardRow.number, 1, cardRow.number, 2);
          cardRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BG_ARGB } };
          cardRow.getCell(1).font = { bold: true, color: { argb: INK_ARGB } };
          cardRow.getCell(1).border = { left: { style: 'medium', color: { argb: accent } } };

          if (badges.length) {
            var badgeRow = ws.addRow([badges.join('  |  ')]);
            ws.mergeCells(badgeRow.number, 1, badgeRow.number, 2);
            badgeRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BADGE_ARGB } };
            badgeRow.getCell(1).font = { italic: true, size: 9, color: { argb: INK_ARGB } };
          }

          lines.forEach(function (line) {
            var text = String(line == null ? '' : line);
            var idx = text.indexOf(': ');
            var row;
            if (idx !== -1) {
              var label = text.slice(0, idx);
              var value = text.slice(idx + 2) || '-';
              row = ws.addRow([label, value]);
              row.getCell(2).font = { color: { argb: GREEN_ARGB }, bold: true };
            } else {
              row = ws.addRow([text]);
              ws.mergeCells(row.number, 1, row.number, 2);
            }
            row.eachCell({ includeEmpty: true }, function (cell) { cell.alignment = { vertical: 'top', wrapText: true }; });
          });

          ws.addRow([]);
        });
        ws.views = [{ state: 'frozen', ySplit: 1 }];
      });

      return workbook.xlsx.writeBuffer();
    }).then(function (buffer) {
      var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      var mountTarget = (global.PSUI && typeof global.PSUI.getLayerMountTarget === 'function')
        ? global.PSUI.getLayerMountTarget('page')
        : (document.getElementById('pageRoot') || document.body);
      link.href = url;
      link.download = fileName;
      mountTarget.appendChild(link);
      link.click();
      link.remove();
      global.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  function readWorkbook(file) {
    return ensureXlsxLib().then(function (XLSX) {
      return file.arrayBuffer().then(function (buffer) {
        return XLSX.read(buffer, { type: 'array' });
      });
    });
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cloneFlatObject(source) {
    return Object.assign({}, source || {});
  }

  function stripEmptyRows(rows) {
    return rows.filter(function (row) {
      return Object.keys(row || {}).some(function (key) {
        return String(row[key] === undefined || row[key] === null ? '' : row[key]).trim() !== '';
      });
    });
  }

  function normalizeImportFieldKey(field) {
    return String(field || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function buildSchemaFieldLookup(sheetKey) {
    var lookup = {};
    (SCHEMAS[normalizeSheetKey(sheetKey)] || []).forEach(function (item) {
      var field = String(item[0] || '').trim();
      var normalizedField = normalizeImportFieldKey(field);
      if (field && normalizedField && !lookup[normalizedField]) {
        lookup[normalizedField] = field;
      }
    });
    return lookup;
  }

  function sanitizeImportRow(sheetKey, row) {
    var key = normalizeSheetKey(sheetKey);
    var schemaFieldLookup = buildSchemaFieldLookup(key);
    var cleaned = {};
    Object.keys(row || {}).forEach(function (field) {
      var rawField = String(field || '').trim();
      var normalizedField = normalizeImportFieldKey(rawField);
      if (!normalizedField) {
        return;
      }
      if (normalizedField === 'id' || normalizedField === 'token' || normalizedField === 'created_at' || normalizedField === 'updated_at') {
        return;
      }
      cleaned[schemaFieldLookup[normalizedField] || rawField] = row[field];
    });
    if (key === 'pengurus' || key === 'santri') {
      delete cleaned.token;
    }
    return cleaned;
  }

  function rowsFromWorksheet(sheetKey, worksheet) {
    return stripEmptyRows(global.XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false })).map(function (row) {
      return sanitizeImportRow(sheetKey, row);
    }).filter(function (row) {
      return stripEmptyRows([row]).length > 0;
    });
  }

  function parseDatasetImportJob(sheetKey, file) {
    var key = normalizeSheetKey(sheetKey);
    return readWorkbook(file).then(function (workbook) {
      var sheetName = workbook.SheetNames[0];
      var worksheet = workbook.Sheets[sheetName];
      var rows = rowsFromWorksheet(key, worksheet);
      if (!rows.length) {
        throw new Error('File Excel tidak berisi baris data.');
      }
      return {
        sheetKey: key,
        rows: rows
      };
    });
  }

  function parseWorkbookImportJobs(file) {
    var importOrder = ['jabatan', 'pengurus', 'santri', 'halaqoh', 'kelasSiang', 'regu', 'nilaiUp', 'absensiGuru', 'content'];
    return readWorkbook(file).then(function (workbook) {
      var sheetMap = {};
      workbook.SheetNames.forEach(function (sheetName) {
        var sheetKey = resolveWorkbookSheetKey(sheetName);
        if (sheetKey && !sheetMap[sheetKey]) {
          sheetMap[sheetKey] = sheetName;
        }
      });

      var jobs = importOrder.filter(function (sheetKey) {
        return !!sheetMap[sheetKey];
      }).map(function (sheetKey) {
        return {
          sheetKey: sheetKey,
          rows: rowsFromWorksheet(sheetKey, workbook.Sheets[sheetMap[sheetKey]])
        };
      }).filter(function (job) {
        return job.rows.length > 0;
      });

      if (!jobs.length) {
        throw new Error('Workbook tidak berisi sheet data yang dikenali.');
      }

      return jobs;
    });
  }

  function buildImportChunks(rows, batchSize) {
    var chunks = [];
    for (var index = 0; index < rows.length; index += batchSize) {
      chunks.push(rows.slice(index, index + batchSize));
    }
    return chunks;
  }

  function summarizeDecisionCounts(items) {
    var summary = {
      total: items.length,
      continueCount: 0,
      skipCount: 0,
      replaceCount: 0
    };
    items.forEach(function (item) {
      if (item.decision === 'replace') {
        summary.replaceCount += 1;
        return;
      }
      if (item.decision === 'skip') {
        summary.skipCount += 1;
        return;
      }
      summary.continueCount += 1;
    });
    return summary;
  }

  function buildImportCancelledError() {
    var error = new Error('Import dibatalkan sebelum data disimpan.');
    error.isImportCancelled = true;
    return error;
  }

  function isConflictPreviewableSheet(sheetKey) {
    var key = normalizeSheetKey(sheetKey);
    return key === 'santri' ||
      key === 'pengurus' ||
      key === 'jabatan' ||
      key === 'halaqoh' ||
      key === 'kelasSiang' ||
      key === 'regu' ||
      key === 'content';
  }

  function previewImportConflicts(api, jobs) {
    var previewJobs = (jobs || []).filter(function (job) {
      return job && job.rows && job.rows.length && isConflictPreviewableSheet(job.sheetKey);
    });
    if (!previewJobs.length) {
      return Promise.resolve([]);
    }

    return Promise.all(previewJobs.map(function (job) {
      return api('import.preview', {
        sheetKey: job.sheetKey,
        records: job.rows
      }, 'POST').then(function (data) {
        var preview = data || {};
        preview.sheetKey = normalizeSheetKey(job.sheetKey);
        preview.label = preview.label || LABELS[preview.sheetKey] || preview.sheetKey;
        preview.conflicts = Array.isArray(preview.conflicts) ? preview.conflicts : [];
        return preview;
      });
    }));
  }

  function buildConflictDialogItems(previews) {
    var items = [];
    (previews || []).forEach(function (preview) {
      (preview.conflicts || []).forEach(function (conflict) {
        items.push({
          key: preview.sheetKey + ':' + conflict.rowIndex,
          sheetKey: preview.sheetKey,
          sheetLabel: preview.label || LABELS[preview.sheetKey] || preview.sheetKey,
          rowIndex: conflict.rowIndex,
          rowNumber: conflict.rowNumber || (conflict.rowIndex + 2),
          name: conflict.name || '',
          matchCount: Number(conflict.matchCount || ((conflict.existingMatches || []).length || 0)),
          existingMatches: Array.isArray(conflict.existingMatches) ? conflict.existingMatches : [],
          canReplace: !!conflict.canReplace,
          replaceTargetId: conflict.replaceTargetId || '',
          recommendedAction: conflict.recommendedAction || (conflict.canReplace ? 'replace' : 'skip'),
          decision: conflict.recommendedAction || (conflict.canReplace ? 'replace' : 'skip')
        });
      });
    });
    return items;
  }

  function groupConflictDialogItems(items) {
    var groups = [];
    var groupMap = {};
    (items || []).forEach(function (item) {
      if (!groupMap[item.sheetKey]) {
        groupMap[item.sheetKey] = {
          sheetKey: item.sheetKey,
          sheetLabel: item.sheetLabel,
          items: []
        };
        groups.push(groupMap[item.sheetKey]);
      }
      groupMap[item.sheetKey].items.push(item);
    });
    return groups;
  }

  function ensureConflictDialogState() {
    if (global.__psExcelConflictDialogState) {
      return global.__psExcelConflictDialogState;
    }

    if (!document.getElementById('psExcelConflictStyle')) {
      var style = document.createElement('style');
      style.id = 'psExcelConflictStyle';
      style.textContent = [
        '.ps-import-conflict-dialog{width:min(980px,calc(100vw - 32px));max-height:calc(100vh - 32px);padding:0;border:0;border-radius:24px;overflow:hidden;background:#fffaf1;box-shadow:0 28px 60px rgba(34,24,16,0.24);}',
        '.ps-import-conflict-dialog::backdrop{background:rgba(24,16,10,0.42);backdrop-filter:blur(2px);}',
        '.ps-import-conflict-shell{display:grid;gap:16px;padding:22px;height:95vh}',
        '.ps-import-conflict-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;}',
        '.ps-import-conflict-head h2{margin:0;font-size:1.45rem;line-height:1.2;color:#2b2118;}',
        '.ps-import-conflict-head p{margin:8px 0 0;color:#5f4a37;line-height:1.6;}',
        '.ps-import-conflict-toolbar{display:flex;flex-wrap:wrap;gap:10px;}',
        '.ps-import-conflict-note{padding:12px 14px;border-radius:16px;background:#fff2d8;color:#6b4b1f;line-height:1.6;border:1px solid rgba(148,101,27,0.14);}',
        '.ps-import-conflict-scroll{max-height:min(62vh,640px);overflow:auto;padding-right:4px;}',
        '.ps-import-conflict-group{display:grid;gap:12px;margin-bottom:18px;}',
        '.ps-import-conflict-group h3{margin:0;font-size:1rem;color:#2b2118;}',
        '.ps-import-conflict-item{padding:16px;border-radius:18px;border:1px solid rgba(72,48,28,0.12);background:#ffffff;display:grid;gap:12px;}',
        '.ps-import-conflict-item-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}',
        '.ps-import-conflict-item-head strong{display:block;color:#2b2118;}',
        '.ps-import-conflict-item-head p{margin:6px 0 0;color:#5f4a37;line-height:1.5;}',
        '.ps-import-conflict-badge{display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border-radius:999px;background:#f4e3bf;color:#6d4a14;font-size:.76rem;font-weight:700;}',
        '.ps-import-conflict-existing{display:grid;gap:8px;}',
        '.ps-import-conflict-existing-item{padding:10px 12px;border-radius:14px;background:#fcf6ea;border:1px solid rgba(72,48,28,0.08);}',
        '.ps-import-conflict-existing-item strong{display:block;color:#38291b;}',
        '.ps-import-conflict-existing-item span{display:block;margin-top:4px;color:#67513e;font-size:.92rem;line-height:1.5;}',
        '.ps-import-conflict-actions{display:flex;flex-wrap:wrap;gap:10px;}',
        '.ps-import-conflict-button{min-height:40px;padding:0 14px;border-radius:999px;border:1px solid rgba(72,48,28,0.14);background:#fffdf8;color:#4d3522;font:inherit;font-weight:700;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,background-color .16s ease,color .16s ease;}',
        '.ps-import-conflict-button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 18px rgba(72,48,28,0.08);}',
        '.ps-import-conflict-button:disabled{opacity:.46;cursor:not-allowed;box-shadow:none;}',
        '.ps-import-conflict-button.is-active{background:#8b5d20;color:#fffaf2;border-color:#8b5d20;}',
        '.ps-import-conflict-button.is-warn{background:#9b2c2c;color:#fff;border-color:#9b2c2c;}',
        '.ps-import-conflict-button.is-safe{background:#1f6f43;color:#fff;border-color:#1f6f43;}',
        '.ps-import-conflict-recommendation{margin:0;color:#5f4a37;line-height:1.6;font-size:.94rem;}',
        '.ps-import-conflict-foot{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding-top:6px;border-top:1px solid rgba(72,48,28,0.1);}',
        '.ps-import-conflict-foot p{margin:0;color:#5f4a37;}',
        '.ps-import-conflict-foot-actions{display:flex;gap:10px;flex-wrap:wrap;}',
        '@media (max-width:700px){.ps-import-conflict-shell{padding:16px;}.ps-import-conflict-dialog{width:min(100vw - 16px,980px);max-height:calc(100vh - 16px);border-radius:20px;}.ps-import-conflict-item-head,.ps-import-conflict-foot{grid-auto-flow:row;display:grid;}.ps-import-conflict-toolbar,.ps-import-conflict-actions,.ps-import-conflict-foot-actions{display:grid;}.ps-import-conflict-button{width:100%;}}'
      ].join('');
      document.head.appendChild(style);
    }

    var dialog = document.createElement('dialog');
    dialog.className = 'ps-import-conflict-dialog';
    dialog.innerHTML = [
      '<form method="dialog" class="ps-import-conflict-shell">',
      '  <div class="ps-import-conflict-head">',
      '    <div>',
      '      <h2>Konflik nama saat import</h2>',
      '      <p id="psImportConflictSummary"></p>',
      '    </div>',
      '    <button class="ps-import-conflict-button" type="button" data-import-dialog-close="true">Batalkan</button>',
      '  </div>',
      '  <div class="ps-import-conflict-toolbar">',
      '    <button class="ps-import-conflict-button is-safe" type="button" data-import-apply-all="replace">Ganti yang aman</button>',
      '    <button class="ps-import-conflict-button" type="button" data-import-apply-all="skip">Skip konflik</button>',
      '    <button class="ps-import-conflict-button" type="button" data-import-apply-all="continue">Lanjutkan semua</button>',
      '  </div>',
      //'  <div class="ps-import-conflict-note">Rekomendasi otomatis sudah dipilih. Opsi Ganti akan memperbarui data lama berdasarkan nama yang sama, dan kolom kosong di file Excel tidak akan menghapus data lama.</div>',
      '  <div class="ps-import-conflict-scroll" id="psImportConflictBody"></div>',
      '  <div class="ps-import-conflict-foot">',
      '    <p id="psImportConflictCounter"></p>',
      '    <div class="ps-import-conflict-foot-actions">',
      '      <button class="ps-import-conflict-button is-warn" type="button" data-import-dialog-close="true">Batalkan</button>',
      '      <button class="ps-import-conflict-button is-safe" type="button" data-import-dialog-confirm="true">Proses import</button>',
      '    </div>',
      '  </div>',
      '</form>'
    ].join('');
    ((window.PSUI && typeof window.PSUI.getLayerMountTarget === 'function')
      ? window.PSUI.getLayerMountTarget('dialog')
      : (document.getElementById('dialogRoot') || document.body)).appendChild(dialog);

    var state = {
      dialog: dialog,
      summary: dialog.querySelector('#psImportConflictSummary'),
      body: dialog.querySelector('#psImportConflictBody'),
      counter: dialog.querySelector('#psImportConflictCounter'),
      items: [],
      closeResult: null,
      resolver: null
    };

    function closeDialog(result) {
      state.closeResult = result;
      if (state.dialog.open) {
        state.dialog.close();
      }
    }

    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeDialog(null);
    });

    dialog.addEventListener('close', function () {
      if (typeof state.resolver !== 'function') {
        state.closeResult = null;
        return;
      }
      var resolver = state.resolver;
      var result = state.closeResult;
      state.resolver = null;
      state.closeResult = null;
      resolver(result);
    });

    dialog.addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button) {
        return;
      }

      var closeButton = button.getAttribute('data-import-dialog-close');
      var confirmButton = button.getAttribute('data-import-dialog-confirm');
      var applyAllDecision = button.getAttribute('data-import-apply-all');
      var itemKey = button.getAttribute('data-conflict-key');
      var itemDecision = button.getAttribute('data-conflict-decision');

      if (closeButton) {
        closeDialog(null);
        return;
      }

      if (confirmButton) {
        closeDialog(state.items.map(function (item) {
          return cloneFlatObject(item);
        }));
        return;
      }

      if (applyAllDecision) {
        state.items.forEach(function (item) {
          if (applyAllDecision === 'replace') {
            item.decision = item.canReplace ? 'replace' : 'skip';
          } else {
            item.decision = applyAllDecision;
          }
        });
        renderConflictDialogState(state);
        return;
      }

      if (itemKey && itemDecision) {
        state.items.forEach(function (item) {
          if (item.key === itemKey) {
            if (itemDecision === 'replace' && !item.canReplace) {
              return;
            }
            item.decision = itemDecision;
          }
        });
        renderConflictDialogState(state);
      }
    });

    global.__psExcelConflictDialogState = state;
    return state;
  }

  function renderConflictDialogState(state) {
    var groups = groupConflictDialogItems(state.items);
    var decisionSummary = summarizeDecisionCounts(state.items);
    state.summary.textContent = 'Ditemukan ' + state.items.length + ' konflik nama pada ' + groups.length + ' dataset. Tinjau keputusan per baris sebelum import dilanjutkan.';
    state.counter.textContent = 'Pilihan saat ini: Ganti ' + decisionSummary.replaceCount + ', Skip ' + decisionSummary.skipCount + ', Lanjutkan ' + decisionSummary.continueCount + '.';

    state.body.innerHTML = groups.map(function (group) {
      return [
        '<section class="ps-import-conflict-group">',
        '  <h3>' + escapeHtml(group.sheetLabel) + ' (' + group.items.length + ' konflik)</h3>',
        group.items.map(function (item) {
          var replaceDisabled = item.canReplace ? '' : ' disabled';
          return [
            '<article class="ps-import-conflict-item">',
            '  <div class="ps-import-conflict-item-head">',
            '    <div>',
            '      <strong>Baris ' + escapeHtml(item.rowNumber) + ' - ' + escapeHtml(item.name || '(tanpa nama)') + '</strong>',
            '      <p>Nama ini sudah terdeteksi ada di data ' + escapeHtml(group.sheetLabel.toLowerCase()) + '.</p>',
            '    </div>',
            '    <span class="ps-import-conflict-badge">' + escapeHtml(item.matchCount) + ' cocok</span>',
            '  </div>',
            '  <div class="ps-import-conflict-existing">',
            item.existingMatches.map(function (match) {
              return [
                '<div class="ps-import-conflict-existing-item">',
                '  <strong>' + escapeHtml(match.name || '-') + '</strong>',
                '  <span>' + escapeHtml(match.subtitle || 'Data lama tanpa ringkasan tambahan.') + '</span>',
                '</div>'
              ].join('');
            }).join(''),
            '  </div>',
            '  <div class="ps-import-conflict-actions">',
            '    <button class="ps-import-conflict-button' + (item.decision === 'continue' ? ' is-active' : '') + '" type="button" data-conflict-key="' + escapeHtml(item.key) + '" data-conflict-decision="continue">Lanjutkan</button>',
            '    <button class="ps-import-conflict-button' + (item.decision === 'skip' ? ' is-active' : '') + '" type="button" data-conflict-key="' + escapeHtml(item.key) + '" data-conflict-decision="skip">Skip</button>',
            '    <button class="ps-import-conflict-button' + (item.decision === 'replace' ? ' is-active' : '') + '" type="button" data-conflict-key="' + escapeHtml(item.key) + '" data-conflict-decision="replace"' + replaceDisabled + '>Ganti</button>',
            '  </div>',
            '  <p class="ps-import-conflict-recommendation">' + escapeHtml(item.canReplace
              ? 'Rekomendasi: Ganti. Data lama akan diperbarui, dan kolom kosong di Excel tidak akan menghapus isi lama.'
              : 'Rekomendasi: Skip. Nama ini cocok ke lebih dari satu data lama, jadi Ganti dinonaktifkan agar tidak salah menimpa data.') + '</p>',
            '</article>'
          ].join('');
        }).join(''),
        '</section>'
      ].join('');
    }).join('');
  }

  function openConflictDialog(items) {
    var state = ensureConflictDialogState();
    state.items = (items || []).map(function (item) {
      return cloneFlatObject(item);
    });
    renderConflictDialogState(state);

    if (state.dialog.open) {
      state.dialog.close();
    }

    return new Promise(function (resolve) {
      state.resolver = resolve;
      state.closeResult = null;
      state.dialog.showModal();
    });
  }

  function applyConflictDecisions(jobs, previews, resolvedItems) {
    var decisionMap = {};
    var conflictMapBySheet = {};

    (resolvedItems || []).forEach(function (item) {
      decisionMap[item.key] = item;
    });

    (previews || []).forEach(function (preview) {
      var sheetMap = {};
      (preview.conflicts || []).forEach(function (conflict) {
        sheetMap[conflict.rowIndex] = conflict;
      });
      conflictMapBySheet[preview.sheetKey] = sheetMap;
    });

    var resolvedJobs = (jobs || []).map(function (job) {
      var conflictMap = conflictMapBySheet[job.sheetKey] || {};
      var nextRows = [];
      job.rows.forEach(function (row, rowIndex) {
        var conflict = conflictMap[rowIndex];
        if (!conflict) {
          nextRows.push(row);
          return;
        }

        var item = decisionMap[job.sheetKey + ':' + rowIndex];
        var decision = item && item.decision ? item.decision : (conflict.recommendedAction || 'skip');
        if (decision === 'skip') {
          return;
        }

        var nextRow = cloneFlatObject(row);
        if (decision === 'replace' && conflict.canReplace && conflict.replaceTargetId) {
          nextRow.__importAction = 'replace';
          nextRow.__importExistingId = conflict.replaceTargetId;
        }
        nextRows.push(nextRow);
      });
      return {
        sheetKey: job.sheetKey,
        rows: nextRows
      };
    }).filter(function (job) {
      return job.rows.length > 0;
    });

    return {
      jobs: resolvedJobs,
      resolution: summarizeDecisionCounts(resolvedItems || [])
    };
  }

  function resolveImportJobs(api, jobs) {
    return previewImportConflicts(api, jobs).then(function (previews) {
      var items = buildConflictDialogItems(previews);
      if (!items.length) {
        return {
          jobs: jobs,
          resolution: summarizeDecisionCounts([])
        };
      }

      return openConflictDialog(items).then(function (resolvedItems) {
        if (!resolvedItems) {
          throw buildImportCancelledError();
        }
        var resolved = applyConflictDecisions(jobs, previews, resolvedItems);
        if (!resolved.jobs.length) {
          throw new Error('Semua baris konflik dipilih untuk di-skip. Tidak ada data yang diimport.');
        }
        return resolved;
      });
    });
  }

  function runImportJobs(api, jobs, options, asWorkbook) {
    var config = options || {};
    var batchSize = config.batchSize || 50;
    var totalRows = jobs.reduce(function (sum, job) {
      return sum + job.rows.length;
    }, 0);
    var completed = 0;
    var importedSheets = [];

    return jobs.reduce(function (promise, job) {
      var chunks = buildImportChunks(job.rows, batchSize);
      return promise.then(function () {
        return chunks.reduce(function (chunkPromise, chunk) {
          return chunkPromise.then(function () {
            return api('batch.save', { sheetKey: job.sheetKey, records: chunk }, 'POST').then(function () {
              completed += chunk.length;
              if (typeof config.onProgress === 'function') {
                if (asWorkbook) {
                  config.onProgress({
                    sheetKey: job.sheetKey,
                    completed: completed,
                    total: totalRows
                  });
                } else {
                  config.onProgress(completed, totalRows);
                }
              }
            });
          });
        }, Promise.resolve()).then(function () {
          importedSheets.push({
            sheetKey: job.sheetKey,
            count: job.rows.length
          });
        });
      });
    }, Promise.resolve()).then(function () {
      return {
        count: totalRows,
        sheets: importedSheets
      };
    });
  }

  function importDataset(api, sheetKey, file, options) {
    var config = options || {};
    return parseDatasetImportJob(sheetKey, file).then(function (job) {
      return resolveImportJobs(api, [job]);
    }).then(function (resolved) {
      return runImportJobs(api, resolved.jobs, config, false).then(function (result) {
        result.conflictResolution = resolved.resolution;
        return result;
      });
    });
  }

  function importWorkbook(api, file, options) {
    var config = options || {};
    return parseWorkbookImportJobs(file).then(function (jobs) {
      return resolveImportJobs(api, jobs);
    }).then(function (resolved) {
      return runImportJobs(api, resolved.jobs, config, true).then(function (result) {
        result.conflictResolution = resolved.resolution;
        return result;
      });
    });
  }

  global.PSExcel = {
    downloadTemplate: downloadTemplate,
    exportDatasets: exportDatasets,
    buildReportWorkbookAndDownload: buildReportWorkbookAndDownload,
    buildColoredTablesWorkbookAndDownload: buildColoredTablesWorkbookAndDownload,
    buildColoredSectionsWorkbookAndDownload: buildColoredSectionsWorkbookAndDownload,
    importDataset: importDataset,
    importWorkbook: importWorkbook,
    normalizeSheetKey: normalizeSheetKey
  };
}(window));
