const fs = require("fs");
const fetch = require("node-fetch");
const { GoogleAuth } = require("google-auth-library");

// 讀取金鑰
const rawKey = process.env.GEMINI_API_JSON;
const keyFile = "/tmp/gemini-key.json";
fs.writeFileSync(keyFile, rawKey);

// 建立 Auth client
const auth = new GoogleAuth({
  keyFile,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function generatePRSummary() {
  const diff = fs.readFileSync("/tmp/pr.diff", "utf-8");

  const prompt = `
以下是 GitHub PR 的變更內容，請幫我用中文依據指定格式撰寫完整 PR 描述：

${diff}

---

格式如下：

## 📋 變更內容簡述
...

## 🔍 詳細說明
### ✨ 新功能／需求背景
...
### 🐛 錯誤修正說明
...
### ♻️ 重構說明
...
### 📝 文件／註解更新
...

## ✅ 測試與驗證方式
- [ ] 已通過單元測試
- [ ] 已手動驗證主要功能
- [ ] CI/CD 檢查已通過

說明測試方式與結果：
`;

  const client = await auth.getClient();
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

  const accessToken = await auth.getAccessToken();
  const response = await fetch(`${url}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "生成失敗";

  fs.writeFileSync("pr_summary.md", text);
  console.log("✅ Gemini PR Summary generated.");
}

generatePRSummary().catch((err) => {
  console.error("❌ Error generating summary:", err);
  process.exit(1);
});