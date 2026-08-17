(function (global) {
  var NAV_GROUPS = [
    {
      title: 'Dashboard',
      items: [
        {
          href: '/pages/dashboardAdmin/',
          label: '* Dashboard Admin',
          description: 'Audit penempatan halaqoh, kelas, dan kelengkapan data santri'
        },
        {
          href: '/pages/dashboardKoordHalaqoh/',
          label: '* Dashboard Koordinator Halaqoh',
          description: 'Audit absensi halaqoh dan pengampu tanpa halaqoh'
        },
        {
          href: '/pages/dashboardAkademik/',
          label: '* Dashboard Akademik',
          description: 'Audit guru kelas siang yang tidak terdaftar di kelas manapun'
        },
        {
          href: '/pages/dashboardKesantrian/',
          label: '* Dashboard Kesantrian',
          description: 'Rekap pelanggaran santri per bulan'
        },
        {
          href: '/pages/dashboardSdm/',
          label: '* Dashboard SDM',
          description: 'Audit sumber daya manusia — pengurus aktif dan kelengkapan jabatan'
        },
      ]
    },
    {
      title: 'Santri',
      items: [
        {
          href: '/pages/daftarSantri/',
          label: 'Daftar Santri',
          description: 'Lihat data santri secara lengkap, kelola biodata dan data utama'
        }
      ]
    },
    {
      title: 'Pengurus',
      items: [
        {
          href: '/pages/strukturOrganisasi/',
          label: 'Struktur Organisasi',
          description: 'Bagan hierarki jabatan dan pengurus yang bertugas'
        },
        {
          href: '/pages/masterJabatan/',
          label: '*** Master Jabatan',
          description: 'Atur daftar jabatan pengurus'
        },
        {
          href: '/pages/editPengurus/',
          label: '* Edit Pengurus',
          description: 'Kelola akun dan data pengurus'
        },
        {
          href: '/pages/kegiatanSop/',
          label: '* Edit Kegiatan & SOP',
          description: 'Kelola kegiatan operasional dan SOP pesantren'
        },
        {
          href: '/pages/koordinatAbsensi/',
          label: '* Koordinat Absensi',
          description: 'Atur titik koordinat absensi pengurus per individu'
        },
        {
          href: '/pages/inputAbsensiPengurus/',
          label: 'Input Absensi Pengurus',
          description: 'Input absensi pengurus dengan verifikasi geolokasi dan foto'
        },
        {
          href: '/pages/rekapAbsensiPengurus/',
          label: '* Cek Absensi Pengurus',
          description: 'Cek absensi pengurus satu per satu lewat kalender bulanan'
        },
        {
          href: '/pages/jurnalSdm/',
          label: '* Jurnal & Jam Kerja Pengurus',
          description: 'Kelola jurnal kegiatan harian, data fingerprint/lapangan, dan pengesahan jam kerja pengurus'
        },
        {
          href: '/pages/jadwalHarianPengurus/',
          label: 'Jadwal Harian Pengurus',
          description: 'Catat jam kehadiran ibadah pengurus setiap hari (shubuh, siang, isya)'
        },
        {
          href: '/pages/jadwalFingerprint/',
          label: 'Jadwal Fingerprint',
          description: 'Jam kehadiran pengurus otomatis dari scan alat fingerprint, bisa dikoreksi manual'
        }
      ]
    },
    {
      title: 'Tahun Ajaran',
      items: [
        {
          href: '/pages/tahunAjaran/',
          label: '** Tahun Ajaran',
          description: 'Kelola periode tahun ajaran pesantren'
        }
      ]
    },
    {
      title: 'Halaqoh',
      items: [
        {
          href: '/pages/editHalaqoh/',
          label: '* Edit Halaqoh',
          description: 'Atur pembagian halaqoh'
        },
        {
          href: '/pages/editHalaqohTasmi/',
          label: '* Edit Halaqoh Tasmi\'',
          description: 'Atur pembagian halaqoh tasmi\''
        },
        {
          href: '/pages/riwayatPindahHalaqoh/',
          label: '* Riwayat Pindah Halaqoh',
          description: 'Catatan permanen perpindahan santri antar halaqoh'
        },
        {
          href: '/pages/halaqohAbsensi/',
          label: '* Absensi Halaqoh',
          description: 'Input absensi santri harian per halaqoh'
        },
        {
          href: '/pages/hafalanHarian/',
          label: '* Hafalan Harian',
          description: 'Input ziyadah dan muroja\'ah harian per halaqoh'
        },
        {
          href: '/pages/tasmiSetoran/',
          label: '* Setoran Tasmi\' Pekanan',
          description: 'Input nilai setoran tasmi\' pekanan per Halaqoh Tasmi\''
        },
        {
          href: '/pages/ujianHafalan/',
          label: '* Ujian Hafalan (juziyyah, sertifikasi)',
          description: 'Input dan pantau ujian juziyyah, sertifikasi'
        },
        {
          href: '/pages/nilaiUas/',
          label: '* Nilai UAS Halaqoh (akhir sem)',
          description: 'Input nilai ujian akhir semester: Qur\'an, Mufrodat, Hadits, Adzkar'
        }
      ]
    },
    {
      title: 'Kelas',
      items: [
        {
          href: '/pages/editKelas/',
          label: '* Kelas',
          description: 'Susun kelas dan jadwal siang'
        },
        {
          href: '/pages/inputKelasLevel/',
          label: '* Input Tingkat Kelas',
          description: 'Input tingkat/marhalah santri (Shigor I\'dadi, Tamhidi, Takmili) per kelas'
        },
        {
          href: '/pages/kelasAbsensi/',
          label: '* Absensi Kelas',
          description: 'Input absensi santri harian per kelas'
        },
        {
          href: '/pages/nilaiUjian/',
          label: '* Nilai Ujian (per 2 pekan)',
          description: 'Input nilai Ujian per kelas'
        },
        {
          href: '/pages/editSoal/',
          label: '* Edit Soal (per 2 pekan)',
          description: 'Kelola soal ujian per kelas'
        }
      ]
    },
    {
      title: 'Pelajaran Santri',
      items: [
        {
          href: '/pages/masterPelajaran/',
          label: '* Master Pelajaran',
          description: 'Kelola daftar pelajaran, level, dan syarat antar level'
        },
        {
          href: '/pages/progPelajaran/',
          label: '* Progress Pelajaran Santri',
          description: 'Pantau dan input pelajaran yang sedang dan sudah dipelajari santri'
        }
      ]
    },
    {
      title: 'Regu',
      items: [
        {
          href: '/pages/editRegu/',
          label: '* Edit Regu',
          description: 'Rapikan kelompok dan regu'
        },
        {
          href: '/pages/riwayatPindahRegu/',
          label: '* Riwayat Pindah Regu',
          description: 'Catatan permanen perpindahan santri antar regu'
        },
        {
          href: '/pages/reguAbsensi/',
          label: '* Absensi Regu',
          description: 'Input absensi santri harian per regu'
        },
        {
          href: '/pages/perkembanganSantri/',
          label: '* Perkembangan Santri (RJ)',
          description: 'Catat cerita/perkembangan harian santri per regu (pembina regu)'
        },
        {
          href: '/pages/perkembanganTemplate/',
          label: '* Template Perkembangan',
          description: 'Kelola template kalimat input perkembangan santri (admin, kesantrian)'
        }
      ]
    },
    {
      title: 'Data Kelompok dan Jadwal',
      items: [
        {
          href: '/pages/dataKelompok/',
          label: '* Data Kelompok',
          description: 'Tabel kelompok Halaqoh, Regu, dan Kelas beserta pengampu & anggotanya'
        },
        {
          href: '/pages/dataKelompokManual/',
          label: '* Data Kelompok (Manual)',
          description: 'Tabel kelompok versi isi bebas manual, terikat tahun ajaran (admin, super admin, mudir, SDM)'
        },
        {
          href: '/pages/jadwalIbadah/',
          label: 'Jadwal Ibadah',
          description: 'Atur jadwal kultum, imam, dan khutbah Jum\'at per pekan'
        }
      ]
    },
    {
      title: 'Raport & Rekam Jejak (RJ)',
      items: [
        {
          href: '/pages/raport&rekamJejak/',
          label: '* Raport & Rekam Jejak',
          description: 'Lihat & cetak raport semester dan rekam jejak bulanan santri'
        },
        {
          href: '/pages/akhlakKepribadian/',
          label: '* Akhlak & Kepribadian (akhir sem)',
          description: 'Input nilai akhlak (huruf) santri per regu per semester'
        },
        {
          href: '/pages/deskripsiSantri/',
          label: '* Deskripsi Raport (akhir sem)',
          description: 'Tulis deskripsi/nasehat raport santri per regu, dengan template'
        }
      ]
    },
    {
      title: 'Pelanggaran & Kondisi',
      items: [
        {
          href: '/pages/pelanggaran/',
          label: 'Pelanggaran Santri',
          description: 'Catat dan kelola pelanggaran santri beserta hukumannya'
        },
        {
          href: '/pages/jenisPelanggaran/',
          label: '* Jenis Pelanggaran',
          description: 'Kelola daftar jenis pelanggaran (Kesantrian, Admin, Super Admin)'
        },
        {
          href: '/pages/santriSakit/',
          label: '* Santri Sakit',
          description: 'Pantau dan catat santri yang sedang sakit'
        },
        {
          href: '/pages/izinPulang/',
          label: '* Izin Pulang',
          description: 'Catat santri yang izin pulang dan pantau kepulangannya'
        },
        {
          href: '/pages/rekapZoom/',
          label: 'Rekap Zoom',
          description: 'Rekap kehadiran zoom santri per bulan dan status kunjungan penjengukan'
        }
      ]
    },
    {
      title: 'Lainnya',
      items: [
        {
          href: '/pages/bukuDigital/',
          label: 'Perpustakaan Digital',
          description: 'Buku dan modul digital per mata pelajaran'
        },
        {
          href: '/pages/bankSoal/',
          label: 'Bank Soal',
          description: 'Kumpulan soal ujian per pelajaran, jenis, dan tingkat'
        },
        {
          href: '/pages/kaldik/',
          label: 'Kalender Akademik',
          description: 'Lihat jadwal dan agenda kegiatan'
        },
        {
          href: '/pages/editKaldik/',
          label: '* Edit Kaldik',
          description: 'Tambah dan kelola agenda kalender akademik'
        },
        {
          href: '/pages/jamDigital/',
          label: 'Jam Digital',
          description: 'Halaman viewer jam digital untuk ditampilkan di TV'
        },
        {
          href: '/pages/jamDigitalRemote/',
          label: '* Remote Jam Digital',
          description: 'Kendalikan tampilan jam masjid di TV secara remote'
        },
        {
          href: '/pages/skemaDb/',
          label: '*** Skema Database',
          description: 'Struktur dan relasi tabel database sistem'
        },
        {
          href: '/pages/aksesInfo/',
          label: '*** Info Akses',
          description: 'Halaman apa yang bisa diakses oleh setiap jabatan'
        },
        {
          href: '/pages/infoHalaman/',
          label: '*** Info Halaman',
          description: 'Panduan fitur, akses, dan makna warna seluruh halaman sistem'
        }
      ]
    },
    {
      title: 'Pengaturan',
      items: [
        {
          href: '/',
          label: 'Portal Publik',
          description: 'Buka halaman depan portal'
        },
        {
          href: '/pages/madingDigital/',
          label: 'Mading Digital',
          description: 'Lihat konten & pengumuman sesuai role aktif'
        },
        {
          href: '/pages/kelolaMading/',
          label: '* Kelola Mading',
          description: 'Publikasi konten untuk pengurus, umum, dan santri'
        },
        {
          href: '/pages/pengumuman/',
          label: '* Kelola Pengumuman',
          description: 'Pengumuman/pengingat popup untuk jabatan tertentu (Admin, Super Admin, Mudir)'
        },
        {
          href: '/pages/survey/',
          label: '* Kelola Survey',
          description: 'Survey wajib (pilihan ganda/isian singkat) yang harus dituntaskan benar sebelum bisa ditutup (Admin, Super Admin, Mudir)'
        },
        {
          href: '/pages/kelolaAudit/',
          label: '* Kelola Audit',
          description: 'Aktif/nonaktifkan popup audit absensi halaqoh/kelas, hafalan harian & perkembangan santri (Admin, Super Admin, Mudir)'
        },
        {
          href: '/pages/kelolaAuditBawahan/',
          label: '* Kelola Audit Bawahan',
          description: 'Pantau bawahan yang belum menyelesaikan tugasnya, tanpa konsekuensi/blokir apa pun (Admin, Super Admin)'
        },
        {
          href: '/pages/dashboard/',
          label: '*** Dashboard Super Admin',
          description: 'Ikhtisar data dan akses cepat (Super Admin)'
        },
        {
          href: '/pages/portalSettings/',
          label: '** Pengaturan Portal',
          description: 'Atur logo dan nama organisasi'
        },
        {
          href: '/pages/superAdmin/',
          label: '*** Panel Super Admin',
          description: 'Operasi massal otomatis: reset password, username, sesi'
        },
        {
          href: '/pages/backup/',
          label: '** Backup & Restore',
          description: 'Buat, unduh, dan hapus backup data sistem (Admin, Super Admin) — restore data khusus Super Admin'
        },
      ]
    },
    {
      title: 'Santri',
      items: [
        {
          href: '/pages/santri/santriProfile/',
          label: 'Profil Santri',
          description: 'Data diri, halaqoh, kelas siang, dan regu'
        },
        {
          href: '/pages/santri/rekamJejak/',
          label: 'Rekam Jejak',
          description: 'Lihat rekam jejak perkembangan bulanan pribadi'
        },
        {
          href: '/pages/santri/kondisiSantri/',
          label: 'Kondisi Saya',
          description: 'Zoom, pelanggaran, izin pulang, dan data sakit pribadi'
        }
      ]
    },
  ];

  function flattenItems() {
    return NAV_GROUPS.reduce(function (list, group) {
      (group.items || []).forEach(function (item) {
        list.push([item.href, item.label]);
      });
      return list;
    }, []);
  }

  function cleanFileName(href) {
    var s = String(href || '').split('?')[0].replace(/\/$/, '');
    var last = s.split('/').filter(Boolean).pop() || '';
    if (!last) return 'index.html';
    return last.endsWith('.html') ? last : last + '.html';
  }

  function findItem(href) {
    var target = cleanFileName(href);
    for (var groupIndex = 0; groupIndex < NAV_GROUPS.length; groupIndex += 1) {
      var items = NAV_GROUPS[groupIndex].items || [];
      for (var itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        if (cleanFileName(items[itemIndex].href) === target) {
          return items[itemIndex];
        }
      }
    }
    return null;
  }

  function getPageTitle(href) {
    var item = findItem(href);
    return item ? item.label : 'Panel';
  }

  global.PSNav = {
    groups: NAV_GROUPS,
    flattenItems: flattenItems,
    findItem: findItem,
    getPageTitle: getPageTitle
  };
}(window));
