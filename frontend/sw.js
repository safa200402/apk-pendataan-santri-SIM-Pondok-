const CACHE_NAME = 'pendataan-santri-static-v98';
const APP_SHELL = [
  './',
  './index.html',
  './pages/login/',
  './pages/loginSantri/',
  './pages/logout/',
  './pages/accountProfile/',
  './pages/changePassword/',
  './pages/santri/santriProfile/',
  './pages/madingDigital/',
  './pages/dashboard/',
  './pages/daftarSantri/',
  './pages/editPengurus/',
  './pages/editHalaqoh/',
  './pages/editKelas/',
  './pages/editRegu/',
  './pages/pelanggaran/',
  './pages/santriSakit/',
  './pages/izinPulang/',
  './pages/koordinatAbsensi/',
  './pages/inputAbsensiPengurus/',
  './pages/rekapAbsensiPengurus/',
  './pages/nilaiUjian/',
  './pages/editSoal/',
  './pages/quizDigital/',
  './pages/santri/quizSantri/',
  './pages/halaqohAbsensi/',
  './pages/ujianHafalan/',
  './pages/hafalanHarian/',
  './pages/nilaiUas/',
  './pages/kelasAbsensi/',
  './pages/reguAbsensi/',
  './pages/kelolaMading/',
  './pages/portalSettings/',
  './pages/superAdmin/',
  './pages/masterJabatan/',
  './pages/tahunAjaran/',
  './pages/kaldik/',
  './pages/editKaldik/',
  './pages/kegiatanSop/',
  './pages/catatanku/',
  './pages/aksesInfo/',
  './pages/skemaDb/',
  './shared-ui.css',
  './shared-ui.js',
  './shared-shell.css',
  './shared-audit.js',
  './shared-access.js',
  './shared-excel.js',
  './shared-nav.js',
  './shared-shell.js',
  './vendor/quill/quill.js',
  './vendor/quill/quill.snow.css',
  './vendor/howler/howler.min.js',
  './audio/klik.wav',
  './manifest.webmanifest',
  './icons/icon.png',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

function isLocalHostname(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

async function disableForLocalDevelopment() {
  const keys = await caches.keys();
  await Promise.all(keys.map(key => caches.delete(key)));
  await self.registration.unregister();
}

function isCacheableResponse(response) {
  return response && response.ok && response.type !== 'opaque';
}

function shouldUseNetworkFirst(request, url) {
  if (request.mode === 'navigate') {
    return true;
  }

  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'document') {
    return true;
  }

  return (
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.webmanifest')
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (isCacheableResponse(response)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('install', event => {
  if (isLocalHostname(self.location.hostname)) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  // skipWaiting immediately so the new SW activates without waiting for all tabs to close
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  if (isLocalHostname(self.location.hostname)) {
    event.waitUntil(disableForLocalDevelopment());
    return;
  }
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname === '/api' || url.pathname === '/healthz') {
    return;
  }

  event.respondWith(
    shouldUseNetworkFirst(request, url)
      ? networkFirst(request)
      : cacheFirst(request)
  );
});
