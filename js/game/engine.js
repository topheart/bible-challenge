// Extracted from bible-challenge.html
// Game Engine Core

// Moved to equip.js

        // Helper: render mobile mini level progress placeholders according to level count
        function renderMiniLevelPlaceholders() {
            try {
                const wrap = document.getElementById('levelProgressMini');
                if (!wrap) return;
                const levelCount = getLevelCount();
                // Survival: hide mini progress entirely
                if (!levelCount || isSurvival()) {
                    wrap.classList.add('hidden');
                    wrap.innerHTML = '';
                    return;
                }
                wrap.classList.remove('hidden');
                wrap.innerHTML = '';
                setMiniProgressGridColumns(levelCount);
                for (let i = 0; i < levelCount; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'mini-dot bg-gray-200 border-gray-300';
                    wrap.appendChild(dot);
                }
            } catch (_) { /* ignore */ }
        }

// Moved to survival.js

        // Mobile viewport stability helpers
        (function mobileViewportFix(){
            try {
                const setVH = () => {
                    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
                    document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
                };
                setVH();
                window.addEventListener('resize', setVH, { passive: true });
                if (window.visualViewport) {
                    window.visualViewport.addEventListener('resize', setVH, { passive: true });
                    window.visualViewport.addEventListener('scroll', setVH, { passive: true });
                }

                // Keep --pinned-controls-height in sync with actual bar size
                const updatePinned = () => {
                    const el = document.getElementById('gameControlsPinned');
                    if (!el) return;
                    const h = Math.max(56, el.offsetHeight || 0);
                    document.documentElement.style.setProperty('--pinned-controls-height', `${h}px`);
                };
                updatePinned();
                window.addEventListener('resize', updatePinned, { passive: true });
                const ro = window.ResizeObserver ? new ResizeObserver(updatePinned) : null;
                if (ro) ro.observe(document.body);
                if (ro) ro.observe(document.getElementById('gameControlsPinned'));
            } catch(_) { /* ignore */ }
        })();

// Extracted Main Game Logic
function initializeGame() {
            // 預設：不選罕見度與範圍（讓玩家可直接選擇遊戲模式，特別是生存計時）
            gameState.range = null;
            gameState.rarity = null;
            gameState.mode = null;
            // 初始更新計分規則顯示（時間與基礎分數）
            updateScoreRulesDisplay();
            // 顯式同步時間獎勵說明可視狀態
            const timeRewardNote = document.getElementById('timeRewardNote');
            if (timeRewardNote) timeRewardNote.style.display = gameState.showTimeReward ? 'block' : 'none';
            updateBaseScoreRuleDisplay();
            // ...existing code...
            // 開始畫面按鈕事件
            document.getElementById('startGameBtn').addEventListener('click', startGame);
            // Unlock audio on first gesture
            try { document.getElementById('startGameBtn')?.addEventListener('click', () => SFX.resume()); } catch(_) {}

            // Restore and apply prefs for volume and time-bar visibility (default: volume 0.2, showBar true)
            (function restoreAudioAndTimeBarPrefs(){
                try {
                    const saved = (window.loadSettings ? window.loadSettings() : {});
                    let changed = false;
                    if (typeof saved.volume !== 'number') { saved.volume = 0.2; changed = true; }
                    SFX.setVolume(saved.volume);
                    if (typeof saved.showTimeBar === 'undefined') { saved.showTimeBar = true; changed = true; }
                    if (changed && window.saveSettings) window.saveSettings(saved);
                    try { updateTimeRewardVisibility(); } catch(_) {}
                } catch(_) {}
            })();

            // 難度選擇事件
            document.querySelectorAll('.difficulty-option').forEach(option => {
                option.addEventListener('click', selectDifficulty);
                // keyboard activation (Enter / Space)
                option.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        option.click();
                    }
                });
            });

            // 出題範圍事件
            document.querySelectorAll('.range-option').forEach(option => {
                option.addEventListener('click', selectRange);
                // keyboard activation (Enter / Space)
                option.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        option.click();
                    }
                });
            });
            // 罕見度（排行模式）事件（已隱藏互動；保留節點但禁用）
            document.querySelectorAll('.rarity-option').forEach(option => {
                option.removeEventListener?.('click', selectRarity);
                option.style.pointerEvents = 'none';
                option.classList.add('opacity-50','cursor-not-allowed');
                option.setAttribute('aria-disabled','true');
            });
            // 遊戲模式（闖關/生存）事件
            try {
                const modeClassicBtn = document.getElementById('modeClassicBtn');
                const modeSurvivalBtn = document.getElementById('modeSurvivalBtn');
                const modeDesc = document.getElementById('modeDesc');
                const customAreaCard = document.getElementById('customAreaCard');
                const equipCourseCard = document.getElementById('equipCourseCard');

                // Helper: apply a thick-outline highlight style to the selected home-mode card
                function highlightCard(el, palette) {
                    if (!el) return;
                    const { border = '#64748b', glow = 'rgba(59,130,246,0.25)' } = palette || {};
                    el.style.borderWidth = '4px';
                    el.style.borderColor = border;
                    el.style.boxShadow = `0 6px 18px ${glow}`;
                }
                function resetCard(el) {
                    if (!el) return;
                    el.style.borderWidth = '';
                    el.style.borderColor = '';
                    el.style.boxShadow = '';
                }

                // Unified exclusive selector for the four home modes:
                // classic, survival, equip, custom
                function selectHomeMode(kind) {
                    // Clear UI highlights for all
                    resetCard(modeClassicBtn);
                    resetCard(modeSurvivalBtn);
                    resetCard(customAreaCard);
                    resetCard(equipCourseCard);

                    // 轉換模式前，若先前有選裝備班級，清除待選與高亮（與其他模式互斥）
                    try {
                        if (kind !== 'equip') {
                            gameState.__pendingEquipTier = null;
                            highlightSelectedEquipTier(null);
                            if (equipCourseCard) {
                                equipCourseCard.style.borderWidth=''; equipCourseCard.style.borderColor=''; equipCourseCard.style.boxShadow='';
                                equipCourseCard.setAttribute('aria-pressed','false');
                            }
                        }
                    } catch(_) {}

                    // Apply visual dimming to unselected modes
                    try {
                        const grid = document.getElementById('mainMenuGrid');
                        if (grid) {
                            if (kind) grid.classList.add('mode-selection-active');
                            else grid.classList.remove('mode-selection-active');
                        }
                    } catch(_) {}

                    // ARIA pressed states
                    modeClassicBtn?.setAttribute('aria-pressed', kind === 'classic' ? 'true' : 'false');
                    modeSurvivalBtn?.setAttribute('aria-pressed', kind === 'survival' ? 'true' : 'false');
                    customAreaCard?.setAttribute('aria-pressed', kind === 'custom' ? 'true' : 'false');
                    equipCourseCard?.setAttribute('aria-pressed', kind === 'equip' ? 'true' : 'false');

                    // Visual highlight
                    if (kind === 'classic') {
                        highlightCard(modeClassicBtn, { border: '#f43f5e', glow: 'rgba(244,63,94,0.25)' });
                        // Exit custom practice: clear any selected custom books and range
                        if (gameState.range === 'custom' && gameState.customBooks.length) {
                            gameState.customBooks = [];
                            try { initializeCustomBooksInExpandCard(); } catch(_) {}
                            try { refreshQuickSelectCategoryStates(); } catch(_) {}
                        }
                        // hide expand card if visible
                        try { document.getElementById('customBooksExpandCard')?.classList.add('hidden'); } catch(_) {}
                        gameState.range = null; // leave practice completely
                        gameState.theme = null;
                        gameState.rarity = null; // stick to core mode
                        setPlayMode('classic');
                    } else if (kind === 'survival') {
                        highlightCard(modeSurvivalBtn, { border: '#10b981', glow: 'rgba(16,185,129,0.25)' });
                        if (gameState.range === 'custom' && gameState.customBooks.length) {
                            gameState.customBooks = [];
                            try { initializeCustomBooksInExpandCard(); } catch(_) {}
                            try { refreshQuickSelectCategoryStates(); } catch(_) {}
                        }
                        try { document.getElementById('customBooksExpandCard')?.classList.add('hidden'); } catch(_) {}
                        gameState.range = null;
                        gameState.theme = null;
                        gameState.rarity = null;
                        setPlayMode('survival');
                    } else if (kind === 'custom') {
                        highlightCard(customAreaCard, { border: '#3b82f6', glow: 'rgba(59,130,246,0.25)' });
                        // Enter practice: set range custom and show inline picker
                        gameState.range = 'custom';
                        gameState.rarity = null;
                        gameState.theme = null;
                        // Disable core mode buttons via applyModeUI later
                        showCustomBooksExpandCard();
                    } else if (kind === 'equip') {
                        highlightCard(equipCourseCard, { border: '#7c3aed', glow: 'rgba(124,58,237,0.25)' });
                        // Future: open equip courses; for now, just exclusive highlight
                        if (gameState.range === 'custom' && gameState.customBooks.length) {
                            gameState.customBooks = [];
                            try { initializeCustomBooksInExpandCard(); } catch(_) {}
                            try { refreshQuickSelectCategoryStates(); } catch(_) {}
                        }
                        try { document.getElementById('customBooksExpandCard')?.classList.add('hidden'); } catch(_) {}
                        gameState.range = null;
                        gameState.theme = null;
                        gameState.rarity = null;
                        // 清除 core 模式，防止殘留 classic/survival 造成可以開始
                        gameState.playMode = null;
                        try { highlightSelectedModeCard(null); } catch(_) {}
                        // keep current playMode; just cancel practice selections
                    }

                    updateSettingsDisplay();
                    updateStartButtonState();
                    try { window.__applyModeUI && window.__applyModeUI(); } catch (_) {}
                    // Mobile 自動滾動：僅在選擇 core 模式 (classic/survival) 時觸發（取消/自訂/裝備不滾）
                    try {
                        if (kind === 'classic' || kind === 'survival') {
                            scrollToStartButtonForMobile();
                        }
                    } catch(_) {}
                }
                // Expose for other handlers (e.g., quick-select buttons)
                window.__selectHomeMode = selectHomeMode;
                // Helper: 手機自動滾到「開始遊戲」按鈕（避免使用者還要手動向下找按鈕）
                function scrollToStartButtonForMobile(){
                    try {
                        const vw = Math.min(window.innerWidth || 0, document.documentElement.clientWidth || 0);
                        if (vw > 920) return; // 僅手機/窄螢幕
                        const btn = document.getElementById('startGameBtn');
                        if(!btn) return;
                        // 若按鈕目前不可開始 (disabled) 也仍可預先對齊位置，提供視覺指引
                        const rect = btn.getBoundingClientRect();
                        // 若按鈕已經在視窗中間上下 40% 範圍內，則不再滾動避免干擾
                        const vh = window.innerHeight || document.documentElement.clientHeight;
                        if (rect.top > vh*0.2 && rect.bottom < vh*0.8) return;
                        const offset = Math.max(0, window.pageYOffset + rect.top - (vh*0.28));
                        window.scrollTo({ top: offset, behavior:'smooth' });
                    } catch(_) {}
                }
                window.scrollToStartButtonForMobile = scrollToStartButtonForMobile;
        const applyModeUI = () => {
                    if (!modeClassicBtn || !modeSurvivalBtn) return;
                    const c = gameState.playMode === 'classic';
                    const inPractice = !!gameState.range; // 任一練習範圍（含主題/自訂）
                    const hasEquipPending = !!gameState.__pendingEquipTier;
                    const baseClass = 'mode-card-interactive cute-button w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 ';
                    
                    if (inPractice) {
                        // 練習模式：兩個模式按鈕保持一般外觀且可再次點擊切換離開練習
                        modeClassicBtn.className = baseClass + 'border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50';
                        modeClassicBtn.setAttribute('aria-pressed', 'false');
                        modeClassicBtn.removeAttribute('aria-disabled');
                        modeSurvivalBtn.className = baseClass + 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50';
                        modeSurvivalBtn.setAttribute('aria-pressed', 'false');
                        modeSurvivalBtn.removeAttribute('aria-disabled');
                        if (modeDesc) modeDesc.textContent = '練習模式：10 關，每關 5 題；不列入排行';
                    } else {
                        // 一般：依選擇顯示闖關/生存
                        const classicSelected = c && !hasEquipPending;
                        modeClassicBtn.className = baseClass + (classicSelected ? 'border-rose-500 bg-gradient-to-br from-rose-50 to-pink-50 font-bold shadow' : 'border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50');
                        modeClassicBtn.setAttribute('aria-pressed', c ? 'true' : 'false');
                        modeClassicBtn.removeAttribute('aria-disabled');

                        const survivalSelected = (!c && !inPractice && !hasEquipPending) && gameState.playMode === 'survival';
                        let survivalClass = baseClass + (survivalSelected ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 font-bold shadow' : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50');
                        modeSurvivalBtn.className = survivalClass;
                        modeSurvivalBtn.setAttribute('aria-pressed', survivalSelected ? 'true' : 'false');
                        modeSurvivalBtn.removeAttribute('aria-disabled');
                        if (modeDesc) modeDesc.textContent = (gameState.playMode === 'classic')
                            ? '10 關，每關 5 題；完成全部進入結算'
                            : '90 秒倒數；答對依速度變動加秒；失誤立即扣秒，最終答錯補扣至固定總額；時間到結算';
                    }

                    // 若有裝備課程班級待選（將進入裝備模式），將闖關/生存外觀重置為未選以避免色框殘留
                    if (hasEquipPending) {
                        modeClassicBtn.className = baseClass + 'border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50';
                        modeClassicBtn.setAttribute('aria-pressed', 'false');
                        modeSurvivalBtn.className = baseClass + 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50';
                        modeSurvivalBtn.setAttribute('aria-pressed', 'false');
                    }
                };
                // 讓其他地方可呼叫 UI 更新
                window.__applyModeUI = applyModeUI;
                const setPlayMode = (mode) => {
                    // 練習模式啟用時，禁止切換闖關/生存（獨立模式）
                    if (gameState.range) {
                        try { showCuteHint('目前為「練習模式」（自訂/主題）— 請先取消練習範圍，再選擇闖關或生存。', 'blue', undefined, '🧩'); } catch(_) {}
                        applyModeUI();
                        return;
                    }
                    if (!mode) { gameState.playMode = null; applyModeUI(); updateStartButtonState(); return; }
                    gameState.playMode = (mode === 'survival') ? 'survival' : 'classic';
                    applyModeUI();
                    // persist preference
                    try {
                        if (window.saveSettings) window.saveSettings({ playMode: gameState.playMode });
                        else {
                            const key = 'bibleGameSettings';
                            const saved = JSON.parse(localStorage.getItem(key) || '{}') || {};
                            saved.playMode = gameState.playMode;
                            localStorage.setItem(key, JSON.stringify(saved));
                        }
                    } catch (_) {}
                };
                // Wire clicks to our exclusive selector
        if (modeClassicBtn) modeClassicBtn.addEventListener('click', () => {
                    if (!gameState.range && gameState.playMode === 'classic') {
                        gameState.playMode = null; // deselect
                        highlightSelectedModeCard(null);
                        updateStartButtonState();
                        applyModeUI();
            try { modeClassicBtn.style.borderColor=''; modeClassicBtn.style.boxShadow=''; } catch(_) {}
                        try { const m=MODE_HINTS.deselect; showCuteHint(m.lines, m.theme, undefined, m.icon); } catch(_) {}
                        return;
                    }
                    selectHomeMode('classic');
                    try { const m=MODE_HINTS.classic; showCuteHint(m.lines, m.theme, undefined, m.icon); } catch(_) {}
                });
        if (modeSurvivalBtn) modeSurvivalBtn.addEventListener('click', () => {
                    if (!gameState.range && gameState.playMode === 'survival') {
                        gameState.playMode = null;
                        highlightSelectedModeCard(null);
                        updateStartButtonState();
                        applyModeUI();
            try { modeSurvivalBtn.style.borderColor=''; modeSurvivalBtn.style.boxShadow=''; } catch(_) {}
                        try { const m=MODE_HINTS.deselect; showCuteHint(m.lines, m.theme, undefined, m.icon); } catch(_) {}
                        return;
                    }
                    selectHomeMode('survival');
                    try { const m=MODE_HINTS.survival; showCuteHint(m.lines, m.theme, undefined, m.icon); } catch(_) {}
                });
                // Custom area/equip are also exclusive
                if (customAreaCard) {
                    // Helper: 判斷是否點擊在卡片內部的互動元素上（避免冒泡誤觸卡片切換）
                    const isInteractiveInsideCustom = (t) => {
                        if (!t) return false;
                        // 快速選擇分類、展開卡片內的全選/清空、搜尋框、以及書卷按鈕
                        return !!(
                            t.closest('#qsOld, #qsNew, #qsLaw, #qsHistory, #qsPoetry, #qsProphets, #qsGospels, #qsPaul, #qsGeneral') ||
                            t.closest('#selectAllBooksExpand') ||
                            t.closest('#clearAllBooksExpand') ||
                            t.closest('#bookSearchExpand') ||
                            t.closest('#customBooksExpandCard #customBooksExpand button')
                        );
                    };

                    // Click：點擊卡片可在「選取自訂」與「取消自訂（回到無模式）」間切換
                    customAreaCard.addEventListener('click', (ev) => {
                        const t = ev.target;
                        if (isInteractiveInsideCustom(t)) {
                            // 交由內部元件自己處理（例如 quick-select），卡片不介入
                            return;
                        }
                        if (gameState.range === 'custom') {
                            // 取消自訂模式：恢復到「未選模式」的狀態
                            try { document.getElementById('customBooksExpandCard')?.classList.add('hidden'); } catch(_) {}
                            // 清空自訂書卷並刷新展開卡/快速分類視覺
                            try { gameState.customBooks = []; initializeCustomBooksInExpandCard(); refreshQuickSelectCategoryStates(); } catch(_) {}
                            gameState.range = null;
                            // 一併清除核心模式，回到「未選模式」
                            try { gameState.playMode = null; highlightSelectedModeCard(null); } catch(_) {}
                            // 視覺與 ARIA 回復
                            try { customAreaCard.setAttribute('aria-pressed','false'); } catch(_) {}
                            try { resetCard(customAreaCard); } catch(_) {}
                            // 更新整體 UI 與提示
                            try { applyModeUI(); } catch(_) {}
                            updateStartButtonState();
                            try { const m=MODE_HINTS.deselect; showCuteHint(m.lines, m.theme, undefined, m.icon); } catch(_) {}
                            return;
                        }
                        // 尚未選取 → 切換到自訂模式
                        selectHomeMode('custom');
                        try { const m=MODE_HINTS.custom; showCuteHint(m.lines, m.theme, undefined, m.icon); } catch(_) {}
                    });

                    // Keyboard：Enter/Space 在卡片自身聚焦時亦支援切換
                    customAreaCard.addEventListener('keydown', (ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            // 若鍵盤事件來源是卡片內互動元件（例如搜尋輸入框、快捷按鈕），則忽略
                            if (isInteractiveInsideCustom(ev.target)) return;
                            if (gameState.range === 'custom') {
                                try { document.getElementById('customBooksExpandCard')?.classList.add('hidden'); } catch(_) {}
                                // 清空自訂書卷並刷新展開卡/快速分類視覺
                                try { gameState.customBooks = []; initializeCustomBooksInExpandCard(); refreshQuickSelectCategoryStates(); } catch(_) {}
                                gameState.range = null;
                                // 同步清除核心模式選擇
                                try { gameState.playMode = null; highlightSelectedModeCard(null); } catch(_) {}
                                try { customAreaCard.setAttribute('aria-pressed','false'); } catch(_) {}
                                try { resetCard(customAreaCard); } catch(_) {}
                                try { applyModeUI(); } catch(_) {}
                                updateStartButtonState();
                                try { const m=MODE_HINTS.deselect; showCuteHint(m.lines, m.theme, undefined, m.icon); } catch(_) {}
                            } else {
                                selectHomeMode('custom');
                                try { const m=MODE_HINTS.custom; showCuteHint(m.lines, m.theme, undefined, m.icon); } catch(_) {}
                            }
                        }
                    });
                }
                if (equipCourseCard) {
                    // 裝備課程卡片本身不觸發模式切換，改由班級按鈕生效
                    try {
                        equipCourseCard.style.cursor = 'default';
                        // 讓卡片本體不再可聚焦/可點（但保留內部班級按鈕可互動）
                        equipCourseCard.setAttribute('role','group');
                        equipCourseCard.setAttribute('aria-disabled','true');
                        equipCourseCard.setAttribute('tabindex','-1');
                        // 防止鍵盤在卡片上按 Enter/Space 造成誤觸
                        equipCourseCard.addEventListener('keydown', (ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                                ev.preventDefault();
                                ev.stopPropagation();
                            }
                        }, true);
                        // 防止點擊卡片空白處（仍允許點擊內部三個班級按鈕）
                        equipCourseCard.addEventListener('click', (ev) => {
                            const t = ev.target;
                            const isTierBtn = !!(t && (t.id === 'equipTierGrowth' || t.id === 'equipTierDisciple' || t.id === 'equipTierLeader' || t.closest('#equipTierGrowth') || t.closest('#equipTierDisciple') || t.closest('#equipTierLeader')));
                            if (!isTierBtn) { ev.preventDefault(); ev.stopPropagation(); }
                        }, true);
                    } catch(_) {}
                }
                // 不再自動恢復保存的 playMode，保持主選單進入時無預設模式
                applyModeUI();
            } catch (_) { /* ignore */ }
            
            // 倒數顯示開關已移除（固定啟用）

            // 恢復使用者偏好設定（難度/罕見度/範圍/時間獎勵）
            // Suppress cute hints while applying saved selections to avoid popping on initial menu
            const __prevSuppress = window.__suppressCuteHints;
            window.__suppressCuteHints = true;
            try {
                const saved = JSON.parse(localStorage.getItem('bibleChallenge.prefs') || '{}');
                if (saved && typeof saved === 'object') {
                    // migrate deprecated rarity 'medium' -> 'common'
                    if (saved.rarity === 'medium') saved.rarity = 'common';
                    if (saved.difficulty) {
                        const btn = document.querySelector(`.difficulty-option[data-difficulty="${saved.difficulty}"]`);
                        if (btn && !btn.classList.contains('selected')) btn.click();
                    }
                    if (saved.rarity) {
                        const btn = document.querySelector(`.rarity-option[data-rarity="${saved.rarity}"]`);
                        if (btn && !btn.classList.contains('selected')) btn.click();
                        // 可能未觸發 click: 確保文字更新
                        updateBaseScoreRuleDisplay();
                    }
                    if (saved.range) {
                        let btn = null;
                        if (saved.range === 'theme' && saved.theme) {
                            btn = document.querySelector(`.range-option[data-range="theme"][data-theme="${saved.theme}"]`);
                        } else {
                            btn = document.querySelector(`.range-option[data-range="${saved.range}"]`);
                        }
                        if (btn && !btn.classList.contains('selected')) btn.click();
                    }
                    // showTimeReward 偏好已停用（固定啟用）
                }
            } catch (e) { /* ignore */ }
            finally { window.__suppressCuteHints = __prevSuppress; }
            
            // 自訂書卷視窗事件（改用統一 modal 管理器）
            try { document.getElementById('confirmCustomSelection')?.addEventListener('click', confirmCustomSelection); } catch(_) {}

            // 遊戲事件
            document.getElementById('hintBtn').addEventListener('click', useHint);
            // Settings and back-to-menu wiring
            try { document.getElementById('openSettingsFromMenu')?.addEventListener('click', () => openSettingsModal('menu')); } catch(_) {}
            try { document.getElementById('openSettingsFromGame')?.addEventListener('click', () => openSettingsModal('game')); } catch(_) {}
            try { document.getElementById('adaptiveBackBtn')?.addEventListener('click', () => openSettingsModal('game')); } catch(_) {}
            // Legacy back button may not exist; guard safely
            document.getElementById('backToMenuFromGame')?.addEventListener('click', () => { try { openModal('confirmBackModal'); } catch(_) {} });
            // Settings modal controls
            try { document.getElementById('closeSettingsBtn')?.addEventListener('click', () => { try { SFX.play('uiClose'); } catch(_) {} closeSettingsModal(); }); } catch(_) {}
            try { document.getElementById('saveSettingsBtn')?.addEventListener('click', () => { saveSettingsFromModal(); }); } catch(_) {}
            try { document.getElementById('settingsBackToMenu')?.addEventListener('click', () => {
                try { closeModal('settingsModal'); } catch(_) {}
                try {
                    const inGame = !document.getElementById('gameScreen').classList.contains('hidden');
                    if (inGame) openModal('confirmBackModal');
                } catch(_) {}
            }); } catch(_) {}
            document.getElementById('confirmBackBtn').addEventListener('click', () => {
                try { closeModal('confirmBackModal'); } catch(_) {}
                // 強制移除所有遊戲提示
                document.querySelectorAll('.game-instruction').forEach(inst => {
                    if (inst.parentElement) inst.parentElement.removeChild(inst);
                });
                // 停止星星雨效果
                try { stopStarRain(true); } catch(_) {}
                if (gameState.score > 0) {
                    // 中途退出，遊戲未完成
                    gameState.gameCompleted = false;
                    saveScore(gameState.score);
                }
                // 裝備與模式狀態重置（避免返回主選單後殘留專用 UI 或邏輯）
                try {
                    gameState.equipRunning = false;
                    gameState.equipTier = null;
                    gameState.equipPhase = 0;
                    gameState.currentEquipEntry = null;
                    gameState.equipRemaining = [];
                    gameState.__pendingEquipTier = null;
                    gameState.equipLastBook = null;
                    gameState.equipDistractorPool = [];
                    gameState.equipLevelCount = 10;
                    delete gameState.__equipHandoffLocked;
                    delete gameState.__equipFinished;
                    delete gameState.__equipEnding;
                    try { setEquipInteractionLock(false); } catch(_) {}
                    // 移除裝備卡片高亮與班級標記
                    highlightSelectedEquipTier(null);
                    const equipCard = document.getElementById('equipCourseCard');
                    if (equipCard) {
                        equipCard.style.borderWidth=''; equipCard.style.borderColor=''; equipCard.style.boxShadow='';
                        equipCard.setAttribute('aria-pressed','false');
                    }
                } catch(_) {}
                GameTimer.stopAll();
                try { const card = document.getElementById('survivalTimerCard'); if (card) card.classList.add('hidden'); } catch(_) {}
                showStartScreen();
                // 確保裝備 UI 隱藏、配對 UI 顯示
                try { showEquipUI(false); } catch(_) {}
                try { window.__applyModeUI && window.__applyModeUI(); } catch(_) {}
            });
            // 取消返回按鈕已加上 data-close-modal 屬性，無需額外處理
            document.getElementById('confirmNameBtn').addEventListener('click', confirmPlayerName);
            document.getElementById('clearAllBooks').addEventListener('click', clearAllBooks);
            
            // 排行榜標籤事件
            document.querySelectorAll('.leaderboard-tab').forEach(tab => {
                tab.addEventListener('click', selectLeaderboardTab);
            });

            // 開發者指令觸發清空排行榜（取代舊的標題左右圖示手勢）
            const openClearModal = () => {
                const modal = document.getElementById('clearLeaderboardModal');
                if (modal) {
                    openModal('clearLeaderboardModal');
                    const input = document.getElementById('clearConfirmInput');
                    const btn = document.getElementById('confirmClearLeaderboard');
                    if (input && btn){
                        input.value='';
                        btn.disabled = true; btn.setAttribute('aria-disabled','true');
                        btn.classList.add('opacity-60','cursor-not-allowed');
                        setTimeout(()=>{ try { input.focus(); } catch(_){} }, 30);
                    }
                    try { announce && announce('已開啟清空排行榜確認視窗'); } catch(_) {}
                }
            };
            // 開發者指令 Modal 行為
            (function initDevCommands(){
                const openBtn = document.getElementById('openDevCommands');
                const modal = document.getElementById('devCommandModal');
                const input = document.getElementById('devCommandInput');
                const confirm = document.getElementById('confirmDevCommand');
                const cancel = document.getElementById('cancelDevCommand');
                const closeX = document.getElementById('closeDevCommandX');
                function openDev(){
                    if (!modal) return; openModal('devCommandModal');
                    if (input){ input.value=''; confirm.disabled=true; confirm.setAttribute('aria-disabled','true'); confirm.classList.add('opacity-60','cursor-not-allowed'); setTimeout(()=>{ try { input.focus(); } catch(_){} },30); }
                    try { announce && announce('已開啟開發者指令視窗'); } catch(_) {}
                }
                function closeDev(){ if (!modal) return; closeModal('devCommandModal'); }
                function maybeEnable(){ if (!confirm || !input) return; const v = (input.value||'').trim(); if (v) { confirm.disabled=false; confirm.removeAttribute('aria-disabled'); confirm.classList.remove('opacity-60','cursor-not-allowed'); } else { confirm.disabled=true; confirm.setAttribute('aria-disabled','true'); confirm.classList.add('opacity-60','cursor-not-allowed'); } }
                async function execCommand(){
                    if (!input) return;
                    const code = (input.value || '').trim();
                    if (code === '7777') {
                        closeDev();
                        openClearModal();
                        return;
                    }
                    if (code === '6666' || /^(6666r)$/i.test(code)) {
                        // Online-only seeding: require online adapter; do NOT write to local storage.
                        const onlineEnabled = !!(window.Leaderboard && typeof window.Leaderboard.save === 'function' && typeof window.Leaderboard.load === 'function');
                        if (!onlineEnabled) {
                            try { showCuteHint('未設定線上排行榜，無法補種測試資料（不會寫入本機）', 'purple', 2800, 'ℹ️'); } catch(_) {}
                            return;
                        }
                        const remoteAlso = true; // force online-only
                        try { SFX && SFX.play && SFX.play('uiConfirm'); } catch(_) {}
                        // Determine active leaderboard mode from selected tab; fallback to cached mode or classic
                        let mode = 'classic';
                        try {
                            const active = document.querySelector('.leaderboard-tab[aria-selected="true"]');
                            const m = active && (active.dataset.mode || '').toLowerCase();
                            if (m === 'classic' || m === 'survival') mode = m;
                            else if (window.__lbActiveMode) mode = window.__lbActiveMode;
                        } catch(_) { try { if (window.__lbActiveMode) mode = window.__lbActiveMode; } catch(_) {} }

                        // Load existing leaderboard (prefer online if available) and compute empty slots against LEADERBOARD_LIMIT
                        const LIMIT = (window.__BC_CONSTS && window.__BC_CONSTS.LEADERBOARD_LIMIT) || 20;
                        let effective = null;
                        try {
                            const res = window.Leaderboard.load();
                            effective = (res && typeof res.then === 'function') ? await res : res;
                        } catch(_) { effective = { classic: [], survival: [] }; }
                        const list = (effective && effective[mode]) ? effective[mode] : [];
                        const currentCount = Array.isArray(list) ? list.length : 0;
                        const empty = Math.max(0, LIMIT - currentCount);
                        if (empty <= 0) {
                            closeDev();
                            try { showCuteHint(`目前「${mode==='survival'?'生存計時':'闖關挑戰'}」沒有空白名次可填`, 'purple', 2400, 'ℹ️'); } catch(_) {}
                            return;
                        }

                        // Prepare unique short cute/fun name generator (1~4 chars, avoid duplicates)
                        const existingNames = new Set((list || []).map(r => (r && r.playerName) ? String(r.playerName) : '匿名'));
                        const batchNames = new Set();
                        function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
                        const cuteBase = [
                            '豆豆','球球','咪咪','妞妞','牛牛','可可','樂樂','朵朵','多多','東東','天天','皮皮','巧巧','元元','花花','點點','泡泡','柚柚','果果','喵喵','汪汪','萌萌','熊熊','糖糖','餅乾','小白','小黑','小米','小光','小羽','阿樂','阿福','阿牧','阿喜','阿花','阿星','阿比','阿茉','阿寶','小鯊','小熊','小鹿','小魚','小貓','小汪','小狐','小松','小草','小豆','小皮','白白','黑皮','奈奈','比比','露露','奇奇','妙妙','圓圓','悠悠','可愛','軟綿','甜心','小萌','小可','米米'
                        ];
                        const syllables = ['小','阿','豆','米','果','樂','皮','球','花','糖','白','黑','萌','喵','汪','狐','鹿','熊','星','泡','點','朵','多','光','羽','茉','寶','比','奈','露','奇','妙','圓','悠'];
                        function genName(){
                            // 60% 直接使用可愛名單，40% 自行組合 1~3 個音節
                            if (Math.random() < 0.6) return pick(cuteBase);
                            const len = Math.min(4, Math.max(1, Math.floor(Math.random()*3)+1));
                            let out = '';
                            for (let i=0;i<len;i++) out += pick(syllables);
                            return out.slice(0,4);
                        }
                        function uniqueName(){
                            let tries = 0;
                            while (tries++ < 400) {
                                const name = genName();
                                if (name && name.length >= 1 && name.length <= 4 && !existingNames.has(name) && !batchNames.has(name)) { batchNames.add(name); return name; }
                            }
                            // Fallback: 玩家 + 編號（不超過 4 個字）
                            let idx = 1;
                            let name = '';
                            while (!name || existingNames.has(name) || batchNames.has(name)) { name = `玩${idx}`; idx++; if (idx>9999) break; }
                            batchNames.add(name); return name;
                        }

                        // Random score by mode
                        const scoreMin = mode === 'survival' ? 300 : 500;
                        const scoreMax = mode === 'survival' ? 3000 : 5000;
                        function randInt(min,max){ return Math.floor(Math.random() * (max - min + 1)) + min; }

                        const now = Date.now();
                        const fmtTime = (ms)=>{ const secs = Math.max(0, Math.floor(ms/1000)); const m = Math.floor(secs/60); const s = String(secs%60).padStart(2,'0'); return `${m}:${s}`; };
                        const added = [];
                        for (let i = 0; i < empty; i++) {
                            const playerName = uniqueName();
                            // Target scoreboard分數範圍
                            const targetScore = randInt(scoreMin, scoreMax);
                            // 虛構題數/正確率/關卡結果
                            const totalQuestions = mode === 'survival' ? randInt(8, 18) : randInt(8, 20);
                            const levels = Math.min(10, Math.max(1, Math.ceil(totalQuestions / (mode==='survival'?4:5))));
                            const perfectCount = randInt(0, levels);
                            const levelBonus = perfectCount * 300 + (levels - perfectCount) * 100;
                            const totalHints = 3; const hintsRemaining = randInt(0, totalHints); const hintBonus = hintsRemaining * 100;
                            const maxMistakes = Math.max(0, Math.floor(totalQuestions / 2));
                            let totalMistakes = randInt(0, maxMistakes);
                            // 先估最大可用正確數，避免 base 超出分數
                            const correctMax = Math.max(1, Math.min(totalQuestions, Math.floor((targetScore - levelBonus - hintBonus) / 100)));
                            const correctMin = Math.max(1, Math.floor(correctMax * 0.6));
                            let correctAnswers = Math.max(1, Math.min(correctMax, randInt(correctMin, correctMax)));
                            let base = correctAnswers * 100;
                            // 計算 timeReward 使最後分數接近目標
                            let timeReward = targetScore - base - levelBonus - hintBonus + totalMistakes * 50;
                            if (timeReward < 0) { timeReward = 0; }
                            // 最終分數（保證在範圍內）
                            let score = base + levelBonus + hintBonus - totalMistakes * 50 + timeReward;
                            if (score < scoreMin) { timeReward += (scoreMin - score); score = scoreMin; }
                            if (score > scoreMax) { const over = score - scoreMax; timeReward = Math.max(0, timeReward - over); score = scoreMax; }
                            // 用時
                            const timeMs = (mode==='survival' ? randInt(60, 480) : randInt(120, 720)) * 1000;
                            const timeStr = fmtTime(timeMs);
                            // 關卡結果明細
                            const levelResults = {}; for (let L=1; L<=levels; L++){ levelResults[L] = (L <= perfectCount) ? 'perfect' : 'complete'; }
                            // 構建完整可檢視的排行榜紀錄（供點卡片開啟結算視窗）
                            const rec = {
                                id: `seed-${now}-${mode}-${i}-${Math.floor(Math.random()*1e6)}`,
                                playerName,
                                score,
                                difficulty: 'normal',
                                date: new Date().toLocaleDateString('zh-TW'),
                                // Prefer one duration field to avoid duplicate rendering in UI; also write time for DB row
                                elapsed: timeStr,
                                time: timeStr,
                                timeMs,
                                completed: true,
                                correctAnswers,
                                accuracy: Math.round((correctAnswers / Math.max(1,totalQuestions)) * 100),
                                totalQuestions,
                                totalMistakes,
                                levelResults,
                                range: 'all',
                                rarity: null,
                                mode: 'ranking',
                                playMode: mode,
                                hintsRemaining,
                                totalHints,
                                showTimeReward: true,
                                timeReward,
                                usedHintsCount: (totalHints - hintsRemaining),
                                createdAt: now + i,
                                achievements: []
                            };
                            // Online-only: do NOT write to local storage
                            if (remoteAlso && window.Leaderboard && typeof window.Leaderboard.save === 'function') {
                                try { await window.Leaderboard.save(rec); } catch(e){ console.warn('[DEV] remote seed save failed', e); }
                            }
                            added.push(rec);
                        }

                        // Do not push local 'added' seeds into cache to avoid duplicates with DB-inserted rows.
                        // We rely on online save()'s optimistic update and a forced refresh below.
                        // Invalidate any other caches if present
                        try { window.invalidateLeaderboardCache && window.invalidateLeaderboardCache(); } catch(_) {}
                        closeDev();
                        try { await updateLeaderboardDisplay(mode, { force: true }); } catch(_) { try { updateLeaderboardDisplay && updateLeaderboardDisplay(mode); } catch(_) {} }
                        try {
                            const msg = `已為「${mode==='survival'?'生存計時':'闖關挑戰'}」補上 ${empty} 筆測試紀錄（線上）`;
                            showCuteHint(msg, mode==='survival'?'green':'rose', 2800, '🌐');
                        } catch(_) {}
                        return;
                    }
                }
                openBtn && openBtn.addEventListener('click', openDev);
                cancel && cancel.addEventListener('click', closeDev);
                closeX && closeX.addEventListener('click', closeDev);
                input && input.addEventListener('input', maybeEnable);
                confirm && confirm.addEventListener('click', execCommand);
                window.openDevCommandsModal = openDev;
            })();

            // Ensure custom-books cleanup triggers when modal closed via data-close-modal
            try {
                document.addEventListener('modal:closed', (ev) => {
                    const id = ev && ev.detail && ev.detail.id;
                    if (id === 'customBooksModal') {
                        if (gameState.customBooks.length === 0) {
                            gameState.range = null;
                            document.querySelectorAll('.range-option').forEach(opt => {
                                opt.classList.remove('selected', 'border-purple-500', 'border-4', 'shadow-lg');
                                opt.classList.add('border-gray-300', 'border-2');
                            });
                            try { updateSettingsDisplay(); } catch(_) {}
                            try { updateStartButtonState(); } catch(_) {}
                        }
                    }
                });
            } catch(_) {}

            document.getElementById('cancelClearLeaderboard')?.addEventListener('click', () => closeModal('clearLeaderboardModal'));
            document.getElementById('closeClearLeaderboardX')?.addEventListener('click', () => closeModal('clearLeaderboardModal'));
            document.getElementById('clearConfirmInput')?.addEventListener('input', (e) => {
                const v = (e.target.value || '').trim();
                const btn = document.getElementById('confirmClearLeaderboard');
                if (!btn) return;
                if (v === 'CLEAR') { btn.disabled = false; btn.removeAttribute('aria-disabled'); btn.classList.remove('opacity-60','cursor-not-allowed'); }
                else { btn.disabled = true; btn.setAttribute('aria-disabled','true'); btn.classList.add('opacity-60','cursor-not-allowed'); }
            });

            document.getElementById('confirmClearLeaderboard')?.addEventListener('click', async () => {
                // 清除排行榜：先遠端、後本機；清除後立即失效快取並強制重新載入，避免殘留快取資料
                const showBusy = (msg) => { try { showCuteHint(msg || '清除中…', 'rose', 2400, '🧹'); } catch(_) {} };
                const showDone = (msg) => { try { showCuteHint(msg || '已清除排行榜', 'green', 2200, '✅'); } catch(_) {} };
                showBusy('正在清除排行榜…');
                let remoteOk = true;
                // 若可能有線上排行榜，先確保 Supabase 載入並嘗試安裝 Adapter
                try { if (window.ensureSupabaseReady) await window.ensureSupabaseReady().catch(()=>{}); } catch(_) {}
                try { window.tryInitOnlineLeaderboard && window.tryInitOnlineLeaderboard(); } catch(_) {}
                if (window.Leaderboard && typeof window.Leaderboard.clear === 'function') {
                    try {
                        await window.Leaderboard.clear();
                    } catch (e) {
                        remoteOk = false;
                        console.warn('[LEADERBOARD] remote clear failed, will still clear local', e);
                    }
                }
                // Purge any cached data structures / local storage copies
                try { window.__lbLatestData = { classic: [], survival: [] }; window.__lbLatestTs = 0; } catch(_) {}
                try { const key=(window.__BC_CONSTS&&window.__BC_CONSTS.STORAGE_KEY_LEADERBOARD)||'bibleGameLeaderboard'; if(window.__bcStorage) window.__bcStorage.remove(key); else localStorage.removeItem(key); } catch(_) {}
                // 強制重新載入（繞過快取）
                try { await updateLeaderboardDisplay('classic', { force: true }); } catch(_) {}
                // 若目前選的是 survival tab，再重繪一次 survival
                try {
                    const active = document.querySelector('.leaderboard-tab[aria-selected="true"]');
                    if (active && /survival/.test(active.dataset.mode||'')) {
                        await updateLeaderboardDisplay('survival', { force: true });
                    }
                } catch(_) {}
                // 在可能有延遲的遠端一致性下，再排程一次安全刷新（確保剛清空後的最終狀態）
                setTimeout(()=>{ try { updateLeaderboardDisplay('classic', { force: true }); } catch(_) {} }, 1200);
                setTimeout(()=>{ try { updateLeaderboardDisplay('survival', { force: true }); } catch(_) {} }, 1500);
                try { closeModal('clearLeaderboardModal'); } catch(_) {
                    document.getElementById('clearLeaderboardModal')?.classList.add('hidden');
                    const modal = document.getElementById('clearLeaderboardModal');
                    if (modal) { modal.setAttribute('aria-hidden','true'); try { __deactivateFocusTrap && __deactivateFocusTrap(modal); } catch(_) {} }
                }
                showDone(remoteOk ? '已清除排行榜（線上與本機）' : '已清除本機排行榜（線上可能未成功）');
                lastTitleIconClickedAt = 0;
                lastTitleIcon = null;
            });

            // 重新播放排行榜紀錄或使用相同題目再來一局的處理
            window.openLeaderboardRecordById = async function(id, mode) {
                // If full leaderboard is open, we'll stack the settlement modal on top via unified modal manager.
                // Mark context for confirm flow.
                let fullLb = document.getElementById('fullLeaderboardModal');
                const openedFromFullLeaderboard = !!(fullLb && !fullLb.classList.contains('hidden'));
                // Try cached data first for instant response
                let all = null;
                try {
                    if (window.__lbLatestData) all = window.__lbLatestData;
                } catch(_) {}
                if (!all || !all[mode]) {
                    // fallback to local storage immediately (non-blocking UI), fire online in background
                    try { all = JSON.parse(localStorage.getItem('bibleGameLeaderboard') || '{}') || { classic:[], survival:[] }; } catch(_) { all = { classic:[], survival:[] }; }
                    try {
                        const p = loadLeaderboard();
                        if (p && typeof p.then === 'function') {
                            p.then(data => { try { window.__lbLatestData = data; window.__lbLatestTs = Date.now(); } catch(_) {} }).catch(()=>{});
                        }
                    } catch(_) {}
                }
                if (!all || !all[mode]) return;
                const record = all[mode].find(r => String(r.id) === String(id));
                if (!record) return;

                // debug helper: surface whether timeReward was present/estimated for this record
                try {
                    console.log('[DEBUG] openLeaderboardRecordById record:', { id: record.id, score: record.score, timeReward: record.timeReward, timeRewardEstimated: record.timeRewardEstimated, hintsRemaining: record.hintsRemaining, totalHints: record.totalHints });
                } catch (e) {}

                // 填入結算視窗內容（從儲存紀錄填充，不會進行新的儲存）
                // Prefill text (will be animated after breakdown render)
                // Reset and cancel any prior inline animations before rendering
                try {
                    const fs = document.getElementById('finalScore');
                    if (fs && fs.__ainCancel) { try { fs.__ainCancel(); } catch(_) {} }
                    if (fs) fs.textContent = '0';
                    const fa = document.getElementById('finalAccuracy');
                    if (fa && fa.__ainCancel) { try { fa.__ainCancel(); } catch(_) {} }
                    if (fa) fa.textContent = '0%';
                } catch(_) {}
                const accuracy = record.totalQuestions ? Math.round(((record.correctAnswers||0)/record.totalQuestions)*100) : 0;
                document.getElementById('finalAccuracy').textContent = '0%';
                const ratioEl = document.getElementById('finalAccuracyRatio');
                if (ratioEl) setRatio(ratioEl, (record.correctAnswers||0), (record.totalQuestions||0));

                // 優先使用儲存的結語經文（若有），否則以遊戲結束相同的方式自動選詩句
                const closingTextEl = document.getElementById('closingVerseText');
                const closingRefEl = document.getElementById('closingVerseRef');
                if (record.closingVerse || record.closingVerseRef) {
                    applyClosingVerse(record.closingVerse, record.closingVerseRef, false);
                } else {
                    updateClosingVerse(accuracy);
                }
                // 計算該記錄在該難度排行榜中的名次（若存在）以供顯示標頭
                let computedRank = null;
                try {
                    const list = all[mode] || [];
                    for (let idx = 0; idx < list.length; idx++) {
                        const r = list[idx];
                        if (String(r.id) === String(record.id)) {
                            computedRank = idx + 1;
                            break;
                        }
                    }
                } catch (e) { computedRank = null; }

                // Show the player's name for this record
                document.getElementById('rankMessage').textContent = record.playerName || '匿名';
                const hdr = document.getElementById('leaderboardHeader');
                if (hdr) {
                    if (computedRank) {
                        try { applyRankThemeUnified(computedRank,'record-view'); } catch(_) {}
                        try { finalizeRankStyling(computedRank); } catch(_) {}
                    } else {
                        hdr.innerHTML = `<span style="font-weight:700;">檢視記錄</span>`;
                    }
                }

                // 填入隱藏欄位以便後續按鈕使用
                document.getElementById('currentViewedRecordId').value = record.id || '';

                // 根據排名主題化名稱輸入區 (若當前檢視的紀錄含 computedRank 且介面顯示輸入欄則忽略)
                try { if (computedRank) applyPlayerNameFieldTheme(computedRank); } catch(_){ }

                // 填充計分詳細（使用統一的渲染器，與遊戲結束時相同的格式）
                const breakdown = document.getElementById('scoreBreakdownContent');
                if (breakdown) {
                    breakdown.innerHTML = '';
                    try {
                        // use unified renderer; if it throws, fall back to a minimal summary
                        renderScoreBreakdownFromRecord(record);
                    } catch (e) {
                        const rows = [];
                        rows.push(`<div>總分：<strong>${record.score || 0}</strong></div>`);
                        rows.push(`<div>答對：<strong>${(record.correctAnswers||0)}/${(record.totalQuestions||0)}</strong></div>`);
                        rows.push(`<div>失誤：<strong>${record.totalMistakes != null ? record.totalMistakes : '--'}</strong></div>`);
                        // omit time display for record view per UX request
                        breakdown.innerHTML = rows.map(r=>`<div class="text-xs text-gray-700">${r}</div>`).join('');
                    }
                }

                // 顯示 modal
                const modal = document.getElementById('playerNameModal');
                if (modal) {
                    // If modal is nested under a hidden parent (like #gameScreen), move it to document.body
                    if (modal.parentElement !== document.body) {
                        document.body.appendChild(modal);
                    }
                    // 標記為檢視模式，避免在關閉時再次儲存或修改名稱
                    modal.dataset.viewingRecord = 'true';
                    // 記錄當前檢視的排行榜模式，以便關閉後還原同一標籤
                    modal.dataset.viewingMode = (mode || record.playMode || gameState.playMode || '').toString();
                    // 記錄來源：若來自 full leaderboard，確認時應一併關閉它
                    modal.dataset.fromFullLeaderboard = openedFromFullLeaderboard ? '1' : '';

                    // 隱藏名稱輸入區，禁止在首頁檢視時更改名稱
                    const nameInputSection = document.getElementById('nameInputSection');
                    if (nameInputSection) nameInputSection.classList.add('hidden');
                    const leaderboardMessage = document.getElementById('leaderboardMessage');
                    if (leaderboardMessage) leaderboardMessage.classList.remove('hidden');

                    // When viewing a saved leaderboard record (opened from leaderboard cards),
                    // show the same-question replay button so users can replay that saved snapshot.
                    const replayBtn = document.getElementById('replaySameQuestionsBtn');
                    if (replayBtn) {
                        const pm = (record.playMode || gameState.playMode || '').toString();
                        if (pm === 'survival') {
                            replayBtn.classList.add('hidden');
                        } else {
                            replayBtn.classList.remove('hidden');
                        }
                    }

                    // 打開結算視窗（使用統一 modal manager 疊在 full leaderboard 之上）
                    try { window.openModal && window.openModal('playerNameModal'); } catch(_) { modal.classList.remove('hidden'); }
                    // attach record object for later use
                    modal.dataset.currentRecord = JSON.stringify(record);
                    // If this saved record has achievements, populate UI accordingly
                    try {
                        if (Array.isArray(record.achievements)) {
                            // temporarily set unlocked list and render
                            const prev = gameState.unlockedAchievements;
                            gameState.unlockedAchievements = record.achievements.map(a=>({ id:a.id, name:a.name, tier:a.tier, mode:a.mode, displayTier: a.displayTier != null ? a.displayTier : (typeof getDisplayTier==='function'? getDisplayTier(a):undefined) }));
                            try { renderAchievementsIntoModal(); } catch(_) {}
                            // restore to avoid leaking into gameplay state
                            gameState.unlockedAchievements = prev;
                        }
                    } catch(_) {}
                    // 不再手動隱藏/還原 full leaderboard，改由 modal stack 處理
                }
            };

            // (removed) replayAgainBtn event listener - button removed from DOM

            // 同樣題目再來一局（不列入排行榜）：載入題組快照並開始遊戲，並設定 skipLeaderboardOnComplete 標誌
            document.getElementById('replaySameQuestionsBtn').addEventListener('click', async () => {
                try { SFX.play('replayStart'); } catch(_) {}
                const modal = document.getElementById('playerNameModal');
                // Detach Enter hotkey as we are leaving the modal context
                try { detachPlayerNameModalEnterHotkey(); } catch (e) {}
                const raw = modal.dataset.currentRecord;
                if (!raw) return;
                const record = JSON.parse(raw);
                // 生存計時模式不提供「同題重玩」
                try {
                    const pm = (record.playMode || gameState.playMode || '').toString();
                    if (pm === 'survival') {
                        alert('生存計時模式不提供同題重玩。');
                        return;
                    }
                } catch(_) {}
                // 若沒有快照則無法執行
                if (!record.questionSnapshot) {
                    alert('此紀錄不包含題組快照，無法使用相同題目再來一局。');
                    return;
                }

                // 如果該紀錄已儲存到排行榜（有 id）且玩家名稱為空或為匿名，先提醒使用者
                const nameIsEmptyOrAnonymous = !record.playerName || record.playerName === '匿名';
                const isSavedRecord = !!record.id;
                console.log('[REPLAY] clicked replaySameQuestionsBtn', { recordId: record.id, playerName: record.playerName, isSavedRecord, nameIsEmptyOrAnonymous });
                // 需求：匿名玩家排行榜卡片 → 同題重玩不再跳出確認視窗，直接進行
                // 因此當為匿名紀錄時不顯示任何確認。若未來需對具名紀錄提示，可在此加入額外條件與詢問。

                // 載入快照（快照可能為新格式 { questionData, levelResults, totalQuestions } 或舊格式的陣列）
                gameState.difficulty = record.difficulty || gameState.difficulty;
                gameState.range = record.range || gameState.range;
                gameState.testament = record.testament || gameState.testament;
                gameState.customBooks = record.customBooks || gameState.customBooks;

                // 將題組替換為快照（優先使用 snapshot.questionData），並設定不要儲存排行榜的旗標
                try {
                    const rawSnap = record.questionSnapshot;
                    let snapshotData;
                    if (rawSnap && typeof rawSnap === 'object') {
                        if (rawSnap.version === 3 && Array.isArray(rawSnap.levels) && rawSnap.levels.length) {
                            // Multi-level sequence replay
                            gameState._replaySequence = rawSnap.levels.map(l => ({
                                level: l.level,
                                difficulty: l.difficulty,
                                questionData: l.questionData,
                                chapterOrder: l.chapterOrder || null
                            }));
                            gameState._replaySeqIndex = 0;
                            const first = gameState._replaySequence[0];
                            snapshotData = first.questionData;
                            gameState._forcedChapterOrder = Array.isArray(first.chapterOrder) ? [...first.chapterOrder] : null;
                            gameState.difficulty = first.difficulty || rawSnap.difficultyAtStart || gameState.difficulty;
                            gameState._adaptiveDisabled = true; // fully freeze adaptive for identical sequence
                            gameState._replaySnapshotHash = rawSnap.hash || null;
                        } else if (rawSnap.version === 2) {
                            snapshotData = rawSnap.questionData;
                            if (Array.isArray(rawSnap.chapterOrder)) {
                                gameState._forcedChapterOrder = [...rawSnap.chapterOrder];
                            } else {
                                gameState._forcedChapterOrder = null;
                            }
                            if (rawSnap.difficulty) gameState.difficulty = rawSnap.difficulty;
                            gameState._replaySnapshotHash = rawSnap.hash || null;
                            gameState._adaptiveDisabled = true; // freeze for v2 as well (ensures consistent attempts/hints scaling)
                        } else {
                            snapshotData = (rawSnap.questionData) ? rawSnap.questionData : rawSnap;
                            gameState._forcedChapterOrder = null;
                            gameState._replaySnapshotHash = null;
                        }
                    } else {
                        snapshotData = (rawSnap && rawSnap.questionData) ? rawSnap.questionData : rawSnap;
                        gameState._forcedChapterOrder = null;
                        gameState._replaySnapshotHash = null;
                    }
                    gameState.questionData = JSON.parse(JSON.stringify(snapshotData || []));
                } catch (e) {
                    const rawSnap = record.questionSnapshot;
                    const snapshotData = (rawSnap && rawSnap.questionData) ? rawSnap.questionData : rawSnap;
                    gameState.questionData = snapshotData || [];
                    gameState._forcedChapterOrder = null;
                    gameState._replaySnapshotHash = null;
                }
                gameState.skipLeaderboardOnComplete = true;
                // remember the original record so end-of-replay modal can reuse its static fields (closing verse, date/time)
                gameState.replaySourceRecord = record;
                console.log('[REPLAY] initialized replay flags', { skipLeaderboardOnComplete: gameState.skipLeaderboardOnComplete, replaySourceRecordId: gameState.replaySourceRecord && gameState.replaySourceRecord.id });
                // 改為於遊戲資訊卡顯示重播狀態，移除舊有角標切換
                // Diagnostic: verify snapshot hash integrity if available (best-effort, non-security)
                try {
                    if (gameState._replaySnapshotHash) {
                        const str = JSON.stringify(gameState.questionData || []);
                        let h = 0; for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
                        const currentHash = h.toString(16);
                        if (currentHash !== gameState._replaySnapshotHash) {
                            console.warn('[REPLAY][INTEGRITY] snapshot hash mismatch', { stored: gameState._replaySnapshotHash, computed: currentHash });
                        } else {
                            console.log('[REPLAY][INTEGRITY] snapshot hash verified', currentHash);
                        }
                    }
                } catch(e){ console.warn('[REPLAY][INTEGRITY] hash verification failed', e); }

                // 關閉 modal 並開始遊戲介面（直接顯示 gameScreen 並初始化狀態為該快照）
                document.getElementById('playerNameModal').classList.add('hidden');
                // ensure background scrolling is restored on mobile
                try { unlockBodyScroll(); } catch(e) {}
                // 手動進入遊戲畫面，避免重新生成題組
                hideAllScreens();
                document.getElementById('gameScreen').classList.remove('hidden');
                // 重播同題也重置滑動到前段（左側）
                try {
                    const carousel = document.getElementById('versesCarousel');
                    if (carousel) carousel.scrollTo({ left:0, behavior:'auto' });
                } catch(_) {}

                // 初始化遊戲狀態 but keep questionData
                gameState.currentLevel = 1;
                gameState.currentQuestion = 1;
                gameState.score = 0;
                gameState.hintsUsed = 0;
                gameState.levelPerfect = true;
                gameState.questionAttempts = {};
                gameState.usedHints = new Set();
                gameState.gameStartTime = Date.now();
                gameState.gameCompleted = false;
                gameState.isFirstQuestionOfLevel = true;
                gameState.consecutiveMistakes = 0;
                gameState.hintReminderShown = false;
                gameState.levelHintReminderShown = false;
                gameState.totalCorrectAnswers = 0;
                gameState.totalQuestions = record.totalQuestions || (gameState.questionData ? gameState.questionData.length : 0);
                // initialize attempts per question so UI logic (selecting / coloring) works
                (function initAttemptsForReplay() {
                    const maxAttemptsMap = { easy: 3, normal: 3, hard: 3 };
                    const perQuestion = maxAttemptsMap[gameState.difficulty] || 3;
                    if (Array.isArray(gameState.questionData)) {
                        gameState.questionData.forEach((q, i) => {
                            gameState.questionAttempts[i] = perQuestion;
                        });
                    }
                    // restore hint counts according to difficulty so hint button behaves
                    const hintCounts = { easy: 3, normal: 3, hard: 3 };
                    gameState.hintsRemaining = hintCounts[gameState.difficulty] || 3;
                })();
                gameState.totalMistakes = 0;
                // For a replay we must start with fresh level results so progress ovals reflect the new run
                gameState.levelResults = {};
                // Reset one-time per-run toast flag for the replayed session
                gameState.firstNoScoreMissToastShown = false;
                // 重播啟動時重新建立連擊 8 格 UI 並重設 combo 狀態
                try {
                    gameState.combo = 0; gameState.comboProgress = 0;
                    const segWrap = document.getElementById('comboSegments');
                    if (segWrap) {
                        segWrap.innerHTML='';
                        for (let i=0;i<8;i++){ const s=document.createElement('div'); s.className='combo-seg'; segWrap.appendChild(s);}    
                    }
                    if (typeof updateComboUI==='function') updateComboUI(true);
                } catch(_) {}
                // Reset per-level failed counter for the replay session
                gameState.levelFailedCount = 0;
                // Reset combo state at the beginning of replay
                gameState.combo = 0;
                gameState.comboProgress = 0;
                gameState.comboTotalBonus = 0;
                try { if (gameState.comboDecayTimer) { clearTimeout(gameState.comboDecayTimer); gameState.comboDecayTimer = null; } } catch(_) {}
                try { updateComboUI(true); } catch(_) {}

                // 初始化題目相關 UI
                updateGameUI();
                displayQuestions();
                updateQuestionOvals();

                // start level timer so time-reward and score updates work for the replayed session
                try {
                    gameState.levelStartTime = Date.now();
                    startLevelTimer();
                } catch (e) {
                    console.warn('Unable to start level timer after replay:', e);
                }
            });
            
            // 書卷搜尋和快速選擇事件
            document.getElementById('bookSearch').addEventListener('input', filterBooks);
            document.getElementById('selectAllBooks').addEventListener('click', selectAllBooksInModal);
            document.getElementById('selectOldTestament').addEventListener('click', selectOldTestamentBooks);
            document.getElementById('selectNewTestament').addEventListener('click', selectNewTestamentBooks);
            
            // 自訂專區（固定面板）搜尋與操作
            document.getElementById('bookSearchExpand').addEventListener('input', filterBooksInExpandCard);
            document.getElementById('selectAllBooksExpand').addEventListener('click', selectAllBooksInExpandCard);
            document.getElementById('clearAllBooksExpand').addEventListener('click', clearAllBooksInExpandCard);
            // 快速選擇按鈕
            document.getElementById('qsOld').addEventListener('click', () => applyQuickSelectBooks(bibleBooks.old, true));
            document.getElementById('qsLaw').addEventListener('click', () => quickSelectLaw(true));
            document.getElementById('qsHistory').addEventListener('click', () => quickSelectHistory(true));
            document.getElementById('qsPoetry').addEventListener('click', () => quickSelectPoetry(true));
            document.getElementById('qsProphets').addEventListener('click', () => quickSelectProphets(true));
            document.getElementById('qsNew').addEventListener('click', () => applyQuickSelectBooks(bibleBooks.new, true));
            document.getElementById('qsGospels').addEventListener('click', () => quickSelectGospels(true));
            document.getElementById('qsPaul').addEventListener('click', () => quickSelectPaul(true));
            document.getElementById('qsGeneral').addEventListener('click', () => quickSelectGeneral(true));
            try { refreshQuickSelectCategoryStates(); } catch(_) {}

            // 初始化自訂書卷選項（固定面板立即渲染）
            initializeCustomBooks();
            initializeCustomBooksInExpandCard();
            
            // 初始化排行榜顯示
            updateLeaderboardDisplay();
            try {
                // 依據 Supabase 設定與 Adapter 狀態，更新「線上/本機排行榜」提示
                if (!window.updateLeaderboardOnlineNote) {
                    window.updateLeaderboardOnlineNote = function(){
                        try {
                            const note = document.getElementById('leaderboardOnlineNote');
                            if (!note) return;
                            // 已有線上 Adapter
                            if (window.Leaderboard && typeof window.Leaderboard.load === 'function') {
                                note.textContent = '線上排行榜已啟用（Supabase）。';
                                return;
                            }
                            // 有設定但尚未載入 client → 顯示啟用中，並嘗試載入
                            const cfg = window.SUPABASE_CONFIG || {};
                            if (cfg && cfg.url && cfg.anonKey) {
                                note.textContent = '正在啟用線上排行榜…';
                                try {
                                    window.ensureSupabaseReady && window.ensureSupabaseReady().then(()=>{
                                        try { window.tryInitOnlineLeaderboard && window.tryInitOnlineLeaderboard(); } catch(_) {}
                                    }).catch(()=>{
                                        try {
                                            note.innerHTML = '目前使用本機排行榜（僅此裝置可見）。 <button id="retryOnlineLb" class="underline text-indigo-600 hover:text-indigo-700">重試啟用線上</button>';
                                            const btn = document.getElementById('retryOnlineLb');
                                            if (btn && !btn.__wired){
                                                btn.__wired = true;
                                                btn.addEventListener('click', async ()=>{
                                                    btn.disabled = true; btn.textContent = '重試中…';
                                                    try {
                                                        if (window.ensureSupabaseReady) await window.ensureSupabaseReady();
                                                        if (window.tryInitOnlineLeaderboard) window.tryInitOnlineLeaderboard();
                                                    } catch(_) {}
                                                    setTimeout(()=>{ try { window.updateLeaderboardOnlineNote(); } catch(_) {} }, 300);
                                                });
                                            }
                                        } catch(_) {}
                                    });
                                } catch(_) {}
                            } else {
                                // 未配置 → 本機排行榜
                                note.textContent = '目前使用本機排行榜（僅此裝置可見）。';
                            }
                        } catch(_) {}
                    };
                }
                // 初次更新一次
                window.updateLeaderboardOnlineNote();
                // 當 Adapter 成功建立時，自動清快取並刷新排行榜，避免初載入時快取了本機空白
                document.addEventListener('leaderboard:adapter-ready', async function(){
                    try { window.updateLeaderboardOnlineNote(); } catch(_) {}
                    try { window.invalidateLeaderboardCache && window.invalidateLeaderboardCache(); } catch(_) {}
                    try {
                        const tab = document.querySelector('.leaderboard-tab[aria-selected="true"]');
                        const mode = (tab && (tab.dataset.mode||'').toLowerCase()) || (window.__lbActiveMode || 'classic');
                        await updateLeaderboardDisplay(mode, { force: true });
                    } catch(_) { try { updateLeaderboardDisplay && updateLeaderboardDisplay('classic', { force: true }); } catch(_) {} }
                });
                // 開啟完整排行榜前預先載入，減少白屏
                document.addEventListener('click', (e)=>{
                    const t = e.target.closest('[data-open-modal="fullLeaderboardModal"]');
                    if (!t) return;
                    try { const r = loadLeaderboard(); if (r && r.then) r.catch(()=>{}); } catch(_) {}
                });
            } catch(_) {}
            
            // 初始化設定顯示
            updateSettingsDisplay();
            updateStartButtonState();
            updateScoreRulesDisplay();

            // Ensure FX styles are loaded
            try { ensureLevelFxStyles(); } catch(_) {}
            
            // Global click/touch ripple
            document.addEventListener('pointerdown', (e) => {
               try {
                 if (typeof window.createTouchRipple === 'function') {
                    window.createTouchRipple(e.pageX, e.pageY);
                 }
               } catch(_) {}
            }, { passive: true });
            // mobile score badge setup: clones encouragement text into front/back titles on narrow viewports
            try { setupMobileScoreBadges(); } catch (e) { console.warn('setupMobileScoreBadges failed', e); }
        }

        // Settings modal logic — use unified modal manager
        
        <!-- Extracted: settings-ui.js -->


        // Mobile badge behavior caused duplicate encouragement text on some devices.
        // To preserve the original single `#encouragementText` behavior we clean up
        // any previously-created mobile badges and disconnect observers.
        
        <!-- Extracted: start-screen.js -->


    // Cute hint bar helpers and message pools
    
        <!-- Extracted: cute-hints.js -->

        <!-- Extracted: book-selection.js -->
function startGame() {
                // Initialize Metrics for the new run
                if (window.resetGameMetrics) window.resetGameMetrics(gameState.playMode);

                // 允許啟動途徑：排行（罕見度）、練習（範圍）、或核心模式（闖關/生存）
                const isCoreMode = (gameState.playMode === 'classic' || gameState.playMode === 'survival');
                if (!isCoreMode && !gameState.rarity && !gameState.range && !gameState.__pendingEquipTier) {
                    return;
                }
            try { hideCuteHint(); } catch(_) {}
            // 新一局開始時先重置上一關統計（避免殘留結算 meta）
            try { resetLastLevelMeta(); } catch(_) {}
                try { performance.mark('bc-game-start'); } catch(_) {}
            
        // 練習模式：檢查自訂範圍是否有足夠的書卷
        if (gameState.range === 'custom') {
        if (gameState.customBooks.length < 1) {
                    const warn = document.getElementById('rangeWarning');
                    if (warn) {
            warn.textContent = '⚠️ 自訂範圍至少選 1 本書卷';
                        warn.classList.remove('hidden');
                    }
                    return;
                }
                
                // 檢查選擇的書卷是否有對應的經文
                const availableVersesCount = getAvailableVersesQuickCount();
                if (availableVersesCount < 5) {
            document.getElementById('rangeWarning').innerHTML = '⚠️ 可用經文不足（至少需要 5 篇），請擴大範圍或更換主題/範圍！';
                    document.getElementById('rangeWarning').classList.remove('hidden');
                    return;
                }
            }
            
            // 開始倒數
            startCountdown();
        }
        
    function startCountdown() {
            // 顯示開始遊戲提示視窗
            showGameStartModal();
            
            // 鎖定所有主畫面按鈕
            lockMainScreenButtons(true);
            
            const startBtn = document.getElementById('startGameBtn');
        // 移除原本點擊後的橘色邊框與發光效果（需求）
        startBtn.style.border = '';
        startBtn.style.boxShadow = '';

            // Unique start button effect (aurora rings + particles)
            try { triggerStartButtonBurst(startBtn.getBoundingClientRect()); } catch(_) {}
            
            let countdown = 3;
            let hasSwitched = false; // 已在全黑時切換畫面的旗標
            const originalText = startBtn.innerHTML;
            // 倒數文字立即顯示（快速呈現）
            try { updateGameStartModal(countdown); } catch(_) {}
            // 保留「一開始的瞬間黑屏」效果：先讓初始微暗化完成，再進入長時間漸暗
            try {
                const veil = document.getElementById('gameStartVeil');
                if (veil) {
                    const totalMs = Math.max(300, countdown * 1000 - 100);
                    const prefersReduce = (typeof isReducedMotionPreferred === 'function') ? isReducedMotionPreferred() : (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                    const startRamp = () => {
                        veil.style.transition = `opacity ${prefersReduce ? 200 : totalMs}ms linear`;
                        requestAnimationFrame(() => { veil.style.opacity = '1'; });
                    };
                    const current = parseFloat(getComputedStyle(veil).opacity) || 0;
                    if (current >= 0.35) {
                        // 初始微暗化已完成或接近完成，稍後啟動長時間漸暗
                        setTimeout(startRamp, 30);
                    } else {
                        // 等待首次 opacity 變化完成後再開始長時間漸暗（保留原本瞬間黑屏的感覺）
                        let started = false;
                        const onInitialEnd = (e) => {
                            if (e.propertyName !== 'opacity' || started) return;
                            started = true;
                            veil.removeEventListener('transitionend', onInitialEnd);
                            startRamp();
                        };
                        veil.addEventListener('transitionend', onInitialEnd);
                        // 後備：若 transitionend 未觸發，320ms 後啟動
                        setTimeout(() => {
                            if (!started) {
                                veil.removeEventListener('transitionend', onInitialEnd);
                                startRamp();
                            }
                        }, 320);
                    }
                }
            } catch(_) {}
            
            const countdownInterval = setInterval(() => {
                if (countdown > 0) {
                    // 只更新提示視窗的倒數，不改變按鈕文字
                    updateGameStartModal(countdown);
                } else {
                    // 倒數結束，顯示「開始」，並準備進行全黑切換
                    updateGameStartModal(0);
                    if (!hasSwitched) {
                        hasSwitched = true;
                        // 進入闖關/生存遊戲畫面時，在手機上隱藏前/後段標題（加上 body 樣式）
                        try {
                            if (gameState.playMode === 'classic' || gameState.playMode === 'survival') {
                                document.body.classList.add('core-mode-playing');
                            }
                        } catch(_) {}
                        try {
                            const veil = document.getElementById('gameStartVeil');
                            if (veil) {
                                const proceed = () => {
                                    try { actuallyStartGame(); } catch(_) {}
                                    // 全黑後 1 秒內淡出，避免延誤計時
                                    try {
                                        const prefersReduce = (typeof isReducedMotionPreferred === 'function') ? isReducedMotionPreferred() : (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                                        const outMs = prefersReduce ? 200 : 800;
                                        // 同步淡出「準備開始遊戲」與倒數/開始字樣
                                        const content = document.getElementById('gameStartContent');
                                        if (content) {
                                            content.style.transition = `opacity ${outMs}ms ease-out`;
                                            content.style.opacity = '0';
                                            content.style.pointerEvents = 'none';
                                        }
                                        // 黑幕淡出
                                        veil.style.transition = `opacity ${outMs}ms ease-out`;
                                        requestAnimationFrame(() => { veil.style.opacity = '0'; });
                                        const onReveal = () => { veil.removeEventListener('transitionend', onReveal); hideGameStartModal(); };
                                        veil.addEventListener('transitionend', onReveal);
                                    } catch(_) { hideGameStartModal(); }
                                };
                                // 若已幾乎全黑，直接切換；否則等達到全黑
                                const current = parseFloat(getComputedStyle(veil).opacity) || 0;
                                if (current >= 0.98) {
                                    proceed();
                                } else {
                                    const onFullBlack = (e) => {
                                        if (e.propertyName !== 'opacity') return;
                                        if ((parseFloat(getComputedStyle(veil).opacity) || 0) >= 0.98) {
                                            veil.removeEventListener('transitionend', onFullBlack);
                                            proceed();
                                        }
                                    };
                                    veil.addEventListener('transitionend', onFullBlack);
                                    // 保險：目標設為全黑（若尚未設過）
                                    requestAnimationFrame(() => { veil.style.opacity = '1'; });
                                }
                            } else {
                                // 後備路徑：直接切換
                                actuallyStartGame();
                                hideGameStartModal();
                            }
                        } catch(_) {
                            // 防禦：任何異常都直接切換
                            try { actuallyStartGame(); } catch(_) {}
                            try { hideGameStartModal(); } catch(_) {}
                        }
                    }
                }
                countdown--;
                // 一旦觸發切換即可清除定時器，避免重複觸發
                if (hasSwitched) {
                    clearInterval(countdownInterval);
                } else if (countdown < -1) {
                    // 防守性：若未能觸發切換則直接開始
                    clearInterval(countdownInterval);
                    try { actuallyStartGame(); } catch(_) {}
                    try { hideGameStartModal(); } catch(_) {}
                }
            }, 1000);
        }
        
        function showGameStartModal() {
            // 創建提示視窗
            const modal = document.createElement('div');
            modal.id = 'gameStartModal';
            modal.className = 'fixed inset-0 flex items-center justify-center z-50';
            
            modal.innerHTML = `
                <div id="gameStartVeil" aria-hidden="true" style="position:absolute; inset:0; background:#000; opacity:0; transition: opacity 280ms ease-out;"></div>
                <div id="gameStartContent" class="text-center relative" style="z-index:1;">
                    <div class="mb-8">
                        <h2 class="text-5xl font-black bg-gradient-to-r from-white via-yellow-300 to-white bg-clip-text text-transparent mb-8 drop-shadow-2xl animate-pulse" style="text-shadow: 0 0 30px rgba(255, 255, 255, 0.8);">
                            準備開始遊戲
                        </h2>
                        <div id="countdownDisplay" class="text-[8rem] font-black bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-2xl mb-6 transition-all duration-300 min-h-[180px] flex items-center justify-center" style="text-shadow: 0 0 50px rgba(255, 215, 0, 1), 0 0 100px rgba(255, 215, 0, 0.8);">
                        </div>
                        <div id="countdownText" class="text-3xl bg-gradient-to-r from-white via-yellow-300 to-white bg-clip-text text-transparent font-bold min-h-[40px] flex items-center justify-center" style="text-shadow: 0 0 30px rgba(255, 255, 255, 0.8); display: none;">
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            // 預先暗化背景（淡入），恢復原本的初始黑度與瞬間感
            try {
                const veil = document.getElementById('gameStartVeil');
                if (veil) requestAnimationFrame(() => { veil.style.opacity = '0.4'; });
            } catch(_) {}
        }
        
        function updateGameStartModal(countdown) {
            const countdownDisplay = document.getElementById('countdownDisplay');
            const countdownText = document.getElementById('countdownText');
            
            if (countdownDisplay && countdownText) {
                if (countdown > 0) {
                    countdownDisplay.textContent = countdown;
                    countdownDisplay.className = 'text-[8rem] font-black bg-gradient-to-r from-white via-yellow-300 to-white bg-clip-text text-transparent drop-shadow-2xl mb-6 transition-all duration-300 min-h-[180px] flex items-center justify-center countdown-float';
                    countdownDisplay.style.textShadow = '0 0 30px rgba(255, 255, 255, 0.8)';
                    // 隱藏輔助文字，不顯示「秒後開始」
                    countdownText.style.display = 'none';
                } else {
                    countdownDisplay.textContent = '開始';
                    countdownDisplay.className = 'text-[8rem] font-black bg-gradient-to-r from-white via-yellow-300 to-white bg-clip-text text-transparent drop-shadow-2xl mb-6 transition-all duration-300 min-h-[180px] flex items-center justify-center';
                    countdownDisplay.style.textShadow = '0 0 30px rgba(255, 255, 255, 0.8)';
                    // 隱藏輔助文字
                    countdownText.style.display = 'none';
                }
            }
        }
        
        function hideGameStartModal() {
            const modal = document.getElementById('gameStartModal');
            if (modal) {
                modal.remove();
            }
        }

        function lockMainScreenButtons(lock) {
            // 鎖定/解鎖所有難度選擇按鈕
            document.querySelectorAll('.difficulty-option').forEach(btn => {
                btn.style.pointerEvents = lock ? 'none' : 'auto';
            });
            
            // 鎖定/解鎖所有範圍選擇按鈕
            document.querySelectorAll('.range-option').forEach(btn => {
                btn.style.pointerEvents = lock ? 'none' : 'auto';
            });
            
            // 鎖定/解鎖時間獎勵開關（已移除切換，容錯處理）
            try {
                const toggle = document.getElementById('countdownToggle');
                const toggleContainer = toggle?.parentElement?.parentElement;
                if (toggleContainer) {
                    toggleContainer.style.pointerEvents = lock ? 'none' : 'auto';
                }
            } catch (_) { /* ignore */ }
            
            // 鎖定/解鎖排行榜區域
            const leaderboardSection = document.getElementById('leaderboardSection');
            if (leaderboardSection) {
                leaderboardSection.style.pointerEvents = lock ? 'none' : 'auto';
            }
            
            // 鎖定/解鎖自訂書卷區域
            const customBooksExpandCard = document.getElementById('customBooksExpandCard');
            if (customBooksExpandCard) {
                customBooksExpandCard.style.pointerEvents = lock ? 'none' : 'auto';
            }
            
            // 鎖定/解鎖開始遊戲按鈕
            const startBtn = document.getElementById('startGameBtn');
            startBtn.disabled = lock;
            startBtn.classList.toggle('start-button-pulse', !lock);
            startBtn.style.cursor = lock ? 'not-allowed' : 'pointer';
            startBtn.style.pointerEvents = lock ? 'none' : 'auto';
        }
        
        function actuallyStartGame() {
            // 若選擇了裝備課程班級，改走裝備課程流程（仍沿用倒數）
            if (gameState.__pendingEquipTier) {
                const tier = gameState.__pendingEquipTier;
                delete gameState.__pendingEquipTier;
                // 初始化裝備課程（函式內會設定 playMode 標籤與非排行屬性）
                startEquipCourse(tier);
                return;
            }
            // 非裝備：確保裝備專用 UI 關閉、配對面板恢復
            try { showEquipUI(false); } catch(_) {}
            try { setUnifiedHeaderLayout(true); } catch(_) {}
            try { document.body.classList.remove('equip-running'); } catch(_) {}
            // 重置遊戲狀態
            gameState.currentLevel = 1;
            gameState.currentQuestion = 1;
            gameState.score = 0;
            gameState.hintsUsed = 0;
            gameState.levelPerfect = true;
            gameState.questionAttempts = {};
            gameState.usedHints = new Set();
            gameState.gameStartTime = Date.now(); // 記錄遊戲開始時間
            gameState.gameCompleted = false;
            gameState.isFirstQuestionOfLevel = true;
            gameState.consecutiveMistakes = 0;
            gameState.hintReminderShown = false;
            gameState.levelHintReminderShown = false;
            gameState.firstNoScoreMissToastShown = false;
            gameState.levelFailedCount = 0;
            gameState.totalCorrectAnswers = 0; // 重置答對數
            gameState.totalQuestions = 0; // 重置總題數
            gameState.totalMistakes = 0; // 重置失誤次數
            gameState.levelResults = {}; // 重置關卡結果
            gameState.levelEndHandled = false; // 確保新遊戲時可正常切換關卡
            // Reset combo
            gameState.combo = 0;
            gameState.comboProgress = 0;
            gameState.comboTotalBonus = 0;
            gameState.comboPeak = 0;
            try { if (gameState.comboDecayTimer) { clearTimeout(gameState.comboDecayTimer); gameState.comboDecayTimer = null; } } catch(_) {}
            // 移除舊的基於最近答題速度與觀察期的罕見度調整機制；改採逐關時間自適應 (adaptiveVerseRarity)
            try { delete gameState.recentAnswerTimes; } catch(_) { gameState.recentAnswerTimes = undefined; }
            try { delete gameState._observationUntilLevel; } catch(_) {}
            gameState.adaptiveVerseRarity = 'common'; // 顯式初始化逐關罕見度段位
            gameState._rarityPosBuf = 0; // 方案C：升級緩衝
            gameState._rarityNegBuf = 0; // 方案C：降級緩衝
            gameState.rarityPoints = 0; // 若後續需要擴展為積分混合可直接使用
            // 設定初始內部難度（自適應起點：easy）
            // 生存模式一律重置為 easy，避免承襲前一局的動態難度；闖關模式則保留選擇/預設。
            try {
                if (isSurvival()) {
                    gameState.difficulty = 'easy';
                } else if (!gameState.difficulty) {
                    gameState.difficulty = 'easy';
                }
            } catch(_) { if (!gameState.difficulty) gameState.difficulty = 'easy'; }
            // 記錄目前難度以供自適應切換時比對
            gameState._lastAdaptiveDifficulty = gameState.difficulty;

            // track used verses across the entire game to avoid duplicates between levels
            try { gameState.usedVerses = new Set(); } catch (e) { gameState.usedVerses = new Set(); }

            // Ensure any replay-related flags are cleared for a fresh game started from the home screen
            gameState.skipLeaderboardOnComplete = false;
            gameState.replaySourceRecord = null;
            gameState._replaySequence = null;
            gameState._replaySeqIndex = null;
            gameState._adaptiveDisabled = false;
            gameState._forcedChapterOrder = null;
            gameState._sessionQuestions = [];
            // 改為於遊戲資訊卡顯示重播狀態，移除舊有角標切換
            console.log('[GAME] actuallyStartGame: cleared replay flags', { skipLeaderboardOnComplete: gameState.skipLeaderboardOnComplete, replaySourceRecord: gameState.replaySourceRecord });
            // If the player-name modal was left in viewing mode, reset it so normal save flow works
            try {
                const modal = document.getElementById('playerNameModal');
                if (modal) {
                    modal.dataset.viewingRecord = '';
                    modal.dataset.viewingMode = '';
                }
            } catch (e) {}

            // 強制分數顯示歸零
            const scoreElement = document.getElementById('centerScore');
            if (scoreElement) scoreElement.textContent = '0';

            // 設置提示次數
            const hintCounts = { easy: 3, normal: 3, hard: 3 };
            gameState.hintsRemaining = hintCounts[gameState.difficulty] ?? 3;

            hideAllScreens();
            document.getElementById('gameScreen').classList.remove('hidden');
            // 每次正式開始遊戲時（闖關/生存/練習）重置滑動面板位置
            try {
                const carousel = document.getElementById('versesCarousel');
                if (carousel) carousel.scrollTo({ left:0, behavior:'auto' });
            } catch(_) {}
            // 隱藏主選單品牌角標
            try { const m = document.getElementById('menuBrandCorner'); if (m) m.style.display = 'none'; } catch(_) {}
            // 先同步一次資訊卡（顯示觀察中與預設難度配色），避免舊狀態殘留
            try { updateAdaptiveStatus(); } catch(_) {}
            // 初始化本局成就統計（闖關/生存）；練習/裝備不納入
            try {
                const mode = (gameState.playMode === 'survival' && !gameState.range) ? 'survival' : 'classic';
                resetMetrics(mode);
                console.log('[ACHV] resetMetrics at game start', { mode });
            } catch (e) { console.warn('resetMetrics failed', e); }

            generateLevel();
            updateGameUI();

            // 應用時間獎勵顯示設定
            updateTimeRewardVisibility();

            // 初始化連擊槽 segment 方塊
            try {
                const segWrap = document.getElementById('comboSegments');
                if (segWrap) {
                    segWrap.innerHTML = '';
                    for (let i = 0; i < 8; i++) {
                        const s = document.createElement('div');
                        s.className = 'combo-seg';
                        segWrap.appendChild(s);
                    }
                }
                updateComboUI(true);
            } catch(_) {}

            // 準備手機版迷你關卡進度條位置與內容（依模式/關卡數動態生成）
            renderMiniLevelPlaceholders();

            // 更新模式顯示並啟動/關閉生存倒數
            try {
                const modeEl = document.getElementById('gameModeDisplay');
                if (modeEl) modeEl.textContent = gameState.range ? '練習模式' : (isSurvival() ? '生存計時' : '闖關挑戰');
                const card = document.getElementById('survivalTimerCard');
                if (isSurvival()) {
                    if (card) card.classList.remove('hidden');
                    startSurvivalTimer(90);
                } else {
                    if (card) card.classList.add('hidden');
                    stopSurvivalTimer();
                }
                // Desktop: show inline controls; Mobile keeps pinned bar
                const controls = document.getElementById('adaptiveControls');
                if (controls) controls.classList.toggle('hidden', window.innerWidth < 768);
                const pinned = document.getElementById('gameControlsPinned');
                if (pinned) pinned.classList.toggle('hidden', window.innerWidth >= 768);
                // Wire proxy controls
                const proxyHint = document.getElementById('adaptiveHintBtn');
                const realHint = document.getElementById('hintBtn');
                if (proxyHint && realHint) proxyHint.onclick = () => realHint.click();
                const proxyBack = document.getElementById('adaptiveBackBtn');
                const realBack = document.getElementById('backToMenuFromGame');
                if (proxyBack && realBack) proxyBack.onclick = () => realBack.click();
            } catch (_) { /* ignore */ }
        }

    // 生成一個關卡（抽題、重置狀態、更新 UI）
    // Generate a new level: pick questions, reset per-level state, update UI
    // Shared helpers for combo thresholds and difficulty mapping
    function getComboTierGlobal(c) {
            const v = Number(c || 0);
            if (v >= 16) return 2; // hard tier (16+)
            if (v >= 8) return 1;  // normal tier (8..15)
            return 0;              // easy tier (<8)
        }
        function getDifficultyFromCombo(c) {
            const v = Number(c || 0);
            // 當自訂範圍僅一本書卷時，跳過普通難度，直接在門檻後進入困難
            try {
                if (typeof gameState === 'object' && gameState && gameState.range === 'custom') {
                    const books = Array.isArray(gameState.customBooks) ? gameState.customBooks : [];
                    if (books.length === 1) {
                        // easy: <8；>=8 直接 hard（跳過 normal）
                        return (v >= 8) ? 'hard' : 'easy';
                    }
                }
            } catch(_) { /* ignore, fallback to default */ }
            return (v >= 16) ? 'hard' : (v >= 8) ? 'normal' : 'easy';
        }

        // ===== 題型變化：改為依單局時間(0~420s)分階段，而非連擊 =====
        // tier 0: 0~139s  （最寬鬆）
        // tier 1: 140~279s（中等）
        // tier 2: 280s+   （最集中 / 最分散 視模式）
        function getPatternTimeTier(){
            try {
                const start = gameState.gameStartTime || Date.now();
                const elapsed = (Date.now() - start) / 1000; // 秒
                if (elapsed >= 280) return 2;
                if (elapsed >= 140) return 1;
                return 0;
            } catch(_) { return 0; }
        }

    function generateLevel() {
            // 所有難度都是5題/關
            let questionCount = 5;
            // 取得可用經文（已自動補足）
            let availableVerses = getAvailableVerses();
            // 若為自訂僅一本書卷，保護性地跳過普通難度（即使外部狀態意外設為 normal）
            try {
                if (gameState && gameState.range === 'custom' && Array.isArray(gameState.customBooks) && gameState.customBooks.length === 1 && gameState.difficulty === 'normal') {
                    console.log('[DEBUG] Single-book custom range detected. Forcing difficulty from normal to hard to avoid trivial patterns.');
                    gameState.difficulty = 'hard';
                    try { updateSettingsDisplay(); } catch(_) {}
                    try { updateAdaptiveStatus(); } catch(_) {}
                }
            } catch(_) { /* non-fatal */ }
            
            // 動態罕見度配比：改為使用逐關耗時所驅動的 adaptiveVerseRarity（common -> normal -> rare 單步漸進）
            // 這裡不再根據近期答題速度滑動，而是固定對應各難度的三段權重表；
            // adaptiveVerseRarity 僅決定目前所使用的「段位」：
            //   common 段 (保守) / normal 段 (中階) / rare 段 (強化冷門)
            function getRarityWeightsFor(diff) {
                const stage = gameState.adaptiveVerseRarity || 'common';
                // 三段靜態權重：不同難度基礎下稍作偏移，避免過度集中於 rare
                const table = {
                    easy: {
                        common: { common: 0.84, uncommon: 0.14, rare: 0.02 },
                        normal: { common: 0.74, uncommon: 0.22, rare: 0.04 },
                        rare:   { common: 0.62, uncommon: 0.30, rare: 0.08 }
                    },
                    normal: {
                        common: { common: 0.60, uncommon: 0.32, rare: 0.08 },
                        normal: { common: 0.48, uncommon: 0.40, rare: 0.12 },
                        rare:   { common: 0.36, uncommon: 0.48, rare: 0.16 }
                    },
                    hard: {
                        common: { common: 0.44, uncommon: 0.42, rare: 0.14 },
                        normal: { common: 0.32, uncommon: 0.50, rare: 0.18 },
                        rare:   { common: 0.22, uncommon: 0.56, rare: 0.22 }
                    }
                };
                const pack = (table[diff] || table.normal)[stage] || table.normal.common;
                const sum = pack.common + pack.uncommon + pack.rare;
                return { common: pack.common/sum, uncommon: pack.uncommon/sum, rare: pack.rare/sum };
            }
            // 依權重從 pool 中挑一筆索引（優先滿足目標罕見度；缺少時退回任意）
            function pickWeightedIndexByRarity(pool, weights) {
                if (!Array.isArray(pool) || pool.length === 0) return -1;
                try {
                    // 先抽目標罕見度類別
                    const r = Math.random();
                    const steps = [
                        { key: 'rare', w: weights.rare||0 },
                        { key: 'uncommon', w: weights.uncommon||0 },
                        { key: 'common', w: weights.common||0 },
                    ];
                    // 以 rare→uncommon→common 的順序試抽，讓細小比例的 rare 有機會被精確命中
                    let acc = 0, target = 'common';
                    for (const s of steps) { acc += s.w; if (r < acc) { target = s.key; break; } }
                    const candidates = pool
                        .map((v, i) => ({ i, v }))
                        .filter(x => (String(x.v.rarity||'common') === target));
                    if (candidates.length > 0) {
                        const p = candidates[Math.floor(Math.random()*candidates.length)];
                        return p.i;
                    }
                } catch (_) {}
                // 後備：均勻隨機
                return Math.floor(Math.random()*pool.length);
            }
            // Debug: log available and used verses
            try {
                const usedKey = (v) => `${v.book}|${v.chapter}|${v.verse}`;
                const usedVersesSet = gameState.usedVerses || new Set();
                const usedCount = usedVersesSet.size;
                const availableCount = availableVerses.length;
                const unusedCount = availableVerses.filter(v => !usedVersesSet.has(usedKey(v))).length;
                console.log(`[DEBUG] generateLevel: available=${availableCount}, used=${usedCount}, unused=${unusedCount}, currentLevel=${gameState.currentLevel}`);
            } catch (e) { console.warn('[DEBUG] generateLevel: logging failed', e); }
            // 依難度決定題型分布
            let selectedVerses = [];
            if (gameState.difficulty === 'hard') {
                // 只用最多三個書卷，題型分布機率 50/35/10/5
                const allBooks = [...new Set(availableVerses.map(v => v.book))];
                let bookCombos = [];
                if (allBooks.length <= 3) {
                    bookCombos = [allBooks];
                } else {
                    for (let i = 0; i < allBooks.length; i++)
                      for (let j = i+1; j < allBooks.length; j++)
                        for (let k = j+1; k < allBooks.length; k++)
                          bookCombos.push([allBooks[i], allBooks[j], allBooks[k]]);
                }
                // 改為依時間分段調整分布（題型變化已轉為時間驅動）
                const tier = getPatternTimeTier();
                const patterns = tier === 0 ? [
                    { dist: [2,2,1], prob: 0.50 },
                    { dist: [3,2,0], prob: 0.35 },
                    { dist: [4,1,0], prob: 0.10 },
                    { dist: [5,0,0], prob: 0.05 }
                ] : tier === 1 ? [
                    { dist: [2,2,1], prob: 0.45 },
                    { dist: [3,2,0], prob: 0.25 },
                    { dist: [4,1,0], prob: 0.20 },
                    { dist: [5,0,0], prob: 0.10 }
                ] : [
                    { dist: [2,2,1], prob: 0.30 },
                    { dist: [3,2,0], prob: 0.25 },
                    { dist: [4,1,0], prob: 0.25 },
                    { dist: [5,0,0], prob: 0.20 }
                ];
                const books = bookCombos[Math.floor(Math.random()*bookCombos.length)];
                const r = Math.random();
                let acc = 0, chosenPattern = patterns[0];
                for (const p of patterns) { acc += p.prob; if (r < acc) { chosenPattern = p; break; } }
                // 隨機化三書卷的順序，避免固定順序帶來偏差
                const booksOrdered = books.slice().sort(() => Math.random() - 0.5);
                let poolByBook = booksOrdered.map(b => availableVerses.filter(v => v.book === b));
                const rarityW = getRarityWeightsFor('hard'); // 依 adaptiveVerseRarity 決定當前段位權重
                for (let i = 0; i < 3; ++i) {
                    for (let j = 0; j < chosenPattern.dist[i]; ++j) {
                        if (poolByBook[i] && poolByBook[i].length > 0) {
                            const idx = pickWeightedIndexByRarity(poolByBook[i], rarityW);
                            selectedVerses.push(poolByBook[i][idx]);
                            poolByBook[i].splice(idx,1);
                        }
                    }
                }
                if (selectedVerses.length < questionCount) {
                    const used = new Set(selectedVerses.map(v => `${v.book}|${v.chapter}|${v.verse}`));
                    const rest = availableVerses.filter(v => !used.has(`${v.book}|${v.chapter}|${v.verse}`));
                    while (selectedVerses.length < questionCount && rest.length > 0) {
                        const idx = Math.floor(Math.random()*rest.length);
                        selectedVerses.push(rest[idx]);
                        rest.splice(idx,1);
                    }
                }
            } else if (gameState.difficulty === 'normal') {
                // 至少三個書卷，題型分布 40/35/25
                const allBooks = [...new Set(availableVerses.map(v => v.book))];
                // 依 combo tier 增加 5 書卷分佈的機率（覆蓋更廣的書卷，提高辨識難度）
                const tier = getPatternTimeTier(); // 時間分段控制題型分布
                const patterns = tier === 0 ? [
                    { dist: [2,2,1], prob: 0.40 },
                    { dist: [2,1,1,1], prob: 0.35 },
                    { dist: [1,1,1,1,1], prob: 0.25 }
                ] : tier === 1 ? [
                    { dist: [2,2,1], prob: 0.32 },
                    { dist: [2,1,1,1], prob: 0.33 },
                    { dist: [1,1,1,1,1], prob: 0.35 }
                ] : [
                    { dist: [2,2,1], prob: 0.25 },
                    { dist: [2,1,1,1], prob: 0.30 },
                    { dist: [1,1,1,1,1], prob: 0.45 }
                ];
                const r = Math.random();
                let acc = 0, chosenPattern = patterns[0];
                for (const p of patterns) { acc += p.prob; if (r < acc) { chosenPattern = p; break; } }
                // 依分布長度動態抽書卷數（3/4/5），不足時降級為可用的書卷數
                const needBooks = chosenPattern.dist.length;
                const shuffledBooks = allBooks.slice().sort(() => Math.random() - 0.5);
                const pickedBooks = shuffledBooks.slice(0, Math.min(needBooks, shuffledBooks.length));
                let poolByBook = pickedBooks.map(b => availableVerses.filter(v => v.book === b));
                const rarityW = getRarityWeightsFor('normal'); // 依 adaptiveVerseRarity 決定當前段位權重
                for (let i = 0; i < Math.min(chosenPattern.dist.length, pickedBooks.length); ++i) {
                    for (let j = 0; j < chosenPattern.dist[i]; ++j) {
                        if (poolByBook[i] && poolByBook[i].length > 0) {
                            const idx = pickWeightedIndexByRarity(poolByBook[i], rarityW);
                            selectedVerses.push(poolByBook[i][idx]);
                            poolByBook[i].splice(idx,1);
                        }
                    }
                }
                if (selectedVerses.length < questionCount) {
                    const used = new Set(selectedVerses.map(v => `${v.book}|${v.chapter}|${v.verse}`));
                    const rest = availableVerses.filter(v => !used.has(`${v.book}|${v.chapter}|${v.verse}`));
                    while (selectedVerses.length < questionCount && rest.length > 0) {
                        const idx = Math.floor(Math.random()*rest.length);
                        selectedVerses.push(rest[idx]);
                        rest.splice(idx,1);
                    }
                }
            }
            // 其他難度維持原本邏輯
            // 簡單模式預先過濾出「可拆分」的題庫，盡可能擴大可用池
            if (gameState.difficulty === 'easy') {
                const before = availableVerses.length;
                // 僅接受「在標點切分」的可拆分題目（避免中間硬切造成語意不順）
                availableVerses = availableVerses.filter(v => trySplitVerseText(v.verse, true));
                const after = availableVerses.length;
                if (after < before) {
                    console.log(`簡單模式：可拆分題庫 ${after}/${before}`);
                }

                // 若可拆分的題庫仍不足 5 題，嘗試合併相鄰經文（同章的相鄰節）生成較長文本
                if (availableVerses.length < questionCount) {
                    const extended = synthesizeCombinedVerses(getAvailableVerses());
                    if (extended.length) {
                        // 僅保留可拆分的合併結果
                        const addable = extended.filter(v => trySplitVerseText(v.verse, true));
                        // 合併去重（避免與原本可拆分的重複）
                        const key = v => `${v.book}|${v.chapter}|${v.verse}`;
                        const seen = new Set(availableVerses.map(key));
                        for (const it of addable) {
                            const k = key(it);
                            if (!seen.has(k)) {
                                availableVerses.push(it);
                                seen.add(k);
                            }
                            if (availableVerses.length >= questionCount * 2) break; // 適度擴充，避免過大
                        }
                        console.log(`簡單模式：合併相鄰經文後，可拆分題庫 = ${availableVerses.length}`);
                    }
                }
            }
            
            // 檢查可用經文數量
            console.log(`可用經文數量: ${availableVerses.length}`);
            console.log(`選擇的書卷:`, gameState.customBooks);
            
            // 確保有足夠的經文（至少 5 題）
            if (availableVerses.length < questionCount) {
                console.warn('[DEBUG] generateLevel: insufficient availableVerses', { available: availableVerses.length, required: questionCount, range: gameState.range, rarity: gameState.rarity, customBooks: gameState.customBooks });
                // 防止因早期 return 導致互動長時間被鎖住
                try { setLevelInteractionLock(false); } catch(_) {}
                alert('此難度可用經文不足（至少需要 5 篇），請擴大範圍或改選其他難度！');
                return;
            }
            
        if (gameState.difficulty === 'easy') {
            // ...existing code for easy模式...
            gameState.questionData = [];
            let attempts = 0;
            const maxAttempts = Math.max(availableVerses.length * 3, 30);
            const usedKey = (v) => `${v.book}|${v.chapter}|${v.verse}`;
            const usedVersesSet = gameState.usedVerses || new Set();
            let versesToChooseFrom = availableVerses.filter(v => !usedVersesSet.has(usedKey(v)));
            if (versesToChooseFrom.length < questionCount) {
                versesToChooseFrom = [...availableVerses];
            }
            const rarityW = getRarityWeightsFor('easy'); // 依 adaptiveVerseRarity 決定當前段位權重
            while (gameState.questionData.length < questionCount && attempts < maxAttempts) {
                attempts++;
                if (versesToChooseFrom.length === 0) break;
                const randomIndex = pickWeightedIndexByRarity(versesToChooseFrom, rarityW);
                let selectedVerse = versesToChooseFrom[randomIndex];
                const alreadyInThisLevel = gameState.questionData.some(q => q.book === selectedVerse.book && q.chapter === selectedVerse.chapter && q.verse === selectedVerse.verse);
                const alreadyUsedInGame = usedVersesSet.has(usedKey(selectedVerse));
                if (alreadyInThisLevel || alreadyUsedInGame) {
                    versesToChooseFrom.splice(randomIndex, 1);
                    continue;
                }
                const verseClean = sanitizeVerseText(selectedVerse.verse);
                const split = trySplitVerseText(verseClean, true);
                if (split) {
                    const cleanFront = stripOuterCornerQuotes(split.front);
                    const cleanBack = stripOuterCornerQuotes(split.back);
                    gameState.questionData.push({
                        pairId: `${selectedVerse.book}_${selectedVerse.chapter}_${selectedVerse.verse.slice(0,8).replace(/\s+/g,'')}`,
                        book: selectedVerse.book,
                        chapter: selectedVerse.chapter,
                        front: cleanFront,
                        back: cleanBack,
                        original: selectedVerse
                    });
                } else {
                    versesToChooseFrom.splice(randomIndex, 1);
                    continue;
                }
                try { usedVersesSet.add(usedKey(selectedVerse)); } catch (e) {}
                versesToChooseFrom.splice(randomIndex, 1);
            }
        } else if (selectedVerses.length > 0) {
            gameState.questionData = selectedVerses;
            const usedKey = (v) => `${v.book}|${v.chapter}|${v.verse}`;
            const usedVersesSet = gameState.usedVerses || new Set();
            for (const v of selectedVerses) try { usedVersesSet.add(usedKey(v)); } catch(e) {}
            gameState.usedVerses = usedVersesSet;
        }
        console.log(`最終生成 ${gameState.questionData.length} 道題目`);
        gameState.currentQuestion = 1;
        gameState.levelPerfect = true;
        gameState.questionAttempts = {};
        gameState.totalQuestions += gameState.questionData.length;
        gameState.isFirstQuestionOfLevel = true;
        gameState.questionData.forEach((_, index) => {
            const maxAttempts = { easy: 3, normal: 3, hard: 3 };
            gameState.questionAttempts[index] = maxAttempts[gameState.difficulty];
        });
        displayQuestions();
        setTimeout(() => {
            // levelStartTime 可能會在每題答對後被重置以支援倒數與節奏提示；另一份 _rarityLevelStartTime 專供整關耗時統計
            const nowTs = Date.now();
            gameState.levelStartTime = nowTs;
            gameState._rarityLevelStartTime = nowTs; // 整關起點
            // 方案C：建立本關基線（失誤 / 提示）
            gameState._levelMistakesStart = Number(gameState.totalMistakes||0);
            gameState._levelHintsStart = Number(gameState.hintsUsed||0);
            gameState.__comboDroppedForTimeout = false;
            startLevelTimer();
        }, 100);
        // Record this level's question set & ordering for multi-level snapshot (v3)
        try {
            if (!Array.isArray(gameState._sessionQuestions)) gameState._sessionQuestions = [];
            gameState._sessionQuestions.push({
                level: gameState.currentLevel || gameState._sessionQuestions.length + 1,
                difficulty: gameState.difficulty,
                questionData: JSON.parse(JSON.stringify(gameState.questionData || [])),
                chapterOrder: Array.isArray(gameState._lastChapterShuffleOrder) ? [...gameState._lastChapterShuffleOrder] : null
            });
        } catch(_) {}
        }

    // 依目前的範圍/罕見度/自訂書卷過濾可用經文
    // Filter available verses based on range/rarity/custom books
    // Fisher-Yates shuffle（原地）
    function __shuffleInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function getAvailableVerses(options) {
        const opts = options || {};
        const shuffle = opts.shuffle !== false; // 預設洗牌，維持既有隨機行為
        let availableBooks = [];
        switch (gameState.range) {
            case 'all':
                availableBooks = [...bibleBooks.old, ...bibleBooks.new];
                break;
            case 'testament':
                availableBooks = bibleBooks[gameState.testament];
                break;
            case 'custom':
                availableBooks = gameState.customBooks;
                break;
            case 'theme':
                // 主題：先不限定書卷，後續以主題關鍵字過濾
                availableBooks = [...bibleBooks.old, ...bibleBooks.new];
                break;
        }
        if (availableBooks.length === 0) availableBooks = [...bibleBooks.old, ...bibleBooks.new];
        // 使用正規化資料（若有索引可日後優化為依書卷拼接）
        let pool = getActiveVerseDB().filter(v => availableBooks.includes(v.book));
        if (gameState.range === 'theme' && gameState.theme) {
            const THEME_MAP = {
                love: ['愛','相愛','慈愛','憐憫'],
                faith: ['信心','相信','信靠','忠心'],
                hope: ['盼望','指望','盼','前途','將來'],
                parables: ['比喻','用比喻'],
                wisdom: ['智慧','箴言','敬畏耶和華','知識','聰明'],
                gospels: ['耶穌','門徒','神的國','天國','福音']
            };
            const kws = THEME_MAP[gameState.theme] || [];
            if (kws.length) {
                pool = pool.filter(v => {
                    const t = (v.verse || '') + ' ' + (v.title || '') + ' ' + (v.ref || '') + ' ' + (v.book || '');
                    return kws.some(k => t.includes(k));
                });
            }
        }
        const need = 5;
        const inPractice = !!gameState.range;
        let isRarityMode = !inPractice && gameState.rarity && (gameState.rarity === 'rare' || gameState.rarity === 'common');
        if (isRarityMode) {
            let filtered = pool;
            if (gameState.rarity === 'rare') {
                filtered = pool.filter(v => v.rarity === 'rare' || v.rarity === 'uncommon');
            } else if (gameState.rarity === 'common') {
                filtered = pool.filter(v => v.rarity === 'common');
            }
            if (filtered.length < need) {
                let result = [...filtered];
                let allPool = getActiveVerseDB();
                const seen = new Set(result.map(v => `${v.book}|${v.chapter}|${v.verse}`));
                for (const v of allPool) {
                    const k = `${v.book}|${v.chapter}|${v.verse}`;
                    if (!seen.has(k)) {
                        result.push(v);
                        seen.add(k);
                        if (result.length >= need) break;
                    }
                }
                pool = result;
            } else {
                pool = filtered;
            }
        }
        // 預設洗牌，但允許關閉以提升頻繁檢查的效能
        if (!shuffle) return pool;
        return __shuffleInPlace(pool);
        }

    // 快速估算可用經文數量（不掃描整庫則回退為常規計算）
    function getAvailableVersesQuickCount() {
        try {
            const idx = window.__verseIndex;
            const byBook = idx && idx.byBook;
            const counts = idx && idx.counts;
            if (!byBook || !counts) throw new Error('no index');

            let availableBooks = [];
            switch (gameState.range) {
                case 'all':
                    availableBooks = [...bibleBooks.old, ...bibleBooks.new];
                    break;
                case 'testament':
                    availableBooks = bibleBooks[gameState.testament];
                    break;
                case 'custom':
                    availableBooks = gameState.customBooks;
                    break;
                case 'theme':
                    availableBooks = [...bibleBooks.old, ...bibleBooks.new];
                    break;
                default:
                    availableBooks = [...bibleBooks.old, ...bibleBooks.new];
            }
            if (availableBooks.length === 0) availableBooks = [...bibleBooks.old, ...bibleBooks.new];

            const inPractice = !!gameState.range;
            const isRarityMode = !inPractice && gameState.rarity && (gameState.rarity === 'rare' || gameState.rarity === 'common');

            // 主題模式需要內容過濾，採用精確計算
            if (gameState.range === 'theme' && gameState.theme) {
                try { return getAvailableVerses({ shuffle: false }).length; } catch(__) { /* fallthrough */ }
            }

            let total = 0;
            if (isRarityMode) {
                for (const b of availableBooks) {
                    const c = counts.get(b);
                    if (!c) continue;
                    if (gameState.rarity === 'common') total += c.common;
                    else if (gameState.rarity === 'rare') total += (c.rare + c.uncommon);
                }
            } else {
                // 練習模式不分罕見度
                for (const b of availableBooks) {
                    const c = counts.get(b);
                    if (!c) continue;
                    total += c.total;
                }
            }
            // 若沒有索引資料（例如尚未正規化完成），回退計算
            if (!Number.isFinite(total) || total === 0) throw new Error('fallback');
            return total;
        } catch (_) {
            try { return getAvailableVerses({ shuffle: false }).length; } catch(__) { return 0; }
        }
    }

    // 合併相鄰（同書卷同章、連續節數）產生較長文本（供簡單模式切前/後段）
    // Merge adjacent verses (same book+chapter, consecutive verse numbers) to form longer text
    // for easy mode split. Only expands easy pool; preserves original book/chapter in UI.
        // 由相鄰/連續節號嘗試合併成更完整的題目
        // Combine adjacent verses to form richer prompts when appropriate
        function synthesizeCombinedVerses(candidates) {
            try {
                const arr = Array.isArray(candidates) ? [...candidates] : [];
                if (arr.length === 0) return [];
                // 將章節字串分離章:節; 僅處理單節（不含 '-' 範圍）的情形
                function parseChap(ch) {
                    const s = String(ch || '').trim();
                    const m = s.match(/^(\d+):(\d+)$/);
                    if (!m) return null;
                    return { c: parseInt(m[1], 10), v: parseInt(m[2], 10), raw: s };
                }
                // 先排序，才能在同書卷同章中尋找「節數相鄰」的配對
                // Sort by book, chapter, and verse to find adjacent pairs.
                arr.sort((a,b) => {
                    if (a.book !== b.book) return a.book.localeCompare(b.book);
                    const pa = parseChap(a.chapter) || { c: 0, v: 0 };
                    const pb = parseChap(b.chapter) || { c: 0, v: 0 };
                    if (pa.c !== pb.c) return pa.c - pb.c;
                    return pa.v - pb.v;
                });
                const out = [];
                for (let i = 0; i < arr.length - 1; i++) {
                    const cur = arr[i];
                    const nxt = arr[i+1];
                    const p1 = parseChap(cur.chapter);
                    const p2 = parseChap(nxt.chapter);
                    if (!p1 || !p2) continue;
                    // 同書卷、同章、且下一節的節數 = 當前節 + 1
                    // Same book+chapter and verse number is consecutive => merge a pair.
                    if (cur.book === nxt.book && p1.c === p2.c && p2.v === p1.v + 1) {
                        // 合併文本時，若前文末尾無結尾句號，適度加入空格
                        const sep = /[。！？….!?；;:]$/.test(cur.verse) ? '' : ' ';
                        const mergedText = `${cur.verse}${sep}${nxt.verse}`.trim();
                        // UI 仍使用第一節的 chapter 文本；完整原文對保存在 originalCombined 以供除錯/回放
                        // Keep first verse's chapter string for display; store originals in originalCombined.
                        const rarity = cur.rarity || nxt.rarity || 'common';
                        out.push({
                            book: cur.book,
                            chapter: cur.chapter, // 顯示以首節為主
                            verse: mergedText,
                            version: cur.version || nxt.version,
                            rarity,
                            originalCombined: [cur, nxt]
                        });
                    }
                }
                return out;
            } catch (e) {
                return [];
            }
        }

    // 嘗試將經文在合理位置拆成前後兩段（優先在標點或空白處切分）
    // Try to split a verse into front/back segments at natural punctuation/whitespace.
    // 嘗試把過長的經文按斷句拆分（保留語意）
    // Try splitting a long verse into sentence-like parts
    function trySplitVerseText(text, strictPunctuation = false) {
            // 盡可能擴充可用題庫：放寬最短字數門檻，但仍確保兩段都有可讀長度
            if (!text) return null;
            const raw = String(text).trim();
            if (raw.length < 16) return null; // 太短的不拆分

            // 強/弱標點分級：先找強標點（句號/問號/驚嘆號/分號/冒號/省略號），再退回弱標點（逗號/頓號/空白）
            const STRONG = new Set(['。','！','？','；','：','…','.','!','?',';',':']);
            const WEAK = new Set(['，','、',',',' ']);
            const isPunct = (ch) => STRONG.has(ch) || WEAK.has(ch);
            const mid = Math.floor(raw.length / 2);
            const searchRange = 16;

            // 幫助：建立切分 pair，並將後半段的前導標點適度移到前半段尾端，避免以標點開頭
            const buildPair = (cutIdxInclusive) => {
                let front = raw.slice(0, cutIdxInclusive + 1).trim();
                let back = raw.slice(cutIdxInclusive + 1).trim();
                const leading = back.match(/^[\s，。、！？…!？，.;；:："'“”『』（）()【】\[\]\-—–、，。！？…]+/);
                if (leading) {
                    const lead = leading[0];
                    const nf = (front + lead).trim();
                    const nb = back.slice(lead.length).trim();
                    if (nf.length >= 6 && nb.length >= 6) { front = nf; back = nb; }
                }
                // 進一步避免兩段頭尾落在引號或逗號等不佳位置（需同時滿足最小長度）
                const badEnd = /[“”"'『』，、,]$/;
                const badStart = /^[“”"'『』，、,]/;
                if (front.length >= 6 && back.length >= 6 && !badEnd.test(front) && !badStart.test(back)) return { front, back };
                return null;
            };

            // 1) 強標點優先，從中間向外擴散尋找
            for (let d = 0; d <= searchRange; d++) {
                const L = mid - d, R = mid + d;
                if (L > 2) {
                    const ch = raw[L];
                    if (STRONG.has(ch)) {
                        const pair = buildPair(L);
                        if (pair) return pair;
                    }
                }
                if (R < raw.length - 2) {
                    const ch = raw[R];
                    if (STRONG.has(ch)) {
                        const pair = buildPair(R);
                        if (pair) return pair;
                    }
                }
            }

            // 2) 退而求其次：弱標點（逗號/頓號/空白）
            for (let d = 0; d <= searchRange; d++) {
                const L = mid - d, R = mid + d;
                if (L > 2) {
                    const ch = raw[L];
                    if (WEAK.has(ch)) {
                        const pair = buildPair(L);
                        if (pair) return pair;
                    }
                }
                if (R < raw.length - 2) {
                    const ch = raw[R];
                    if (WEAK.has(ch)) {
                        const pair = buildPair(R);
                        if (pair) return pair;
                    }
                }
            }

            // 3) 最後手段：若允許，直接在中位數切分並修正後段前導標點（strict 模式下跳過）
            if (strictPunctuation) return null;
            const cut = mid;
            let front = raw.slice(0, cut).trim();
            let back = raw.slice(cut).trim();
            const leading = back.match(/^[\s，。、！？…!？，.;；:："'“”『』（）()【】\[\]\-—–、，。！？…]+/);
            if (leading) {
                const lead = leading[0];
                const nf = (front + lead).trim();
                const nb = back.slice(lead.length).trim();
                if (nf.length >= 6 && nb.length >= 6) { front = nf; back = nb; }
            }
            if (front.length >= 6 && back.length >= 6) return { front, back };
            return null;
        }

    // 小工具：移除字串頭尾的中文引號（「」/『』）與英引號；僅用於簡單難度前/後段的視覺清潔
    // Helper: strip leading/trailing Chinese/English quotes for easy-mode segment display only.
    // 去除外層中文引號（「…」/『…』）包裹
    // Strip outer Chinese corner quotes if present
    function stripOuterCornerQuotes(s) {
            if (s == null) return s;
            const str = String(s);
            // 只清除頭尾連續的引號符號，不影響中間內容
            return str
                .replace(/^[「」『』“”"']+/, '')
                .replace(/[「」『』“”"']+$/, '')
                .trim();
        }

        // --- In-page confirm modal helper (used to replace native confirm for reliability) ---
    // 遊戲中途返回的確認對話框（若不存在則動態建立）
    // Ensure the in-game confirm modal exists; create lazily
    function ensureConfirmModalExists() {
            if (document.getElementById('inPageConfirmModal')) return;
            const div = document.createElement('div');
            div.id = 'inPageConfirmModal';
            div.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-60';
            div.innerHTML = `
                <div class="cute-card bg-white p-6 max-w-lg mx-4 text-center rounded-xl">
                    <div id="inPageConfirmMessage" class="text-base text-gray-800 mb-4"></div>
                    <div class="flex gap-3 justify-center mt-4">
                        <button id="inPageConfirmYes" class="cute-button bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold">繼續</button>
                        <button id="inPageConfirmNo" class="cute-button bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-bold">取消</button>
                    </div>
                </div>
            `;
            document.body.appendChild(div);
            document.getElementById('inPageConfirmYes').addEventListener('click', () => {
                div.dataset.choice = 'yes';
                div.classList.add('hidden');
            });
            document.getElementById('inPageConfirmNo').addEventListener('click', () => {
                div.dataset.choice = 'no';
                div.classList.add('hidden');
            });
        }

    // 顯示一個頁內確認提示（非阻塞），供返回/關鍵操作使用
    // Show a lightweight in-page confirm for return/critical actions
    function showInPageConfirm(message) {
            return new Promise((resolve) => {
                ensureConfirmModalExists();
                const modal = document.getElementById('inPageConfirmModal');
                const msg = document.getElementById('inPageConfirmMessage');
                modal.dataset.choice = '';
                if (msg) msg.textContent = message || '';
                modal.classList.remove('hidden');

                // poll for choice (simple approach to avoid complex event plumbing)
                const interval = setInterval(() => {
                    const choice = modal.dataset.choice;
                    if (choice === 'yes' || choice === 'no') {
                        clearInterval(interval);
                        resolve(choice === 'yes');
                    }
                }, 100);
            });
        }

    // ...existing code...

    // 渲染本關題目卡片（經文卡＋章節卡）
    // Render question cards for the current level
    function displayQuestions() {
            const versesContainer = document.getElementById('gameVerses');
            const chaptersContainer = document.getElementById('gameChapters');
            // 不主動清除吐司提示，避免剛顯示就被隱藏造成閃動；
            // 新提示會直接覆蓋內容並保持顯示。
            // 根據難度動態顯示標題：簡單顯示「前 段 經 文 / 後 段 經 文」，其餘難度保持原本「經 文 內 容 / 章 節 選 擇」
            const verseTitleEl = document.getElementById('verseTitle');
            const chapterTitleEl = document.getElementById('chapterTitle');
            if (verseTitleEl && chapterTitleEl) {
                if (gameState.difficulty === 'easy') {
                    verseTitleEl.innerHTML = `<span class="text-4xl animate-pulse mr-4">📜</span><span class="tracking-widest bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">前 段 經 文</span><span class="text-4xl animate-pulse ml-4">📜</span>`;
                    chapterTitleEl.innerHTML = `<span class="text-4xl animate-pulse mr-4">📍</span><span class="tracking-widest bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">後 段 經 文</span><span class="text-4xl animate-pulse ml-4">📍</span>`;
                } else {
                    verseTitleEl.innerHTML = `<span class="text-4xl animate-pulse mr-4">📜</span><span class="tracking-widest bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">經 文 內 容</span><span class="text-4xl animate-pulse ml-4">📜</span>`;
                    chapterTitleEl.innerHTML = `<span class="text-4xl animate-pulse mr-4">📍</span><span class="tracking-widest bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">章 節 選 擇</span><span class="text-4xl animate-pulse ml-4">📍</span>`;
                }
            }

            versesContainer.innerHTML = '';
            chaptersContainer.innerHTML = '';
            
            // 顯示經文 (簡單難度為前段；其他為整段經文)
            gameState.questionData.forEach((item, index) => {
                // 簡單難度：移除頭尾「」符號（舊快照亦在此保險處理）
                const verseText = (gameState.difficulty === 'easy') ? stripOuterCornerQuotes(item.front) : item.verse;
                const verseCard = createVerseCard(verseText, index);
                versesContainer.appendChild(verseCard);
            });
            
            // 顯示章節選項（打亂順序；重播時採用快照既有順序）
            // 章節 / 後段顯示（簡單模式顯示後段經文作為選項）
            let shuffledChapters;
            if (Array.isArray(gameState._forcedChapterOrder)) {
                // Replay: use stored order indices
                shuffledChapters = gameState._forcedChapterOrder.map(i => gameState.questionData[i]).filter(Boolean);
            } else {
                // Fresh session: produce a shuffle and store its index order for snapshot v2 persistence
                const arr = [...gameState.questionData];
                // Fisher-Yates for reproducibility if seeded in future (currently Math.random)
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
                shuffledChapters = arr;
                try {
                    gameState._lastChapterShuffleOrder = shuffledChapters.map(item => gameState.questionData.indexOf(item));
                } catch(_) { gameState._lastChapterShuffleOrder = null; }
            }
            shuffledChapters.forEach((item, index) => {
                let chapterText;
                if (gameState.difficulty === 'easy') {
                    // 簡單難度選項顯示後段經文，同樣移除頭尾「」
                    chapterText = stripOuterCornerQuotes(item.back);
                } else {
                    chapterText = (gameState.difficulty === 'easy' || gameState.difficulty === 'normal') ? item.book : `${item.book} ${item.chapter}`;
                }
                const chapterCard = createChapterCard(chapterText, item);
                chaptersContainer.appendChild(chapterCard);
            });
            
            // 進場動畫：不規則從右側滑入（使用隨機 delay/位移/角度/時長）
            try {
                const allCards = [
                    ...versesContainer.querySelectorAll('.verse-card'),
                    ...chaptersContainer.querySelectorAll('.chapter-card')
                ];
                const prefersReduce = (typeof isReducedMotionPreferred === 'function') ? isReducedMotionPreferred() : (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                const baseDelay = 10; // 毫秒（原 40 → 10，讓下一關更快進場）
                allCards.forEach((el, i) => {
                    const jitter = (min, max) => Math.random() * (max - min) + min;
                    const delay = prefersReduce ? 0 : Math.round(i * baseDelay + jitter(0, 24));
                    const dx = Math.round(jitter(80, 160));
                    const dy = Math.round(jitter(-10, 12));
                    // 普通/綠色卡片不傾斜：進場時不旋轉
                    const dr = '0deg';
                    const dur = prefersReduce ? 0 : Math.round(jitter(460, 620));
                    el.style.setProperty('--enterDelay', `${delay}ms`);
                    el.style.setProperty('--enterX', `${dx}px`);
                    el.style.setProperty('--enterY', `${dy}px`);
                    el.style.setProperty('--enterR', dr);
                    el.style.setProperty('--enterDur', `${dur}ms`);
                    el.classList.add('card-enter');
                });
            } catch (_) { /* non-fatal */ }
            
            // 僅在第一關的第一題顯示遊戲提示（可愛語氣吐司提示，不自動關閉）
            if (gameState.currentLevel === 1 && gameState.isFirstQuestionOfLevel) {
                const introPool = (gameState.difficulty === 'easy') ? HINTS.play.introEasy : HINTS.play.introOther;
                // 顯示首個指示 2.8 秒
                gameState._fadeVerseInstruction = showGameInstruction(pick(introPool), 2800);
            }
        }

        // 返回對應的文字大小 class（共用給章節卡與簡單模式的前段經文）
    // 根據經文長度決定卡片字級
    // Pick font-size class based on verse length
    function getCardTextSize(text) {
            if (!text) return 'text-lg';
            if (text.length <= 8) return 'text-xl';
            if (text.length <= 15) return 'text-lg';
            if (text.length <= 25) return 'text-base';
            return 'text-sm';
        }

    // 產生經文卡片（依嘗試次數顯示顏色；行動裝置於 carousel 中以 full-width 呈現）
    // Create verse card with color by attempts; on mobile carousel use full-width layout.
    // 建立經文卡片（可點選）
    // Create a verse card element
    function createVerseCard(verse, index) {
            const card = document.createElement('div');
            const attempts = gameState.questionAttempts[index];
            const maxAttempts = { easy: 3, normal: 3, hard: 3 };
            const originalAttempts = maxAttempts[gameState.difficulty];
            
            // 若該經文還未作答（嘗試次數等於原始次數），一律顯示藍色
            let bgColor = 'bg-blue-50 border-blue-200';
            if (attempts < originalAttempts) {
                // 已經作答過但還有機會，根據剩餘次數顯示不同顏色
                if (attempts === 2) bgColor = 'bg-yellow-100 border-yellow-300';
                else if (attempts === 1) bgColor = 'bg-orange-100 border-orange-300';
                else if (attempts === 0) bgColor = 'bg-red-100 border-red-300';
            }
            
            // 根據是否在 carousel 內調整卡片樣式：carousel 僅在手機視窗下啟用
            const inCarousel = !!document.getElementById('versesCarousel') && window.matchMedia('(max-width: 760px)').matches;
            let widthClass = inCarousel ? 'w-full' : 'w-64'; // 使用 full-width 作為 carousel 的預設
            let heightClass = inCarousel ? 'min-h-[64px]' : 'min-h-[120px]';

            if (!inCarousel) {
                if (verse.length <= 30) {
                    widthClass = 'w-48';
                    heightClass = 'min-h-[80px]';
                } else if (verse.length <= 60) {
                    widthClass = 'w-56';
                    heightClass = 'min-h-[90px]';
                } else if (verse.length <= 100) {
                    widthClass = 'w-72';
                    heightClass = 'min-h-[100px]';
                } else {
                    widthClass = 'w-80';
                    heightClass = 'min-h-[110px]';
                }
            }

            // 在 carousel 情況下，不使用 flex-shrink-0 並改為垂直對齊
            card.className = inCarousel
                ? `verse-card ${bgColor} border-2 p-2 ${heightClass} ${widthClass} flex items-center justify-between` 
                : `verse-card ${bgColor} border-2 p-2 ${heightClass} ${widthClass} flex items-center justify-center flex-shrink-0`;
            card.dataset.index = index;
            // 綱一致化：所有難度使用與簡單模式相同的文字大小/字重規則，並以藍色文字顯示經文內容
            const textSize = getCardTextSize(verse);
            card.innerHTML = `<div class="font-normal text-blue-800 ${textSize} leading-tight break-words text-center max-w-full">${verse}</div>`;
            
            // 鍵盤可達性
            card.setAttribute('tabindex', '0');
            card.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectVerse(index); }
            });
            // 添加點擊事件 + subtle click effect
        card.addEventListener('click', (ev) => {
                // visual: small blue-themed star burst from the card
                try {
                    // If clicking the same selected verse, treat as deselect: no particle effect
                    if (gameState.selectedVerseIndex === index) {
                        selectVerse(index);
                        return;
                    }
                    const rect = card.getBoundingClientRect();
                    const attemptsLeft = gameState.questionAttempts[index];
            // palette: blue/cyan; simpler sparkle glyph, fewer, closer
            let colors = ['#93C5FD','#60A5FA','#3B82F6','#06B6D4','#67E8F9'];
            if (attemptsLeft === 1) colors = ['#F59E0B','#FBBF24','#FDE68A'];
            if (attemptsLeft === 0) colors = ['#F87171','#FB7185','#FCA5A5'];
            // extremely subtle front-verse click effect: almost invisible
            spawnScoreParticles(5, rect, { colors, glyph: '·', count: 1, distanceMin: 4, distanceMax: 10, durationMs: 380, opacity: 0.18, sizeMin: 6, sizeMax: 8 });
                } catch(_) {}
                selectVerse(index);
            });
            
            return card;
        }

    // 產生章節/後段卡片（手機 carousel 與桌面版不同尺寸；含配對用 data-* 標記）
    // Create chapter/back card; mobile carousel uses compact size; includes data for matching.
    // 建立章節卡片（作為配對目標）
    // Create a chapter card element as match target
    function createChapterCard(chapterText, originalData) {
            const card = document.createElement('div');
            
            // 在 carousel 中使用 full-width 垂直列表樣式（僅在手機視窗）
            const inCarousel = !!document.getElementById('versesCarousel') && window.matchMedia('(max-width: 760px)').matches;
            let widthClass = inCarousel ? 'w-full' : 'w-48';
            if (!inCarousel) {
                if (chapterText.length <= 8) widthClass = 'w-36';
                else if (chapterText.length <= 15) widthClass = 'w-44';
                else if (chapterText.length <= 25) widthClass = 'w-52';
                else widthClass = 'w-60';
            }
            const textSize = getCardTextSize(chapterText);

            // On mobile (carousel) use the same compact sizing as verse cards so front/back panels match
            card.className = inCarousel
                ? `chapter-card bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 p-2 text-center min-h-[64px] ${widthClass} flex items-center justify-between shadow-sm transition-all duration-150`
                : `chapter-card bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 p-4 text-center min-h-[80px] ${widthClass} flex items-center justify-center flex-shrink-0 shadow-lg hover:shadow-xl transition-all duration-300`;
            // 標記配對資訊（若為 easy 模式，originalData 包含 front/back/pairId）
            if (gameState.difficulty === 'easy' && originalData.pairId) {
                card.dataset.pairId = originalData.pairId;
                card.dataset.book = originalData.book;
                card.dataset.chapter = originalData.chapter;
            } else {
                card.dataset.book = originalData.book;
                card.dataset.chapter = originalData.chapter;
            }
            // 顯示原始章節文字（保留標點），章節文字使用紫色系
            card.innerHTML = `<div class="font-normal text-purple-800 ${textSize} leading-tight break-words text-center max-w-full">${chapterText}</div>`;
            
            // 鍵盤可達性
            card.setAttribute('tabindex', '0');
            card.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); handleChapterClick(card, originalData); }
            });
    card.addEventListener('click', () => {
        // Only show particles when selection is correct (handled inside handleChapterClick)
        handleChapterClick(card, originalData);
        });
            
            return card;
        }

    // 選取前段經文卡：設定選中樣式、顯示教學提示（僅第一關第一題），並在手機自動滑到後段面板
    // Select a verse: mark selected, possibly show first-level guide, and auto-slide to back panel on mobile.
    // 進入某一題（選定經文卡）；鎖定前面面板
    // Select a verse index and show its matching options
    function selectVerse(index) {
            // 移除之前選中的經文樣式
            document.querySelectorAll('.verse-card').forEach(card => {
                card.classList.remove('selected-verse');
            });
            
            // 選中當前經文
            const selectedCard = document.querySelector(`[data-index="${index}"]`);
            if (selectedCard && gameState.questionAttempts[index] > 0) {
                selectedCard.classList.add('selected-verse');
                gameState.selectedVerseIndex = index;

                // 僅在第一關的第一題顯示選擇章節/配對的提示
                if (gameState.currentLevel === 1 && gameState.isFirstQuestionOfLevel) {
                        // 先淡出上一個提示，再延遲顯示下一個提示，避免同時被隱藏
                        if (gameState._fadeVerseInstruction) {
                            gameState._fadeVerseInstruction();
                            gameState._fadeVerseInstruction = null;
                        }
                        const pairPool = (gameState.difficulty === 'easy') ? HINTS.play.pairEasy : HINTS.play.pairOther;
                        setTimeout(() => {
                            // 顯示第二段 2.8 秒
                            gameState._fadeChapterInstruction = showGameInstruction(pick(pairPool), 2800);
                        }, 260); // 等待上一個淡出動畫
                        gameState.isFirstQuestionOfLevel = false;
                }
                // 如果是在手機並存在 carousel，將視圖自動滑到後段章節面板，協助使用者選擇
                const carousel = document.getElementById('versesCarousel');
                if (carousel && window.innerWidth <= 760) {
                    // 僅水平滑動到第二個面板 (back)，避免影響垂直位置
                    const panels = carousel.querySelectorAll('.panel');
                    if (panels && panels.length > 1) {
                        const backPanel = panels[1];
                        try {
                            const carRect = carousel.getBoundingClientRect();
                            const backRect = backPanel.getBoundingClientRect();
                            const targetLeft = (backRect.left - carRect.left) + carousel.scrollLeft;
                            carousel.scrollTo({ left: targetLeft, behavior: 'smooth' });
                        } catch (_) {
                            // fallback
                            carousel.scrollLeft = backPanel.offsetLeft;
                        }
                    }
                }
                // 記錄本題開始作答時間（供罕見度自適應使用）
                try { gameState.currentQuestionStartTime = Date.now(); } catch(_) {}
                // 事件式速度段：若尚未啟動，從此刻開始計時
                try { if (gameMetrics && !gameMetrics.speedEventStartTs) gameMetrics.speedEventStartTs = Date.now(); } catch(_) {}
            }
        }

        // 手機環境下，將焦點與視窗回到前段經文面板並嘗試聚焦第一張經文卡
    // 手機：將 carousel 視角滑回前段面板，並盡量把焦點放回第一張經文卡（確保可達性）
    // Mobile: scroll carousel back to the front panel and focus first verse for accessibility.
    // 將前面板滾動到視口中（行動裝置優化）
    // Scroll the front panel into view for mobile
    function scrollToFrontPanel() {
            const carousel = document.getElementById('versesCarousel');
            if (!carousel || window.innerWidth > 760) return;
            const panels = carousel.querySelectorAll('.panel');
            if (!panels || panels.length === 0) return;
            const frontPanel = panels[0];
            try {
                // 僅水平滑動回前段面板，保持目前的垂直位置不變
                const carRect = carousel.getBoundingClientRect();
                const frontRect = frontPanel.getBoundingClientRect();
                const targetLeft = (frontRect.left - carRect.left) + carousel.scrollLeft;
                carousel.scrollTo({ left: targetLeft, behavior: 'smooth' });

                // 優先嘗試聚焦第一張經文卡，若不存在則聚焦 panel 本身（使用 tabindex -1 確保可聚焦）
                const firstVerse = frontPanel.querySelector('.verse-card');
                if (firstVerse) {
                    if (!firstVerse.hasAttribute('tabindex')) firstVerse.setAttribute('tabindex', '-1');
                    firstVerse.focus({ preventScroll: true });
                } else {
                    if (!frontPanel.hasAttribute('tabindex')) frontPanel.setAttribute('tabindex', '-1');
                    frontPanel.focus({ preventScroll: true });
                }
            } catch (e) {
                // defensive: ignore focus errors
            }
        }

    // 啟動關卡計時器（供時間獎勵與顯示）
    // Start per-level timer for time reward and display
    function startLevelTimer() {
        GameTimer.startLevel(updateCurrentScore, 100);
    }

    // recordInvalidSpeedSegment has been moved to metrics.js


    // 更新頂部分數顯示（含動畫）
    // Update the center score display with counting animation
    // updateCurrentScore 已移至 score.js, 使用 window.updateCurrentScore


        // getComboMultiplier 已移至 score.js, 使用 window.getComboMultiplier


        // addComboOnCorrect, dropCombo, updateComboUI 已移至 score.js


        // 共用：清除元素上可能阻礙「答對變綠」的錯誤/動畫/紅色類別
    // 清除卡片錯誤樣式
    // Clear error styles from a card element
    function clearErrorState(el) {
            if (!el) return;
            // 移除常見會造成錯誤視覺或阻礙變色的類別
            el.classList.remove('shake-error', 'bg-red-100', 'border-red-300');
            // 若元素內有文字節點，亦清除會覆蓋文字顏色的類別
            try {
                const inner = el.querySelector && el.querySelector('div');
                if (inner) {
                    inner.classList.remove('text-red-800', 'text-yellow-800', 'text-orange-800', 'text-blue-800', 'text-purple-800');
                }
            } catch (e) {
                // defensive: 如果不是 element 或 querySelector 發生例外，忽略
            }
        }

    // 使用者點擊章節卡時的核心判題/計分流程
    // Core answer handler when a chapter card is clicked
    function handleChapterClick(chapterCard, chapterData) {
            // 必須先選擇經文
            if (gameState.selectedVerseIndex === null) {
                return;
            }
            
            const selectedQuestion = gameState.questionData[gameState.selectedVerseIndex];
            
            // 檢查是否正確：
            // - easy：使用 pairId（前段/後段配對）
            // - normal：僅比對書卷名稱
            // - hard：比對書卷與章節
            let isCorrect = false;
            if (gameState.difficulty === 'easy') {
                isCorrect = !!(selectedQuestion.pairId && chapterCard.dataset.pairId && selectedQuestion.pairId === chapterCard.dataset.pairId);
            } else if (gameState.difficulty === 'normal') {
                isCorrect = selectedQuestion.book === chapterData.book;
            } else {
                isCorrect = selectedQuestion.book === chapterData.book && selectedQuestion.chapter === chapterData.chapter;
            }
            
            if (isCorrect) {
                // 移除舊的 recentAnswerTimes 蒐集（已改為逐關耗時 adaptiveVerseRarity）
                // SFX: correct answer
                try { SFX.play('correct'); } catch(_) {}
                // 淡出遊戲提示
                const existingInstructions = document.querySelectorAll('.game-instruction');
                existingInstructions.forEach(inst => {
                    inst.style.animation = 'instructionFadeOut 1s ease-out forwards';
                    setTimeout(() => {
                        if (inst.parentElement) {
                            inst.parentElement.removeChild(inst);
                        }
                    }, 1000);
                });
                // 同步隱藏可愛吐司提示
                try { hideCuteHint(); } catch (_) {}

                // 取消舊規則：不在答對時根據連續錯誤數顯示提示提醒（改採每關兩題完全答錯觸發）

                // 若該題有提示效果，立即移除（easy 模式使用 pairId）
                const hintVerseCard = document.querySelector(`[data-index="${gameState.selectedVerseIndex}"]`);
                if (hintVerseCard) hintVerseCard.classList.remove('hint-flash');
                if (gameState.difficulty === 'easy') {
                    const hintChapterCard = document.querySelector(`[data-pair-id="${selectedQuestion.pairId}"]`);
                    if (hintChapterCard) hintChapterCard.classList.remove('hint-flash');
                } else {
                    const hintChapterCard = document.querySelector(`[data-book="${chapterData.book}"][data-chapter="${chapterData.chapter}"]`);
                    if (hintChapterCard) hintChapterCard.classList.remove('hint-flash');
                }

                // 記錄答對時的失誤次數（用於進度條顏色判斷）
                const maxAttempts = { easy: 3, normal: 3, hard: 3 };
                const originalAttempts = maxAttempts[gameState.difficulty];
                const currentAttempts = gameState.questionAttempts[gameState.selectedVerseIndex];
                const hadMistakes = currentAttempts < originalAttempts;

                // 答對了
                let scoreGained = 0;
                if (gameState.questionAttempts[gameState.selectedVerseIndex] > 0) {
                    // 基礎分數：練習模式固定 100；排行模式依罕見度（常見/冷門/全部）100/125/150；每次失誤扣50分
                    const mistakeCount = originalAttempts - currentAttempts;
                    const inPractice = !!gameState.range;
                    const rarityBaseMap = { common: 100, rare: 125, all: 150 };
                    const basePerQuestion = inPractice ? 100 : (rarityBaseMap[gameState.rarity] || 100);
                    // 僅對「基礎分數（含失誤扣分）」套用 Combo 倍率；時間獎勵不加倍
                    const baseCore = basePerQuestion - (mistakeCount * 50);
                    const mult = getComboMultiplier(gameState.combo);
                    const baseClamped = Math.max(0, baseCore);
                    const baseWithCombo = Math.round(baseClamped * mult);
                    // 時間獎勵單獨計算（不受 Combo 影響）
                    let timeRewardScore = 0;
                    if (gameState.showTimeReward) {
                        timeRewardScore = updateCurrentScore();
                    }
                    const totalScore = baseWithCombo + timeRewardScore;
                    // 記錄 Combo 額外加成（用於結算明細）= 套用倍數後的基礎分 - 原始基礎分（下限 0）
                    const comboBonus = Math.max(0, baseWithCombo - baseClamped);
                    gameState.comboTotalBonus += comboBonus;
                    
                    gameState.score += totalScore;
                    scoreGained = totalScore;
                    gameState.totalCorrectAnswers++;
                }
                // Metrics: 記錄正確答題（毫秒）：以事件式段起點計
                try {
                    const baseTs = (gameMetrics && gameMetrics.speedEventStartTs) || __ansStart;
                    recordAnswer(true, Math.max(1, Date.now() - baseTs));
                    if (gameMetrics) gameMetrics.speedEventStartTs = Date.now();
                } catch(_) {}
                // 正確答案：提高 Combo
                addComboOnCorrect();
                
                // 標記為正確，並清除任何殘留的錯誤/動畫/紅色類別，確保文字能正確變成綠色
                chapterCard.classList.add('bg-green-100', 'border-green-300');
                chapterCard.classList.remove('bg-gradient-to-br', 'from-purple-50', 'to-purple-100', 'border-purple-300', 'chapter-arrow');
                // 清除可能殘留的錯誤／震動／紅色樣式，統一使用 helper
                clearErrorState(chapterCard);
                // 正確卡片給予輕微彈跳，不與平移衝突（縮放動畫）
                chapterCard.classList.remove('correct-pop');
                void chapterCard.offsetWidth; // reflow to restart
                chapterCard.classList.add('correct-pop');
                // 將章節文字改為綠色
                const chapterInner = chapterCard.querySelector('div');
                if (chapterInner) {
                    chapterInner.classList.remove('text-red-800', 'text-blue-800', 'text-purple-800');
                    chapterInner.classList.add('text-green-800');
                }
                
                // 移除經文卡片的選中狀態和點擊事件
                const verseCard = document.querySelector(`[data-index="${gameState.selectedVerseIndex}"]`);
                    if (verseCard) {
                    // mark verse correct and clear any lingering error/shake/red classes via helper
                    clearErrorState(verseCard);
                    verseCard.classList.remove('bg-blue-50', 'border-blue-200', 'bg-yellow-100', 'border-yellow-300', 'bg-orange-100', 'border-orange-300', 'selected-verse');
                    verseCard.classList.add('bg-green-100', 'border-green-300');
                    verseCard.style.pointerEvents = 'none';
                    verseCard.classList.remove('correct-pop');
                    void verseCard.offsetWidth;
                    verseCard.classList.add('correct-pop');
                    // 經文文字變綠表示答對
                    const innerText = verseCard.querySelector('div');
                    if (innerText) {
                        innerText.classList.remove('text-red-800', 'text-blue-800', 'text-purple-800');
                        innerText.classList.add('text-green-800');
                    }

                    // 簡單/普通難度：在該題前段/整段經文卡片下方顯示「書卷 章節」（例如：馬太福音 5:9）
                    if (gameState.difficulty === 'easy' || gameState.difficulty === 'normal') {
                        try {
                            const already = verseCard.querySelector('.verse-ref-label');
                            if (!already) {
                                const ref = document.createElement('div');
                                ref.className = 'verse-ref-label text-xs text-gray-700 font-semibold text-center';
                                ref.textContent = `${selectedQuestion.book || ''} ${selectedQuestion.chapter || ''}`.trim();
                                // 淡入效果
                                ref.style.opacity = '0';
                                ref.style.transition = 'opacity 260ms ease';
                                verseCard.appendChild(ref);
                                requestAnimationFrame(() => { ref.style.opacity = '1'; });
                                // 顯示 5 秒後淡出並移除
                                try { if (ref.__hideTimer) clearTimeout(ref.__hideTimer); } catch (e) {}
                                ref.__hideTimer = setTimeout(() => {
                                    try {
                                        ref.style.opacity = '0';
                                        const onEnd = () => {
                                            ref.removeEventListener('transitionend', onEnd);
                                            try { if (ref.parentElement) ref.parentElement.removeChild(ref); } catch (e2) {}
                                        };
                                        ref.addEventListener('transitionend', onEnd);
                                    } catch (e3) {}
                                }, 3000);
                            } else {
                                // 已存在：重置淡出計時並確保可見
                                already.style.transition = already.style.transition || 'opacity 260ms ease';
                                already.style.opacity = '1';
                                try { if (already.__hideTimer) clearTimeout(already.__hideTimer); } catch (e) {}
                                already.__hideTimer = setTimeout(() => {
                                    try {
                                        already.style.opacity = '0';
                                        const onEnd = () => {
                                            already.removeEventListener('transitionend', onEnd);
                                            try { if (already.parentElement) already.parentElement.removeChild(already); } catch (e2) {}
                                        };
                                        already.addEventListener('transitionend', onEnd);
                                    } catch (e3) {}
                                }, 3000);
                            }
                        } catch (e) { /* ignore label errors */ }
                    }
                }
                
                // 重置選中狀態
                gameState.selectedVerseIndex = null;
                
                // 更新題目進度顯示
                updateQuestionOvals();
                
                // 檢查是否完成所有題目
                setTimeout(() => checkLevelComplete(), 500);
                
                // 答題結束後，在手機上將焦點回到前段經文面板
                scrollToFrontPanel();

                if (scoreGained > 0) {
                    // 立即顯示加分數字
                    showScoreAnimation(`+${scoreGained}分`, false, verseCard);
                    // 立即顯示「Combo x N」（無延遲）；若卡片被移除則以中心區域為錨點
                    try {
                        const comboNowRaw = Math.max(0, Math.min(gameState.maxCombo || 25, gameState.combo || 0));
                        const comboNow = comboNowRaw >= 25 ? 'MAX' : comboNowRaw;
                        let anchor = verseCard;
                        try { if (!anchor || !anchor.isConnected) anchor = null; } catch(_) { anchor = null; }
                        showScoreAnimation(`Combo x ${comboNow}` , false, anchor);
                    } catch(_) { /* ignore */ }
                    // 生存模式：改為可變加秒（速度 + 高時間遞減 + 危險救援）與清除本題累積扣秒
                    try {
                        if (isSurvival()) {
                            const now = Date.now();
                            const elapsed = (now - (gameState.survivalLastAnswerTs || now)) / 1000;
                            const gain = computeSurvivalGain(elapsed);
                            adjustSurvivalTime(gain);
                            gameState.survivalLastAnswerTs = now;
                            gameState.survivalCorrectCount = (gameState.survivalCorrectCount|0) + 1; // increment phase counter
                            // 答對後，清除本題已累積扣秒（避免殘留到下一題）
                            try { if (gameState && gameState.survivalPenaltiesByQuestion) delete gameState.survivalPenaltiesByQuestion[gameState.selectedVerseIndex]; } catch(_) {}
                        }
                    } catch(_) {}
                    
                    // Emit subtle green-only particles to celebrate correct selection; count halved
                    try {
                        const rect = chapterCard.getBoundingClientRect();
                        const greens = ['#22C55E','#16A34A','#4ADE80','#86EFAC','#BBF7D0'];
                        spawnScoreParticles(null, rect, { colors: greens, glyph: '✹', count: 6, distanceMin: 50, distanceMax: 140, durationMs: 1800 });
                    } catch(_) { /* ignore */ }
                }
                // 刷新倒數條：答對題目後立即重置
                try { gameState.levelStartTime = Date.now(); gameState.__comboDroppedForTimeout = false; } catch(_) {}
                
            } else {
                // 答錯了
                // SFX: wrong answer
                try { SFX.play('wrong'); } catch(_) {}
                // 生存模式：非最終失誤立即扣「步進扣秒」；最終答錯時再補扣至目標總額
                let survivalPendingDelta = 0;
                try {
                    if (isSurvival()) {
                        const step = computeSurvivalPenaltyStep();
                        // 即刻扣秒
                        adjustSurvivalTime(-step);
                        survivalPendingDelta -= step;
                        // 記錄到本題累計
                        const q = gameState.selectedVerseIndex|0;
                        if (!gameState.survivalPenaltiesByQuestion) gameState.survivalPenaltiesByQuestion = {};
                        gameState.survivalPenaltiesByQuestion[q] = (gameState.survivalPenaltiesByQuestion[q]|0) + step;
                    }
                } catch(_) {}
                gameState.questionAttempts[gameState.selectedVerseIndex]--;
                gameState.levelPerfect = false;
                gameState.consecutiveMistakes++;
                gameState.totalMistakes++; // 增加失誤計數
                // 保留成就與統計紀錄；自 adaptiveVerseRarity 改版後不再收集 recentAnswerTimes。
                try {
                    const baseTs = (gameMetrics && gameMetrics.speedEventStartTs) || (gameState.currentQuestionStartTime || gameState.levelStartTime || Date.now());
                    recordAnswer(false, Math.max(1, Date.now() - baseTs));
                    if (gameMetrics) gameMetrics.speedEventStartTs = Date.now();
                } catch(_) {}
                
                // 淡出遊戲提示
                const existingInstructions = document.querySelectorAll('.game-instruction');
                existingInstructions.forEach(inst => {
                    inst.style.animation = 'instructionFadeOut 1s ease-out forwards';
                    setTimeout(() => {
                        if (inst.parentElement) {
                            inst.parentElement.removeChild(inst);
                        }
                    }, 1000);
                });
                // 同步隱藏可愛吐司提示
                try { hideCuteHint(); } catch (_) {}
                
                // 顯示失誤扣分動畫
                const verseCard = document.querySelector(`[data-index="${gameState.selectedVerseIndex}"]`);
                if (verseCard) {
                    showScoreAnimation('-50', false, verseCard);
                }
                
                // 取消舊規則：不再使用「連續 3 次失誤」作為提示提醒觸發條件
                
                // 添加震動效果到選錯的章節卡片（作用於內層以避免與位移動畫衝突）
                (function(){
                    const inner = chapterCard.querySelector('div') || chapterCard;
                    inner.classList.remove('shake-error');
                    void inner.offsetWidth; // reflow
                    inner.classList.add('shake-error');
                    setTimeout(() => { inner.classList.remove('shake-error'); }, 600);
                })();
                // 失誤：Combo 掉 3 級
                dropCombo(3);
                
                if (gameState.questionAttempts[gameState.selectedVerseIndex] <= 0) {
                    // 最終答錯：補扣至「目標總額」，避免雙重紅字重疊
                    try {
                        if (isSurvival()) {
                            const q = gameState.selectedVerseIndex|0;
                            const already = (gameState.survivalPenaltiesByQuestion && gameState.survivalPenaltiesByQuestion[q])|0;
                            const target = computeSurvivalPenaltyFinalTarget();
                            const need = Math.max(0, target - already);
                            survivalPendingDelta -= need;
                            if (need>0) adjustSurvivalTime(-need);
                            // 重置本題累計（避免外溢）
                            try { if (gameState && gameState.survivalPenaltiesByQuestion) delete gameState.survivalPenaltiesByQuestion[q]; } catch(_) {}
                            survivalPendingDelta = 0;
                        }
                    } catch(_) {}
                    // 沒有機會了，標記經文為錯誤
                    const verseCard = document.querySelector(`[data-index="${gameState.selectedVerseIndex}"]`);
                    if (verseCard) {
                        verseCard.classList.add('bg-red-100', 'border-red-300');
                        const vInner = verseCard.querySelector('div') || verseCard;
                        vInner.classList.remove('shake-error');
                        void vInner.offsetWidth; // reflow
                        vInner.classList.add('shake-error');
                        verseCard.classList.remove('bg-blue-50', 'border-blue-200', 'bg-yellow-100', 'border-yellow-300', 'bg-orange-100', 'border-orange-300', 'selected-verse');
                        verseCard.style.pointerEvents = 'none';
                        
                        // 將經文內容文字也改為紅色，表示此題已鎖定無法得分
                        const innerText = verseCard.querySelector('div');
                        if (innerText) {
                            innerText.classList.remove('text-blue-800', 'text-purple-800', 'text-green-800');
                            innerText.classList.add('text-red-800');
                        }

                        // 移除震動效果
                        setTimeout(() => { vInner.classList.remove('shake-error'); }, 600);
                    }
                    // 最終答錯：已於本次失誤時扣除 Combo，這裡重置倒數旗標並重置下一題計時起點
                    try { gameState.levelStartTime = Date.now(); gameState.__comboDroppedForTimeout = false; gameState.currentQuestionStartTime = Date.now(); } catch(_) {}
                    
                    // 找到正確答案並標記為紅色（只標記正確答案，不標記選錯的章節）
                    let correctChapter = null;
                    const allChapters = document.querySelectorAll('.chapter-card');
                    
                    for (let chapter of allChapters) {
                        // easy: 使用 pairId 比對
                        if (gameState.difficulty === 'easy' && selectedQuestion.pairId) {
                            if (chapter.dataset.pairId && chapter.dataset.pairId === selectedQuestion.pairId) {
                                correctChapter = chapter;
                                break;
                            }
                        } else if (gameState.difficulty === 'normal') {
                            if (chapter.dataset.book === selectedQuestion.book) {
                                correctChapter = chapter;
                                break;
                            }
                        } else {
                            if (chapter.dataset.book === selectedQuestion.book && chapter.dataset.chapter === selectedQuestion.chapter) {
                                correctChapter = chapter;
                                break;
                            }
                        }
                    }
                    
                    // 只將正確答案標記為紅色，不標記選錯的章節
                    if (correctChapter) {
                        correctChapter.classList.add('bg-red-100', 'border-red-300');
                        const cInner = correctChapter.querySelector('div') || correctChapter;
                        cInner.classList.remove('shake-error');
                        void cInner.offsetWidth; // reflow
                        cInner.classList.add('shake-error');
                        correctChapter.classList.remove('bg-gradient-to-br', 'from-purple-50', 'to-purple-100', 'border-purple-300');
                        correctChapter.style.pointerEvents = 'none';
                        // 答案文字也改為紅色以示提示
                        const correctInner = correctChapter.querySelector('div');
                        if (correctInner) {
                            correctInner.classList.remove('text-blue-800', 'text-purple-800', 'text-green-800');
                            correctInner.classList.add('text-red-800');
                        }
                        
                        // 移除震動效果
                        setTimeout(() => { cInner.classList.remove('shake-error'); }, 600);
                    }
                    
                    // 取消舊規則：不再於「該題無法再得分」時彈出提示提醒（避免在困難模式首次失誤即觸發）

                    // 新規則：統計本關「完全答錯」題數；同一關中任兩題完全答錯時，若本局尚未提醒且仍有提示次數，顯示一次提醒
                    // Hint rule: count per-level fully-wrong questions; on the 2nd fully wrong,
                    // show a one-time hint reminder for this run if hints remain.
                    try {
                        gameState.levelFailedCount = (gameState.levelFailedCount || 0) + 1;
                        if (gameState.levelFailedCount >= 2 && !gameState.firstNoScoreMissToastShown && gameState.hintsRemaining > 0) {
                            showCuteHint('卡關了嗎？可以試試提示功能喔～', 'amber', 3200, '💡');
                            gameState.firstNoScoreMissToastShown = true;
                        }
                    } catch (_) {}

                    // 刷新倒數條：該題最終判定為答錯時（非僅失誤）立即重置
                    try { gameState.levelStartTime = Date.now(); } catch(_) {}

            // 新規則：當本關「剩 2 題」時，若其中一題被判定為錯（本段即處理該題），
            // 另一題將直接判定為答錯，並進入下一關（無額外扣分動畫）
            // New rule: when a level has 2 questions remaining and one just became wrong,
            // auto-mark the other remaining question as wrong and proceed (no extra penalty animation)
                    try {
                        const total = Array.isArray(gameState.questionData) ? gameState.questionData.length : 0;
                        if (total > 0) {
                            const remaining = [];
                            for (let i = 0; i < total; i++) {
                                const vc = document.querySelector(`[data-index="${i}"]`);
                                if (!vc) continue;
                                const isDoneWrong = vc.classList.contains('bg-red-100');
                                const isDoneRight = vc.classList.contains('bg-green-100');
                                if (!isDoneWrong && !isDoneRight) remaining.push(i);
                            }
                // 若在本題被判錯後只剩 1 題未完成，表示原先剩 2 題，依規則將最後一題直接判錯
                if (remaining.length === 1) {
                                const remIdx = remaining[0];
                                const q = gameState.questionData[remIdx];
                                // 將剩餘題目直接標記為錯誤（不顯示扣分動畫，不更動分數）
                                gameState.questionAttempts[remIdx] = 0;
                                const remVerseCard = document.querySelector(`[data-index="${remIdx}"]`);
                                if (remVerseCard) {
                                    clearErrorState(remVerseCard);
                                    remVerseCard.classList.remove('bg-blue-50','border-blue-200','bg-yellow-100','border-yellow-300','bg-orange-100','border-orange-300','selected-verse');
                                    remVerseCard.classList.add('bg-red-100','border-red-300');
                                    remVerseCard.style.pointerEvents = 'none';
                                    const inner = remVerseCard.querySelector('div');
                                    if (inner) {
                                        inner.classList.remove('text-blue-800','text-yellow-800','text-orange-800','text-green-800');
                                        inner.classList.add('text-red-800');
                                    }
                                }
                                // 記錄一筆「無效」答題速度段（最後一題自動判錯）
                                try { if (typeof recordInvalidSpeedSegment==='function') recordInvalidSpeedSegment(); } catch(_) {}
                                // 同步標示正確答案章節（紅色）
                                try {
                                    let correctChapter = null;
                                    const allChapters = document.querySelectorAll('.chapter-card');
                                    for (let chapter of allChapters) {
                                        if (gameState.difficulty === 'easy' && q.pairId) {
                                            if (chapter.dataset.pairId && chapter.dataset.pairId === q.pairId) { correctChapter = chapter; break; }
                                        } else if (gameState.difficulty === 'normal') {
                                            if (chapter.dataset.book === q.book) { correctChapter = chapter; break; }
                                        } else {
                                            if (chapter.dataset.book === q.book && chapter.dataset.chapter === q.chapter) { correctChapter = chapter; break; }
                                        }
                                    }
                                    if (correctChapter) {
                                        correctChapter.classList.add('bg-red-100','border-red-300');
                                        correctChapter.classList.remove('bg-gradient-to-br','from-purple-50','to-purple-100','border-purple-300');
                                        correctChapter.style.pointerEvents = 'none';
                                        const ci = correctChapter.querySelector('div');
                                        if (ci) {
                                            ci.classList.remove('text-blue-800','text-purple-800','text-green-800');
                                            ci.classList.add('text-red-800');
                                        }
                                    }
                                } catch(_) {}

                                // 清理狀態並刷新進度（後續會有統一的完成檢查排程）
                                gameState.selectedVerseIndex = null;
                                updateQuestionOvals();
                                // 視圖回到前段面板
                                scrollToFrontPanel();
                            }
                        }
                    } catch(_) {}

                    // 移除選中狀態
                    gameState.selectedVerseIndex = null;
                    
                    // 更新題目進度顯示
                    updateQuestionOvals();
                    
                    // 檢查是否所有題目都完成
                    setTimeout(() => checkLevelComplete(), 500);

                    // 若該題次數用盡，將視圖回到前段面板，方便使用者查看下一題
                    scrollToFrontPanel();
                } else {
                    // 還有機會，更新經文卡片顏色並保持選中狀態
                    // 不重置 currentQuestionStartTime，讓本題持續計時直至成功或最終錯誤
                    updateVerseCardColor(gameState.selectedVerseIndex);
                }
            }
        }

    // 依答題狀態改變經文卡顏色（對/錯/未答）
    // Update verse card color based on answer state
    function updateVerseCardColor(index) {
            const verseCard = document.querySelector(`[data-index="${index}"]`);
            if (!verseCard) return;
            
            const attempts = gameState.questionAttempts[index];
            const maxAttempts = { easy: 3, normal: 3, hard: 3 };
            const originalAttempts = maxAttempts[gameState.difficulty];
            
            // 移除所有顏色類別
            verseCard.classList.remove('bg-blue-50', 'border-blue-200', 'bg-yellow-100', 'border-yellow-300', 'bg-orange-100', 'border-orange-300', 'bg-red-100', 'border-red-300');
            
            // 若該經文還未作答（嘗試次數等於原始次數），一律顯示藍色
            if (attempts === originalAttempts) {
                verseCard.classList.add('bg-blue-50', 'border-blue-200');
                // 文字回復藍色
                const inner = verseCard.querySelector('div');
                if (inner) {
                    inner.classList.remove('text-red-800', 'text-purple-800', 'text-green-800');
                    inner.classList.add('text-blue-800');
                }
            } else {
                // 已經作答過但還有機會，根據剩餘次數顯示不同顏色
                if (attempts === 2) {
                    verseCard.classList.add('bg-yellow-100', 'border-yellow-300');
                    const inner = verseCard.querySelector('div');
                    if (inner) {
                        inner.classList.remove('text-red-800', 'text-blue-800', 'text-green-800');
                        inner.classList.add('text-yellow-800');
                    }
                } else if (attempts === 1) {
                    verseCard.classList.add('bg-orange-100', 'border-orange-300');
                    const inner = verseCard.querySelector('div');
                    if (inner) {
                        inner.classList.remove('text-red-800', 'text-blue-800', 'text-green-800');
                        inner.classList.add('text-orange-800');
                    }
                } else if (attempts === 0) {
                    verseCard.classList.add('bg-red-100', 'border-red-300');
                    const inner = verseCard.querySelector('div');
                    if (inner) {
                        inner.classList.remove('text-blue-800', 'text-yellow-800', 'text-orange-800', 'text-green-800');
                        inner.classList.add('text-red-800');
                    }
                }
            }
            
            // 更新題目進度顯示
            updateQuestionOvals();
        }

    // 檢查本關是否完成，結算 perfect/complete/partial/failed 狀態
    // Check if level is finished and set result state
    function checkLevelComplete() {
            // 確保有題目數據
            if (!gameState.questionData || gameState.questionData.length === 0) {
                console.log('沒有題目數據，無法檢查關卡完成狀態');
                return;
            }
            // 若本關結束流程已處理過，直接跳出避免重入
            // If end-of-level has been handled already, return early to prevent re-entry
            if (gameState.levelEndHandled) {
                return;
            }
            
            const completedQuestions = gameState.questionData.filter((_, index) => {
                const verseCard = document.querySelector(`[data-index="${index}"]`);
                return verseCard && (verseCard.classList.contains('bg-green-100') || verseCard.classList.contains('bg-red-100'));
            }).length;
            
            console.log(`已完成題目: ${completedQuestions}/${gameState.questionData.length}`);
            
            if (completedQuestions === gameState.questionData.length) {
                // 標記：本關結束流程已處理，避免重複觸發
                // Mark: handled to avoid duplicate transitions/scoring
                gameState.levelEndHandled = true;
                // 停止計時器
                GameTimer.stopLevel();
                
                // 檢查獎勵
                const correctQuestions = gameState.questionData.filter((_, index) => {
                    const verseCard = document.querySelector(`[data-index="${index}"]`);
                    return verseCard && verseCard.classList.contains('bg-green-100');
                }).length;
                
                const allCorrect = correctQuestions === gameState.questionData.length;
                console.log(`答對題目: ${correctQuestions}/${gameState.questionData.length}, 全對: ${allCorrect}`);
                
                // 記錄關卡結果
                // 檢查是否有使用過提示的題目（僅考慮本關的提示記錄）
                const levelUsedHints = Array.from(gameState.usedHints).some(h => {
                    const s = String(h);
                    // new format: "<level>|<questionIndex>"
                    if (s.indexOf('|') !== -1) return s.startsWith(`${gameState.currentLevel}|`);
                    // fallback: numeric entries (legacy) - treat as belonging to this level only if they look like an index
                    const n = Number(s);
                    return !isNaN(n) && n < gameState.questionData.length;
                });
                
                if (gameState.levelPerfect && !levelUsedHints && allCorrect) {
                    // 完美關卡（全對且無提示且無失誤）
                    gameState.levelResults[gameState.currentLevel] = 'perfect';
                    try { recordLevelResult(true); } catch(_) {}
                    gameState.score += 300;
                    showScoreAnimation('完美+300分', true);
                    try { SFX.play('uiConfirm'); } catch(_) {}
                    // 桌面：啟動持續星星雨
                    try { startStarRain(); } catch(_) {}
                    // 震撼特效（金色）
                    try { triggerLevelEffect('perfect'); } catch(_) {}
                    console.log('完美關卡！');
                } else if (allCorrect) {
                    // 全對關卡（全對但可能用了提示或有失誤）
                    gameState.levelResults[gameState.currentLevel] = 'complete';
                    try { recordLevelResult(false); } catch(_) {}
                    gameState.score += 100;
                    showScoreAnimation('全對+100分', true);
                    try { SFX.play('uiConfirm'); } catch(_) {}
                    // 非完美：停止星星雨
                    try { stopStarRain(false); } catch(_) {}
                    // 震撼特效（綠色）
                    try { triggerLevelEffect('complete'); } catch(_) {}
                    console.log('全對關卡！');
                } else {
                    // 部分正確或全錯
                    if (correctQuestions === 0) {
                        // 題目全錯：標記為失敗（紅色）
                        gameState.levelResults[gameState.currentLevel] = 'failed';
                        try { SFX.play('wrong'); } catch(_) {}
                        // 震撼特效（紅色）
                        try { triggerLevelEffect('failed'); } catch(_) {}
                        console.log('全錯關卡');
                    } else {
                        gameState.levelResults[gameState.currentLevel] = 'partial';
                        try { recordLevelResult(false); } catch(_) {}
                        console.log('部分正確關卡');
                    }
                    // 非完美：停止星星雨
                    try { stopStarRain(false); } catch(_) {}
                }
                
                // 立即更新關卡進度顯示
                updateLevelOvals();
                // 關卡結束後嘗試即時成就評估（例如連續完美/層數）
                try { evaluateRealtimeAchievements(); } catch(_) {}
                // 裝備課程時，不進入闖關模式的切關流程（由 equip 流程自行管控）
                if (gameState.equipRunning) {
                    return; // avoid classic slide-out handoff calling nextLevel/completeGame
                }
                // 小螢幕：將視角移到最上方的分數卡，讓玩家看見得分與動畫
                try { scrollScoreIntoView(); } catch (e) { /* ignore */ }
                
                // 進/出場動畫：先讓紅色錯題卡片進行零散掉落；
                // 之後再讓其他卡片（綠色或未作答）不規則向左滑出。
                try {
                    const verses = Array.from(document.querySelectorAll('#gameVerses .verse-card'));
                    const chapters = Array.from(document.querySelectorAll('#gameChapters .chapter-card'));
                    const prefersReduce = (typeof isReducedMotionPreferred === 'function') ? isReducedMotionPreferred() : (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                    let slideWait = 0; // 綠卡/未作答滑出總時長
                    let fallWait = 0;  // 紅卡掉落總時長（不影響切關時間）
                    // Wrong cards: fall scattered first
                    const wrongGroup = [
                        ...verses.filter(el => el.classList.contains('bg-red-100')),
                        ...chapters.filter(el => el.classList.contains('bg-red-100'))
                    ];
                    const wrongStartOffset = 0; // 紅卡優先立即掉落
                    wrongGroup.forEach((el, i) => {
                        const jitter = (min, max) => Math.random() * (max - min) + min;
                        const fx = Math.round(jitter(-40, 80));
                        const fy = Math.round(jitter(180, 320));
                        const fr = `${jitter(-24, 36).toFixed(2)}deg`;
                        const fd = Math.round(jitter(700, 1000));
                        // 更明顯的掉落時間差：加大每張卡的基礎間距與隨機抖動
                        const fdly = Math.round(wrongStartOffset + i * 90 + jitter(0, 260));
                        el.style.setProperty('--fallDelay', `${fdly}ms`);
                        el.style.setProperty('--fx', `${fx}px`);
                        el.style.setProperty('--fy', `${fy}px`);
                        el.style.setProperty('--fr', fr);
                        el.style.setProperty('--fallDur', `${fd}ms`);
                        // 移除可能存在的進/出場 class 以避免衝突
                        el.classList.remove('card-enter', 'card-exit');
                        el.classList.add('card-fall-scatter');
                        fallWait = Math.max(fallWait, fdly + fd);
                    });

                    // Correct or untouched cards: slide out left with stagger (1s duration)
                    const slideGroup = [];
                    verses.forEach((el) => {
                        const isWrong = el.classList.contains('bg-red-100');
                        if (!isWrong) slideGroup.push(el);
                    });
                    chapters.forEach((el) => {
                        const isWrong = el.classList.contains('bg-red-100');
                        if (!isWrong) slideGroup.push(el);
                    });
                    const slideStartOffset = prefersReduce ? 200 : 240; // 讓紅卡先明顯開始
                    slideGroup.forEach((el, i) => {
                        const jitter = (min, max) => Math.random() * (max - min) + min;
                        const delay = Math.round(slideStartOffset + i * 40 + jitter(0, 160));
                        const ex = Math.round(jitter(0, 80));
                        const ey = Math.round(jitter(-12, 12));
                        // 綠色與未作答卡片不傾斜：退出時不旋轉
                        const er = '0deg';
                        const dur = 1000; // 指定 1 秒
                        el.style.setProperty('--exitDelay', `${delay}ms`);
                        el.style.setProperty('--exitX', `${ex}px`);
                        el.style.setProperty('--exitY', `${ey}px`);
                        el.style.setProperty('--exitR', er);
                        el.style.setProperty('--exitDur', `${dur}ms`);
                        // 移除進場效果避免干擾
                        el.classList.remove('card-enter', 'card-fall-scatter', 'correct-pop');
                        el.classList.add('card-exit');
                        slideWait = Math.max(slideWait, delay + dur);
                    });

                    // 全紅情境：若無任何可滑出的卡片（全部為紅色），則等待紅卡掉落全程再切關；
                    // 其他情境：只等待綠卡/未作答滑出完成，保留極短緩衝即可銜接下一關
                    let pause = 0;
                    if (prefersReduce) {
                        pause = 0;
                    } else if (slideGroup.length === 0) {
                        // 等待紅卡掉落完成，並加上小緩衝
                        pause = Math.max(0, fallWait + 30);
                    } else {
                        pause = Math.max(0, slideWait + 5);
                    }
                    gameState.__levelAnimDelay = pause;
                    // 切關等待期間鎖定互動
                    setLevelInteractionLock(true);
                } catch (_) { gameState.__levelAnimDelay = 800; }

                // 使用更短的延遲並確保執行（加入動畫暫停時間）
                // 加入 watchdog，避免偶發例外或動畫干擾導致無法切關
                try { if (gameState.__handoffGuard) { clearTimeout(gameState.__handoffGuard); } } catch(_) {}
                const handoffLevel = gameState.currentLevel;
                gameState.__handoffDone = false;
                const runHandoff = () => {
                    // 避免重複執行
                    if (gameState.__handoffDone) return;
                    console.log(`當前關卡: ${gameState.currentLevel}`);
                    const safeCall = (fn) => {
                        try { fn(); } catch (e) { console.error('關卡切換發生例外，嘗試保護性解鎖', e); }
                        finally {
                            gameState.__handoffDone = true;
                            // 保護性解鎖（nextLevel/completeGame 正常會自行解鎖）
                            try { setLevelInteractionLock(false); } catch(_) {}
                        }
                    };
                    const maxLevels = getLevelCount();
                    if (!maxLevels || isSurvival()) {
                        // Survival mode doesn't auto-complete on level; continue until timer ends
                        console.log('生存模式：持續下一關');
                        try { showLevelEncouragementCute(); } catch (e) {}
                        setTimeout(() => { console.log('執行下一關'); safeCall(() => nextLevel()); }, 30);
                        return;
                    }
                    if (gameState.currentLevel >= maxLevels) {
                        console.log('遊戲完成！');
                        try { showLevelEncouragementCute(); } catch (e) {}
                        setTimeout(() => { console.log('執行完成遊戲'); safeCall(() => completeGame()); }, 30);
                    } else {
                        console.log('進入下一關');
                        try { showLevelEncouragementCute(); } catch (e) {}
                        setTimeout(() => { console.log('執行下一關'); safeCall(() => nextLevel()); }, 30);
                    }
                };

                setTimeout(runHandoff, (gameState.__levelAnimDelay || 0));
                // Watchdog：若主流程在合理時間內未完成，強制執行（pause + 2500ms）
                const guardDelay = (gameState.__levelAnimDelay || 0) + 2500;
                gameState.__handoffGuard = setTimeout(() => {
                    if (!gameState.__handoffDone && handoffLevel === gameState.currentLevel) {
                        console.warn('[Watchdog] 關卡切換逾時，啟動保護性切換');
                        runHandoff();
                    }
                }, guardDelay);
            }
        }

        // 小螢幕：平滑捲到頁面頂端，確保上方關卡進度也可見
    // 小畫面時把分數區域捲入視口
    // Scroll score area into view on small screens
    function scrollScoreIntoView() {
            // 僅在小螢幕上進行自動捲動（避免桌面用戶被干擾）
            if (window.innerWidth > 640) return;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

    // 關卡切換等待期間鎖定互動，避免動畫中點擊/焦點/捲動異常
    // Lock interactions on main containers during level handoff wait
    function setLevelInteractionLock(lock) {
            try {
                const ids = ['gameVerses', 'gameChapters', 'versesCarousel'];
                ids.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.pointerEvents = lock ? 'none' : '';
                });
                // 同步處理提示按鈕，避免期間被觸發
                const hintBtn = document.getElementById('hintBtn');
                if (hintBtn) {
                    if (lock) {
                        if (!hintBtn.dataset.locked) hintBtn.dataset.locked = '1';
                        hintBtn.disabled = true;
                        hintBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    } else {
                        if (hintBtn.dataset.locked === '1') {
                            delete hintBtn.dataset.locked;
                            if (gameState.hintsRemaining > 0) {
                                hintBtn.disabled = false;
                                hintBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                            }
                        }
                    }
                }
            } catch(_) { /* non-fatal */ }
        }

    // ===== 全畫面關卡特效（完美/全對/全錯） =====
    // 插入一次性樣式
    function ensureLevelFxStyles() {
            if (document.getElementById('levelFxStyles')) return;
            const style = document.createElement('style');
            style.id = 'levelFxStyles';
            style.textContent = `
            .level-fx-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 10020; overflow: hidden; }
            .level-fx-flash { position:absolute; inset:0; opacity:0; }
            .level-fx-radial { position:absolute; inset:-10%; opacity:0.18; filter: blur(2px); }
            .level-fx-particle { position:absolute; left:50%; top:50%; width:10px; height:10px; opacity:0; border-radius: 2px; will-change: transform, opacity; }
            .level-fx-star { width:12px; height:12px; background: currentColor; clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
            .level-fx-circle { border-radius: 9999px; }
            .level-fx-square { }
            .level-fx-overlay.level-fx-shake { animation: megaShake 900ms cubic-bezier(.36,.07,.19,.97) both; }
            @keyframes levelFlash { 0%{opacity:0} 10%{opacity:.95} 100%{opacity:0} }
            @keyframes particleExplode { 0% { opacity:1; transform: translate(-50%,-50%) scale(0.4) rotate(0deg); } 100% { opacity:0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1) rotate(var(--rot)); } }
            @keyframes megaShake {
                0% { transform: translate(0, 0) }
                10% { transform: translate(-14px, -10px) }
                20% { transform: translate(16px, 12px) }
                30% { transform: translate(-12px, 10px) }
                40% { transform: translate(12px, -14px) }
                50% { transform: translate(-8px, 8px) }
                60% { transform: translate(10px, -6px) }
                70% { transform: translate(-6px, 10px) }
                80% { transform: translate(6px, -8px) }
                90% { transform: translate(-4px, 6px) }
                100% { transform: translate(0, 0) }
            }
            /* Global Touch Ripple */
            .touch-ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                transform: translate(-50%, -50%) scale(0);
                animation: ripplePop 0.5s ease-out forwards;
                pointer-events: none;
                z-index: 99999;
                width: 4px;
                height: 4px;
                box-shadow: 0 0 10px rgba(255,255,255,0.4);
            }
            @keyframes ripplePop {
                0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; width: 4px; height: 4px; }
                100% { transform: translate(-50%, -50%) scale(25); opacity: 0; width: 4px; height: 4px; }
            }
            `;
            document.head.appendChild(style);
        }

    // 觸發關卡特效：type = 'perfect' | 'complete' | 'failed'
    function triggerLevelEffect(type) {
            try {
                const reduce = (typeof isReducedMotionPreferred === 'function') ? isReducedMotionPreferred() : (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                ensureLevelFxStyles();
                const overlay = document.createElement('div');
                overlay.className = 'level-fx-overlay';
                // 色盤
                let colors = [];
                let flashBg = '';
                // 調整動畫時長：全對（complete）略短且較柔和
                const flashDur = reduce ? 300 : (type === 'complete' ? 700 : 900);
                const particleDur = reduce ? 500 : (type === 'complete' ? 900 : 1200);
                if (type === 'perfect') {
                    colors = ['#FBBF24','#F59E0B','#FFD54F','#FFF3B0','#FFFFFF'];
                    flashBg = 'radial-gradient(ellipse at center, rgba(255,223,128,0.92), rgba(255,190,60,0.66) 40%, rgba(255,184,28,0.0) 70%)';
                } else if (type === 'complete') {
                    // 使用較柔和的綠色，降低閃光透明度
                    colors = ['#86EFAC','#A7F3D0','#6EE7B7','#34D399','#BBF7D0'];
                    flashBg = 'radial-gradient(ellipse at center, rgba(52,211,153,0.55), rgba(16,185,129,0.30) 40%, rgba(16,185,129,0.0) 70%)';
                } else { // failed
                    colors = ['#EF4444','#DC2626','#F87171','#FB7185','#991B1B'];
                    flashBg = 'radial-gradient(ellipse at center, rgba(239,68,68,0.85), rgba(220,38,38,0.55) 40%, rgba(220,38,38,0.0) 70%)';
                    overlay.classList.add('level-fx-shake');
                }

                // 閃光層
                const flash = document.createElement('div');
                flash.className = 'level-fx-flash';
                flash.style.background = flashBg;
                flash.style.animation = `levelFlash ${flashDur}ms ease-out forwards`;
                overlay.appendChild(flash);

                // 放射淡層
                const radial = document.createElement('div');
                radial.className = 'level-fx-radial';
        radial.style.background = type === 'perfect'
                    ? 'radial-gradient(circle at center, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 35%, rgba(255,255,255,0) 70%)'
                    : type === 'complete'
            ? 'radial-gradient(circle at center, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.04) 35%, rgba(34,197,94,0) 70%)'
                        : 'radial-gradient(circle at center, rgba(239,68,68,0.25) 0%, rgba(239,68,68,0.06) 35%, rgba(239,68,68,0) 70%)';
                overlay.appendChild(radial);

                // 粒子爆裂
        const count = reduce ? 20 : (type === 'perfect' ? 90 : type === 'complete' ? 40 : 64);
                const shapes = ['level-fx-star','level-fx-circle','level-fx-square'];
                for (let i = 0; i < count; i++) {
                    const p = document.createElement('div');
                    p.className = `level-fx-particle ${shapes[i % shapes.length]}`;
                    p.style.color = colors[Math.floor(Math.random()*colors.length)];
                    const ang = Math.random() * Math.PI * 2;
                    const dist = (type === 'failed' ? 320 : 380) * (0.45 + Math.random()*0.75);
                    const dx = Math.cos(ang) * dist;
                    const dy = Math.sin(ang) * dist;
                    const rot = `${Math.round((Math.random()*720-360))}deg`;
                    p.style.setProperty('--dx', `${dx}px`);
                    p.style.setProperty('--dy', `${dy}px`);
                    p.style.setProperty('--rot', rot);
                    const size = (type === 'perfect' ? 8 : 7) + Math.round(Math.random()*10);
                    p.style.width = `${size}px`;
                    p.style.height = `${size}px`;
                    p.style.animation = `particleExplode ${particleDur}ms cubic-bezier(.17,.67,.37,1) ${Math.round(Math.random()*120)}ms forwards`;
                    overlay.appendChild(p);
                }

                document.body.appendChild(overlay);
                // 清理
                setTimeout(() => { try { if (overlay.parentElement) overlay.parentElement.removeChild(overlay); } catch(_) {} }, reduce ? 600 : (type === 'complete' ? 1100 : 1300));
            } catch(_) { /* non-fatal */ }
        }

    // 使用提示一次（每關最多提醒一次未使用提示）
    // Use a hint and maybe show per-level reminder
    function useHint() {
        try { SFX.play('hint'); } catch(_) {}
            if (gameState.hintsRemaining <= 0) return;
            const hintBtn = document.getElementById('hintBtn');
            if (hintBtn.disabled) return;

            // 禁用提示按鈕，避免連續誤點
            hintBtn.disabled = true;
            hintBtn.classList.add('opacity-50', 'cursor-not-allowed');

            // 找到所有未完成且未答錯的題目
            const availableQuestions = [];
            gameState.questionData.forEach((question, index) => {
                const verseCard = document.querySelector(`[data-index="${index}"]`);
                if (verseCard &&
                    !verseCard.classList.contains('bg-green-100') &&
                    !verseCard.classList.contains('bg-red-100') &&
                    gameState.questionAttempts[index] > 0) {
                    availableQuestions.push(index);
                }
            });
            if (availableQuestions.length === 0) {
                // 沒有可提示題目，立即恢復按鈕
                setTimeout(() => {
                    if (gameState.hintsRemaining > 0) {
                        hintBtn.disabled = false;
                        hintBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                }, 500);
                return;
            }

            // 扣除提示次數
            gameState.hintsRemaining--;
            // 成就指標：使用提示一次
            try { recordHint(); } catch(_) {}
            updateGameUI();

            // Prefer the currently selected question if the player has one selected and it's still answerable;
            // otherwise pick a random available question.
            let selectedQuestionIndex = null;
            if (gameState.selectedVerseIndex != null) {
                const sel = gameState.selectedVerseIndex;
                const selCard = document.querySelector(`[data-index="${sel}"]`);
                const selAttempts = typeof gameState.questionAttempts[sel] === 'number' ? gameState.questionAttempts[sel] : 0;
                const selNotAnswered = selCard && !selCard.classList.contains('bg-green-100') && !selCard.classList.contains('bg-red-100') && selAttempts > 0;
                if (selNotAnswered) selectedQuestionIndex = sel;
            }

            if (selectedQuestionIndex == null) {
                const randomIndex = Math.floor(Math.random() * availableQuestions.length);
                selectedQuestionIndex = availableQuestions[randomIndex];
            }
            const selectedQuestion = gameState.questionData[selectedQuestionIndex];
            try {
                const levelKey = `${gameState.currentLevel}|${selectedQuestionIndex}`;
                gameState.usedHints.add(levelKey);
            } catch (e) {
                // fallback for environments where usedHints may not be a Set
                try { gameState.usedHints.add(selectedQuestionIndex); } catch (ee) { /* ignore */ }
            }

            // 清除所有現有的提示效果
            document.querySelectorAll('.hint-flash').forEach(element => {
                element.classList.remove('hint-flash');
            });

            // 找到正確的章節卡片（easy 使用 pairId）
            const verseCard = document.querySelector(`[data-index="${selectedQuestionIndex}"]`);
            let correctChapter = null;
            if (gameState.difficulty === 'easy' && selectedQuestion.pairId) {
                correctChapter = document.querySelector(`[data-pair-id="${selectedQuestion.pairId}"]`);
            } else {
                correctChapter = document.querySelector(`[data-book="${selectedQuestion.book}"][data-chapter="${selectedQuestion.chapter}"]`);
            }
            if (correctChapter && verseCard) {
                correctChapter.classList.add('hint-flash');
                verseCard.classList.add('hint-flash');
                // 4秒後移除效果並恢復按鈕
                setTimeout(() => {
                    correctChapter.classList.remove('hint-flash');
                    verseCard.classList.remove('hint-flash');
                    if (gameState.hintsRemaining > 0) {
                        hintBtn.disabled = false;
                        hintBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                }, 4000);
            } else {
                // 若找不到卡片，1秒後恢復按鈕
                setTimeout(() => {
                    if (gameState.hintsRemaining > 0) {
                        hintBtn.disabled = false;
                        hintBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                }, 1000);
            }
        }
        


    // parseDeltaFromDisplayText, processCenterQueue, enqueueCenterScoreDelta moved to score.js

    // showScoreAnimation moved to score.js
        
    // 完美關卡特效已移至 score.js

        
    // 全對特效已移至 score.js


        

    // 顯示遊戲提示（可愛吐司）；回傳隱藏函數
    // Show a cute in-game toast; returns a hide function
    function showGameInstruction(text, autoFadeMs = 2000) {
            // 使用可愛吐司提示取代覆蓋層
            // 若傳入 0 表示不要自動隱藏；若未提供則採用預設 2000ms
            const dur = (typeof autoFadeMs === 'number') ? autoFadeMs : 2000;
            showCuteHint(text, 'purple', dur, '✨');
            // 回傳淡出函數供外部手動調用
            return () => hideCuteHint();
        }
        
    // 顯示一次性的提示提醒（每關一回）
    // Show a one-time per-level hint reminder
    function showHintReminder() {
            // 用可愛吐司提示提醒有提示功能
            showCuteHint(pick(HINTS.hintReminder), 'amber', 2400, '💡');
        }

    // 依 combo 門檻自適應調整難度（於切關時套用到下一關）
    function applyAdaptiveDifficulty() {
                // Disable adaptive adjustments during a same-question replay sequence
                if (gameState._adaptiveDisabled) return;
            try {
                const c = Number(gameState.combo || 0);
                const nextDiff = getDifficultyFromCombo(c);
                // 僅在變更時套用並提示
                if (nextDiff !== gameState.difficulty) {
                    gameState.difficulty = nextDiff;
                    gameState._lastAdaptiveDifficulty = nextDiff;
                    // 更新遊戲中的設定顯示卡片
                    try { updateSettingsDisplay(); } catch(_) {}
                    // 以可愛吐司提示玩家難度調整
                    const msg = nextDiff === 'easy' ? '難度調整：簡單' : nextDiff === 'normal' ? '難度提升：普通' : '難度提升：困難';
                    const theme = nextDiff === 'easy' ? 'green' : nextDiff === 'normal' ? 'amber' : 'red';
                    const icon = nextDiff === 'easy' ? '🌱' : nextDiff === 'normal' ? '⭐' : '🔥';
                    showCuteHint(msg, theme, 1600, icon);
                    try { updateAdaptiveStatus(); } catch(_) {}
                }

                    // ====== 新：逐關經文罕見度（common → normal → rare 漸進 / 反向漸退）======
                    // 狀態欄位：gameState.adaptiveVerseRarity ('common' | 'normal' | 'rare')
                    // 第一關固定 common；依上一關完成耗時（秒）嚴苛判斷：
                    // 升級條件（單步）：
                    //  - common → normal : prev <= 25s
                    //  - normal → rare   : prev <= 20s
                    // 降級條件（單步）：
                    //  - rare → normal   : prev > 40s
                    //  - normal → common : prev > 45s
                    // 不跨兩階；未達條件維持。
                    // 方案 C：性能評分（Performance Score）
                    // PS = timeScore - mistakePenalty - hintPenalty + perfectBonus
                    // 決策：
                    //   PS >= +0.40 立即升一級 (若未達 rare)
                    //   PS <= -0.40 立即降一級 (若未達 common)
                    //   0.15 ≤ PS < 0.40 連續 2 次升
                    //  -0.40 < PS ≤ -0.15 連續 2 次降
                    //   -0.15 < PS < +0.15 穩定區（緩衝歸零）
                    // 參數可後續抽離設定
                    function updateAdaptiveVerseRarity(prevLevelDurationSec){
                        try {
                            const labelMap = { common:'常見', normal:'一般', rare:'冷門' };
                            const lvl = Number(gameState.currentLevel||0);
                            const duration = Number(prevLevelDurationSec||0);
                            gameState.lastLevelDurationSec = duration;
                            const startMist = Number(gameState._levelMistakesStart||0);
                            const endMist = Number(gameState.totalMistakes||0);
                            const startHints = Number(gameState._levelHintsStart||0);
                            const endHints = Number(gameState.hintsUsed||0);
                            const mistakes = Math.max(0, endMist - startMist);
                            const hintsUsed = Math.max(0, endHints - startHints);
                            // 時間分數
                            const TARGET_FAST = 25; // s
                            const RANGE = 30; // 允許落後/領先的緩衝
                            let timeScore = (TARGET_FAST - duration) / RANGE; // 25 秒=0，越快正、越慢負
                            if (timeScore > 1) timeScore = 1; else if (timeScore < -1) timeScore = -1;
                            const mistakePenalty = mistakes * 0.15;
                            const hintPenalty = hintsUsed * 0.10;
                            const perfectBonus = (mistakes === 0 && hintsUsed === 0) ? 0.25 : 0;
                            const PS = +(timeScore - mistakePenalty - hintPenalty + perfectBonus).toFixed(4);
                            gameState.lastLevelPerformanceScore = PS;
                            try { // 若有計算用 meta 可一併傳遞（假設該上下文有 metaPerformance 物件）
                                if (typeof window.__psCollector==='object' && typeof metaPerformance==='object') {
                                    window.__psCollector.collect(metaPerformance, PS);
                                }
                            } catch(_) {}
                            gameState.lastLevelMistakes = mistakes;
                            gameState.lastLevelHintsUsed = hintsUsed;
                            let cur = gameState.adaptiveVerseRarity || 'common';
                            if (!cur) { cur = 'common'; gameState.adaptiveVerseRarity = 'common'; }
                            if (lvl <= 1 && cur !== 'common') { gameState.adaptiveVerseRarity = 'common'; cur='common'; }
                            // 緩衝計數器
                            if (typeof gameState._rarityPosBuf !== 'number') gameState._rarityPosBuf = 0;
                            if (typeof gameState._rarityNegBuf !== 'number') gameState._rarityNegBuf = 0;
                            let promote = false, demote = false;
                            if (PS >= 0.40) { promote = (cur !== 'rare'); gameState._rarityPosBuf = 0; gameState._rarityNegBuf = 0; }
                            else if (PS <= -0.40) { demote = (cur !== 'common'); gameState._rarityPosBuf = 0; gameState._rarityNegBuf = 0; }
                            else if (PS >= 0.15) { gameState._rarityPosBuf++; gameState._rarityNegBuf = 0; if (gameState._rarityPosBuf >= 2 && cur !== 'rare') { promote = true; gameState._rarityPosBuf = 0; } }
                            else if (PS <= -0.15) { gameState._rarityNegBuf++; gameState._rarityPosBuf = 0; if (gameState._rarityNegBuf >= 2 && cur !== 'common') { demote = true; gameState._rarityNegBuf = 0; } }
                            else { // 穩定區
                                gameState._rarityPosBuf = 0; gameState._rarityNegBuf = 0;
                            }
                            let next = cur;
                            if (promote) next = (cur === 'common') ? 'normal' : 'rare';
                            else if (demote) next = (cur === 'rare') ? 'normal' : 'common';
                            const decision = { level:lvl, cur, next, duration, mistakes, hintsUsed, timeScore, mistakePenalty, hintPenalty, perfectBonus, PS, posBuf: gameState._rarityPosBuf, negBuf: gameState._rarityNegBuf, promote, demote };
                            console.log('[RARITY][PS]', decision);
                            if (next !== cur) {
                                gameState.adaptiveVerseRarity = next;
                                const dir = (promote ? '↑' : '↓');
                                const color = next==='rare' ? 'purple' : (next==='common' ? 'gray' : 'blue');
                                const msg = `罕見度 ${labelMap[cur]}→${labelMap[next]} ${dir} PS:${PS.toFixed(2)} 時:${duration.toFixed(1)}s 失:${mistakes} 提:${hintsUsed}`;
                                showCuteHint(msg, color, 2300, '📚');
                            } else {
                                // 可選：在高/低極端但已封頂顯示提示
                                if (promote || demote) {
                                    showCuteHint(`罕見度維持 ${labelMap[cur]} (已達邊界) PS:${PS.toFixed(2)}`, 'gray', 1600, '📚');
                                }
                            }
                        } catch(e) { console.warn('[RARITY][PS] error', e); }
                    }
                    try { window.updateAdaptiveVerseRarity = updateAdaptiveVerseRarity; } catch(_) {}
            } catch(_) { /* non-fatal */ }
        }

    // 進入下一關：檢查題庫剩餘數、重置單關狀態
    // Advance to next level; reset per-level flags
    function nextLevel() {
            // If equip is running, do not use classic nextLevel; equip controls its own progression
            if (gameState.equipRunning) { console.warn('[EQUIP] Ignoring classic nextLevel during equip run'); try { setLevelInteractionLock(false); } catch(_) {} return; }
            console.log('[DEBUG] nextLevel invoked, currentLevel=', gameState.currentLevel);
            // 保守：在嘗試進入下一關前先鎖住互動，並在最終 finally 中一定會解除
            try { setLevelInteractionLock(true); } catch(_) {}

            try {
                // 生存模式：顯示波次/里程碑提示（不阻塞），讓玩家感到節奏推進
                if (isSurvival()) {
                    try {
                        const tierMsg = (function(){
                            const c = Number(gameState.combo||0);
                            if (c >= 16) return pick(['第3波：高強度挑戰！','波次↑ 難度升溫','進階挑戰開始！']);
                            if (c >= 8) return pick(['第2波：加速中','波次↑ 節奏加快','小心～開始密集！']);
                            return pick(['第1波：熱身開局','穩住節奏～','準備好了嗎？']);
                        })();
                        showCuteHint(tierMsg, 'blue', 1600, '⚡');
                    } catch(_) {}
                }
                // 在進入下一關前，先檢查剩餘未使用的可用經文數是否足夠（至少 5 篇）
                try {
                    const pool = getAvailableVerses();
                    const usedKey = (v) => `${v.book}|${v.chapter}|${v.verse}`;
                    const usedVersesSet = gameState.usedVerses || new Set();
                    const uniqueRemaining = Array.isArray(pool) ? pool.filter(v => !usedVersesSet.has(usedKey(v))).length : 0;
                    console.log(`[DEBUG] nextLevel: uniqueRemaining=${uniqueRemaining}, used=${usedVersesSet.size}, pool=${Array.isArray(pool)?pool.length:0}, currentLevel=${gameState.currentLevel}`);
                    if (uniqueRemaining < 5) {
                        console.warn('[DEBUG] nextLevel: insufficient uniqueRemaining -> completeGame()');
                        alert('⚠️ 剩餘未使用的可用經文不足 5 篇，請擴大範圍或改選罕見度。本局將結束。');
                        // 結束本局並顯示結算
                        completeGame();
                        return;
                    }
                } catch (e) {
                    // 若檢查過程發生例外，紀錄但嘗試繼續（以避免誤判為無法切關）
                    console.warn('[DEBUG] nextLevel: exception during available verses check', e);
                }

                // 進入下一關：更新狀態
                gameState.currentLevel++;
                // 計算上一關耗時並更新經文罕見度（重播或裝備課程不啟用）
                try {
                    if (!gameState._replaySequence && !gameState.equipRunning) {
                        const endTs = Date.now();
                        // 使用整關開始時間 _rarityLevelStartTime（不隨單題答對重置）
                        const baseStart = gameState._rarityLevelStartTime || gameState.levelStartTime || endTs;
                        const prevDur = (endTs - baseStart) / 1000;
                        // 呼叫方案C評分（將計算並更新 lastLevelPerformanceScore 等）
                        if (typeof updateAdaptiveVerseRarity === 'function') updateAdaptiveVerseRarity(prevDur);
                    }
                } catch(_) {}
                gameState.isFirstQuestionOfLevel = true;
                gameState.levelHintReminderShown = false; // 重置每關提示提醒狀態
                gameState.levelFailedCount = 0; // 重置每關完全失敗題數
                gameState.levelEndHandled = false; // 重置關卡結束防重入旗標

                // 嘗試產生下一關並更新 UI；若失敗則回退並安全結束，避免卡住
                try {
                    if (Array.isArray(gameState._replaySequence) && typeof gameState._replaySeqIndex === 'number') {
                        // IDENTICAL REPLAY PATH
                        gameState._replaySeqIndex++;
                        if (gameState._replaySeqIndex >= gameState._replaySequence.length) {
                            // No more levels in sequence → end game
                            completeGame();
                            return;
                        }
                        const seq = gameState._replaySequence[gameState._replaySeqIndex];
                        gameState.difficulty = seq.difficulty || gameState.difficulty;
                        gameState.questionData = JSON.parse(JSON.stringify(seq.questionData || []));
                        gameState._forcedChapterOrder = Array.isArray(seq.chapterOrder) ? [...seq.chapterOrder] : null;
                        // Reset per-level state
                        gameState.currentQuestion = 1;
                        gameState.levelPerfect = true;
                        gameState.questionAttempts = {};
                        gameState.isFirstQuestionOfLevel = true;
                        gameState.questionData.forEach((_, idx) => {
                            const maxAttempts = { easy: 3, normal: 3, hard: 3 };
                            gameState.questionAttempts[idx] = maxAttempts[gameState.difficulty];
                        });
                        updateGameUI();
                        displayQuestions();
                        try { if (isSurvival()) updateSurvivalTimerDisplay(); } catch(_) {}
                        // Level timer
                        try { const nowTs = Date.now(); gameState.levelStartTime = nowTs; gameState._rarityLevelStartTime = nowTs; gameState._levelMistakesStart = Number(gameState.totalMistakes||0); gameState._levelHintsStart = Number(gameState.hintsUsed||0); if (gameMetrics) gameMetrics.speedEventStartTs = nowTs; startLevelTimer(); } catch(_) {}
                    } else {
                        // NORMAL PATH
                        applyAdaptiveDifficulty();
                        generateLevel();
                        updateGameUI();
                        try { if (isSurvival()) updateSurvivalTimerDisplay(); } catch(_) {}
                        // 關卡開始：初始化整關耗時起點（僅此處 & replay 同步）
                        try { const nowTs2 = Date.now(); gameState._rarityLevelStartTime = nowTs2; gameState._levelMistakesStart = Number(gameState.totalMistakes||0); gameState._levelHintsStart = Number(gameState.hintsUsed||0); if (gameMetrics) gameMetrics.speedEventStartTs = nowTs2; } catch(_) {}
                    }
                } catch (e) {
                    console.error('[DEBUG] nextLevel: exception during generateLevel/updateGameUI', e);
                    gameState.currentLevel = Math.max(1, gameState.currentLevel - 1);
                    try { alert('發生錯誤，無法載入下一關，遊戲將結束（請查看 console）。'); } catch(_) {}
                    completeGame();
                    return;
                }
            } finally {
                // 確保在任一情況下都會解除互動鎖（保護性）
                try { setLevelInteractionLock(false); } catch (e) { console.warn('[DEBUG] nextLevel: failed to release interaction lock', e); }
            }
        }

    // 完成本局：停止計時、計算時間獎勵、儲存紀錄、顯示結算
    // Complete the run: stop timer, compute time reward, save record, show modal
    function completeGame() {
            // If equip is running, classic completeGame should not run (equip has finishEquipRun)
            if (gameState.equipRunning) { console.warn('[EQUIP] Ignoring classic completeGame during equip run'); try { setLevelInteractionLock(false); } catch(_) {} return; }
            // 停止計時器
            GameTimer.stopLevel();
            // 停止生存模式倒數並隱藏卡片
            try { GameTimer.stopSurvival(); } catch(_) {}
            try { const card = document.getElementById('survivalTimerCard'); if (card) card.classList.add('hidden'); } catch(_) {}
            try { const mini = document.getElementById('survivalTimerMini'); if (mini) mini.classList.remove('active'); } catch(_) {}
            // 解除互動鎖，避免結算視窗無法操作
            try { setLevelInteractionLock(false); } catch(_) {}
            
            // 標記遊戲完成並記錄完成時間
            gameState.gameCompleted = true;
            gameState.gameEndTime = Date.now(); // 記錄遊戲結束時間
            
            // 先計算 accuracy 並更新/選定結語經文，讓之後的儲存會包含相同的 closing verse
            const accuracy = gameState.totalQuestions > 0 ? Math.round((gameState.totalCorrectAnswers / gameState.totalQuestions) * 100) : 0;
            try { updateClosingVerse(accuracy); } catch (e) {}

            // 結算：計算本局「時間獎勵」總分，方便在詳細計分與排行榜紀錄中顯示
            try {
                if (gameState.showTimeReward) {
                    const correctAnswers = gameState.totalCorrectAnswers || 0;
                    // 基礎分固定 100 分/題（移除罕見度影響）
                    const perQ = 100;
                    const baseScore = correctAnswers * perQ;
                    const totalMistakes = gameState.totalMistakes || 0;
                    const bonusScore = (function () {
                        let b = 0;
                        // 關卡獎勵
                        Object.values(gameState.levelResults || {}).forEach(r => {
                            if (r === 'perfect') b += 300; else if (r === 'complete') b += 100;
                        });
                        // 提示獎勵
                        const hintCounts = { easy: 3, normal: 3, hard: 3 };
                        const totalHints = hintCounts[gameState.difficulty];
                        const hintsRemaining = (totalHints != null ? totalHints : 0) - (gameState.usedHints ? gameState.usedHints.size : 0);
                        if (hintsRemaining > 0) b += hintsRemaining * 100;
                        return b;
                    })();
                    // 回加 50 × 失誤數，扣除所有額外獎勵，剩下即為時間獎勵總分（不倒扣，最小 0）
                    const timeScore = (gameState.score || 0) - baseScore + (totalMistakes * 50) - bonusScore;
                    gameState.timeReward = Math.max(0, Math.round(timeScore));
                } else {
                    gameState.timeReward = null;
                }
            } catch(_) { /* non-fatal */ }

            // 保存分數到排行榜（此時 gameState.closingVerse 已存在）
            // Visual feedback on game completion
            try { pulseCenterScore(gameState.score ? Math.min(300, gameState.score) : 100); } catch(e) {}
            try { spawnScoreParticles(gameState.score ? Math.min(300, gameState.score) : 100); } catch(e) {}

            const gameRecord = saveScore(gameState.score);
            
            // 直接在遊戲畫面顯示結算視窗
            checkAndShowGameComplete(gameRecord);
        }
        // #endregion

// Moved to settlement-ui.js
        
// Moved to leaderboard-ui.js

    // 刷新提示按鈕狀態與剩餘次數顏色
    // Refresh hint button and remaining count color
    function updateHintButton() {
            const hintBtn = document.getElementById('hintBtn');
            const hintCount = document.getElementById('hintCount');
            const hintBtnProxy = document.getElementById('adaptiveHintBtn');
            const hintCountProxy = document.getElementById('adaptiveHintCount');
            
            // 更新提示次數顯示
            if (hintCount) {
                hintCount.textContent = `⭐×${gameState.hintsRemaining}`;
                if (hintCountProxy) hintCountProxy.textContent = `⭐×${gameState.hintsRemaining}`;
                
                // 根據剩餘次數改變顏色
                if (gameState.hintsRemaining <= 0) {
                    hintCount.className = 'text-sm font-bold text-gray-400 ml-3';
                } else if (gameState.hintsRemaining <= 1) {
                    hintCount.className = 'text-sm font-bold text-red-600 ml-3';
                } else if (gameState.hintsRemaining <= 2) {
                    hintCount.className = 'text-sm font-bold text-orange-600 ml-3';
                } else {
                    hintCount.className = 'text-sm font-bold text-blue-600 ml-3';
                }
            }
            
            // 更新按鈕狀態
            const disable = gameState.hintsRemaining <= 0;
            if (hintBtn) { hintBtn.classList.toggle('opacity-50', disable); hintBtn.classList.toggle('cursor-not-allowed', disable); hintBtn.disabled = disable; }
            if (hintBtnProxy) { hintBtnProxy.classList.toggle('opacity-50', disable); hintBtnProxy.classList.toggle('cursor-not-allowed', disable); hintBtnProxy.disabled = disable; }
        }



    // #region 資料持久化與排行榜IO
    // 封裝並回傳本局遊戲紀錄（不直接寫入；由呼叫端決定後續流程）
    // Build and return a gameRecord snapshot for this run; caller persists/displays it.
    function saveScore(score) {
            // 計算遊戲耗時（從開始到完成最後一關，不包括結算視窗時間）
            const endTime = gameState.gameEndTime || Date.now();
            const gameTime = gameState.gameStartTime ? Math.floor((endTime - gameState.gameStartTime) / 1000) : 0;
            const minutes = Math.floor(gameTime / 60);
            const seconds = gameTime % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            const isEquipRun = !!(gameState && (gameState.equipTier || gameState.equipRunning || gameState.playMode === 'equip'));
            const comboPeak = (function(){
                if (gameState && typeof gameState.comboPeak === 'number') return gameState.comboPeak;
                if (gameState && gameState.finalMetrics && typeof gameState.finalMetrics.maxComboReached === 'number') return gameState.finalMetrics.maxComboReached;
                if (gameMetrics && typeof gameMetrics.maxComboReached === 'number') return gameMetrics.maxComboReached;
                if (gameState && typeof gameState.combo === 'number') return Math.max(0, Math.min(gameState.maxCombo||25, gameState.combo));
                return 0;
            })();
            
            // 創建遊戲記錄
            const gameRecord = {
                id: Date.now(), // 唯一ID
                score: score,
                difficulty: gameState.difficulty,
                date: new Date().toLocaleDateString('zh-TW'),
                time: timeString,
                completed: gameState.gameCompleted,
                correctAnswers: gameState.totalCorrectAnswers,
                totalQuestions: gameState.totalQuestions,
                totalMistakes: gameState.totalMistakes,
                levelResults: { ...gameState.levelResults },
                range: isEquipRun ? null : gameState.range,
                testament: isEquipRun ? null : gameState.testament,
                customBooks: isEquipRun ? [] : (Array.isArray(gameState.customBooks) ? [...gameState.customBooks] : []),
                playMode: isEquipRun ? 'equip' : gameState.playMode,
                // include closing verse chosen at game end so record view shows identical verse
                closingVerse: gameState.closingVerse || null,
                closingVerseRef: gameState.closingVerseRef || null,
                // persist transient fields to allow exact replay of breakdown
                hintsRemaining: gameState.hintsRemaining != null ? gameState.hintsRemaining : null,
                totalHints: (function(){ const hintCounts = { easy: 3, normal: 3, hard: 3 }; return hintCounts[gameState.difficulty] || null; })(),
                showTimeReward: gameState.showTimeReward === true,
                timeReward: (typeof gameState.timeReward === 'number') ? gameState.timeReward : null,
                usedHintsCount: (gameState.usedHints ? gameState.usedHints.size : 0),
                // persist combo summary for record view (peak + accumulated bonus)
                comboTotalBonus: (typeof gameState.comboTotalBonus === 'number') ? gameState.comboTotalBonus : 0,
                maxComboReached: comboPeak
            };
            // 預留平均用時與成就欄位（稍後 finalizeMetrics 評估後回填）
            try {
                if (gameState.finalMetrics && typeof gameState.finalMetrics.avgAnswerMs==='number') {
                    gameRecord.avgAnswerMs = gameState.finalMetrics.avgAnswerMs;
                    gameRecord.avgPerfectAnswerMs = gameState.finalMetrics.avgPerfectAnswerMs;
                    if (typeof gameState.finalMetrics.noHintCorrectCount === 'number') {
                        gameRecord.perfectAnswerCount = gameState.finalMetrics.noHintCorrectCount;
                    }
                    if (typeof gameState.finalMetrics.maxComboReached === 'number') gameRecord.maxComboReached = gameState.finalMetrics.maxComboReached;
                    // keep a shallow copy for record view helpers that look under finalMetrics on record
                    gameRecord.finalMetrics = { maxComboReached: gameState.finalMetrics.maxComboReached, avgAnswerMs: gameState.finalMetrics.avgAnswerMs, avgPerfectAnswerMs: gameState.finalMetrics.avgPerfectAnswerMs };
                }
            } catch(_) {}
            if (!Array.isArray(gameRecord.achievements)) gameRecord.achievements = (gameState.unlockedAchievements||[]).map(a=>({...a}));
            // attach signature for local anti-cheat
            try { const sig = __makeSignature(gameRecord); gameRecord.sig_ts = sig.ts; gameRecord.sig_hash = sig.hash; } catch(_) {}
            // 儲存題組快照（最小必要資訊以便重播）
            try {
                gameRecord.questionSnapshot = {
                    questionData: JSON.parse(JSON.stringify(gameState.questionData || [])),
                    levelResults: { ...gameState.levelResults },
                    totalQuestions: gameState.totalQuestions
                };
            } catch (e) {
                gameRecord.questionSnapshot = null;
            }
            
            return gameRecord;
        }

    // 載入排行榜（線上優先；否則本機 localStorage）
    // Load leaderboard from online adapter or localStorage