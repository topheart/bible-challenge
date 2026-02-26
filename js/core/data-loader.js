
    // 是否啟用外部經文載入（關閉則完全不嘗試抓取 external-verses.json）
    // Enable/disable external verses loading (skip fetching when disabled)
    const ENABLE_EXTERNAL_VERSES = true;
    // 啟動時延後載入大型題庫，改為使用時觸發
    const DEFER_EXTERNAL_VERSES_BOOT = true;
    const ENABLE_VERSE_SHARDS = true;
    const EXTERNAL_FETCH_TIMEOUT_MS = 4500;
    const EXTERNAL_FETCH_TIMEOUT_URGENT_MS = 2600;
    const EXTERNAL_VERSE_FULL_PATH = 'external-verses.json';
    const EXTERNAL_VERSE_SHARDS = {
        old: 'data/external-verses-old.json',
        new: 'data/external-verses-new.json'
    };
    const NEW_TESTAMENT_BOOKS = new Set([
        '馬太福音','馬可福音','路加福音','約翰福音','使徒行傳','羅馬書',
        '哥林多前書','哥林多後書','加拉太書','以弗所書','腓立比書','歌羅西書',
        '帖撒羅尼迦前書','帖撒羅尼迦後書','提摩太前書','提摩太後書','提多書',
        '腓利門書','希伯來書','雅各書','彼得前書','彼得後書','約翰一書',
        '約翰二書','約翰三書','猶大書','啟示錄'
    ]);

    // IndexedDB Helper 已移至 js/utils/idb-helper.js
    // IDBHelper logic moved to external script

    function scheduleIdleTask(fn, timeout = 1200) {
        try {
            if (window.requestIdleCallback) {
                return window.requestIdleCallback(() => { try { fn(); } catch(_) {} }, { timeout });
            }
        } catch(_) {}
        return setTimeout(() => { try { fn(); } catch(_) {} }, 0);
    }

    async function normalizeVerseDatabaseChunked(db, chunkSize = 320) {
        const out = [];
        const seen = new Set();
        const defaultVersion = '新標點和合本 神版';
        if (!Array.isArray(db)) return out;

        for (let i = 0; i < db.length; i++) {
            const raw = db[i];
            const v = raw || {};

            try { v.book = normalizeBookName(v.book); } catch (_) {}
            try { if (typeof v.chapter === 'number') v.chapter = String(v.chapter); } catch(_){}
            try { if (typeof v.verse === 'string') v.verse = sanitizeVerseText(v.verse); } catch(_){}
            if (!isValidVerseRecord(v)) continue;
            try { if (isWeakTopicalVerse(v.verse)) continue; } catch(_) {}

            const key = `${v.book}|${v.chapter}|${v.verse}|${v.version||''}`;
            if (seen.has(key)) continue;
            seen.add(key);

            try { if (!v.version) v.version = defaultVersion; } catch(_) {}
            try {
                const rawR = (v && v.rarity != null) ? String(v.rarity).trim().toLowerCase() : '';
                if (rawR) {
                    const map = {
                        '常見': 'common', '中等': 'common', '少見': 'uncommon', '冷門': 'rare', '全部': 'all',
                        'common': 'common', 'medium': 'common', 'uncommon': 'uncommon', 'rare': 'rare', 'all': 'all'
                    };
                    v.rarity = map[rawR] || classifyRarity(v);
                } else {
                    v.rarity = classifyRarity(v);
                }
            } catch(_) {}

            out.push(v);

            if ((i + 1) % chunkSize === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        return out;
    }

    function warmNormalizeAndIndex(rawData) {
        try {
            if (!Array.isArray(rawData) || rawData.length === 0) return;
            if (window.__normalizedWarmupRunning) return;
            window.__normalizedWarmupRunning = true;
            scheduleIdleTask(async () => {
                try {
                    const norm = await normalizeVerseDatabaseChunked(rawData);
                    window.__normalizedDB = norm;
                    try { buildVerseIndex(norm); } catch(_) {}
                    try {
                        window.dispatchEvent(new CustomEvent('externalVersesIndexed', { detail: { count: norm.length } }));
                    } catch(_) {}
                } catch(_) {
                    // fallback: keep sync path in getActiveVerseDB
                } finally {
                    window.__normalizedWarmupRunning = false;
                }
            }, 1500);
        } catch(_) {}
    }

    let __externalLoadPromise = null;
    let __externalBootLoadScheduled = false;
    let __lastUrgentLoadTs = 0;
    let __lastUrgentForceFull = false;

    function requestUrgentVerseLoad(forceFull = false) {
        try {
            const now = Date.now();
            const recentlyTriggered = (now - __lastUrgentLoadTs) < 450;
            if (recentlyTriggered && (!forceFull || __lastUrgentForceFull)) return;
            __lastUrgentLoadTs = now;
            __lastUrgentForceFull = !!forceFull;
            attemptLoadExternalVerses({ urgent: true, forceFull: !!forceFull });
        } catch(_) {}
    }

    function pickPreferredVerseScope() {
        if (!ENABLE_VERSE_SHARDS) return null;
        try {
            const gs = (typeof window.gameState === 'object' && window.gameState) ? window.gameState : {};
            if (gs && gs.range === 'testament' && (gs.testament === 'old' || gs.testament === 'new')) {
                return gs.testament;
            }
            if (gs && gs.range === 'custom' && Array.isArray(gs.customBooks) && gs.customBooks.length > 0) {
                let hasOld = false;
                let hasNew = false;
                for (const book of gs.customBooks) {
                    if (NEW_TESTAMENT_BOOKS.has(String(book || ''))) hasNew = true;
                    else hasOld = true;
                    if (hasOld && hasNew) break;
                }
                if (hasOld && !hasNew) return 'old';
                if (hasNew && !hasOld) return 'new';
            }
            if (gs && (gs.testament === 'old' || gs.testament === 'new')) return gs.testament;
        } catch(_) {}
        return null;
    }

    function getDesiredVerseScope() {
        if (!ENABLE_VERSE_SHARDS) return 'full';
        const preferred = pickPreferredVerseScope();
        return preferred || 'full';
    }

    async function fetchVerseJson(path, options = {}) {
        try {
            const timeoutMs = Math.max(800, Number(options.timeoutMs) || EXTERNAL_FETCH_TIMEOUT_MS);
            const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            const timer = setTimeout(() => { try { ctrl && ctrl.abort(); } catch(_) {} }, timeoutMs);
            const res = await fetch(path, {
                signal: ctrl ? ctrl.signal : undefined,
                cache: options.cache || 'default'
            });
            clearTimeout(timer);
            if (!res || !res.ok) return null;
            const json = await res.json();
            return Array.isArray(json) ? json : null;
        } catch(_) {
            return null;
        }
    }

    function scheduleDeferredExternalLoad() {
        try {
            if (__externalBootLoadScheduled) return;
            if (Array.isArray(window.verseDatabase) && window.verseDatabase.length > 0) return;
            __externalBootLoadScheduled = true;
            scheduleIdleTask(() => {
                try { requestUrgentVerseLoad(false); } catch(_) {}
            }, 900);
        } catch(_) {}
    }

    // 嘗試載入外部經文資料（非同步、可快取），失敗則保留內建資料
    // Load external verses asynchronously with IndexedDB cache; fallback gracefully on errors
    // 嘗試載入外部題庫 JSON，正規化後放入全域 verseDatabase
    // Attempt to load external verse JSON, normalize, and set window.verseDatabase
    async function attemptLoadExternalVerses(options = {}) {
            // 若不啟用外部載入，直接返回
            if (!ENABLE_EXTERNAL_VERSES) return;
            const urgent = !!options.urgent;
            const forceFull = !!options.forceFull;

            // 非急迫情境下採延遲載入，降低首屏負擔
            if (!urgent && DEFER_EXTERNAL_VERSES_BOOT) {
                scheduleDeferredExternalLoad();
                return;
            }

            if (__externalLoadPromise) return __externalLoadPromise;

            __externalLoadPromise = (async () => {
            try {
                window.__externalVersesLoading = true;
                const loadingEvt = new CustomEvent('externalVersesLoading', { detail: { loading: true, urgent, forceFull } });
                window.dispatchEvent(loadingEvt);
            } catch(_) {}
            try {
                const preferredScope = (!forceFull && ENABLE_VERSE_SHARDS) ? pickPreferredVerseScope() : null;
                const idbCandidates = preferredScope ? [`externalVerses:${preferredScope}`, 'externalVerses'] : ['externalVerses'];
                // 1. 嘗試從 IndexedDB 讀取
                // 1. Try reading from IndexedDB
                let data = [];
                let scope = 'full';
                try {
                    for (const key of idbCandidates) {
                        const cached = await IDBHelper.get(key);
                        if (Array.isArray(cached) && cached.length > 0) {
                            data = cached;
                            scope = key === 'externalVerses' ? 'full' : String(key).split(':')[1] || 'full';
                            break;
                        }
                    }
                } catch (e) { console.warn('IDB read failed', e); }

                // 2. 若 IDB 無資料，則從網路抓取
                // 2. If IDB empty, fetch from network
                if (data.length === 0) {
                    const timeoutMs = urgent ? EXTERNAL_FETCH_TIMEOUT_URGENT_MS : EXTERNAL_FETCH_TIMEOUT_MS;
                    const shardPath = (preferredScope && EXTERNAL_VERSE_SHARDS[preferredScope]) ? EXTERNAL_VERSE_SHARDS[preferredScope] : null;
                    const fullFetchPromise = fetchVerseJson(EXTERNAL_VERSE_FULL_PATH, { timeoutMs, cache: urgent ? 'no-store' : 'default' });

                    if (shardPath) {
                        const shardPromise = fetchVerseJson(shardPath, { timeoutMs, cache: urgent ? 'no-store' : 'default' });
                        // 給分片資料短暫優先時間窗，提升「先有可用資料」機率
                        const shardHeadStartMs = urgent ? 700 : 1200;
                        const earlyShard = await Promise.race([
                            shardPromise,
                            new Promise(resolve => setTimeout(() => resolve(null), shardHeadStartMs))
                        ]);
                        const shardData = (Array.isArray(earlyShard) && earlyShard.length > 0) ? earlyShard : await shardPromise;
                        if (Array.isArray(shardData) && shardData.length > 0) {
                            data = shardData;
                            scope = preferredScope;
                            try { IDBHelper.set(`externalVerses:${preferredScope}`, data).catch(e => console.warn('IDB write failed', e)); } catch(_) {}

                            // 分片先上線後，背景補抓 full，供跨約切換與後續快速命中
                            try {
                                fullFetchPromise.then((fullData) => {
                                    if (Array.isArray(fullData) && fullData.length > 0) {
                                        try { IDBHelper.set('externalVerses', fullData).catch(() => {}); } catch(_) {}
                                        try { if (!window.__externalFullVersesReady) window.__externalFullVersesReady = true; } catch(_) {}
                                    }
                                }).catch(() => {});
                            } catch(_) {}
                        }
                    } else if (ENABLE_VERSE_SHARDS && !forceFull) {
                        // 未指定約別時，允許先拿到任一分片快速啟動，再背景補齊 full
                        const oldPromise = fetchVerseJson(EXTERNAL_VERSE_SHARDS.old, { timeoutMs, cache: urgent ? 'no-store' : 'default' });
                        const newPromise = fetchVerseJson(EXTERNAL_VERSE_SHARDS.new, { timeoutMs, cache: urgent ? 'no-store' : 'default' });
                        const tag = (name, p) => p.then(v => ({ name, v })).catch(() => ({ name, v: null }));
                        const firstShardHeadStartMs = urgent ? 650 : 1100;
                        const first = await Promise.race([
                            tag('old', oldPromise),
                            tag('new', newPromise),
                            new Promise(resolve => setTimeout(() => resolve({ name: null, v: null }), firstShardHeadStartMs))
                        ]);

                        if (first && Array.isArray(first.v) && first.v.length > 0 && (first.name === 'old' || first.name === 'new')) {
                            data = first.v;
                            scope = first.name;
                            try { IDBHelper.set(`externalVerses:${scope}`, data).catch(()=>{}); } catch(_) {}
                        }

                        // 背景整併 old/new，補 full 快取（可供後續跨約與完整模式即時命中）
                        try {
                            Promise.all([oldPromise, newPromise]).then(([oldData, newData]) => {
                                if (Array.isArray(oldData) && Array.isArray(newData) && (oldData.length || newData.length)) {
                                    const merged = oldData.concat(newData);
                                    try { IDBHelper.set('externalVerses', merged).catch(() => {}); } catch(_) {}
                                    try { window.__externalFullVersesReady = true; } catch(_) {}
                                }
                            }).catch(() => {});
                        } catch(_) {}
                    }

                    if (data.length === 0) {
                        const fullData = await fullFetchPromise;
                        if (Array.isArray(fullData) && fullData.length > 0) {
                            data = fullData;
                            scope = 'full';
                            try { IDBHelper.set('externalVerses', data).catch(e => console.warn('IDB write failed', e)); } catch(_) {}
                        }
                    }

                    // full 檔案不可用時，回退為 old/new 分檔合併
                    if (data.length === 0 && forceFull && ENABLE_VERSE_SHARDS) {
                        const timeoutMs = urgent ? EXTERNAL_FETCH_TIMEOUT_URGENT_MS : EXTERNAL_FETCH_TIMEOUT_MS;
                        const [oldData, newData] = await Promise.all([
                            fetchVerseJson(EXTERNAL_VERSE_SHARDS.old, { timeoutMs, cache: urgent ? 'no-store' : 'default' }),
                            fetchVerseJson(EXTERNAL_VERSE_SHARDS.new, { timeoutMs, cache: urgent ? 'no-store' : 'default' })
                        ]);
                        if (Array.isArray(oldData) && Array.isArray(newData) && (oldData.length || newData.length)) {
                            data = oldData.concat(newData);
                            scope = 'full';
                            try { IDBHelper.set('externalVerses', data).catch(e => console.warn('IDB write failed', e)); } catch(_) {}
                        }
                    }
                }

                // 若主檔不存在或為空，直接改用內建資料（不再嘗試不存在的備份檔）
                // If missing/empty, keep internal dataset (no further fallbacks)
                if (!Array.isArray(data) || data.length === 0) {
                    data = [];
                }

                if (Array.isArray(data) && data.length > 0) {
                    // 先存原始資料，實際使用時會再經 normalize 與驗證
                    window.verseDatabase = data;
                    window.__verseDatabaseScope = scope;
                    try { window.__externalVersesReady = true; } catch(_) {}
                    try { window.__externalFullVersesReady = scope === 'full'; } catch(_) {}
                    try {
                        const idx = {};
                        data.forEach(v => { if (v.book!=null && v.chapter!=null && v.verse!=null) idx[`${v.book}|${v.chapter}|${v.verse}`] = v; });
                        window.__versesIndex = idx;
                    } catch(_) {}
                    
                    // 正規化與索引改為背景分段處理，降低主執行緒卡頓
                    try { warmNormalizeAndIndex(data); } catch(_) {}
                    try { updateStartButtonState(); } catch(e) {}
                    try {
                        if (!window.__marqueeInitialized && typeof initializeVerseMarquee === 'function') {
                            initializeVerseMarquee();
                        }
                    } catch(_) {}
                    try { refreshVerseMarqueeData(); } catch(e) {}
                    try {
                        const evt = new CustomEvent('externalVersesLoaded', { detail: { hasData: true, source: scope } });
                        window.dispatchEvent(evt);
                    } catch(_) {}

                    // 若先載入分片，背景再補完整題庫，避免後續跨約範圍切換再等待
                    if (scope !== 'full' && !forceFull) {
                        scheduleIdleTask(() => {
                            try {
                                if (!window.__externalFullVersesReady) attemptLoadExternalVerses({ urgent: true, forceFull: true });
                            } catch(_) {}
                        }, urgent ? 900 : 2200);
                    }
                }
            } catch (e) {
                // 記錄失敗，以便 UI 顯示明確提示（例如 file:// 或 CORS/路徑問題）
                // Record error for UI hints (e.g., file:// access or CORS/path issues)
                try { window.__externalVersesReady = false; } catch(_) {}
                try { window.externalVersesLoadError = (e && e.message) ? String(e.message) : 'unknown'; } catch(_) {}
                try { updateStartButtonState(); } catch(_) {}
                try {
                    const evt = new CustomEvent('externalVersesLoaded', { detail: { hasData: false, source: 'error', error: (e && e.message) || 'unknown' } });
                    window.dispatchEvent(evt);
                } catch(_) {}
            } finally {
                try {
                    window.__externalVersesLoading = false;
                    const loadingEvt = new CustomEvent('externalVersesLoading', { detail: { loading: false, urgent, forceFull } });
                    window.dispatchEvent(loadingEvt);
                } catch(_) {}
                __externalLoadPromise = null;
            }
            })();

            return __externalLoadPromise;
        }

        // 聖經書卷數據
        const bibleBooks = {
            old: ['創世記', '出埃及記', '利未記', '民數記', '申命記', '約書亞記', '士師記', '路得記', 
                  '撒母耳記上', '撒母耳記下', '列王紀上', '列王紀下', '歷代志上', '歷代志下', 
                  '以斯拉記', '尼希米記', '以斯帖記', '約伯記', '詩篇', '箴言', '傳道書', '雅歌', 
                  '以賽亞書', '耶利米書', '耶利米哀歌', '以西結書', '但以理書', '何西阿書', 
                  '約珥書', '阿摩司書', '俄巴底亞書', '約拿書', '彌迦書', '那鴻書', '哈巴谷書', 
                  '西番雅書', '哈該書', '撒迦利亞書', '瑪拉基書'],
            new: ['馬太福音', '馬可福音', '路加福音', '約翰福音', '使徒行傳', '羅馬書', 
                  '哥林多前書', '哥林多後書', '加拉太書', '以弗所書', '腓立比書', '歌羅西書', 
                  '帖撒羅尼迦前書', '帖撒羅尼迦後書', '提摩太前書', '提摩太後書', '提多書', 
                  '腓利門書', '希伯來書', '雅各書', '彼得前書', '彼得後書', '約翰一書', 
                  '約翰二書', '約翰三書', '猶大書', '啟示錄']
        };

        // 書卷簡稱對照表
        const bookAbbreviations = {
            '創世記': '創', '出埃及記': '出', '利未記': '利', '民數記': '民', '申命記': '申',
            '約書亞記': '書', '士師記': '士', '路得記': '得', '撒母耳記上': '撒上', '撒母耳記下': '撒下',
            '列王紀上': '王上', '列王紀下': '王下', '歷代志上': '代上', '歷代志下': '代下',
            '以斯拉記': '拉', '尼希米記': '尼', '以斯帖記': '斯', '約伯記': '伯', '詩篇': '詩',
            '箴言': '箴', '傳道書': '傳', '雅歌': '歌', '以賽亞書': '賽', '耶利米書': '耶',
            '耶利米哀歌': '哀', '以西結書': '結', '但以理書': '但', '何西阿書': '何',
            '約珥書': '珥', '阿摩司書': '摩', '俄巴底亞書': '俄', '約拿書': '拿', '彌迦書': '彌',
            '那鴻書': '鴻', '哈巴谷書': '哈', '西番雅書': '番', '哈該書': '該',
            '撒迦利亞書': '亞', '瑪拉基書': '瑪',
            '馬太福音': '太', '馬可福音': '可', '路加福音': '路', '約翰福音': '約',
            '使徒行傳': '徒', '羅馬書': '羅', '哥林多前書': '林前', '哥林多後書': '林後',
            '加拉太書': '加', '以弗所書': '弗', '腓立比書': '腓', '歌羅西書': '西',
            '帖撒羅尼迦前書': '帖前', '帖撒羅尼迦後書': '帖後', '提摩太前書': '提前',
            '提摩太後書': '提後', '提多書': '多', '腓利門書': '門', '希伯來書': '來',
            '雅各書': '雅', '彼得前書': '彼前', '彼得後書': '彼後', '約翰一書': '約一',
            '約翰二書': '約二', '約翰三書': '約三', '猶大書': '猶', '啟示錄': '啟'
        };

        // 將各種可能的書卷名稱（含簡稱）正規化為此程式所使用的「完整中文書名」
        function normalizeBookName(name) {
            try {
                if (!name) return name;
                const raw = String(name).trim();
                // 如果本就為完整中文書名且存在於清單中，直接回傳
                if ([...bibleBooks.old, ...bibleBooks.new].includes(raw)) return raw;

                // 嘗試用簡稱（如「太、林前、彼後、創、詩」）反查完整書名
                for (const [full, abbr] of Object.entries(bookAbbreviations)) {
                    if (raw === abbr) return full;
                }

                // 寬鬆處理：移除空白再比對一次
                const compact = raw.replace(/\s+/g, '');
                for (const [full, abbr] of Object.entries(bookAbbreviations)) {
                    if (compact === abbr) return full;
                    if (compact === full.replace(/\s+/g, '')) return full;
                }

                // 未辨識則回傳原值（後續過濾可能會略過此書名）
                return raw;
            } catch (e) {
                return name;
            }
        }

    // 內建題庫已移除，改用 external-verses.json 作為唯一資料來源

    // 清理經文：移除說明用括號內容與多餚空白（保留原文語句）
    // Clean verse text: remove parenthetical notes and extra whitespace (keep original sentences).
        function sanitizeVerseText(text) {
            try {
                if (text == null) return text;
                let s = String(text);
                // 反覆移除半形與全形括號內的內容（不跨越嵌套，迭代處理多段）
                const patterns = [/\([^()]*\)/g, /（[^（）]*）/g];
                let changed = true;
                while (changed) {
                    changed = false;
                    for (const re of patterns) {
                        const next = s.replace(re, '');
                        if (next !== s) { s = next; changed = true; }
                    }
                }
                // 移除常見註腳/異譯提示片語（不在括號中者也移除）
                // 例如："或譯：…"、"原文是…"、"又作…"、"直譯…"、"意即…"、"希臘文…"、"希伯來文…"
                const notePhrases = [
                    '或譯', '原文', '又作', '直譯', '意即', '希臘文', '希伯來文', '古卷', '小字', '有作'
                ];
                // 以冒號/破折號等起始到行尾的形式清理註腳（保守處理）
                for (const kw of notePhrases) {
                    const re = new RegExp(`${kw}\s*[：:，,]?[^。！？…\n]*`, 'g');
                    s = s.replace(re, '');
                }
                // 清理可能混入的章節引用片段（如 "46:24:"、"46:25:" 等）
                s = s.replace(/\b\d{1,3}:\d{1,3}\s*[:：]?/g, '');
                // 收斂空白與標點周圍空白
                s = s.replace(/\s{2,}/g, ' ').replace(/\s*([，。！？…；;:：,\.\!\?])\s*/g, '$1').trim();
                return s;
            } catch (_) { return text; }
        }

    // 主題性偵測：盡量避開不具主題性的對話型經文（如「百姓回答說：…」）
    // Topicality check: favor verses with clear spiritual keywords; avoid generic dialogues.
        function hasTopicalKeywords(text) {
            try {
                if (!text) return false;
                const keywords = [
                    '耶和華','主','神','耶穌','基督','聖靈','信','愛','義','罪','救','救恩','恩典','福',
                    '讚美','稱謝','敬畏','盼望','永生','生命','聖潔','公義','真理','福音','喜樂','平安','智慧','祈求','禱告'
                ];
                return keywords.some(k => text.includes(k));
            } catch (_) { return false; }
        }

    // 判斷是否屬於不明確的對話開頭（可能缺乏明確主題）
    // Detect ambiguous conversational openings that are weak as standalone prompts.
    function looksLikeAmbiguousDialogue(text) {
            try {
                if (!text) return false;
                const t = String(text).trim().replace(/^^[「『\"]+/, '');
                // 通用對話觸發詞
                const genericSubjects = '(百姓|眾人|人們|他|他們|門徒|婦人|僕人|朋友|眾弟兄|眾民|長老|祭司|文士|法利賽人|官長|王|母親|父親|群眾|有人)';
                const say = '(說|回答說|回說|問|對)';
                // 1) 主語 + 對/問 + 說：
                const re1 = new RegExp('^' + genericSubjects + '[^，。！？:：]{0,8}?' + say + '[^，。！？:：]{0,6}?(說|)[：:]');
                // 2) 主語 + 回答說：
                const re2 = new RegExp('^' + genericSubjects + '(?:[^，。！？:：]{0,6})?回答說[：:]');
                // 3) 對他(們)說 / 問他(們)說：
                const re3 = /^(他|他們|眾人|百姓|人|門徒)[^，。！？:：]{0,6}(對|問)[^，。！？:：]{0,6}說[：:]/;
                return re1.test(t) || re2.test(t) || re3.test(t);
            } catch (_) { return false; }
        }

    // 主題性評估：過短或含糊對話且無關鍵詞 → 視為弱主題
    // Topicality decision: very short or ambiguous dialogue without keywords => weak topical.
    function isWeakTopicalVerse(text) {
            try {
                if (!text) return true;
                const cleaned = String(text).trim();
                const len = cleaned.replace(/[\s，。！？…；:：、\-—\(\)（）\u3000\'\"「」『』《》〈〉]/g, '').length;
                const dialogue = looksLikeAmbiguousDialogue(cleaned);
                const topical = hasTopicalKeywords(cleaned);
                // 規則：
                // - 若像是含糊對話且無明顯主題關鍵詞 → 視為弱主題
                // - 或者字數極短且無關鍵詞 → 視為弱主題
                if ((dialogue && !topical) || (len < 8 && !topical)) return true;
                // 放行例外：出現「耶穌」「主」「耶和華」「神」等即使是對話也常具主題性
                if (/耶穌|主|耶和華|神/.test(cleaned)) return false;
                return false;
            } catch (_) { return false; }
        }

        // --- 題庫整理與難度對應：統一出題來源、去重、罕見度標註、難度過濾 ---
    // 罕見度類別（UI 僅三種）：
    // - common    常見
    // - uncommon  少見（內部用；UI 已併入冷門）
    // - rare      冷門
            // 備註：可在 external-verses.json 直接提供 rarity 屬性（支援英文或中文：常見/中等/少見/冷門/全部）以覆蓋預設分類

    function classifyRarity(v) {
            try {
                if (v && typeof v.rarity === 'string') {
                    // 支援中英文標註
                    const raw = v.rarity.trim().toLowerCase();
                    const map = {
                        '常見': 'common', '中等': 'common', '少見': 'uncommon', '冷門': 'rare', '全部': 'all',
                        'common': 'common', 'medium': 'common', 'uncommon': 'uncommon', 'rare': 'rare', 'all': 'all'
                    };
                    const m = map[raw];
                    if (m) return m;
                }
            } catch (e) {}
            const key = `${v.book}|${v.chapter}`;
            // 章號擷取（支援 "章:節" 或 "章:起-迄"）
            function chapterNumber(ch) {
                try {
                    const s = String(ch || '');
                    const m = s.match(/^(\d+):/);
                    return m ? parseInt(m[1], 10) : NaN;
                } catch (_) { return NaN; }
            }
            // 常見名節（非完整清單，外部資料若標註則以外部為準）
            const COMMON = new Set([
                '約翰福音|3:16', '約翰福音|14:6', '約翰福音|1:1', '約翰福音|1:12',
                '約翰福音|10:11', '約翰福音|11:25', '約翰福音|15:5', '約翰福音|16:33',
                '腓立比書|4:13', '腓立比書|4:6', '腓立比書|4:7', '腓立比書|4:4',
                '羅馬書|8:28', '羅馬書|6:23', '羅馬書|8:1', '羅馬書|1:16',
                '馬太福音|6:33', '馬太福音|7:7', '馬太福音|5:3', '馬太福音|5:14', '馬太福音|28:19', '馬太福音|28:20',
                '詩篇|23:1', '詩篇|23:4', '詩篇|119:105', '詩篇|46:1', '詩篇|46:10',
                '箴言|3:5', '箴言|3:6', '創世記|1:1', '創世記|1:27',
                '以賽亞書|40:31', '耶利米書|29:11', '約書亞記|1:9', '民數記|6:24', '民數記|6:25', '民數記|6:26',
            ]);
            // 書卷層級預設：把較少出現於常見引文的書卷分散到 uncommon/rare
            const RARE_BOOKS = new Set([
                '俄巴底亞書','那鴻書','西番雅書','哈該書','約拿書',
                '腓利門書','約翰二書','約翰三書','猶大書'
            ]);
            const UNCOMMON_BOOKS = new Set([
                '何西阿書','約珥書','阿摩司書','彌迦書','哈巴谷書','撒迦利亞書','瑪拉基書',
                '以斯拉記','尼希米記','以斯帖記','耶利米哀歌','傳道書','雅歌',
                '歷代志上','歷代志下','列王紀上','列王紀下','利未記','民數記'
            ]);
            // 常見章節（整章視為常見，擴大常見池以支援簡單難度）
            const COMMON_CHAPTERS = {
                '詩篇': [23, 27, 46, 51, 91, 100, 121, 127, 139],
                '箴言': [3, 4, 16],
                '創世記': [1, 12, 22, 28, 50],
                '出埃及記': [20],
                '以賽亞書': [40, 41, 43, 53, 55],
                '耶利米書': [17, 29, 33],
                '約書亞記': [1],
                '馬太福音': [5, 6, 7, 11, 28],
                '馬可福音': [12],
                '路加福音': [2, 15],
                '約翰福音': [1, 3, 6, 10, 11, 13, 14, 15, 16],
                '使徒行傳': [1, 2],
                '羅馬書': [5, 6, 8, 10, 12],
                '哥林多前書': [10, 13, 15],
                '哥林多後書': [4, 5, 12],
                '加拉太書': [2, 5, 6],
                '以弗所書': [2, 3, 6],
                '腓立比書': [1, 3, 4],
                '歌羅西書': [3],
                '帖撒羅尼迦前書': [4, 5],
                '提摩太後書': [1, 3, 4],
                '希伯來書': [4, 11, 12, 13],
                '雅各書': [1, 4, 5],
                '彼得前書': [2, 5],
                '約翰一書': [1, 4, 5],
                '啟示錄': [3, 21, 22]
            };
            // 針對特定冷門名節仍保留（即便書卷不在最冷門清單）
            const RARE_KEYS = new Set([
                '俄巴底亞書|1:21','那鴻書|1:7','西番雅書|3:17','哈該書|2:9','哈該書|2:4',
                '約拿書|2:9','阿摩司書|5:24','彌迦書|6:8','何西阿書|2:19',
                '提多書|1:9','腓利門書|1:10','約翰二書|1:5','約翰三書|1:2',
                '以斯拉記|7:10','歷代志上|16:23'
            ]);
            if (COMMON.has(key)) return 'common';
            // 廣義常見章節提升為 common
            try {
                const chNum = chapterNumber(v.chapter);
                const list = COMMON_CHAPTERS[v.book];
                if (Array.isArray(list) && Number.isFinite(chNum) && list.includes(chNum)) {
                    return 'common';
                }
            } catch (_) {}
            if (RARE_KEYS.has(key)) return 'rare';
            if (RARE_BOOKS.has(v.book)) return 'rare';
            if (UNCOMMON_BOOKS.has(v.book)) return 'uncommon';
            return 'rare';
        }

        // 驗證題庫紀錄是否有效，避免「經文內夾雜其他經文參照或頁碼」等髒資料
        function isValidVerseRecord(v) {
            try {
                if (!v || typeof v !== 'object') return false;
                const book = String(v.book || '').trim();
                const chapter = String(v.chapter || '').trim();
                const verse = String(v.verse || '').trim();

                // 書卷需存在於清單
                const allBooks = [...bibleBooks.old, ...bibleBooks.new];
                if (!allBooks.includes(book)) return false;

                // 章節格式：N:N 或 N:N-N
                if (!/^\d+:\d+(?:-\d+)?$/.test(chapter)) return false;

                // 經文內不應再出現第二個書卷參照，例如「民數記 4:43-44」
                const bookNamePattern = /(創世記|出埃及記|利未記|民數記|申命記|約書亞記|士師記|路得記|撒母耳記上|撒母耳記下|列王紀上|列王紀下|歷代志上|歷代志下|以斯拉記|尼希米記|以斯帖記|約伯記|詩篇|箴言|傳道書|雅歌|以賽亞書|耶利米書|耶利米哀歌|以西結書|但以理書|何西阿書|約珥書|阿摩司書|俄巴底亞書|約拿書|彌迦書|那鴻書|哈巴谷書|西番雅書|哈該書|撒迦利亞書|瑪拉基書|馬太福音|馬可福音|路加福音|約翰福音|使徒行傳|羅馬書|哥林多前書|哥林多後書|加拉太書|以弗所書|腓立比書|歌羅西書|帖撒羅尼迦前書|帖撒羅尼迦後書|提摩太前書|提摩太後書|提多書|腓利門書|希伯來書|雅各書|彼得前書|彼得後書|約翰一書|約翰二書|約翰三書|猶大書|啟示錄)\s+\d+:\d+/;
                if (bookNamePattern.test(verse)) return false;

                // 破碎續行的負號段號，如「-40 從三十歲…」
                if (/^-\d+\b/.test(verse)) return false;

                // 明顯頁碼殘留：空白夾著 2-4 位數字（保守處理）
                if (/\s\d{2,4}\s/.test(verse)) return false;

                return true;
            } catch (_) {
                return false;
            }
        }

        function normalizeVerseDatabase(db) {
            const out = [];
            const seen = new Set();
            const defaultVersion = '新標點和合本 神版';
            if (!Array.isArray(db)) return out;
            for (const raw of db) {
                const v = raw || {};
                // 正規化書卷名稱以對齊本遊戲清單（避免外部資料使用簡稱或其他變體造成過濾失敗）
                try { v.book = normalizeBookName(v.book); } catch (e) {}
                // 將數字章轉成字串以統一選擇器與渲染（external JSON 可能為數字）
                try { if (typeof v.chapter === 'number') v.chapter = String(v.chapter); } catch(e){}
                // 先清理經文中的括號說明，提升可讀性與易分段性
                try { if (typeof v.verse === 'string') v.verse = sanitizeVerseText(v.verse); } catch(e){}
                // 先做資料面向的有效性驗證（在建立 key 之前）
                if (!isValidVerseRecord(v)) continue;
                // 過濾主題性較弱或含糊對話型的經文（例如：「百姓回答說：…」）
                try {
                    if (isWeakTopicalVerse(v.verse)) continue;
                } catch(_) {}
                const key = `${v.book}|${v.chapter}|${v.verse}|${v.version||''}`;
                if (seen.has(key)) continue;
                seen.add(key);
                // 保留外部提供的版本與稀有度；僅在缺失時回填預設與分類
                try { if (!v.version) v.version = defaultVersion; } catch(e){}
                try {
                    // 將外部提供的罕見度（支援中英文）統一到 canonical 值；若缺失則自動分類
                    const rawR = (v && v.rarity != null) ? String(v.rarity).trim().toLowerCase() : '';
                    if (rawR) {
                        const map = {
                            '常見': 'common', '中等': 'common', '少見': 'uncommon', '冷門': 'rare', '全部': 'all',
                            'common': 'common', 'medium': 'common', 'uncommon': 'uncommon', 'rare': 'rare', 'all': 'all'
                        };
                        v.rarity = map[rawR] || classifyRarity(v);
                    } else {
                        v.rarity = classifyRarity(v);
                    }
                } catch(e){}
                out.push(v);
            }
            return out;
        }

        // 建立輕量索引以加速過濾/計數：
        // window.__verseIndex = { byBook: Map<string, Verse[]>, counts: { byBook: Map<string, { total, common, uncommon, rare }> } }
        function buildVerseIndex(normalizedDB) {
            try {
                const arr = Array.isArray(normalizedDB) ? normalizedDB : [];
                const byBook = new Map();
                const counts = new Map();
                for (const v of arr) {
                    const b = v.book;
                    if (!byBook.has(b)) byBook.set(b, []);
                    byBook.get(b).push(v);
                    // counts per rarity
                    if (!counts.has(b)) counts.set(b, { total: 0, common: 0, uncommon: 0, rare: 0 });
                    const c = counts.get(b);
                    c.total++;
                    if (v.rarity === 'common') c.common++;
                    else if (v.rarity === 'uncommon') c.uncommon++;
                    else if (v.rarity === 'rare') c.rare++;
                }
                window.__verseIndex = { byBook, counts };
                return window.__verseIndex;
            } catch (_) {
                window.__verseIndex = { byBook: new Map(), counts: new Map() };
                return window.__verseIndex;
            }
        }

        function getActiveVerseDB() {
            // 改為只使用外部題庫（external-verses.json）；不再使用內建備援
            try {
                const desiredScope = getDesiredVerseScope();
                const currentScope = String(window.__verseDatabaseScope || '');

                // 目標為 full 但目前僅有分片時：先觸發 full 急載入，並允許先用分片開局
                // 這可避免弱網下首局被「等待完整題庫」卡住。
                if (desiredScope === 'full' && currentScope && currentScope !== 'full') {
                    try { requestUrgentVerseLoad(true); } catch(_) {}
                    try { window.__usingShardBeforeFullReady = true; } catch(_) {}
                } else {
                    try { window.__usingShardBeforeFullReady = false; } catch(_) {}
                }

                // 若已有正規化快取，直接使用
                if (Array.isArray(window.__normalizedDB) && window.__normalizedDB.length > 0) {
                    if (!window.__verseIndex || !window.__verseIndex.byBook) {
                        try { buildVerseIndex(window.__normalizedDB); } catch(_) {}
                    }
                    return window.__normalizedDB;
                }

                // 尚未載入時立即觸發急迫載入（非阻塞），並回傳空陣列給呼叫端顯示「載入中」狀態
                if (!Array.isArray(window.verseDatabase) || window.verseDatabase.length === 0) {
                    // 首次載入優先採 shard-first，提高弱網下「先可開始」成功率
                    try { requestUrgentVerseLoad(false); } catch(_) {}
                    return [];
                }

                const active = (Array.isArray(window.verseDatabase) && window.verseDatabase.length) ? window.verseDatabase : [];
                const norm = normalizeVerseDatabase(active);
                window.__normalizedDB = norm;
                try { buildVerseIndex(norm); } catch(_) {}
                return norm;
            } catch (e) {
                return [];
            }
        }

    // 已棄用：舊版難度→罕見度過濾器（現行模型改為：練習=範圍優先、排行=罕見度優先）
    // function filterByDifficultyAndRarity(...) { /* removed */ }

    // 罕見度統計摘要（僅供除錯/顯示）
    // Summarize rarity counts for debugging/display
    function summarizeRarity(db) {
            const sum = { total: 0, common: 0, uncommon: 0, rare: 0 };
            for (const v of (db || [])) {
                sum.total++;
                const r = (v && v.rarity) || 'common';
                if (r === 'common' || r === 'uncommon' || r === 'rare') sum[r]++;
            }
            return sum;
        }
