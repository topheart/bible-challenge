// Service worker registration bootstrap (externalized from index.html)
(function(){
    if (!('serviceWorker' in navigator)) return;
    const RELOAD_GUARD_KEY = 'bc.sw.controllerchange.reloaded';
    const RELOAD_TS_KEY = 'bc.sw.controllerchange.ts';
    const UNCONTROLLED_RELOAD_COUNT_KEY = 'bc.sw.uncontrolled.reload.count';
    const RELOAD_COOLDOWN_MS = 12000;
    const UNCONTROLLED_RELOAD_COOLDOWN_MS = 3500;
    const MAX_UNCONTROLLED_RELOADS = 2;
    const UPDATE_THROTTLE_MS = 30000;
    let lastUpdateCheckTs = 0;

    function safeSessionGet(key){
        try { return sessionStorage.getItem(key); } catch(_) { return null; }
    }
    function safeSessionSet(key, value){
        try { sessionStorage.setItem(key, value); } catch(_) {}
    }

    function maybeReloadOnControllerChange(){
        try {
            const alreadyReloaded = safeSessionGet(RELOAD_GUARD_KEY) === '1';
            if (alreadyReloaded) return;
            const prevTs = Number(safeSessionGet(RELOAD_TS_KEY) || '0');
            if (Number.isFinite(prevTs) && prevTs > 0 && (Date.now() - prevTs) < RELOAD_COOLDOWN_MS) return;

            safeSessionSet(RELOAD_GUARD_KEY, '1');
            safeSessionSet(RELOAD_TS_KEY, String(Date.now()));
            window.location.reload();
        } catch(_) {}
    }

    function tryActivateWaitingWorker(registration){
        try {
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        } catch(_) {}
    }

    function wireUpdateFound(registration){
        try {
            if (!registration) return;
            registration.addEventListener('updatefound', () => {
                try {
                    const installing = registration.installing;
                    if (!installing) return;
                    installing.addEventListener('statechange', () => {
                        try {
                            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                                tryActivateWaitingWorker(registration);
                            }
                        } catch(_) {}
                    });
                } catch(_) {}
            });
        } catch(_) {}
    }

    function throttledUpdate(registration){
        try {
            if (!registration) return;
            const now = Date.now();
            if (now - lastUpdateCheckTs < UPDATE_THROTTLE_MS) return;
            lastUpdateCheckTs = now;
            registration.update().catch(()=>{});
        } catch(_) {}
    }

    function ensureControllerOnFirstLoad(){
        try {
            if (navigator.serviceWorker.controller) return;
            navigator.serviceWorker.ready.then(() => {
                try {
                    if (navigator.serviceWorker.controller) return;
                    const count = Number(safeSessionGet(UNCONTROLLED_RELOAD_COUNT_KEY) || '0');
                    const prevTs = Number(safeSessionGet(RELOAD_TS_KEY) || '0');
                    const inCooldown = Number.isFinite(prevTs) && prevTs > 0 && (Date.now() - prevTs) < UNCONTROLLED_RELOAD_COOLDOWN_MS;
                    if (count >= MAX_UNCONTROLLED_RELOADS || inCooldown) return;

                    safeSessionSet(UNCONTROLLED_RELOAD_COUNT_KEY, String(count + 1));
                    safeSessionSet(RELOAD_TS_KEY, String(Date.now()));
                    window.location.reload();
                } catch(_) {}
            }).catch(()=>{});
        } catch(_) {}
    }

    try {
        navigator.serviceWorker.getRegistrations().then(() => {}).catch(() => {});
    } catch(_) {}

    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then((registration) => {
            navigator.serviceWorker.addEventListener('controllerchange', maybeReloadOnControllerChange);
            wireUpdateFound(registration);
            tryActivateWaitingWorker(registration);
            ensureControllerOnFirstLoad();

            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type:'ping-version' });
            }

            throttledUpdate(registration);
            document.addEventListener('visibilitychange', () => {
                try { if (document.visibilityState === 'visible') throttledUpdate(registration); } catch(_) {}
            });
            window.addEventListener('focus', () => { try { throttledUpdate(registration); } catch(_) {} });
            window.addEventListener('online', () => { try { throttledUpdate(registration); } catch(_) {} });
        }).catch(function(_){});
    });
})();
