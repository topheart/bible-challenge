# 專案概觀與優化藍圖 (Project Context & Roadmap)

此檔案是本專案的「核心上下文文件」，旨在讓不同的 AI 助理或開發者在切換設備/工作階段時，能快速掌握專案全貌與進度。

**給 AI 助理的指令：**

1. **開始工作時**：優先讀取此檔案，以了解專案架構與當前待辦事項。
2. **更新節奏**：預設在「使用者明確指示結束工作階段」或「完成一個里程碑（P0/P1）」時更新；避免每個小改動都寫入。
3. **例外條件**：若涉及可用性中斷風險（無限循環、白畫面、資料遺失），可即時更新一次以保留關鍵決策脈絡。

### 📌 文件更新策略（防誤導）

- 採用「**低頻高價值**」更新：僅記錄決策、里程碑、風險與下一步，不記錄每個微調細節。
- 單日內多次小修，統一在收工時合併為一筆摘要。
- 待辦清單以優先度（P0→P4）維持，不因小修反覆改寫排序。
- 若新資訊與既有紀錄衝突，先標註「待驗證」，避免覆蓋舊結論造成誤導。

### 🚦 穩定化模式（2026-02-26 起）

- 已啟用 Feature Freeze：停止新增非必要功能，優先做可靠性收斂與複雜度下降。
- 穩定化執行準則已整併於本檔（本檔即唯一紀錄來源）。
- 解凍前置條件：
  - **[✅ 2026-03-05 已達成]** Supabase 套用最新版 [setup_supabase.sql](setup_supabase.sql)
  - `__runSyncHealthSuite()` 連續驗證通過（ok=true 且 effective failed=0）
  - 無明顯退化趨勢（`__diagSyncHealthHistory()`）

#### 穩定化執行準則（整併版）

- **核心目標**：先確保資料不遺失/不重複/不卡死，再做複雜度收斂，最後才考慮擴充。
- **凍結範圍**：解凍前不新增 UI 功能、不新增遊戲機制、不擴張 diagnostics 對外 API（除非為風險移除必需）。
- **驗收標準（DoD）**：
  - DB schema 已套用最新版 [setup_supabase.sql](setup_supabase.sql)
  - `__runSyncHealthSuite()` 結果穩定 `ok=true`
  - `queueBacklog/achvBacklog = 0`
  - `scoreFailedEffective/achvFailedEffective = 0`
  - `__diagSyncHealthHistory({limit:15})` 無退化趨勢
- **變更治理（三問）**：
  1. 這次是否明確降低風險？
  2. 失敗時是否可一步回退？
  3. 是否存在更小改法？
     若任一為否，延後該改動。
- **固定順序**：
  1. 先完成 SQL 對齊與健康檢查
  2. 再做可靠性收斂（failed queue / timeout / fallback）
  3. 再做診斷分級與複雜度下降
  4. 最後才做 UX/功能優化

---

## 1. 專案概觀 (Project Overview)

**專案名稱**：經夠盃挑戰 (Bible Challenge)
**類型**：PWA (Progressive Web App) 網頁遊戲
**核心功能**：聖經經文快問快答，包含闖關、生存、裝備成長模式。
**技術堆疊**：

* **Frontend**：Native HTML5, CSS3, Modern Vanilla JavaScript (ES Modules).
* **Backend**：Supabase (CDN 引入, 排行榜/遙測), IndexedDB (本地儲存).
* **Platform**：PWA (Service Worker 快取, Manifest 支援).

### 1.1 核心開發原則 (Core Principles)

**⚠️ 行動裝置優先 (Mobile-First)**

* **平台相容性**：需在 iOS/Android WebView (LINE/Facebook) 正常運作。
* **版面限制**：考量動態 URL Bar 高度 (`100dvh`)。
* **互動體驗**：點擊區域 (Touch Target) 需夠大 (至少 44x44px)。
* **離線支援**：確保 PWA 離線功能強健。

---

## 2. 當前架構 (Current Structure)

*最後更新: 2026/02/04*

```text
/ (Root)
├── index.html              # 遊戲主頁 (Entry Point, Module Imports with Defer)
├── manifest.webmanifest    # PWA config
├── sw.js                   # Service Worker v21 (Offline-Capable)
├── css/                    # 樣式表
│   ├── main.css            # 通用樣式 (Tailwind + Mobile Optimizations)
│   └── themes.css          # 排行榜/結算主題樣式
├── js/                     # 程式邏輯 (Modules)
│   ├── core/               # 核心 (utils, startup, audio, data-loader)
│   ├── game/               # 遊戲引擎 (engine, metrics, score, timer)
│   ├── game/modes/         # 遊戲模式 (equip, survival)
│   ├── modules/            # 獨立模組 (achievements, leaderboard)
│   ├── ui/                 # UI 元件 (hints, modals, screens)
│   └── utils/              # 工具 (idb-helper)
└── logo/                   # 圖示資源 (WebP + PNG fallback)
```

---

## 3. 2026 優化進度表 (Optimization Roadmap)

### ✅ Phase 1: 模組化與清理 (Completed)

- [X] JS 模組化：將腳本移至 `js/` 子目錄並分類。
- [X] CSS 分離：建立 `css/main.css` 與 `css/themes.css`。
- [X] 根目錄清理：移除 `style.css`, `data/`, `scripts/`, `index_backup.html`。
- [X] 連結更新：`index.html` 與 `sw.js` 路徑修正。
- [X] 工具歸位：`scripts/idb-helper.js` -> `js/utils/idb-helper.js`。

### ✅ Phase 2: 程式碼品質與重構 (Completed)

**目標**：真正的實體檔案拆分 (Physical Decoupling)。

- [X] **重構 `js/ui/cute-hints.js`**。
- [X] **重構 `js/game/engine.js`**
  - [X] 建立 `js/game/timer.js`, `start/score.js`, `metrics.js`。
  - [X] 抽離 `js/game/modes/equip.js` 與 `js/game/modes/survival.js`。
- [X] **Critical Bug Fixes**
  - [X] 解決 "Naked UI" 問題 (Safe Mode SW + Network-Only for CDNs)。
  - [X] 解決 "Refresh Loop" 問題 (Startup logic update)。

### ✅ Phase 3: 效能與 PWA 強化 (Completed)

**目標**：提升載入速度與離線可靠性。

- [X] **載入效能優化**
  - [X] 腳本非同步載入 (`defer` for game logic)。
  - [X] 圖片資源現代化 (PNG -> WebP)。
  - [X] **手機版降溫優化 (Mobile Thermal Throttling)**:
    - 移除背景持續動畫 (Pulse/Bounce)。
    - 禁用高耗能濾鏡 (Backdrop Blur, Text Glow)。
- [X] **Service Worker 健檢**
  - [X] 升級至 v21 (Offline Data Support)。
  - [X] 核心題庫 (`external-verses.json`) 加入預先快取。

### 🛡️ Phase 4: 穩定性與 UX 增強 (Proposed Future)

- [ ] **離線體驗**：新增常駐型連線狀態燈號 (比起一次性 Toast 更清楚)。
- [ ] **錯誤邊界**：在 `index.html` 加入全域 Error Boundary，防止白畫面。
- [ ] **Accessibility**：Lighthouse 分數優化 (對比度、點擊區域)。

---

## 4. 當前工作階段 (Current Session - 2026/02/25)

### 📋 本次工作進度

**工作時間**：2026年2月25日
**主要焦點**：排行榜配置、工作進度管理、避免等待卡死

#### ✅ 已完成

- [X] 確認 `leaderboard-config.js` Supabase 連接配置完整
  - URL: `https://kkbwoahtwfdirqsgyqda.supabase.co`
  - 表名稱：`scores` (已配置完整欄位映射)
  - 支援 achievements, achievements runs telemetry
  - 允許 Replay saves (`allowReplaySaves: true`)
- [X] 驗證 `index.html` 關鍵配置
  - PWA manifest 與 Service Worker 整合正確
  - Supabase 客戶端延遲載入（僅在需要時載入）
  - 預連接 (preconnect) 已設置優化
- [X] 確認專案結構完整性
- [X] **排行榜讀取防卡死修正（2026-02-25 本次追加）	**
  - [X] `js/core/bootstrap.js` 新增 `LEADERBOARD_ONLINE_TIMEOUT_MS = 7000`
  - [X] `js/modules/leaderboard.js`：`loadLeaderboard()` 對 `window.Leaderboard.load()` 加入 Promise timeout race
  - [X] 遠端逾時/失敗時，自動回退本機 leaderboard 快取，避免 UI 長時間 `aria-busy`
  - [X] `js/game/engine.js`：開發者補種流程 (`6666`) 的遠端讀取加上 timeout fallback
  - [X] `js/ui/leaderboard-ui.js`：`saveScore()` 的線上儲存加入 timeout race，逾時直接回退本機儲存
  - [X] `js/game/engine.js`：開發者補種 (`6666`) 線上寫入加入 timeout race，避免批次補種卡住
- [X] **排行榜 UI 手機適配加固（2026-02-25 本次追加）**
  - [X] `css/main.css`：`fullLeaderboard` 視窗高度由 `vh` 補強為 `dvh`（保留雙寫 fallback）
  - [X] `css/main.css`：排行榜相關操作元件（tab/返回/模式切換）統一最小觸控尺寸 `44x44`
  - [X] `css/main.css`：小螢幕下排行榜標頭區塊改為可換行，避免按鈕擠壓與溢位
  - [X] `css/main.css`：`fullLeaderboardModal` 補上安全區（safe-area）上下內距
- [X] **PWA / 啟動穩定性加固（2026-02-25 本次追加）**
  - [X] `js/core/sw-register.js`：`controllerchange` 改為「單次重整保護 + 12 秒節流」，避免重整循環
  - [X] 新增 `css/themes.css` 佔位檔，修正 `index.html` / `sw.js` 既有引用造成的 404 與快取噪音
- [X] **排行榜最終一致性加固（2026-02-25 本次追加）**
  - [X] `js/core/bootstrap.js`：新增 `PendingScoreSync`（待補送佇列）
  - [X] 線上儲存失敗/逾時時，紀錄自動入佇列（同時本機落地）
  - [X] 監聽 `online` 與 `leaderboard:adapter-ready` 事件自動 flush，恢復連線後補送
  - [X] `js/core/bootstrap.js`：待補送新增自動退避重試（5s → 60s）與 enqueue 後快速 flush 觸發
  - [X] `js/modules/diagnostics.js`：新增 `__diagLeaderboardSyncState()` / `__runLeaderboardSyncPathTest()`，可驗證成功/逾時/adapter 不可用三路徑
  - [X] `js/modules/achievements.js` + `js/modules/leaderboard.js`：telemetry 鏈結改為優先使用明確 run id，降低錯綁機率
  - [X] `js/core/bootstrap.js`：新增 `PendingAchvLinkSync`，成就 run-to-score 鏈結失敗可排隊重試
  - [X] `js/modules/diagnostics.js`：新增 `__runSupabaseReadHealthCheck()`（真實環境只讀健康檢查，含 timeout）
- [X] **首局啟動可用率與體感優化（2026-02-25 本次追加）**
  - [X] `js/core/data-loader.js`：`full` 未就緒時允許分片先行（shard-first），背景補齊 `full`
  - [X] `js/ui/book-selection.js`：開始按鈕加入載入中狀態（含 `aria-busy`）、去重寫入與短期快取，降低高頻重繪
  - [X] `js/game/engine.js`：模式選擇後預熱題庫；`startGame()` 加入題庫守門與防重入
  - [X] `js/game/engine.js`：倒數流程新增 watchdog / interval 清理，避免黑幕或啟動鎖殘留
  - [X] `js/game/engine.js`：首題先渲染、非關鍵 UI 延後到下一幀，壓縮首局進場延遲
  - [X] `js/modules/diagnostics.js`：新增外部題庫載入與 start-flow 狀態診斷欄位
  - [X] 2026-02-25 實機診斷結果：
    - `__runAppSanityCheck()` -> `ok: true`
    - `serviceWorker.controlled: true`（首次接管修復驗證通過）
    - `startFlow.active: false`、`hasCountdownInterval: false`、`hasWatchdog: false`
    - `startPerf.externalLoading: false`，題庫狀態穩定
- [X] **P1 排行榜補送去重與可觀測性強化（2026-02-25 本次追加）**
  - [X] `js/core/bootstrap.js`：`PendingScoreSync` 新增 synced-key 快取（7 天窗口）與 `markSynced/isSynced/getState`
  - [X] `js/core/bootstrap.js`：補送流程增加 queue dedupe key，避免重複入列與逾時重送重複寫入
  - [X] `js/modules/leaderboard.js`：線上保存新增 `client_record_id` 去重查詢；命中去重時標記已同步
  - [X] `js/modules/leaderboard.js`：保存成功後回寫 `markSynced`，降低 timeout race 造成的重複插入風險
  - [X] `js/modules/diagnostics.js`：`__diagLeaderboardSyncState()` 新增 flushing / retry / syncedKeyCount / lastFlushError 指標
  - [X] `js/core/bootstrap.js`：`PendingAchvLinkSync` 新增 linked-key 快取（7 天窗口）與 `markLinked/isLinked/getState`
  - [X] `js/modules/leaderboard.js`：run-to-score 直接鏈結成功時回寫 `PendingAchvLinkSync.markLinked`
  - [X] `js/modules/diagnostics.js`：新增 achv link queue 狀態（queueLength/flushing/retry/linkedKeyCount/lastFlushError）
  - [X] `js/modules/diagnostics.js`：新增 `__runAchvLinkSyncPathTest()`，可驗證 success/failure/API-unavailable 三路徑
  - [X] `js/core/bootstrap.js`：分數/成就補送佇列新增老化清理（stale queue item）與 poison item 隔離（max attempts）
  - [X] `js/core/bootstrap.js`：新增 failed queue 儲存桶與累計計數（totalFlushed/totalFailed）
  - [X] `js/modules/diagnostics.js`：`__diagLeaderboardSyncState()` 新增 failedQueueLength 與累計指標
  - [X] `js/modules/diagnostics.js`：新增 failed queue 維運 API：
    - `__diagSyncFailedQueues({ limit })`
    - `__clearSyncFailedQueues({ target: 'score|achv|all', dryRun })`
    - `__requeueFailedSyncItems({ target: 'score|achv|all', limit })`
  - [X] `js/modules/diagnostics.js`：`__runLeaderboardSyncPathTest()` / `__runAchvLinkSyncPathTest()` 新增 poison item 隔離驗證（max attempts -> failed queue）
  - [X] `js/modules/diagnostics.js`：新增 `__runSyncHealthSuite({ includePathTests, failedQueueLimit })` 一鍵匯總（sync state + failed queue + 行動建議，可選附帶 path tests）
  - [X] `js/modules/diagnostics.js`：新增 `__runSupabaseWritePathCheck({ runLiveWriteProbe, confirmToken })`，預設驗證 timeout/offline fallback，並提供明確 token 才執行實網寫入探針
  - [X] `js/modules/diagnostics.js`：`__runSyncHealthSuite()` 已預設整合 write-path check（不含實網寫入），回傳 writePath 與 writePathOk 摘要
  - [X] `js/modules/diagnostics.js`：`__runSyncHealthSuite()` 新增有效 failed 判定（可忽略 `diag-*` 殘留）與診斷殘留提示
  - [X] `js/modules/diagnostics.js`：新增 `__clearDiagnosticFailedSyncItems()`，可精準清理診斷殘留 failed 項目（不影響真實失敗）
  - [X] `js/modules/diagnostics.js`：`__runSupabaseWritePathCheck()` 預設 `preserveState: true`，測試後自動還原 queue/failed 狀態，避免污染
  - [X] `js/modules/diagnostics.js`：`__diagSyncFailedQueues()` 擴充輸出 `recordId/playerName/playMode/score`、`diagnostic` 標記、`reasonStats` 與 effective count，提升故障追查效率
  - [X] `js/modules/diagnostics.js`：`__runSyncHealthSuite()` `actions` 已改為依 `reasonStats` 產生精準建議（timeout/network/adapter/poison）並自動去重
  - [X] `js/modules/diagnostics.js`：新增同步健康歷史快照（`__diagSyncHealthHistory()` / `__clearSyncHealthHistory()`），`__runSyncHealthSuite()` 每次執行自動記錄最近 80 筆
  - [X] `js/modules/diagnostics.js`：同步健康歷史儲存改為 `__bcStorage` + `localStorage` fallback，避免 `count: 0` 假陰性
  - [X] `setup_supabase.sql`：已對齊目前程式欄位（`client_record_id`、`avg_*`、`perfect_answer_count`、`max_combo_reached`、`combo_total_bonus`）並補 `pgcrypto` extension 與對應非負檢查
  - [X] `js/modules/diagnostics.js`：新增 `__runSupabaseSchemaReadinessCheck()`，即使暫時無法貼 SQL 也可先檢查 schema 對齊缺口
  - [X] `__runSyncHealthSuite()` 已整合 schema readiness（`includeSchemaCheck`），避免在 schema 未對齊時誤判健康
  - [X] schema readiness 已改為「核心必備 / 可降級欄位」兩層判定；`client_record_id` 缺失會標記 degraded 而非阻斷
  - [X] `__runSupabaseSchemaReadinessCheck()` 改為重用單一 Supabase client（自訂 storageKey），避免重複 GoTrueClient 警告
  - [X] `__runSupabaseSchemaReadinessCheck()` 對已知 optional 缺失欄位採快取跳過（可 `forceCheckOptional` 強制重測），降低重複 400 噪音
  - [X] `js/core/startup.js`：點擊/按鍵跳過片頭改為穩定淡出（WAAPI 優先，transition 後備），修復瞬間關閉問題
  - [X] `js/ui/book-selection.js`：開始按鈕主文字改為顯示當前模式（開始闖關/開始生存/開始裝備課程/開始自訂練習）
  - [X] `js/ui/book-selection.js`：開始按鈕文案更新為「開始闖關挑戰 / 開始生存計時」，並加入模式色調強化（classic/survival/equip/custom）
  - [X] **題庫稀有度分批審查與直接套用（2026-02-26）**
    - [X] 針對 66 卷按批次（每批 8 卷）重標 `common/uncommon/rare`
    - [X] 主檔與分檔同步更新：`external-verses.json`、`data/external-verses-old.json`、`data/external-verses-new.json`
    - [X] 補齊 `uncommon` 層並修正新約 `rare` 過低問題（新約 rare 由 0.97% 提升至 10.28%）
    - [X] 產出審查報告：`data/rarity-review-report.md`
  - [X] **裝備課程 UX/流程穩定化（2026-02-26，本輪完整收斂）**
    - [X] 統計定義修正：`完美答題數` 改為 `firstTryCorrectCount`（移除 `noHintCorrectCount` 回退誤用）

      - 影響檔案：`js/ui/leaderboard-ui.js`
    - [X] 主選單模式卡互動修正：未選模式由「近鎖定」改為「可切換弱化」

      - 影響檔案：`css/main.css`
    - [X] 裝備題目輪替優化：避免連續同書卷（改以 swap index 避免後續重複）

      - 影響檔案：`js/game/modes/equip.js`
    - [X] 裝備流程可視化：新增 1-2-3 stepper 並與 phase 同步

      - 影響檔案：`index.html`、`css/main.css`、`js/game/modes/equip.js`
    - [X] 第三階段答對回饋加強：

      - [X] 新增 `equip-sorter-correct-hit` 命中特效（含勾勾彈出）
      - [X] 每步答對後延遲重繪（約 320ms）讓效果可見

      - 影響檔案：`css/main.css`、`js/game/modes/equip.js`
    - [X] 題目進度卡重排：改卡片化資訊結構（KV/進度條/片段 chips）並補齊桌機質感

      - 影響檔案：`js/ui/leaderboard-ui.js`、`css/main.css`
    - [X] 特效座標防呆：修復偶發星星爆發跑到螢幕左上角

      - 作法：`getEquipEffectRect()` 僅接受有效 rect，無效時回退
      - 影響檔案：`js/game/modes/equip.js`
    - [X] 防洩題機制：

      - [X] phase1 未揭露前，書卷顯示 `???`（`equipBookRevealed`）
      - [X] phase2 未答對前，章節顯示 `???`（`equipChapterRevealed`）

      - 影響檔案：`js/game/modes/equip.js`、`js/ui/leaderboard-ui.js`
    - [X] 手機版面收斂（節省空間）：

      - [X] 先移除題目進度外層綠底卡（保留內容）
      - [X] 進一步隱藏裝備階段區：`#equipStepProgress`、`#equipStageBadge`、`#equipSubtitle`、`.equip-phase-pill`

      - 影響檔案：`css/main.css`
    - [X] 加分可見性與切換時序修正（最新）：

      - [X] `showScoreAnimation` 一般加分浮字改為固定定位於全域層，避免卡片重繪時被一起移除
      - [X] phase3 完全答對後切關停留延長至 `900ms`，確保玩家可讀取進度資訊

      - 影響檔案：`js/game/score.js`、`js/game/modes/equip.js`
    - [X] 本輪所有涉及檔案皆完成語法/診斷檢查（No errors found）

### 🧭 裝備模式交接備忘（下一裝置接手必讀）

- 主要流程控制點在 `js/game/modes/equip.js`：`renderEquipPhase1/2/3`、`handleEquipChapterChoice()`、`handleEquipSorterPick()`。
- 題目進度卡內容在 `js/ui/leaderboard-ui.js` 的 `updateAdaptiveStatus()`；若調整文案/欄位，先確認 `equipBookRevealed`/`equipChapterRevealed` 不被破壞。
- 加分浮字渲染在 `js/game/score.js` 的 `showScoreAnimation()`；目前已避開「掛在按鈕節點」造成的重繪消失問題。
- 手機裝備階段資訊目前屬「完全隱藏策略」：若要恢復，請從 `css/main.css` 的 `@media (max-width: 760px)` 區塊回調。
- 若玩家反映「切關仍太快」，可先微調 `equip.js` 內 `completeHoldMs`（目前 `900`）再觀察體感。

### 🛑 核心架構保護政令 (2026-03-05 頒布，極度重要)

- **嚴禁任意拆解 `engine.js` 與 `timer.js`**：2026-03-05 發生了因前次 AI 過度切分檔案導致 `GameTimer is not defined` 的毀滅性崩潰，導致遊戲機制與下一關完全卡死。目前已手動從 `20260227` 穩定版完整還原這兩個核心。**除非有具體 Bug，否則不得為「整理」而重構這些檔案**。

### 🎯 全專案優化優先順序（執行準則）

> 後續任務一律依此順序處理，除非使用者明確指定插隊。

1. **P0 可用性 / 防中斷**（最高）

- 啟動循環、白畫面、無限等待、資料遺失風險

2. **P1 核心流程可靠性**

- 排行榜讀寫一致性、離線回退、錯誤可觀測性

3. **P2 跨裝置與行動端體驗**

- 觸控目標、視區（dvh/safe-area）、WebView 相容

4. **P3 效能與資源治理**

- 快取策略、載入路徑、不必要請求與重繪

5. **P4 可維護性與文件交接**

- Context 更新、設定集中化、遷移註記

#### 📝 待辦清單 (To-Do for Next Session)

- [ ] **P1 核心流程可靠性（下一優先）**
  - [X] 待補送佇列機制已完成（offline/timeout -> enqueue -> online flush）
  - [X] 已提供三路徑自動化檢查工具（成功/逾時/adapter 不可用）
  - [X] 已提供真實環境只讀健康檢查工具（不寫入線上資料）
  - [X] 已提供一鍵完整同步健康匯總工具（含建議行動）
  - [ ] 實際 Supabase 寫入路徑驗證（成功/逾時/離線）
  - [X] 已新增寫入路徑診斷工具（逾時/離線 fallback 預設可跑；實網寫入需明確 opt-in token）
  - [ ] 確認成績上傳流程（含 achievements snapshot / telemetry 鏈結）
  - [ ] IndexedDB 本地儲存完整性測試（含 fallback 後重啟一致性）
- [ ] **P2 跨裝置與行動端體驗**
  - [X] 第一輪手機適配加固已完成（dvh、44px touch target、小螢幕換行、防 safe-area 裁切）
  - [ ] 實機驗證排行榜顯示在各設備上的適配性
  - [ ] 驗證 PWA 安裝體驗（Android / iOS WebView）
  - [ ] 測試換裝置登入/資料同步
- [ ] **P3 效能與離線治理**
  - [ ] Service Worker 快取策略驗證（預快取命中率 / 舊版清理）

### 🔁 AI 工作防卡死規範（交接重點）

- 不主動使用 `get_changed_files`；僅在使用者明確要求 Git 狀態時才執行。
- 讀取現況優先順序：`PROJECT_CONTEXT.md` → `read_file`（目標檔）→ `grep_search/semantic_search`（關鍵流）。
- 若涉及遠端資料讀取（例如 Supabase leaderboard），一律加 timeout + fallback，禁止無界等待。
- 若出現「Preparing...」超過可接受時間，先終止該路徑並改走本機 fallback，再記錄到本檔。
- **⚠️ 終端機癱瘓應對**：若 `run_in_terminal` 指令回傳空值或無限掛起（只剩下 `>> `），立即放棄終端機操作！改用原生 MCP 工具（`list_dir` / `read_file` / `file_search`）進行檔案系統對接，嚴禁重複嘗試終端機指令刷爆額度。

### 🛠️ 工具建議（避免無限循環）

**⚠️ 不建議使用 `get_changed_files` 工具**

- 原因：在大型工作區或複雜 Git 狀況下易卡住
- 替代方案：
  - 使用 `read_file` 直接檢查檔案內容
  - 使用 `semantic_search` 了解程式邏輯
  - 手動執行 `git status` 或 `git diff` (在終端機中)

---

## 5. 歷史優化紀錄 (Historical Report)

*(摘要自 2025/09)*

1. **資料庫**：修正 Supabase 寫入格式為 JSONB。
2. **PWA**：強化 Service Worker 跨域快取 (Google Fonts)，完善 Manifest。
3. **重大災難復原 (2026/03/05)**：還原被錯誤拆解的 `engine.js` 與 `timer.js`，修復遊戲崩潰，並建立核心變更防護條款。
4. **單局成就系統全面重構 (2026/03/05)**：
   - **核心轉型**：廢除「長期累計成就」，改為純單局 Roguelike 計算方式（高標保底機制，中途達標不因最終結算被洗掉而丟失）。
   - **結算畫面升級**：T1/T2 高階成就大圖置頂展示，T3~T5 以小型網格呈現。並**全面取消「隱藏成就（Secret）」的機制**，所有條件皆開誠布公。
   - **亂碼與腳本防雷**：全面停止在終端機使用 PowerShell 或 Python `echo/replacement` 寫入程式碼的習慣。因 Windows 編碼因素與終端截斷極易導致「中文與全形字元」變為亂碼 (Mojibake)。一律使用原生 `replace` 工具編輯。

---

*Last Updated by AI Assistant on 2026-03-05 (Session handoff updated: Single-Session Roguelike Achievements, UI Perf fix, Encoding Safe Protocols)*
*Created by AI Assistant on 2026-01-23*
