---
name: "🧩 General PR Template"
about: "適用於所有類型的 Pull Request"
title: ""
labels: []
assignees: []
---

## 📌 PR 類型（請勾選一項以上）

- [ ] 🛠 Feature
- [ ] 🐛 Bug Fix
- [ ] 🔁 Refactor
- [ ] 📝 Documentation
- [ ] ✅ Test
- [ ] 🔧 Chore
- [ ] 🔐 Security
- [ ] 🚀 Release / Deployment

---

## 📋 變更內容簡述

請用 1~2 句說明這次修改的重點與背景。

> 例：新增講師可以查詢學生清單的 API，用於後台課程管理。

---

## 🔍 詳細說明（可依需求填寫）

### ✨ 新功能／需求背景
<!-- 若有新增功能，請說明背景與目的 -->

### 🐛 錯誤修正說明
<!-- 原錯誤行為是什麼？怎麼修正的？ -->

### ♻️ 重構說明
<!-- 調整哪些結構？是否影響既有功能？ -->

### 📝 文件／註解更新
<!-- 哪些文件／註解被更新？是否同步程式邏輯？ -->

---

## ✅ 測試與驗證方式

- [ ] 已通過單元測試
- [ ] 已手動驗證主要功能
- [ ] CI/CD 檢查已通過

說明測試方式與結果：

```txt
例：
- 使用 Postman 測試 GET /api/v1/instructor/students，成功回傳學生資料
- 確認無影響其他講師 API