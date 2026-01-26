    /**
     * @typedef {Object} ScoreRecord
     * @property {string} playerName
     * @property {number} score
     * @property {string} playMode  classic|survival|equip
     * @property {number} createdAt  epoch ms
     * @property {number} [accuracy]
     * @property {number} [timeMs]
     */
    /**
     * @typedef {Object} GameSettings
     * @property {number} volume
     * @property {boolean} showTimeBar
     * @property {boolean} [forceReducedMotion]
     */
    /**
     * @typedef {Object} VerseItem
     * @property {string} book
     * @property {number} chapter
     * @property {number} verse
     * @property {string} text
     * @property {string} rarity common|uncommon|rare
     */
    (function(){
        if (window.BC) return;
        const BC = { utils:{}, perf:{} };
        // Simple debounce
        BC.utils.debounce = function(fn, wait, opts){
            let t, leading = opts && opts.leading, trailing = opts && opts.trailing !== false, lastArgs, leadingCalled = false;
            return function(){
                lastArgs = arguments;
                if (!t && leading && !leadingCalled){ fn.apply(this, lastArgs); leadingCalled = true; }
                clearTimeout(t);
                t = setTimeout(()=>{ t=null; leadingCalled=false; if (trailing) fn.apply(this, lastArgs); }, wait);
            };
        };
        // Performance mark helpers when hash contains 'perf'
        BC.perf.enabled = (location && location.hash && location.hash.includes('perf'));
        BC.perf.mark = (name)=>{ if (!BC.perf.enabled || !performance || !performance.mark) return; try { performance.mark(name); } catch(_) {} };
        BC.perf.measure = (name, start, end)=>{ if (!BC.perf.enabled || !performance || !performance.measure) return; try { performance.measure(name, start, end); } catch(_) {} };
        // Wrap updateLeaderboardDisplay if already defined later
        const wrapLater = () => {
            const fn = window.updateLeaderboardDisplay;
            if (typeof fn === 'function' && !fn.__perfWrapped){
                window.updateLeaderboardDisplay = function(){
                    if (BC.perf.enabled) BC.perf.mark('lb:start');
                    const r = fn.apply(this, arguments);
                    if (BC.perf.enabled) { BC.perf.mark('lb:end'); BC.perf.measure('leaderboardRender','lb:start','lb:end'); }
                    return r;
                };
                window.updateLeaderboardDisplay.__perfWrapped = true;
            }
        };
        window.addEventListener('DOMContentLoaded', wrapLater);
        window.addEventListener('load', wrapLater);
        window.BC = BC;
        window.debounce = BC.utils.debounce;
    })();
