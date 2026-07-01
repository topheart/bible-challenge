// Service Worker: Safe Mode
const VERSION = 'wave2-v51-webview-guard-sync';
const CACHE_NAME = `bc-safe-${VERSION}`;

const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css?v=3',
  './css/modals.css?v=1',
  './css/achievements.css?v=1',
  './css/leaderboard.css?v=1',
  './css/themes.css?v=2',
  './leaderboard-config.js',
  './data/achievement-sprite.svg',
  './equip-course-growth.json',  
  './js/core/utils.js',
  './js/core/bootstrap.js',
  './js/core/sw-register.js?v=44',
  './js/core/error-logger.js',
  './js/core/data-loader.js?v=44',
  './js/core/startup.js',
  './js/core/audio.js',
  './js/core/security.js',
  './js/core/events.js',
  './js/modules/achievements.js',
  './js/modules/leaderboard.js?v=44',
  './js/modules/diagnostics.js',
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
  './js/ui/start-screen.js?v=44',
  './js/ui/cute-hints.js',
  './js/ui/book-selection.js',
  './js/ui/board-ui.js',
  './js/ui/game-ui-binder.js',
  './js/ui/settlement-ui.js',
  './js/ui/leaderboard-ui.js',
  './js/ui/intro-animation.js',
  './js/utils/idb-helper.js',
  './logo/logo1-light.png',
  './logo/logo1-dark.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // 🔥 1. 強制立即生效，不等待舊版標籤頁關閉
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 靜默載入，單個失敗不影響整體。
      return Promise.all(LOCAL_ASSETS.map(url => cache.add(url).catch(()=>{})));
    })
  );
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
  const isExternalVerseShard = /\/data\/external-verses(?:-[^/]+)?\.json$/i.test(url.pathname);

  // 1. 放行外部網域 (CDN)
  if (url.origin !== self.location.origin) return;

  // 2. 放行非 GET 請求
  if (req.method !== 'GET') return;

  // 🔥 2. 改為「網路優先」(Network-First) 策略，徹底解決「快取導致比對有問題、更新不可見」的情況！
  event.respondWith(
    fetch(req).then((netRes) => {
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
      const cached = await caches.match(req);
      if (cached) return cached;
      
      // 連快取都沒有：
      if (req.mode === 'navigate') {
          const fallback = await caches.match('./index.html');
          if (fallback) return fallback;
          return new Response('<html><body style="background:#000;color:#fff;"><h1>Offline</h1></body></html>', { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
      }

      if (url.pathname.endsWith('.json')) {
          return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
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