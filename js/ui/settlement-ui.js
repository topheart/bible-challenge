            // #region 成就UI模組
            // ===== 成就渲染 =====
                        function renderAchievementsIntoModal(){
                try {
                    const host = document.getElementById('settlementAchievements');
                    if (!host) return;
                    host.innerHTML = '';
                    const suppress = !!(typeof gameState === 'object' && gameState && gameState.suppressSettlementAchievements);
                    const list = (gameState && Array.isArray(gameState.unlockedAchievements)) ? gameState.unlockedAchievements : [];
                    try { console.log('[ACHV][UI] rendering settlement achievements', list.map(x=>({id:x.id,dt:x.displayTier,t:x.tier}))); } catch(_) {}
                    
                    if (suppress || list.length === 0) {
                        try { window.dispatchEvent(new CustomEvent('achievementsAnimationStarted')); } catch(_) {}
                        try { window.dispatchEvent(new CustomEvent('achievementsAnimationDone')); } catch(_) {}
                        host.style.display = 'none';
                        return;
                    }
                    
                    host.style.display = 'block';
                    
                    // Header wrap
                    const wrap = document.createElement('div');
                    wrap.className = 'w-full mb-4 flex flex-col items-center gap-1';
                    const title = document.createElement('div');
                    title.className = 'text-xl font-black text-gray-800 tracking-wide';
                    title.textContent = '此局勳章';
                    const subText = document.createElement('div');
                    subText.className = 'text-xs text-gray-500 font-bold block';
                    subText.textContent = '已達到最高水準成就';
                    wrap.appendChild(title);
                    wrap.appendChild(subText);
                    host.appendChild(wrap);

                    // Separate T1/T2 from T3/T4/T5 to emphasize top tier achievements
                    const topTier = [];
                    const otherTier = [];
                    for(const a of list) {
                        const dt = (typeof getDisplayTier === 'function') ? getDisplayTier(a) : 5;
                        if (dt <= 2) {
                            topTier.push({a, dt});
                        } else {
                            otherTier.push({a, dt});
                        }
                    }

                    // Render top tier in large size, potentially with extra shaking/animations
                    if (topTier.length > 0) {
                        topTier.sort((x, y) => x.dt - y.dt);
                        const topGrid = document.createElement('div');
                        topGrid.className = 'flex flex-wrap justify-center gap-4 mb-5 w-full';
                        for(const item of topTier) {
                            const a = item.a;
                            const dt = item.dt;
                            const card = document.createElement('div');
                            card.className = `achv-card rarity-t${dt} relative flex flex-col items-center px-4 py-4 rounded-xl border border-white/40 shadow-xl overflow-hidden min-w-[140px]`;
                            
                            // Visual enhancements inside standard settlement UI
                            try { if(typeof window.__injectAchvDecor === 'function') window.__injectAchvDecor(card); } catch(_) {}
                            
                            const iconBox = document.createElement('div');
                            iconBox.className = 'achv-icon w-12 h-12 flex items-center justify-center filter drop-shadow z-10';
                            iconBox.innerHTML = (typeof getAchievementIcon === 'function') ? getAchievementIcon(a) : '';
                            const nameEl = document.createElement('div');
                            nameEl.className = 'text-base font-extrabold text-white drop-shadow mt-2 z-10';
                            nameEl.textContent = a.name;
                            const descEl = document.createElement('div');
                            descEl.className = 'text-[11px] text-white/90 leading-tight block z-10 mt-1 max-w-[120px] text-center font-bold';
                            descEl.textContent = a.desc || '';
                            card.appendChild(iconBox);
                            card.appendChild(nameEl);
                            card.appendChild(descEl);
                            // Set custom property to allow CSS to do sequential bounce
                            card.style.setProperty('--popDelay', topGrid.childElementCount * 0.2 + 's');
                            card.classList.add('achv-pop-in-large');
                            topGrid.appendChild(card);
                        }
                        host.appendChild(topGrid);
                    }

                    // Render other tiers as standard compact cards
                    if (otherTier.length > 0) {
                        otherTier.sort((x, y) => x.dt - y.dt);
                        const grid = document.createElement('div');
                        grid.className = 'grid grid-cols-2 lg:grid-cols-3 gap-2 w-full';
                        let i = 0;
                        for(const item of otherTier) {
                            const a = item.a;
                            const dt = item.dt;
                            const card = document.createElement('div');
                            card.className = `achv-card min-w-0 flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm rarity-t${dt} relative overflow-hidden`;
                            
                            try { if(typeof window.__injectAchvDecor === 'function') window.__injectAchvDecor(card); } catch(_) {}

                            const iconBox = document.createElement('div');
                            iconBox.className = 'achv-icon w-8 h-8 flex-shrink-0 flex items-center justify-center z-10 drop-shadow-sm';
                            iconBox.innerHTML = (typeof getAchievementIcon === 'function') ? getAchievementIcon(a) : '';
                            const info = document.createElement('div');
                            info.className = 'flex flex-col min-w-0 z-10 flex-1 leading-tight';
                            const nameEl = document.createElement('div');
                            nameEl.className = 'text-sm font-extrabold text-white drop-shadow-sm truncate';
                            nameEl.textContent = a.name;
                            const descEl = document.createElement('div');
                            descEl.className = 'text-[10px] text-white/90 truncate font-bold';
                            descEl.textContent = a.desc || '';
                            info.appendChild(nameEl);
                            info.appendChild(descEl);
                            card.appendChild(iconBox);
                            card.appendChild(info);
                            card.style.setProperty('--popDelay', (topTier.length * 0.15 + i * 0.08) + 's');
                            card.classList.add('achv-pop-in-small');
                            grid.appendChild(card);
                            i++;
                        }
                        host.appendChild(grid);
                    }

                    if (typeof window.animateSettlementAchievements === 'function') {
                        setTimeout(()=>{ try { window.animateSettlementAchievements(); } catch(_) {} }, 120);
                    } else {
                        try { window.dispatchEvent(new CustomEvent('achievementsAnimationStarted')); setTimeout(()=> window.dispatchEvent(new CustomEvent('achievementsAnimationDone')), 500); } catch(_) {}
                    }
                } catch(e){ console.warn('renderAchievementsIntoModal error', e); }
            }
                window.animateSettlementAchievements = function(){
                    try {
                        const grid = document.getElementById('achievementGrid'); if(!grid) return;
                        const cards = Array.from(grid.querySelectorAll('.achv-card')); if(!cards.length) return;
                        // 減少動態：直接顯示
                        if (typeof getReducedMotion==='function' && getReducedMotion()) {
                            cards.forEach(c=>{ c.style.opacity=''; c.style.transform=''; c.style.transition=''; });
                            return;
                        }
                        // 動態附加（一次性）增強樣式：影響爆光、定位特效與火苗
                        if(!document.getElementById('achvEnhanceStyles')){
                            const st=document.createElement('style'); st.id='achvEnhanceStyles'; st.textContent=`
/* 成就進場定位特效（移除火苗） */
.achv-card{position:relative;overflow:hidden;}
@keyframes achvImpact{0%{transform:translate(-50%,-50%) scale(.3);opacity:.75;}45%{opacity:1;}70%{opacity:.55;}100%{transform:translate(-50%,-50%) scale(1.45);opacity:0;}}
.achv-impact-ring{position:absolute;left:50%;top:50%;width:140%;height:140%;border-radius:50%;pointer-events:none;mix-blend-mode:screen;animation:achvImpact 900ms ease-out forwards;box-shadow:0 0 14px 4px rgba(255,255,255,0.35) inset,0 0 32px 8px rgba(255,255,255,0.18);} 
@keyframes achvPop{0%{transform:scale(1);}38%{transform:scale(1.09);}68%{transform:scale(.985);}100%{transform:scale(1);} }
.achv-lock-pop{animation:achvPop 520ms cubic-bezier(.25,1.4,.4,1);}
.achv-card.rarity-t1{z-index:10;}
`; document.head.appendChild(st);
                        }
                        // 長時序設定：更平滑、避免同幀大量 transition 競爭造成卡頓
                        const baseDur = 1400; // 基礎位移+淡入時間（ms）
                        const extraByTier = {1:420,2:360,3:280,4:200,5:160};
                        const dyByTier = {1:48,2:42,3:36,4:30,5:26};
                        const scaleByTier = {1:0.94,2:0.95,3:0.955,4:0.965,5:0.97};
                        const stagger = 120; // 單卡延遲間隔（ms）
                        const maxDelay = 4000; // 安全上限
                        const colorByTier = {
                            1:'linear-gradient(135deg,#ffecd1,#ff9d42 40%,#ff5b00 70%)',
                            2:'linear-gradient(135deg,#ede7ff,#b69bff 45%,#8457ff 75%)',
                            3:'linear-gradient(135deg,#e0ecff,#9bc5ff 45%,#4d85ff 75%)',
                            4:'linear-gradient(135deg,#e8f5f0,#b7e3d3 45%,#6ec7ac 75%)',
                            5:'linear-gradient(135deg,#f1f5f9,#d4dbe3 45%,#9aa4b1 75%)'
                        };
                        // 初始狀態批次設定（減少 layout thrash）
                        for (const card of cards){
                            const dt = parseInt(card.dataset.dt||'4',10)||4;
                            const dy = dyByTier[dt]||32;
                            const sc = scaleByTier[dt]||0.96;
                            card.style.transition='none';
                            // 已在 render 時 opacity:0; visibility:hidden
                            card.style.transform=`translateY(${dy}px) scale(${sc})`;
                            card.style.willChange='transform,opacity';
                            card.__achvFinalized=false;
                        }
                        // 雙 rAF 確保初始樣式生效
                        requestAnimationFrame(()=>{
                            requestAnimationFrame(()=>{
                                const startTs = performance.now();
                                cards.forEach((card,i)=>{
                                    const dt = parseInt(card.dataset.dt||'4',10)||4;
                                    const dur = baseDur + (extraByTier[dt]||0);
                                    const delay = Math.min(maxDelay, i*stagger);
                                    card.style.transition = `transform ${dur}ms cubic-bezier(.16,.84,.3,1), opacity ${Math.round(dur*0.65)}ms ease-out`;
                                    card.style.transitionDelay = `${delay}ms`;
                                    // 最終狀態
                                    card.style.visibility='visible';
                                    card.style.opacity='1';
                                    card.style.transform='translateY(0) scale(1)';
                                    const finalize = ()=>{
                                        if(card.__achvFinalized) return; card.__achvFinalized=true;
                                        try { card.style.willChange=''; } catch(_){ }
                                        // 定位爆光：加入環形衝擊（顏色依稀有度）
                                        try {
                                            const dtNow = parseInt(card.dataset.dt||'4',10)||4;
                                            const ring=document.createElement('div');
                                            ring.className='achv-impact-ring';
                                            ring.style.background=colorByTier[dtNow]||'linear-gradient(135deg,#fff,#ccc)';
                                            ring.style.border='2px solid rgba(255,255,255,0.65)';
                                            card.appendChild(ring);
                                            setTimeout(()=>{ try { ring.remove(); } catch(_){} }, 1200);
                                        } catch(_) {}
                                        // 卡片彈性定位強調
                                        try { card.classList.add('achv-lock-pop'); setTimeout(()=>{ card.classList.remove('achv-lock-pop'); }, 900); } catch(_){}
                                        //（原 T1 火苗效果已移除）
                                    };
                                    const onEnd=(ev)=>{ if(ev.propertyName==='transform'){ finalize(); card.removeEventListener('transitionend', onEnd); } };
                                    card.addEventListener('transitionend', onEnd);
                                });
                                // 若需要之後與數字動畫串聯，可在這裡觸發事件
                                try { window.dispatchEvent(new CustomEvent('achievementsAnimationStarted')); } catch(_) {}
                            });
                        });
                        //（原 startEmbers 已刪除）
                    } catch(e){ /* ignore */ }
                }
            // 結算視窗：點擊勳章開啟「成就詳情」子視窗

            // 成就詳情渲染 & 開啟
            ;(function(){
                const detailId = 'achievementDetailModal';
                function $(id){ return document.getElementById(id); }
                function elIcon(){ return $('achievementDetailIcon'); }
                function elTitle(){ return $('achievementDetailTitle'); }
                function elMeta(){ return $('achievementDetailMeta'); }
                function elDesc(){ return $('achievementDetailDesc'); }
                

                function getDefById(id){ try { return (AchievementManager && AchievementManager.defs || []).find(d=>d.id===id) || null; } catch(_) { return null; } }
                function esc(str){ return String(str).replace(/[&<>"']/g, s=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s])); }
                function tierBadge(t){
                    // Force black text for badges regardless of tier
                    const map={
                        1:{text:'T1',cls:'bg-amber-50 text-black border-amber-200'},
                        2:{text:'T2',cls:'bg-purple-50 text-black border-purple-200'},
                        3:{text:'T3',cls:'bg-indigo-50 text-black border-indigo-200'},
                        4:{text:'T4',cls:'bg-gray-100 text-black border-gray-200'},
                        5:{text:'T5',cls:'bg-emerald-50 text-black border-emerald-200'}
                    };
                    const x = map[t] || map[4];
                    return `<span class="inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-md border ${x.cls}">${x.text}</span>`;
                }
                function modeBadge(mode){
                    const map={ classic:{text:'闖關',cls:'bg-rose-50 text-rose-700 border-rose-200'}, survival:{text:'生存',cls:'bg-emerald-50 text-emerald-700 border-emerald-200'}, any:{text:'共通',cls:'bg-gray-50 text-gray-700 border-gray-200'} };
                    const x = map[mode] || map.any; return `<span class="inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-md border ${x.cls}">${x.text}</span>`;
                }
                function labelKey(k){
                    const map={
                        answeredQuestions:'完成題數', totalQuestions:'總題數', correctCount:'答對題數', wrongCount:'答錯題數',
                        accuracy:'正確率', avgAnswerMs:'平均作答', fastestAnswerMs:'最快作答', slowestAnswerMs:'最慢作答',
                        longestStreak:'最高連擊', maxComboReached:'最高連擊數', maxConsecutivePerfect:'連續完美層數', levelsPerfectCount:'完美層數',
                        hintsUsed:'使用提示', survivalDuration:'存活時間', maxTime:'時間峰值', maxTimeOverStart:'超過起始值峰值', timeStdDev:'時間標準差',
                        ultraFastCorrectMax:'極速連擊峰值'
                    };
                    return map[k] || k;
                }
                function fmt(metrics, key){
                    if (!metrics) return '-'; const v = metrics[key]; if (v==null) return '-';
                    if (key==='accuracy') return Math.round((v||0)*100) + '%';
                    if (/Ms$/.test(key)) return (typeof v==='number'? (v/1000).toFixed(2): v) + ' 秒';
                    if (/time|Time|Duration|Seconds/i.test(key)) return (typeof v==='number'? v.toFixed(0): v) + ' 秒';
                    return String(v);
                }
                function humanize(rule, m){
                    if (!rule) return '';
                    try {
                        if (rule.type==='metric'){
                            const my = fmt(m, rule.field);
                            return `本局「${labelKey(rule.field)}」 ${rule.op} ${rule.value}（你的：${esc(my)}）`;
                        } else if (rule.type==='and' && Array.isArray(rule.children)){
                            return rule.children.map(r=> humanize(r,m)).filter(Boolean).join('\n');
                        } else if (rule.type==='or' && Array.isArray(rule.children)){
                            const parts = rule.children.map(r=> humanize(r,m)).filter(Boolean);
                            return ['滿足以下任一條件：', ...parts.map(p=>'・'+p)].join('\n');
                        } else if (rule.type==='custom'){
                            return '';
                        }
                    } catch(_) { return ''; }
                    return '';
                }
                function setIcon(def){
                    const box = elIcon();
                    try {
                        box.innerHTML = (typeof getAchievementIcon==='function')? getAchievementIcon(def) : '🏅';
                        // Make SVG icon slightly larger to match settlement cards
                        box.querySelector('svg')?.classList?.add('w-7','h-7');
                    } catch(_) { box.textContent='🏅'; }
                }
                function openDetail(def){
                    if (!def) return;
                    setIcon(def);
                    elTitle().textContent = def.name || def.title || def.id;
                    const dt = (def.displayTier!=null)? def.displayTier : ((typeof getDisplayTier==='function')? getDisplayTier(def) : (6 - Math.max(1, Math.min(5, def.tier||1))));
                    elMeta().innerHTML = `${tierBadge(dt)} <span class="mx-1">·</span> ${modeBadge(def.mode||'any')}`;
                    elDesc().textContent = def.desc || def.description || '';
                    try {
                        const card = document.getElementById('achievementDetailCard');
                        if (card) {
                            // Detail-only safeguard: ensure any decorative layers are absolutely positioned (no layout impact)
                            try{
                                if (!document.getElementById('achvDetailFixStyles')){
                                    const st = document.createElement('style');
                                    st.id = 'achvDetailFixStyles';
                                    st.textContent = `
/* Ensure injected FX layers in detail card never affect layout height */
#achievementDetailCard > .vignette,
#achievementDetailCard > .corner-glint,
#achievementDetailCard > .tier-particles,
#achievementDetailCard > .flame-layer,
#achievementDetailCard > .heaven-clouds,
#achievementDetailCard > .god-rays,
#achievementDetailCard > .starfield,
#achievementDetailCard > .nebula,
#achievementDetailCard > .meteor,
#achievementDetailCard > .meteor-tilt,
#achievementDetailCard > .wave-field,
#achievementDetailCard > .leaf-field,
#achievementDetailCard > .edge-sweep{ position:absolute; pointer-events:none; z-index:0; border-radius:inherit; }
#achievementDetailCard .achv-icon,
#achievementDetailCard #achievementDetailTitle,
#achievementDetailCard #achievementDetailMeta,
#achievementDetailCard #achievementDetailDesc{ position:relative; z-index:2; }
`;
                                    document.head.appendChild(st);
                                }
                            }catch(_){ /* noop */ }
                            // Remove any stale decorative layers from previous opens to avoid stacking/misaligned static blocks
                            try{
                                const staleSelectors = ['.vignette','.corner-glint','.tier-particles','.flame-layer','.heaven-clouds','.god-rays','.starfield','.nebula','.meteor','.meteor-tilt','.wave-field','.leaf-field','.edge-sweep'];
                                staleSelectors.forEach(sel=>{
                                    card.querySelectorAll(`:scope > ${sel}`).forEach(n=>{ try{ n.remove(); }catch(_){ } });
                                });
                            }catch(_){ /* noop */ }
                            card.classList.remove('rarity-t1','rarity-t2','rarity-t3','rarity-t4','rarity-t5');
                            card.classList.add(`rarity-t${dt}`);
                            try {
                                window.__injectAchvDecor(card);
                                const deco = card.querySelector(':scope > .achv-decor');
                                if (deco) { deco.style.zIndex='0'; deco.style.opacity='0.55'; }
                                const contentChildren = card.querySelectorAll('#achievementDetailIcon,#achievementDetailTitle,#achievementDetailMeta,#achievementDetailDesc');
                                contentChildren.forEach(n=>{ try { n.style.position='relative'; n.style.zIndex='2'; } catch(_) {} });
                            } catch(_) {}
                            if (dt===3) {
                                try { if (!card.querySelector(':scope > .edge-sweep')){ const es=document.createElement('div'); es.className='edge-sweep'; card.appendChild(es); } } catch(_) {}
                            }
                        }
                    } catch(_) {}
                    try {
                        // Ensure detail modal is opened as top-most
                        openModal(detailId);
                        const detail = document.getElementById(detailId);
                        if (detail) detail.style.zIndex = '12030';
                    } catch(_) {
                        const modal=$(detailId);
                        if (modal) { modal.classList.remove('hidden'); modal.style.zIndex='12030'; }
                    }
                }
                window.openAchievementDetail = function(id){ const def = getDefById(id); openDetail(def); };
            })();
            // #endregion



