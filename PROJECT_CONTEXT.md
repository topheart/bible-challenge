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

### 裝備課程與成就盤點（v76–v79，持續進行）

- 裝備課程第二或第三階段使用提示後，即使全數答對也不再標記為「完美」；無可用提示目標時不消耗提示，也不影響完美狀態。一般完成與完美完成仍都計入完成率，分數計算不變。
- 三個班級題庫分別為 18、20、17 筆；已檢查經文片段非空且班級內可見片段無重複。此檢查不代表所有遊戲流程或題庫內容皆無問題。
- 成就規則由使用者選擇方案 C：v77 起「聖潔器皿」及「分別為聖」的命中率改為首次無提示答對題數除以所有已作答的不同題目數。提示題及重試答對的題目仍列入分母，但不計入分子；原有比例、題數、速度及生存關數門檻維持不變，歷史成就不重算。成就說明同步更新；無提示作答題數及無提示答對平均時間的原有計算不變。
- v78 生存成就修復：延遲的倒數回呼原本只記錄最後一個剩餘秒數，使同一條倒數曲線在不同回呼頻率下產生不同波動值，可能影響「風平浪靜」。現在逐秒補記實際流逝至逾時的倒數採樣，不計入逾時後的時間；成就門檻不變。此情境以受控計時與加秒模擬測試，尚未實測真機排程。
- 「如鹿切慕溪水」由使用者選擇方案 C：保留最大連擊至少 15 的門檻，任一連續答對至少 15 題的完整區間內有至少 5 題在 2 秒內即符合；不再只檢查首次連對的前 15 題。文案已同步更新，歷史成就不重算。
- 回歸驗證：全部 279 項測試通過，涵蓋 12 組階梯及 12 項 T1 單項成就的條件邊界、模式／重玩／最低作答限制、瀕死回升計數、生存倒數延遲採樣與超時，以及部分成就指標流程；`achievements.js`、`survival.js`、`sw.js` 語法及題庫 manifest 檢查通過。這些是條件函式與模擬指標測試，不等於所有實際遊戲流程均已完成驗證。
- 隔離瀏覽器驗證受環境限制無法完成：建立獨立 context 被拒絕，後續隔離頁無法完成腳本載入；臨時本機伺服器已停止，未操作既有使用者頁面或正式 Supabase。
- 尚不能保證裝備課程及成就完全沒有嚴重問題；其餘成就條件、真機流程、跨分頁同步與真實離線更新仍需持續驗證。Supabase 僅允許唯讀及模擬測試，不寫入正式測試資料或自動重排失敗佇列。

### 🚦 穩定化模式（2026-02-26 起）

- 已啟用 Feature Freeze：停止新增非必要功能，優先做可靠性收斂與複雜度下降。
- 穩定化執行準則已整併於本檔（本檔即唯一紀錄來源）。
- 2026-11-06 穩定化修復：
  - 修正生存模式誤套用關卡上限、背景暫停時計時不一致與生存倒數首個 tick 延遲計算。
  - 題庫依所選範圍載入；完整題庫須包含新舊約所有書卷，舊快取先驗證後使用；IndexedDB 寫入以交易完成為準。
  - Service Worker 快取改依應用範圍隔離，離線缺少 JSON 時回傳錯誤，並快取 Tailwind CDN 供已預載的裝置離線使用。
  - 回歸測試：`node --test tests\stability.test.js`。離線遊戲需先成功載入並儲存題庫及必要資源；LINE 等內建瀏覽器停用 Service Worker 和 IndexedDB，不能保證離線可用。
  - 同步佇列修正：避免同步期間加入的成績與連結被覆寫；滿載或無法保存失敗佇列時不再靜默移除舊項目。手動重排失敗項目時只移除成功重排者，並重設成績重試狀態。
  - 排行榜修正：合併重複載入、逾時時取消查詢；線上寫入失敗或 adapter 不可用時保留本機成績與待同步項目，修正本機顯示及個人名次計數。
  - 同步回歸測試：`node --test tests\sync.test.js tests\stability.test.js`。模擬連線失敗的瀏覽器測試中，12 秒內的排行榜請求由 19 次降至 6 次；已驗證本機成績顯示。
  - **待處理**：原有同步政策在成績重試 3 次或排隊超過 72 小時後會移至失敗佇列，不會自動恢復；服務恢復後需使用診斷工具檢查及重排。完整題庫在 LINE/iOS WebView 的記憶體用量仍需真機驗證；線上資料同步亦需可連線的測試環境驗證。
  - 遊戲流程檢查：修正裝備課程換題時可能重新使用已完成題目，以及退出或重開後舊裝備課程的題庫載入、抽卷與切關回呼可能干擾新遊戲；章節選項亦避免相同文字對應不同答案。
  - 修正返回主選單後闖關／生存模式的舊切關計時器繼續執行；修正分數狀態與動畫重複加到畫面，以及生存模式零分答對不補秒、答對事件傳出錯誤題目索引。
  - 瀏覽器驗證裝備課程答題後畫面分數與實際分數一致；生存模式模擬兩次失誤後零分答對，確認補秒並清除該題扣秒紀錄。新增遊戲流程、裝備、計分顯示與生存答題回歸測試；更新腳本快取版本。
  - 計分明細修復：各模式記錄實際基礎分、得分題目失誤扣分、連擊、時間與關卡獎勵；不再反推時間獎勵或顯示未發放的提示獎勵。裝備課程按實際得分題目累計，不以完成關卡數推算。
  - 舊紀錄缺少完整分項或分項與總分不符時，顯示無法準確呈現明細，不嘗試還原。新的排行榜紀錄使用既有 `question_snapshot` JSONB 保存分項；關閉題組快照時只保存分項，不提供同題重玩。舊 schema fallback 若無法保存分項會發出警告。
  - 回歸驗證：七個 `tests\*.test.js` 共 68 項通過，39 個 JavaScript 檔案通過語法檢查；瀏覽器完成一關裝備課程，明細加總與總分一致。Supabase 帳號暫停，遠端分項保存僅以 mock 驗證，尚未實測真實資料庫。
  - 同題重玩檢查與修復：
    - 結算紀錄與排行榜共用題組快照建立方式，保存完整多關題組；重玩切關不再依賴即時題庫餘量，結束時機、進度與答對率按已保存題組計算。
    - 重玩會重設上一局的模式、關卡結束旗標、已選題目與連擊等狀態；從全排行榜重玩時關閉兩層視窗，結束後確認能返回主選單。新遊戲亦重設選題狀態。
    - 缺少或損壞的快照會明確提示且不啟動；舊紀錄若僅保存部分題目，提醒玩家只能重玩已保存的題組，無法還原未保存的關卡。
    - 八個測試檔共 81 項通過，40 個 JavaScript 檔案通過語法檢查；瀏覽器以隔離的模擬紀錄完成兩關重玩、確認結算與返回主選單，並驗證全排行榜視窗關閉。未向雲端寫入測試成績。
  - 生存模式與延遲計時器檢查：
    - 失誤扣光剩餘時間時，等本次作答及失誤統計完成後才結算；防止最後失誤遺漏，遊戲結束後亦不可繼續作答。
    - 作答前同步已流逝的生存倒數，避免延遲觸發的倒數回呼讓逾時作答得分；回呼提前觸發時不再憑空扣掉一秒。
    - 闖關／生存啟動與關卡計時器的延遲回呼會檢查所屬局次與畫面狀態，避免返回主選單、切換模式、重玩或結算後干擾其他遊戲。
    - 九個測試檔共 96 項通過，41 個 JavaScript 檔案通過語法檢查；瀏覽器模擬低剩餘時間失誤及回呼延遲，確認結算紀錄、超時阻擋及退出後計時器狀態。未提交測試成績。
  - **後續待處理**：持續擴大各模式與歷史紀錄 UI 回歸；Supabase 恢復後驗證真實 schema、寫入及讀回；同步失敗佇列重排政策及 LINE/iOS WebView 真機記憶體驗證仍待處理。
  - **跨模式／系統盤點第一批（盤點未完成，以下七項已修復）**：
    1. **P1，共用答題板**：已答對的經文卡片僅停用滑鼠指標，仍可用鍵盤選取並再次作答，重複增加分數及答對數。隔離瀏覽器重現首題分數由 150 增至 325、答對數由 1 增至 2。需同時驗證生存補秒、成就、重玩及未完成／已失敗題目的行為。
    2. **P1，線上成績去重**：`Leaderboard.save()` 在不同 `client_record_id` 的紀錄具有相同玩家、分數、遊戲模式和耗時，且舊紀錄建立未滿 15 秒時，可能將新紀錄誤當重複而跳過寫入並標記同步成功。mock 測試確認新紀錄未插入、卻被關聯至舊紀錄；尚未在真實 Supabase 驗證。
    3. **P1，離線更新**：Service Worker 預快取個別核心檔案失敗時仍可安裝並啟用，接著刪除舊快取。mock 模擬 `board-ui.js` 預快取失敗，確認舊快取已刪且新快取缺該檔，之後離線可能無法完整操作；尚需真實瀏覽器更新／離線整合測試。
    4. **P2，普通／困難抽題**：跨關抽題未排除已使用經文，即使仍有 5 題未使用，也可能重複前關題目。隔離瀏覽器以固定隨機值及受控題庫重現：普通 5 題均已使用、困難 5 題中 4 題已使用。
    5. **P2，簡單抽題**：剩餘原始經文數足夠但可拆分且未使用的經文不足 5 題時，仍可能直接開始不足 5 題的關卡。隔離瀏覽器以 10 題受控題庫重現：6 題未使用、其中 1 題可拆分，實際只產生 1 題。
    6. **P2，成績分類**：闖關及生存模式在開始畫面將 `rarity` 清空，但保存成績時以 `rarity` 是否存在判斷 `ranking`／`practice`，因此核心模式被記為 `practice`。隔離瀏覽器攔截保存，確認闖關、`range=null` 時記錄的 `mode` 是 `practice`。
    7. **P2，成績耗時**：保存成績時計算至提交當下，而非遊戲結束時間，結算畫面停留時間被算進成績。隔離瀏覽器模擬遊戲耗時 10 秒、結束後等待 10 秒，截獲紀錄為 `0:20`。
  - 修復方式：已完成題目不可再用鍵盤選取或判題，焦點略過已完成題目；具穩定 ID 的成績只按 ID 去重，無 ID 的舊紀錄才使用啟發式，提交防重也區分不同局次。Service Worker 必須成功預快取全部本機資源才可安裝，Tailwind 仍屬可選；失敗時保留舊版。各難度抽題排除已使用經文；簡單模式可拆分題目不足時不產生殘缺關卡，首關返回選單、後續關卡結算上一關。成績按範圍判斷分類、按結束時間計算耗時，線上新紀錄亦保留空範圍以維持重玩模式。
  - 回歸驗證：九個測試檔共 109 項通過、41 個 JavaScript 檔案通過語法檢查。隔離瀏覽器實際以鍵盤重選已完成題目，分數、答對數與連擊均未增加；確認新版 Service Worker 已啟用且兩個核心腳本已快取。預快取失敗及線上去重使用 mock，尚未完成實際瀏覽器的失敗更新／離線整合測試。
  - 本批沒有向 Supabase 寫入測試資料。舊雲端紀錄可能已將空範圍存成 `all` 或誤分類，無法可靠還原，不應宣稱歷史資料已修正。清單不代表已找出全部 bug；尚需擴大裝備課程、成就、各模式切換／重玩、實際離線更新與同步逾時的測試。Supabase 暫停、LINE/iOS 真機限制及既有失敗佇列重排政策仍須分別驗證。
  - **跨模式／系統盤點第二批（盤點未完成，以下七項已修復）**：
    1. **P1，自訂練習排行**：首頁自訂專區標示「不列排行」，但結算的 `checkAndShowGameComplete()` 沒有排除 `range='custom'`，仍可能顯示入榜及取名；`savePlayerToLeaderboard()` 亦可將該成績按 `classic`／`survival` 類別保存。隔離瀏覽器以空排行榜及自訂練習狀態重現排名第 1，攔截保存確認資料標為 `practice`、類別為 `classic`。需同時檢查既有練習資料的排行榜讀取與相容性，不能誤刪歷史資料。
    2. **P1，成就紀錄關聯錯誤**：`linkLatestAchievementRunToScore(scoreId)` 沒有指定 run ID 時，會選同專案最新的未關聯紀錄，並不保證屬於同一局或同一玩家；排行榜保存流程也會先呼叫這個回退。隔離 mock 模擬另一玩家的未關聯紀錄，確認其 `score_id` 被設為本次成績。實際 RLS、多人競態仍需 Supabase 恢復後驗證。
    3. **P2，成就關聯失敗被當作成功**：Supabase update 回傳 `{error}` 而非丟出例外時，`linkLatestAchievementRunToScore()` 未檢查結果；待同步佇列認為成功並移除項目。隔離 mock 回傳權限錯誤，重現 `flushed=1`、佇列剩餘 0，實際更新失敗。亦需檢查無 client 或找不到紀錄時是否有同類問題。
    4. **P2，損壞快照仍啟動重玩**：目前只檢查題目是物件，不驗證必要欄位。隔離瀏覽器以 `questionData:[{}]` 重現：未顯示警告就進入遊戲畫面，渲染時發生 `TypeError`、題板空白。
    5. **P2，裝備課程提示被白白消耗**：第一階段抽書卷時沒有可提示選項，`equipUseHint()` 仍先扣提示次數並記錄已提示。隔離 mock 以 3 次提示進入第一階段，確認未找到提示目標卻剩 2 次。
    6. **P2，重玩設定沿用上一局**：啟動同題重玩時未依紀錄重設 `rarity` 和 `showTimeReward`。隔離瀏覽器以紀錄 `rarity='rare'`、`showTimeReward=true`、前一局 `common`／`false` 重現沿用前局設定，可能改變重玩計分；舊紀錄缺欄位時的合理相容政策尚待決定。
    7. **P3，重玩結果的內部題組快照可能來自上一局**：啟動重玩未清理 `_sessionQuestions`，而 `buildQuestionSnapshot()` 優先採用該欄位。隔離瀏覽器重現重玩題為 `new run`，產生的內部快照卻是 `old run`。目前結算 UI 重用來源紀錄，尚未證實使用者會因此重玩錯題；需檢查其餘消費端。
  - 修復方式：自訂練習不計算榜次或提交成績；排行榜查詢與本機顯示排除可明確識別的自訂／書卷／主題練習紀錄，不刪除歷史資料。`range='all'` 的舊紀錄可能因先前分類錯誤而無法辨識，為避免隱藏原本的闖關成績而保留。
  - 成就同步不再將最新的無關紀錄猜作本局：既有關聯只接受明確 run ID、驗證查詢與更新結果；本局成就指標隨成績及待同步紀錄保存，寫入時附帶該成績的遠端 ID。失敗的成就上傳會排入待同步佇列，重試前以 score ID 查詢已寫入紀錄；舊的無 run ID 佇列項目會保留／移至失敗佇列，不再猜測關聯。極端並行或網路逾時仍無資料庫唯一約束可保證成就資料 exactly-once；過去已錯誤關聯的紀錄不會自動更正。
  - 重玩啟動前檢查各難度所需題目欄位與選項順序，並以原紀錄還原計分設定、建立獨立的多關快照；舊紀錄未提供設定時以核心預設值處理。裝備提示只在有有效目標時扣除。
  - 驗證：九個測試檔共 126 項通過、41 個 JavaScript 檔案通過語法檢查。隔離瀏覽器確認練習不計算名次、損壞快照被拒絕、有效重玩的計分設定及快照正確、抽書卷期間不扣提示；新版 Service Worker 與結算腳本已快取。成就關聯、重試及排行榜後端篩選以 mock 驗證，沒有寫入真實 Supabase。
  - 裝備其餘階段、成就解鎖規則、同步逾時、離線更新、模式切換及真機行為仍未全面檢查；Supabase 暫停，真實 schema、RLS、多人競態與恢復後同步仍待實測，不能保證已找出全部 bug。
  - **跨模式／系統盤點第三批（以下七項已修復）**：
    1. **P1，即時成就評估失效**：`achievements.js` 的 `REALTIME_SAFE_ID` 只定義在 `AchievementManager` 的閉包內，但即時評估的另一個閉包直接引用它。以實際模組及隔離 VM 呼叫 `evaluateRealtimeAchievements()` 重現 `ReferenceError: REALTIME_SAFE_ID is not defined`；呼叫端通常吞掉例外，故即時解鎖／提示失效。結算評估另走不同路徑，不應一概判定結算成就也失效。
    2. **P1，結算非同步回應污染新局**：`checkAndShowGameComplete()` 在等待排行榜時未固定局次，也在等待後讀取可變的 `gameState`。隔離 mock 先開始舊局結算，等待期間切到新局，再放行排行榜請求，重現舊紀錄的結算視窗使用新局分數計算名次並開啟；後續成就與儲存亦可能讀到錯局狀態。需同時處理初次與延後排名查詢，並驗證退出選單、重玩及跨模式。
    3. **P2，延後刷新排名未同步結算操作**：初次名次為 0、第二次變成第 1 時，mock 顯示排名文字已變更，名稱輸入區與排行訊息仍隱藏，且同題重玩按鈕被隱藏；`viewingRecord` 仍為檢視模式，不能依新名次保存。反向從第 1 降為未入榜時，現有邏輯也未更新先前的入榜介面。需驗證兩種轉換及玩家已關閉視窗的競態。
    4. **P2，裝備課程結束後抑制下一局即時成就**：裝備結算將 `suppressSettlementAchievements` 設為 true，但返回選單與正常新局啟動皆未重設；即時成就因此提前返回，直到下次普通結算才清除。此問題目前被第 1 項遮蔽；隔離 mock 僅為驗證此獨立狀態殘留而注入同等白名單，殘留時連擊 5 不解鎖、清除後解鎖。
    5. **P2，背景啟動未暫停時鐘**：頁面在倒數時轉入背景（當時遊戲畫面尚未啟用），之後若遊戲在背景啟動，既有 `visibilitychange` 不會再次觸發暫停；回到前景也無 `_sysPauseTime` 可補償。隔離 mock 以 30 秒背景期間重現開始時間與生存上次計時均未平移；需在真實瀏覽器確認各平台倒數／動畫在背景執行的實際時序。
    6. **P2，伺服器 HTTP 5xx 不使用已有快取**：Service Worker 的 network-first 僅在 `fetch()` 拋錯時回退；若伺服器回應 HTTP 503，即使核心頁面已有快取仍直接回傳錯誤。隔離 mock 對已快取的導覽頁回傳 503，確認結果仍為 503；需釐清 4xx 與 5xx 的回退政策，並以瀏覽器測試。
    7. **P3，結語經文與同題重玩來源不一致**：`completeGame()` 先選經文並建立紀錄，`showPlayerNameModal()` 又重新選一次，卻把原紀錄放入重玩資料。隔離 mock 確認結算顯示第二次選擇、儲存供重玩的紀錄仍是第一次選擇；實際選取會避開近期紀錄，兩次可能不同。
  - 修復方式：即時與結算成就共用白名單，普通新局重設裝備抑制旗標；延遲成就提示以局次及已解鎖集合檢查有效性。結算以獨立 token 固定局次，切換／退出時失效；初始及後續排名均使用同一局的分數，排名改變時同步更新名稱輸入、檢視模式、重玩按鈕及主題，未入榜局的獨立 telemetry 依最終狀態處理。結語使用本局紀錄的經文，避免再抽選。
  - 背景中開始的闖關、生存、裝備及重玩會立即暫停計時；回前景或背景結束時補償時間，包含生存成就的起始時間。Service Worker 對同源 5xx 優先回退可用快取；無快取或快取失敗保留原始 5xx，4xx 仍照常回傳。相關腳本與預快取更新至 v61。
  - 驗證：11 個測試檔共 146 項通過、43 個 JavaScript 檔案語法檢查通過。隔離瀏覽器實際確認連擊成就解鎖，以及排行由未入榜→第 1→未入榜時的名稱、重玩與檢視模式切換。背景時序、伺服器 5xx、結算競態、telemetry 與結語使用 VM／mock；實際瀏覽器失敗更新／離線整合及手機背景行為仍待驗證。測試頁啟動時曾發出 Supabase 排行榜讀取但 DNS 失敗，未寫入測試成績或成就。
  - **跨模式／系統盤點第四批（以下三項已修復）**：
    1. **P2，提示次數未計入動態罕見度**：核心 `useHint()` 將提示從 3 扣至 2，也將 `gameMetrics.hintsUsed` 從 0 增至 1，但 `gameState.hintsUsed` 保持 0。動態罕見度的本關提示扣分及「無提示」加分使用後者，故可能錯誤升級；隔離 VM 以真實提示函式重現。
    2. **P2，生存時間區間成就低估延遲計時**：生存倒數在 callback 延遲時會按實際秒數補扣，但 `recordSurvivalTick()` 每次呼叫至多累加一秒的時間區間。隔離 VM 模擬 10 秒均位於 60–90 秒區間，存活時間為 10 秒、區間計數卻只有 2；時間區間即時及結算成就可能因此少算。仍需設計正確處理補秒、扣秒、切換區間及背景暫停的計算方式。
    3. **P2，離線無法合併已快取的新舊約分片**：IndexedDB 分別有完整 39 卷舊約與 27 卷新約、但無 full 快取時，完整題庫載入只查 full／legacy key，不讀兩份分片；隔離 mock 模擬離線後確認仍發出兩次網路請求並回報 `empty-external-verses`。真實 IndexedDB 與瀏覽器離線流程尚待驗證。
  - 修復方式：核心及裝備提示消耗同步更新本局提示計數；生存時間區間依倒數顯示值及實際經過毫秒累積，補秒、扣秒不視為經過時間，跨區間的零碎毫秒可累積，背景暫停及歸零後時間不計入；延遲歸零也以真正歸零時間計算存活成就與結算耗時。完整題庫讀取時可合併各自有效的 IndexedDB 分片，僅抓取缺失或不符合基本有效性檢查的分片，不將不完整分片組合寫為 full；書卷名稱存在但經文內容無效不再視為有效分片。相關資源版本升至 v62。
  - 驗證：13 個測試檔共 162 項通過、45 個 JavaScript 檔案語法檢查通過，修改腳本在 HTML 與 Service Worker 的版本一致。隔離瀏覽器使用實際 IndexedDB、實際新舊約資料，阻擋分片網路請求後由兩份分片合併 30,939 筆，未發出 fetch 並寫入 full 快取；未載入遊戲首頁或存取 Supabase。其他提示、時間、暫停、無效分片及混合快取／網路情況以 VM／mock 驗證；實際 Service Worker 失敗更新、完整離線流程及手機背景行為仍待驗證。
  - **後續擴大盤點與修復**：
    1. **P2，題庫完整性判定不足（已修復）**：先前只檢查每卷至少一筆基本有效經文，隔離瀏覽器從實際 30,939 筆資料每卷保留一筆，僅 66 筆仍被判定為完整。依使用者選擇，現在用隨程式發布的版本化清單驗證筆數及五個遊戲資料欄位的分塊 SHA-256 指紋；快取及網路資料均須通過，損壞快取不刪除，改嘗試重新下載，無法取得可驗證資料時不啟動受影響範圍並顯示原因。驗證需要安全環境中的 Web Crypto；舊快取若與目前版本內容不同，需重新連線下載。已通過驗證的單約資料在完整題庫載入失敗時保留。
    2. **P3，生存「風平浪靜」成就零波動判定錯誤（已修復）**：條件原使用 `(timeStdDev || 999)`，標準差為 0 時被替換為 999。現改為要求有限且介於 0–6 的數值；隔離成就評估測試涵蓋 0、6、超過 6、負數、缺值及作答／存活門檻。成就腳本與 Service Worker 版本更新至 v63，完整回歸 163 項通過。
  - 使用者選擇保留題目不足 5 題時提示並結算的現有行為，不自動重複出題或開始殘缺關卡。題庫驗證相關資源與 Service Worker 版本更新至 v64。完整回歸 168 項通過、48 個 JavaScript 檔案通過語法檢查；隔離瀏覽器使用實際 IndexedDB 與題庫，確認 66 筆截斷快取離線被拒、開始按鈕停用且顯示提示；兩份完整分片離線可合併為 30,939 筆並啟用開始按鈕。未載入遊戲首頁或存取 Supabase；實際 Service Worker 失敗更新、完整離線流程及手機背景行為仍待驗證。
  - 題庫維護：更新 `data/external-verses-old.json` 或 `data/external-verses-new.json` 時，先確認來源內容正確，再執行 `node tools\update-verse-manifest.js` 產生 `js/core/verse-manifest.js`，並執行 `node tools\update-verse-manifest.js --check` 與回歸測試；題庫順序及 `book`、`chapter`、`verse`、`version`、`rarity` 均納入驗證。清單必須與題庫同步發布，重新產生清單並不會自動證明來源資料正確。
  - **成就與結算擴大檢查**：
    1. **P1，前一局成就及統計污染新局結算（已修復）**：核心新局未清除 `unlockedAchievements` 和 `finalMetrics`，`saveScore()` 可能帶入舊數據，結算看到非空成就時又直接沿用，跳過本局成就評估。隔離測試確認前一局的成就與最高連擊／首擊數可能被帶到新紀錄。現於核心、裝備、重玩開始時清除舊結算狀態；普通新局結算一律重新評估並以本局指標回填紀錄，重玩仍不產生成就。
    2. **P2，全錯關卡漏記成就序列（已修復）**：全錯關卡沒有呼叫 `recordLevelResult(false)`，使前後完美關卡合併，開局、連續及倒數完美成就可能錯判。隔離測試原為 `[true, true]`，修復後為 `[true, false, true]`。
    3. **P2，即時成就與結算最低作答門檻不一致（已修復）**：例如極速二連在兩次作答後顯示解鎖，但結算評估要求至少五次作答而不發放。現在兩者共用五次作答門檻（依現有指標，錯誤作答也算一次），未調整成就難度；修正三處成就文案中的 `?` 及一處錯誤上限文案。
    4. **兩項 T1 均速文案與實作不同（依使用者決定修復）**：「明亮晨星」與「成聖之路」原先要求每題均不超過速度門檻，且按題目索引而非作答順序計算。現依使用者選擇，以每關實際作答順序選取前 5／3 題，要求首次答對且平均分別不超過 5／3 秒；門檻數值不變，文案同步說明。已測試恰達門檻、超出、選題順序、題數不足及重試。歷史紀錄不重新評估。
  - 成就目錄驗證：60 個唯一 ID、12 個 T2–T5 梯隊完整；分布為共用 30、闖關專屬 15、生存專屬 15，每個顯示階級各 12 項。已測試連擊、極速連答、生存時長及兩個時間區間梯隊各級門檻及最高階顯示，並非全部成就條件均已驗證。版本 v65；完整回歸 181 項通過、49 個 JavaScript 檔案通過語法檢查及題庫清單校驗。隔離瀏覽器以實際成就、指標與結算模組確認舊成就被替換，本局連擊成就、首擊題數、連擊及平均時間正確；亦驗證以實際作答順序判定新均速規則。未提交任何真實成績或 telemetry。首頁整合測試未完成，Supabase／真機仍待驗證。
  - **繼續盤點：**
    - 已修復生存遊戲在第一關可操作後，仍等待動畫畫格與延遲 UI 回呼才初始化倒數的時序風險；現在成功生成關卡後立即初始化，延遲回呼只處理 UI。遊戲啟動失敗時不啟動倒數，背景暫停機制維持原有處理。版本 v66；完整回歸 183 項通過，修改腳本語法及題庫清單檢查通過。真實瀏覽器及手機上的該時序尚未重現。
    - 已修復簡單模式合併題配對歧義。使用實際題庫重現：創世記 1:1–1:5 的原始及合併題可能產生相同 `pairId`，另有後段文字相同但對應不同前段的選項。依使用者決定，不同題目可共享部分原始經文，但同關前段及後段均須可區分，並以關內唯一 ID 配對；先按罕見度抽選，貪婪抽選不足時使用匹配搜尋以避免誤判不足。無法湊足 5 題時保留提示並結算。
    - 已修復簡單模式切關原始題數預檢與合併題生成不一致：僅剩 4 個原始經文時仍交由生成器檢查，例如創世記 1:5–1:8 可形成 5 個可區分題目；首次啟動的自訂範圍亦允許簡單模式嘗試 3–4 篇。生成不足時恢復上一關難度再結算。此策略允許合併題與其他題共享經文，並非保證經文片段不重複。
    - 同題重玩依使用者決定：舊快照若僅 ID 重複但文字可區分，重設關內 ID；若前段或後段顯示相同，明確提示且拒絕重玩。檢查包含外層引號清理及顯示空白合併，且驗證所有關卡後才改變遊戲狀態。
    - 版本 v67；完整回歸 198 項通過、修改腳本語法及題庫清單檢查通過。隔離瀏覽器以真實抽題與卡片呈現程式、4 篇實際經文生成 5 個前段、後段及 ID 均不同的題目，確認 5 組卡片及配對資料；未載入完整首頁或提交成績。真實 Supabase、完整首頁與手機環境仍待驗證。
  - **後續盤點修復（v68）：**
    - 上輪簡單模式不足題庫修復漏掉首頁開始按鈕，而且自訂範圍預檢會錯用上一局遺留難度；新局實際一律以簡單難度開始。現兩處均允許至少 3 篇原始經文進入後續實際生成檢查，仍無法湊足 5 個可區分題目時會提示並阻止。實際題庫驗證創世記 1:8–1:10 的 3 篇可合成 5 題；數量預檢通過並不保證一定能生成。
    - 生存模式若關卡已記錄結果，但倒數在切關動畫期間歸零，先前使用 `currentLevel - 1` 會少算已完成關卡，影響生存過關數、平均失誤與相關成就。統計及計時卡共用關卡結果判定，已完成當前關卡立即更新顯示；切至下一關後不重複計數，未完成關卡不算入。
    - 完整回歸 211 項通過；修改腳本語法及題庫清單檢查通過。隔離瀏覽器以實際首頁按鈕、成就、指標及生存計時模組驗證：上一局難度為 hard 時 4 篇可啟動嘗試、2 篇不可；第 2 關已有結果時，畫面和指標均為 2 關、平均失誤為 1、對應成就可解鎖，切關後仍為 2。未載入完整首頁、實際進行完整遊戲或提交成績；Supabase、完整首頁與手機環境仍待驗證。
  - **Supabase 恢復後的唯讀檢查與同步修復（v69）：**
    - 2026-11-06 使用目前應用程式設定的匿名角色，對 `scores`、`achv_runs` 以 HTTP HEAD 唯讀查詢，兩張表及目前程式上傳所需全部欄位回應 200；未取回玩家資料、未寫入或修改任何雲端資料。兩張表匿名角色可見的總筆數均為 0，闖關及生存排行榜篩選結果也均為 0；使用者確認空表為預期情況。
    - 已重現並修復成績重送的去重查詢失敗仍繼續新增：一般查詢錯誤、無效回應或缺少遠端 ID 時，明確失敗並保留待同步紀錄，不執行新增；`project_tag` 缺失的舊 schema 會明確警告後改用不含該欄位的查詢，`client_record_id` 缺失仍維持舊版相容寫入但明確警告無法保證去重。已測試查詢失敗、資料異常、舊欄位相容及恢復後佇列重試。這不解決無唯一約束下的並發插入或逾時結果不明問題。
    - 成績紀錄 ID 原使用 `Date.now()`，不同玩家同毫秒提交可能有相同 `client_record_id` 並被誤判為重複。新結算與排行榜紀錄改用瀏覽器安全亂數產生 ID；缺少安全亂數時使用附時間戳的隨機後備並明確警告。舊數字 ID 和已排隊紀錄不變；新紀錄在佇列重試時保留原 ID。測試涵蓋同時提交、亂數 API 後備及原有重試去重。極端機率的隨機碰撞與資料庫端並發寫入仍不能憑此宣稱不存在。
    - 完整回歸 219 項通過，修改腳本語法及題庫清單檢查通過；使用者選擇暫時只做唯讀及模擬測試，不進行正式資料庫寫入或清理。未重排失敗佇列，真實 insert/RLS 寫入權限、讀回及並發仍未驗證。失敗佇列位於各個瀏覽器裝置，唯讀雲端檢查不能反映或恢復玩家裝置上的待同步資料。
  - **同步佇列後續盤點修復（v70）：**
    - 成績已上傳但本局成就資料上傳失敗，且成就待同步佇列無法保存時，原流程仍標記整筆成績已同步並移除，造成成就資料無可重試副本。現保留整筆成績及成就資料供重試；先前已建立的遠端成績仍以既有 ID 查重，成就資料成功上傳或成功排入佇列後才標記同步。遠端新增未回傳 ID 也不再視為成功。
    - 已同步但超過 72 小時的成績不再誤移入失敗佇列。修復佇列清理後未保存空佇列、合併時重新加回已清除項目，以及待同步儲存失敗時同一筆逾期項目反覆複製至失敗佇列；涵蓋成績與成就兩類佇列。既有 72 小時／7 天及重試次數政策不變。
    - 完整回歸 228 項通過，修改腳本語法與題庫清單檢查通過。隔離瀏覽器以實際同步程式及記憶體 mock 驗證：成就上傳及入列皆失敗時保留成績；恢復後只保留一筆模擬遠端成績並補送成就。未使用正式 Supabase、瀏覽器持久儲存或真實玩家紀錄；真實寫入、RLS、跨分頁並發及手機仍未驗證。
  - **排行榜讀取資料保護（v71）：**
    - 確認本機排行榜讀取後排程的背景簽章／結語補充，可能在新成績存入或其他分頁修改後，將舊快照寫回並覆蓋較新的本機資料；同步回傳線上資料時也可能覆蓋本機備份。兩種情況均以受控測試重現，非正式資料庫測試。
    - 背景補充僅更新本次載入的記憶體資料，不再回寫過期快照；舊資料缺少結語時仍依原演算法補充顯示。此修復無法自動復原過去已被覆蓋且無其他副本的紀錄，亦不保證所有跨分頁寫入競態皆已排除。
    - 新增兩項回歸測試，完整測試 230 項通過；修改腳本語法及題庫清單檢查通過。沒有讀寫正式 Supabase 或操作玩家的瀏覽器持久資料；真實 Service Worker 更新、跨分頁互動及手機真機仍待驗證。
  - **結算返回競態修復（v72）：**
    - 重現遊戲已完成、等待首次排行榜回應時，玩家確認返回會將已完成局次改為中斷並取消結算，因而失去該局顯示與提交成績的機會。結算啟動時會關閉已開啟的遊戲設定及返回確認視窗；完成後阻止再開啟遊戲設定／返回確認，並防護已排入的返回確認事件。未完成的遊戲仍可照原規則中途退出。
    - 新增四項回歸測試並檢查相關腳本與離線快取版本；完整測試 234 項、修改腳本語法及題庫清單檢查通過。隔離瀏覽器使用實際視窗管理器和模擬排行榜，確認衝突視窗關閉、完成局次保留並顯示結算；未讀寫正式 Supabase 或玩家瀏覽器持久資料。頁面重整／關閉時尚未提交的結算、真實 Service Worker 更新及手機真機仍需進一步驗證。
  - **離頁提示及提交錯誤分流（v73）：**
    - 確認已完成但結算尚未處理，或確認提交後線上請求尚在執行時，重新整理不會觸發原有離頁警告；現沿用瀏覽器原生離頁提示保護這兩個階段。線上提交同時發生多筆時會分別追蹤，成功或完成本機 fallback 才解除對應的進行中狀態。
    - 修正線上成績已成功保存後，僅排行榜畫面更新失敗時，原流程誤判為保存失敗並排入待同步佇列。畫面更新錯誤改為單獨記錄；異步更新失敗不再產生未處理拒絕。
    - 新增四項回歸測試，完整測試 238 項、修改腳本語法與題庫清單檢查通過；隔離瀏覽器觀察到完成結算期間的原生離頁對話框，測試工具自動處理對話框，未確認手動取消的實際互動。未存取正式 Supabase 或玩家瀏覽器持久資料。
    - **限制與後續風險**：原生提示依瀏覽器、先前使用者互動及行動系統行為而定，強制關閉、當機、背景終止等不保證提示；它不是成績持久化。v73 線上提交仍先等待遠端，提交途中若頁面被終止可能遺失；後續改善見 v74。尚未驗證真實 Supabase 寫入及真機行為。
  - **送出前保留成績（v74）：**
    - 針對 v73 提交途中無本機副本的風險，正常情況下先將包含成就遙測的完整成績寫入既有待同步佇列，再透過同一佇列的 `flush()` 上傳，不同時啟動另一個直接上傳。模擬頁面終止後的新執行個體可從持久化儲存的 mock 恢復並補送；上傳失敗／逾時保留待同步項目並使用原有本機排行榜 fallback。
    - 當同步期間新增項目時，即使原本的同步成功，也會為剩餘佇列排定重試，避免自動觸發碰上既有同步而被跳過後卡住；同筆逾時及延遲失敗不再重複寫入本機排行榜。若無法寫入待同步佇列，保留原本的直接上傳 fallback，回到首頁後明確警告提交中關閉頁面可能遺失。
    - 新增八項回歸測試，完整測試 246 項、修改腳本語法及題庫清單檢查通過；僅使用記憶體儲存與遠端 mock，未寫入正式 Supabase、重排失敗佇列或操作玩家瀏覽器資料。佇列仍採原有順序與重試上限；較舊項目失敗可能延後新項目上傳。
    - **剩餘限制**：瀏覽器儲存不可用／滿載時仍無法保證持久保留；跨分頁可能同時同步同一筆，網路逾時亦可能讓遠端結果不明。尚未確認資料庫具備必要唯一約束，因此無法保證恰好寫入一次；真實 Supabase 寫入、跨分頁互動、離線更新與手機真機仍待驗證。
  - **成就同步一致性（v75）：**
    - 重現成就佇列同步期間加入新項目，而原項目同步成功時，新項目可能錯過自動重試；現只要同步後仍有待處理項目便排定重試，原有失敗佇列與重試次數政策不變。
    - 成就遙測依 `score_id` 查重時，若查詢回傳非陣列或缺少成就紀錄 ID，不再誤判為可新增；錯誤會保留在佇列，查詢恢復後再重試。兩個程序競爭將同一成就紀錄關聯至不同成績時，更新現在要求原本 `score_id` 為空，避免後寫入覆蓋其他成績的關聯；未成功更新仍保留待重試。
    - 新增三項回歸測試並擴充既有查重測試，完整測試 249 項、修改腳本語法及題庫清單檢查通過。僅以受控 mock 驗證，未向正式 Supabase 寫入或重排失敗佇列；真實 RLS、跨分頁佇列處理及資料庫唯一約束仍未驗證，不能保證所有網路／並發狀況恰好寫入一次。
  - 盤點仍未完成，不能保證已找出所有問題；Supabase 暫停，真實 schema、RLS、多人競態與恢復後同步仍待實測。
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
