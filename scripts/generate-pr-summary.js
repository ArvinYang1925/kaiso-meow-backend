const fs = require("fs");
const fetch = require("node-fetch");
require("dotenv").config({ path: __dirname + "/../.env" });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ 未設定 GEMINI_API_KEY");
  process.exit(1);
}

const diff = fs.readFileSync("/tmp/pr.diff", "utf-8");

const prompt = `
請根據以下 GitHub PR 程式碼差異，協助我撰寫一份完整、具結構的 PR 描述，格式如下。請用繁體中文填入內容。

### ✨ 變更說明（Change Summary）

請簡要說明本次 PR 的目的與背景，例如修正問題、開發新功能或文件更新。

> 範例：
> - 新增學生訂單查詢 API，供講師後台使用
> - 修正登入流程的 token 驗證錯誤
> - 更新 README 增加部署步驟說明

---

### ✅ 本次提交包含

- [ ] 🆕 新功能開發  
- [ ] 🐞 錯誤修正  
- [ ] 📝 文件調整  
- [ ] 🎨 UI/UX 優化  
- [ ] 🧪 單元測試 / CI 配置  
- [ ] 🔧 其他技術調整（請補充）

---

### 🔍 變更內容摘要（What Was Changed）

請列出主要修改的內容項目：

- 修改內容 1
- 修改內容 2
- 修改內容 3

---

### 🧪 測試與驗證

- [ ] 本地測試通過
- [ ] CI 檢查通過
- [ ] 已驗證對應 API 功能正常運作
- [ ] 無破壞既有功能

---

### 🚨 注意事項

請說明任何需要額外注意的項目（如：資料庫 migration、環境變數、新增權限設定...）。

---

### 📷 截圖 / 補充資料（如有）

> 可以貼上畫面截圖、Postman 測試結果、API 範例等。

--- PR Diff ---
${diff}
`;

(async () => {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error("❌ 無法取得 Gemini 回應：", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  fs.writeFileSync("pr_summary.md", text);
  console.log("✅ Gemini PR Summary generated.");
})();