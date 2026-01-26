// Extracted from bible-challenge.html
// book-selection.js

function initializeCustomBooks() {
            // 這個函數現在只是為了保持兼容性，實際初始化在各自的函數中進行
        }

    // 初始化展開卡片中的自訂書卷按鈕（響應式網格與觸控友善）
    // Initialize buttons for expand-card grid; mobile-friendly.
    // 初始化展開卡清單與勾選狀態
    // Initialize expand-card list and checks
    function initializeCustomBooksInExpandCard() {
            const container = document.querySelector('#customBooksExpandCard #customBooksExpand');
            container.innerHTML = '';
            const allBooks = [...bibleBooks.old, ...bibleBooks.new];
            allBooks.forEach(book => {
                const isSelected = gameState.customBooks.includes(book);
                const abbreviation = bookAbbreviations[book] || book;
                const btn = document.createElement('button');
                btn.type = 'button';
                // larger tappable target, centered abbreviation, visual selected state
                // don't force full width so grid can place multiple items per row on small screens
                btn.className = `inline-flex items-center justify-center px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-150 ${isSelected ? 'bg-orange-400 text-white border-orange-600 shadow-md scale-105' : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50'}`;
                btn.style.minWidth = '64px';
                btn.style.width = 'auto';
                btn.title = book;
                btn.textContent = abbreviation;
                btn.setAttribute('data-book', book);
                btn.addEventListener('click', function(ev) {
                    // avoid bubbling to the card toggle handler which collapses the panel
                    if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
                    if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
                    // toggle selection state
                    if (gameState.customBooks.includes(book)) {
                        gameState.customBooks = gameState.customBooks.filter(b => b !== book);
                    } else {
                        gameState.customBooks.push(book);
                    }
                    // re-render to reflect selection
                    initializeCustomBooksInExpandCard();
                    updateSettingsDisplay();
                    updateStartButtonState();
                });
                container.appendChild(btn);
            });
            // ensure the container uses an auto-fit responsive grid so many items can appear per row on narrow screens
            container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(64px, 1fr))';
        }

    // 初始化彈窗中的自訂書卷清單（tile 網格 + checkbox）
    // Initialize modal tile grid with checkboxes for books.
    // 初始化對話框清單與勾選狀態
    // Initialize modal list and checks
    function initializeCustomBooksInModal() {
            const container = document.querySelector('#customBooksModal #customBooks');
            container.innerHTML = ''; // 清空容器

            // render as responsive auto-fit grid of tiles for easier mobile tapping
            container.className = 'grid gap-2 mb-4 max-h-64 overflow-y-auto';
            container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(80px, 1fr))';

            const allBooks = [...bibleBooks.old, ...bibleBooks.new];

            allBooks.forEach(book => {
                const isSelected = gameState.customBooks.includes(book);
                const tile = document.createElement('label');
                // use inline-flex so tiles can size to the grid cell and allow multiple per row
                tile.className = `relative cursor-pointer select-none inline-flex items-center justify-center rounded-lg p-2 text-center border ${isSelected ? 'bg-orange-400 text-white border-orange-600 shadow-md' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`;
                tile.style.minHeight = '44px';
                tile.style.alignItems = 'center';
                tile.style.justifyContent = 'center';
                tile.setAttribute('data-book', book);

                tile.innerHTML = `
                    <input type="checkbox" class="absolute left-2 top-2" data-book="${book}" ${isSelected ? 'checked' : ''} />
                    <div class="flex items-center justify-center h-full">
                        <div class="text-sm font-medium truncate" title="${book}">${book}</div>
                    </div>
                `;

                container.appendChild(tile);

                // toggle when clicking tile or checkbox
                const input = tile.querySelector('input');
                input.addEventListener('change', () => {
                    updateCustomBooks();
                });
                tile.addEventListener('click', (e) => {
                    // avoid double-toggling when clicking the checkbox
                    if (e.target === input) return;
                    input.checked = !input.checked;
                    updateCustomBooks();
                });
            });

            // 更新選擇數量顯示
            updateSelectedCount();
        }

    // 從展開卡片（按鈕）同步自訂選擇到狀態
    // Sync selected books from expand-card buttons into state.
    // 由展開卡回寫選擇
    // Sync selections from expand card to state
    function updateCustomBooksFromExpandCard() {
            const checkboxes = document.querySelectorAll('#customBooksExpandCard #customBooksExpand input[type="checkbox"]');
            gameState.customBooks = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.book);
            
            updateSettingsDisplay();
            updateStartButtonState();
        }

    // 從彈窗（checkbox）同步自訂選擇到狀態
    // Sync selected books from modal checkboxes into state.
    // 統一回寫自訂書卷選擇（modal/expand）
    // Persist custom books selections into state
    function updateCustomBooks() {
            const checkboxes = document.querySelectorAll('#customBooksModal #customBooks input[type="checkbox"]');
            gameState.customBooks = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.book);
            
            updateSelectedCount();
        }

    // 更新彈窗中「已選 N 本」的計數顯示
    // Update the selected-count badge text in modal.
    // 更新己選書卷數顯示
    // Update selected-count badge
    function updateSelectedCount() {
            const countElement = document.querySelector('#customBooksModal #selectedCount');
            if (countElement) {
                countElement.textContent = `已選: ${gameState.customBooks.length}本`;
            }
        }

    // 清除所有自訂選擇（依所在介面：展開卡片或彈窗）
    // Clear all selected books from either expand-card or modal.
    // 清空所有勾選
    // Clear all selected books
    function clearAllBooks() {
            // 檢查是在擴展卡片還是模態視窗中
            const expandCardCheckboxes = document.querySelectorAll('#customBooksExpandCard #customBooksExpand input[type="checkbox"]');
            const modalCheckboxes = document.querySelectorAll('#customBooksModal #customBooks input[type="checkbox"]');
            
            if (expandCardCheckboxes.length > 0) {
                expandCardCheckboxes.forEach(cb => cb.checked = false);
                gameState.customBooks = [];
                updateSettingsDisplay();
                updateStartButtonState();
                
                // 如果沒有選擇任何書卷，隱藏擴展卡片
                if (gameState.customBooks.length === 0) {
                    document.getElementById('customBooksExpandCard').classList.add('hidden');
                    // 取消自訂範圍選擇
                    gameState.range = null;
                    document.querySelectorAll('.range-option').forEach(opt => {
                        opt.classList.remove('selected', 'border-purple-500', 'border-4', 'shadow-lg');
                        opt.classList.add('border-gray-300', 'border-2');
                    });
                    updateSettingsDisplay();
                    updateStartButtonState();
                }
            } else if (modalCheckboxes.length > 0) {
                modalCheckboxes.forEach(cb => cb.checked = false);
                gameState.customBooks = [];
                updateSelectedCount();
            }
        }
        
    // 在彈窗與展開卡片中以輸入框關鍵字過濾書卷清單
    // Filter book tiles/buttons by search term.
    // 對話框內過濾書卷清單
    // Filter book list inside modal
    function filterBooks() {
            const searchTerm = document.getElementById('bookSearch').value.toLowerCase();
            // target both modal tiles (label) and expand-card buttons
            const modalTiles = document.querySelectorAll('#customBooksModal #customBooks label');
            const expandBtns = document.querySelectorAll('#customBooksExpandCard #customBooksExpand button');
            modalTiles.forEach(tile => {
                const bookName = (tile.getAttribute('data-book') || tile.textContent || '').toLowerCase();
                tile.style.display = bookName.includes(searchTerm) ? '' : 'none';
            });
            expandBtns.forEach(btn => {
                const bookName = (btn.getAttribute('data-book') || btn.textContent || '').toLowerCase();
                btn.style.display = bookName.includes(searchTerm) ? '' : 'none';
            });
        }
        
    // 一鍵選取舊約所有書卷（支援展開卡片與彈窗兩種 UI）
    // Select all Old Testament books across both UIs.
    // 快速勾選舊約
    // Quick select Old Testament
    function selectOldTestamentBooks() {
            // 支援兩種 UI：擴展卡片（按鈕）與模態（勾選框）
            const expandButtons = document.querySelectorAll('#customBooksExpandCard #customBooksExpand button[data-book]');
            const modalCheckboxes = document.querySelectorAll('#customBooksModal #customBooks input[type="checkbox"]');

            if (expandButtons.length > 0) {
                const set = new Set(gameState.customBooks);
                bibleBooks.old.forEach(b => set.add(b));
                gameState.customBooks = Array.from(set);
                initializeCustomBooksInExpandCard();
                updateSettingsDisplay();
                updateStartButtonState();
            }
            if (modalCheckboxes.length > 0) {
                modalCheckboxes.forEach(cb => {
                    if (bibleBooks.old.includes(cb.dataset.book)) {
                        cb.checked = true;
                    }
                });
                updateCustomBooks();
            }
        }
        
    // 一鍵選取新約所有書卷（支援展開卡片與彈窗兩種 UI）
    // Select all New Testament books across both UIs.
    // 快速勾選新約
    // Quick select New Testament
    function selectNewTestamentBooks() {
            // 支援兩種 UI：擴展卡片（按鈕）與模態（勾選框）
            const expandButtons = document.querySelectorAll('#customBooksExpandCard #customBooksExpand button[data-book]');
            const modalCheckboxes = document.querySelectorAll('#customBooksModal #customBooks input[type="checkbox"]');

            if (expandButtons.length > 0) {
                const set = new Set(gameState.customBooks);
                bibleBooks.new.forEach(b => set.add(b));
                gameState.customBooks = Array.from(set);
                initializeCustomBooksInExpandCard();
                updateSettingsDisplay();
                updateStartButtonState();
            }
            if (modalCheckboxes.length > 0) {
                modalCheckboxes.forEach(cb => {
                    if (bibleBooks.new.includes(cb.dataset.book)) {
                        cb.checked = true;
                    }
                });
                updateCustomBooks();
            }
        }

    // 自訂專區：快速勾選工具
    function applyQuickSelectBooks(books, replace = false) {
            try {
                const all = Array.isArray(books) ? books : [];
                const universe = [...bibleBooks.old, ...bibleBooks.new];
                // 若 replace=true 代表此為「套用或切換」模式（可作為 toggle）
                if (replace) {
                    // 判斷：若 all 中所有書卷都已包含於 customBooks，代表再次點擊 → 執行『移除這一組』
                    const allSelected = all.every(b => gameState.customBooks.includes(normalizeBookName(b)));
                    if (allSelected) {
                        gameState.customBooks = gameState.customBooks.filter(b => !all.map(normalizeBookName).includes(b));
                        showCuteHint(`已取消：${all.length} 本（剩餘 ${gameState.customBooks.length}）`, 'rose', 1400, '🧩');
                    } else {
                        // 加入缺少的書卷
                        const set = new Set(gameState.customBooks || []);
                        all.forEach(b => { const full = normalizeBookName(b); if (full && universe.includes(full)) set.add(full); });
                        gameState.customBooks = Array.from(set);
                        showCuteHint(`加入 ${all.length} 本；共 ${gameState.customBooks.length} 本`, 'blue', 1400, '🧩');
                    }
                } else {
                    const set = new Set(gameState.customBooks || []);
                    all.forEach(b => { const full = normalizeBookName(b); if (full && universe.includes(full)) set.add(full); });
                    gameState.customBooks = Array.from(set);
                }
                gameState.range = 'custom';
                gameState.theme = null;
                initializeCustomBooksInExpandCard();
                updateSettingsDisplay();
                updateStartButtonState();
                try { window.__applyModeUI && window.__applyModeUI(); } catch(_) {}
                try { window.__selectHomeMode && window.__selectHomeMode('custom'); } catch(_) {}
                // 更新快速按鈕視覺（高亮已完全包含的分類）
                refreshQuickSelectCategoryStates();
            } catch (_) { /* noop */ }
        }

    function refreshQuickSelectCategoryStates(){
        try {
            const categories = [
                { id:'qsOld',   list: bibleBooks.old },
                { id:'qsNew',   list: bibleBooks.new },
                { id:'qsLaw',   list: ['創世記','出埃及記','利未記','民數記','申命記'] },
                { id:'qsHistory', list: ['約書亞記','士師記','路得記','撒母耳記上','撒母耳記下','列王紀上','列王紀下','歷代志上','歷代志下','以斯拉記','尼希米記','以斯帖記'] },
                { id:'qsPoetry', list: ['約伯記','詩篇','箴言','傳道書','雅歌'] },
                { id:'qsProphets', list: ['以賽亞書','耶利米書','耶利米哀歌','以西結書','但以理書','何西阿書','約珥書','阿摩司書','俄巴底亞書','約拿書','彌迦書','那鴻書','哈巴谷書','西番雅書','哈該書','撒迦利亞書','瑪拉基書'] },
                { id:'qsGospels', list: ['馬太福音','馬可福音','路加福音','約翰福音'] },
                { id:'qsPaul', list: ['羅馬書','哥林多前書','哥林多後書','加拉太書','以弗所書','腓立比書','歌羅西書','帖撒羅尼迦前書','帖撒羅尼迦後書','提摩太前書','提摩太後書','提多書','腓利門書'] },
                { id:'qsGeneral', list: ['希伯來書','雅各書','彼得前書','彼得後書','約翰一書','約翰二書','約翰三書','猶大書','啟示錄'] }
            ];
            categories.forEach(cat => {
                const btn = document.getElementById(cat.id);
                if (!btn) return;
                const allIncluded = cat.list.every(b => gameState.customBooks.includes(normalizeBookName(b)));
                btn.classList.toggle('ring-2', allIncluded);
                btn.classList.toggle('ring-offset-1', allIncluded);
                btn.classList.toggle('font-bold', allIncluded);
                btn.style.opacity = allIncluded ? '1' : '';
            });
        } catch(_) {}
    }
    function quickSelectGospels(replace = false) {
    applyQuickSelectBooks(['馬太福音','馬可福音','路加福音','約翰福音'], !!replace);
        }
    function quickSelectLaw(replace=false){
    applyQuickSelectBooks(['創世記','出埃及記','利未記','民數記','申命記'],!!replace);
    }
    function quickSelectHistory(replace=false){
    applyQuickSelectBooks(['約書亞記','士師記','路得記','撒母耳記上','撒母耳記下','列王紀上','列王紀下','歷代志上','歷代志下','以斯拉記','尼希米記','以斯帖記'],!!replace);
    }
    function quickSelectPoetry(replace=false){
    applyQuickSelectBooks(['約伯記','詩篇','箴言','傳道書','雅歌'],!!replace);
    }
    function quickSelectProphets(replace=false){
    applyQuickSelectBooks(['以賽亞書','耶利米書','耶利米哀歌','以西結書','但以理書','何西阿書','約珥書','阿摩司書','俄巴底亞書','約拿書','彌迦書','那鴻書','哈巴谷書','西番雅書','哈該書','撒迦利亞書','瑪拉基書'],!!replace);
    }
    function quickSelectPaul(replace=false){
    applyQuickSelectBooks(['羅馬書','哥林多前書','哥林多後書','加拉太書','以弗所書','腓立比書','歌羅西書','帖撒羅尼迦前書','帖撒羅尼迦後書','提摩太前書','提摩太後書','提多書','腓利門書'],!!replace);
    }
    function quickSelectGeneral(replace=false){
    applyQuickSelectBooks(['希伯來書','雅各書','彼得前書','彼得後書','約翰一書','約翰二書','約翰三書','猶大書','啟示錄'],!!replace);
    }

    // 彈窗：全選所有書卷（checkbox）
    // Modal: select-all all books via checkboxes.
    // 一鍵全選（對話框）
    // Select all books in modal
    function selectAllBooksInModal() {
            const modalCheckboxes = document.querySelectorAll('#customBooksModal #customBooks input[type="checkbox"]');
            modalCheckboxes.forEach(cb => cb.checked = true);
            updateCustomBooks();
        }

    // 展開卡片：全選所有書卷（按鈕）
    // Expand-card: select-all by toggling all buttons to selected state.
    // 一鍵全選（展開卡）
    // Select all books in expand card
    function selectAllBooksInExpandCard() {
            const allBooks = [...bibleBooks.old, ...bibleBooks.new];
            gameState.customBooks = allBooks.slice();
            initializeCustomBooksInExpandCard();
            updateSettingsDisplay();
            updateStartButtonState();
        }
        
    // 展開卡片：依搜尋框即時過濾按鈕
    // Expand-card: filter buttons with instant search.
    // 展開卡過濾書卷清單
    // Filter book list in expand card
    function filterBooksInExpandCard() {
            const searchTerm = document.getElementById('bookSearchExpand').value.toLowerCase();
            // expand card uses buttons, target those
            const btns = document.querySelectorAll('#customBooksExpandCard #customBooksExpand button');
            btns.forEach(btn => {
                const bookName = (btn.getAttribute('data-book') || btn.textContent || '').toLowerCase();
                if (bookName.includes(searchTerm)) btn.style.display = '';
                else btn.style.display = 'none';
            });
        }
        
    // 展開卡片：清空所有選擇（保留卡片可見，保留自訂狀態）
    // Expand-card: clear selections, keep card visible, and keep custom range.
    // 清空展開卡勾選
    // Clear all selections in expand card
    function clearAllBooksInExpandCard() {
            // 擴展卡片使用按鈕，不存在 checkbox；直接清空選擇
            gameState.customBooks = [];
            initializeCustomBooksInExpandCard();
            updateSettingsDisplay();
            updateStartButtonState();
        // 保持於自訂模式，讓提示顯示「自訂範圍至少選 1 本書卷」且停用開始
        // 若先前不在自訂，顯式切至自訂（正常情況下此函式只會在自訂展開面板中使用）
        gameState.range = 'custom';
        updateSettingsDisplay();
        updateStartButtonState();
            // 也清除快速選擇分類按鈕的高亮效果（ring 等）
            try { refreshQuickSelectCategoryStates(); } catch(_) {}
        }

    // 根據目前設定與題庫可用性，更新「開始遊戲」按鈕的可用狀態與提示
    // Update start button enabled/disabled state based on selections and data availability.
    // 依設定與選擇狀態決定「開始遊戲」可用性
    // Enable/disable Start button based on selections
    function updateStartButtonState() {
            const startBtn = document.getElementById('startGameBtn');
            const hintElement = document.getElementById('gameStartHint');
            const activeDB = getActiveVerseDB();
            const hasData = Array.isArray(activeDB) && activeDB.length > 0;
            // 可以以「排行模式（選罕見度）」或「練習模式（選範圍）」開始
            const hasRanking = !!gameState.rarity;
            const hasPractice = !!gameState.range; // 包含 theme/testament/custom/all 任一
            const isCoreMode = (gameState.playMode === 'classic' || gameState.playMode === 'survival');
            const hasEquipPending = !!gameState.__pendingEquipTier;
            let canStart = !!(((hasRanking || hasPractice || hasEquipPending) || isCoreMode) && hasData);
            
            // 檢查可開始條件：所有模式至少需有基本題數；「自訂範圍」在普通 >=3，本；簡單/困難 >=1 本
            if (canStart && hasPractice) {
                const availableVersesCount = getAvailableVersesQuickCount();
                // 自訂範圍：至少 1 本書卷
                if (gameState.range === 'custom' && gameState.customBooks.length < 1) { canStart = false; }
                canStart = canStart && availableVersesCount >= 5;
            }
            
            if (canStart) {
                // 可以開始遊戲，添加縮放提醒效果
                startBtn.classList.add('start-button-pulse');
                startBtn.disabled = false;
                startBtn.style.cursor = 'pointer';
                startBtn.style.opacity = '1';
                if (gameState.range === 'custom' && gameState.customBooks.length > 0) {
                    hintElement.textContent = `已選 ${gameState.customBooks.length} 本書卷`;
                    hintElement.style.opacity = '1';
                } else {
                    hintElement.style.opacity = '0';
                    hintElement.textContent = '';
                }
            } else {
                // 不能開始遊戲，移除提醒效果並顯示提示
                startBtn.classList.remove('start-button-pulse');
                startBtn.disabled = true;
                startBtn.style.cursor = 'not-allowed';
                startBtn.style.opacity = '0.6';
                hintElement.style.opacity = '1';
                
                // 根據缺少的選項更新提示文字
                if (!hasData) {
                    // 若以 file:// 開啟，瀏覽器會阻擋 fetch JSON；引導使用本機伺服器
                    if (location && location.protocol === 'file:') {
                        hintElement.textContent = '需要透過本機伺服器開啟（如 VS Code Live Server 或 python -m http.server），file:// 無法載入題庫。';
                    } else if (window && window.externalVersesLoadError) {
                        hintElement.textContent = '題庫載入失敗，請重新整理（Ctrl+F5），或確認 external-verses.json 路徑/CORS 設定。';
                    } else {
                        hintElement.textContent = '正在載入題庫…';
                    }
                } else if (!hasRanking && !hasPractice && !isCoreMode) {
                    hintElement.textContent = '請先選擇模式（闖關 / 生存 / 裝備 / 自訂）';
        } else if (gameState.range === 'custom') {
                    if (gameState.customBooks.length < 1) {
                        hintElement.textContent = '自訂範圍至少選 1 本書卷';
                    } else {
                        const cnt = gameState.customBooks.length;
                        hintElement.textContent = `已選 ${cnt} 本書卷；可用經文不足，請擴大或調整`; 
                    }
                } else {
                    hintElement.textContent = '此設定可用經文不足，請擴大範圍或更換主題';
                }
            }
        }

        // #region 核心遊戲流程
        