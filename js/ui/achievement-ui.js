    // 勳章一覽渲染：列出所有定義（名稱 + 圖示 + 條件），含分類切換
    (function(){
        function getDefs(){
            try { return (typeof AchievementManager !== 'undefined' && AchievementManager.defs) ? AchievementManager.defs : []; } catch(_) { return []; }
        }
        function ensureCategory(a){
            if (a.category) return a.category;
            try { if (a.mode==='survival') return 'survival'; if (a.mode==='any') return 'any'; return 'classic'; } catch(_) { return 'classic'; }
        }
        function updateCatalogTabCounts(){
            try {
                const tabs = document.getElementById('achvCatalogTabs'); if (!tabs) return;
                const defs = getDefs();
                const totals = {all:0,classic:0,survival:0,any:0};
                defs.forEach(d=>{ const c=ensureCategory(d); totals[c] = (totals[c]||0)+1; totals.all++; });
                tabs.querySelectorAll('button[data-achv-cat]').forEach(btn=>{
                    const cat = btn.getAttribute('data-achv-cat');
                    const span = btn.querySelector('[data-role="count"]');
                    if (span) span.textContent = ` ${totals[cat]||0}`;
                });
                // Update totals header text if present
                const hdr = document.getElementById('achvTotalsHeader');
                if (hdr) {
                    const map = { all:'全部', any:'共通', classic:'闖關', survival:'生存' };
                    Object.keys(map).forEach(k=>{
                        const el = hdr.querySelector(`.val[data-role="${k}"]`);
                        if (el) el.textContent = String(totals[k]||0);
                    });
                }
            } catch(_) {}
        }
        // 將高級化飾層注入成就卡（置於最前，避免蓋住內容）
        if (!window.__injectAchvDecor) {
            window.__injectAchvDecor = function(card){
                try{
                    if (!card) return;
                    const isToast = card.classList && /\bachievement-toast\b/.test(card.className);
                    const isFlash = card.classList && /\bflash-medal\b/.test(card.className);
                    // vignette
                    if (!card.querySelector(':scope > .vignette')){
                        const d=document.createElement('div'); d.className='vignette'; card.insertBefore(d, card.firstChild);
                    }
                    // corner glints
                    if (!card.querySelector(':scope > .corner-glint.gl1')){
                        const g1=document.createElement('div'); g1.className='corner-glint gl1'; card.insertBefore(g1, card.firstChild);
                    }
                    if (!card.querySelector(':scope > .corner-glint.gl2')){
                        const g2=document.createElement('div'); g2.className='corner-glint gl2'; card.insertBefore(g2, card.firstChild);
                    }
                    // tier particles
                    if (!card.querySelector(':scope > .tier-particles')){
                        const p=document.createElement('div'); p.className='tier-particles'; card.insertBefore(p, card.firstChild);
                    }
                    // rarity-specific layers
                    const cls = card.className || '';
                    const isT1 = /\brarity-t1\b/.test(cls);
                    // 互換後 T2 與 T3 視覺：原本天堂(雲/光束)屬於 T2 -> 現在給 T3；原本星空/nebula/meteor 屬於 T3 -> 現在給 T2
                    const isT2 = /\brarity-t2\b/.test(cls); // 現在代表「星空 / nebula / meteor」
                    const isT3 = /\brarity-t3\b/.test(cls); // 現在代表「天堂雲海 + 光束」
                    const isT4 = /\brarity-t4\b/.test(cls);
                    const isT5 = /\brarity-t5\b/.test(cls);
                    // T1 flame
                    if (isT1 && !card.querySelector(':scope > .flame-layer')){
                        const flame=document.createElement('div'); flame.className='flame-layer';
                        // add multiple flame blobs for stronger, irregular effect
                        for(let i=0;i<22;i++){
                            const fb=document.createElement('div'); fb.className='flame-blob';
                            const size = 22 + Math.random()*30; // px
                            const left = Math.random()*80 + 10; // %
                            const delay = (Math.random()*1.2).toFixed(2)+'s';
                            const dur = (1.2 + Math.random()*1.1).toFixed(2)+'s';
                            fb.style.width = size+'px'; fb.style.height=(size*1.28)+'px';
                            fb.style.left = left+'%'; fb.style.bottom = (Math.random()*10)+'%';
                            fb.style.opacity = String(0.5 + Math.random()*0.4);
                            fb.style.animationDelay = delay; fb.style.animationDuration = dur;
                            flame.appendChild(fb);
                        }
                        card.insertBefore(flame, card.firstChild);
                    }
                    // (交換後) T3 edge sweep + heaven layers
                    if (isT3){
                        if (!card.querySelector(':scope > .edge-sweep')){
                            const es=document.createElement('div'); es.className='edge-sweep'; card.appendChild(es);
                        }
                        if (!card.querySelector(':scope > .heaven-clouds')){
                            const clouds=document.createElement('div'); clouds.className='heaven-clouds';
                            clouds.style.setProperty('--cloudDurL', (10 + Math.random()*3).toFixed(2)+'s');
                            clouds.style.setProperty('--cloudDurR', (11 + Math.random()*3).toFixed(2)+'s');
                            // 追加雲帶層：2~3 層均分
                            const bandCount = 2 + Math.floor(Math.random()*2);
                            for(let bi=0; bi<bandCount; bi++){
                                const b=document.createElement('div'); b.className='cloud-band cb'+(bi+1);
                                const topPct = 12 + (bi+0.5)*(60/(bandCount));
                                b.style.top = topPct+'%';
                                b.style.setProperty('--cbDur', (11 + Math.random()*3).toFixed(2)+'s');
                                b.style.setProperty('--cbDelay', (Math.random()*1.2).toFixed(2)+'s');
                                clouds.appendChild(b);
                            }
                            card.insertBefore(clouds, card.firstChild);
                        }
                        if (!card.querySelector(':scope > .god-rays')){
                            const rays=document.createElement('div'); rays.className='god-rays';
                            // 生成 3~5 條垂直 ray
                            const n = 3 + Math.floor(Math.random()*3);
                            for(let i=0;i<n;i++){
                                const r=document.createElement('div'); r.className='ray';
                                const left = Math.floor(8 + Math.random()*84); // 8%~92%
                                const w = Math.floor(6 + Math.random()*12);   // 6%~18%
                                r.style.left = left+'%'; r.style.width = w+'%';
                                r.style.setProperty('--rDur', (5.2 + Math.random()*2.4).toFixed(2)+'s');
                                r.style.setProperty('--rDelay', (Math.random()*1.6).toFixed(2)+'s');
                                rays.appendChild(r);
                            }
                            card.insertBefore(rays, card.firstChild);
                        }
                    }
                    // (交換後) T2 starfield + nebula + meteor + meteor-shower
                    if (isT2 && !card.querySelector(':scope > .starfield')){
                        const sf=document.createElement('div'); sf.className='starfield';
                        // add stars at random positions（密度依情境調整）
                        const starCount = isToast || isFlash ? 14 : 26;
                        for(let i=0;i<starCount;i++){
                            const s=document.createElement('div'); s.className='s';
                            if(i%3===0) s.classList.add('s2');
                            if(i%5===0) s.classList.add('s3');
                            s.style.left = Math.floor(Math.random()*96+2)+'%';
                            s.style.top = Math.floor(Math.random()*90+5)+'%';
                            sf.appendChild(s);
                        }
                        card.insertBefore(sf, card.firstChild);
                        // nebula
                        const nb=document.createElement('div'); nb.className='nebula'; card.insertBefore(nb, card.firstChild);
                        // meteor (rare) 30% chance
                        if (Math.random() < 0.3){ const mt=document.createElement('div'); mt.className='meteor'; mt.style.setProperty('--mDur', (1.6+Math.random()*0.8)+'s'); mt.style.setProperty('--mDelay', (3+Math.random()*5)+'s'); card.insertBefore(mt, card.firstChild); }
                        // meteor shower：多條白色長尾，低密度（2~4），置於旋轉包裹中
                        if (!card.querySelector(':scope > .meteor-tilt')){
                            const tilt=document.createElement('div'); tilt.className='meteor-tilt';
                            const ms=document.createElement('div'); ms.className='meteor-shower';
                            const cnt = 3 + Math.floor(Math.random()*3); // 3~5 條
                            const used = [];
                            for(let i=0;i<cnt;i++){
                                const m=document.createElement('div'); m.className='meteor-line';
                                m.style.setProperty('--msDur', (1.8+Math.random()*1.6)+'s');
                                m.style.setProperty('--msDelay', (2+Math.random()*6)+'s');
                                // 均分至全幅（避免集中），簡單避開彼此過近
                                let top = Math.floor(Math.random()*100);
                                let left = Math.floor(Math.random()*100);
                                let tries=0;
                                while(tries<10 && used.some(([t,l])=> Math.abs(t-top)<12 && Math.abs(l-left)<18)){
                                    top = Math.floor(Math.random()*100); left = Math.floor(Math.random()*100); tries++;
                                }
                                used.push([top,left]);
                                m.style.top = top+'%';
                                m.style.left = left+'%';
                                ms.appendChild(m);
                            }
                            tilt.appendChild(ms);
                            card.insertBefore(tilt, card.firstChild);
                        }
                    }
                    // T4 side waves field
                    if (isT4 && !card.querySelector(':scope > .wave-field')){
                        const f=document.createElement('div'); f.className='wave-field';
                        const w1=document.createElement('div'); w1.className='wave-layer w1'; w1.style.setProperty('--wDur', (isToast||isFlash)?'8s':'9s');
                        const w2=document.createElement('div'); w2.className='wave-layer w2'; w2.style.setProperty('--wDur', (isToast||isFlash)?'10s':'11s');
                        const w3=document.createElement('div'); w3.className='wave-layer w3'; w3.style.setProperty('--wDur', (isToast||isFlash)?'12s':'13s');
                        f.appendChild(w1); f.appendChild(w2); f.appendChild(w3);
                        card.insertBefore(f, card.firstChild);
                    }
                    // T5 leaf field
                    if (isT5 && !card.querySelector(':scope > .leaf-field')){
                        const f=document.createElement('div'); f.className='leaf-field';
                        const N = (isToast || isFlash) ? 4 : 7; // 降低密度
                        for(let i=0;i<N;i++){
                            const leaf=document.createElement('div'); leaf.className='leaf';
                            // 分散生成（避免集中）
                            const leftBase = (i+0.5)/N; // 分段中心
                            const jitter = (Math.random()*0.18 - 0.09); // ±9%
                            const leftPct = Math.max(0, Math.min(1, leftBase + jitter))*100;
                            leaf.style.left = leftPct+'%';
                            // 更快更自然的下落時長，並保留些微隨機
                            leaf.style.setProperty('--lDur', (3.2+Math.random()*1.6)+'s');
                            // 延遲更分散，避免同時出現
                            leaf.style.setProperty('--lDelay', (Math.random()*6)+'s');
                            leaf.style.opacity = String(0.6 + Math.random()*0.35);
                            f.appendChild(leaf);
                        }
                        card.appendChild(f);
                    }
                }catch(_){}
            }
        }

        function renderAchievementsCatalog(){
            try{
                const host=document.getElementById('achievementsCatalog'); if(!host) return;
                host.innerHTML='';
                const defs = getDefs();
                const cat = window.__achvCatalogCat || 'all';
                const list = defs.filter(a=> cat==='all' ? true : ensureCategory(a)===cat);
                // 依稀有度分組 T1..T5，再各組內照名稱排序
                const groups = new Map();
                list.forEach(a=>{
                    const dt = (typeof getDisplayTier==='function') ? getDisplayTier(a) : (6 - Math.max(1, Math.min(5, a.tier||1)));
                    if (!groups.has(dt)) groups.set(dt, []);
                    groups.get(dt).push(a);
                });
                const orderedTiers = [1,2,3,4,5].filter(t=> groups.has(t));
                orderedTiers.forEach(tier=>{
                    const section=document.createElement('section'); section.className='achv-section';
                    // Header
                    const header=document.createElement('div'); header.className='achv-section-header';
                    const titleWrap=document.createElement('div'); titleWrap.className='title';
                    const dot=document.createElement('span'); dot.style.cssText='width:.6rem;height:.6rem;border-radius:999px;background:var(--rim,#93c5fd); display:inline-block; box-shadow:0 0 0 1px rgba(0,0,0,.08) inset;';
                    const label=document.createElement('div'); label.className='text-sm font-extrabold tracking-wide'; label.textContent = `T${tier}`;
                    titleWrap.appendChild(dot); titleWrap.appendChild(label);
                    const count=document.createElement('div'); count.className='count';
                    const arr = groups.get(tier).sort((a,b)=> a.name.localeCompare(b.name,'zh-Hant'));
                    count.textContent = `${arr.length} 項`;
                    header.appendChild(titleWrap); header.appendChild(count);
                    // Divider
                    const divider=document.createElement('div'); divider.className='soft-divider my-2';
                    // Grid
                    const grid=document.createElement('div'); grid.className='achv-grid';
                    grid.style.padding='2px 4px';
                    arr.forEach(a=>{
                        const icon = (typeof getAchievementIcon==='function') ? getAchievementIcon(a) : '★';
                        const dt = tier;
                        const item=document.createElement('div'); item.className=`achv-card rarity-t${dt} flex items-start gap-3`;
                        // 注入飾層
                        try { window.__injectAchvDecor(item); } catch(_) {}
                        // T3 邊緣掃光（互換後天堂視覺移至 T3）
                        if (dt===3 && !item.querySelector(':scope > .edge-sweep')){
                            const es=document.createElement('div'); es.className='edge-sweep'; item.appendChild(es);
                        }
                        const iconBox=document.createElement('div'); iconBox.className='achv-icon'; iconBox.innerHTML=icon;
                        const mid=document.createElement('div'); mid.className='min-w-0 flex-1';
                        const title=document.createElement('div'); title.className='achv-title'; title.textContent=a.name;
                        const desc=document.createElement('div'); desc.className='achv-desc mt-1'; desc.textContent=a.desc||'';
                        const mode=document.createElement('div'); mode.className='achv-mode';
                        mode.textContent = (a.mode==='survival') ? '生存' : (a.mode==='any' ? '共通' : '闖關');
                        item.appendChild(mode); item.appendChild(iconBox); mid.appendChild(title); mid.appendChild(desc); item.appendChild(mid);
                        grid.appendChild(item);
                    });
                    section.appendChild(header); section.appendChild(divider); section.appendChild(grid);
                    host.appendChild(section);
                });
            }catch(e){ console.warn('renderAchievementsCatalog error', e); }
        }
        function wireCatalogTabs(){
            const tabs = document.getElementById('achvCatalogTabs'); if (!tabs || tabs.__wired) return; tabs.__wired = true;
            tabs.addEventListener('click', (e)=>{
                const b = e.target.closest('button[data-achv-cat]'); if(!b) return;
                const cat = b.getAttribute('data-achv-cat');
                window.__achvCatalogCat = cat;
                tabs.querySelectorAll('button[data-achv-cat]').forEach(x=>{
                    const act = x===b;
                    x.setAttribute('aria-pressed', act ? 'true' : 'false');
                    x.setAttribute('aria-selected', act ? 'true' : 'false');
                });
                renderAchievementsCatalog();
            });
            // Keyboard navigation: ArrowLeft/ArrowRight/Home/End
            tabs.addEventListener('keydown', (e)=>{
                const keys = ['ArrowLeft','ArrowRight','Home','End'];
                if (!keys.includes(e.key)) return;
                const btns = Array.from(tabs.querySelectorAll('button[data-achv-cat]'));
                if (!btns.length) return;
                const cur = btns.findIndex(b => b.getAttribute('aria-selected') === 'true');
                let idx = Math.max(0, cur);
                if (e.key === 'ArrowLeft') idx = (cur + btns.length - 1) % btns.length;
                if (e.key === 'ArrowRight') idx = (cur + 1) % btns.length;
                if (e.key === 'Home') idx = 0;
                if (e.key === 'End') idx = btns.length - 1;
                const target = btns[idx];
                if (target) {
                    e.preventDefault();
                    target.focus();
                    target.click();
                }
            });
        }
        // 開啟 Modal 時渲染
        document.addEventListener('click', (e)=>{
            const t=e.target.closest('[data-open-modal]'); if(!t) return;
            const openId=t.getAttribute('data-open-modal');
            if(openId==='achievementsModal') setTimeout(()=>{ 
                updateCatalogTabCounts(); wireCatalogTabs(); renderAchievementsCatalog();
                try { 
                    const tabs = document.getElementById('achvCatalogTabs');
                    const sel = tabs && tabs.querySelector('button[aria-selected="true"]');
                    if (sel) sel.focus();
                } catch(_) {}
            }, 0);
        });
        // 若之後以程式開啟，也可暴露方法
        window.renderAchievementsCatalog = function(){ updateCatalogTabCounts(); wireCatalogTabs(); renderAchievementsCatalog(); };
    })();
