
        ;(function initEquipPunctMap(){
            if (window.__equipPunctMapInitialized) return;
            window.__equipPunctMapInitialized = true;
            const abbrev = {
                '創世記':'GEN','出埃及記':'EXO','利未記':'LEV','民數記':'NUM','申命記':'DEU','約書亞記':'JOS','士師記':'JDG','路得記':'RUT','撒母耳記上':'1SA','撒母耳記下':'2SA',
                '列王紀上':'1KI','列王紀下':'2KI','歷代志上':'1CH','歷代志下':'2CH','以斯拉記':'EZR','尼希米記':'NEH','以斯帖記':'EST','約伯記':'JOB','詩篇':'PSA','箴言':'PRO','傳道書':'ECC','雅歌':'SNG','以賽亞書':'ISA','耶利米書':'JER','耶利米哀歌':'LAM','以西結書':'EZK','但以理書':'DAN','何西阿書':'HOS','約珥書':'JOL','阿摩司書':'AMO','俄巴底亞書':'OBA','約拿書':'JON','彌迦書':'MIC','那鴻書':'NAM','哈巴谷書':'HAB','西番雅書':'ZEP','哈該書':'HAG','撒迦利亞書':'ZEC','瑪拉基書':'MAL',
                '馬太福音':'MAT','馬可福音':'MRK','路加福音':'LUK','約翰福音':'JHN','使徒行傳':'ACT','羅馬書':'ROM','哥林多前書':'1CO','哥林多後書':'2CO','加拉太書':'GAL','以弗所書':'EPH','腓立比書':'PHP','歌羅西書':'COL','帖撒羅尼迦前書':'1TH','帖撒羅尼迦後書':'2TH','提摩太前書':'1TI','提摩太後書':'2TI','提多書':'TIT','腓利門書':'PHM','希伯來書':'HEB','雅各書':'JAM','彼得前書':'1PE','彼得後書':'2PE','約翰一書':'1JN','約翰二書':'2JN','約翰三書':'3JN','猶大書':'JUD','啟示錄':'REV'
            };
            function addAlias(base, k, v){ if(!base[k]&&v) base[k]=v; }
            function buildAliases(base){
                Object.keys(base).forEach(key=>{
                    const v = base[key];
                    const compact = key.replace(/\s+/g,' ').trim();
                    if (compact!==key) addAlias(base, compact, v);
                    const noSpace = compact.replace(/\s*(\d+:)/,' $1').replace(/\s+/g,'').trim();
                    addAlias(base, noSpace, v);
                    const m = compact.match(/^([^\d]+)\s+(\d+:\d+(?:-\d+)?)$/);
                    if (m){
                        const zhBook = m[1].trim();
                        const ref = m[2];
                        const ab = abbrev[zhBook];
                        if (ab){
                            addAlias(base, `${ab} ${ref}`, v);
                            addAlias(base, `${ab}${ref}`, v);
                        }
                    }
                });
            }
            async function loadEquipPunct(){
                try {
                    const res = await fetch('equip-course-growth.json', { cache:'no-store' });
                    if (!res.ok) throw new Error('equip json load failed');
                    const data = await res.json();
                    const punct = {};
                    ['growth','disciple','leader'].forEach(group=>{
                        if (!Array.isArray(data[group])) return;
                        data[group].forEach(entry=>{
                            if (!entry || !entry.book || !entry.chapter || !Array.isArray(entry.verses)) return;
                            const key = `${entry.book} ${entry.chapter}`.trim();
                            const raw = entry.verses.map(s=>s.trim()).filter(Boolean);
                            let text = (entry.full && entry.full.trim()) || raw.join('，');
                            if (text && !/[。！？!]$/.test(text)) text += '。';
                            punct[key] = text;
                        });
                    });
                    buildAliases(punct);
                    window.__equipPunctMap = punct;
                    window.__equipCourseRaw = data;
                    window.__equipBookAbbrevMap = abbrev;
                    window.dispatchEvent(new CustomEvent('equipPunctReady'));
                } catch(e){
                    console.warn('equip-course json load error', e);
                    window.__equipPunctMap = window.__equipPunctMap || {};
                }
            }
            loadEquipPunct();
        })();

        function withPngFallback(src){
            try {
                if (!src || typeof src !== 'string') return src;
                return src.replace(/\.webp(\?.*)?$/i, '.png$1');
            } catch(_) { return src; }
        }

        function applyImageSrcWithFallback(imgEl, src){
            try {
                if (!imgEl || !src) return;
                const fallback = withPngFallback(src);
                imgEl.onerror = function(){
                    try {
                        if (fallback && imgEl.src && !imgEl.src.includes('.png')) {
                            imgEl.src = fallback;
                        }
                    } catch(_) {}
                };
                imgEl.src = src;
            } catch(_) {}
        }

        // 初始化
        document.addEventListener('DOMContentLoaded', function() {
            try { applyReducedMotionSetting(); } catch(_) {}
            initializeGame();
            // 非關鍵任務改為片頭結束後再排程，避免與首屏互動競爭
            let postStartupScheduled = false;
            const runPostStartupTasks = () => {
                if (postStartupScheduled) return;
                postStartupScheduled = true;

                // Leaderboard preview: lazy and non-blocking
                try {
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
                        requestIdleCallback(()=> lazyLoadLeaderboard(), { timeout: 1800 });
                    } else {
                        setTimeout(lazyLoadLeaderboard, 700);
                    }
                } catch(_) {}

                // Marquee is visual sugar; defer after first interactive moment
                try {
                    const initMarquee = () => { try { initializeVerseMarquee(); } catch(_) {} };
                    if (window.requestIdleCallback) {
                        requestIdleCallback(()=> initMarquee(), { timeout: 2200 });
                    } else {
                        setTimeout(initMarquee, 900);
                    }
                } catch(_) {}
            };

            window.addEventListener('startup-intro-finished', runPostStartupTasks, { once: true });
            // Fallback: in case intro event is skipped/missed
            setTimeout(runPostStartupTasks, 4800);

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
                        if (logoEl && logoSrc) applyImageSrcWithFallback(logoEl, logoSrc);
                        if (wordEl && wordSrc) {
                            applyImageSrcWithFallback(wordEl, wordSrc);
                            const isWord2 = /word2-(light|dark)\.(png|webp)$/i.test(wordSrc);
                            wordEl.classList.toggle('variant-word2', !!isWord2);
                        }
                        if (brandEl && brandSrc) applyImageSrcWithFallback(brandEl, brandSrc);
                        // 同步主選單右下角品牌圖（跟隨片頭主題 light/dark）
                        if (menuBrand) {
                            try { applyImageSrcWithFallback(menuBrand, brandSrc || 'logo/logo.png'); } catch(_) {}
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
                            // 片頭開始淡出時就通知主選單可以預先啟動卡片浮現（避免空白落差）
                            try { window.dispatchEvent(new Event('startup-intro-fadeout')); } catch(_) {}
                            const finalize = () => {
                                overlay.style.display = 'none';
                                try { window.dispatchEvent(new Event('startup-intro-finished')); } catch(_) {}
                            };
                            const fadeMs = 850;
                            let finalized = false;
                            const safeFinalize = () => {
                                if (finalized) return;
                                finalized = true;
                                finalize();
                            };

                            // 優先使用 WAAPI，避免在 reduced-motion 或 transition 被覆蓋時瞬間消失
                            if (typeof overlay.animate === 'function') {
                                try {
                                    const anim = overlay.animate(
                                        [{ opacity: 1 }, { opacity: 0 }],
                                        { duration: fadeMs, easing: 'ease', fill: 'forwards' }
                                    );
                                    anim.onfinish = safeFinalize;
                                    anim.oncancel = safeFinalize;
                                    setTimeout(safeFinalize, fadeMs + 260);
                                } catch(_) {
                                    try { overlay.style.opacity = '0'; } catch(_) {}
                                    overlay.addEventListener('transitionend', safeFinalize, { once: true });
                                    setTimeout(safeFinalize, 1100);
                                }
                            } else {
                                try { overlay.style.opacity = '0'; } catch(_) {}
                                overlay.addEventListener('transitionend', safeFinalize, { once: true });
                                setTimeout(safeFinalize, 1100);
                            }
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
