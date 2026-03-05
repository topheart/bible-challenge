// Service Worker: Safe Mode (v19)
// 核心策略：
// 1. 只快取我們明確列出的本地檔案 (Local Assets)。
// 2. 對於任何外部 CDN (Tailwind, Fonts, Supabase)，一律採取 "Network Only" (直接連網)，絕不攔截或快取。
//    這能徹底解決 Tailwind CDN 被錯誤快取導致介面崩壞 (Naked UI) 的問題。

const VERSION = 'wave2-v40-inapp-bypass';
const CACHE_NAME = `bc-safe-${VERSION}`;

// 僅列出絕對必要的本地檔案
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
  './equip-course-growth.json',  // 裝備模式設定 (Critical for Offline)
  
  // JS Core
  './js/core/utils.js',
  './js/core/bootstrap.js',
  './js/core/sw-register.js',
  './js/core/error-logger.js',
  './js/core/data-loader.js',
  './js/core/startup.js',
  './js/core/audio.js',
  './js/core/security.js',
  
  // JS Modules
  './js/modules/achievements.js',
  './js/modules/leaderboard.js',
  
  // JS Game
  './js/game/state.js',
  './js/game/metrics.js',
  './js/game/timer.js',
  './js/game/score.js',
  './js/game/engine.js',
  './js/game/modes/equip.js',
  './js/game/modes/survival.js',
  
  // JS UI
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

  // Images (Logos) - WebP Modernization
  './logo/logo1-light.png', // Manifest/HTML
  './logo/logo2-light.png', // Manifest
  './logo/logo1-dark.png',  // OG Image
  
  // WebP versions for App UI
  './logo/logo1-light.webp',
  './logo/logo2-light.webp',
  './logo/logo1-dark.webp',
  './logo/logo2-dark.webp',
  './logo/word1-light.webp',
  './logo/word2-light.webp',
  './logo/word1-dark.webp',
  './logo/word2-dark.webp',
  './logo/logo0-light.webp',
  './logo/logo0-dark.webp'
];

// Install: 預先載入本地檔案
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 嘗試載入所有檔案，若單一檔案失敗不應導致整體安裝失敗 (使用 map + catch)
      return Promise.all(LOCAL_ASSETS.map(url => {
        return cache.add(url).catch(err => {
          console.warn('[SW] Failed to cache local asset:', url, err);
        });
      }));
    }).then(() => self.skipWaiting())
  );
});

// Activate: 清除舊版所有快取 (暴力清除，確保乾淨)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: 極簡攔截策略
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. 如果是外部網域 (cdn.tailwindcss.com, fonts, supabase...) -> 直接放行，不快取
  if (url.origin !== self.location.origin) {
    return; // 瀏覽器會直接走網路，不經過 SW 邏輯
  }

  // 2. 如果是 API 請求或非 GET -> 直接放行
  if (req.method !== 'GET') return;

  // 2.5 導航請求採用 Network First：優先拿最新 HTML，失敗才回退快取
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((netRes) => {
        try {
          if (netRes && netRes.status === 200 && netRes.type === 'basic') {
            const clone = netRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
        } catch(_) {}
        return netRes;
      }).catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
        return new Response('<!doctype html><html><body style="background:#0f172a;color:white;display:flex;justify-content:center;align-items:center;height:100vh;"><div><h1>離線模式</h1><p>請檢查網路連線</p></div></body></html>', { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
      })
    );
    return;
  }

  // 3. 本地檔案策略：先找快取，找不到再聯網 (Cache First, falling back to Network)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((netRes) => {
        // 只有在成功取得回應且是有效回應時才快取
        if (!netRes || netRes.status !== 200 || netRes.type !== 'basic') {
          return netRes;
        }
        // 動態將漏網之魚加入快取 (僅限本地檔案)
        const resClone = netRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return netRes;
      }).catch(() => {
        // 離線且無快取時的處理 (可選：回傳一個簡易離線頁面，目前先略過保持簡單)
        // 針對 JSON 請求回傳空陣列避免報錯
        if (url.pathname.endsWith('.json')) {
            return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
        }
        // 針對 HTML 請求回傳簡易離線訊息
        if (req.mode === 'navigate') {
            return new Response('<!doctype html><html><body style="background:#0f172a;color:white;display:flex;justify-content:center;align-items:center;height:100vh;"><h1>離線模式</h1><p>請檢查網路連線</p></body></html>', { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
        }
      });
    })
  );
});

// 監聽版本查詢 (用於前端確認)
self.addEventListener('message', (ev) => {
  if (ev.data && ev.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (ev.data && ev.data.type === 'ping-version') {
    ev.source && ev.source.postMessage && ev.source.postMessage({ type: 'pong-version', version: VERSION });
  }
});

