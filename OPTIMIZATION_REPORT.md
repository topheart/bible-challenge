經夠杯挑戰 — 最佳化總覽（2025-09-23）

本報告彙整此次針對效能、穩定性、資料一致性與 PWA 體驗的優化，並標註驗證方法與後續建議。

一、已完成的修正

1) 成就遙測與資料表對齊（一致性與可維護性）
- 修正 bible-challenge.html 內 sendAchievementRunToSupabase()：
	- 由寫入扁平欄位（answered/accuracy…）改為寫入 metrics(jsonb) 與 achievements(jsonb)；
	- achievements 結構：{ ids: string[], count: number }。
- linkLatestAchievementRunToScore() 與 fetchRecentAchievementRuns() 的排序欄位由 ts 改為 created_at（與 SQL 預設欄一致）。
- computeTierSuggestionFromRuns() 兼容舊資料（unlock_ids[]）與新結構（achievements.ids）。

效益：
- 與 SUPABASE_SCHEMA.sql 一致，避免欄位漂移；
- 讓遙測更具延展性（將來可擴充 metrics 與 achievements 結構）。

2) Service Worker 快取強化（回訪與離線）
- 版本升級：wave1-v7。
- 新增跨網域資產快取：
	- Google Fonts（fonts.googleapis.com 與 fonts.gstatic.com）：
		- 樣式單採用 stale-while-revalidate；字型檔 cache-first。
	- jsDelivr Supabase UMD：cache-first，避免冷啟時外部阻塞。

效益：
- 首屏字型閃爍（FOIT/FOUT）降低；
- 離線或網路波動下仍能載入外部 UMD 客戶端。

3) PWA Manifest 完善
- 新增：id、display_override、orientation、shortcuts；
- icons 加上 purpose: "any maskable"，改善安卓啟動器圖示外框。

效益：
- 桌面安裝體驗更完整；
- 可從捷徑快速進到特定模式。

二、驗證步驟（本機）

1) Service Worker
- 在本機以靜態伺服器開啟專案，進入 Application → Service Workers：
	- 確認 SW 版本為 wave1-v7；
	- 模擬 Offline，重新整理：
		- index.html 與 bible-challenge.html 能離線回應；
		- logo 圖片離線可讀；
		- 先載入過一次後，Google Fonts 與 jsDelivr UMD 離線也可回應快取。
	- 檢查 Cache Storage：
		- bc-core-wave1-v7 應包含 manifest.webmanifest；
		- bc-data-wave1-v7 應已預先快取 external-verses.json 與 equip-course-growth.json（首次離線也可載入題庫）。

2) Supabase 遙測
- 執行一場遊戲，結束時呼叫 finalizeMetrics() + evaluateAll() + sendAchievementRunToSupabase()；
- 至 Supabase SQL/表格查看 achv_runs：
	- 應有新列，created_at 為 now()；
	- metrics 與 achievements 兩欄皆為 JSONB，achievements.ids 與 count 正確；
	- linkLatestAchievementRunToScore(score_id) 能更新最新一列之 score_id。

3) PWA
- 在 Chrome DevTools → Application → Manifest：
	- 無錯誤，icons 顯示 maskable；
	- shortcuts 可見兩項（經典、生存）。

三、尚可優化的方向（建議）

1) 成就系統
- 加入 i18n（將名稱/敘述外抽成字典，利於本地化）；
- 針對 evaluateRealtimeAchievements 設置更細緻的節流（目前 8s 窗口最多 2 次，可視使用者回饋調整）。

2) 數據與分析
- 在 achv_runs.metrics 中加入 question/level 粒度分佈（如答題時間分位數 P50/P90），利於之後 A/B 或門檻調整；
- 在 computeTierSuggestionFromRuns 增加加權視窗（近 7 天較高權重）。

3) Service Worker
- 將 CORE_ASSETS 加入 share-1200x630.svg，避免社群預覽在離線失效。

4) 首屏速度
- 內嵌關鍵 CSS（critical CSS）或以 rel=preload 預載關鍵字型；
- 若頁面體積允許，可把少量啟動畫面 SVG 內嵌以省一次請求。

5) 安全性
- 確認 Supabase RLS 已套用，且前端 projectTag 與 SQL 常數函式 app_project_tag() 一致；
- 若需區分環境（dev/stg/prod），建議以不同 project_tag 或專案分離。

四、風險與回退

- SW 版本升級將清除舊快取；若需回退，將 sw.js 的 VERSION 改回 wave1-v6 並重新部署即可。
- 遙測欄位結構變更為 JSONB 已向下相容（computeTierSuggestionFromRuns 兼容舊 unlock_ids[]）。

五、變更摘要

- bible-challenge.html：修正遙測寫入格式、查詢排序欄位、分析函式相容性。
- sw.js：新增跨網域資產快取策略；版本 v7。
- manifest.webmanifest：新增 id/shortcuts 等欄位、icons purpose。

以上已於本機層級完成靜態檔案調整，若有雲端部署（GitHub Pages），推送 main 後即生效；如需協助進一步自動化測試或 Lighthouse 報告，可續辦。

六、Badge 系統與 Icon 重構（新增）

A. 目標
- 統一所有成就勳章的視覺風格與尺寸，避免 Toast、結算、勳章一覽、詳情頁有不一致；
- 以現有 SVG sprite（<symbol id="achv-*">）為基礎，透過 getAchievementIcon 的「複合渲染」代碼加入外框、輝光、刻紋或高光，達到更大、更精緻的效果；
- 讓 T2–T5 使用同一圖形（以稀有度特效區分），T1 則提供特製版（如明亮晨星的星芒+星核+輝光）。

B. 實作要點
- 新增全域容器 .achv-icon，統一圖示大小與置中方式；
- 所有顯示面（Toast、結算、勳章一覽、詳情）都改用 getAchievementIcon() 回傳的 SVG，避免文字表情或大小不一；
- 稀有度顯示採用內部 .achv-icon-svg.t{dt} class（dt=1..5），對應 CSS 的漸層/陰影效果；
- 主要複合渲染包含：
  - 明亮晨星：星芒 + 星核 + radialGlow；
  - 奔跑不困倦：footprints 加刻紋；
  - 成聖之路：sandals 放大並加鞋底輪廓線；
  - 如鷹展翅：eagle 放大並加翼尖/眼/喙細節；
  - 耐心等候：hourglass2 內部加上下沙層與流沙線；
  - 無瑕無疵：經典鑽石切面線條；
  - 分別為聖：folder 填色；
  - 初熟果子：apple 加色塊與高光（葉/梗高光）。

C. 主要對應（節錄）
- any_speed_t{2..5} → achv-footprints（複合刻紋）
- any_ultra_chain_t{2..5} → achv-eagle（放大+細節）
- any_stability_t{2..5} → achv-sinai（高山）
- c_levels_perfect_t{2..5} → achv-gem（經典鑽石）
- s_time_band_0_30_t{2..5} → achv-hourglass2（內部沙+流沙）
- t1_near_holy → achv-folder（填色）
- t1_morning_star → 星芒+星核複合
- t1_kings_way → achv-sandals（側立放大+鞋底線）
- t1_saints_endurance → achv-dumbbell（放大）
- c_opening_perfect_t{2..5} → achv-apple（高光）

D. 擴充指引
1) 新增成就圖示：
	- 先將 symbol 加入頁面內的 SVG sprite（achv-*）；
	- 在 iconMap 內加入 { id: 'achv-*' } 映射；
	- 如需高級效果，在 getAchievementIcon() 針對該 id 回傳帶有裝飾圖層的複合 SVG。
2) 風格一致性：
	- 優先沿用 .achv-icon 的尺寸與 .achv-icon-svg 的 class，確保與其他面一致；
	- 僅在複合圖層中新增 path/ellipse/gradient，不要直接修改 sprite 以維持可回退性。

E. 驗證
- 以瀏覽器檢視：Toast 彈出、結算面、勳章卡片與詳情頁面之圖示大小一致；
- 使用 prefers-reduced-motion 模式仍可正常顯示（無大型動畫）；
- DevTools Elements 中檢查 .achv-icon-svg.t{dt} 是否隨不同成就帶入 1..5。 

七、手機端效能優化（2025-12-01）

A. 問題
- 手機端進入網頁時，因記憶體不足或主執行緒阻塞導致瀏覽器崩潰並自動重新整理（Crash Loop）。
- 主因為 `external-verses.json`（>20MB）載入後，嘗試進行 `JSON.stringify` 並寫入 `sessionStorage`，導致瞬間記憶體峰值過高與 Quota Exceeded 錯誤。

B. 修正
- 移除 `attemptLoadExternalVerses` 中的 `sessionStorage` 快取機制（讀取與寫入皆移除）。
- 移除 `fetch` 的 `cache: 'no-store'` 選項，允許瀏覽器與 Service Worker 進行快取，減少網路流量。
- 依賴 Service Worker 的 Cache Storage API 處理大檔快取，避免在主執行緒進行大型字串序列化。

C. 效益
- 顯著降低頁面載入時的記憶體峰值。
- 解決低階裝置上的崩潰重整問題。
- 提升首次與回訪載入速度（透過 SW 快取）。

八、導入 IndexedDB 儲存題庫（2025-12-01）

A. 目標
- 進一步優化手機端記憶體使用，避免每次重新整理都需重新解析大型 JSON。
- 使用 IndexedDB 儲存已解析的 JavaScript 物件，而非字串，徹底解決 `JSON.stringify` 帶來的記憶體壓力。
- 提供比 Service Worker 更底層且穩定的離線資料存取方案。

B. 實作
- 新增 `IDBHelper` 工具物件，封裝 IndexedDB 的 `open`, `get`, `set` 操作。
- 修改 `attemptLoadExternalVerses` 流程：
    1. 優先嘗試從 IndexedDB 讀取 `externalVerses`。
    2. 若無資料，則從網路 fetch `external-verses.json`。
    3. Fetch 成功後，將資料寫入 IndexedDB 供下次使用。
- 保持原有的資料正規化（normalization）與索引建立邏輯。

C. 效益
- **零記憶體崩潰風險**：不再需要將 20MB+ 的資料轉為字串，直接存取物件。
- **極速載入**：IndexedDB 讀取速度通常優於從 Cache Storage 讀取並解析 JSON。
- **離線增強**：即使 Service Worker 失效或被清除，IndexedDB 仍能提供資料。

九、進一步效能優化與儲存空間釋放（2025-12-01）

A. 目標
- 解決因雙重快取（Service Worker Cache + IndexedDB）導致的儲存空間浪費。
- 優化主執行緒效能，減少連續答題時的 UI 卡頓。

B. 實作
- **Service Worker 瘦身**：
    - 修改 `sw.js`，移除 `external-verses.json` 的預先快取與攔截邏輯。
    - 讓 `external-verses.json` 完全交由 `IDBHelper` 管理，避免在 Cache Storage 與 IndexedDB 中各存一份（節省約 20MB+ 空間）。
    - 更新 SW 版本號以清除舊快取。
- **主執行緒優化**：
    - 將 `recordAnswer` 中的成就計算 (`evaluateRealtimeAchievements`) 包裹於 `setTimeout(..., 0)`。
    - 確保 UI 渲染（如按鈕回饋、動畫）優先於繁重的成就計算邏輯執行。

C. 效益
- **釋放空間**：使用者裝置不再儲存兩份相同的巨大題庫。
- **操作流暢**：在低階裝置上連續快速答題時，介面反應更靈敏。
