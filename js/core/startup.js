
        // 初始化
        document.addEventListener('DOMContentLoaded', function() {
            // Force SW update check only once per session to avoid refresh loops on strict environments
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(r => {
                    // Always try to update on page load to catch hotfixes quickly.
                    // The infinite loop usually happens if 'controllerchange' causes reload without checks.
                    // We remove sessionStorage check here to ensure we always get latest if available.
                    r.update().catch(()=>{});
                });
            }

            try { applyReducedMotionSetting(); } catch(_) {}
            initializeGame();
            // Trigger a non-blocking load of leaderboard (online adapter may resolve later)
            try {
                // Lazy: defer leaderboard preview paint to avoid competing with first render
                const lazyLoadLeaderboard = () => {
                    try {
                        const r = loadLeaderboard();
                        if (r && typeof r.then === 'function') {
                            r.then(()=>updateLeaderboardDisplay('classic'));
                        } else {
                            updateLeaderboardDisplay('classic');
                        }
                    } catch(_) {}
                };
                if (window.requestIdleCallback) {
                    requestIdleCallback(()=> lazyLoadLeaderboard(), { timeout: 1500 });
                } else {
                    setTimeout(lazyLoadLeaderboard, 550); // slight delay after initial layout
                }
            } catch(_){ }
            // Defer verse marquee initialization (visual sugar) until idle / after a small delay
            const initMarquee = () => { try { initializeVerseMarquee(); } catch(_) {} };
            if (window.requestIdleCallback) {
                requestIdleCallback(()=> initMarquee(), { timeout: 2000 });
            } else {
                setTimeout(initMarquee, 800);
            }
            // 啟動起始遮罩：
            //  - 至少顯示 2 秒，之後使用者可透過任意點擊或任意按鍵跳過
            //  - 未跳過則自動繼續，最長顯示 5 秒
            //  - 同步顯示素材（logo/word/brand/version）；不再等待題庫載入
            try {
                const APP_VERSION = 'v0.9.6';
                const overlay = document.getElementById('startupOverlay');
                const ver = document.getElementById('startupVersion');
                const logoEl = document.getElementById('startupLogo');
                const wordEl = document.getElementById('startupWord');
                const brandEl = document.getElementById('startupBrand');
                const loadingEl = document.getElementById('startupLoadingText');
                const menuBrand = document.getElementById('menuBrandCorner');
                if (overlay) {
                    if (ver) ver.textContent = APP_VERSION;
                    // 隨機挑選四種版本：
                    // 1) 暗底 + logo1-light / word1-light
                    // 2) 暗底 + logo2-light / word2-light
                    // 3) 亮底 + logo1-dark  / word1-dark
                    // 4) 亮底 + logo2-dark  / word2-dark
                    try {
                        const isDark = (window.__startupIsDark === true);
                        const logoSrc = window.__startupLogoSrc;
                        const wordSrc = window.__startupWordSrc;
                        const brandSrc = window.__startupBrandSrc;
                        // 切換主題 class
                        overlay.classList.remove('theme-light','theme-dark');
                        overlay.classList.add(isDark ? 'theme-dark' : 'theme-light');
                        // 先指定 src，但暫停動畫，待 decode 完成後一次性播放
                        if (logoEl && logoSrc) logoEl.src = logoSrc;
                        if (wordEl && wordSrc) {
                            wordEl.src = wordSrc;
                            const isWord2 = /word2-(light|dark)\.png$/i.test(wordSrc);
                            wordEl.classList.toggle('variant-word2', !!isWord2);
                        }
                        if (brandEl && brandSrc) brandEl.src = brandSrc;
                        // 同步主選單右下角品牌圖（跟隨片頭主題 light/dark）
                        if (menuBrand) {
                            try { menuBrand.src = brandSrc || 'logo/logo.png'; } catch(_) {}
                        }
                        // Loading 文字固定英文
                        if (loadingEl) loadingEl.textContent = 'Loading...';
                        // 依主題微調 Loading/版本的可讀性
                        if (isDark) {
                            if (ver) ver.style.color = 'rgba(255,255,255,0.9)';
                            if (loadingEl) loadingEl.style.color = 'rgba(255,255,255,0.96)';
                        } else {
                            if (ver) ver.style.color = 'rgba(17,24,39,0.9)';
                            if (loadingEl) loadingEl.style.color = 'rgba(31,41,55,0.95)';
                        }
                    } catch (_) {}
                    const start = Date.now();
                    const minWait = 2000; // ms
                    const maxWait = 5000; // ms

                    const waitMin = new Promise(resolve => setTimeout(resolve, minWait));
                    // 等待圖片 decode 完成（若失敗則不阻塞）
                    const decodeOrReady = (img) => {
                        try {
                            if (!img) return Promise.resolve();
                            // 若已完成或尚未載入，decode() 會在支援時等待像素就緒
                            return (typeof img.decode === 'function') ? img.decode().catch(()=>{}) : Promise.resolve();
                        } catch(_) { return Promise.resolve(); }
                    };
                    // 等圖片 decode 完成；若超過 1.5s 仍未完成則不再等待（避免過久）
                    const waitImages = new Promise(resolve => {
                        let done = false;
                        const finish = () => { if (done) return; done = true; resolve(); };
                        Promise.all([
                            decodeOrReady(logoEl), decodeOrReady(wordEl), decodeOrReady(brandEl)
                        ]).then(finish).catch(finish);
                        setTimeout(finish, 1500);
                    }).then(()=>{
                        try { overlay.classList.add('assets-ready'); } catch(_) {}
                    });
                    // 跳過控制：2 秒後允許任意點擊或按鍵跳過；5 秒自動結束
                    let done = false;
                    const maybeFinish = () => {
                        if (done) return; done = true;
                        try {
                            overlay.style.opacity = '0';
                            // 片頭開始淡出時就通知主選單可以預先啟動卡片浮現（避免空白落差）
                            try { window.dispatchEvent(new Event('startup-intro-fadeout')); } catch(_) {}
                            const finalize = () => {
                                overlay.style.display = 'none';
                                try { window.dispatchEvent(new Event('startup-intro-finished')); } catch(_) {}
                            };
                            overlay.addEventListener('transitionend', finalize, { once: true });
                            setTimeout(finalize, 1100);
                        } catch(_) {}
                    };
                    // 在 2 秒時：同一個位置先淡出 Loading...，待完全消失（transitionend）後，再換字為 Completed 並淡入
                    try {
                        setTimeout(() => {
                            try {
                                if (!loadingEl) return;
                                // 停止可能仍在作用的 CSS 動畫，避免覆蓋 opacity 導致無法過渡
                                try {
                                    loadingEl.style.animationPlayState = 'paused';
                                    loadingEl.style.animation = 'none';
                                } catch(_) {}
                                // 若目前不透明度非 1，先設為 1 以確保有可見狀態可供淡出
                                try {
                                    const cur = parseFloat(getComputedStyle(loadingEl).opacity || '1');
                                    if (cur < 0.99) {
                                        loadingEl.style.opacity = '1';
                                        // 強制重排，確保狀態生效
                                        void loadingEl.offsetWidth;
                                    }
                                } catch(_) {}
                                let swapped = false;
                                const onFadeOutEnd = (ev) => {
                                    if (swapped) return;
                                    // 僅關心 opacity 的 transition 結束
                                    if (ev && ev.propertyName && ev.propertyName !== 'opacity') return;
                                    swapped = true;
                                    try { loadingEl.removeEventListener('transitionend', onFadeOutEnd); } catch(_) {}
                                    try {
                                        // 完全透明後再換字，確保沒有重疊
                                        loadingEl.textContent = 'Completed';
                                        const dark = (window.__startupIsDark === true);
                                        loadingEl.style.color = dark ? 'rgba(255,255,255,0.96)' : 'rgba(31,41,55,0.95)';
                                        // 先確保從 0 開始，然後以 transition 淡入到 1
                                        loadingEl.style.transition = 'opacity .45s ease';
                                        loadingEl.style.opacity = '0';
                                        // 強制重排再進入下一幀以啟動過渡
                                        void loadingEl.offsetWidth;
                                        requestAnimationFrame(() => { try { loadingEl.style.opacity = '1'; } catch(_) {} });
                                    } catch(_) {}
                                };
                                // 準備淡出 Loading...
                                loadingEl.style.transition = 'opacity .45s ease';
                                loadingEl.classList.remove('loading-shimmer');
                                try { loadingEl.addEventListener('transitionend', onFadeOutEnd, { once: true }); } catch(_) {}
                                // 先重排一次，確保 transition 設定被採用
                                void loadingEl.offsetWidth;
                                // 進入下一幀再將不透明度調至 0，觸發淡出
                                requestAnimationFrame(() => { try { loadingEl.style.opacity = '0'; } catch(_) {} });
                                // 保險機制：若 transitionend 未觸發，500ms 後強制進入下一步
                                setTimeout(onFadeOutEnd, 520);
                            } catch(_) {}
                        }, 2000);
                    } catch(_) {}

                    // 啟用跳過的事件（延後 2 秒才生效）
                    waitMin.then(() => {
                        const onSkip = () => { try { window.removeEventListener('pointerdown', onSkip, true); window.removeEventListener('keydown', onSkip, true); } catch(_) {} maybeFinish(); };
                        window.addEventListener('pointerdown', onSkip, true);
                        window.addEventListener('keydown', onSkip, true);
                        // 5 秒自動收尾（相對於開始時間）
                        const elapsed = Date.now() - start;
                        const remain = Math.max(0, maxWait - elapsed);
                        setTimeout(maybeFinish, remain);
                    });
                    // 若圖片更早就緒，先行顯示素材動畫；不阻塞跳過時序
                    Promise.all([waitImages]).catch(()=>{});
                }
            } catch (e) { /* ignore overlay init errors */ }
        });
