# kaiso-meow-backend

> 影音課程販售平台後端服務

**影音課程販售平台 – 後端服務**  
提供講師/學生帳號系統、課程管理、影片轉檔、購買與訂閱 API。

---

## 🚀 線上服務
| 環境 | URL |
| ---- | --- |
| Production API | render上 |

---

## ✨ 特色
- Node.js 20.x + Express
- TypeORM + PostgreSQL
- Zod schema validation
- JWT & RBAC auth
- 綠界金流整合
- Firebase Admin SDK
- Google AI (Gemini) 整合
- Jest 單元 & API 測試
- GitHub Actions 自動化工作流程

---

## 🏗️ 專案結構
```text
src/
├── config/         # 資料庫、金流等設定檔
├── controllers/    # API 控制器
├── entities/       # TypeORM 實體定義
├── middleware/     # Express 中間件
├── migrations/     # 資料庫遷移檔案
├── queues/         # 背景任務佇列
├── routes/         # API 路由定義
├── services/       # 業務邏輯層
├── test/          # 測試檔案
├── types/         # TypeScript 型別定義
├── utils/         # 工具函數
├── validator/     # Zod 驗證 schema
├── app.ts         # Express 應用程式設定
└── server.ts      # 伺服器入口點
```

---

## 🛠️ 開發環境設定

### 必要條件
- Node.js 20.x
- PostgreSQL 資料庫
- Redis (用於任務佇列)

### 安裝步驟
1. 複製環境變數範本
   ```bash
   cp .env.example .env
   ```

2. 安裝依賴
   ```bash
   npm install
   ```

3. 執行資料庫遷移
   ```bash
   npm run migration:run
   ```

4. 啟動開發伺服器
   ```bash
   npm run dev
   ```

### 常用指令
- `npm run dev` - 啟動開發伺服器
- `npm run build` - 編譯 TypeScript
- `npm start` - 啟動生產環境伺服器
- `npm test` - 執行所有測試
- `npm run test:unit` - 執行單元測試
- `npm run test:api` - 執行 API 測試
- `npm run migration:run` - 執行資料庫遷移
- `npm run migration:revert` - 還原最後一次遷移
- `npm run migration:generate` - 生成遷移檔案
- `npm run format` - 格式化程式碼
- `npm run lint` - 檢查程式碼風格

---

## 📦 主要依賴
- **Web 框架**: Express 5.x
- **ORM**: TypeORM 0.3.x
- **資料庫**: PostgreSQL
- **驗證**: Zod 3.x
- **認證**: JWT, bcryptjs
- **檔案處理**: multer, fluent-ffmpeg
- **金流**: 綠界 ECPay
- **通知**: Firebase Admin, Nodemailer
- **AI**: Google AI (Gemini)
- **測試**: Jest, Supertest
- **程式碼品質**: ESLint, Prettier

---

## 🔄 CI/CD 工作流程
專案使用 GitHub Actions 進行自動化工作流程：

- **PR 摘要**: 使用 Gemini AI 自動生成 PR 摘要
- **Discord 通知**: 自動發送 PR 和 Issue 更新到 Discord
- **程式碼品質**: ESLint 和 Prettier 檢查

---

## 📝 API 文件

### 👨‍🏫 講師專用 API

#### 個人資料管理
- `GET /instructor/me` - 獲取講師個人資料
- `PUT /instructor/me` - 更新講師個人資料
- `POST /instructor/upload/avatar` - 上傳講師頭像

#### 收入與學生管理
- `GET /instructor/revenue` - 獲取講師收入統計
- `GET /instructor/students` - 獲取講師的學生列表
- `GET /instructor/orders` - 獲取講師的訂單列表

#### 課程管理
- `POST /instructor/courses` - 創建新課程
- `GET /instructor/courses` - 獲取講師的課程列表
- `GET /instructor/courses/:id` - 獲取課程詳細資訊
- `PUT /instructor/courses/:id` - 更新課程資訊
- `PATCH /instructor/courses/:id/publish` - 切換課程發布狀態
- `DELETE /instructor/courses/:id` - 刪除課程
- `POST /instructor/uploads/cover` - 上傳課程封面

#### 章節管理
- `GET /instructor/courses/:id/sections` - 獲取課程章節列表
- `POST /instructor/courses/:id/sections` - 創建新章節
- `PUT /instructor/courses/:id/sections/sort` - 排序章節
- `POST /instructor/courses/:id/sections/batch` - 批量創建章節
- `PATCH /instructor/sections/:id` - 更新章節資訊
- `DELETE /instructor/sections/:id` - 刪除章節
- `PATCH /instructor/sections/:id/publish` - 發布章節
- `POST /instructor/courses/:id/ai-generated-sections` - 使用 AI 生成章節

#### 影片管理
- `GET /instructor/sections/:id/video/status` - 獲取影片處理狀態
- `POST /instructor/sections/:id/video` - 上傳章節影片
- `DELETE /instructor/sections/:id/video` - 刪除章節影片

#### 優惠券管理
- `POST /instructor/coupons` - 創建優惠券
- `GET /instructor/coupons` - 獲取講師的優惠券列表
- `DELETE /instructor/coupons/:id` - 刪除優惠券

### 👨‍🎓 學生專用 API

#### 認證與個人資料
- `POST /auth/register` - 註冊新用戶
- `POST /auth/login` - 用戶登入
- `POST /auth/logout` - 用戶登出
- `GET /auth/profile` - 獲取學生個人資料
- `PUT /auth/profile` - 更新學生個人資料
- `POST /auth/password/forgot` - 發送重設密碼郵件
- `POST /auth/password/reset` - 使用重設令牌重設密碼
- `PUT /auth/password/change` - 更改密碼

#### 課程瀏覽與學習
- `GET /courses` - 獲取課程列表
- `GET /courses/my-learning` - 獲取我的學習課程
- `GET /courses/:courseId` - 獲取課程詳細資訊
- `GET /courses/:courseId/sections` - 獲取課程章節列表
- `GET /courses/:courseId/progress` - 獲取課程學習進度
- `GET /courses/:courseId/sections/:sectionId` - 獲取章節詳細資訊
- `PATCH /courses/:courseId/sections/:sectionId/complete` - 標記章節完成

#### 訂單與支付
- `POST /orders/preview` - 預覽訂單
- `GET /orders` - 獲取訂單列表
- `POST /orders` - 創建訂單
- `GET /orders/:orderId` - 獲取訂單詳細資訊
- `POST /orders/:orderId/apply-coupon` - 應用優惠券
- `POST /orders/:orderId/checkout` - 結帳訂單
- `POST /orders/:orderId/payment-callback` - 綠界支付回調

### 🌐 公開 API（無需登入）

#### 電子報
- `POST /newsletter/subscribe` - 訂閱電子報

---

## 🔒 環境變數
主要環境變數包括：

- **資料庫設定**
  - `DB_HOST`
  - `DB_PORT`
  - `DB_USERNAME`
  - `DB_PASSWORD`
  - `DB_NAME`

- **金流設定**
  - `ECPAY_OPERATION_MODE`
  - `ECPAY_MERCHANT_ID`
  - `ECPAY_HASH_KEY`
  - `ECPAY_HASH_IV`

- **應用程式設定**
  - `BACKEND_URL`
  - `FRONTEND_URL`
  - `JWT_SECRET`

- **Firebase 服務**
  - `FIREBASE_SERVICE_ACCOUNT` - Firebase 服務帳號金鑰（JSON 格式）
  - `FIREBASE_STORAGE_BUCKET` - Firebase Storage 儲存桶名稱

- **AI 服務設定**
  - `AI_PROVIDER` - AI 服務提供商（openai 或 gemini）
  - `OPENAI_API_KEY` - OpenAI API 金鑰
  - `GEMINI_API_KEY` - Google Gemini API 金鑰

---

## 👨‍💻 貢獻者與工作分配

本專案由以下三位後端開發人員共同完成：

### 貢獻者 Arvin
- 負責範圍：學生_登入登出、課程瀏覽與學習、講師_上傳大頭照&更新密碼、講師_課程管理(課程封面圖片上傳)、刪除課程
)
- 主要開發模組：authController、courseController、instructorCoursesController
- GitHub: [Arvin的GitHub](https://github.com/ArvinYang1925)

### 貢獻者 Janet 
- 負責範圍：訂單支付、電子報、課程瀏覽與學習(課程列表、課程詳細資訊)、學生_個人資料系列、講師_查看收益報表
- 主要開發模組：courseController、OrderController、newSletterController
- GitHub: [Janet的GitHub](https://github.com/CHING-WENLAI1031)

### 貢獻者 海螺
- 負責範圍：學生_忘記密碼&重設定、講師AI系列功能、章節管理、影片管理、優惠券管理、講師_個人資料系列 
- 主要開發模組：passwordController、instructorController、instructorOrdersController、instructorCoursesController、instructorSectionsController、instructorVideoController、instructorCouponController
- GitHub: [海螺的GitHub](https://github.com/peter6601)

---

## 📄 授權
ISC License

---