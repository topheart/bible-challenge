// 將原本散落在引擎中的 UI 更新邏輯統一集中，綁定到 Event Bus
(function() {
    if (!window.bcEvents) return;

    // 監聽分數變更
    window.bcEvents.on('state:score', (data) => {
        const { old, new: newScore } = data;
        
        const centerScoreEl = document.getElementById('centerScore');
        if (centerScoreEl) {
            centerScoreEl.textContent = newScore;
            // 未來把 pulseCenterScore 也移進來
        }
    });

    // 監聽提示剩餘次數變更
    window.bcEvents.on('state:hintsRemaining', (data) => {
        const hintBtn = document.getElementById('hintBtn');
        const hintCount = document.getElementById('hintCount');
        const hintBtnProxy = document.getElementById('adaptiveHintBtn');
        const hintCountProxy = document.getElementById('adaptiveHintCount');

        const remaining = window.gameState.hintsRemaining;

        if (hintCount) {
            hintCount.textContent = `提示 ${remaining}`;
            if (hintCountProxy) hintCountProxy.textContent = `提示 ${remaining}`;

            if (remaining <= 0) {
                hintCount.className = 'text-sm font-bold text-gray-400 ml-3';
            } else if (remaining <= 1) {
                hintCount.className = 'text-sm font-bold text-red-600 ml-3';
            } else if (remaining <= 2) {
                hintCount.className = 'text-sm font-bold text-orange-600 ml-3';
            } else {
                hintCount.className = 'text-sm font-bold text-blue-600 ml-3';
            }
        }

        const disable = remaining <= 0;
        if (hintBtn) { 
            hintBtn.classList.toggle('opacity-50', disable); 
            hintBtn.classList.toggle('cursor-not-allowed', disable); 
            hintBtn.disabled = disable; 
        }
        if (hintBtnProxy) { 
            hintBtnProxy.classList.toggle('opacity-50', disable); 
            hintBtnProxy.classList.toggle('cursor-not-allowed', disable); 
            hintBtnProxy.disabled = disable; 
        }
    });

    // ====== 小關卡點點進度條初始化 ======
    function renderMiniLevelPlaceholders() {
        const wrap = document.getElementById('levelProgressMini');
        if (!wrap) return;
        const levelCount = window.getLevelCount ? window.getLevelCount() : 10;
        const survival = window.isSurvival ? window.isSurvival() : false;
        
        const cache = renderMiniLevelPlaceholders.__cache || (renderMiniLevelPlaceholders.__cache = { sig: '' });
        const sig = `c:${levelCount}|s:${survival}`;
        if (cache.sig === sig) return;

        // Survival: hide mini progress entirely
        if (!levelCount || survival) {
            wrap.classList.add('hidden');
            if (wrap.childElementCount) wrap.innerHTML = '';
            cache.sig = sig;
            return;
        }

        wrap.classList.remove('hidden');
        if (window.setMiniProgressGridColumns) window.setMiniProgressGridColumns(levelCount);
        
        while (wrap.children.length < levelCount) {
            const dot = document.createElement('div');
            wrap.appendChild(dot);
        }
        while (wrap.children.length > levelCount) {
            wrap.removeChild(wrap.lastElementChild);
        }
        for (let i = 0; i < levelCount; i++) {
            const dot = wrap.children[i];
            dot.className = 'mini-dot bg-gray-200 border-gray-300';
        }
        cache.sig = sig;
    }

    // ====== 連擊進度條初始化 ======
    function ensureComboSegmentsReady() {
        const wrap = document.getElementById('comboSegments');
        if (!wrap) return;
        const targetCount = 8;
        if (wrap.children.length !== targetCount) {
            wrap.innerHTML = '';
            for (let i = 0; i < targetCount; i++) {
                const seg = document.createElement('div');
                seg.className = 'combo-seg';
                wrap.appendChild(seg);
            }
        }
    }

    // 訂聽遊戲狀態來初始化這些 DOM
    window.bcEvents.on('state:playMode', renderMiniLevelPlaceholders);
    window.bcEvents.on('state:currentLevel', renderMiniLevelPlaceholders);
    window.bcEvents.on('state:combo', ensureComboSegmentsReady);


})();
