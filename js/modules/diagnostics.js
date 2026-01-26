    /* =============================================================
       Dev/Test Utilities (A5) - Pure function wrappers + mini tests
       可在 Console 呼叫 window.__runCoreSelfTest()
       ============================================================= */
    (function exposeCorePureHelpers(){
        try {
            if (window.__coreHelpersExposed) return;
            window.__coreHelpersExposed = true;
            // 包裝 computeRank 供測試（避免直接覆蓋）
            window.__test_computeRank = function(list, score, limit){ return computeRank(list, score, limit); };
            // 成就條件快速測試：傳 metrics 與成就 id，返回是否通過（僅用於開發）
            window.__test_checkAchievement = function(id, metrics){
                try { const defs = (AchievementManager && AchievementManager.defs)||[]; const a = defs.find(d=>d.id===id); if(!a) return null; return !!(function evalRule(rule,m){ if(!rule) return false; switch(rule.type){ case 'metric': { const v=m[rule.field]; const t=rule.value; switch(rule.op){ case '>=':return v>=t; case '>':return v>t; case '<=':return v<=t; case '<':return v<t; case '==':return v==t; default:return false;} } case 'and': return rule.children.every(r=>evalRule(r,m)); case 'or': return rule.children.some(r=>evalRule(r,m)); case 'custom': return !!rule.fn(m);} return false;})(a.condition, metrics||{}); } catch(e){ return false; }
            };
            // 簡單核心自我測試：僅測 computeRank 邏輯幾條關鍵案例
            window.__runCoreSelfTest = function(){
                // --- computeRank 核心案例 ---
                const rankCases = [
                    { list:[], score:100, limit:5, expect:1, note:'空榜單第一位'},
                    { list:[{score:200},{score:150}], score:120, limit:5, expect:3, note:'插到末尾 (榜未滿)'},
                    { list:[{score:300},{score:200},{score:100}], score:250, limit:5, expect:2, note:'中間插入'},
                    { list:[{score:300},{score:280},{score:260},{score:240},{score:220}], score:220, limit:5, expect:0, note:'等於最低不入榜(嚴格大於)'},
                    { list:[{score:300},{score:280},{score:260},{score:240},{score:220}], score:239, limit:5, expect:0, note:'低於最低不入榜'},
                    { list:[{score:300},{score:280},{score:260},{score:240}], score:100, limit:5, expect:5, note:'榜未滿 + 最低'}
                ];
                const rankResults = rankCases.map(c=>{ const got = computeRank(c.list, c.score, c.limit); return { ok: got===c.expect, got, expect:c.expect, note:c.note }; });
                const rankPass = rankResults.every(r=>r.ok);
                console.log('[SelfTest][computeRank]', rankPass?'ALL PASS':'SOME FAIL', rankResults);

                // --- Performance Score 測試 ---
                if (!window.__test_performanceScore) {
                    console.log('%c[SelfTest][PS] 尚未抽離 performance score 計算函式，後續可擴充。','color:orange');
                } else {
                    const psCases = [
                        { note:'基線：無失誤/無提示', input:{ mistakes:0, hints:0, duration:30, avgAnswerMs:4000, perfectBonus:true } },
                        { note:'輕微失誤', input:{ mistakes:1, hints:0, duration:32, avgAnswerMs:4500, perfectBonus:false } },
                        { note:'多失誤+提示', input:{ mistakes:3, hints:2, duration:40, avgAnswerMs:5200, perfectBonus:false } },
                        { note:'極快高品質', input:{ mistakes:0, hints:0, duration:22, avgAnswerMs:2800, perfectBonus:true } }
                    ];
                    const psResults = psCases.map(pc=>{ let v; try{ v=window.__test_performanceScore(pc.input); }catch(e){ v=null; } return { note:pc.note, value:v }; });
                    console.log('[SelfTest][PS]', psResults);
                }

                // --- Rarity Buffer 序列模擬 ---
                if (window.__test_rarityBufferSequence) {
                    const rseq = window.__test_rarityBufferSequence([0.18,0.20,-0.10,-0.18,-0.16,0.42]);
                    console.log('[SelfTest][RarityBuf]', rseq);
                } else {
                    console.log('%c[SelfTest][RarityBuf] 尚未提供 rarity buffer 模擬。','color:orange');
                }

                // --- computeRank 壓力測試（縮小預設 n 保守執行）---
                if (window.__stress_computeRank) {
                    const stress = window.__stress_computeRank(1200);
                    console.log('[StressTest][computeRank]', { durationMs:stress.durationMs, perOpMs:stress.perOpMs, n:1200, sample:stress.sample.slice(0,5) });
                }

                return { pass: rankPass, rankResults };
            };

            // ========= Performance Score (方案C) 純計算函式（推測重建，僅供測試，不影響正式流程） =========
            window.__test_performanceScore = function(meta){
                const mistakes = meta.mistakes||0;
                const hints = meta.hints||0;
                const duration = meta.duration||30; // 秒
                const avgAnswerMs = meta.avgAnswerMs||5000;
                const perfectBonus = !!meta.perfectBonus;
                const speedRatio = Math.min(2, Math.max(0.5, avgAnswerMs/5000)); // 0.5(快)~2(慢)
                const timeScore = (1 - (speedRatio-1)); // ratio=1 =>0, 0.5=>+0.5, 2=>-1
                const mistakePenalty = Math.min(0.8, mistakes * 0.18);
                const hintPenalty = Math.min(0.7, hints * 0.22);
                const durationAdj = (duration>35)? -((duration-35)/60):0; // 拖長懲罰
                const perfect = perfectBonus ? 0.25 : 0;
                let ps = timeScore - mistakePenalty - hintPenalty + durationAdj + perfect;
                if (ps>1) ps = 1 - (ps-1)*0.3; if (ps<-1) ps = -1 + (ps+1)*0.3; // 壓縮範圍
                return +ps.toFixed(3);
            };
            // 真實 vs 近似 PS 收集器：呼叫 collectRealPS(meta, realPs)
            (function initPSCollector(){
                if(window.__psCollector) return;
                const STORAGE_KEY = 'bc-psCollector-v1';
                const buf=[]; // {real, approx, delta, meta}
                // load persisted
                try {
                    const raw = localStorage.getItem(STORAGE_KEY);
                    if (raw) {
                        const arr = JSON.parse(raw);
                        if (Array.isArray(arr)) arr.slice(-120).forEach(o=>buf.push(o));
                    }
                } catch(_) {}
                let dirty=false; let saveTimer=null;
                function scheduleSave(){
                    dirty=true;
                    if(saveTimer) return;
                    saveTimer = setTimeout(()=>{
                        try { if(dirty){ localStorage.setItem(STORAGE_KEY, JSON.stringify(buf.slice(-120))); dirty=false; } } catch(_) {}
                        saveTimer=null;
                    }, 1500);
                }
                window.__psCollector = {
                    collect(meta, real){
                        try {
                            if(typeof window.__test_performanceScore !== 'function') return;
                            const approx = window.__test_performanceScore(meta||{});
                            const delta = (typeof real==='number')? +(real-approx).toFixed(3):null;
                            const metaLite = meta ? {
                                mistakes: meta.mistakes||0,
                                hints: meta.hints||0,
                                dur: meta.duration||0,
                                avg: meta.avgAnswerMs||0,
                                perfect: !!meta.perfectBonus
                            }:null;
                            buf.push({ ts: Date.now(), real, approx, delta, meta: metaLite });
                            if(buf.length>240) buf.splice(0, buf.length-240);
                            scheduleSave();
                        } catch(_) {}
                    },
                    stats(){
                        if(!buf.length) return { count:0 };
                        const deltas = buf.map(r=> typeof r.delta==='number'? Math.abs(r.delta):null).filter(v=>v!==null);
                        const avg = deltas.length? +(deltas.reduce((a,b)=>a+b,0)/deltas.length).toFixed(3):null;
                        const max = deltas.length? Math.max(...deltas):null;
                        return { count: buf.length, avgAbsDelta: avg, maxAbsDelta: max, recent: buf.slice(-10) };
                    },
                    export(){ try { return JSON.stringify(buf); } catch(e){ return '[]'; } },
                    import(json){
                        try {
                            const arr = JSON.parse(json); if(!Array.isArray(arr)) return false;
                            buf.length=0; arr.slice(-240).forEach(o=>buf.push(o)); scheduleSave(); return true;
                        } catch(e){ return false; }
                    },
                    clear(){ buf.length=0; scheduleSave(); },
                    raw(){ return buf.slice(); }
                };
            })();

            // ========= Rarity Buffer 升降級序列模擬 =========
            window.__test_rarityBufferSequence = function(psArray){
                let cur='common'; let pos=0, neg=0; const log=[];
                for (let i=0;i<psArray.length;i++){
                    const PS = psArray[i]; let promote=false, demote=false;
                    if (PS >= 0.40){ if(cur!=='rare'){ promote=true; cur='rare'; } pos=neg=0; }
                    else if (PS <= -0.40){ if(cur!=='common'){ demote=true; cur='common'; } pos=neg=0; }
                    else if (PS >= 0.15){ pos++; neg=0; if(pos>=2 && cur!=='rare'){ promote=true; cur='rare'; pos=0; } }
                    else if (PS <= -0.15){ neg++; pos=0; if(neg>=2 && cur!=='common'){ demote=true; cur='common'; neg=0; } }
                    else { pos=neg=0; }
                    log.push({i,PS,cur,pos,neg,promote,demote});
                }
                return log;
            };

            // ========= computeRank 壓力測試 =========
            window.__stress_computeRank = function(n){
                const list=[]; for(let i=0;i<50;i++){ list.push({score: Math.floor(Math.random()*5000)}); }
                list.sort((a,b)=>b.score-a.score);
                const sample=[]; const t0=performance.now();
                for(let k=0;k<n;k++){
                    const s = Math.floor(Math.random()*5000);
                    const r = computeRank(list, s, 50);
                    if (k<30) sample.push({s,r});
                }
                const t1=performance.now();
                return { durationMs:+(t1-t0).toFixed(2), perOpMs:+((t1-t0)/n).toFixed(4), sample };
            };

            // ========= Focus Trap 測試（需要 modal 已在 DOM） =========
            window.__test_focusTrap = function(modalSelector){
                const sel = modalSelector || '#playerNameModal';
                const m = document.querySelector(sel); if(!m) return {error:'modal not found'};
                const focusables = Array.from(m.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))
                  .filter(el=>!el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
                return { count: focusables.length, first: focusables[0]&&focusables[0].tagName, last: focusables.at(-1)&&focusables.at(-1).tagName };
            };
        } catch(e){ console.warn('[coreHelpers] expose failed', e); }
    })();

    /* =============================================================
       Dev Diagnostics & Instrumentation (Non-invasive)
       目的：協助除錯 / 效能 / 一致性檢查，不改動既有遊戲流程。
       暴露 API (console 呼叫)：
         - $(sel) / $$(sel) : 包裝 querySelector / All 並統計使用頻次
         - __qsStats() : 回傳 querySelector 使用統計
         - __setHTML(el, html, {warnScript=true}) : 設定 innerHTML 並可偵測 <script>
         - __diag_state() : 回傳當前關鍵狀態摘要
         - __selfHeal() : 嘗試修復排名樣式/玩家名稱色彩
         - __profile_block(fn, iterations) : 簡易同步/非同步區塊效能測量
       ============================================================= */
    (function addDevDiagnostics(){
        if (window.__devDiagnosticsAdded) return; window.__devDiagnosticsAdded = true;
        const qsUsage = Object.create(null);
        function track(sel){ qsUsage[sel] = (qsUsage[sel]||0) + 1; }
        window.$ = function(sel, root){ track(sel); return (root||document).querySelector(sel); };
        window.$$ = function(sel, root){ track(sel); return Array.from((root||document).querySelectorAll(sel)); };
        window.__qsStats = function(){
            const total = Object.values(qsUsage).reduce((a,b)=>a+b,0);
            // 排序輸出前 10 熱門 selector
            const hot = Object.entries(qsUsage).sort((a,b)=>b[1]-a[1]).slice(0,10);
            return { total, unique:Object.keys(qsUsage).length, top10:hot };
        };
        // 安全 innerHTML 包裝（僅偵測，不過濾）
        window.__setHTML = function(el, html, opts){
            if(!el) return false;
            const o = opts||{};
            if(o.warnScript !== false && /<script/i.test(html)){
                console.warn('[__setHTML] script-like content detected', {el, preview: html.slice(0,200)});
            }
            el.innerHTML = html;
            return true;
        };
        // 僅文字設定（若傳入含 tag 會警告）
        window.__setText = function(el, text){
            if(!el) return false;
            if (/[<>]/.test(text)) console.warn('[__setText] angle brackets detected, ensure this is plain text', {preview:text.slice(0,120)});
            el.textContent = text;
            return true;
        };
        // 追蹤 innerHTML 風險使用點：以 MutationObserver 觀察新增 script/style（dev 模式）
        if (!window.__htmlRiskObserver){
            try {
                const riskStats = { scripts:0, styles:0, suppressed:0, firstTime:performance.now(), samples:0 };
                const allowOrigin = location.origin;
                const allowSrcPrefix = [allowOrigin, 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
                let lastLogTs = 0; const LOG_INTERVAL = 1500; // ms
                function allowedScript(node){
                    if(node.src){
                        return allowSrcPrefix.some(p=> node.src.startsWith(p));
                    }
                    // inline script: allow if tiny & no suspicious inline event patterns
                    const txt = (node.textContent||'').trim();
                    if(txt.length < 40 && !/fetch\(|import\(/.test(txt)) return true;
                    return false;
                }
                function allowedStyle(node){
                    const txt = (node.textContent||'').trim();
                    if(txt.length < 120 && !/@import/.test(txt)) return true;
                    return false;
                }
                const buffered = [];
                function flush(){
                    if(!buffered.length) return;
                    const now = performance.now();
                    if(now - lastLogTs < LOG_INTERVAL) return; // still cooling
                    lastLogTs = now;
                    const batch = buffered.splice(0, buffered.length);
                    console.warn('[HTMLRisk] batch', batch.length, batch);
                }
                const mo = new MutationObserver(list=>{
                    let dirty=false;
                    for(const m of list){
                        m.addedNodes && m.addedNodes.forEach(n=>{
                            if(!(n && n.tagName)) return;
                            if(n.tagName==='SCRIPT'){
                                riskStats.scripts++; riskStats.samples++;
                                if(!allowedScript(n)) { buffered.push({tag:'SCRIPT', src:n.src||null, inlineLen:(n.textContent||'').length}); dirty=true; }
                                else riskStats.suppressed++;
                            } else if(n.tagName==='STYLE'){
                                riskStats.styles++; riskStats.samples++;
                                if(!allowedStyle(n)) { buffered.push({tag:'STYLE', inlineLen:(n.textContent||'').length}); dirty=true; }
                                else riskStats.suppressed++;
                            }
                        });
                    }
                    if(dirty) flush();
                });
                mo.observe(document.documentElement, {subtree:true, childList:true});
                window.__htmlRiskObserver = mo;
                window.__htmlRiskStats = riskStats;
                window.__htmlRiskFlush = flush;
            } catch(e){ console.warn('[HTMLRisk] observer failed', e); }
        }
        // 輕量快取：經常存取的 id / selector
        const cache = Object.create(null);
        window.__qc = function(sel){ // quick cache
            if (cache[sel] && cache[sel].isConnected) return cache[sel];
            const el = document.querySelector(sel);
            cache[sel] = el || null;
            return el;
        };
        window.__qcStats = function(){ const live = Object.entries(cache).filter(([k,v])=>v && v.isConnected).length; return { keys:Object.keys(cache).length, live }; };

        // 記憶體/節點殘留粗檢（僅示意）
        window.__leakScan = function(){
            // 掃描所有已知 cache 中的節點是否離線
            const stale = Object.entries(cache).filter(([k,v])=>v && !v.isConnected).map(([k])=>k);
            return { staleCount: stale.length, staleSelectors: stale.slice(0,20) };
        };
        // 計時/效能：支援同步或 async function
        window.__profile_block = async function(fn, iterations){
            if (typeof fn !== 'function') throw new Error('fn must be function');
            const it = iterations||1;
            const isAsync = (fn.constructor && fn.constructor.name === 'AsyncFunction');
            const t0 = performance.now();
            for (let i=0;i<it;i++){ if(isAsync) await fn(i); else fn(i); }
            const t1 = performance.now();
            return { iterations:it, totalMs:+(t1-t0).toFixed(3), perMs:+((t1-t0)/it).toFixed(4) };
        };
        // 狀態診斷：收集核心可觀察資訊
        window.__diag_state = function(){
            const r = {};
            try {
                r.rankHeading = document.querySelector('.rank-heading-text')?.textContent || null;
                r.playerName = document.getElementById('playerNameInput')?.value || null;
                r.rarityBuffers = { pos: (typeof gameState?._rarityPosBuf==='number'? gameState._rarityPosBuf : null), neg: (typeof gameState?._rarityNegBuf==='number'? gameState._rarityNegBuf : null) };
                r.performanceScore = (typeof gameState?.lastLevelPerformanceScore === 'number') ? gameState.lastLevelPerformanceScore : null;
                // Timer/interval 追蹤（若先前有注入）
                r.timerRegistry = (function(){
                    const out={};
                    if (window.__timerRegistry && window.__timerRegistry.size){ out.tracked = window.__timerRegistry.size; }
                    if (window.__trackedTimeouts) out.timeouts = window.__trackedTimeouts.length;
                    if (window.__trackedIntervals) out.intervals = window.__trackedIntervals.length;
                    return out;
                })();
                r.focus = (function(){
                    const el = document.activeElement; return { tag: el? el.tagName:null, id: el?.id||null, class: el?.className||null };
                })();
                r.focusTrap = (function(){
                    const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
                    if(!modal) return null;
                    const focusables = Array.from(modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))
                        .filter(e=>!e.hasAttribute('disabled') && !e.getAttribute('aria-hidden'));
                    return { count: focusables.length, first: focusables[0]?.tagName, last: focusables.at(-1)?.tagName };
                })();
                r.domHotSelectors = window.__qsStats();
            } catch(e){ r.error = e.message; }
            return r;
        };
        // 自我修復：嘗試重套排名與玩家名稱色彩
        window.__selfHeal = function(){
            const res = { applied:[] };
            try { if (typeof finalizeRankStyling==='function'){ finalizeRankStyling(); res.applied.push('finalizeRankStyling'); } } catch(e){ res.finalizeError=e.message; }
            try { if (typeof ensurePlayerNameColor==='function'){ ensurePlayerNameColor(); res.applied.push('ensurePlayerNameColor'); } } catch(e){ res.nameColorError=e.message; }
            return res;
        };
        // 高頻操作包裝：可動態啟用節流（未直接套用原函式，僅提供工具）
        window.__throttle = function(fn, ms){
            let last=0, timer=null; return function(...args){ const now=performance.now(); const remain = ms-(now-last); if(remain<=0){ last=now; fn.apply(this,args); } else { clearTimeout(timer); timer=setTimeout(()=>{ last=performance.now(); fn.apply(this,args); }, remain); } };
        };
        window.__rafBatch = function(){
            let q=[]; let scheduled=false; function flush(){ scheduled=false; const tasks=q.slice(); q.length=0; for(const t of tasks){ try{ t(); }catch(e){ console.warn('[rafBatch task error]', e); } } }
            return function(task){ q.push(task); if(!scheduled){ scheduled=true; requestAnimationFrame(flush); } };
        }();
        if (window.__debugPerf){ console.log('[DevDiagnostics] Ready'); }
    })();

    /* =============================================================
       Third Batch Audit Utilities (innerHTML / a11y / animations / PS validation)
       提供開發階段用的審核函式，不影響正式遊戲流程。
       暴露：
         - __audit_innerHTML()  : 掃描含 innerHTML 指派風險模式 (快速偵測 script/style/事件屬性)
         - __audit_a11y()       : 掃描互動元素有無可達的 accessible name / role 是否合理
         - __audit_animations() : 列出有 animation/transition 的元素與估計數量，提示可能過量
         - __audit_psValidation(samples=30) : 抽樣比對實際 gameState.lastLevelPerformanceScore 與 __test_performanceScore 推估差異
       ============================================================= */
    ;(function addThirdBatchAudits(){
        if (window.__thirdAuditAdded) return; window.__thirdAuditAdded = true;
        function classifyHTML(src){
            const s = src.trim();
            if (!s) return 'empty';
            if (/script|on\w+=|<style|<iframe/i.test(s)) return 'high-risk';
            if (/<[a-z][^>]*>/i.test(s)) return 'html';
            return 'text';
        }
        window.__audit_innerHTML = function(){
            const nodes = [];
            const treeWalker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_ELEMENT, null);
            while(treeWalker.nextNode()){
                const el = treeWalker.currentNode;
                // 只記錄近期可能動態注入過內容的元素：有子元素且 dataset 標記或疑似 leaderboard/achievement 區域
                if (!el) continue;
                if (el.childElementCount===0) continue; // 大多純文字忽略
                const html = el.innerHTML;
                const type = classifyHTML(html);
                if (type==='html' || type==='high-risk'){
                    const id = el.id || null;
                    const cls = el.className || '';
                    if (/leaderboard|achievement|modal|dialog|content/i.test(id+cls)){
                        nodes.push({ id, class: cls.slice(0,120), length: html.length, type, snippet: html.slice(0,160) });
                    }
                }
            }
            return { scanned: nodes.length, nodes };
        };
        window.__audit_a11y = function(){
            const interactiveSel = 'button, [role="button"], a[href], input, select, textarea, [tabindex]';
            const list = [];
            document.querySelectorAll(interactiveSel).forEach(el=>{
                if (el.getAttribute('aria-hidden')==='true' || el.disabled) return;
                const role = el.getAttribute('role') || (el.tagName.toLowerCase()==='a' ? 'link' : el.tagName.toLowerCase());
                const label = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') && (document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) || el.textContent.trim();
                if (!label){
                    list.push({ tag: el.tagName, role, id: el.id||null, class: (el.className||'').slice(0,80), issue: 'missing-name' });
                }
            });
            return { missingCount: list.length, missing: list.slice(0,50) };
        };
        window.__audit_animations = function(){
            const animated = [];
            const all = document.querySelectorAll('*');
            all.forEach(el=>{
                const cs = getComputedStyle(el);
                const hasAnim = (cs.animationName && cs.animationName!=='none') || (+cs.animationDuration.replace(/s$/,'')>0);
                const hasTrans = cs.transitionProperty && cs.transitionProperty!=='all' ? true : /[a-z]/i.test(cs.transitionProperty||'');
                if (hasAnim || hasTrans){
                    if (animated.length < 120){
                        animated.push({ tag: el.tagName, id: el.id||null, class: (el.className||'').slice(0,60), anim: cs.animationName||null, trans: cs.transitionProperty||null });
                    }
                }
            });
            return { totalScanned: all.length, animatedCount: animated.length, sample: animated.slice(0,50) };
        };
        window.__audit_psValidation = function(samples){
            const n = samples || 30;
            if (typeof window.__test_performanceScore !== 'function' || !window.gameState) return { error: 'missing tester or gameState' };
            const res = [];
            for (let i=0;i<n;i++){
                const meta = {
                    mistakes: Math.floor(Math.random()*4),
                    hints: Math.floor(Math.random()*3),
                    duration: 25 + Math.floor(Math.random()*30),
                    avgAnswerMs: 800 + Math.random()*7000,
                    perfectBonus: Math.random()<0.2
                };
                const approx = window.__test_performanceScore(meta);
                // 模擬實際：假設真實值 = approx ± 微幅噪音 (僅先驗估計; TODO: 用實際 lastLevelPerformanceScore 收集)
                const actual = approx + (Math.random()*0.14 - 0.07);
                res.push({ meta, approx, actual, delta: +(actual-approx).toFixed(3) });
            }
            const avgDelta = res.reduce((a,b)=>a+Math.abs(b.delta),0)/res.length;
            return { samples: res, avgAbsDelta: +avgDelta.toFixed(3) };
        };
        // 監測單幀 DOM 變動密度：觀察 rAF 期間 MutationObserver 計數，適合短期抽樣 (durationMs)
        window.__audit_animationFrameMutations = function(durationMs){
            const dur = durationMs || 3000; // 預設 3 秒
            if (window.__afmRunning) return { error:'already-running' };
            window.__afmRunning = true;
            return new Promise(resolve=>{
                const records=[]; let frame=0; let mutCount=0; let maxMut=0; let totalMut=0; let rafId=null;
                const mo = new MutationObserver(list=>{ mutCount += list.length; });
                try { mo.observe(document.documentElement, {subtree:true, childList:true, attributes:false}); } catch(_) {}
                const start = performance.now();
                function step(){
                    frame++;
                    maxMut = Math.max(maxMut, mutCount);
                    totalMut += mutCount;
                    records.push(mutCount);
                    mutCount = 0;
                    if (performance.now() - start < dur){ rafId = requestAnimationFrame(step); }
                    else {
                        try { mo.disconnect(); } catch(_) {}
                        window.__afmRunning=false;
                        resolve({ frames:frame, avgPerFrame: +(totalMut/frame).toFixed(2), maxPerFrame:maxMut, samples:records.slice(-60) });
                    }
                }
                rafId = requestAnimationFrame(step);
            });
        };
        if (window.__debugPerf) console.log('[ThirdBatchAudits] Ready');
    })();

    /* =============================================================
       Extended Diagnostics (Wave+): Long frame audit, template reuse
       suggestions, innerHTML remediation, enhanced leak trending.
       ============================================================= */
    (function extendedDiagnostics(){
        if (window.__extendedDiagAdded) return; window.__extendedDiagAdded = true;
        // Long frame detector: sample rAF deltas; mark frames > threshold
        window.__longFrameAudit = function(opts){
            const o = opts||{}; const dur = o.durationMs||5000; const threshold = o.thresholdMs||32; // 2 * 16.6ms
            if (window.__lfaRunning) return Promise.resolve({ error:'already-running' });
            window.__lfaRunning = true;
            return new Promise(resolve=>{
                const frames=[]; let last=performance.now(); let over=0; let max=0; let rafId;
                function step(){
                    const now = performance.now();
                    const delta = now - last; last = now; frames.push(+delta.toFixed(2));
                    if (delta>threshold){ over++; max=Math.max(max,delta); }
                    if (now - frames[0] < dur){ rafId = requestAnimationFrame(step); }
                    else { window.__lfaRunning=false; resolve({ total:frames.length, over, max:+max.toFixed(2), pct:+((over/frames.length)*100).toFixed(2), samples:frames.slice(-80) }); }
                }
                rafId = requestAnimationFrame(step);
            });
        };
        // Template suggestion: detect repeated large HTML substrings (heuristic)
        window.__suggest_templates = function(limit){
            const LIM = limit||5; const html = document.body.innerHTML; const map = new Map();
            // naive sliding window for chunks between 160..460 chars
            for(let size=420; size>=160; size-=80){
                for(let i=0;i<html.length-size;i+=40){
                    const chunk = html.slice(i,i+size);
                    if(chunk.indexOf('<')===-1) continue; // skip plain text blocks
                    if(/script|style|svg/i.test(chunk)) continue; // skip complex tags
                    const key = chunk.replace(/\s+/g,' ').trim();
                    if(key.length<140) continue;
                    const prev = map.get(key)||0; if(prev===0 && map.size>800) continue; // cap memory
                    map.set(key, prev+1);
                }
            }
            const candidates = Array.from(map.entries()).filter(([k,v])=>v>2).sort((a,b)=>b[1]-a[1]).slice(0,LIM).map(([k,v],idx)=>({rank:idx+1, repeat:v, preview:k.slice(0,160)+'...'}));
            return { candidates, scanned: map.size };
        };
        // innerHTML remediation: enumerate elements using innerHTML assignments via marker heuristics
        window.__audit_innerHTMLFixes = function(){
            const risky=[]; const all = document.querySelectorAll('*');
            all.forEach(el=>{
                if(!el) return; // skip
                // Heuristic: many child nodes + lacks data-static attr + not whitelisted container
                if(el.childElementCount>18 && !el.hasAttribute('data-static') && !/^(UL|OL|TABLE|TBODY)$/i.test(el.tagName)){
                    const txt = el.textContent||''; if(txt.length>260) risky.push({ tag:el.tagName, id:el.id||null, class:(el.className||'').slice(0,60), childCount:el.childElementCount, textSample:txt.slice(0,80) });
                }
            });
            return { risky: risky.slice(0,50), total: risky.length };
        };
        // Enhanced leak trending: keep rolling history of stale selectors
        (function augmentLeakScan(){
            if(!window.__leakScan) return; const history=[]; const MAX=12; // last 12 samples
            window.__leakScanTrend = function(){
                const snap = window.__leakScan();
                history.push({ t:Date.now(), stale:snap.staleCount });
                while(history.length>MAX) history.shift();
                const rising = history.length>4 && history[history.length-1].stale > history[0].stale;
                const avg = history.reduce((a,b)=>a+b.stale,0)/history.length;
                return { latest:snap.staleCount, samples:history.length, avg:+avg.toFixed(2), rising, history:history.slice() };
            };
        })();
        if (window.__debugPerf) console.log('[ExtendedDiagnostics] Added');
    })();

    // Rank 對比度稽核工具：計算文字與背景的相對亮度對比，給出 AA/AAA 建議
    window.__audit_rankContrast = function(){
        function luminance(hex){
            hex = hex.replace('#',''); if(hex.length===3) hex=hex.split('').map(x=>x+x).join('');
            const rgb=[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)].map(v=>{v/=255;return v<=0.03928? v/12.92:Math.pow((v+0.055)/1.055,2.4);});
            return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2];
        }
        const out=[]; const rootStyles = getComputedStyle(document.documentElement);
        for(const k in RANK_THEME){
            const t = RANK_THEME[k]; if(!t) continue; // name color vs assumed light panel or dark panel
            // 嘗試解析 panel 背景是否為線性漸層，抓第一個 rgba/hex
            let panelColor = '#ffffff';
            const bg = t.panelBg||'';
            const m = bg.match(/#([0-9a-fA-F]{3,6})|rgba?\([^)]*\)/);
            if(m){ panelColor = m[0].startsWith('#')? m[0]: '#ffffff'; }
            const L1 = luminance(t.name.replace(/gradient.*|linear.*/,'').trim()||'#000000');
            const L2 = luminance(panelColor);
            const contrast = (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
            out.push({ rank:+k, nameColor:t.name, panel:panelColor, contrast:+contrast.toFixed(2), passAA:contrast>=4.5 });
        }
        return out.sort((a,b)=>a.contrast-b.contrast);
    };

    /* =============================================================
       Lazy Module Loader (A6) - 延後非關鍵模組載入骨架
       說明：如果日後將成就定義 / 排行展示 / Supabase 遠端互動拆成獨立檔案，可在此集中管理。
       目前僅示範接口與判斷，不破壞現有同步行為。
       ============================================================= */
    (function initLazyLoader(){
        if (window.__lazyInit) return; window.__lazyInit = true;
        const idle = window.requestIdleCallback || function(cb){ return setTimeout(()=>cb({timeRemaining:()=>0}),140); };
        const queue = [];
        function run(){ while(queue.length){ const job = queue.shift(); try { job(); } catch(e){ console.warn('[lazyJob error]', e); } } }
        idle(run);
        window.__lazyQueue = (fn)=>{ if(typeof fn==='function') queue.push(fn); };
        // 延遲 Supabase (若非立即需要排行榜) - 等互動後或 idle
        if(!window.__deferSupabaseApplied){
            window.__deferSupabaseApplied = true;
            const supabaseScript = document.querySelector('script[src*="supabase-js"]');
            if(supabaseScript){
                // 標記暫緩初始化：在真正需要線上排行榜時再啟動（此處僅示意 hook）
                window.__lazyQueue(()=>{ if(window.__debugPerf) console.log('[lazy] Supabase ready (placeholder hook)'); });
            }
        }
        // 示例：延後載入（未真正動態載入檔案，只示範可插點）
        __lazyQueue(()=>{ if(window.__debugPerf) console.log('[lazy] placeholder: future achievement module load'); });
        // 滑鼠首次移動或首次按鍵觸發再排程更多低優先任務
        const onceUserActive = ()=>{ idle(run); window.removeEventListener('mousemove', onceUserActive, {passive:true}); window.removeEventListener('keydown', onceUserActive, {passive:true}); };
        window.addEventListener('mousemove', onceUserActive, { passive:true, once:true });
        window.addEventListener('keydown', onceUserActive, { passive:true, once:true });
    })();
    // 裝備課程：改為外部 JSON 載入（equip-course-growth.json）並建立多格式引用對照
    ;(function(){
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
                // 轉換成 key -> 完整標點串
                // 若 JSON entry 提供 full (含正確標點) 則直接使用；否則回退以 verses 片段用頓號/逗號合併並補句號。
                const punct = {};
                ['growth','disciple','leader'].forEach(group=>{
                    if (!Array.isArray(data[group])) return;
                    data[group].forEach(entry=>{
                        if (!entry || !entry.book || !entry.chapter || !Array.isArray(entry.verses)) return;
                        const key = `${entry.book} ${entry.chapter}`.trim();
                        // 嘗試從原 verses 判斷是否已含終止符號
                        const raw = entry.verses.map(s=>s.trim()).filter(Boolean);
                        let text = (entry.full && entry.full.trim()) || raw.join('，');
                        if (text && !/[。！？!]$/.test(text)) text += '。';
                        punct[key] = text;
                    });
                });
                buildAliases(punct);
                window.__equipPunctMap = punct;
                // 暴露原始資料供未來功能（例如顯示分段排序題目）直接使用未標點 fragments
                window.__equipCourseRaw = data;
                window.__equipBookAbbrevMap = abbrev;
                window.dispatchEvent(new CustomEvent('equipPunctReady'));
            } catch(e){
                console.warn('equip-course json load error', e);
                window.__equipPunctMap = window.__equipPunctMap || {}; // 保留為空避免崩潰
            }
        }
        loadEquipPunct();
    })();
        // Pre-pick and preload startup images as early as possible to avoid late appearance on slow networks.
        (function(){
            try {
                var pick = Math.ceil(Math.random() * 4); // 1..4
                window.__startupPick = pick;
                // Decide theme and image set up-front so overlay can swap instantly later
                var isDark = (pick === 1 || pick === 2); // 1,2 -> dark backdrop; 3,4 -> light backdrop
                window.__startupIsDark = isDark;
                // Map to available assets in /logo (avoid non-existent logo0-*.png)
                var logo = isDark
                    ? (pick === 1 ? 'logo/logo1-light.png' : 'logo/logo2-light.png')
                    : (pick === 3 ? 'logo/logo1-dark.png'  : 'logo/logo2-dark.png');
                var word = isDark
                    ? (pick === 1 ? 'logo/word1-light.png' : 'logo/word2-light.png')
                    : (pick === 3 ? 'logo/word1-dark.png'  : 'logo/word2-dark.png');
                // Use single brand mark for both themes (existing file)
                // Brand corner: use theme-inverted logo0 to ensure contrast
                var brand = isDark ? 'logo/logo0-light.png' : 'logo/logo0-dark.png';
                window.__startupLogoSrc = logo;
                window.__startupWordSrc = word;
                window.__startupBrandSrc = brand;
                // Preload a few likely startup images to reduce initial flicker
                try {
                    var preloads = [logo, word, brand];
                    preloads.forEach(function(href){
                        var l = document.createElement('link');
                        l.rel = 'preload'; l.as = 'image'; l.href = href;
                        if (document.head) document.head.appendChild(l);
                    });
                } catch (e) { /* no-op */ }
            } catch (e) { /* no-op */ }
        })();
