// =========================================================================
// NUCLEAR SERVICE WORKER KILL-SWITCH (v42)
// =========================================================================
const VERSION = 'wave2-v42-nuclear-wipe';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.map(key => caches.delete(key))))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.map(key => caches.delete(key))))
        .then(() => self.registration.unregister())
    );
});

self.addEventListener('message', (ev) => {
    //  絕對忽略 SKIP_WAITING！
    // 舊版的 sw-register.js 會發送 SKIP_WAITING，如果我們執行了 self.skipWaiting()，
    // 就會立刻觸發舊網頁的 controllerchange，導致舊網頁執行 location.reload() 引發死循環！
    // 這裡我們直接吃掉這個訊息，什麼都不做。
    
    if (ev.data && ev.data.type === 'ping-version') {
        ev.source && ev.source.postMessage && ev.source.postMessage({ type: 'pong-version', version: VERSION });
    }
});
// 無 fetch 攔截器，強制瀏覽器走原生網路邏輯