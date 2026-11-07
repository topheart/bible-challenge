// IndexedDB Helper for storing large verse data
const IDB_CONFIG = { name: 'BibleChallengeDB_v2', version: 1, store: 'verses' };

const ua = navigator.userAgent || navigator.vendor || window.opera;
const isWebView = /Line|FBAN|FBAV|Instagram/i.test(ua);

const IDBHelper = {
    open: () => new Promise((resolve, reject) => {
        if (isWebView) return reject(new Error('IDB disabled in WebView to prevent Jetsam OOM crashes.'));
        const req = indexedDB.open(IDB_CONFIG.name, IDB_CONFIG.version);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_CONFIG.store)) {
                db.createObjectStore(IDB_CONFIG.store);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }),
    get: async (key) => {
        const db = await IDBHelper.open();
        try {
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(IDB_CONFIG.store, 'readonly');
                const req = tx.objectStore(IDB_CONFIG.store).get(key);
                tx.oncomplete = () => resolve(req.result);
                tx.onerror = tx.onabort = () => reject(tx.error || req.error || new Error('IndexedDB read failed'));
            });
        } finally {
            db.close();
        }
    },
    set: async (key, val) => {
        const db = await IDBHelper.open();
        try {
            await new Promise((resolve, reject) => {
                const tx = db.transaction(IDB_CONFIG.store, 'readwrite');
                const req = tx.objectStore(IDB_CONFIG.store).put(val, key);
                tx.oncomplete = () => resolve();
                tx.onerror = tx.onabort = () => reject(tx.error || req.error || new Error('IndexedDB write failed'));
            });
        } finally {
            db.close();
        }
    }
};

// 暴露給全域使用
window.IDBHelper = IDBHelper;
