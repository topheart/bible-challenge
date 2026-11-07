// Service Worker: Safe Mode
const VERSION = 'v79-deer-achievement';
const CACHE_PREFIX = `bc-safe-${encodeURIComponent(new URL(self.registration.scope).pathname)}-`;
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const TAILWIND_URL = 'https://cdn.tailwindcss.com/';

const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css?v=4',
  './css/modals.css?v=1',
  './css/achievements.css?v=1',
  './css/leaderboard.css?v=1',
  './css/themes.css?v=2',
  './leaderboard-config.js',
  './data/achievement-sprite.svg',
  './equip-course-growth.json',  
  './js/core/utils.js?v=69',
  './js/core/bootstrap.js?v=75',
  './js/core/sw-register.js?v=44',
  './js/core/error-logger.js',
  './js/core/verse-manifest.js?v=64',
  './js/core/verse-integrity.js?v=64',
  './js/core/data-loader.js?v=64',
  './js/core/startup.js?v=68',
  './js/core/audio.js',
  './js/core/security.js',
  './js/core/events.js',
  './js/modules/achievements.js?v=79',
  './js/modules/leaderboard.js?v=71',
  './js/modules/diagnostics.js',
  './js/game/state.js?v=57',
  './js/game/metrics.js?v=68',
  './js/game/timer.js',
  './js/game/score.js?v=56',
  './js/game/engine.js?v=73',
  './js/game/modes/equip.js?v=76',
  './js/game/modes/survival.js?v=78',
  './js/ui/modal-manager.js',
  './js/ui/achievement-ui.js',
  './js/ui/settings-ui.js?v=72',
  './js/ui/start-screen.js?v=72',
  './js/ui/cute-hints.js',
  './js/ui/book-selection.js?v=68',
  './js/ui/board-ui.js?v=59',
  './js/ui/game-ui-binder.js?v=55',
  './js/ui/settlement-ui.js?v=67',
  './js/ui/leaderboard-ui.js?v=74',
  './js/ui/intro-animation.js',
  './js/utils/idb-helper.js',
  './logo/logo1-light.png',
  './logo/logo1-dark.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all([
        ...LOCAL_ASSETS.map(url => cache.add(url).catch(error => {
          console.warn('[SW] Precache failed:', url, error);
          throw error;
        })),
        fetch(new Request(TAILWIND_URL, { mode: 'no-cors' }))
          .then(response => {
            if (response.ok || response.type === 'opaque') return cache.put(TAILWIND_URL, response);
            throw new Error(`Tailwind HTTP ${response.status}`);
          })
          .catch(error => console.warn('[SW] Tailwind precache failed:', error))
      ]);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => {
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isExternalVerseShard = /\/data\/external-verses(?:-[^/]+)?\.json$/i.test(url.pathname);

  // 1. 放行非 GET 請求
  if (req.method !== 'GET') return;

  if (url.origin !== self.location.origin) {
    if (url.href !== TAILWIND_URL) return;
    event.respondWith(fetch(req).then(async response => {
      if (response.ok || response.type === 'opaque') {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(TAILWIND_URL, response.clone());
        } catch (error) {
          console.warn('[SW] Tailwind cache update failed:', error);
        }
      }
      return response;
    }).catch(async error => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(TAILWIND_URL);
      if (cached) return cached;
      console.warn('[SW] Tailwind unavailable offline:', error);
      return new Response('', { status: 504, statusText: 'Offline' });
    }));
    return;
  }

  // 🔥 2. 改為「網路優先」(Network-First) 策略，徹底解決「快取導致比對有問題、更新不可見」的情況！
  event.respondWith(
    fetch(req).then(async (netRes) => {
      if (netRes && netRes.status >= 500) {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(req);
          if (cached) return cached;
          if (req.mode === 'navigate') {
            const fallback = await cache.match('./index.html');
            if (fallback) return fallback;
          }
        } catch (error) {
          console.warn('[SW] Server error cache fallback failed:', error);
        }
        return netRes;
      }
      // 網路請求成功 (有新版資料)：直接回傳最新資料，同時自動更新到快取裡
      if (netRes && netRes.status === 200 && netRes.type === 'basic') {
        const clone = netRes.clone();
        
        // 🚨 不快取超過 1MB 的超大 JSON (保護記憶體)
        if (!isExternalVerseShard) {
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(()=>{});
        }
      }
      return netRes;
    }).catch(async () => {
      // 網路請求失敗 (例如離線或伺服器錯誤)：才從快取挖出舊版資料
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      
      // 連快取都沒有：
      if (req.mode === 'navigate') {
          const fallback = await cache.match('./index.html');
          if (fallback) return fallback;
          return new Response('<html><body style="background:#000;color:#fff;"><h1>Offline</h1></body></html>', { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
      }

      return new Response('', { status: 504, statusText: 'Offline' });
    })
  );
});

self.addEventListener('message', (ev) => {
  // 從 In-App Browser bypass 的邏輯中，我們把 SKIP_WAITING 的強迫性移除
  if (ev.data && ev.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (ev.data && ev.data.type === 'ping-version') {
    ev.source && ev.source.postMessage && ev.source.postMessage({ type: 'pong-version', version: VERSION });
  }
});