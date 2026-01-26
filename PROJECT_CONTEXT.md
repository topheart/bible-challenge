# 專案概觀與優化藍圖 (Project Context & Roadmap)

此檔案是本專案的「核心上下文文件」，旨在讓不同的 AI 助理或開發者在切換設備/工作階段時，能快速掌握專案全貌與進度。

**給 AI 助理的指令：**
1.  **開始工作時**：優先讀取此檔案，以了解專案架構與當前待辦事項。
2.  **結束工作前**：更新本檔案中的「當前工作進度」與「待辦清單」。

---

## 1. 專案概觀 (Project Overview)
**專案名稱**：經夠盃挑戰 (Bible Challenge)
**類型**：PWA (Progressive Web App) 網頁遊戲
**核心功能**：聖經經文快問快答，包含闖關、生存、裝備成長模式。
**技術堆疊**：
*   **Frontend**：Native HTML5, CSS3, Modern Vanilla JavaScript (ES Modules).
*   **Backend**：Supabase (CDN 引入, 排行榜/遙測), IndexedDB (本地儲存).
*   **Platform**：PWA (Service Worker 快取, Manifest 支援).

### 1.1 核心開發原則 (Core Principles)
**⚠️ 行動裝置優先 (Mobile-First)**
*   **平台相容性**：需在 iOS/Android WebView (LINE/Facebook) 正常運作。
*   **版面限制**：考量動態 URL Bar 高度 (`100dvh`)。
*   **互動體驗**：點擊區域 (Touch Target) 需夠大 (至少 44x44px)。
*   **離線支援**：確保 PWA 離線功能強健。

---

## 2. 當前架構 (Current Structure)
*最後更新: 2026/01/26*

```text
/ (Root)
├── index.html              # 遊戲主頁 (Entry Point, Module Imports)
├── manifest.webmanifest    # PWA config
├── sw.js                   # Service Worker v13 (Updated)
├── css/                    # 樣式表
│   ├── main.css            # 通用樣式 (Tailwind + Custom)
│   └── themes.css          # 排行榜/結算主題樣式
├── js/                     # 程式邏輯 (Modules)
│   ├── core/               # 核心 (utils, startup, audio, data-loader)
│   ├── game/               # 遊戲引擎 (engine, state, config)
│   ├── modules/            # 獨立模組 (achievements, leaderboard)
│   ├── ui/                 # UI 元件 (hints, modals, screens)
│   └── utils/              # 工具 (idb-helper)
└── logo/                   # 圖示資源
```

---

## 3. 2026 優化進度表 (Optimization Roadmap)

### ✅ Phase 1: 模組化與清理 (Completed)
- [x] JS 模組化：將腳本移至 `js/` 子目錄並分類。
- [x] CSS 分離：建立 `css/main.css` 與 `css/themes.css`。
- [x] 根目錄清理：移除 `style.css`, `data/`, `scripts/`, `index_backup.html`。
- [x] 連結更新：`index.html` 與 `sw.js` 路徑修正。
- [x] 工具歸位：`scripts/idb-helper.js` -> `js/utils/idb-helper.js`。

### 🔄 Phase 2: 程式碼品質與重構 (Current Focus)
**目標**：真正的實體檔案拆分 (Physical Decoupling)，解決 `engine.js` 過大問題。

- [x] **重構 `js/ui/cute-hints.js`**
  - 已將遊戲狀態邏輯移至 `js/game/config.js`。
  - 已將設定選單邏輯移至 `js/ui/game-setup.js`。
- [ ] **重構 `js/game/engine.js`** (⚠️ Critical)
  - **現狀**：單一檔案依然過大 (~4800+行)，雖然部分邏輯已模組化，但物理上仍未拆分。
  - **待辦事項**：
    - [ ] 建立 `js/game/timer.js` (抽離計時器邏輯)。
    - [ ] 建立 `js/game/score.js` (抽離分數與 Combo 邏輯)。
    - [ ] 建立 `js/game/metrics.js` (抽離遙測與統計邏輯)。
  - **已完成**：
    - [x] 抽離裝備課程邏輯 (已移至 `js/game/modes/equip.js`)。
    - [x] 抽離生存模式邏輯 (已移至 `js/game/modes/survival.js`)。

### ✨ Phase 2.5: 介面修復與 SEO 優化 (Completed)
- [x] **主選單互動修復**：修正「經典/生存/裝備/自訂」四種模式的按鈕互斥邏輯與視覺變暗效果 (`mode-selection-active`)。
- [x] **社群分享優化**：
  - 更新 OG Image 為深色版本 (`logo1-dark.png`)。
  - 改寫首頁 Meta Title 與 Description，提升分享吸引力。

### 🚀 Phase 3: 效能與 PWA 強化 (Planned)
- [ ] **載入效能優化**
  - [ ] 腳本非同步載入 (`defer` for game logic)。
  - [ ]圖片資源現代化 (PNG -> WebP)。
- [ ] **Service Worker 健檢**
  - **Critical**: 當 Phase 2 拆分檔案後，必須同步更新 `sw.js` 的 `CORE_ASSETS` 清單。
  - 驗證 `external-verses.json` 離線讀取機制。

### 🛡️ Phase 4: 穩定性與 UX 增強 (Future)
- [ ] **離線體驗**：新增常駐型連線狀態燈號 (比起一次性 Toast 更清楚)。
- [ ] **錯誤邊界**：在 `index.html` 加入全域 Error Boundary，防止白畫面。
- [ ] **Accessibility**：Lighthouse 分數優化 (對比度、點擊區域)。

---

## 4. 歷史優化紀錄 (Historical Report)
*(摘要自 2025/09)*
1.  **資料庫**：修正 Supabase 寫入格式為 JSONB。
2.  **PWA**：強化 Service Worker 跨域快取 (Google Fonts)，完善 Manifest。

---
*Created by AI Assistant on 2026-01-23*
