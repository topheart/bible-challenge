// Extracted from bible-challenge.html
// cute-hints.js

let cuteHintTimer = null;
    let cuteHintIdCounter = 0; // increments on each show to guard against stale hides
    // Global flag to suppress cute hints during programmatic initialization
    window.__suppressCuteHints = window.__suppressCuteHints || false;
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const formatTemplate = (tpl, data) => tpl.replace(/\{(\w+)\}/g, (_, k) => (data && k in data) ? data[k] : _);

        const HINTS = {
            difficulty: {
                easy: [
                    '耶～簡單入門！配對經文暖暖上手～',
                    '簡單模式啟動，先感受一下節奏吧～'
                ],
                normal: [
                    '普通模式來囉！配對書卷，挑戰剛剛好～',
                    '中等挑戰開啟，穩穩來最厲害～'
                ],
                hard: [
                    '困難模式點亮！配對章節，高手請進～',
                    '進階挑戰開打，深呼吸～衝！'
                ],
                cancel: [
                    '先不選難度也可以～慢慢挑喔！'
                ]
            },
            rarity: {
                common: [
                    '選了常見經文～闖關不敗，讚讚！',
                    '常見池上線，熟悉的味道來了～'
                ],
                rare: [
                    '挑戰冷門經文！小眾也很寶貴～',
                    '冷門＆少見集合，準備挖寶囉～'
                ],
                all: [
                    '全範圍任你挑～豐富又好玩！',
                    '全部經文開放，出題更有驚喜～'
                ],
                cancel: [
                    '先不排排行也行～之後再選！'
                ]
            },
            range: {
                all: [
                    '整本聖經走起～冒險從創世記到啟示錄！'
                ],
                old: [
                    '鎖定舊約～智慧與歷史滿滿的祝福！'
                ],
                new: [
                    '新約專區～福音與書信給你力量！'
                ],
                custom: [
                    '自訂範圍上線～照你的步調就對了！'
                ],
                cancel: [
                    '先選出題範圍吧～我在這裡等你！'
                ]
            },
            time: {
                on: [
                    '時間獎勵開啟！快狠準再加分～',
                    '計時啟動～把握節奏更刺激！'
                ],
                off: [
                    '時間獎勵關閉～專心沉浸不趕時間～',
                    '先不計時也很棒～慢慢享受文字～'
                ]
            },
            hintReminder: [
                '卡住沒關係～提示在這裡等你喔！',
                '需要小幫手嗎？點提示一起前進～'
            ],
            customConfirm: [
                '已選 {count} 本書卷～客製化最貼心！',
                '自訂範圍完成：{count} 本，讚讚！'
            ],
            play: {
                introEasy: [
                    '先挑一段經文吧～出發！',
                    '選一段喜歡的經文，開始暖身～'
                ],
                introOther: [
                    '先挑一段經文吧～準備配對囉！',
                    '請先選一段經文～等等要來配對了！'
                ],
                pairEasy: [
                    '把它跟另一半配對起來～加油！',
                    '找找看後半段在哪裡～你可以的！'
                ],
                pairOther: [
                    '選出正確的章節～穩穩拿分！',
                    '章節在哪裡呢？鎖定它！'
                ]
            }
        };

        // Mode selection cute hint pools (color tone aligned to card styles)
        const MODE_HINTS = {
            classic: {
                theme: 'rose', icon: '🏁', lines: [
                    '闖關挑戰就緒！10 關穩紮穩打～',
                    '選擇闖關模式：節奏穩定一路闖！'
                ]
            },
            survival: {
                theme: 'emerald', icon: '⏱️', lines: [
                    '生存計時開啟！時間就是分數！',
                    '選擇生存模式：節奏加速拚極限！'
                ]
            },
            custom: {
                theme: 'blue', icon: '🧩', lines: [
                    '練習模式開啟：自由挑選加深熟悉！',
                    '自訂練習開啟～慢慢感受節奏～'
                ]
            },
            equip: {
                theme: 'purple', icon: '🎓', lines: [
                    '裝備課程：抽卷→選章→排序！',
                    '進入裝備訓練～循序漸進紮根～'
                ]
            },
            deselect: {
                theme: 'purple', icon: '🌀', lines: [
                    '已取消選擇～再挑一種模式吧！',
                    '模式清空啦～準備重新出發！'
                ]
            },
            equipTier: {
                growth: { theme:'purple', icon:'🌱', lines:[ '成長班：基礎紮根～好開始！', '成長班選擇完成～打好根基！' ] },
                disciple:{ theme:'purple', icon:'🛤️', lines:[ '門徒班：進階操練～加深！', '門徒班就緒～挑戰再提升！' ] },
                leader:  { theme:'purple', icon:'🚀', lines:[ '領袖班：深度裝備～衝刺！', '領袖班選擇～全力突破！' ] }
            }
        };

        function showCuteHint(messageOrArray, theme = 'purple', duration, icon = '✨') {
            // Skip toasts when suppressed (e.g., on initial default selections)
            if (window.__suppressCuteHints) return;
            const bar = document.getElementById('cuteHintBar');
            if (!bar) return;

            const message = Array.isArray(messageOrArray) ? pick(messageOrArray) : messageOrArray;
            const showMs = typeof duration === 'number' ? (duration <= 0 ? null : duration) : randBetween(2600, 3000);

            // Apply content and theme
            bar.className = `cute-hint ${theme}`;
            bar.querySelector('.cute-hint-icon').textContent = icon;
            bar.querySelector('.cute-hint-text').textContent = message;

            // Show with slide-up + fade-in
            if (cuteHintTimer) { clearTimeout(cuteHintTimer); cuteHintTimer = null; }
            const thisId = String(++cuteHintIdCounter);
            try { bar.dataset.hintId = thisId; } catch (_) {}
            bar.style.display = 'flex';
            // force reflow then add .show
            void bar.offsetWidth; 
            bar.classList.add('show');

            // Auto hide with fade-out then display:none (skip when duration<=0)
            if (showMs !== null) {
                cuteHintTimer = setTimeout(() => {
                    // Only hide if this is still the active hint
                    if (bar.dataset && bar.dataset.hintId === thisId) {
                        bar.classList.remove('show');
                        const hideDelay = 220; // match CSS transition
                        setTimeout(() => {
                            // Ensure we are still hiding the same hint
                            if (bar.dataset && bar.dataset.hintId === thisId) {
                                bar.style.display = 'none';
                            }
                        }, hideDelay);
                    }
                }, showMs);
            }
        }

        // Hide the cute hint immediately (used when user已經進入下一步或作答)
        function hideCuteHint() {
            const bar = document.getElementById('cuteHintBar');
            if (!bar) return;
            if (cuteHintTimer) { try { clearTimeout(cuteHintTimer); } catch (_) {} cuteHintTimer = null; }
            const prevId = (bar.dataset && bar.dataset.hintId) ? bar.dataset.hintId : '';
            try { bar.classList.remove('show'); } catch (_) {}
            // After transition, hide only if the same hint is still current
            setTimeout(() => {
                try {
                    if (!bar.dataset || bar.dataset.hintId === prevId) {
                        bar.style.display = 'none';
                    }
                } catch (_) { /* ignore */ }
            }, 200);
        }

        // New: level encouragement via cute toast (replaces overlay encouragement)
        function showLevelEncouragementCute() {
            try {
                const result = gameState.levelResults && gameState.levelResults[gameState.currentLevel];
                let msgs;
                let theme = 'green';
                let icon = '🎉';
                // Detect if this is the last level (game about to complete or just completed)
                // Heuristic: if gameState.gameCompleted is true, or if there are no more levels after this one
                // We'll use: if (gameState.gameCompleted || (typeof gameState.totalQuestions === 'number' && gameState.totalQuestions > 0 && gameState.currentLevel * 5 >= gameState.totalQuestions))
                // But since totalQuestions is incremented as questions are generated, and each level is 5 questions, we can estimate
                // Simpler: if gameState.gameCompleted is true, or if nextLevel would not be called
                // For encouragement, show special message if game is completed or this is the last level
                let isFinalLevel = false;
                if (gameState.gameCompleted) {
                    isFinalLevel = true;
                } else {
                    // Try to estimate if this is the last level: if there are not enough available verses for another level
                    // or if the nextLevel would trigger completeGame
                    // But for now, only use gameCompleted, as it's reliable after last level
                }
                if (isFinalLevel) {
                    // Final level: show a different encouragement
                    if (result === 'perfect') {
                        msgs = ['完美通關！太強了！', '全破！無懈可擊！讚爆！'];
                        theme = 'amber'; icon = '🏆';
                    } else if (result === 'complete') {
                        msgs = ['全對通關！漂亮！', '厲害～全部完成！'];
                        theme = 'green'; icon = '✅';
                    } else {
                        msgs = ['恭喜完成全部關卡！', '辛苦了，已經全部通關！'];
                        theme = 'blue'; icon = '🎉';
                    }
                } else {
                    if (result === 'perfect') {
                        msgs = ['完美！太強了！', '無懈可擊！讚爆！'];
                        theme = 'amber'; icon = '🏆';
                    } else if (result === 'complete') {
                        msgs = ['全對！漂亮！', '厲害～繼續保持！'];
                        theme = 'green'; icon = '✅';
                    } else {
                        msgs = ['不錯不錯～下一關加油！', '穩穩來～越玩越順！'];
                        theme = 'blue'; icon = '💪';
                    }
                }
                showCuteHint(pick(msgs), theme, 2600, icon);
            } catch (_) { /* ignore */ }
        }

    // 切換難度（簡單/普通/困難）；維護選取樣式與偏好
    // Select difficulty; updates selection state and persists preference
    function selectDifficulty(e) {
            const clickedOption = e.currentTarget;
            const isCurrentlySelected = clickedOption.classList.contains('selected');
            
            // 移除所有選中/高亮相關狀態，並還原為每種難度的原始淺色背景與細邊框
            document.querySelectorAll('.difficulty-option').forEach(opt => {
                // remove any possible selected/highlight classes (including color variants)
                opt.classList.remove(
                    'selected', 'border-amber-500', 'border-4', 'shadow-lg',
                    'border-green-600', 'border-yellow-600', 'border-red-600',
                    'bg-green-100', 'bg-yellow-100', 'bg-red-100'
                );

                // 恢復原始邊框與背景（淺色）
                if (opt.dataset.difficulty === 'easy') {
                    opt.classList.add('border-green-300', 'border-2', 'bg-gradient-to-br', 'from-green-50', 'to-green-100');
                } else if (opt.dataset.difficulty === 'normal') {
                    opt.classList.add('border-yellow-300', 'border-2', 'bg-gradient-to-br', 'from-yellow-50', 'to-yellow-100');
                } else if (opt.dataset.difficulty === 'hard') {
                    opt.classList.add('border-red-300', 'border-2', 'bg-gradient-to-br', 'from-red-50', 'to-red-100');
                }
            });
            
            if (isCurrentlySelected) {
                // 如果點擊的是已選中的選項，則取消選擇
                gameState.difficulty = null;
                showCuteHint(HINTS.difficulty.cancel, 'purple', undefined, '🎯');
            } else {
                // 選中新的選項
                if (clickedOption.dataset.difficulty === 'easy') {
                    clickedOption.classList.add('selected', 'border-green-600', 'border-4', 'shadow-lg');
                    clickedOption.classList.remove('border-green-300', 'border-2');
                    showCuteHint(HINTS.difficulty.easy, 'green', undefined, '🌱');
                } else if (clickedOption.dataset.difficulty === 'normal') {
                    clickedOption.classList.add('selected', 'border-yellow-600', 'border-4', 'shadow-lg');
                    clickedOption.classList.remove('border-yellow-300', 'border-2');
                    showCuteHint(HINTS.difficulty.normal, 'amber', undefined, '⭐');
                } else if (clickedOption.dataset.difficulty === 'hard') {
                    clickedOption.classList.add('selected', 'border-red-600', 'border-4', 'shadow-lg');
                    clickedOption.classList.remove('border-red-300', 'border-2');
                    showCuteHint(HINTS.difficulty.hard, 'red', undefined, '🔥');
                }
                gameState.difficulty = clickedOption.dataset.difficulty;
            }
            
            updateSettingsDisplay();
            updateStartButtonState();
            // 儲存偏好
            persistPrefs({ difficulty: gameState.difficulty });
        }

    function updateSettingsDisplay() {
            // 更新遊戲中的設定顯示
            const difficultyText = { easy: '簡單（配對經文）', normal: '普通（配對書卷）', hard: '困難（配對章節）' };
            const gameDifficultyDisplay = document.getElementById('gameDifficultyDisplay');
            const gameRangeDisplay = document.getElementById('gameRangeDisplay');
            
            if (gameDifficultyDisplay && gameState.difficulty) {
                gameDifficultyDisplay.textContent = difficultyText[gameState.difficulty];
                
                // 更新難度卡片顏色
                const difficultyCard = gameDifficultyDisplay.parentElement;
                difficultyCard.className = 'rounded-lg p-2 border flex-1';
                
                if (gameState.difficulty === 'easy') {
                    // 清除任何潛在的錯誤類別再套用綠色樣式
                    clearErrorState(difficultyCard);
                    difficultyCard.classList.add('bg-green-100', 'border-green-200');
                    gameDifficultyDisplay.className = 'font-bold text-green-700 text-base';
                } else if (gameState.difficulty === 'normal') {
                    difficultyCard.classList.add('bg-yellow-100', 'border-yellow-200');
                    gameDifficultyDisplay.className = 'font-bold text-yellow-700 text-base';
                } else if (gameState.difficulty === 'hard') {
                    difficultyCard.classList.add('bg-red-100', 'border-red-200');
                    gameDifficultyDisplay.className = 'font-bold text-red-700 text-base';
                }
            }
            
            if (gameRangeDisplay) {
                // 練習模式：顯示出題範圍（舊約/新約/自訂/整本/主題）
                let rangeText = '整本聖經';
                if (gameState.range === 'testament') {
                    rangeText = gameState.testament === 'old' ? '舊約' : '新約';
                } else if (gameState.range === 'custom') {
                    rangeText = `自訂 (${gameState.customBooks.length}本)`;
                } else if (gameState.range === 'theme') {
                    const map = { love: '愛', faith: '信心', hope: '盼望', parables: '比喻', wisdom: '詩篇智慧', gospels: '福音書專場' };
                    rangeText = `主題：${map[gameState.theme] || ''}`.trim();
                }
                // 若選擇排行模式（選了罕見度），於此也提示罕見度
                if (gameState.rarity) {
                    const rarityLabel = { common: '常見', rare: '冷門', all: '全部' }[gameState.rarity] || '';
                    gameRangeDisplay.textContent = `排行：${rarityLabel}`;
                } else {
                    gameRangeDisplay.textContent = rangeText;
                }
                
                // 更新範圍卡片顏色
                const rangeCard = gameRangeDisplay.parentElement;
                rangeCard.className = 'rounded-lg p-2 border flex-1';
                
                if (gameState.rarity) {
                    // 排行模式色系沿用紫色
                    rangeCard.classList.add('bg-purple-100', 'border-purple-200');
                    gameRangeDisplay.className = 'font-bold text-purple-700 text-sm';
                } else if (gameState.range === 'all') {
                    rangeCard.classList.add('bg-purple-100', 'border-purple-200');
                    gameRangeDisplay.className = 'font-bold text-purple-700 text-sm';
                } else if (gameState.range === 'testament') {
                    rangeCard.classList.add('bg-blue-100', 'border-blue-200');
                    gameRangeDisplay.className = 'font-bold text-blue-700 text-sm';
                } else if (gameState.range === 'custom') {
                    rangeCard.classList.add('bg-orange-100', 'border-orange-200');
                    gameRangeDisplay.className = 'font-bold text-orange-700 text-sm';
                } else if (gameState.range === 'theme') {
                    rangeCard.classList.add('bg-blue-100', 'border-blue-200');
                    gameRangeDisplay.className = 'font-bold text-blue-700 text-sm';
                }
            }
        }

    // 切換排行模式的經文罕見度（常見/冷門/全部）
    // Select rarity for leaderboard mode (common/rare/all)
    function selectRarity(e) {
            const clicked = e.currentTarget;
            const isSelected = clicked.classList.contains('selected');
            // reset visual state
            document.querySelectorAll('.rarity-option').forEach(opt => {
                opt.classList.remove('selected', 'border-purple-600', 'border-4', 'shadow-lg');
                opt.setAttribute('aria-pressed', 'false');
                opt.classList.add('border-purple-300', 'border-2');
            });
            if (isSelected) {
                gameState.rarity = null;
                gameState.mode = null;
                clicked.setAttribute('aria-pressed', 'false');
                showCuteHint(HINTS.rarity.cancel, 'purple', undefined, '🏆');
            } else {
                clicked.classList.add('selected', 'border-purple-600', 'border-4', 'shadow-lg');
                clicked.classList.remove('border-purple-300', 'border-2');
                clicked.setAttribute('aria-pressed', 'true');
                gameState.rarity = clicked.dataset.rarity;
                gameState.mode = 'ranking';
                // rarity hints
                const r = gameState.rarity;
                const pool = (r === 'common') ? HINTS.rarity.common
                           : (r === 'rare') ? HINTS.rarity.rare
                           : HINTS.rarity.all;
                showCuteHint(pool, 'purple', undefined, '🔎');
                // 與練習範圍互斥：清除任何範圍選擇
                document.querySelectorAll('.range-option').forEach(opt => {
                    opt.classList.remove('selected', 'border-purple-600', 'border-blue-600', 'border-orange-600', 'border-4', 'shadow-lg');
                    opt.setAttribute('aria-pressed', 'false');
                    // 恢復原始邊框樣式
                    if (opt.dataset.range === 'all') {
                        opt.classList.add('border-purple-300', 'border-2');
                    } else if (opt.dataset.range === 'testament') {
                        opt.classList.add('border-blue-300', 'border-2');
                    } else if (opt.dataset.range === 'custom') {
                        opt.classList.add('border-orange-300', 'border-2');
                    } else if (opt.dataset.range === 'theme') {
                        opt.classList.add('border-blue-300', 'border-2');
                    }
                });
                gameState.range = null;
            }
            // 清除自訂擴展卡片顯示（避免同時展開）
            document.getElementById('rangeWarning')?.classList.add('hidden');
            document.getElementById('customBooksExpandCard')?.classList.add('hidden');
            updateSettingsDisplay();
            updateBaseScoreRuleDisplay();
            updateStartButtonState();
            persistPrefs({ rarity: gameState.rarity, range: gameState.range });
        }

    // 設定排行榜標籤（以「模式」為單位）的啟用狀態與 ARIA 屬性
    // Activate leaderboard tab UI and ARIA attributes (mode-based)
    function setActiveLeaderboardTabByMode(mode) {
            const palette = {
                classic:  { g1: '#FEF2F2', g2: '#FEE2E2', text: '#B91C1C', border: '#F87171' }, // red tones
                survival: { g1: '#ECFDF5', g2: '#D1FAE5', text: '#047857', border: '#34D399' }  // green tones
            };
            document.querySelectorAll('.leaderboard-tab').forEach(tab => {
                if (tab.id === 'viewAllLeaderboard') return; // skip view-all button
                const isActive = tab.dataset.mode === mode;
                tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
                tab.style.backgroundColor = '';
                tab.style.backgroundImage = '';
                tab.style.color = '';
                tab.style.border = '';
                tab.style.boxShadow = '';
                if (isActive) {
                    const p = palette[mode] || palette.classic;
                    tab.style.backgroundImage = `linear-gradient(135deg, ${p.g1}, ${p.g2})`;
                    tab.style.color = p.text;
                    tab.style.border = `2px solid ${p.border}`;
                    tab.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                } else {
                    tab.style.backgroundImage = 'linear-gradient(135deg,#F8FAFC,#F1F5F9)';
                    tab.style.color = '#64748B';
                    tab.style.border = '1px solid #E2E8F0';
                }
            });
        }

    // 點擊排行榜標籤以切換模式頁籤
    // Handle leaderboard tab click to switch mode view
    function selectLeaderboardTab(e) {
            // 取消動畫、避免連續觸發；僅在目標不同時切換
            // No animation; block while animating; only switch when target differs
            if (window.__lbTransitioning) return; // block while animating
            const selectedMode = e.currentTarget.dataset.mode;
            if (selectedMode === 'all') { // open full view instead of switching
                try { document.getElementById('viewAllLeaderboard').click(); } catch(_) {}
                return;
            }
            const order = ['classic','survival'];
            const prev = window.__lbCurrentMode || 'classic';
            if (selectedMode === prev) return; // no-op if same tab
            const dir = order.indexOf(selectedMode) > order.indexOf(prev) ? 'left' : 'right';
            setActiveLeaderboardTabByMode(selectedMode);
            // No animation: switch instantly
            updateLeaderboardDisplay(selectedMode);
        }

    // 啟用滑動切換排行榜模式（無動畫，並加上過程防呆）
    // Enable swipe gesture to switch leaderboard mode (no animation, guarded)
    // 排行榜左右滑動切換（行動裝置）
    // Enable swipe navigation between leaderboard mode panes
    function setupLeaderboardSwipe() {
            const container = document.getElementById('leaderboardList');
            if (!container) return;
            let startX = 0, startY = 0, dx = 0, dy = 0, tracking = false;
        const order = ['classic','survival'];
            const threshold = 48; // px
            const onStart = (x, y) => { startX = x; startY = y; dx = 0; dy = 0; tracking = true; };
            const onMove = (x, y) => { if (!tracking) return; dx = x - startX; dy = y - startY; };
            const onEnd = () => {
        if (window.__lbTransitioning) { tracking = false; return; }
                if (!tracking) return;
                tracking = false;
                // horizontal swipe dominant and exceed threshold
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
            const cur = window.__lbCurrentMode || 'classic';
                    const idx = order.indexOf(cur);
                    if (dx < 0 && idx < order.length - 1) {
                        const next = order[idx + 1];
            if (window.__lbTransitioning) return;
                        setActiveLeaderboardTabByMode(next);
                        // No animation
                        updateLeaderboardDisplay(next);
                    } else if (dx > 0 && idx > 0) {
                        const prev = order[idx - 1];
            if (window.__lbTransitioning) return;
                        setActiveLeaderboardTabByMode(prev);
                        // No animation
                        updateLeaderboardDisplay(prev);
                    }
                }
            };

            // Touch events
            container.addEventListener('touchstart', (e) => {
                if (!e.touches || !e.touches.length) return;
                const t = e.touches[0];
                onStart(t.clientX, t.clientY);
            }, { passive: true });
            container.addEventListener('touchmove', (e) => {
                if (!e.touches || !e.touches.length) return;
                const t = e.touches[0];
                onMove(t.clientX, t.clientY);
            }, { passive: true });
            container.addEventListener('touchend', onEnd, { passive: true });

            // Mouse events (desktop)
            container.addEventListener('mousedown', (e) => { onStart(e.clientX, e.clientY); });
            container.addEventListener('mousemove', (e) => { onMove(e.clientX, e.clientY); });
            container.addEventListener('mouseleave', () => { tracking = false; });
            container.addEventListener('mouseup', onEnd);
        }

        function selectRange(e) {
            const clickedOption = e.currentTarget;
            const isCurrentlySelected = clickedOption.classList.contains('selected');
            
            // 移除所有選中狀態
            document.querySelectorAll('.range-option').forEach(opt => {
                opt.classList.remove('selected', 'border-purple-600', 'border-blue-600', 'border-orange-600', 'border-4', 'shadow-lg');
                opt.setAttribute('aria-pressed', 'false');
                // 恢復原始邊框樣式
                if (opt.dataset.range === 'all') {
                    opt.classList.add('border-purple-300', 'border-2');
                } else if (opt.dataset.range === 'testament' && opt.dataset.testament === 'old') {
                    opt.classList.add('border-blue-300', 'border-2');
                } else if (opt.dataset.range === 'testament' && opt.dataset.testament === 'new') {
                    opt.classList.add('border-blue-300', 'border-2');
                } else if (opt.dataset.range === 'custom') {
                    opt.classList.add('border-orange-300', 'border-2');
                }
            });

            // 與排行罕見度互斥：清除罕見度選擇（練習模式不列入排行）
            document.querySelectorAll('.rarity-option').forEach(opt => {
                opt.classList.remove('selected', 'border-purple-600', 'border-4', 'shadow-lg');
                opt.classList.add('border-purple-300', 'border-2');
                opt.setAttribute('aria-pressed', 'false');
            });
            gameState.rarity = null;
            gameState.mode = 'practice';
            // 練習模式獨立於闖關/生存：不自動指定 playMode，並讓模式按鈕進入禁用狀態

            // 隱藏警告訊息和自訂擴展卡片
            document.getElementById('rangeWarning').classList.add('hidden');
            document.getElementById('customBooksExpandCard').classList.add('hidden');
            
            if (isCurrentlySelected) {
                // 如果點擊的是已選中的選項，則取消選擇
                gameState.range = null;
                gameState.theme = null;
                gameState.testament = 'old'; // 重置為預設值
                clickedOption.setAttribute('aria-pressed', 'false');
                showCuteHint(HINTS.range.cancel, 'blue', undefined, '📚');
            } else {
                // 選中新的選項
                if (clickedOption.dataset.range === 'all') {
                    clickedOption.classList.add('selected', 'border-purple-600', 'border-4', 'shadow-lg');
                    clickedOption.classList.remove('border-purple-300', 'border-2');
                    showCuteHint(HINTS.range.all, 'purple', undefined, '📖');
                } else if (clickedOption.dataset.range === 'testament') {
                    clickedOption.classList.add('selected', 'border-blue-600', 'border-4', 'shadow-lg');
                    clickedOption.classList.remove('border-blue-300', 'border-2');
                    const t = clickedOption.dataset.testament === 'old' ? HINTS.range.old : HINTS.range.new;
                    showCuteHint(t, 'blue', undefined, '🧭');
                } else if (clickedOption.dataset.range === 'theme') {
                    clickedOption.classList.add('selected', 'border-blue-600', 'border-4', 'shadow-lg');
                    clickedOption.classList.remove('border-blue-300', 'border-2');
                    gameState.theme = clickedOption.dataset.theme || null;
                    showCuteHint(`主題：${clickedOption.querySelector('.label')?.textContent?.trim() || ''}（不列入排行）`, 'blue', undefined, '🧩');
                } else if (clickedOption.dataset.range === 'custom') {
                    clickedOption.classList.add('selected', 'border-orange-600', 'border-4', 'shadow-lg');
                    clickedOption.classList.remove('border-orange-300', 'border-2');
                    showCuteHint(HINTS.range.custom, 'amber', undefined, '🧩');
                }
                gameState.range = clickedOption.dataset.range;
                clickedOption.setAttribute('aria-pressed', 'true');
                
                // 處理不同範圍類型
                if (gameState.range === 'testament') {
                    gameState.testament = clickedOption.dataset.testament;
                } else if (gameState.range === 'custom') {
                    // 顯示自訂書卷擴展卡片
                    showCustomBooksExpandCard();
                } else {
                    // 非自訂範圍：隱藏擴展卡片
                    try { document.getElementById('customBooksExpandCard')?.classList.add('hidden'); } catch(_) {}
                }
            }
            
            updateSettingsDisplay();
            updateBaseScoreRuleDisplay();
            updateStartButtonState();
            // 選了主題/範圍後，刷新模式按鈕狀態（禁用闖關/生存，改為獨立練習模式）
            try { window.__applyModeUI && window.__applyModeUI(); } catch (_) {}
            // 儲存偏好
            persistPrefs({ range: gameState.range, rarity: gameState.rarity, theme: gameState.theme });
        }



    // 切換「時間獎勵」顯示與狀態（UI + 偏好儲存）
    // Toggle time-reward visibility/state (UI + persist preference)
    // 切換「時間獎勵」顯示與規則文字
    // Toggle time-reward option and update rule text
    // 已移除 toggleCountdownDisplay（時間獎勵固定啟用）

    // 將使用者偏好（難度/範圍/罕見度/時間獎勵）存入 localStorage
    // Persist user preferences to localStorage
    function persistPrefs(partial) {
            try {
                const key = (window.__BC_CONSTS && window.__BC_CONSTS.STORAGE_KEY_SETTINGS) || 'bibleGameSettings';
                const saved = JSON.parse(localStorage.getItem(key) || '{}') || {};
                const next = { ...saved, ...partial };
                localStorage.setItem(key, JSON.stringify(next));
            } catch (e) { /* ignore */ }
        }

    // 主題切換 (light/dark)。若未指定 target 則在 'light' 和 'dark' 間切換。
    window.toggleTheme = function(target){
        try {
            const root = document.documentElement;
            const current = root.getAttribute('data-theme') || 'light';
            const next = target ? target : (current==='dark' ? 'light' : 'dark');
            root.setAttribute('data-theme', next);
            persistPrefs({ uiTheme: next });
            // 可選：調整 meta theme-color
            try { const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', next==='dark' ? '#0f172a' : '#6366f1'); } catch(_) {}
            if (window.__debugPerf) console.log('[theme] switched', { from: current, to: next });
        } catch(e){ console.warn('[toggleTheme] failed', e); }
    };
    // 初始載入：讀取 uiTheme 偏好
    (function applyStoredTheme(){
        try {
            const key = (window.__BC_CONSTS && window.__BC_CONSTS.STORAGE_KEY_SETTINGS) || 'bibleGameSettings';
            const saved = JSON.parse(localStorage.getItem(key)||'{}') || {};
            if (saved.uiTheme) document.documentElement.setAttribute('data-theme', saved.uiTheme);
        } catch(_) {}
    })();

    // 依 time-reward 狀態顯示/隱藏進度與提示文字
    // Show/hide time-reward widgets based on state
    // 依勾選狀態顯示/隱藏時間獎勵說明
    // Show/hide time reward note based on toggle
    function updateTimeRewardVisibility() {
            const container = document.getElementById('timeRewardProgressContainer');
            const note = document.getElementById('timeRewardNote');
            if (!container) return;
            // Read new preference: hideTimeBar (default false)
            let hideBar = false;
            try {
                const prefs = window.loadSettings? window.loadSettings():{};
                if (typeof prefs.hideTimeBar === 'boolean') hideBar = prefs.hideTimeBar;
                else if (typeof prefs.showTimeBar === 'boolean') hideBar = !prefs.showTimeBar; // legacy invert
            } catch(_){ }
            const showBar = !hideBar;
            container.style.display = showBar ? 'block' : 'none';
            if (note) note.style.display = showBar ? 'block' : 'none';

            // Rebuild UI if not present (bar on top, label under bar)
            if (!document.getElementById('scoreProgressBar')) {
                container.innerHTML = '';
                const wrap = document.createElement('div');
                wrap.className = 'space-y-1';

                // Bar row (top)
                const bar = document.createElement('div');
                bar.id = 'scoreProgressBar';
                bar.className = 'w-full h-3 rounded-full border border-blue-200 bg-gradient-to-r from-green-500 via-yellow-400 to-orange-400 overflow-hidden';
                const fill = document.createElement('div');
                fill.id = 'scoreProgressFill';
                fill.className = 'h-full bg-yellow-400 rounded-full transition-all duration-100';
                fill.style.width = '0%';
                bar.appendChild(fill);
                wrap.appendChild(bar);

                // Footer row: label + live score (below bar)
                const footer = document.createElement('div');
                footer.className = 'flex items-center justify-end gap-1';
                footer.innerHTML = `
                    <div class="text-xs font-bold text-blue-100">時間獎勵</div>
                    <div class="text-xs font-extrabold"><span class="text-white/80">+ </span><span id="currentQuestionScore" class="text-yellow-300">50</span><span class="text-white/70"> 分</span></div>
                `;
                wrap.appendChild(footer);

                container.appendChild(wrap);
            }
        }

    // 更新規則說明區塊（含時間獎勵說明）
    // Update rules section (including time-reward info)
    // 更新「時間獎勵」說明行（依目前設定）
    // Update time reward rule line text
    function updateScoreRulesDisplay() {
            const timeRewardRule = document.getElementById('timeRewardRule');
            const timeRewardNote = document.getElementById('timeRewardNote');
            // Respect new hide preference
            let hideBar = false;
            try {
                const prefs = window.loadSettings? window.loadSettings():{};
                if (typeof prefs.hideTimeBar === 'boolean') hideBar = prefs.hideTimeBar;
                else if (typeof prefs.showTimeBar === 'boolean') hideBar = !prefs.showTimeBar;
            } catch(_) {}
            const showBar = !hideBar;
            if (timeRewardRule) timeRewardRule.style.display = showBar ? 'flex' : 'none';
            if (timeRewardNote) timeRewardNote.style.display = showBar ? 'block' : 'none';
        }

        // 更新「基礎分數」說明字樣，會隨罕見度按鈕切換
    // 更新「基礎分數」說明行（依罕見度）
    // Update base score rule line based on rarity
    function updateBaseScoreRuleDisplay() {
            const el = document.getElementById('baseScoreRuleValue');
            if (!el) return;
            el.textContent = '+100分/題';
        }



    // 展開「自訂書卷」快速選擇卡片（行內展開）
    // Show inline expand-card for quick custom book selection.
    // 展開卡：在首頁顯示簡版自訂書卷選擇
    // Expand-card view for quick custom books selection
    function showCustomBooksExpandCard() {
            const expandCard = document.getElementById('customBooksExpandCard');
            expandCard.classList.remove('hidden');
            // 初始化書卷選項
            initializeCustomBooksInExpandCard();
        }

    // 開啟自訂書卷的完整清單（彈窗模式）
    // Open the full custom books list in a modal.
    // 開啟完整自訂書卷對話框
    // Open the full custom-books modal
    function openCustomModal() {
            try { openModal('customBooksModal'); } catch(_) {
                const m = document.getElementById('customBooksModal'); if (m) m.classList.remove('hidden');
            }
            // 重新初始化書卷選項
            try { initializeCustomBooksInModal(); } catch(_) {}
        }

    // 關閉自訂書卷彈窗；若無選擇任何書卷，撤銷自訂範圍
    // Close modal; if no selection remains, cancel custom range.
    // 關閉自訂書卷對話框
    // Close the custom-books modal
    function closeCustomModal() {
            try { closeModal('customBooksModal'); } catch(_) {
                const m = document.getElementById('customBooksModal'); if (m) m.classList.add('hidden');
            }
            // 如果沒有選擇任何書卷，取消自訂範圍選擇
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

    // 確認自訂範圍選擇（最低 1 本；不再依難度）
    // Confirm custom selection; minimum 1 book (difficulty removed).
    // 確認自訂選擇並回寫到遊戲狀態
    // Confirm selection and write into gameState
    function confirmCustomSelection() {
            // 最少需選 1 本書卷
            if (gameState.customBooks.length < 1) {
                showCuteHint('自訂範圍至少選 1 本書卷', 'rose', undefined, '⚠️');
                return;
            }
            // 確認選擇，關閉視窗
            showCuteHint(formatTemplate(pick(HINTS.customConfirm), { count: gameState.customBooks.length }), 'amber', undefined, '✅');
            closeCustomModal();
            updateSettingsDisplay();
            updateStartButtonState();
        }

    // 初始化自訂書卷 UI 與事件
    // Initialize custom-books UI and events
    