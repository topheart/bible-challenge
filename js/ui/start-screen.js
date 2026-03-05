// Extracted from bible-challenge.html
// start-screen.js

function setupMobileScoreBadges() {
            try {
                // remove any existing mobile badge elements created previously
                document.querySelectorAll('.mobile-center-badge, .mobile-score-badge').forEach(el => {
                    try {
                        if (el.__hideTimer) {
                            clearTimeout(el.__hideTimer);
                            el.__hideTimer = null;
                        }
                    } catch (e) {}
                    try { if (el.parentElement) el.parentElement.removeChild(el); } catch(e) {}
                });

                // disconnect any mutation observers attached to the encouragement element
                const encEl = document.getElementById('encouragementText');
                if (encEl && encEl.__mobileBadgeObserver) {
                    try { encEl.__mobileBadgeObserver.disconnect(); } catch(e) {}
                    try { delete encEl.__mobileBadgeObserver; } catch(e) {}
                }

                // ensure the original encouragement text is visible and left to its original logic
                try { if (encEl) encEl.style.visibility = ''; } catch(e) {}
            } catch (e) {
                console.warn('setupMobileScoreBadges cleanup failed', e);
            }
            // intentionally do not create badges here — original element will control display
            return;
        }

        function showStartScreen() {
            if (gameState.playMode === 'equip') gameState.playMode = null; // 返回主選單時不強制選擇 classic
            // 裝備課程殘留狀態全面清理，防止回主選單後誤判已完成或再進其他模式直接跳結算
            try {
                delete gameState.__pendingEquipTier;
                delete gameState.__equipEnding;
                delete gameState.__equipHandoffLocked;
                delete gameState.__equipFinished;
                gameState.equipRunning = false;
                gameState.equipTier = null;
                gameState.currentEquipEntry = null;
                gameState.equipRemaining = [];
                gameState.levelResults = {};
                gameState.currentLevel = 1;
                // 若不是正式結束，撤銷 gameCompleted 旗標，避免結算流程誤觸
                if (!document.getElementById('playerNameModal')?.classList.contains('hidden')) {
                    // 若結算視窗當下顯示則不動 gameCompleted
                } else {
                    gameState.gameCompleted = false;
                }
            } catch(_) {}
            try {
                if (typeof window.highlightSelectedEquipTier === 'function') {
                    window.highlightSelectedEquipTier(null);
                }
            } catch(_) {}
            // 安全停止所有計時器（避免生存模式殘留）
            try { if (gameState.timerInterval) { clearInterval(gameState.timerInterval); gameState.timerInterval = null; } } catch(_) {}
            try { if (gameState.survivalTimerInterval) { clearInterval(gameState.survivalTimerInterval); gameState.survivalTimerInterval = null; } } catch(_) {}
            // 停止任何殘留的星星雨特效並清除節點
            try { if (typeof stopStarRain === 'function') stopStarRain(true); } catch(_) {}
            document.getElementById('startScreen').classList.remove('hidden');
            document.getElementById('gameScreen').classList.add('hidden');
            document.getElementById('verseMarquee').style.display = 'block';
            // 顯示主選單固定品牌角標
            try { const m = document.getElementById('menuBrandCorner'); if (m) m.style.display = ''; } catch(_) {}
            // 依據片頭主題同步主選單品牌圖 light/dark
            try {
                const m = document.getElementById('menuBrandCorner');
                const isDark = !!window.__startupIsDark;
                if (m) m.src = isDark ? 'logo/logo0-light.webp' : 'logo/logo0-dark.webp';
            } catch(_) {}
            // Ensure body scroll is restored when showing the start screen
            try { unlockBodyScroll(); } catch (e) {}
            // Hide any lingering cute hint when returning to start screen
            try { hideCuteHint(); } catch (e) {}
            // ...existing code...
            // 解鎖所有主畫面按鈕
            lockMainScreenButtons(false);
            
            // 重置開始按鈕狀態
            const startBtn = document.getElementById('startGameBtn');
            startBtn.style.border = '';
            startBtn.style.boxShadow = '';
            startBtn.disabled = false;
            startBtn.style.opacity = '';
            startBtn.style.cursor = '';
            startBtn.style.pointerEvents = '';
            // 防止黃框樣式殘留（倒數中斷情境）
            startBtn.classList.remove('start-button-pulse');
            
            // 更新按鈕狀態
            updateStartButtonState();
            
            try { setActiveLeaderboardTabByMode('classic'); } catch(_) {}
            // 快速顯示緩存排行榜，並在背景刷新
            updateLeaderboardDisplay('classic', { preferStale: true });
            try { showEquipUI(false); } catch(_) {}
            try { highlightSelectedModeCard(gameState.playMode || null); } catch(_) {}
            
            // Sync menu mode UI through centralized updater
            try { if (window.__applyModeUI) window.__applyModeUI(); } catch(_) {}

            try { setUnifiedHeaderLayout(false); } catch(_) {}
            try { document.body.classList.remove('equip-running'); } catch(_) {}
            try { document.body.classList.remove('core-mode-playing'); } catch(_) {}
        }

        function highlightSelectedModeCard(mode){
            // Use the centralized UI updater from engine to ensure consistency (borders/shadows)
            // instead of applying conflicting utility classes here.
            try {
                if (window.__applyModeUI) {
                    window.__applyModeUI();
                }
            } catch(_) {}

            // Grid dimming state is handled by __applyModeUI
        }
        
    // 副標題功能已移除

        function hideAllScreens() {
            document.getElementById('startScreen').classList.add('hidden');
            document.getElementById('gameScreen').classList.add('hidden');
            document.getElementById('verseMarquee').style.display = 'none';
            // 隱藏主選單品牌角標
            try { const m = document.getElementById('menuBrandCorner'); if (m) m.style.display = 'none'; } catch(_) {}
        }