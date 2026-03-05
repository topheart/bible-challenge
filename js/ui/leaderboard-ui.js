    // #region 排行榜與結算模組
    // 全域統一排名計算函式（其他流程也會呼叫）
    // 輸入：list = 可能尚未排序的紀錄陣列 (元素需含 score)，score = 當前分數，limit = 榜單名額上限
    // 回傳：0 = 未入榜；1 = 第一名；其餘 = 將插入的排名（1-based）
    function computeRank(list, score, limit){
        try {
            if (!Array.isArray(list) || typeof score !== 'number' || !isFinite(score)) return 0;
            const cap = Math.max(1, limit|0);
            // 過濾 + 複製（避免原陣列被改動）
            const arr = list.filter(r=>r && typeof r.score === 'number' && isFinite(r.score)).slice();
            // 以分數降冪排序（若原本已排序成本也低）
            arr.sort((a,b)=> b.score - a.score);
            const len = arr.length;
            const considered = Math.min(len, cap);
            // 若已滿且分數 <= 最後一名，直接未入榜
            if (len >= cap && considered>0) {
                const lastScore = arr[considered-1].score;
                if (!(score > lastScore)) return 0; // 僅接受嚴格大於才能擠進
            }
            // 尋找插入點
            let rank = 0;
            for (let i=0;i<considered;i++){
                if (score > arr[i].score) { rank = i+1; break; }
            }
            if (rank === 0){
                if (len < cap){
                    // 榜單未滿：直接是尾端
                    rank = len + 1;
                } else {
                    // 榜單已滿且分數 > 最低但沒比任何一位高（= 新的最後一名）
                    rank = considered;
                }
            }
            if (rank > cap) return 0;
            return rank;
        } catch(e){ return 0; }
    }

    // 結束後：依是否為排行模式計算名次並顯示對應結算視窗
    // After completion: compute potential rank and show end modal
    async function checkAndShowGameComplete(gameRecord) {
            // 預先嘗試計算前 20 名的暫定排名（避免初始 0 導致名稱輸入區塊被隱藏）
            let initialRank = 0;
            let finalRank = 0; // 供稍後 deferred 再次計算覆蓋
            if (!gameState.skipLeaderboardOnComplete && gameState.gameCompleted) {
                try {
                    const ldrPre = loadLeaderboard();
                    const allPre = (ldrPre && typeof ldrPre.then === 'function') ? await ldrPre : ldrPre;
                    const modeKeyPre = gameState.playMode || 'classic';
                    const listPre = (allPre && allPre[modeKeyPre]) ? allPre[modeKeyPre] : [];
                    initialRank = computeRank(listPre, gameState.score, 20);
                } catch(e) { initialRank = 0; }
            }

            const isEquipMode = !!((gameRecord && gameRecord.playMode === 'equip') || (typeof gameState === 'object' && gameState && (gameState.playMode === 'equip' || gameState.equipTier)));
            if (typeof gameState === 'object' && gameState) {
                gameState.suppressSettlementAchievements = isEquipMode;
            }

            // === 成就評估（Replay 模式排除）===
            try {
                if (!gameState._replaySequence && !isEquipMode) {
                    const m = finalizeMetrics();
                    // 補充 SFX 觸發標記
                    if (m) m.__sfxFlags = gameState.__sfxFlags;
                    const mode = (gameState.playMode === 'survival') ? 'survival' : 'classic';
                    // 若 gameRecord.achievements 為「非空陣列」才沿用；空陣列需重新評估（之前的邏輯會被空陣列卡住導致無成就）
                    let unlocked = null;
                    if (gameRecord && Array.isArray(gameRecord.achievements) && gameRecord.achievements.length > 0) {
                        unlocked = gameRecord.achievements;
                        console.log('[ACHV] reuse existing achievements from gameRecord', unlocked.length);
                                          } else {
                        const modeMetrics = m || {};
                        const guaranteed = (gameState && gameState._guaranteedAchievements) 
                            ? Array.from(gameState._guaranteedAchievements) 
                            : null;
                        unlocked = AchievementManager.evaluateAll(modeMetrics, {
                            mode, 
                            isReplay: false, 
                            guaranteedIds: guaranteed
                        });
                        // 針對六個回報異常的成就，列印關鍵指標與評估結果以利診斷
                        try {
                            const ids = (unlocked||[]).map(a=>a.id);
                            console.log('[ACHV] evaluated achievements', {
                                count: unlocked.length,
                                mode,
                                answered: m && m.answeredQuestions,
                                longestStreak: m && m.longestStreak,
                                ultraFastCorrectMax: m && m.ultraFastCorrectMax,
                                noHintAnsweredCount: m && m.noHintAnsweredCount,
                                noHintCorrectCount: m && m.noHintCorrectCount,
                                accuracyNoHint: m && m.accuracyNoHint,
                                avgPerfectAnswerMs: m && m.avgPerfectAnswerMs,
                                levelsPerfectCount: m && m.levelsPerfectCount,
                                levelFailedCount: m && m.levelFailedCount,
                                levelPerfectFlags: m && m.levelPerfectFlags,
                                survivalCompletedWaves: m && m.survivalCompletedWaves,
                                levelMistakesList: m && m.levelMistakesList,
                                matchedIds: ids
                            });
                        } catch(_) {}
                    }
                    // 產出精簡成就列表並保留 displayTier（避免僅 tier 時映射錯置）
                    try {
                        gameState.unlockedAchievements = (unlocked||[]).map(a=>({
                            id:a.id,
                            name:a.name,
                            tier:a.tier,
                            mode:a.mode,
                            displayTier: (a.displayTier!=null) ? a.displayTier : (typeof getDisplayTier==='function'? getDisplayTier(a):undefined)
                        }));
                    } catch(_) { gameState.unlockedAchievements = unlocked || []; }
                    gameState.finalMetrics = m;
                    // 回填平均作答統計與成就到 gameRecord（saveScore 於此前呼叫，需後補）
                    try {
                        if (gameRecord) {
                            if (m && typeof m.avgAnswerMs === 'number') gameRecord.avgAnswerMs = m.avgAnswerMs;
                            if (m && typeof m.avgPerfectAnswerMs === 'number') gameRecord.avgPerfectAnswerMs = m.avgPerfectAnswerMs;
                            if (!Array.isArray(gameRecord.achievements) || gameRecord.achievements.length === 0) {
                                gameRecord.achievements = gameState.unlockedAchievements.map(x=>({ ...x }));
                            }
                        }
                    } catch(_) {}
                    try { if(typeof updateAchievementTabCounts==='function') updateAchievementTabCounts(unlocked); } catch(_){ }
                    try { logAchievementRun(m, unlocked, mode); } catch(_){ }
                    // Optional: 上傳到 Supabase 以利採樣（近 100 局）。
                    // 若稍後會線上儲存分數，會在成功後再補上 score_id 鍊結；否則先紀錄不含 score_id 的資料。
                    try {
                        const willOnlineSave = !!(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey && !gameState.skipLeaderboardOnComplete);
                        if (!willOnlineSave && typeof sendAchievementRunToSupabase==='function') sendAchievementRunToSupabase(m, unlocked, mode);
                        else window.__pendingAchvTelemetry = { metrics: m, unlocked, mode };
                    } catch(_){ }
                } else {
                    if (typeof gameState === 'object' && gameState) {
                        gameState.unlockedAchievements = [];
                        if (isEquipMode) {
                            gameState.finalMetrics = null;
                        }
                    }
                    if (isEquipMode && gameRecord && typeof gameRecord === 'object') {
                        gameRecord.achievements = [];
                    }
                }
            } catch(e){
                console.warn('成就評估失敗', e);
                if (typeof gameState === 'object' && gameState) {
                    gameState.unlockedAchievements = [];
                    if (isEquipMode) gameState.finalMetrics = null;
                }
            }

            if (gameState.skipLeaderboardOnComplete) {
                const source = gameState.replaySourceRecord || (gameRecord || {});
                showReplayEndModal(0, source); // 重播不入榜
            } else {
                showPlayerNameModal(initialRank, gameRecord);
            }

            // 背景再做一次最終排名更新（同樣以前 20 名為範圍）
            if (!gameState.skipLeaderboardOnComplete && gameState.gameCompleted) {
                try {
                    const ldr = loadLeaderboard();
                    const allLeaderboards = (ldr && typeof ldr.then === 'function') ? await ldr : ldr;
                    const modeKey = gameState.playMode || 'classic';
                    const currentLeaderboard = (allLeaderboards && allLeaderboards[modeKey]) ? allLeaderboards[modeKey] : [];
                    finalRank = computeRank(currentLeaderboard, gameState.score, 20);
                    if (finalRank > 0) {
                        try {
                            const rankMessage = document.getElementById('rankMessage');
                            const leaderboardHeader = document.getElementById('leaderboardHeader');
                            const leaderboardPlayerNameEl = document.getElementById('leaderboardPlayerName');
                            if (rankMessage) rankMessage.textContent = `您獲得了第${finalRank}名！`;
                            // Use the unified theming path to ensure consistent colors and labels
                            try { applyRankThemeUnified(finalRank, 'settlement'); } catch(_) {}
                            // Ensure name field/theme aligns with the final rank and hide replay button if promoted into leaderboard
                            try { applyPlayerNameFieldTheme(finalRank); } catch(_) {}
                            try { const replayBtn = document.getElementById('replaySameQuestionsBtn'); if (replayBtn) replayBtn.classList.add('hidden'); } catch(_) {}
                        } catch(_) {}
                    }
                } catch (e) { console.warn('Deferred rank fetch failed', e); }
            }
            // Render achievements at the end (modal已顯示/或將顯示)
            try { renderAchievementsIntoModal(); } catch(_) {}
        }

        // Show the end-of-replay modal: reuse the same modal structure as record-view but
        // populate static fields (closing verse, date/time, player name) from the original record
        // while recalculating the detailed score breakdown from the current gameState.
    // 重播結束視窗：沿用排行榜檢視版面，使用原紀錄靜態欄位
    // Show end-of-replay modal using original record fields
    function showReplayEndModal(rank, sourceRecord) {
            const modal = document.getElementById('playerNameModal');
            if (!modal) return;
        // Protect end modal from accidental close (ESC/backdrop/X)
        try { modal.dataset.protected = '1'; } catch(_) {}
        try {
            const closers = modal.querySelectorAll('[data-close-modal="playerNameModal"]:not([data-allow-close])');
            closers.forEach(btn => btn.classList.add('hidden'));
        } catch(_) {}
        try {
            const confirmBtn = document.getElementById('confirmNameBtn');
            if (confirmBtn) {
                confirmBtn.classList.remove('hidden');
                confirmBtn.style.display = 'inline-flex';
            }
        } catch(_) {}

            // Ensure modal is in 'viewing' mode so name input is hidden and close behaves like record view
            modal.dataset.viewingRecord = 'true';
            modal.dataset.viewingMode = sourceRecord.playMode || gameState.playMode || '';
            // Set currentRecord so the "同題重玩" button can start another replay using the same snapshot
            try { modal.dataset.currentRecord = JSON.stringify(sourceRecord); } catch (e) { modal.dataset.currentRecord = ''; }

            // Update static displays using the stored record so it matches exactly what was shown when saved
            // but ensure score breakdown is rebuilt from the live gameState
            const rankMessage = document.getElementById('rankMessage');
            const leaderboardMessage = document.getElementById('leaderboardMessage');
            const leaderboardHeader = document.getElementById('leaderboardHeader');

                try {
                    const fs = document.getElementById('finalScore');
                    if (fs && fs.__ainCancel) { try { fs.__ainCancel(); } catch(_) {} }
                    if (fs) fs.textContent = '0';
                } catch(_) {}
            let accuracy = gameState.totalQuestions > 0 ? Math.round((gameState.totalCorrectAnswers / gameState.totalQuestions) * 100) : 0;
                document.getElementById('finalAccuracy').textContent = '0%';
            const ratioEl = document.getElementById('finalAccuracyRatio');
            // Equip：以完成關卡數為基準
            if ((sourceRecord && sourceRecord.playMode === 'equip') || gameState.equipTier) {
                try {
                    const totalLevels = typeof getLevelCount === 'function' ? getLevelCount() : 10;
                    const results = gameState.levelResults || {};
                    let finished = 0; Object.values(results).forEach(v=>{ if (v==='perfect'||v==='complete') finished++; });
                    accuracy = totalLevels > 0 ? Math.round((finished/totalLevels)*100) : 0;
                    if (ratioEl) setRatio(ratioEl, finished, totalLevels);
                } catch(_) { if (ratioEl) setRatio(ratioEl, 0, 0); }
            } else if (ratioEl) {
                setRatio(ratioEl, gameState.totalCorrectAnswers, gameState.totalQuestions);
            }

            // Populate closing verse from the original saved record so it matches the leaderboard view
            try {
                const closingTextEl = document.getElementById('closingVerseText');
                const closingRefEl = document.getElementById('closingVerseRef');
                if (sourceRecord.closingVerse || sourceRecord.closingVerseRef) {
                    applyClosingVerse(sourceRecord.closingVerse, sourceRecord.closingVerseRef, false);
                } else {
                    // fallback to current gameState chosen verse
                    updateClosingVerse(accuracy);
                }
            } catch (e) {}

            // For replay runs we should NOT show any "entered leaderboard" congratulations
            // Always hide the leaderboard message/header and the name input so it matches record view
            if (leaderboardHeader) leaderboardHeader.innerHTML = '';
            if (leaderboardMessage) leaderboardMessage.classList.add('hidden');

            // Hide name input (viewing mode)
            const nameInputSection = document.getElementById('nameInputSection');
            const leaderboardPlayerNameEl = document.getElementById('leaderboardPlayerName');
            if (nameInputSection) nameInputSection.classList.add('hidden');

            // Same-question replay is disabled in Survival and Equip modes
            const replayBtn = document.getElementById('replaySameQuestionsBtn');
            if (replayBtn) {
                const pm = (sourceRecord.playMode || gameState.playMode || '').toString();
                if (pm === 'survival' || pm === 'equip') replayBtn.classList.add('hidden'); else replayBtn.classList.remove('hidden');
            }

            // Rebuild the detailed breakdown from current gameState (not the stored record)
            generateScoreBreakdown();

            // Finally show modal and lock scroll
            modal.classList.remove('hidden');
            lockBodyScroll();

            // Clear input and errors
            const input = document.getElementById('playerNameInput');
            if (input) input.value = '';
            const nameError = document.getElementById('nameError');
            if (nameError) nameError.classList.add('hidden');

            // Enable Enter-to-confirm while this modal is open
            try { attachPlayerNameModalEnterHotkey(); } catch (e) {}
        }

    // 舊流程：完成後若符合條件才進入排行榜取名（保留）
    // Legacy flow: gate leaderboard entry by conditions
    async function checkAndShowLeaderboardEntry(gameRecord) {
            // 只有選擇整本聖經且完成遊戲才能進入排行榜
            if (gameState.range !== 'all' || !gameState.gameCompleted) {
                return;
            }
            
            const ldr = loadLeaderboard();
            const allLeaderboards = (ldr && typeof ldr.then === 'function') ? await ldr : ldr;
            const modeKey = gameState.playMode || 'classic';
            const currentLeaderboard = (allLeaderboards && allLeaderboards[modeKey]) ? allLeaderboards[modeKey] : [];
            
            let rank = computeRank(currentLeaderboard, gameState.score, 20);
            const canEnterLeaderboard = rank > 0;
            
            if (canEnterLeaderboard) {
                showPlayerNameModal(rank);
            }
        }

    // 顯示取名/結算視窗（含名次、明細、結語經文）
    // Show player-name modal with breakdown and closing verse
    function showPlayerNameModal(rank, currentGameRecord = null) {
            const modal = document.getElementById('playerNameModal');
            if (modal){
                modal.setAttribute('role','dialog');
                modal.setAttribute('aria-modal','true');
                modal.setAttribute('aria-labelledby','leaderboardHeader');
            }
            const rankMessage = document.getElementById('rankMessage');
            const leaderboardMessage = document.getElementById('leaderboardMessage');
            const leaderboardHeader = document.getElementById('leaderboardHeader');
            const nameInputSection = document.getElementById('nameInputSection');
        const leaderboardPlayerNameEl = document.getElementById('leaderboardPlayerName');
        // 嘗試重置上一關 meta（僅在進入結算視窗當下執行，避免跨局殘留）
        try { resetLastLevelMeta(); } catch(_) {}
        // Performance: measure time from game start to settlement display
        try {
            performance.mark('bc-modal-open');
            performance.measure('bc-game-duration-to-settlement','bc-game-start','bc-modal-open');
            const m = performance.getEntriesByName('bc-game-duration-to-settlement').slice(-1)[0];
            if (m && window.__debugPerf) console.log('[perf] game→settlement ms', m.duration.toFixed(1));
        } catch(_) {}
        // Protect end modal from accidental close (ESC/backdrop/X)
    // Always protect the settlement modal when invoked from game-end flows
    try { if (modal) { modal.dataset.protected = '1'; } } catch(_) {}
    try {
        if (modal) {
            const closers = modal.querySelectorAll('[data-close-modal="playerNameModal"]:not([data-allow-close])');
            closers.forEach(btn => btn.classList.add('hidden'));
        }
    } catch(_) {}
    try {
        const confirmBtn = document.getElementById('confirmNameBtn');
        if (confirmBtn) {
            confirmBtn.classList.remove('hidden');
            confirmBtn.style.display = 'inline-flex';
        }
    } catch(_) {}
            // Hide cute hint to avoid overlapping with modal
            try { hideCuteHint(); } catch (e) {}
            // Defensive: if duplicate closing verse elements were ever inserted, dedupe now
            try {
                const cv = document.getElementById('closingVerse');
                if (cv) {
                    const texts = cv.querySelectorAll('#closingVerseText');
                    const refs = cv.querySelectorAll('#closingVerseRef');
                    for (let i = 1; i < texts.length; i++) texts[i].remove();
                    for (let i = 1; i < refs.length; i++) refs[i].remove();
                }
            } catch (_) {}
            
            // 更新分數資訊
            try {
                const fs = document.getElementById('finalScore');
                if (fs && fs.__ainCancel) { try { fs.__ainCancel(); } catch(_) {} }
                if (fs) fs.textContent = '0';
            } catch(_) {}
            let accuracy = gameState.totalQuestions > 0 ? Math.round((gameState.totalCorrectAnswers / gameState.totalQuestions) * 100) : 0;
            document.getElementById('finalAccuracy').textContent = '0%';
            const ratioEl = document.getElementById('finalAccuracyRatio');
            if (gameState.equipTier) {
                try {
                    const finished = Object.keys(gameState.levelResults||{}).length;
                    const totalLevels = typeof getLevelCount === 'function' ? getLevelCount() : finished;
                    accuracy = totalLevels > 0 ? Math.round((finished/totalLevels)*100) : 0;
                    if (ratioEl) setRatio(ratioEl, finished, totalLevels);
                } catch(_) { if (ratioEl) setRatio(ratioEl, 0, 0); }
            } else if (ratioEl) {
                setRatio(ratioEl, gameState.totalCorrectAnswers, gameState.totalQuestions);
            }
            
            // 生成詳細計分數據
            generateScoreBreakdown();
            
            // 根據遊玩狀況選擇結語經文
            updateClosingVerse(accuracy);
            
            // 如果進入排行榜，顯示排行榜訊息和名稱輸入
            // Also: when this modal is the post-game end modal, only show the same-question
            // replay button if this run did NOT actually enter the leaderboard (rank === 0).
            const replayBtn = document.getElementById('replaySameQuestionsBtn');
            const sameReplayNote = document.getElementById('sameReplayNote');
            if (rank > 0) {
                rankMessage.textContent = `您獲得了第${rank}名！`;
                // Apply Challenger→Iron theme (1~10) same as record view
                if (leaderboardHeader) { try { applyRankThemeUnified(rank,'settlement'); } catch(_) {} }
                try { modal.classList.remove('neutral-settlement'); } catch(_) {}
                leaderboardMessage.classList.remove('hidden');
                if (leaderboardPlayerNameEl) {
                    try { leaderboardPlayerNameEl.textContent = (gameState.playerName || document.getElementById('playerNameInput').value || '').trim(); } catch(_) {}
                    leaderboardPlayerNameEl.style.fontSize='1.25rem'; leaderboardPlayerNameEl.style.fontWeight='800';
                    ensurePlayerNameColor(leaderboardPlayerNameEl, leaderboardPlayerNameEl.style.color||'');
                }
                try { applyPlayerNameFieldTheme(rank); } catch(_){ }
                // 確保不是檢視模式
                if (modal) modal.dataset.viewingRecord = '';
                nameInputSection.classList.remove('hidden');
                // If the run actually entered the leaderboard, hide the replay button in the post-game modal
                if (replayBtn) replayBtn.classList.add('hidden');
                const confirmForce = document.getElementById('confirmNameBtn'); if(confirmForce){ confirmForce.classList.remove('hidden'); confirmForce.style.display='inline-flex'; }
            } else {
                if (leaderboardHeader) leaderboardHeader.innerHTML = '';
                leaderboardMessage.classList.add('hidden');
                nameInputSection.classList.add('hidden');
                try { modal.classList.add('neutral-settlement'); } catch(_) {}
                // Encourage message
                try {
                    let msg=document.getElementById('neutralEncouragement');
                    if(!msg){
                        const verse=document.getElementById('closingVerse');
                        msg=document.createElement('div');
                        msg.id='neutralEncouragement';
                        msg.className='text-[12px] font-semibold mt-2 text-gray-600 dark:text-gray-300';
                        msg.textContent='再接再厲！調整節奏或策略，再挑戰一次即可上榜！';
                        if(verse) verse.appendChild(msg); else modal.querySelector('.modal-body')?.appendChild(msg);
                    }
                }catch(_){ }
                // If the run did NOT enter the leaderboard, allow same-question replay from the end modal (except Survival)
                if (replayBtn) {
                    const pm = (gameState.playMode || '').toString();
                    if (pm === 'survival') replayBtn.classList.add('hidden'); else replayBtn.classList.remove('hidden');
                }
                // 為避免未入榜也嘗試儲存，明確標示為「不可列入排行榜」的重玩
                try { modal.dataset.viewingRecord = 'true'; } catch(_) {}
            }

            // Hide the explanatory note if the same-question replay button is not available
            try {
                if (sameReplayNote) {
                    if (!replayBtn || replayBtn.classList.contains('hidden')) {
                        sameReplayNote.classList.add('hidden');
                    } else {
                        sameReplayNote.classList.remove('hidden');
                    }
                }
            } catch (e) { /* ignore */ }
            
            // Ensure modal is attached to document.body so it isn't placed inside lower stacking contexts
            if (modal && modal.parentElement !== document.body) {
                try { document.body.appendChild(modal); } catch (e) { /* ignore */ }
            }
            // Ensure modal overlay is above pinned controls (which use very high z-index on mobile)
            if (modal) {
                try { modal.style.zIndex = '11000'; } catch (e) { /* ignore */ }
            }
            // 若有傳入本局紀錄，附加到 dataset 供同題重玩使用（未入榜也可以重玩）
            try {
                if (modal && currentGameRecord) {
                    modal.dataset.currentRecord = JSON.stringify(currentGameRecord);
                }
            } catch(_) {}
            modal.classList.remove('hidden');
            // lock background scroll for mobile comfort
            lockBodyScroll();
            
            // 自動帶入上次名稱（可編輯），若無則留空
            try {
                const last = (typeof getSavedPlayerName === 'function') ? getSavedPlayerName() : (localStorage.getItem('bibleGamePlayerName') || localStorage.getItem('lastPlayerName') || '');
                document.getElementById('playerNameInput').value = last;
            } catch(_) {
                document.getElementById('playerNameInput').value = '';
            }
            document.getElementById('nameError').classList.add('hidden');

            // Enable Enter-to-confirm while this modal is open
            try { attachPlayerNameModalEnterHotkey(); } catch (e) {}
            // A11y: 聚焦第一可互動元素（若未入榜則聚焦重玩/關閉）
            try {
                const focusTarget = (rank>0 ? document.getElementById('playerNameInput') : document.getElementById('replaySameQuestionsBtn')) || modal.querySelector('button, input, [tabindex="0"]');
                if (focusTarget && typeof focusTarget.focus==='function') focusTarget.focus({preventScroll:true});
            } catch(_) {}
        }

        // 將玩家名稱輸入區外框與提示文字依排行 1~10 套用對應色系（使用與 THEME 相同顏色組一份簡化映射）
        function applyPlayerNameFieldTheme(rank){
            const inputWrap = document.getElementById('nameInputSection');
            const input = document.getElementById('playerNameInput');
            const label = inputWrap ? inputWrap.querySelector('label') : null;
            const help = document.getElementById('playerNameHelp');
            if(!inputWrap || !input) return;
            input.classList.remove('rank-themed-name');
            input.style.borderColor=''; input.style.boxShadow='';
            if(label){ label.style.background=''; label.style.webkitBackgroundClip=''; label.style.color=''; }
            if(help){ help.style.color='#6b7280'; }
            const t = RANK_THEME && RANK_THEME[rank];
            if(!t) return;
            // Derive glow + label gradient from heading / border
            const border = t.border || '#999';
            // heuristic: reuse heading gradient as label gradient; compute glow color from border
            const labelGrad = t.heading || 'linear-gradient(90deg,#999,#ccc)';
            const glowColor = (function(){
                // extract first hex in gradient if possible
                const m = /#([0-9a-fA-F]{3,8})/.exec(labelGrad); return m ? m[0] : border;
            })();
            input.style.borderColor = border;
            input.style.boxShadow = `0 0 0 3px ${glowColor}80`; // add transparency
            if(label){ label.style.background=labelGrad; label.style.webkitBackgroundClip='text'; label.style.color='transparent'; }
            if(help){ help.style.color=t.name || '#374151'; }
        }

        // 最終再強制套用玩家名稱與 rankMessage 顏色（多次嘗試避免非同步覆蓋）
        const RANK_COLOR_MAP = {1:'#0b5c99',2:'#992c12',3:'#5b1796',4:'#0f3d83',5:'#0b5f35',6:'#0c5671',7:'#7a4705',8:'#444c56',9:'#4a2a15',10:'#1f1f1f'};
        function finalizeRankStyling(rank){
            if(!(rank>0)) return;
            const modal = document.getElementById('playerNameModal');
            const nameEl = document.getElementById('leaderboardPlayerName');
            const rankMsg = document.getElementById('rankMessage');
            const color = RANK_COLOR_MAP[rank] || '#374151';
            function apply(){
                try{
                    if(nameEl){ nameEl.classList.forEach(c=>{ if(/^text-(purple|gray|pink|indigo|rose|red|amber|blue)-/i.test(c)) nameEl.classList.remove(c); }); nameEl.style.color=color; }
                    if(rankMsg){ rankMsg.classList.forEach(c=>{ if(/^text-(purple|gray|pink|indigo|rose|red|amber|blue)-/i.test(c)) rankMsg.classList.remove(c); }); rankMsg.style.color=color; }
                }catch(e){}
            }
            apply();
            // 再補兩次（排除 deferred 重繪或其他程式設色）
            setTimeout(apply, 30);
            setTimeout(apply, 120);
            setTimeout(apply, 300); // 最後一道保險
        }

        // 中央化排行榜名次 1~10 題材主題配色（結算 / 延遲重算 / 紀錄檢視共享）
        const RANK_THEME = Object.freeze({
            1:{ key:'challenger', heading:'linear-gradient(90deg,#1fb7ff,#ffe49a)', name:'#0b5c99', border:'#1fa4ff', soft:'linear-gradient(135deg,rgba(31,183,255,0.12),rgba(255,180,71,0.10))', panelBg:'linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.50))', verseBg:'linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))', replayFrom:'#1fb7ff', replayTo:'#0d6efd', confirmFrom:'#ffb347', confirmTo:'#ff8c2b' },
            2:{ key:'grandmaster', heading:'linear-gradient(90deg,#ff824d,#ff4d1d)', name:'#992c12', border:'#ff4d1d', soft:'linear-gradient(135deg,rgba(255,100,50,0.14),rgba(255,180,150,0.10))', panelBg:'linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.50))', verseBg:'linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))', replayFrom:'#ff824d', replayTo:'#ff4d1d', confirmFrom:'#ffb347', confirmTo:'#ff7a45' },
            3:{ key:'master', heading:'linear-gradient(90deg,#ce7bff,#9b35e8)', name:'#5b1796', border:'#9b35e8', soft:'linear-gradient(135deg,rgba(155,53,232,0.15),rgba(206,123,255,0.10))', panelBg:'linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.50))', verseBg:'linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))', replayFrom:'#b657f6', replayTo:'#9b35e8', confirmFrom:'#ce7bff', confirmTo:'#9b35e8' },
            4:{ key:'diamond', heading:'linear-gradient(90deg,#7ad6ff,#2764f5)', name:'#0f3d83', border:'#3e9dff', soft:'linear-gradient(135deg,rgba(62,157,255,0.15),rgba(39,100,245,0.10))', panelBg:'linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.50))', verseBg:'linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))', replayFrom:'#5cb8ff', replayTo:'#2764f5', confirmFrom:'#7ad6ff', confirmTo:'#3e9dff' },
            5:{ key:'emerald', heading:'linear-gradient(90deg,#33dc85,#0f9e55)', name:'#0b5f35', border:'#14b863', soft:'linear-gradient(135deg,rgba(20,184,99,0.14),rgba(51,220,133,0.10))', panelBg:'linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.50))', verseBg:'linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))', replayFrom:'#28d478', replayTo:'#0f9e55', confirmFrom:'#33dc85', confirmTo:'#14b863' },
            6:{ key:'platinum', heading:'linear-gradient(90deg,#64e0f5,#1288b7)', name:'#0c5671', border:'#39c9eb', soft:'linear-gradient(135deg,rgba(57,201,235,0.15),rgba(18,136,183,0.10))', panelBg:'linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.50))', verseBg:'linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))', replayFrom:'#39c9eb', replayTo:'#1288b7', confirmFrom:'#64e0f5', confirmTo:'#39c9eb' },
            7:{ key:'gold', heading:'linear-gradient(90deg,#fbd24e,#e69914)', name:'#7a4705', border:'#e69914', soft:'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(251,210,78,0.10))', panelBg:'linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.50))', verseBg:'linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))', replayFrom:'#fbd24e', replayTo:'#e69914', confirmFrom:'#f59e0b', confirmTo:'#d97706' },
            8:{ key:'silver', heading:'linear-gradient(90deg,#d1d5db,#9ca3af)', name:'#444c56', border:'#d1d5db', soft:'linear-gradient(135deg,rgba(156,163,175,0.12),rgba(240,242,245,0.10))', panelBg:'linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.50))', verseBg:'linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))', replayFrom:'#d1d5db', replayTo:'#9ca3af', confirmFrom:'#f0f2f5', confirmTo:'#9ca3af' },
            9:{ key:'bronze', heading:'linear-gradient(90deg,#d8905f,#734224)', name:'#4a2a15', border:'#b16329', soft:'linear-gradient(135deg,rgba(177,99,41,0.16),rgba(216,144,95,0.10))', panelBg:'linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.50))', verseBg:'linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))', replayFrom:'#d8905f', replayTo:'#b16329', confirmFrom:'#d8905f', confirmTo:'#734224' },
            10:{ key:'iron', heading:'linear-gradient(90deg,#9d9d9d,#3f3f3f)', name:'#1f1f1f', border:'#555', soft:'linear-gradient(135deg,rgba(85,85,85,0.18),rgba(63,63,63,0.12))', panelBg:'linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.50))', verseBg:'linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))', replayFrom:'#6b6b6b', replayTo:'#3f3f3f', confirmFrom:'#9d9d9d', confirmTo:'#555555' }
        });

        function applyRankThemeUnified(rank, context){
            if(!(rank>0)) return; // ignore non-ranked
            const modalEl = document.getElementById('playerNameModal');
            if(!modalEl) return;
            const shell = modalEl.querySelector('.cute-card');
            const panel = document.getElementById('finalScorePanel');
            const verse = document.getElementById('closingVerse');
            const replayBtn = document.getElementById('replaySameQuestionsBtn');
            const confirmBtn = document.getElementById('confirmNameBtn');
            const leaderboardPlayerNameEl = document.getElementById('leaderboardPlayerName');
            // Always fully reset any previous theme to avoid leakage between openings
            try { modalEl.classList.remove('rank-theme-applied','rt-challenger','rt-grandmaster','rt-master','rt-diamond','rt-emerald'); } catch(_){ }
            try { modalEl.querySelectorAll('.corner-auras').forEach(x=>x.remove()); } catch(_){ }
            if (shell) { shell.classList.remove('glow-frame'); shell.style.background=''; shell.style.borderColor=''; }
            if (panel) { panel.style.background=''; panel.style.borderColor=''; }
            if (verse) { verse.style.background=''; verse.style.borderColor=''; }
            if (replayBtn) { replayBtn.style.background=''; replayBtn.style.backgroundImage=''; replayBtn.style.border=''; }
            if (confirmBtn) { confirmBtn.style.backgroundImage=''; confirmBtn.style.boxShadow=''; }
            if (leaderboardPlayerNameEl) { leaderboardPlayerNameEl.style.color=''; }
            // Clear CSS variables set previously
            try {
                ['--rt-heading','--rt-name','--rt-border','--rt-soft','--rt-panel-bg','--rt-verse-bg','--rt-replay-from','--rt-replay-to','--rt-confirm-from','--rt-confirm-to','--rt-name-override'].forEach(v=>modalEl.style.removeProperty(v));
            } catch(_){ }
            const t = RANK_THEME[rank];
            // If rank > 10, keep default look: only update the heading text and rely on finalizeRankStyling for readable text color.
            if(!t) {
                const header = document.getElementById('leaderboardHeader'); if(header){
                    header.setAttribute('aria-live','polite'); header.setAttribute('role','heading'); header.setAttribute('aria-level','2');
                    header.innerHTML = `<span style="font-weight:800; font-size:1.15rem; background:linear-gradient(90deg,#7c3aed,#ec4899); -webkit-background-clip:text; color:transparent;">第${rank}名</span>`;
                }
                try { finalizeRankStyling(rank); } catch(_){ }
                try { window.__currentRank = rank; } catch(_) {}
                return;
            }
            // 設定 CSS 變數供樣式層統一使用
            modalEl.style.setProperty('--rt-heading', t.heading);
            modalEl.style.setProperty('--rt-name', t.name);
            modalEl.style.setProperty('--rt-border', t.border);
            modalEl.style.setProperty('--rt-soft', t.soft);
            modalEl.style.setProperty('--rt-panel-bg', t.panelBg);
            modalEl.style.setProperty('--rt-verse-bg', t.verseBg);
            modalEl.style.setProperty('--rt-replay-from', t.replayFrom);
            modalEl.style.setProperty('--rt-replay-to', t.replayTo);
            modalEl.style.setProperty('--rt-confirm-from', t.confirmFrom);
            modalEl.style.setProperty('--rt-confirm-to', t.confirmTo);
            // Heading 文字
            const header = document.getElementById('leaderboardHeader'); if(header){
                // a11y 改進：使用 textContent + 動態 span
                header.setAttribute('aria-live','polite');
                header.setAttribute('role','heading');
                header.setAttribute('aria-level','2');
                header.textContent='';
                const hs = document.createElement('span');
                hs.className='rank-heading-text';
                hs.dataset.rank = String(rank);
                hs.textContent = `第${rank}名`;
                header.appendChild(hs);
            }
            // 標記 + 名稱著色（仍用 JS 防止覆寫），CSS 會作為主要背景/容器呈現
            if (leaderboardPlayerNameEl){ leaderboardPlayerNameEl.style.color = t.name; ensurePlayerNameColor(leaderboardPlayerNameEl, t.name); }
            modalEl.classList.add('rank-theme-applied');
            if (shell) shell.classList.add('glow-frame');
            if(rank<=5 && shell){ const aura=document.createElement('div'); aura.className='corner-auras'; aura.innerHTML='<span class="ca-tl"></span><span class="ca-br"></span>'; shell.appendChild(aura); const mapClass={1:'rt-challenger',2:'rt-grandmaster',3:'rt-master',4:'rt-diamond',5:'rt-emerald'}; const cls=mapClass[rank]; if(cls) modalEl.classList.add(cls); }
            // 動態對比檢查（basic）：若名字顏色與背景過低對比，強制 fallback 深色
            try {
                const col = t.name;
                function lum(hex){
                    const h = hex.replace('#','');
                    if(h.length===3){ const r=h[0]+h[0],g=h[1]+h[1],b=h[2]+h[2]; return lum('#'+r+g+b); }
                    const bigint=parseInt(h,16); const r=(bigint>>16)&255,g=(bigint>>8)&255,b=bigint&255;
                    const sr=[r,g,b].map(v=>{ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); });
                    return 0.2126*sr[0]+0.7152*sr[1]+0.0722*sr[2];
                }
                const l = lum(col);
                // 與白與深灰對比比值粗估
                function contrast(l1,l2){ const L1=Math.max(l1,l2),L2=Math.min(l1,l2); return (L1+0.05)/(L2+0.05); }
                const cWhite = contrast(l, lum('#ffffff'));
                const cDark = contrast(l, lum('#111827'));
                // 如果與白與深灰都 < 3.5 則採用深灰字體（確保可讀）
                if (cWhite < 3.5 && cDark < 3.5) {
                    modalEl.style.setProperty('--rt-name-override', '#111827');
                    if (leaderboardPlayerNameEl) leaderboardPlayerNameEl.style.color='#111827';
                }
            } catch(_) {}
            try { finalizeRankStyling(rank); } catch(_){ }
            try { window.__currentRank = rank; } catch(_) {}
        }

        // 移除可能覆蓋顏色的 Tailwind 類別並強制套用名次顏色
        function ensurePlayerNameColor(el, color){
            if(!el) return;
            try {
                const rm = [];
                el.classList.forEach(c=>{ if(/^text-(purple|gray|pink|indigo|blue|amber|rose|red)-/.test(c)) rm.push(c); });
                rm.forEach(c=>el.classList.remove(c));
                if (color) el.style.color = color;
            } catch(_){ }
        }

        // 清除上一關的時間 / PS 顯示，避免新遊戲殘留「上關 ...」資訊
        function resetLastLevelMeta(){
            try {
                if (gameState) {
                    gameState.lastLevelDurationSec = 0;
                    gameState.lastLevelPerformanceScore = null;
                }
            } catch(_) {}
        }

    // 在顯示覆蓋層時鎖定背景滾動（行動裝置舒適度）
    // Lock body scroll while modal overlays are visible
    function lockBodyScroll() {
            // remember previous overflow
            try {
                document.body.dataset._prevOverflow = document.body.style.overflow || '';
                document.body.style.overflow = 'hidden';
                document.body.style.touchAction = 'none';
            } catch (e) {}
        }

        /* === 性能 / 維護性增強工具區 (Non-invasive) ============================= */
        (function initOptimizationUtilities(){
            if (window.__bcOptimInit) return; window.__bcOptimInit = true;
            // 全域 debug 開關（可在 Console 設定 window.__debugPerf = true）
            window.__debugPerf = window.__debugPerf || false;
            // Idle 任務佇列：低優先級工作排入 requestIdleCallback (fallback setTimeout)
            const ric = window.requestIdleCallback || function(cb){ return setTimeout(()=>cb({didTimeout:false,timeRemaining:()=>0}), 120); };
            const idleQueue = [];
            window.queueIdleTask = function(task){ if (typeof task === 'function') idleQueue.push(task); };
            function drainIdle(deadline){
                while(idleQueue.length){
                    const t = idleQueue.shift();
                    try { t(); } catch(e){ if(window.__debugPerf) console.warn('[idleTask error]', e); }
                    if (deadline && typeof deadline.timeRemaining==='function' && deadline.timeRemaining() < 5) break;
                }
                if (idleQueue.length) ric(drainIdle); // 未清完再排程
            }
            ric(drainIdle);
            // 小工具：加入 passive 監聽（避免 scroll-blocking）
            window.addPassiveEvent = function(el, type, handler){
                try { el.addEventListener(type, handler, { passive:true }); } catch(_) { try { el.addEventListener(type, handler); } catch(__){} }
            };
            // 將非關鍵（例如排行榜刷新、成就計數更新）延後至 idle（需相關函式存在時才排入）
            queueIdleTask(()=>{ try { if(typeof updateAchievementTabCounts==='function' && gameState && gameState.unlockedAchievements){ updateAchievementTabCounts(gameState.unlockedAchievements); } } catch(_){} });
            // A11y / UX: ESC 關閉（受保護 modal 除外）
            document.addEventListener('keydown', (e)=>{
                if (e.key === 'Escape') {
                    const m = document.getElementById('playerNameModal');
                    if (m && !m.classList.contains('hidden') && m.dataset.protected==='1') return; // protected
                    // 若有其它可關閉的 overlay 可在此擴充
                    if (typeof closeModal === 'function') {
                        try { closeModal('playerNameModal'); } catch(_) {}
                    } else {
                        if (m) m.classList.add('hidden');
                    }
                }
            }, { passive:true });
            // Focus trap for modal (簡易版本) - 依賴 dataset.activeFocusTrap flag
            document.addEventListener('keydown', (e)=>{
                if (e.key !== 'Tab') return;
                const m = document.getElementById('playerNameModal');
                if (!m || m.classList.contains('hidden')) return;
                // 限制在結算視窗（避免跳出到背後按鈕）
                const focusable = m.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (!focusable.length) return;
                const list = Array.from(focusable).filter(el=>!el.disabled && el.offsetParent!==null);
                if (!list.length) return;
                const first = list[0]; const last = list[list.length-1];
                if (e.shiftKey && document.activeElement === first){ last.focus(); e.preventDefault(); }
                else if (!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault(); }
            }, { passive:false });
            // Debug helper: 輸出目前排名主題資訊
            window.__debugRank = function(){
                const r = window.__currentRank; const theme = RANK_THEME && RANK_THEME[r];
                console.log('[rank]', { rank:r, theme, color: RANK_COLOR_MAP && RANK_COLOR_MAP[r], playerName: (document.getElementById('leaderboardPlayerName')||{}).textContent });
            };
        })();
        /* ======================================================================= */

        /* === DOM Helper + Lazy Supabase Loader (centralized) ================== */
        (function initDomAndSupabaseHelpers(){
            if (window.__domHelpersReady) return; window.__domHelpersReady = true;
            // safeTpl: 安全建立 fragment，阻擋 script 與 on* 屬性
            window.safeTpl = function(html){
                try {
                    if (typeof html !== 'string') return document.createDocumentFragment();
                    const tpl=document.createElement('template'); tpl.innerHTML=html.trim(); return tpl.content.cloneNode(true);
                } catch(e){ console.warn('[safeTpl error]', e); return document.createDocumentFragment(); }
            };
            window.clearEl = function(el){ if(!el) return; while(el.firstChild) el.removeChild(el.firstChild); };
            window.setRatio = window.setRatio || function(el, correct, total){
                try { if(!el) return; correct = correct||0; total=total||0; let strong = el.querySelector('strong'); if(!strong){ el.textContent=''; strong=document.createElement('strong'); el.appendChild(strong);} strong.textContent = `(${correct}/${total})`; } catch(_) {}
            };
            window.__enhanceA11y = function(){ try { document.querySelectorAll('#finalAccuracyRatio').forEach(r=>{ r.setAttribute('role','status'); r.setAttribute('aria-live','polite'); }); } catch(_) {} };
            // Lazy Supabase loader 若尚未注入（避免與後方 patch 區塊重覆）
            if (!window.ensureSupabaseReady){
                let loading=null; let loaded=false;
                window.ensureSupabaseReady = function(){
                    if (loaded) return Promise.resolve();
                    if (window.supabase && window.supabase.createClient){ loaded=true; return Promise.resolve(); }
                    if (loading) return loading;
                    loading = new Promise((resolve,reject)=>{
                        const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'; s.defer=true; s.onload=()=>{ loaded=true; resolve(); }; s.onerror=e=>{ console.warn('[supabase] load failed', e); reject(e); }; document.head.appendChild(s);
                    });
                    return loading;
                };
                document.addEventListener('click', (ev)=>{ try { if (ev.target && (ev.target.closest('[data-open-leaderboard]') || ev.target.closest('#leaderboardHeader') || ev.target.closest('#leaderboardTabBtn'))) ensureSupabaseReady(); } catch(_) {} }, { passive:true });
                const modal = document.getElementById('playerNameModal');
                if (modal && window.MutationObserver){
                    const mo = new MutationObserver(list=>{ for(const m of list){ if(m.type==='attributes' && m.attributeName==='class' && !modal.classList.contains('hidden')) ensureSupabaseReady(); } });
                    mo.observe(modal, { attributes:true });
                }
            }
        })();
        /* ======================================================================= */

        // Add click handlers so tapping the big score triggers a small pulse + particles
        try {
            document.addEventListener('DOMContentLoaded', () => {
                const center = document.getElementById('centerScore');
                if (center) {
                    center.style.cursor = 'pointer';
                    center.addEventListener('click', (e) => {
                        try { pulseCenterScore(50); } catch(e) {}
                        try { spawnScoreParticles(50); } catch(e) {}
                    });
                }

                const final = document.getElementById('finalScore');
                if (final) {
                    final.style.cursor = 'pointer';
                    final.addEventListener('click', (e) => {
                        try { pulseCenterScore(50); } catch(e) {}
                        // originRect: spawn near the finalScore element
                        try { spawnScoreParticles(50, final.getBoundingClientRect()); } catch(e) {}
                    });
                }

                // Also allow the main title to trigger the same effect when tapped/clicked
                const mainTitle = document.getElementById('mainTitle');
                if (mainTitle) {
                    mainTitle.style.cursor = 'pointer';
                    mainTitle.addEventListener('click', (e) => {
                        try { pulseCenterScore(50); } catch(e) {}
                        try { spawnScoreParticles(50, mainTitle.getBoundingClientRect()); } catch(e) {}
                    });
                }

                // Hint button: trigger a small star burst originating from the button (no center pulse/glow)
                const hintBtn = document.getElementById('hintBtn');
                if (hintBtn) {
                    hintBtn.addEventListener('click', (e) => {
                        if (hintBtn.disabled) return;
                        try { spawnScoreParticles(50, hintBtn.getBoundingClientRect()); } catch(e) {}
                    });
                }

                // 移除手機版計分說明開關（計分說明改為獨立卡片，固定顯示）
            });
        } catch (e) { /* defensive: ignore if DOM not ready in some environments */ }

        // 全域：偵測並追蹤「減少動態效果」偏好（效能/無障礙）
        (function(){
            try {
                const mq = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)')) || null;
                try { applyReducedMotionSetting && applyReducedMotionSetting(); } catch(_) {}
                window.__reducedMotion = !!(mq && mq.matches);
                if (mq && mq.addEventListener) {
                    mq.addEventListener('change', (e) => { window.__reducedMotion = !!e.matches; });
                }
            } catch (e) { /* ignore */ }
        })();
    // 回傳目前是否啟用「減少動態效果」偏好
    // Read reduced-motion preference flag
    function getReducedMotion() { return !!window.__reducedMotion; }

    // 還原先前的 body 滾動設定
    // Restore body scroll after modal close
    function unlockBodyScroll() {
            try {
                document.body.style.overflow = document.body.dataset._prevOverflow || '';
                document.body.style.touchAction = '';
                delete document.body.dataset._prevOverflow;
            } catch (e) {}
        }
        
        // Attach/detach an Enter key handler that confirms and returns to main menu when the end-game modal is open
    // 在結算視窗開啟時，綁定 Enter 快速確認的快捷鍵
    // Attach Enter hotkey for confirming while modal open
    function attachPlayerNameModalEnterHotkey() {
            try {
                const modal = document.getElementById('playerNameModal');
                if (!modal) return;
                // Remove previous handler if any
                if (modal.__enterHandler) {
                    try { document.removeEventListener('keydown', modal.__enterHandler); } catch (e) {}
                    modal.__enterHandler = null;
                }
                const handler = (ev) => {
                    if (ev && ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
                        // Only trigger if modal is actually visible
                        if (!modal.classList.contains('hidden')) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            try { window.confirmPlayerName(); } catch (e) {}
                        }
                    }
                };
                modal.__enterHandler = handler;
                document.addEventListener('keydown', handler);
            } catch (e) { /* ignore */ }
        }

    // 解除前述快捷鍵（避免影響其他畫面）
    // Detach the Enter hotkey handler
    function detachPlayerNameModalEnterHotkey() {
            try {
                const modal = document.getElementById('playerNameModal');
                if (!modal) return;
                const handler = modal.__enterHandler;
                if (handler) {
                    try { document.removeEventListener('keydown', handler); } catch (e) {}
                    modal.__enterHandler = null;
                }
            } catch (e) { /* ignore */ }
        }

        // Utility: clear all leaderboard records (online if adapter exists, plus local cache)
        window.clearAllLeaderboardsNow = async function() {
            // 先嘗試確保 Supabase 就緒並建立 Adapter（若有設定）
            try { if (window.ensureSupabaseReady) await window.ensureSupabaseReady().catch(()=>{}); } catch(_) {}
            try { window.tryInitOnlineLeaderboard && window.tryInitOnlineLeaderboard(); } catch(_) {}
            // 清除遠端
            try {
                if (window.Leaderboard && typeof window.Leaderboard.clear === 'function') {
                    try { await window.Leaderboard.clear(); } catch (e) { /* ignore remote errors */ }
                }
            } catch (_) { /* ignore */ }
            // 失效快取與本機儲存
            try { window.invalidateLeaderboardCache && window.invalidateLeaderboardCache(); } catch(_) {}
            try { window.__lbLatestData = { classic: [], survival: [] }; window.__lbLatestTs = 0; } catch(_) {}
            try {
                const key=(window.__BC_CONSTS&&window.__BC_CONSTS.STORAGE_KEY_LEADERBOARD)||'bibleGameLeaderboard';
                if(window.__bcStorage) window.__bcStorage.remove(key); else localStorage.removeItem(key);
            } catch(_) {}
            // 重新整理 UI（兩個分頁各跑一次）
            try { await updateLeaderboardDisplay('classic', { force: true }); } catch(_) {}
            try { await updateLeaderboardDisplay('survival', { force: true }); } catch(_) {}
        };

        // URL trigger: add #clearLeaderboard or ?clearLeaderboard=1 to invoke clearing without UI clicks
        (function attachClearLeaderboardTrigger(){
            try {
                const url = new URL(window.location.href);
                const hash = (url.hash || '').toLowerCase();
                const qs = url.searchParams;
                const shouldClear = hash.includes('clearleaderboard') || qs.has('clearLeaderboard') || qs.get('clear') === 'leaderboard';
                if (shouldClear) {
                    // Defer to ensure DOM is ready and adapters initialized
                    setTimeout(async () => {
                        try { await window.clearAllLeaderboardsNow(); } catch(_) {}
                        try { alert('已清空排行榜紀錄'); } catch(_) {}
                    }, 100);
                }
            } catch (e) { /* ignore */ }
        })();
        
        // Wrapper kept for backwards compatibility when called from game-end flow
    // 由當前遊戲狀態生成結算明細（UI 包裝器）
    // Render score breakdown from live gameState
    function generateScoreBreakdown() {
            renderScoreBreakdown(gameState, { isRecord: false });
        }
        
    // 解析字串得分（拆出 +/-、數值與尾碼）
    // Parse a score display string into parts
    function parseScoreDisplay(text) {
            try {
                const s = String(text || '').trim();
                const m = s.match(/^([+\-])?(\d+)(.*)$/);
                if (!m) return { sign: '', value: 0, suffix: '' };
                const sign = m[1] || '';
                const value = parseInt(m[2], 10) || 0;
                const suffix = (m[3] || '').trim();
                return { sign, value, suffix };
            } catch (_) { return { sign: '', value: 0, suffix: '' }; }
        }

    // 新增一行計分明細（可標註總分行）
    // Append a breakdown item row
    function addScoreItem(container, label, calculation, score, colorClass, isTotal = false) {
            const item = document.createElement('div');
            item.className = `flex justify-between items-center ${isTotal ? 'col-span-2 border-t pt-2 mt-2' : ''}`;
            const parsed = parseScoreDisplay(score);
            const hasSuffix = parsed.suffix && parsed.suffix.length > 0;
            // 左側
            const left = document.createElement('div'); left.className='flex flex-col';
            const labelSpan = document.createElement('span'); labelSpan.className=`${colorClass} text-left`; labelSpan.textContent=label; left.appendChild(labelSpan);
            if (calculation){ const calcSpan=document.createElement('span'); calcSpan.className='text-gray-500 text-xs'; calcSpan.textContent=calculation; left.appendChild(calcSpan); }
            // 右側
            const right = document.createElement('span'); right.className=`${colorClass} font-bold bd-right`;
            const numSpan = document.createElement('span'); numSpan.className='bd-num'; numSpan.dataset.target=String(parsed.value); numSpan.dataset.sign=parsed.sign; numSpan.textContent=`${parsed.sign}0`;
            right.appendChild(numSpan);
            if (hasSuffix){ const sfx=document.createElement('span'); sfx.className='bd-suffix'; sfx.textContent=parsed.suffix; right.appendChild(sfx); }
            item.appendChild(left); item.appendChild(right);
            container.appendChild(item);
        }
        
    // 計算本局額外獎勵（完美/全對/提示）
    // Compute bonus score for the run
    function getBonusScore() {
            let bonusScore = 0;
            
            // 計算完美和全對獎勵（scaled）
            Object.values(gameState.levelResults).forEach(result => {
                if (result === 'perfect') bonusScore += 300;
                else if (result === 'complete') bonusScore += 100;
            });
            
            // 計算提示獎勵（scaled）
            const hintCounts = { easy: 3, normal: 3, hard: 3 };
            const totalHints = hintCounts[gameState.difficulty];
            const hintsRemaining = totalHints - gameState.usedHints.size;
            bonusScore += hintsRemaining * 100;
            
            return bonusScore;
        }

        // Shared renderer used by both game-end and leaderboard record views
    // 共用渲染器：支援遊戲結束與排行榜紀錄檢視
    // Shared breakdown renderer for end-game and record view
    function renderScoreBreakdown(source, options = {}) {
            const container = document.getElementById('scoreBreakdownContent');
            if (!container) return;
            container.innerHTML = '';

            const isRecord = !!options.isRecord;

            // 先即時顯示結算摘要（完美答題數／經文／用時；舊紀錄回退顯示難度），避免首次開啟時延遲顯示
            try {
                const metaEl = document.getElementById('finalMetaLine');
                if (metaEl) {
                    let diffLabel = '';
                    try {
                        const d = (source.difficulty || gameState.difficulty || '').toString();
                        if (d === 'easy') diffLabel = '簡單';
                        else if (d === 'normal') diffLabel = '普通';
                        else if (d === 'hard') diffLabel = '困難';
                    } catch(_) {}

                    let timeText = '';
                    try {
                        if (isRecord && (source.time || source.elapsed)) {
                            timeText = `${source.time || source.elapsed}`;
                        } else {
                            const end = gameState.gameEndTime || Date.now();
                            const start = gameState.gameStartTime || end;
                            const secs = Math.max(0, Math.floor((end - start) / 1000));
                            const m = Math.floor(secs / 60);
                            const s = (secs % 60).toString().padStart(2, '0');
                            timeText = `${m}:${s}`;
                        }
                    } catch(_) {}

                    let rarityPart = '';
                    try {
                        const r = (source.rarity || gameState.rarity || '').toString();
                        let rarityLabel = '';
                        if (r === 'common') rarityLabel = '常見';
                        else if (r === 'rare') rarityLabel = '冷門';
                        else if (r === 'all') rarityLabel = '全部';
                        if (rarityLabel) rarityPart = `經文：${rarityLabel}`;
                    } catch(_) {}

                    const parts = [];
                    // 完美答題數（定義：一次答對題數）
                    // 優先使用來源紀錄欄位，其次使用 finalMetrics.firstTryCorrectCount；
                    // 舊紀錄若無此欄位則回退顯示難度，避免誤用其他統計。
                    try {
                        let perfectCount = null;
                        if (isRecord) {
                            if (typeof source.perfectAnswerCount === 'number') perfectCount = source.perfectAnswerCount;
                            else if (typeof source.perfect_count === 'number') perfectCount = source.perfect_count; // legacy/backfill alias
                            else if (source.finalMetrics && typeof source.finalMetrics.firstTryCorrectCount === 'number') perfectCount = source.finalMetrics.firstTryCorrectCount;
                        } else if (gameState && gameState.finalMetrics && typeof gameState.finalMetrics.firstTryCorrectCount === 'number') {
                            perfectCount = gameState.finalMetrics.firstTryCorrectCount;
                        }
                        if (typeof perfectCount === 'number') parts.push(`完美答題數：${perfectCount}`);
                        else if (diffLabel) parts.push(`難度：${diffLabel}`);
                    } catch(_) { if (diffLabel) parts.push(`難度：${diffLabel}`); }
                    if (rarityPart) parts.push(rarityPart);
                    if (timeText) parts.push(`用時：${timeText}`);
                    metaEl.textContent = parts.join(' · ');
                    metaEl.classList.remove('hidden');
                }
            } catch(_) { /* ignore */ }

            // 正規化來源（遊戲中狀態 vs. 紀錄）
            // Normalize fields between live gameState and stored record
            const correctAnswers = source.correctAnswers != null ? source.correctAnswers : (source.totalCorrectAnswers != null ? source.totalCorrectAnswers : 0);
            const totalMistakes = source.totalMistakes != null ? source.totalMistakes : 0;
            const difficulty = source.difficulty || gameState.difficulty;

            // 1) 基礎分數：固定 100 分/題（移除罕見度影響）
            const perQ = 100;
            const baseScore = correctAnswers * perQ;
            addScoreItem(container, '基礎分數', `${correctAnswers} × ${perQ}`, `+${baseScore}分`, 'text-purple-600');

            // 2) 連擊加成（顯示最高連擊於計算欄）
            try {
                const comboBonus = (source.comboTotalBonus != null) ? source.comboTotalBonus : (gameState.comboTotalBonus || 0);
                let calc = '';
                try {
                    let peak = 0;
                    if (source && source.finalMetrics && typeof source.finalMetrics.maxComboReached === 'number') peak = source.finalMetrics.maxComboReached;
                    else if (gameState && gameState.finalMetrics && typeof gameState.finalMetrics.maxComboReached === 'number') peak = gameState.finalMetrics.maxComboReached;
                    else if (source && typeof source.maxComboReached === 'number') peak = source.maxComboReached;
                    if (!peak) peak = Math.max(0, Math.min((gameState.maxCombo||25), (gameState.combo||0)));
                    if (peak > 0) calc = `${peak}次/最高連擊`;
                } catch(_) {}
                addScoreItem(container, '連擊加成', calc, `+${comboBonus}分`, 'text-indigo-600');
            } catch(_) {}

            // 3) 時間獎勵（顯示平均 x.x 秒/題；分數不倒扣）

            // 時間獎勵：顯示平均用時（平均：x.x 秒/題），record 使用記錄，live 以本局時間計算
            if (isRecord) {
                // Record view: show time section if we either have a timeReward or can compute average pace.
                const hasTimeReward = (source.timeReward != null);
                let timeDisplay = '';
                try {
                    const totalQ = (source.totalQuestions != null) ? source.totalQuestions : (gameState.totalQuestions || 0);
                    if (typeof source.avgAnswerMs === 'number' && source.avgAnswerMs > 0) {
                        const text = (Math.round((source.avgAnswerMs/1000) * 10) / 10).toFixed(1);
                        timeDisplay = `${text} 秒/題`;
                    } else {
                        let secs = 0;
                        const tstr = (typeof source.time === 'string' && source.time) ? source.time : (typeof source.elapsed === 'string' ? source.elapsed : '');
                        if (tstr) {
                            const mm = parseInt(tstr.split(':')[0] || '0', 10) || 0;
                            const ss = parseInt(tstr.split(':')[1] || '0', 10) || 0;
                            secs = (mm * 60) + ss;
                        }
                        if (totalQ > 0 && secs > 0) {
                            const avg = secs / totalQ;
                            const text = (Math.round(avg * 10) / 10).toFixed(1);
                            timeDisplay = `${text} 秒/題`;
                        }
                    }
                } catch(_) {}
                const shouldShowTimeRow = hasTimeReward || !!timeDisplay || source.showTimeReward === true;
                if (shouldShowTimeRow) {
                    const rawTime = hasTimeReward ? (Number(source.timeReward) || 0) : 0;
                    const timeScore = Math.max(0, Math.round(rawTime));
                    const sign = timeScore > 0 ? '+' : '';
                    const label = '時間獎勵';
                    const colorClass = timeScore > 0 ? 'text-blue-600' : 'text-gray-600';
                    addScoreItem(container, label, timeDisplay, `${sign}${timeScore}分`, colorClass);
                }
            } else {
                if (gameState.showTimeReward) {
                    // 修正：依規則應回加 50 × 失誤數 以消除失誤扣分的影響；且顯示為「不倒扣」。
                    // Note: add back 50 × mistakes to neutralize mistake deduction before timeReward; clamp display to non-negative.
                    const timeScoreRaw = gameState.score - baseScore + (totalMistakes * 50) - getBonusScore();
                    const timeScore = Math.max(0, Math.round(timeScoreRaw));
                    const sign = timeScore > 0 ? '+' : '';
                    // 平均作答秒數：優先使用 finalizeMetrics.avgAnswerMs（只含答題耗時），回退總時長
                    let timeDisplay = '';
                    try {
                        let avgMs = null;
                        if (gameState.finalMetrics && typeof gameState.finalMetrics.avgAnswerMs === 'number' && gameState.finalMetrics.avgAnswerMs > 0) {
                            avgMs = gameState.finalMetrics.avgAnswerMs;
                        } else if (typeof gameState.totalQuestions === 'number' && gameState.totalQuestions > 0) {
                            const end = gameState.gameEndTime || Date.now();
                            const start = gameState.gameStartTime || end;
                            const secs = Math.max(0, (end - start) / 1000);
                            avgMs = (secs / gameState.totalQuestions) * 1000;
                        }
                        if (avgMs != null && avgMs > 0) {
                            const text = (Math.round((avgMs/1000) * 10) / 10).toFixed(1);
                            timeDisplay = `${text} 秒/題`;
                        }
                    } catch(_) {}
                    const label = '時間獎勵';
                    const colorClass = timeScore > 0 ? 'text-blue-600' : 'text-gray-600';
                    addScoreItem(container, label, timeDisplay, `${sign}${timeScore}分`, colorClass);
                }
            }

            // 4) 關卡獎勵（全對關卡／完美關卡）
            let perfectCount = 0;
            let completeCount = 0;
            const levelResults = source.levelResults || {};
            Object.values(levelResults).forEach(r => {
                if (r === 'perfect') perfectCount++;
                else if (r === 'complete') completeCount++;
            });

            addScoreItem(container, '全對關卡', `${completeCount} × 100`, `+${completeCount * 100}分`, 'text-green-600');
            addScoreItem(container, '完美關卡', `${perfectCount} × 300`, `+${perfectCount * 300}分`, 'text-yellow-600');

            // 5) 剩餘提示（主選單固定 3 次配額的模式）
            if (isRecord) {
                if (source.hintsRemaining != null && source.totalHints != null) {
                    const hintsLeft = source.hintsRemaining || 0;
                    addScoreItem(container, '剩餘提示', `${hintsLeft} × 100`, `+${hintsLeft * 100}分`, 'text-orange-600');
                }
            } else {
                const hintCounts = { easy: 3, normal: 3, hard: 3 };
                const totalHints = hintCounts[difficulty];
                const hintsUsedCount = gameState.usedHints ? gameState.usedHints.size : 0;
                const hintsRemaining = totalHints - hintsUsedCount;
                addScoreItem(container, '剩餘提示', `${Math.max(0,hintsRemaining)} × 100`, `+${Math.max(0,hintsRemaining) * 100}分`, 'text-orange-600');
            }

            // 6) 失誤扣分
            const mistakeDeduction = totalMistakes * 50;
            addScoreItem(container, '失誤扣分', `${totalMistakes} × 50`, `-${mistakeDeduction}分`, 'text-red-600');

            // 7) 不再於明細內顯示「總分」行；總分已在上方大字顯示

            // Animate breakdown numbers first; then animate final score and accuracy
            try {
                const nums = Array.from(container.querySelectorAll('.bd-num'));
                const reduced = getReducedMotion && getReducedMotion();
                const perItem = reduced ? 480 : 720;
                const gap = reduced ? 80 : 160;
                let totalDelay = 0;
                nums.forEach((n, i) => {
                    const target = parseInt(n.dataset.target || '0', 10) || 0;
                    const sign = n.dataset.sign || '';
                    const dur = perItem + Math.min(1200, Math.floor(target * 8));
                    setTimeout(() => {
                        try { animateInlineNumber(n, 0, target, dur, sign); } catch(_) {}
                    }, totalDelay);
                    totalDelay += gap;
                });

                // After breakdown anim completes, animate final score and accuracy
                setTimeout(() => {
                    try {
                        const finalScoreEl = document.getElementById('finalScore');
                        const finalAccEl = document.getElementById('finalAccuracy');
                        const metaEl = document.getElementById('finalMetaLine');
                        const total = (source.score != null ? source.score : (gameState.score || 0));
                        if (finalScoreEl) {
                            // ensure starts at 0 then count up
                            finalScoreEl.textContent = '0';
                            animateInlineNumber(finalScoreEl, 0, total, reduced ? 1200 : 1800, '');
                        }
                        if (finalAccEl) {
                            // parse (x/y) for accurate percentage
                            const ratioEl = document.getElementById('finalAccuracyRatio');
                            let acc = 0;
                            try {
                                const t = ratioEl && ratioEl.textContent ? ratioEl.textContent : '';
                                const m = t.match(/(\d+)\/(\d+)/);
                                if (m) {
                                    const got = parseInt(m[1], 10) || 0;
                                    const tot = parseInt(m[2], 10) || 0;
                                    acc = tot > 0 ? Math.round((got / tot) * 100) : 0;
                                }
                            } catch(_) {}
                            // Keep % sign visible during the count-up: animate only the numeric span
                            finalAccEl.innerHTML = '<span class="acc-num">0</span><span class="acc-unit">%</span>';
                            const numEl = finalAccEl.querySelector('.acc-num');
                            try { animateInlineNumber(numEl, 0, acc, reduced ? 1200 : 1800, ''); } catch(_) {}
                        }

                        // Show a small meta line (完美答題數／經文／用時；舊紀錄回退顯示難度) to enrich the center area
                        try {
                            if (metaEl) {
                                let diffLabel = '';
                                try {
                                    const d = (source.difficulty || gameState.difficulty || '').toString();
                                    if (d === 'easy') diffLabel = '簡單';
                                    else if (d === 'normal') diffLabel = '普通';
                                    else if (d === 'hard') diffLabel = '困難';
                                } catch(_) {}

                                let timeText = '';
                                try {
                                    if (source.time || source.elapsed) {
                                        timeText = `${source.time || source.elapsed}`;
                                    } else {
                                        const end = gameState.gameEndTime || Date.now();
                                        const start = gameState.gameStartTime || end;
                                        const secs = Math.max(0, Math.floor((end - start) / 1000));
                                        const m = Math.floor(secs / 60);
                                        const s = (secs % 60).toString().padStart(2, '0');
                                        timeText = `${m}:${s}`;
                                    }
                                } catch(_) {}

                                const parts = [];
                                try {
                                    let perfectCount = null;
                                    if (source && (source.perfectAnswerCount!=null || source.perfect_count!=null)) {
                                        perfectCount = (typeof source.perfectAnswerCount==='number') ? source.perfectAnswerCount : (typeof source.perfect_count==='number' ? source.perfect_count : null);
                                    } else if (gameState && gameState.finalMetrics && typeof gameState.finalMetrics.firstTryCorrectCount === 'number') {
                                        perfectCount = gameState.finalMetrics.firstTryCorrectCount;
                                    } else if (source && source.finalMetrics && typeof source.finalMetrics.firstTryCorrectCount === 'number') {
                                        perfectCount = source.finalMetrics.firstTryCorrectCount;
                                    }
                                    if (typeof perfectCount === 'number') parts.push(`完美答題數：${perfectCount}`);
                                    else if (diffLabel) parts.push(`難度：${diffLabel}`);
                                } catch(_) { if (diffLabel) parts.push(`難度：${diffLabel}`); }

                                // 出題範圍（常見/冷門/全部），僅在有選擇排行罕見度時顯示
                                try {
                                    const r = (source.rarity || gameState.rarity || '').toString();
                                    let rarityLabel = '';
                                    if (r === 'common') rarityLabel = '常見';
                                    else if (r === 'rare') rarityLabel = '冷門';
                                    else if (r === 'all') rarityLabel = '全部';
                                    if (rarityLabel) parts.push(`經文：${rarityLabel}`);
                                } catch(_) {}

                                if (timeText) parts.push(`用時：${timeText}`);
                                metaEl.textContent = parts.join(' · ');
                                metaEl.classList.remove('hidden');
                            }
                        } catch(_) {}
                    } catch (_) {}
                }, Math.max(0, totalDelay + (reduced ? 400 : 640)));
            } catch(_) { /* ignore anim errors */ }
        }

        // Backwards-compatible wrapper used when viewing a leaderboard record
    // 從排行榜紀錄渲染結算明細（補齊舊欄位）
    // Render breakdown using saved leaderboard record
    function renderScoreBreakdownFromRecord(record) {
            renderScoreBreakdown(record, { isRecord: true });
        }
        
        // Keep only one text+ref inside the closing verse container
    // 清理結語經文容器的重複節點/殘留
    // Sanitize closing verse container duplicates
    function sanitizeClosingVerseContainer() {
            try {
                const cv = document.getElementById('closingVerse');
                if (!cv) return;
                // Ensure exactly one text node and one ref node exist
                let textEl = cv.querySelector('#closingVerseText');
                let refEl = cv.querySelector('#closingVerseRef');
                // Create if missing
                if (!textEl) {
                    textEl = document.createElement('div');
                    textEl.id = 'closingVerseText';
                    textEl.className = 'text-lg font-bold text-gray-800 mb-1 closing-verse-clamp';
                    cv.insertAdjacentElement('afterbegin', textEl);
                }
                if (!refEl) {
                    refEl = document.createElement('div');
                    refEl.id = 'closingVerseRef';
                    refEl.className = 'text-sm text-gray-600 font-semibold';
                    refEl.style.marginTop = '4px';
                    cv.appendChild(refEl);
                }
                // Remove any other children except these two
                const keep = new Set([textEl, refEl]);
                Array.from(cv.childNodes).forEach(node => {
                    if (!keep.has(node)) cv.removeChild(node);
                });
            } catch (e) { /* ignore */ }
        }

        // Consistently apply closing verse text/ref to the modal and optionally persist to gameState
    // 將結語經文（文字＋參考）套用到視圖，必要時持久化
    // Apply closing verse text+ref to the view; optionally persist
    function applyClosingVerse(text, ref, persist = false) {
            sanitizeClosingVerseContainer();
            const closingVerseText = document.getElementById('closingVerseText');
            const closingVerseRef = document.getElementById('closingVerseRef');
            const safeText = (text && String(text).trim().length) ? String(text).trim() : '感謝遊玩！';
            let safeRef = (ref && String(ref).trim().length) ? String(ref).trim() : '';
            // Normalize refs that mistakenly append the verse text (e.g., "書 章:節:「經文…")
            if (safeRef) {
                const m = safeRef.match(/^(.*?\s\d+:\d+(?:-\d+)?)/);
                if (m) safeRef = m[1];
            }
            // Avoid double-leading quotes when verse itself already starts with a quote mark
            // 以中文引號包裹文本（避免重複包裹）
            // Wrap given text with Chinese quotes if not already wrapped
            function wrapChineseQuotes(s) {
                const str = String(s).trim();
                if (!str) return '';
                const leadingQuotes = ['「','『','“','"','”','』','』'];
                const first = str[0];
                // If the verse already begins with any quote mark, do not add outer quotes
                if (leadingQuotes.includes(first)) return str;
                return `「${str}」`;
            }
            if (closingVerseText) closingVerseText.textContent = wrapChineseQuotes(safeText);
            if (closingVerseRef) closingVerseRef.textContent = safeRef;
            if (persist) {
                try {
                    gameState.closingVerse = safeText;
                    gameState.closingVerseRef = safeRef;
                } catch (e) {}
            }
        }

    // 依表現（正確率）挑選合適的結語經文
    // Pick a closing verse based on run accuracy
    function updateClosingVerse(accuracy) {
            const closingVerseText = document.getElementById('closingVerseText');
            const closingVerseRef = document.getElementById('closingVerseRef');

            // 1) 準備允許的書卷（依玩家選擇的範圍）；僅用作偏好，不做強制
            // 依當前範圍（含自訂）取得允許書卷集合
            // Build allowed books set from current range/custom
            function getAllowedBooks() {
                try {
                    if (gameState.range === 'testament') return bibleBooks[gameState.testament] || [];
                    if (gameState.range === 'custom') return Array.isArray(gameState.customBooks) ? gameState.customBooks : [];
                    if (gameState.range === 'theme') return [...bibleBooks.old, ...bibleBooks.new];
                    // 'all' 或未設定 -> 全部
                    return [...bibleBooks.old, ...bibleBooks.new];
                } catch (e) {
                    return [...bibleBooks.old, ...bibleBooks.new];
                }
            }
            const allowedBooks = getAllowedBooks();

            // 2) 輕量歷史：盡量避免最近重複，但不強制
            // 取得並維護最近使用的結語經文歷史，避免連續重複
            // Get/maintain recent closing-verse history to avoid repeats
            function getHistory() {
                try {
                    const raw = sessionStorage.getItem('closingVerseHistory');
                    const arr = raw ? JSON.parse(raw) : [];
                    return Array.isArray(arr) ? arr : [];
                } catch (e) { return []; }
            }
            // 將新的結語引用推入歷史（固定長度）
            // Push a ref into bounded history buffer
            function pushHistory(refStr) {
                try {
                    if (!refStr) return;
                    const maxKeep = 10;
                    const arr = getHistory().filter(x => x && x !== refStr);
                    arr.unshift(refStr);
                    while (arr.length > maxKeep) arr.pop();
                    sessionStorage.setItem('closingVerseHistory', JSON.stringify(arr));
                } catch (e) {}
            }
            const recentHistory = getHistory();

            // 3) 文字解析工具（僅必要時使用）
            // 將 "書名 章:節" 解析為結構化欄位
            // Parse a "Book C:V" ref into structured fields
            function parseRef(ref) {
                if (!ref || typeof ref !== 'string') return null;
                const i = ref.indexOf(' ');
                if (i <= 0) return { book: ref, chapter: null, verse: null };
                const book = ref.slice(0, i).trim();
                const rest = ref.slice(i + 1).trim();
                const m = rest.match(/^(\d+):(\d+)(?:-\d+)?$/);
                if (!m) return { book, chapter: null, verse: null };
                return { book, chapter: parseInt(m[1], 10), verse: parseInt(m[2], 10) };
            }

            // 4) 各表現等級對應的候選經文（沿用原來的精選名單；作為後備）
            const pools = {
                excellent: [
                    { text: "你們要靠主常常喜樂。我再說，你們要喜樂。", ref: "腓立比書 4:4" },
                    { text: "那美好的仗我已經打過了，當跑的路我已經跑盡了，所信的道我已經守住了。", ref: "提摩太後書 4:7" },
                    { text: "神能照著運行在我們心裡的大力充充足足地成就一切，超過我們所求所想的。", ref: "以弗所書 3:20" },
                    { text: "得勝的，我要賜他在我寶座上與我同坐。", ref: "啟示錄 3:21" },
                    { text: "忠心至死，我就賜給你那生命的冠冕。", ref: "啟示錄 2:10" },
                    { text: "好，你這又良善又忠心的僕人。", ref: "馬太福音 25:21" },
                    { text: "凡得勝的必這樣穿白衣，我也必不從生命冊上塗抹他的名。", ref: "啟示錄 3:5" },
                    { text: "義人的腳步被耶和華立定；他的道路，耶和華也喜愛。", ref: "詩篇 37:23" },
                    { text: "你們是世上的光。城造在山上是不能隱藏的。", ref: "馬太福音 5:14" },
                    { text: "聖靈所結的果子，就是仁愛、喜樂、和平。", ref: "加拉太書 5:22" }
                ],
                good: [
                    { text: "我靠著那加給我力量的，凡事都能做。", ref: "腓立比書 4:13" },
                    { text: "忘記背後，努力面前的，向著標竿直跑。", ref: "腓立比書 3:13-14" },
                    { text: "但那等候耶和華的必重新得力。", ref: "以賽亞書 40:31" },
                    { text: "你當剛強壯膽！不要懼怕，也不要驚惶。", ref: "約書亞記 1:9" },
                    { text: "當將你的事交託耶和華，並倚靠他，他就必成全。", ref: "詩篇 37:5" },
                    { text: "你們所遇見的試探，無非是人所能受的。", ref: "哥林多前書 10:13" },
                    { text: "我們行善，不可喪志；若不灰心，到了時候就要收成。", ref: "加拉太書 6:9" },
                    { text: "你要保守你心，勝過保守一切，因為一生的果效是由心發出。", ref: "箴言 4:23" },
                    { text: "應當一無掛慮，只要凡事藉著禱告、祈求，和感謝。", ref: "腓立比書 4:6" },
                    { text: "神所賜、出人意外的平安必在基督耶穌裡保守你們的心懷意念。", ref: "腓立比書 4:7" }
                ],
                encouraging: [
                    { text: "疲乏的，他賜能力；軟弱的，他加力量。", ref: "以賽亞書 40:29" },
                    { text: "你當剛強壯膽！不要懼怕，也不要驚惶。", ref: "約書亞記 1:9" },
                    { text: "我的恩典夠你用的，因為我的能力是在人的軟弱上顯得完全。", ref: "哥林多後書 12:9" },
                    { text: "耶和華必在你前面行；他必與你同在，必不撇下你。", ref: "申命記 31:8" },
                    { text: "你們要將一切的憂慮卸給神，因為他顧念你們。", ref: "彼得前書 5:7" },
                    { text: "神是我們的避難所，是我們的力量，是我們在患難中隨時的幫助。", ref: "詩篇 46:1" },
                    { text: "耶和華靠近傷心的人，拯救靈性痛悔的人。", ref: "詩篇 34:18" },
                    { text: "你要把你的重擔卸給耶和華，他必撫養你。", ref: "詩篇 55:22" },
                    { text: "凡勞苦擔重擔的人可以到我這裡來，我就使你們得安息。", ref: "馬太福音 11:28" },
                    { text: "在神沒有難成的事。", ref: "路加福音 1:37" }
                ],
                supportive: [
                    { text: "你們中間若有缺少智慧的，應當求那厚賜與眾人、也不斥責人的神。", ref: "雅各書 1:5" },
                    { text: "你要專心仰賴耶和華，不可倚靠自己的聰明。", ref: "箴言 3:5" },
                    { text: "你的話是我腳前的燈，是我路上的光。", ref: "詩篇 119:105" },
                    { text: "敬畏耶和華是智慧的開端；認識至聖者便是聰明。", ref: "箴言 9:10" },
                    { text: "我心裡存記你的話，免得我得罪你。", ref: "詩篇 119:11" },
                    { text: "聖經都是神所默示的，於教訓、督責、使人歸正、教導人學義都是有益的。", ref: "提摩太後書 3:16" },
                    { text: "信道是從聽道來的，聽道是從基督的話來的。", ref: "羅馬書 10:17" },
                    { text: "草必枯乾，花必凋殘，惟有我們神的話必永遠立定。", ref: "以賽亞書 40:8" },
                    { text: "天地要廢去，我的話卻不能廢去。", ref: "馬太福音 24:35" },
                    { text: "人活著，不是單靠食物，乃是靠神口裡所出的一切話。", ref: "馬太福音 4:4" }
                ]
            };

            // 5) 依 accuracy 計算等級（只用於後備池與微弱偏好）
            let tier = 'supportive';
            if (accuracy >= 90) tier = 'excellent';
            else if (accuracy >= 70) tier = 'good';
            else if (accuracy >= 50) tier = 'encouraging';

            // 6) 主要路徑：從外部經文庫挑選符合「安慰、勸勉、造就、鼓勵」原則的經文
            // 從資料庫挑選鼓勵/積極向上的經文候選
            // Pick affirmative/encouraging verses from DB
            function pickPositiveFromDB() {
                try {
                    const db = getActiveVerseDB();
                    if (!Array.isArray(db) || db.length === 0) return null;

                    // 主題關鍵詞分類（安慰/勸勉/造就/鼓勵）
                    const THEMES = {
                        comfort: ['安慰','撫慰','醫治','醫治你','拯救我','倚靠','信靠','保守','平安','安息','避難所','靠主','靠着主','扶持','幫助','同在','不撇下','不丟棄','不離開'],
                        exhort: ['勸勉','勉勵','勸戒','警醒','持守','忍耐','自守','彼此相愛','彼此勸慰','行善','行事為人','要追求','要學','要遠避','不可懼怕','不可停止','要謹守'],
                        edify: ['造就','建造','堅固','成全','教導','教訓','智慧','真理','公義','敬虔','學義','成長','成聖','得著','得以','使你們','使我們'],
                        encourage: ['鼓勵','剛強','勇敢','壯膽','喜樂','盼望','得力','加添力量','歡呼','高興','放心','振作','不灰心','不喪膽','得勝']
                    };
                    const NEGATIVE = ['怒','發怒','懲罰','刑罰','鞭','咒詛','滅','審判','仇','仇敵','報應','毀滅','殺','砍','擊打','咒','哀號','災','災禍','有禍了','咒詛','咒罵'];

                    // 根據表現偏好主題：低分偏向安慰/鼓勵；高分偏向勸勉/造就
                    let preferredThemes = ['comfort','encourage','exhort','edify'];
                    if (accuracy >= 70) preferredThemes = ['exhort','edify','encourage','comfort'];

                    const pool = db.slice();

                    // 粗略主題分類（感恩/盼望/得勝…）
                    // Coarse theme classification from text
                    function classifyThemes(text) {
                        if (!text || typeof text !== 'string') return [];
                        const t = [];
                        const hasNeg = NEGATIVE.some(k => text.includes(k));
                        if (hasNeg) return t;
                        for (const [key, words] of Object.entries(THEMES)) {
                            if (words.some(w => text.includes(w))) t.push(key);
                        }
                        return t;
                    }

                    // 候選：需命中任一主題，且非負面；同時優先短句可讀性
                    let candidates = pool.filter(v => Array.isArray(v) ? false : true)
                        .map(v => ({ rec: v, themes: classifyThemes(v.verse) }))
                        .filter(x => x.themes.length > 0);

                    if (!candidates.length) return null;

                    // 分 rarity：常見 > 冷門（對結語可讀性友善）
                    function byRarity(list, r) { return list.filter(x => x.rec.rarity === r); }
                    let cCommon = byRarity(candidates, 'common');
                    let cRare = byRarity(candidates, 'rare');

                    // 偏好同範圍書卷
                    // 優先當前允許書卷；不足再放寬
                    // Prefer allowed-books first; relax if needed
                    function preferAllowed(arr) {
                        return [...arr].sort((a,b) => {
                            const aIn = allowedBooks.includes(a.rec.book) ? 1 : 0;
                            const bIn = allowedBooks.includes(b.rec.book) ? 1 : 0;
                            if (bIn !== aIn) return bIn - aIn;
                            // 其次偏好較短的經文（更適合結語顯示）
                            const al = (a.rec.verse || '').length;
                            const bl = (b.rec.verse || '').length;
                            return al - bl;
                        });
                    }
                    cCommon = preferAllowed(cCommon);
                    cRare = preferAllowed(cRare);

                    // 依主題偏好重新過濾排序
                    // 主題評分（多維度加總）
                    // Compute a weighted theme score
                    function themeScore(themes) {
                        // 高權重給首選主題（index 越小越優先）
                        let score = 0;
                        for (const t of themes) {
                            const idx = preferredThemes.indexOf(t);
                            if (idx >= 0) score += (10 - idx * 3);
                        }
                        return score;
                    }

                    // 根據得分與隨機性挑一條
                    // Pick one entry with score and randomness
                    function pickFrom(arr) {
                        if (!arr.length) return null;
                        // 去除近期重複
                        const nonRepeat = arr.filter(x => !recentHistory.includes(`${x.rec.book} ${x.rec.chapter}`));
                        const base = nonRepeat.length ? nonRepeat : arr;
                        // 按主題分數降序、長度升序
                        const sorted = [...base].sort((a,b) => {
                            const ts = themeScore(b.themes) - themeScore(a.themes);
                            if (ts !== 0) return ts;
                            const al = (a.rec.verse || '').length;
                            const bl = (b.rec.verse || '').length;
                            return al - bl;
                        });
                        return sorted[0];
                    }

                    const picked = pickFrom(cCommon) || pickFrom(cRare);
                    if (!picked) return null;

                    const v = picked.rec;
                    return { text: v.verse, ref: `${v.book} ${v.chapter}` };
                } catch (e) { return null; }
            }

            // 7) 後備路徑：精選池（依等級），同樣先避近期重複、偏好本局書卷
            // 使用內建精選池（依正確率分類）
            // Select from curated verse pools by accuracy
            function pickFromCurated() {
                const raw = pools[tier] || [];
                if (!raw.length) return null;
                const preferred = raw.filter(v => {
                    const p = parseRef(v.ref);
                    const inBook = !p || !p.book ? true : allowedBooks.includes(p.book);
                    const notRecent = !recentHistory.includes(v.ref);
                    return inBook && notRecent;
                });
                const nonRecent = preferred.length ? preferred : raw.filter(v => !recentHistory.includes(v.ref));
                const poolToUse = nonRecent.length ? nonRecent : raw;
                return poolToUse[Math.floor(Math.random() * poolToUse.length)];
            }

            let selected = pickPositiveFromDB() || pickFromCurated();
            if (!selected) {
                // safety fallback：任取 supportive 原始精選
                const raw = pools[tier] || pools.supportive;
                selected = raw[Math.floor(Math.random() * raw.length)];
            }

            const verse = selected.text;
            const reference = selected.ref;
            applyClosingVerse(verse, reference, true);
            try { pushHistory(reference); } catch (e) {}
        }

    // 確認玩家名稱並嘗試寫入排行榜；同時顯示結算與按鈕
    // Confirm player name and attempt to save to leaderboard
    window.confirmPlayerName = function confirmPlayerName() {
            const nameInput = document.getElementById('playerNameInput');
            const nameError = document.getElementById('nameError');
            const playerName = nameInput.value.trim();
            const leaderboardMessage = document.getElementById('leaderboardMessage');
            
            // 如果 modal 是檢視模式（從首頁點開），不應該允許更改名稱或再次儲存
            const modal = document.getElementById('playerNameModal');
        if (modal && modal.dataset.viewingRecord === 'true') {
                // 檢視模式：不儲存；僅關閉頂層 modal，保留下層（例如：全排行榜）
                const fromFull = modal.dataset.fromFullLeaderboard === '1';
                // 清除檢視旗標
                modal.dataset.viewingRecord = '';
                modal.dataset.viewingMode = '';
                modal.dataset.fromFullLeaderboard = '';
                // 關閉視窗並還原 name input 顯示（使用統一 modal manager 以維持堆疊狀態）
                try { detachPlayerNameModalEnterHotkey(); } catch (e) {}
                try {
                    if (window.closeModal) window.closeModal('playerNameModal');
                    else modal.classList.add('hidden');
                } catch(_) { try { modal.classList.add('hidden'); } catch(_) {} }
                const nameInputSectionElView = document.getElementById('nameInputSection');
                if (nameInputSectionElView) nameInputSectionElView.classList.remove('hidden');
                // 不導回主選單，也不手動還原/重開 full leaderboard；堆疊會保留其可見性
                return;
            } else {
                // 如果進入排行榜，需要驗證玩家名稱並儲存
                if (!leaderboardMessage.classList.contains('hidden')) {
                    if (!validatePlayerName(playerName)) {
                        return;
                    }
                    // 保存到排行榜：若為同題重玩，是否儲存取決於 SUPABASE_CONFIG.allowReplaySaves（預設不儲存）
                    const allowReplaySaves = !!(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.allowReplaySaves);
                    try { if (typeof setSavedPlayerName === 'function') setSavedPlayerName(playerName||''); else localStorage.setItem('bibleGamePlayerName', playerName||''); } catch(_) {}
                    const isReplayRun = !!gameState.skipLeaderboardOnComplete;
                    const skipSave = isReplayRun && !allowReplaySaves; // 同題重玩且未開啟儲存 -> 跳過
                    // 若是同題重玩且允許儲存，將模式覆蓋為 'replay' 以利後續辨識
                    const modeOverride = (isReplayRun && allowReplaySaves) ? 'replay' : undefined;
                    savePlayerToLeaderboard(playerName, { skipSave, modeOverride });
                    // 使用完後重置旗標（重玩流程專用）
                    gameState.skipLeaderboardOnComplete = false;
                }
            }
            
            // 關閉視窗並還原 name input 顯示
            // 非檢視模式走到這裡（正常儲存/關閉）
            const modalEl = document.getElementById('playerNameModal');
            if (modalEl) {
                try { detachPlayerNameModalEnterHotkey(); } catch (e) {}
                // 使用統一 modal manager 關閉，確保堆疊一致
                try { if (window.closeModal) window.closeModal('playerNameModal'); else modalEl.classList.add('hidden'); } catch(_) { modalEl.classList.add('hidden'); }
                // 清除可能的檢視旗標與記錄的難度
                modalEl.dataset.viewingRecord = '';
                modalEl.dataset.viewingMode = '';
            }
            const nameInputSectionEl = document.getElementById('nameInputSection');
            if (nameInputSectionEl) nameInputSectionEl.classList.remove('hidden');
            
            // 返回主畫面並更新排行榜顯示（僅支援 classic/survival，equip 不列入）; 略過主選單 intro 動畫
            window.__skipStartMenuIntroOnce = true;
            showStartScreen();
            try {
                const mode = (gameState && gameState.playMode === 'survival') ? 'survival' : 'classic';
                setActiveLeaderboardTabByMode(mode);
                updateLeaderboardDisplay(mode);
            } catch(_) { updateLeaderboardDisplay('classic'); }
        }

    // 驗證玩家名稱（空白/長度/字元）
    // Validate player name inputs
    function validatePlayerName(name) {
            const nameError = document.getElementById('nameError');
            
            // 允許留空（將顯示為匿名）
            if (!name) {
                nameError.classList.add('hidden');
                return true;
            }
            
            // 檢查長度
            if (name.length < 2) {
                nameError.textContent = '名稱至少需要2個字';
                nameError.classList.remove('hidden');
                return false;
            }
            
            if (name.length > 10) {
                nameError.textContent = '名稱不能超過10個字';
                nameError.classList.remove('hidden');
                return false;
            }
            
            // 檢查是否只包含中英文
            const validPattern = /^[a-zA-Z\u4e00-\u9fa5]+$/;
            if (!validPattern.test(name)) {
                nameError.textContent = '只能輸入中文或英文';
                nameError.classList.remove('hidden');
                return false;
            }
            
            // 簡單的不雅文字檢查
            const inappropriateWords = ['笨蛋', '白痴', '傻瓜', 'stupid', 'idiot', 'fool'];
            const lowerName = name.toLowerCase();
            for (let word of inappropriateWords) {
                if (lowerName.includes(word)) {
                    nameError.textContent = '請使用適當的名稱';
                    nameError.classList.remove('hidden');
                    return false;
                }
            }
            
            nameError.classList.add('hidden');
            return true;
        }

        // savePlayerToLeaderboard(playerName, options)
    // options = { skipSave?: boolean, modeOverride?: 'ranking'|'practice'|'replay' }
    // 將紀錄寫入排行榜（線上或本機 fallback）
    // Persist record to leaderboard (online or local fallback)
    function savePlayerToLeaderboard(playerName, options = {}) {
            // 只有完成遊戲才能進入排行榜
            if (!gameState.gameCompleted && !options.allowIncomplete) {
                return;
            }
            console.log('[LEADERBOARD] savePlayerToLeaderboard called', { playerName, options, gameCompleted: gameState.gameCompleted, skipLeaderboardOnComplete: gameState.skipLeaderboardOnComplete });
            
            // If online adapter exists, delegate the persistence; otherwise use localStorage
            let allLeaderboards = null;
            if (!(window.Leaderboard && typeof window.Leaderboard.save === 'function')) {
                try {
                    const key = (window.__BC_CONSTS && window.__BC_CONSTS.STORAGE_KEY_LEADERBOARD) || 'bibleGameLeaderboard';
                    allLeaderboards = (window.__bcStorage && window.__bcStorage.get(key, {})) || JSON.parse(localStorage.getItem(key) || '{}');
                } catch(_) { allLeaderboards = {}; }
                if (!allLeaderboards.classic) allLeaderboards.classic = [];
                if (!allLeaderboards.survival) allLeaderboards.survival = [];
            }
            
            // 計算遊戲耗時
            const gameTime = gameState.gameStartTime ? Math.floor((Date.now() - gameState.gameStartTime) / 1000) : 0;
            const minutes = Math.floor(gameTime / 60);
            const seconds = gameTime % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // 處理玩家名稱，留空則顯示為匿名
            const finalPlayerName = playerName.trim() || '匿名';

            // Anti-spam / anti-duplicate guard (client-side, best effort)
            try {
                const nowMs = Date.now();
                const modeKey = gameState.playMode || 'classic';
                const dedupeKey = `${finalPlayerName}|${modeKey}|${gameState.score}|${gameState.totalCorrectAnswers}|${gameState.totalQuestions}`;
                const last = window.__lastLeaderboardSubmit;
                if (last && last.key === dedupeKey && (nowMs - last.ts) < 8000) {
                    console.warn('[LEADERBOARD] duplicate submission throttled (client)', { dedupeKey, deltaMs: nowMs - last.ts });
                    return;
                }
                window.__lastLeaderboardSubmit = { key: dedupeKey, ts: nowMs };
            } catch(_) {}
            
            // 創建遊戲記錄（包含快照）
            const gameRecord = {
                id: Date.now(),
                playerName: finalPlayerName,
                score: gameState.score,
                difficulty: gameState.difficulty,
                date: new Date().toLocaleDateString('zh-TW'),
                // prefer single duration field for UI
                elapsed: timeString,
                completed: gameState.gameCompleted,
                correctAnswers: gameState.totalCorrectAnswers,
                totalQuestions: gameState.totalQuestions,
                totalMistakes: gameState.totalMistakes,
                levelResults: { ...gameState.levelResults },
                range: gameState.range,
                rarity: gameState.rarity || null,
                // 若提供覆蓋，優先使用；否則依是否為排名模式（有設定罕見度）判定（仍保留舊欄位以利回溯）
                mode: (options && options.modeOverride) ? options.modeOverride : (gameState.rarity ? 'ranking' : 'practice'),
                playMode: gameState.playMode || 'classic',
                testament: gameState.testament,
                customBooks: [...gameState.customBooks],
                // persist hint/time related transient fields so record view can exactly reproduce breakdown
                hintsRemaining: gameState.hintsRemaining != null ? gameState.hintsRemaining : null,
                // totalHints is derived from difficulty; store it for exact replay
                totalHints: (function(){ const hintCounts = { easy: 3, normal: 3, hard: 3 }; return hintCounts[gameState.difficulty] || null; })(),
                // store whether time reward was shown and explicit numeric timeReward if available
                showTimeReward: gameState.showTimeReward === true,
                timeReward: (typeof gameState.timeReward === 'number') ? gameState.timeReward : null,
                // small helper: store usedHints count to help diagnostics
                usedHintsCount: (gameState.usedHints ? gameState.usedHints.size : 0),
                // persist chosen closing verse so record view uses the same verse as game end
                closingVerse: gameState.closingVerse || null,
                closingVerseRef: gameState.closingVerseRef || null,
                // persist unlocked achievements for this run (ids + minimal metadata)
                achievements: (function(){
                    try {
                        const list = Array.isArray(gameState.unlockedAchievements) ? gameState.unlockedAchievements : [];
                        return list.map(a=>({ id: a.id, name: a.name, tier: a.tier, mode: a.mode, displayTier: a.displayTier }));
                    } catch(_) { return []; }
                })(),
                // store createdAt for stable sorting across reloads
                createdAt: Date.now(),
                // combo summary for leaderboard record views
                comboTotalBonus: (typeof gameState.comboTotalBonus === 'number') ? gameState.comboTotalBonus : 0,
                maxComboReached: (gameState.finalMetrics && typeof gameState.finalMetrics.maxComboReached==='number') ? gameState.finalMetrics.maxComboReached : (typeof gameState.maxCombo==='number' ? gameState.maxCombo : 0),
                // questionSnapshot v2/v3 builder:
                // v2 = single-level (backward compatibility)
                // v3 = multi-level sequence (levels[])
                questionSnapshot: (function(){
                    try {
                        // If we collected a full multi-level sequence, emit version 3
                        if (Array.isArray(gameState._sessionQuestions) && gameState._sessionQuestions.length > 0) {
                            const levels = gameState._sessionQuestions.map(l => ({
                                level: l.level,
                                difficulty: l.difficulty,
                                questionData: JSON.parse(JSON.stringify(l.questionData || [])),
                                chapterOrder: Array.isArray(l.chapterOrder) ? [...l.chapterOrder] : null
                            }));
                            const str = JSON.stringify(levels);
                            let h = 0; for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
                            return {
                                version: 3,
                                levels,
                                difficultyAtStart: levels[0] && levels[0].difficulty,
                                finalDifficulty: gameState.difficulty,
                                levelCount: levels.length,
                                totalQuestions: gameState.totalQuestions,
                                hash: h.toString(16)
                            };
                        }
                        // Else fall back to single-level snapshot (v2)
                        const qs = JSON.parse(JSON.stringify(gameState.questionData || []));
                        const order = Array.isArray(gameState._lastChapterShuffleOrder) ? [...gameState._lastChapterShuffleOrder] : null;
                        const snap = {
                            version: 2,
                            questionData: qs,
                            chapterOrder: order,
                            difficulty: gameState.difficulty,
                            totalQuestions: gameState.totalQuestions,
                            adaptive: { lastAdaptiveDifficulty: gameState._lastAdaptiveDifficulty || null }
                        };
                        try {
                            const str2 = JSON.stringify(qs);
                            let h2 = 0; for (let i = 0; i < str2.length; i++) { h2 = (h2 * 31 + str2.charCodeAt(i)) >>> 0; }
                            snap.hash = h2.toString(16);
                        } catch(_) {}
                        return snap;
                    } catch(e){
                        try { return JSON.parse(JSON.stringify(gameState.questionData || [])); } catch(_) { return null; }
                    }
                })()
            };
            // 回填平均速度與精簡 finalMetrics（與 saveScore 邏輯一致），利於排行榜與重看紀錄顯示
            try {
                    if (gameState.finalMetrics && typeof gameState.finalMetrics.avgAnswerMs === 'number') {
                    gameRecord.avgAnswerMs = gameState.finalMetrics.avgAnswerMs;
                    gameRecord.avgPerfectAnswerMs = gameState.finalMetrics.avgPerfectAnswerMs;
                        if (typeof gameState.finalMetrics.firstTryCorrectCount === 'number') {
                            gameRecord.perfectAnswerCount = gameState.finalMetrics.firstTryCorrectCount;
                    }
                    // 若先前尚未覆蓋最高連擊，沿用 finalizeMetrics 的峰值
                    if (typeof gameState.finalMetrics.maxComboReached === 'number') {
                        gameRecord.maxComboReached = (typeof gameRecord.maxComboReached === 'number')
                            ? gameRecord.maxComboReached
                            : gameState.finalMetrics.maxComboReached;
                    }
                    // 提供最小化 finalMetrics 以服務 record 檢視的 helper（避免過重）
                    gameRecord.finalMetrics = {
                        maxComboReached: gameState.finalMetrics.maxComboReached,
                        avgAnswerMs: gameState.finalMetrics.avgAnswerMs,
                        avgPerfectAnswerMs: gameState.finalMetrics.avgPerfectAnswerMs,
                        firstTryCorrectCount: gameState.finalMetrics.firstTryCorrectCount,
                        noHintCorrectCount: gameState.finalMetrics.noHintCorrectCount
                    };
                }
            } catch(_) {}
            // attach local anti-cheat signature (non-authoritative)
            try { const sig = __makeSignature(gameRecord); gameRecord.sig_ts = sig.ts; gameRecord.sig_hash = sig.hash; } catch(_) {}
            
            // 若選擇跳過儲存（例如同樣題目再來一局），則不寫入排行榜
            if (options.skipSave) {
                console.log('[LEADERBOARD] options.skipSave true - not persisting record for replay run');
                return;
            }

            // Online or local save
        if (window.Leaderboard && typeof window.Leaderboard.save === 'function') {
                try {
                    const persistLocalFallback = () => {
                        try {
                            const key = (window.__BC_CONSTS && window.__BC_CONSTS.STORAGE_KEY_LEADERBOARD) || 'bibleGameLeaderboard';
                            let fallback = (window.__bcStorage && window.__bcStorage.get(key, {})) || {};
                            if (!fallback.classic) fallback.classic = [];
                            if (!fallback.survival) fallback.survival = [];
                            const bucket = gameState.playMode || 'classic';
                            try {
                                fallback[bucket].push(gameRecord);
                                if (window.__normalizeLeaderboard) {
                                    fallback = window.__normalizeLeaderboard(fallback);
                                } else {
                                    const lim = (window.__BC_CONSTS && window.__BC_CONSTS.LEADERBOARD_LIMIT) || 20;
                                    Object.keys(fallback).forEach(k=>{ if(Array.isArray(fallback[k])){ fallback[k].sort((a,b)=>(b.score||0)-(a.score||0)); fallback[k] = fallback[k].slice(0,lim); }});
                                }
                                try { if (window.__bcStorage) window.__bcStorage.set(key, fallback); else localStorage.setItem(key, JSON.stringify(fallback)); } catch(_) {}
                            } catch(_) {}
                            updateLeaderboardDisplay(bucket);
                        } catch(_) {}
                    };

                    const timeoutMs = (window.__BC_CONSTS && window.__BC_CONSTS.LEADERBOARD_ONLINE_TIMEOUT_MS) || 7000;
                    const saveTask = window.Leaderboard.save(gameRecord);
                    const guardedSave = Promise.race([
                        saveTask,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('leaderboard-save-timeout')), timeoutMs))
                    ]);

                    guardedSave
                        .then(() => updateLeaderboardDisplay(gameState.playMode || 'classic'))
                        .catch(err => {
                            console.warn('Online leaderboard save failed/timed out; falling back to local', err);
                            try { window.PendingScoreSync && window.PendingScoreSync.enqueue && window.PendingScoreSync.enqueue(gameRecord); } catch(_) {}
                            persistLocalFallback();
                        });
                } catch (e) {
                    console.warn('Online leaderboard save threw; fallback to local', e);
                    try { window.PendingScoreSync && window.PendingScoreSync.enqueue && window.PendingScoreSync.enqueue(gameRecord); } catch(_) {}
                }
                return;
            }

            // Local save path
        const bucket = gameState.playMode || 'classic';
        try {
            allLeaderboards[bucket].push(gameRecord);
            if (window.__normalizeLeaderboard) {
                allLeaderboards = window.__normalizeLeaderboard(allLeaderboards);
            } else {
                const lim=(window.__BC_CONSTS&&window.__BC_CONSTS.LEADERBOARD_LIMIT)||20;
                Object.keys(allLeaderboards).forEach(k=>{ if(Array.isArray(allLeaderboards[k])){ allLeaderboards[k].sort((a,b)=>(b.score||0)-(a.score||0)); allLeaderboards[k] = allLeaderboards[k].slice(0,lim); }});
            }
            try { const key=(window.__BC_CONSTS&&window.__BC_CONSTS.STORAGE_KEY_LEADERBOARD)||'bibleGameLeaderboard'; if(window.__bcStorage) window.__bcStorage.set(key, allLeaderboards); else localStorage.setItem(key, JSON.stringify(allLeaderboards)); } catch(_) {}
        } catch(_) {}
        }



    // 中央分數的數字跳動動畫（支援中斷/重新開始）
    // Animate center score counting from A to B
    function animateScoreWithCounting(fromScore, toScore) {
            const scoreElement = document.getElementById('centerScore');
            const difference = toScore - fromScore;
            
            if (difference === 0) return;
            // 先取消先前尚未結束的計數動畫，避免重疊
            try {
                if (scoreElement && scoreElement.__countingRafId) {
                    cancelAnimationFrame(scoreElement.__countingRafId);
                    scoreElement.__countingRafId = null;
                }
            } catch (e) {}

            // 若使用者偏好減少動態，直接跳到目標值並做極短促的視覺提示
            if (getReducedMotion()) {
                scoreElement.textContent = toScore;
                scoreElement.classList.add('counting-animation');
                setTimeout(() => scoreElement.classList.remove('counting-animation'), 40);
                return;
            }

            const totalDurationMs = 900;
            let rafId = 0;
            let lastRendered = Number.NaN;
            let lastPulseTs = 0;
            const startTs = performance.now();

            const tick = (now) => {
                const elapsed = Math.max(0, now - startTs);
                const progress = Math.min(1, elapsed / totalDurationMs);
                const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
                const nextValue = Math.round(fromScore + difference * eased);

                if (nextValue !== lastRendered) {
                    scoreElement.textContent = nextValue;
                    lastRendered = nextValue;
                }

                if (now - lastPulseTs >= 70) {
                    scoreElement.classList.add('counting-animation');
                    setTimeout(() => scoreElement.classList.remove('counting-animation'), 40);
                    lastPulseTs = now;
                }

                if (progress < 1) {
                    rafId = requestAnimationFrame(tick);
                    try { scoreElement.__countingRafId = rafId; } catch (_) {}
                    return;
                }

                scoreElement.textContent = toScore;
                scoreElement.classList.add('counting-animation');
                setTimeout(() => scoreElement.classList.remove('counting-animation'), 60);
                try { scoreElement.__countingRafId = null; } catch (_) {}
            };

            rafId = requestAnimationFrame(tick);
            try { scoreElement.__countingRafId = rafId; } catch (_) {}
        }

        // spawn lightweight particles near the center score; intensity scales with magnitude
    // 分數微粒特效：依分數幅度與選項決定數量、顏色、距離（尊重減少動態偏好）
    // Score particles: spawn lightweight glyphs near a center or origin; honors reduced motion.
    // 分數粒子特效：由某個元素或視窗中心綻放
    // Spawn particle effects near origin or viewport center
    // spawnScoreParticles 已移至 score.js, 請使用 window.spawnScoreParticles


        // Unique start button effect: concentric aurora rings + themed particles
    // 開始按鈕特效：同心環光暈 + 粉紫粒子；在減少動態時改為短暫高光
    // Start button burst: aurora rings + violet/pink particles; reduced-motion -> brief glow only.
    // 開始按鈕點擊時的微小特效
    // Subtle burst when Start is clicked
function triggerStartButtonBurst(originRect, modeTone = 'default') {
            try {
                const reduced = getReducedMotion && getReducedMotion();
                const rect = originRect || (function(){ const el = document.getElementById('startGameBtn'); try { return el.getBoundingClientRect(); } catch(e){ return null; } })();
                const isValidRect = rect && (rect.width > 0 || rect.height > 0 || rect.left !== 0 || rect.top !== 0);
                const cx = isValidRect ? Math.round(rect.left + rect.width / 2) : Math.round(window.innerWidth / 2);
                const cy = isValidRect ? Math.round(rect.top + rect.height / 2) : Math.round(window.innerHeight / 2);

                let ringColors = ['#A78BFA', '#C084FC', '#EC4899', '#F472B6']; // default violet/pink family
                let particleColors = ['#FFFFFF','#F5D0FE','#E879F9','#C084FC','#A78BFA','#F472B6','#EC4899'];
                let glowColorInner = 'rgba(168,85,247,0.5)';
                let glowColorOuter = 'rgba(236,72,153,0.6)';
                let glowBorderColor = 'rgba(236,72,153,0.9)';

                switch (modeTone) {
                    case 'classic': // Pink/Rose
                        ringColors = ['#fb7185', '#f43f5e', '#e11d48', '#fda4af'];
                        particleColors = ['#ffffff', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48'];
                        glowColorInner = 'rgba(244,63,94,0.5)';
                        glowColorOuter = 'rgba(225,29,72,0.6)';
                        glowBorderColor = 'rgba(225,29,72,0.9)';
                        break;
                    case 'survival': // Emerald/Teal
                        ringColors = ['#34d399', '#10b981', '#059669', '#6ee7b7'];
                        particleColors = ['#ffffff', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669'];
                        glowColorInner = 'rgba(16,185,129,0.5)';
                        glowColorOuter = 'rgba(5,150,105,0.6)';
                        glowBorderColor = 'rgba(5,150,105,0.9)';
                        break;
                    case 'equip': // Indigo/Violet
                        ringColors = ['#818cf8', '#6366f1', '#4f46e5', '#a5b4fc'];
                        particleColors = ['#ffffff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5'];
                        glowColorInner = 'rgba(99,102,241,0.5)';
                        glowColorOuter = 'rgba(79,70,229,0.6)';
                        glowBorderColor = 'rgba(79,70,229,0.9)';
                        break;
                    case 'custom': // Sky/Cyan
                        ringColors = ['#38bdf8', '#0ea5e9', '#0284c7', '#7dd3fc'];
                        particleColors = ['#ffffff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7'];
                        glowColorInner = 'rgba(14,165,233,0.5)';
                        glowColorOuter = 'rgba(2,132,199,0.6)';
                        glowBorderColor = 'rgba(2,132,199,0.9)';
                        break;
                }

                // Reduced motion: brief accessible glow on the button only
                if (reduced) {
                    const btn = document.getElementById('startGameBtn');
                    if (btn) {
                        const prev = { boxShadow: btn.style.boxShadow, border: btn.style.border };
                        btn.style.boxShadow = `0 0 0 4px ${glowColorInner}, 0 0 16px ${glowColorOuter}`;
                        btn.style.border = `3px solid ${glowBorderColor}`;
                        setTimeout(() => { try { btn.style.boxShadow = prev.boxShadow || ''; btn.style.border = prev.border || ''; } catch(_) {} }, 260);
                    }
                    return;
                }

                const ringCount = 3;
                const baseSize = 24; // px
                const stagger = 70;   // ms

                for (let i = 0; i < ringCount; i++) {
                    const ring = document.createElement('div');
                    const size = baseSize + i * 8;
                    ring.style.position = 'fixed';
                    ring.style.left = (cx - size / 2) + 'px';
                    ring.style.top = (cy - size / 2) + 'px';
                    ring.style.width = size + 'px';
                    ring.style.height = size + 'px';
                    ring.style.borderRadius = '50%';
                    const col = ringColors[i % ringColors.length];
                    ring.style.border = '3px solid ' + col;
                    ring.style.boxShadow = `0 0 24px ${col}80, inset 0 0 12px ${col}40`;
                    ring.style.opacity = '0.95';
                    ring.style.transform = 'scale(0.25)';
                    ring.style.transition = 'transform 720ms cubic-bezier(.2,.9,.2,1), opacity 720ms linear';
                    ring.style.zIndex = '60'; // render above countdown overlay (which is z-50)
                    document.body.appendChild(ring);
                    // animate out
                    setTimeout(() => {
                        try { ring.style.transform = 'scale(2.8)'; ring.style.opacity = '0'; } catch(_) {}
                    }, 16 + i * stagger);
                    setTimeout(() => { try { if (ring.parentElement) ring.parentElement.removeChild(ring); } catch(_) {} }, 820 + i * stagger);
                }

                // matching particle flare using computed mode colors, above overlay
                try { spawnScoreParticles(120, rect, { colors: particleColors, zIndex: 60 }); } catch(_) {}
            } catch (_) { /* ignore visual errors */ }
        }

        // 裝備課程：正確答案專屬藍色擴散環特效（與開始按鈕風格一致，但改用藍色系）
        // Equip mode correct answer burst: concentric blue rings + light blue particles
        function triggerEquipCorrectBurst(originRect) {
            try {
                const reduced = getReducedMotion && getReducedMotion();
                const rect = originRect;
                if (!rect || (rect.width === 0 && rect.height === 0 && rect.left === 0 && rect.top === 0)) return;
                const cx = Math.round(rect.left + rect.width / 2);
                const cy = Math.round(rect.top + rect.height / 2);
                if (reduced) {
                    // Reduced motion: subtle glow highlight only
                    const glow = document.createElement('div');
                    glow.style.position = 'fixed';
                    glow.style.left = (cx - 28) + 'px';
                    glow.style.top = (cy - 28) + 'px';
                    glow.style.width = '56px';
                    glow.style.height = '56px';
                    glow.style.borderRadius = '50%';
                    glow.style.background = 'radial-gradient(circle at center, rgba(191,219,254,0.9), rgba(147,197,253,0.45) 55%, rgba(147,197,253,0) 75%)';
                    glow.style.pointerEvents = 'none';
                    glow.style.zIndex = '38';
                    glow.style.opacity = '0';
                    glow.style.transition = 'opacity 240ms ease';
                    document.body.appendChild(glow);
                    requestAnimationFrame(()=>{ try { glow.style.opacity = '1'; } catch(_) {} });
                    setTimeout(()=>{ try { glow.style.opacity = '0'; } catch(_) {} }, 240);
                    setTimeout(()=>{ try { glow.remove(); } catch(_) {} }, 520);
                    return;
                }
                const ringColors = ['#DBEAFE','#BFDBFE','#93C5FD','#60A5FA','#3B82F6'];
                const ringCount = 3;
                const baseSize = 20;
                const stagger = 60;
                for (let i = 0; i < ringCount; i++) {
                    const ring = document.createElement('div');
                    const size = baseSize + i * 10;
                    ring.style.position = 'fixed';
                    ring.style.left = (cx - size / 2) + 'px';
                    ring.style.top = (cy - size / 2) + 'px';
                    ring.style.width = size + 'px';
                    ring.style.height = size + 'px';
                    ring.style.borderRadius = '50%';
                    const col = ringColors[i % ringColors.length];
                    ring.style.border = '3px solid ' + col;
                    ring.style.boxShadow = `0 0 20px ${col}90, inset 0 0 10px ${col}40`;
                    ring.style.opacity = '0.95';
                    ring.style.transform = 'scale(0.3)';
                    ring.style.transition = 'transform 680ms cubic-bezier(.25,.85,.25,1), opacity 680ms linear';
                    ring.style.zIndex = '38';
                    document.body.appendChild(ring);
                    setTimeout(()=>{ try { ring.style.transform = 'scale(3)'; ring.style.opacity = '0'; } catch(_) {} }, 18 + i * stagger);
                    setTimeout(()=>{ try { ring.remove(); } catch(_) {} }, 760 + i * stagger);
                }
                // Blue particle flare (slightly fewer than start button)
                try { spawnScoreParticles(70, rect, { colors:['#FFFFFF','#DBEAFE','#BFDBFE','#93C5FD','#60A5FA','#3B82F6'], count:12, distanceMin:36, distanceMax:110, durationMs:1350, zIndex:38 }); } catch(_) {}
            } catch(_) { /* ignore */ }
        }

        // Animate a numeric span inline from a start to end value with optional sign prefix
    // 行內數字跳動動畫：將文字中的數值從起點平滑數到終點，支援 +/- 前綴
    // Animate a numeric span inline from start to end with easing and optional sign prefix.
    // 行內小數字計數器（用於明細動畫、加分浮標）
    // Inline number animator for breakdown and popups
    function animateInlineNumber(spanEl, fromVal, toVal, durationMs, signPrefix = '') {
            try {
                if (!spanEl) return () => {};
                // Cancel any previous inline-number animation on this element
                try { if (spanEl.__ainCancel && typeof spanEl.__ainCancel === 'function') spanEl.__ainCancel(); } catch(_) {}
                if (getReducedMotion && getReducedMotion()) {
                    spanEl.textContent = `${signPrefix}${toVal}`;
                    try { spanEl.__ainCancel = null; } catch(_) {}
                    return () => {};
                }
                const start = performance.now();
                let rafId = 0;
                let stopped = false;
                const run = (now) => {
            const t = Math.max(0, Math.min(1, (now - start) / Math.max(1, durationMs)));
                    const eased = 1 - Math.pow(1 - t, 3);
                    const cur = Math.round(fromVal + (toVal - fromVal) * eased);
                    if (!stopped) spanEl.textContent = `${signPrefix}${cur}`;
                    if (!stopped && t < 1) {
                        rafId = requestAnimationFrame(run);
                    } else {
                        try { spanEl.__ainCancel = null; } catch(_) {}
                    }
                };
                rafId = requestAnimationFrame(run);
                const cancel = () => { try { stopped = true; if (rafId) cancelAnimationFrame(rafId); } catch(_) {} try { spanEl.__ainCancel = null; } catch(_) {} };
                try { spanEl.__ainCancel = cancel; } catch(_) {}
                return cancel;
            } catch (_) {
                return () => {};
            }
        }

        // Wrap numeric portion of floating text and apply inline counting
    // 將浮動分數文字中的數值切出並套用行內跳動（行動裝置可強制啟用以提升感受）
    // Apply inline counting to the numeric part of a floating score text; can force on mobile.
    // 對加分浮標套用行內數字動畫（避免重算中心分數）
    // Apply inline counting to floating score popups
    function applyInlineCountToFloating(containerEl, displayText) {
            try {
                if (!containerEl || typeof displayText !== 'string') return;
                const m = displayText.match(/^(.*?)([+\-]?\d+)(.*)$/);
                if (!m) return;
                const before = m[1] || '';
                const numStr = m[2] || '';
                const after = m[3] || '';
        const sign = numStr.startsWith('-') ? '-' : (numStr.startsWith('+') ? '+' : '');
        const target = Math.abs(parseInt(numStr.replace(/[+\-]/g, ''), 10) || 0);

                containerEl.innerHTML = '';
                if (before) containerEl.appendChild(document.createTextNode(before));
                const numSpan = document.createElement('span');
                numSpan.className = 'inline-count-num';
                numSpan.style.display = 'inline-block';
                numSpan.textContent = `${sign}0`;
                containerEl.appendChild(numSpan);
                if (after) containerEl.appendChild(document.createTextNode(after));

                // negative should count downwards visually: -0 -> -target
                const fromVal = 0;
                const toVal = target;
                // Allow a forced inline counting (used by mobile special popups)
                const force = containerEl && containerEl.dataset && containerEl.dataset.forceInlineCount === 'true';
                if (force && typeof window.getReducedMotion === 'function') {
                    const original = window.getReducedMotion;
                    try { window.getReducedMotion = () => false; } catch(_) {}
                    const cancel = animateInlineNumber(numSpan, fromVal, toVal, 720, sign);
                    containerEl.__cancelInline = () => { try { cancel(); } catch(_) {}; try { window.getReducedMotion = original; } catch(_) {} };
                } else {
                    const cancel = animateInlineNumber(numSpan, fromVal, toVal, 720, sign); // 加倍
                    containerEl.__cancelInline = cancel;
                }
            } catch (_) { /* ignore */ }
        }

        // pulse the large center score element; scale intensity based on delta
    // 中央金色分數脈衝：依分數幅度改變放大倍率與陰影，短暫顯示後還原
    // Pulse the big center score; scale intensity by delta and then reset.
    // 讓中央分數微微脈衝發光（不改變分數）
    // Pulse-glow the center score element
    // pulseCenterScore, spawnConfettiRain, spawnGoldGlitter 已移至 score.js


        // Continuous star rain controller (desktop only)
    // 桌面專用：持續星星雨控制器（避免在行動裝置過度渲染）
    // Desktop-only continuous star rain controller; throttles by active nodes.
    // 在背景啟動「星星雨」裝飾效果
    // Start decorative star rain in the background
    function startStarRain() {
            try {
                if (typeof window.startStarRain === 'function') {
                    return window.startStarRain();
                }
            } catch (_) { /* ignore */ }
        }

    // 停止星星雨：可選擇立即清除現有的金色流光元素
    // Stop star rain; optionally clear existing glitter nodes.
    // 停止星星雨並清理節點
    // Stop star rain and clean up nodes
    function stopStarRain(forceClear = true) {
            try {
                if (typeof window.stopStarRain === 'function') {
                    return window.stopStarRain(forceClear);
                }
            } catch (_) { /* ignore */ }
        }

    // 單幀排程進度 UI 更新，避免同幀重複渲染
    // Coalesce progress UI updates into a single animation frame
    const __progressUIFrame = { rafId: 0, level: false, question: false, adaptive: false };
    function scheduleProgressUIUpdate(options = {}) {
            try {
                const force = !!options.force;
                __progressUIFrame.level = __progressUIFrame.level || !!options.level;
                __progressUIFrame.question = __progressUIFrame.question || !!options.question;
                __progressUIFrame.adaptive = __progressUIFrame.adaptive || !!options.adaptive;

                if (force) {
                    if (__progressUIFrame.rafId) {
                        try { cancelAnimationFrame(__progressUIFrame.rafId); } catch(_) {}
                        __progressUIFrame.rafId = 0;
                    }
                } else if (__progressUIFrame.rafId) {
                    return;
                }

                const flush = () => {
                    const runLevel = __progressUIFrame.level;
                    const runQuestion = __progressUIFrame.question;
                    const runAdaptive = __progressUIFrame.adaptive;
                    __progressUIFrame.rafId = 0;
                    __progressUIFrame.level = false;
                    __progressUIFrame.question = false;
                    __progressUIFrame.adaptive = false;
                    if (runLevel) { try { updateLevelOvals(); } catch (_) {} }
                    if (runQuestion) { try { updateQuestionOvals(); } catch (_) {} }
                    if (runAdaptive) { try { updateAdaptiveStatus(); } catch (_) {} }
                };

                if (force) {
                    flush();
                } else {
                    __progressUIFrame.rafId = requestAnimationFrame(flush);
                }
            } catch(_) {
                try {
                    if (options.level) updateLevelOvals();
                    if (options.question) updateQuestionOvals();
                    if (options.adaptive) updateAdaptiveStatus();
                } catch(__) {}
            }
        }
        try { window.scheduleProgressUIUpdate = scheduleProgressUIUpdate; } catch(_) {}


    // 依目前狀態更新主要 UI（標題、提示、按鈕等）
    // Update main game UI from current state
    function updateGameUI() {
            // 將高頻進度更新收斂到同一幀
            try { scheduleProgressUIUpdate({ level: true, question: true, adaptive: true }); } catch (e) { /* ignore */ }

            // 生存模式：切換顯示計時卡 vs 關卡卡
            try {
                const levelCard = document.getElementById('levelProgressCard');
                const survivalCard = document.getElementById('survivalTimerCard');
                const miniTimer = document.getElementById('survivalTimerMini');
                if (isSurvival()) {
                    if (levelCard) levelCard.classList.add('hidden');
                    if (survivalCard) {
                        survivalCard.classList.remove('hidden');
                        updateSurvivalTimerDisplay();
                    }
                    if (miniTimer) miniTimer.classList.add('active');
                } else {
                    if (survivalCard) survivalCard.classList.add('hidden');
                    if (levelCard) levelCard.classList.remove('hidden');
                    if (miniTimer) miniTimer.classList.remove('active');
                }
            } catch(_) {}

            // 更新分數顯示（使用計數動畫）
            const scoreElement = document.getElementById('centerScore');
            const currentScore = parseInt(scoreElement.textContent) || 0;
            const newScore = gameState.score;
            
            if (newScore !== currentScore) {
                animateScoreWithCounting(currentScore, newScore);
                // 向輔助工具播報分數變化
                try { const live = document.getElementById('scoreAriaLive'); if (live) live.textContent = `分數 ${newScore} 分`; } catch(e){}
            } else {
                scoreElement.textContent = gameState.score;
            }
            
            // 更新提示按鈕狀態和圖案顯示
            updateHintButton();
        }

    // 更新關卡進度橢圓（包含失敗紅色狀態）
    // Update level progress ovals including failed state
    function updateLevelOvals() {
            const container = document.getElementById('levelOvals');
            const levelCount = getLevelCount();
            const survival = isSurvival();
            const cache = updateLevelOvals.__cache || (updateLevelOvals.__cache = { sig: '', miniSig: '' });
            // Survival: hide level progress (no fixed cap)
            if (!levelCount || survival) {
                try {
                    const card = document.getElementById('levelProgressCard');
                    if (card) card.style.display = 'none';
                } catch(_) {}
            } else {
                try {
                    const card = document.getElementById('levelProgressCard');
                    if (card) card.style.display = '';
                } catch(_) {}
            }

            let levelSig = `c:${levelCount || 0}|s:${survival ? 1 : 0}|cur:${gameState.currentLevel || 0}`;
            for (let i = 1; i <= (levelCount || 0); i++) {
                levelSig += `|${i}:${(gameState.levelResults && gameState.levelResults[i]) || ''}`;
            }

            if (container) {
                if (!levelCount || survival) {
                    if (container.childElementCount) container.innerHTML = '';
                } else if (cache.sig !== levelSig) {
                    while (container.children.length < levelCount) {
                        const oval = document.createElement('div');
                        const label = document.createElement('span');
                        label.className = 'px-2';
                        oval.appendChild(label);
                        container.appendChild(oval);
                    }
                    while (container.children.length > levelCount) {
                        container.removeChild(container.lastElementChild);
                    }

                    for (let i = 1; i <= levelCount; i++) {
                        const oval = container.children[i - 1];
                        const label = oval.firstElementChild || oval;
                        const baseClass = 'h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200';
                        const levelResult = gameState.levelResults && gameState.levelResults[i];

                        if (i < gameState.currentLevel || (i === gameState.currentLevel && levelResult)) {
                            if (levelResult === 'perfect') {
                                oval.className = `${baseClass} bg-gradient-to-br from-white via-yellow-100 to-yellow-300 text-yellow-900 border-2 border-yellow-400 shadow-md`;
                                label.textContent = '完美';
                            } else if (levelResult === 'complete') {
                                oval.className = `${baseClass} bg-emerald-500 text-white border-2 border-yellow-400 shadow-sm`;
                                label.textContent = '全對';
                            } else if (levelResult === 'failed') {
                                oval.className = `${baseClass} bg-rose-500 text-white border-2 border-rose-700 shadow-sm`;
                                label.textContent = '失敗';
                            } else {
                                oval.className = `${baseClass} bg-green-400 text-green-900 border-2`;
                                label.textContent = '完成';
                            }
                        } else if (i === gameState.currentLevel) {
                            oval.className = `${baseClass} bg-purple-200 text-purple-800 animate-pulse`;
                            label.textContent = `🎮${i}`;
                        } else {
                            oval.className = `${baseClass} bg-gray-200 text-gray-500 border-2`;
                            label.textContent = `⏳${i}`;
                        }
                    }
                }
            }

            // 同步更新手機版迷你關卡進度（備援顯示）
            try {
                const mini = document.getElementById('levelProgressMini');
                if (mini) {
                    const count = levelCount || 0;
                    let miniSig = `c:${count}|s:${survival ? 1 : 0}|cur:${gameState.currentLevel || 0}`;
                    for (let i = 1; i <= count; i++) {
                        miniSig += `|${i}:${(gameState.levelResults && gameState.levelResults[i]) || ''}`;
                    }
                    if (!count || survival) {
                        mini.classList.add('hidden');
                        if (mini.childElementCount) mini.innerHTML = '';
                    } else {
                        mini.classList.remove('hidden');
                        setMiniProgressGridColumns(count);
                        if (cache.miniSig !== miniSig) {
                            while (mini.children.length < count) {
                                const d = document.createElement('div');
                                mini.appendChild(d);
                            }
                            while (mini.children.length > count) {
                                mini.removeChild(mini.lastElementChild);
                            }
                            for (let i = 1; i <= count; i++) {
                                const d = mini.children[i - 1];
                                let cls = 'mini-dot';
                                const levelResult = gameState.levelResults && gameState.levelResults[i];
                                if (i < gameState.currentLevel || (i === gameState.currentLevel && levelResult)) {
                                    if (levelResult === 'perfect') {
                                        cls += ' bg-gradient-to-br from-white via-yellow-100 to-yellow-300 border-yellow-400';
                                    } else if (levelResult === 'complete') {
                                        cls += ' bg-emerald-500 border-yellow-400';
                                    } else if (levelResult === 'failed') {
                                        cls += ' bg-rose-500 border-rose-700';
                                    } else {
                                        cls += ' bg-green-400 border-green-500';
                                    }
                                } else if (i === gameState.currentLevel) {
                                    cls += ' bg-purple-200 border-purple-300';
                                } else {
                                    cls += ' bg-gray-200 border-gray-300';
                                }
                                d.className = cls;
                            }
                            cache.miniSig = miniSig;
                        }
                    }
                }
            } catch (_) {}
            cache.sig = levelSig;
        }

    // 更新本關每題的進度橢圓（對/錯/未答）
    // Update question ovals for current level
    function updateQuestionOvals() {
            const container = document.getElementById('questionOvals');
            if (!container) return;
            const cache = updateQuestionOvals.__cache || (updateQuestionOvals.__cache = { sig: '' });

            let totalAnswered = 0;

            // 確保有題目數據才進行更新
            if (!gameState.questionData || gameState.questionData.length === 0) {
                if (container.childElementCount) container.innerHTML = '';
                document.getElementById('currentQuestion').textContent = '0/0';
                return;
            }

            const questionCount = gameState.questionData.length;
            const verseStates = new Array(questionCount).fill('pending');
            const maxAttempts = { easy: 3, normal: 2, hard: 1 };
            const originalAttempts = maxAttempts[gameState.difficulty] || 1;
            const cards = document.querySelectorAll('#gameVerses [data-index]');
            for (const card of cards) {
                const idx = Number(card.dataset && card.dataset.index);
                if (!Number.isFinite(idx) || idx < 0 || idx >= questionCount) continue;
                if (card.classList.contains('bg-green-100')) verseStates[idx] = 'correct';
                else if (card.classList.contains('bg-red-100')) verseStates[idx] = 'wrong';
                else if (card.classList.contains('bg-yellow-100') || card.classList.contains('bg-orange-100')) verseStates[idx] = 'partial';
            }

            let sig = `q:${questionCount}|d:${gameState.difficulty || ''}|l:${gameState.currentLevel || 0}`;
            const nextClasses = new Array(questionCount);
            const nextTexts = new Array(questionCount);

            for (let i = 0; i < questionCount; i++) {
                const state = verseStates[i];
                const currentAttempts = gameState.questionAttempts[i] || originalAttempts;
                let ovalClass = 'flex-1 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-200';
                let ovalText = '?';

                if (state === 'correct') {
                    // 答對了，檢查是否無失誤且未使用提示
                    if (currentAttempts === originalAttempts) {
                        const levelHintKey = `${gameState.currentLevel}|${i}`;
                        const hintUsedThisLevel = (gameState.usedHints && (gameState.usedHints.has(levelHintKey) || gameState.usedHints.has(i)));
                        if (!hintUsedThisLevel) {
                            ovalClass += ' bg-emerald-500 text-white border-2 border-yellow-400 shadow-sm';
                            ovalText = '✓';
                        } else {
                            // used hint this level: treat as answered-with-hint
                            ovalClass += ' bg-green-400 text-green-900 border-2';
                            ovalText = '✓';
                        }
                    } else {
                        // 有失誤 - 普通綠色
                        ovalClass += ' bg-green-400 text-green-900 border-2';
                        ovalText = '✓';
                    }
                    totalAnswered++;
                } else if (state === 'wrong') {
                    // 答錯
                    ovalClass += ' bg-red-400 text-red-900 border-2';
                    ovalText = '✗';
                    totalAnswered++;
                } else if (state === 'partial') {
                    // 已經嘗試過但還未完成 - 黃色
                    ovalClass += ' bg-yellow-400 text-yellow-900 border-2';
                    ovalText = '!';
                } else {
                    // 未開始
                    ovalClass += ' bg-gray-200 text-gray-500 border-2';
                }

                sig += `|${i}:${state}:${currentAttempts}:${ovalText}`;
                nextClasses[i] = ovalClass;
                nextTexts[i] = ovalText;
            }

            if (cache.sig === sig) {
                const cq = document.getElementById('currentQuestion');
                if (cq) cq.textContent = `${totalAnswered}/${questionCount}`;
                return;
            }

            while (container.children.length < questionCount) {
                container.appendChild(document.createElement('div'));
            }
            while (container.children.length > questionCount) {
                container.removeChild(container.lastElementChild);
            }
            for (let i = 0; i < questionCount; i++) {
                const oval = container.children[i];
                oval.className = nextClasses[i];
                oval.textContent = nextTexts[i];
            }

            // 更新數字顯示
            const cq = document.getElementById('currentQuestion');
            if (cq) cq.textContent = `${totalAnswered}/${questionCount}`;
            cache.sig = sig;
        }

    // 動態難度或裝備課程題目進度
        function updateAdaptiveStatus() {
            const el = document.getElementById('adaptiveStatusText');
            if (!el) return;
            const cache = updateAdaptiveStatus.__cache || (updateAdaptiveStatus.__cache = { html: '', diff: '', title: '', equip: false });
            const esc = (v) => {
                const s = v == null ? '' : String(v);
                return s
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            };
            const diff = String(gameState.difficulty || 'easy');
            const combo = Number(gameState.combo || 0);
            const diffLabel = diff === 'hard' ? '困難' : diff === 'normal' ? '普通' : '簡單';
            // 三軸：配對模式(連擊) / 題型階段(時間) / 罕見度(速度)
            // 配對模式：視 diff
            const pairText = diff === 'easy' ? '經文/書卷' : (diff === 'normal' ? '經文/章節' : '章節/經文');
            // 題型階段：時間切片
            let patternStageLabel = '';
            try {
                const tier = (typeof getPatternTimeTier === 'function') ? getPatternTimeTier() : 0;
                patternStageLabel = tier === 0 ? '初始' : tier === 1 ? '加深' : '高階';
            } catch(_) { patternStageLabel = '初始'; }
            // 新罕見度：直接以 adaptiveVerseRarity 顯示（常見/一般/冷門）
            let raritySpeedLabel = '';
            try {
                const map = { common:'常見', normal:'一般', rare:'冷門' };
                if (!gameState.adaptiveVerseRarity) gameState.adaptiveVerseRarity = 'common';
                raritySpeedLabel = map[gameState.adaptiveVerseRarity] || '常見';
            } catch(_) { raritySpeedLabel = '常見'; }

            let nextHtml = '';
            let nextTitle = '';
            let forceEquipCard = false;

            if (gameState.equipRunning) {
                // 裝備課程：顯示三階段逐步題目進度
                nextTitle = '題目進度';
                forceEquipCard = true;
                const entry = gameState.currentEquipEntry || {};
                const rawBook = esc(entry.book || '');
                const book = (Number(gameState.equipPhase || 0) === 1 && !gameState.equipBookRevealed) ? '???' : rawBook;
                const rawChapter = esc(entry.chapter || '');
                const chapter = (Number(gameState.equipPhase || 0) === 2 && !gameState.equipChapterRevealed) ? '???' : rawChapter;
                const verses = Array.isArray(entry.verses) ? entry.verses : [];
                const picked = Math.min(verses.length, Number(gameState.equipExpectedIndex || 0));
                const total = verses.length || 0;
                const phase = Number(gameState.equipPhase || 0);
                const phaseHint = phase === 1 ? '正在抽選本關書卷…' : phase === 2 ? '請選出正確章節' : phase === 3 ? '依序選出正確片段' : '裝備課程進行中…';
                const ratio = total > 0 ? Math.max(0, Math.min(100, Math.round((picked / total) * 100))) : 0;
                const assembledParts = picked > 0 ? verses.slice(0, picked).map(v => esc(v)) : [];
                const chipsHtml = assembledParts.length
                    ? assembledParts.map(p => `<span class="equip-frag-chip">${p}</span>`).join('')
                    : `<span class="equip-frag-empty">尚未開始排序</span>`;
                if (gameState.equipPhase === 1) {
                    nextHtml = `
                        <div class="equip-status-card">
                            <div class="equip-kv-grid">
                                <div class="equip-kv"><span>書卷</span><strong>${book}</strong></div>
                            </div>
                            <div class="equip-inline-note">${phaseHint}</div>
                        </div>`;
                } else if (gameState.equipPhase === 2) {
                    nextHtml = `
                        <div class="equip-status-card">
                            <div class="equip-kv-grid">
                                <div class="equip-kv"><span>書卷</span><strong>${book}</strong></div>
                                <div class="equip-kv"><span>章節</span><strong>${chapter}</strong></div>
                            </div>
                            <div class="equip-inline-note">${phaseHint}</div>
                        </div>`;
                } else if (gameState.equipPhase === 3) {
                    nextHtml = `
                        <div class="equip-status-card">
                            <div class="equip-kv-grid">
                                <div class="equip-kv"><span>書卷</span><strong>${book}</strong></div>
                                <div class="equip-kv"><span>章節</span><strong>${chapter}</strong></div>
                            </div>
                            <div class="equip-order-head"><span>排序進度</span><span>${picked}/${total}</span></div>
                            <div class="equip-order-track"><div class="equip-order-fill equip-order-fill-live" style="width:${ratio}%"></div></div>
                            <div class="equip-order-text">${chipsHtml}${picked<total && picked>0 ? `<span class="equip-frag-more">…尚有 ${Math.max(0, total - picked)} 段</span>` : ''}</div>
                        </div>`;
                } else {
                    nextHtml = `
                        <div class="equip-status-card">
                            <div class="equip-inline-note">${phaseHint}</div>
                        </div>`;
                }
            } else {
                // 闖關/練習/生存：動態難度現況（顯示三軸）
                nextTitle = '遊戲資訊';
                const replayPill = (gameState && (gameState._replaySequence || gameState.replaySourceRecord)) ? `<div class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-200 text-yellow-900 border border-yellow-300">🔁 同題重播 (難度凍結)</div>` : '';
                const dur = Number(gameState.lastLevelDurationSec||0);
                const ps = (typeof gameState.lastLevelPerformanceScore === 'number') ? gameState.lastLevelPerformanceScore : null;
                const metaLine = (dur>0 || ps!==null) ? `<div class="text-[11px] opacity-80 flex flex-wrap gap-x-4 gap-y-0.5">${dur>0?`<span>上關 ${dur.toFixed(1)}s</span>`:''}${ps!==null?`<span>PS ${ps.toFixed(2)}</span>`:''}</div>` : '';
                nextHtml = `
                    <div class="space-y-1">
                        ${replayPill}
                        <div class="flex flex-wrap gap-x-6 gap-y-1"><span class="whitespace-nowrap">配對模式：${diffLabel}</span><span class="whitespace-nowrap">型態：${pairText}</span></div>
                        <div class="flex flex-wrap gap-x-4 gap-y-1 items-center">
                            <span class="whitespace-nowrap">題型階段：${patternStageLabel}</span>
                            <span class="whitespace-nowrap">罕見度：${raritySpeedLabel}</span>
                        </div>
                        ${metaLine}
                    </div>`;
            }

            try {
                const t = document.getElementById('gameInfoTitle');
                if (t && cache.title !== nextTitle) {
                    t.textContent = nextTitle;
                    cache.title = nextTitle;
                }
            } catch(_) {}

            if (cache.html !== nextHtml) {
                el.innerHTML = nextHtml;
                cache.html = nextHtml;
            }

            try {
                const card = document.getElementById('questionProgressCard');
                if (card) card.classList.toggle('equip-force-show', !!forceEquipCard);
            } catch(_) {}

            // Apply difficulty-based theme on the game-info card (desktop) and global tint
            try {
                const card = document.getElementById('questionProgressCard');
                const title = document.getElementById('gameInfoTitle');
                if (card && title) {
                    const diffChanged = cache.diff !== diff;
                    const equipChanged = cache.equip !== !!gameState.equipRunning;
                    if (!diffChanged && !equipChanged) return;
                    const cls = card.classList;
                    const tcls = title.classList;
                    // Reset previous color classes
                    cls.remove('from-blue-50','to-cyan-50','border-blue-200');
                    cls.remove('from-green-50','to-emerald-50','border-green-200');
                    cls.remove('from-amber-50','to-yellow-50','border-amber-200');
                    cls.remove('from-rose-50','to-red-50','border-rose-200');
                    tcls.remove('text-blue-700','text-green-700','text-amber-700','text-rose-700','text-red-700');
                    el.classList.remove('text-blue-800','text-green-800','text-amber-800','text-rose-800','text-red-800');

                    if (diff === 'easy') {
                        cls.add('from-green-50','to-emerald-50','border-green-200');
                        tcls.add('text-green-700');
                        el.classList.add('text-green-800');
                    } else if (diff === 'normal') {
                        cls.add('from-amber-50','to-yellow-50','border-amber-200');
                        tcls.add('text-amber-700');
                        el.classList.add('text-amber-800');
                    } else { // hard
                        cls.add('from-rose-50','to-red-50','border-rose-200');
                        tcls.add('text-rose-700');
                        el.classList.add('text-rose-800');
                    }

                    // Pulse the card to emphasize change
                    if (diffChanged) {
                        try {
                            card.classList.remove('difficulty-pulse');
                            // force reflow to restart animation
                            void card.offsetWidth;
                            card.classList.add('difficulty-pulse');
                        } catch(_) {}
                    }

                    // Show a temporary tint overlay during difficulty change
                    if (diffChanged) {
                        try {
                            const overlay = document.getElementById('difficultyTintOverlay');
                            if (overlay) {
                                overlay.classList.remove('easy','normal','hard','show');
                                // force reflow to reset transition
                                void overlay.offsetWidth;
                                overlay.classList.add(diff === 'hard' ? 'hard' : (diff === 'normal' ? 'normal' : 'easy'));
                                overlay.classList.add('show');
                                // auto fade-out after 700ms
                                setTimeout(() => { try { overlay.classList.remove('show'); } catch(_) {} }, 700);
                            }
                        } catch(_) {}
                    }

                    // Also pulse the mobile mini timer if present
                    if (diffChanged) {
                        try {
                            const mini = document.getElementById('survivalTimerMini');
                            if (mini) {
                                mini.classList.remove('difficulty-pulse');
                                void mini.offsetWidth;
                                mini.classList.add('difficulty-pulse');
                            }
                        } catch(_) {}
                    }
                    cache.diff = diff;
                    cache.equip = !!gameState.equipRunning;
                }
            } catch(_) { /* non-fatal */ }
        }
        // #endregion

