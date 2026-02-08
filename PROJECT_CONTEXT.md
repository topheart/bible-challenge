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
- [x] JS 模組化：將腳本移至 `js/` 子目錄並分類。
- [x] CSS 分離：建立 `css/main.css` 與 `css/themes.css`。
- [x] 根目錄清理：移除 `style.css`, `data/`, `scripts/`, `index_backup.html`。
- [x] 連結更新：`index.html` 與 `sw.js` 路徑修正。
- [x] 工具歸位：`scripts/idb-helper.js` -> `js/utils/idb-helper.js`。

### ✅ Phase 2: 程式碼品質與重構 (Completed)
**目標**：真正的實體檔案拆分 (Physical Decoupling)。

- [x] **重構 `js/ui/cute-hints.js`**。
- [x] **重構 `js/game/engine.js`**
  - [x] 建立 `js/game/timer.js`, `start/score.js`, `metrics.js`。
  - [x] 抽離 `js/game/modes/equip.js` 與 `js/game/modes/survival.js`。
- [x] **Critical Bug Fixes**
  - [x] 解決 "Naked UI" 問題 (Safe Mode SW + Network-Only for CDNs)。
  - [x] 解決 "Refresh Loop" 問題 (Startup logic update)。

### ✅ Phase 3: 效能與 PWA 強化 (Completed)
**目標**：提升載入速度與離線可靠性。

- [x] **載入效能優化**
  - [x] 腳本非同步載入 (`defer` for game logic)。
  - [x] 圖片資源現代化 (PNG -> WebP)。
  - [x] **手機版降溫優化 (Mobile Thermal Throttling)**:
    - 移除背景持續動畫 (Pulse/Bounce)。
    - 禁用高耗能濾鏡 (Backdrop Blur, Text Glow)。
- [x] **Service Worker 健檢**
  - [x] 升級至 v21 (Offline Data Support)。
  - [x] 核心題庫 (`external-verses.json`) 加入預先快取。

### 🛡️ Phase 4: 穩定性與 UX 增強 (Proposed Future)
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
