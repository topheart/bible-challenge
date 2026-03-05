// Service worker registration bootstrap (externalized from index.html)
(function(){
    if (!('serviceWorker' in navigator)) return;
    const UPDATE_THROTTLE_MS = 30000;
    let lastUpdateCheckTs = 0;

    function handleControllerChange(){
        // Root-cause fix: never force reload on controller changes.
            // Some mobile WebViews can oscillate controller state and trigger refresh loops.
            document.documentElement.setAttribute('data-sw-controller-changed-at', String(Date.now()));
            window.dispatchEvent(new CustomEvent('bc:sw-controllerchange'));
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
            // Root-cause fix: do not force reload when page is initially uncontrolled.
            // Let SW control begin naturally on next navigation/update without creating refresh loops.
            if (navigator.serviceWorker.controller) return;
            navigator.serviceWorker.ready.then(() => {}).catch(()=>{});
        } catch(_) {}
    }

    try {
        navigator.serviceWorker.getRegistrations().then(() => {}).catch(() => {});
    } catch(_) {}

    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then((registration) => {
            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
            wireUpdateFound(registration);
            tryActivateWaitingWorker(registration);
            ensureControllerOnFirstLoad();

            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type:'ping-version' });
            }

            throttledUpdate(registration);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') throttledUpdate(registration);
            });
            window.addEventListener('focus', () => { throttledUpdate(registration); });
            window.addEventListener('online', () => { throttledUpdate(registration); });
        }).catch(function(_){});
    });
})();
