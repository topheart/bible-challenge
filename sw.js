// Service Worker (Wave1 refactor): split caches + version broadcast
// Cache layers
const VERSION = 'wave1-v7';
const CACHE_CORE  = `bc-core-${VERSION}`;      // app shell & html
const CACHE_DATA  = `bc-data-${VERSION}`;      // json verse/equip data
const CACHE_MEDIA = `bc-media-${VERSION}`;     // images / logos
const CORE_ASSETS = [
  './',
  './index.html',
  './bible-challenge.html',
  './manifest.webmanifest',
  './logo/logo1-light.png',
  './logo/logo2-light.png',
  './logo/logo1-dark.png',
  './logo/logo2-dark.png',
  './logo/word1-light.png',
  './logo/word2-light.png',
  './logo/word1-dark.png',
  './logo/word2-dark.png',
  './logo/logo0-light.png',
  './logo/logo0-dark.png'
];

let bc; // BroadcastChannel for version signaling
try { bc = new BroadcastChannel('bc-sw-version'); } catch(_) { bc = null; }

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Core shell
      await caches.open(CACHE_CORE).then((cache) => cache.addAll(CORE_ASSETS));
      // Data prefetch (best-effort)
      try {
        const dataCache = await caches.open(CACHE_DATA);
        await Promise.all([
          dataCache.add('./external-verses.json'),
          dataCache.add('./equip-course-growth.json')
        ]);
      } catch (_) {}
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const valid = new Set([CACHE_CORE, CACHE_DATA, CACHE_MEDIA]);
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (!valid.has(k) ? caches.delete(k) : null)));
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch(_) {}
    }
    await self.clients.claim();
    if (bc) bc.postMessage({ type:'sw-version', version: VERSION, time: Date.now() });
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // GET-only guard (S5)
  const url = new URL(req.url);
  // Allowlist selected cross-origin assets for caching (Google Fonts, jsDelivr Supabase UMD)
  const isGoogleFonts = url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com');
  const isJsDelivrSupabase = /cdn\.jsdelivr\.net$/.test(url.hostname) && /@supabase\/supabase-js/.test(url.pathname);
  // If cross-origin and not allowlisted, ignore
  if (url.origin !== self.location.origin && !(isGoogleFonts || isJsDelivrSupabase)) return;

  if (isGoogleFonts || isJsDelivrSupabase) {
    event.respondWith((async () => {
      // Strategy: cache-first for font files and UMD; SWR for stylesheets
      const cacheName = isGoogleFonts ? CACHE_MEDIA : CACHE_CORE;
      const cache = await caches.open(cacheName);
      const cached = await cache.match(req);
      if (cached) {
        // Revalidate in background for stylesheets (fonts.googleapis.com)
        if (isGoogleFonts && url.hostname === 'fonts.googleapis.com') {
          fetch(req).then(res => cache.put(req, res.clone())).catch(()=>{});
        }
        return cached;
      }
      try {
        const res = await fetch(req, { mode: 'cors' });
        cache.put(req, res.clone()).catch(()=>{});
        return res;
      } catch (_) {
        return cached || Response.error();
      }
    })());
    return;
  }

  // HTML navigations: network-first + cache write-through
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith((async () => {
      try {
        const preloaded = 'preloadResponse' in event ? await event.preloadResponse : null;
        const netRes = preloaded || await fetch(req);
        caches.open(CACHE_CORE).then((c)=> c.put(req, netRes.clone()));
        return netRes;
      } catch(e){
        const cached = await caches.match(req) || await caches.match('./bible-challenge.html') || await caches.match('./index.html');
        if (cached) return cached;
        return new Response('<!doctype html><title>Offline</title><meta charset="utf-8"><h1>離線中</h1><p>請稍後再試。</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  // Images: cache-first in MEDIA cache
  if (req.destination === 'image') {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        caches.open(CACHE_MEDIA).then((c)=> c.put(req, res.clone()));
        return res;
      } catch(e){ return cached || Response.error(); }
    })());
    return;
  }

  // Verse data JSON: stale-while-revalidate in DATA cache
  if (url.pathname.endsWith('external-verses.json') || url.pathname.endsWith('equip-course-growth.json')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_DATA);
      const cached = await cache.match(req);
      const netPromise = fetch(req).then(res => { cache.put(req, res.clone()).catch(()=>{}); return res; }).catch(()=>null);
      if (cached) { netPromise.catch(()=>{}); return cached; }
      const netRes = await netPromise;
      if (netRes) return netRes;
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    })());
    return;
  }
});

