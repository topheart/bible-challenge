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

*最後更新: 2026/03/12*

```text
/ (Root)
├── index.html              # 遊戲主頁 (Entry Point, Module Imports with Defer)
├── manifest.webmanifest    # PWA config
├── sw.js                   # Service Worker v21 (Offline-Capable)
├── css/                    # 樣式表
│   ├── main.css            # 通用樣式與共享規則
│   ├── modals.css          # Modal 結構、共用 topbar、進出場動畫
│   ├── achievements.css    # 勳章目錄、toast、結算勳章卡樣式
│   ├── leaderboard.css     # 主畫面排行榜與完整排行榜 modal 樣式
│   └── themes.css          # 主題與深色模式延伸樣式
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

### 🔧 Phase 4.5: CSS 模組化收斂 (In Progress)

**目標**：降低單一 `main.css` 維護成本，將明確功能域樣式拆出，同時避免破壞既有共享規則。

- [X] `css/modals.css`：抽離 modal shell、topbar、close pill、共用進場動畫。
- [X] `css/achievements.css`：抽離勳章目錄、稀有度卡片、toast、結算勳章區塊。
- [X] `css/leaderboard.css`：抽離主畫面排行榜、完整排行榜 modal、排行榜手機版與 dark theme 細節。
- [X] `index.html`：已改為分別載入 `main.css`、`modals.css`、`achievements.css`、`leaderboard.css`、`themes.css`。
- [ ] 後續可續拆目標：`settings/playerName/settlement` 類 modal 或其他明確功能域，但需保留共享 start screen / shared mode-switch 規則在 `main.css`。

**重要策略（避免再次誤傷）**：

- 若問題屬於排版/動畫/視覺層，優先在 HTML/CSS 修正，不為了純 UI 問題擴張 JS 改動面。
- CSS 拆分只搬「明確屬於單一功能域」的 selector；共用規則維持在 `main.css`。
- 若檔案出現編碼異常或大面積非預期改動，先回到乾淨來源，再做最小重套用，不直接在受損檔上追加修補。

---

## 4. 當前工作階段 (Current Session - 2026/03/12)

### 📋 本次工作進度

**工作時間**：2026年3月12日
**主要焦點**：排行榜/勳章/Modal 視覺修正與 CSS 模組化收斂

#### ✅ 2026-03-12 (Modal 與 CSS 模組化收斂)

- [X] **勳章一覽 modal 手機排版修正**
  - 重新整理 achievements modal header 結構，改為 `modal-topbar + achievements-topbar`。
  - 手機窄螢幕下將分類 tabs 調整為更穩定的排列，不再擠壓標題與關閉按鈕。
- [X] **計分說明 modal 動畫一致化**
  - 讓 `scoreGuideModal` 與其他 modal 使用同一套 popup 進場動畫與 topbar 結構。
- [X] **`main.css` 編碼/內容風險處理**
  - 先前編輯造成 `main.css` 中文註解亂碼與內容膨脹，已確認不是原始檔既有問題。
  - 使用使用者提供的乾淨 CSS 版本復原，再最小量重套必要修正。
  - 當時曾保留恢復備份檔：`css/main.css.pre-restore.bak`；在本輪整理確認不再需要後已刪除。
- [X] **CSS 拆分完成第一輪收斂**
  - 新增 `css/modals.css`、`css/achievements.css`、`css/leaderboard.css`。
  - 將 modal、勳章、排行榜三個高耦合樣式域自 `main.css` 拆出。
  - 保留 `main.css` 中共享規則，例如 start screen 共用卡片視覺、共享 `mode-switch` 規則、部分 reduced-motion 與 modal 共用交集 selector。
- [X] **驗證結果**
  - `index.html`、`css/main.css`、`css/modals.css`、`css/achievements.css`、`css/leaderboard.css` 皆已檢查無錯誤。

#### ✅ 2026-03-12 (LINE WebView / 模式卡 / 手機主選單收斂)

- [X] **LINE / 舊 iPhone WebView 問題改採小批次調查**
  - 為避免一次讀取過多內容導致工作中斷，後續調查改為小範圍搜尋與分段讀檔，不再整份掃描大檔。
  - 目前已確認後續延續時應持續採用此策略，尤其是 `data-loader.js`、`sw.js`、`main.css`、`index.html` 等大檔。
- [X] **Service Worker / 外部題庫載入保護已落地**
  - `index.html`：加入提早執行的 in-app-browser 偵測旗標，包含 `__BC_IS_IN_APP_BROWSER`、`__BC_DISABLE_SW`、`__BC_DISABLE_EXTERNAL_FULL_LOAD`。
  - `js/core/sw-register.js`：WebView / 受限 in-app browser 會尊重 `__BC_DISABLE_SW`，避免不必要的 SW 啟用。
  - `js/core/data-loader.js`：受限 WebView 不再自動做 full external verse loading / background full promotion，降低舊 WebKit OOM / reload 風險。
  - `sw.js`：已與 `index.html` 資產版本重新對齊，並補齊實際載入中的資產到 precache。
  - **狀態**：程式端保護已完成，但仍待實機於 LINE iPhone 11 驗證是否完全解除重整循環。
- [X] **主選單四個模式卡結構與樣式統一**
  - `index.html`：四張模式卡已統一使用 `home-mode-head`、`home-mode-copy-wrap`、`home-mode-title`、`heading-sub`、`mode-kind-badge`。
  - `css/main.css`：已收斂四張卡的 icon / title / subtitle / badge 共用規則，避免前兩張與後兩張各走一套 DOM/CSS。
  - 裝備課程與自訂專區展開後區塊，也已新增 `mode-detail-*` 共用 class，讓展開內容節奏一致。
- [X] **手機版模式卡高度、密度、可視範圍收斂**
  - `css/main.css`：手機版模式卡高度已由較厚版本縮減，降低 padding / gap / title / subtitle / badge 尺寸，目標是盡量讓四張卡不用下滑即可完整導覽。
  - 裝備課程的 `成長班 / 門徒班 / 領袖班` 按鈕字級已再次放大，避免過小難讀。
- [X] **闖關挑戰選中後頂部裁切問題修正**
  - 問題根因不是單一白邊，而是手機版選中狀態仍有 `translateY(-2px)`，外層 `#modeCardBody` 又是 `overflow-hidden`，導致頂部被裁切。
  - `css/main.css`：已為手機版模式卡補上上方緩衝，並覆寫選中狀態 transform 為 `translateY(0)`；同時微調選中陰影，避免上緣被高亮內陰影干擾。
  - **狀態**：CSS 已修正，仍建議後續實機再確認是否完全無裁切；若仍有殘留，下一步可把模式卡容器改為「展開時 visible、收合時 hidden」的裁切策略。
- [X] **文字與按鈕整潔度微調**
  - 分數/排行榜相關視窗中原本的「確認並返回主選單」按鈕已改為「確認並返回」，以避免窄畫面換行。
- [X] **檔案清理檢查結果**
  - 已逐一交叉比對目前可疑冗餘檔案的引用情況。
  - `data/external-verses-old.json` / `data/external-verses-new.json` 仍被 `js/core/data-loader.js` 使用，不可刪。
  - `equip-course-growth.json` 仍被 `js/game/modes/equip.js` 與 `sw.js` 使用，不可刪。
  - `logo/` 內 PNG/WebP 變體仍分別被 `index.html`、`manifest.webmanifest`、`sw.js`、`bootstrap.js`、`start-screen.js` 使用，不可刪。
  - 本輪唯一可安全刪除的冗餘檔案為 `css/main.css.pre-restore.bak`，已移除。

#### 📌 後續延續注意事項

- 後續換裝置續做時，請維持「小批次搜尋 + 小範圍讀檔 + 單點 patch」策略，避免再次因大檔整段讀取造成工作停滯。
- 目前最值得優先實測的項目：
  - LINE iPhone 11 舊 WebView 是否仍有重整循環。
  - 主選單模式卡在手機上是否已真正做到無裁切、無需下滑可看完四張卡。
  - 線上 / 離線 / Ctrl+F5 下，模式卡樣式是否已不再出現舊版快取混用。

#### 📌 後續可接續的拆分邊界

- 下一輪若要繼續模組化，優先順序可考慮：
  - `settings` / `playerName` / `settlement` 等 modal domain
  - 或進一步把明確的 start screen feature-specific 樣式再分類
- 但以下規則暫不建議急拆：
  - 共用 `mode-switch`
  - start screen 共用玻璃卡與背景視覺
  - reduced-motion 與 modal 共用停用規則

---

## 5. 前一工作階段 (Current Session - 2026/03/10)

### 📋 本次工作進度

**工作時間**：2026年3月10日
**主要焦點**：遊戲流程穩定度、切換分頁暫停機制、防連點機制

#### ✅ 2026-03-10 (邊界條件與穩定度優化)

- [X] **切換分頁暫停 (Visibility API)**
  - 偵測 `document.hidden` 自動暫停 `GameTimer` （包含生存模式倒數與一般關卡計時）。
  - 當回到頁面時，將流失的背景時間順移，防止玩家意外死亡。
- [X] **防連續點擊**
  - 在 `js/game/engine.js` 中的核心判題 `handleChapterClick` 加入 `isProcessingAction` 狀態鎖。
  - 給予 `350ms` 的防抖冷卻，避免高頻快速雙擊造成的重複加分與狀態異常。
- [X] **防誤觸關閉 (beforeunload)**
  - 當遊戲啟動且未結束時，攔截意外的「重整/上一頁」行為並依瀏覽器原生行為提示。

#### ✅ 2026-03-06 (UI/UX 翻新與約束建立)

- [X] **主畫面模式選單大改版**
  - 移除生硬的分步字樣 (`Step 1 / Step 2`)，簡化為直覺的「選擇模式」。
  - 引入 Focus Mode（聚焦模式）：被選中的模式卡片會有放大及光暈效果，未選中的則會自動暗化，提升視覺層次。
- [X] **手機版手風琴 (Accordion) 收合體驗**
  - 將手機版的模式列表改為折疊式設計 (`max-height` 轉場搭配 `overflow-hidden`)。
  - 選擇完主模式或子模式（包含裝備層級或自訂書籍）後，面板會像原生 App 般順滑收起，並更新標題（如「已選：生存計時」），騰出螢幕空間。
  - 徹底移除收合後強制下拉滾動 (`scrollTo`) 的粗暴邏輯，讓操作視角留在原地，不再突兀跳動。
- [X] **桌面版切邊排版修復**
  - 修復為了手機版 `overflow: hidden` 導致桌面版選項聚焦陰影被裁切的 CSS bug（使用負 Margin `-mx-4 -mb-4` 等技巧擴充作圖空間）。
- [X] **裝備模式 (Equip Mode) 進度圖示同步修復**
  - 修復第一階段完成後，上方進度橢圓球沒有立刻反應第二關為「進行中（紫色）」的延遲渲染問題（在遞增目前層級後，主動塞入一幀 `equipUpdateProgressUI` 以更新視圖）。
- [X] **專案瘦身與 AI 工具行為紀律 (非常重要)**
  - 清理多餘大檔與腳本（如 `external-verses.json`, `split_db.js`, `split_db.py`）。
  - 已明確將 **「嚴禁使用單獨腳本(Python/Node.js)進行開發操作」** 的規章寫入 AI 的永久記憶（`/memories/preferences.md`），後續無論遇到何種問題，一律用直接編輯功能或原生語言處理，降低破壞環境的風險。

#### ✅ 2026-02-25 (穩定性加固)

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
  - [ ] **離線分數防流失 (Offline Queue)**：在 `leaderboard.js` 實作 IndexedDB 離線緩存，Supabase 斷線或逾時將分數排入背景等待網路恢復補傳。
  - [X] 待補送佇列機制已完成（offline/timeout -> enqueue -> online flush）
  - [X] 已提供三路徑自動化檢查工具（成功/逾時/adapter 不可用）
  - [X] 已提供真實環境只讀健康檢查工具（不寫入線上資料）
  - [X] 已提供一鍵完整同步健康匯總工具（含建議行動）
  - [X] 實際 Supabase 寫入路徑驗證（成功/逾時/離線）
  - [X] 已新增寫入路徑診斷工具（逾時/離線 fallback 預設可跑；實網寫入需明確 opt-in token）
  - [X] 確認成績上傳流程（含 achievements snapshot / telemetry 鏈結）
  - [X] IndexedDB 本地儲存完整性測試（含 fallback 後重啟一致性）
- [X] **P2 跨裝置與行動端體驗**
  - [X] **iOS Autoplay 音效解鎖**：在前端首頁「開始按鈕」上綁定無聲音檔的觸發機制，確保藍牙耳機與 iOS Safari 啟動時即完全喚醒 AudioContext。
  - [X] 第一輪手機適配加固已完成（dvh、44px touch target、小螢幕換行、防 safe-area 裁切）
  - [X] 實機驗證排行榜顯示在各設備上的適配性
  - [X] 驗證 PWA 安裝體驗（Android / iOS WebView）
  - [X] 測試換裝置登入/資料同步
- [X] **P3 效能與離線治理**
  - [X] Service Worker 快取策略驗證（預快取命中率 / 舊版清理）

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
5. **穩定度與邊界條件優化 (2026/03/10)**：
   - **切換分頁暫停 (Visibility API)**：修正切換分頁時時間仍持續流逝的問題，加入全域狀態鎖。
   - **防連續點擊**：在 `engine.js` 的 `handleChapterClick` 加入 350ms 防抖鎖定，解決短時間內雙指點擊造成多重判定。
   - **防誤觸關閉 (beforeunload)**：針對遊玩狀態中意外點擊上一頁或重新整理提供瀏覽器原生攔截。

---

*Last Updated by AI Assistant on 2026-03-10 (Mobile UI/UX Accordion redesign, Equip Mode Progress fix, Strict No-Script Agent constraint, iOS Autoplay, SW Network-First Verification)*
*Created by AI Assistant on 2026-01-23*
