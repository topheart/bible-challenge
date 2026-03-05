// Service Worker: Safe Mode (v45)
const VERSION = 'wave2-v45-cache-restored';
const CACHE_NAME = `bc-safe-$VERSION`;

const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './css/themes.css',
  './leaderboard-config.js',
  './data/achievement-sprite.svg',
  './data/external-verses-old.json',
  './data/external-verses-new.json',
  './equip-course-growth.json',  
  './js/core/utils.js',
  './js/core/bootstrap.js',
  './js/core/sw-register.js',
  './js/core/error-logger.js',
  './js/core/data-loader.js',
  './js/core/startup.js',
  './js/core/audio.js',
  './js/core/security.js',
  './js/modules/achievements.js',
  './js/modules/leaderboard.js',
  './js/game/state.js',
  './js/game/metrics.js',
  './js/game/timer.js',
  './js/game/score.js',
  './js/game/engine.js',
  './js/game/modes/equip.js',
  './js/game/modes/survival.js',
  './js/ui/modal-manager.js',
  './js/ui/achievement-ui.js',
  './js/ui/settings-ui.js',
  './js/ui/start-screen.js',
  './js/ui/cute-hints.js',
  './js/ui/book-selection.js',
  './js/ui/settlement-ui.js',
  './js/ui/leaderboard-ui.js',
  './js/ui/intro-animation.js',
  './js/utils/idb-helper.js',
  './logo/logo1-light.png',
  './logo/logo1-dark.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 靜默載入，單個失敗不影響整體。
      return Promise.all(LOCAL_ASSETS.map(url => cache.add(url).catch(()=>{})));
    })
  );
  // 我們不再強制執行 skipWaiting()，改為安靜等待
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. 放行外部網域 (CDN)
  if (url.origin !== self.location.origin) return;

  // 2. 放行非 GET 請求
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((netRes) => {
        if (netRes && netRes.status === 200 && netRes.type === 'basic') {
          const clone = netRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return netRes;
      }).catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
        return new Response('<html><body style="background:#000;color:#fff;"><h1>Offline</h1></body></html>', { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((netRes) => {
        if (!netRes || netRes.status !== 200 || netRes.type !== 'basic') return netRes;
        
        // 🚨 不快取超過 1MB 的超大 JSON (例如 external-verses.json)，避免 LINE/iOS WebView 寫入快取時爆記憶體閃退
        if (url.pathname.includes('external-verses.json')) {
            return netRes;
        }

        const resClone = netRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return netRes;
      }).catch(() => {
        if (url.pathname.endsWith('.json')) {
            return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
        }
      });
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