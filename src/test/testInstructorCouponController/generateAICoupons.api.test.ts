/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import app from "../../app";
import { createTestToken } from "../../utils/jwtUtils";
import { generateCouponsPlan } from "../../services/aiService";

jest.mock("../../services/aiService");
const mockedGenerateCouponsPlan = generateCouponsPlan as jest.Mock;

const fakeUserId = "user-123";
const fakeToken = createTestToken({ id: fakeUserId, role: "instructor" });
const studentToken = createTestToken({ id: fakeUserId, role: "student" });

const validRequestData = {
  courseDescription: "這是一門完整的後端開發課程，涵蓋 Node.js、Express、TypeScript 等技術",
  launchDate: "2024-12-01",
  numberOfPhases: 3,
  discountType: "fixed" as const,
  keywordThemes: "程式設計,後端開發,Node.js",
  phaseDurationDays: 14,
};

const validAIResponse = {
  strategySummary: "針對後端開發課程設計的三階段促銷策略",
  coupons: [
    {
      couponName: "早鳥優惠",
      type: "fixed" as const,
      code: "EARLYBIRD100",
      value: 100,
      startsAt: "2024-11-17",
      expiresAt: "2024-11-30",
    },
    {
      couponName: "限時特價",
      type: "percent" as const,
      code: "LIMITED20",
      value: 20,
      startsAt: "2024-11-03",
      expiresAt: "2024-11-16",
    },
    {
      couponName: "預售優惠",
      type: "fixed" as const,
      code: "PRESALE50",
      value: 50,
      startsAt: "2024-10-20",
      expiresAt: "2024-11-02",
    },
  ],
};

beforeEach(() => {
  mockedGenerateCouponsPlan.mockReset();
  mockedGenerateCouponsPlan.mockResolvedValue(validAIResponse);
});

const baseURL = "/api/v1/instructor/coupons";

describe("POST /api/v1/instructor/coupons/ai-generate", () => {
  describe("🟢 正常流程", () => {
    it("成功產出折扣碼計劃，response 包含 strategySummary 與 coupons[]", async () => {
      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("strategySummary");
      expect(Array.isArray(res.body.data.coupons)).toBe(true);
      expect(res.body.data.coupons).toHaveLength(3);
    });

    it("即使 keywordThemes 為空，也能成功產出折扣碼計劃", async () => {
      const requestDataWithoutKeywords = {
        ...validRequestData,
        keywordThemes: undefined,
      };

      const res = await request(app)
        .post(`${baseURL}/ai-generate`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send(requestDataWithoutKeywords);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
    });

    it("即使 phaseDurationDays 為空，也能成功產出折扣碼計劃", async () => {
      const requestDataWithoutDuration = {
        ...validRequestData,
        phaseDurationDays: undefined,
      };

      const res = await request(app)
        .post(`${baseURL}/ai-generate`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send(requestDataWithoutDuration);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
    });

    it("使用 OpenAI 時，輸出格式符合結構化 JSON 並能正確解析", async () => {
      // 模擬 OpenAI 回傳格式
      const openAIResponse = {
        strategySummary: "OpenAI 產生的促銷策略",
        coupons: [
          {
            couponName: "OpenAI 優惠",
            type: "percent" as const,
            code: "OPENAI10",
            value: 10,
            startsAt: "2024-11-17",
            expiresAt: "2024-11-30",
          },
        ],
      };
      mockedGenerateCouponsPlan.mockResolvedValueOnce(openAIResponse);

      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(200);
      expect(res.body.data.strategySummary).toBe("OpenAI 產生的促銷策略");
    });
  });

  describe("🔐 身分驗證", () => {
    it("缺少 Authorization header，回傳 401", async () => {
      const res = await request(app).post(`${baseURL}/ai-generate`).send(validRequestData);

      expect(res.status).toBe(401);
      expect(res.body.status).toBe("failed");
      expect(res.body.message).toBe("請先登入");
    });

    it("JWT 無效或過期，回傳 401", async () => {
      const res = await request(app)
        .post(`${baseURL}/ai-generate`)
        .set("Authorization", "Bearer invalid.token.here")
        .send(validRequestData);

      expect(res.status).toBe(401);
      expect(res.body.status).toBe("failed");
      expect(res.body.message).toBe("Token 無效或已過期");
    });

    it("用戶角色非 instructor，回傳 403", async () => {
      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${studentToken}`).send(validRequestData);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe("failed");
      expect(res.body.message).toBe("權限不足");
    });
  });

  describe("⚠ 資料驗證（Zod）", () => {
    it("缺少 courseDescription 欄位 → 回傳 400", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { courseDescription, ...invalidData } = validRequestData;
      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
    });

    it("courseDescription 少於 10 字元 → 回傳 400", async () => {
      const res = await request(app)
        .post(`${baseURL}/ai-generate`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({
          ...validRequestData,
          courseDescription: "太短",
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
    });

    it("launchDate 格式錯誤（非 YYYY-MM-DD）→ 回傳 400", async () => {
      const res = await request(app)
        .post(`${baseURL}/ai-generate`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({
          ...validRequestData,
          launchDate: "2024/12/01",
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
    });

    it("numberOfPhases 為負數 → 回傳 400", async () => {
      const res = await request(app)
        .post(`${baseURL}/ai-generate`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({
          ...validRequestData,
          numberOfPhases: -1,
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
    });

    it("numberOfPhases 超過 5 → 回傳 400", async () => {
      const res = await request(app)
        .post(`${baseURL}/ai-generate`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({
          ...validRequestData,
          numberOfPhases: 6,
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
    });

    it("discountType 非 fixed 或 percent → 回傳 400", async () => {
      const res = await request(app)
        .post(`${baseURL}/ai-generate`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({
          ...validRequestData,
          discountType: "invalid",
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
    });

    it("phaseDurationDays 為負數 → 回傳 400", async () => {
      const res = await request(app)
        .post(`${baseURL}/ai-generate`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({
          ...validRequestData,
          phaseDurationDays: -1,
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
    });

    it("傳入無效型別（例如 courseDescription 為數字）→ 回傳 400", async () => {
      const res = await request(app)
        .post(`${baseURL}/ai-generate`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({
          ...validRequestData,
          courseDescription: 123,
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe("fail");
    });
  });

  describe("🧨 系統與 AI 錯誤", () => {
    it("Gemini / OpenAI 回傳格式不正確（非 JSON）→ 回傳 422", async () => {
      mockedGenerateCouponsPlan.mockResolvedValueOnce("invalid json string");

      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(422);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toContain("AI 回傳格式錯誤");
    });

    it("Gemini / OpenAI 回傳空白 → 回傳 422", async () => {
      mockedGenerateCouponsPlan.mockResolvedValueOnce("");

      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(422);
      expect(res.body.status).toBe("fail");
    });

    it("AI 回傳缺少 strategySummary 欄位 → 回傳 422", async () => {
      const invalidResponse = {
        coupons: validAIResponse.coupons,
      };
      mockedGenerateCouponsPlan.mockResolvedValueOnce(invalidResponse);

      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(422);
      expect(res.body.status).toBe("fail");
    });

    it("AI 回傳缺少 coupons 陣列 → 回傳 422", async () => {
      const invalidResponse = {
        strategySummary: "測試摘要",
      };
      mockedGenerateCouponsPlan.mockResolvedValueOnce(invalidResponse);

      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(422);
      expect(res.body.status).toBe("fail");
    });

    it("coupons 陣列為空 → 回傳 422", async () => {
      const invalidResponse = {
        strategySummary: "測試摘要",
        coupons: [],
      };
      mockedGenerateCouponsPlan.mockResolvedValueOnce(invalidResponse);

      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(422);
      expect(res.body.status).toBe("fail");
    });

    it("個別 coupon 缺少必要欄位 → 回傳 422", async () => {
      const invalidResponse = {
        strategySummary: "測試摘要",
        coupons: [
          {
            couponName: "測試優惠",
            // 缺少 type, code, value, startsAt, expiresAt
          },
        ],
      };
      mockedGenerateCouponsPlan.mockResolvedValueOnce(invalidResponse);

      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(422);
      expect(res.body.status).toBe("fail");
    });

    it("coupon 的 type 非 fixed 或 percent → 回傳 422", async () => {
      const invalidResponse = {
        strategySummary: "測試摘要",
        coupons: [
          {
            ...validAIResponse.coupons[0],
            type: "invalid",
          },
        ],
      };
      mockedGenerateCouponsPlan.mockResolvedValueOnce(invalidResponse);

      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(422);
      expect(res.body.status).toBe("fail");
    });

    it("coupon 的 value 為負數 → 回傳 422", async () => {
      const invalidResponse = {
        strategySummary: "測試摘要",
        coupons: [
          {
            ...validAIResponse.coupons[0],
            value: -10,
          },
        ],
      };
      mockedGenerateCouponsPlan.mockResolvedValueOnce(invalidResponse);

      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(422);
      expect(res.body.status).toBe("fail");
    });

    it("coupon 的 startsAt 格式錯誤 → 回傳 422", async () => {
      const invalidResponse = {
        strategySummary: "測試摘要",
        coupons: [
          {
            ...validAIResponse.coupons[0],
            startsAt: "2024/11/17",
          },
        ],
      };
      mockedGenerateCouponsPlan.mockResolvedValueOnce(invalidResponse);

      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(422);
      expect(res.body.status).toBe("fail");
    });

    it("AI 服務請求超時或中斷 → 回傳 500", async () => {
      mockedGenerateCouponsPlan.mockRejectedValueOnce(new Error("AI service timeout"));

      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(500);
    });
  });

  describe("🧪 加分項", () => {
    it("AI 回傳的 coupons 數量與 numberOfPhases 相符", async () => {
      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(200);
      expect(res.body.data.coupons).toHaveLength(validRequestData.numberOfPhases);
    });

    it("每個 coupon 的 startsAt 與 expiresAt 時間間隔符合 phaseDurationDays", async () => {
      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(200);

      res.body.data.coupons.forEach((coupon: any) => {
        const startDate = new Date(coupon.startsAt);
        const endDate = new Date(coupon.expiresAt);
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        expect(diffDays).toBe(validRequestData.phaseDurationDays);
      });
    });

    it("回傳格式符合 API 文件定義（status、data、message）", async () => {
      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("data");
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("strategySummary");
      expect(res.body.data).toHaveProperty("coupons");
    });

    it("可切換使用 OpenAI 與 Gemini 並維持相同行為", async () => {
      // 模擬 Gemini 回傳
      const geminiResponse = {
        strategySummary: "Gemini 產生的促銷策略",
        coupons: [
          {
            couponName: "Gemini 優惠",
            type: "fixed" as const,
            code: "GEMINI50",
            value: 50,
            startsAt: "2024-11-17",
            expiresAt: "2024-11-30",
          },
        ],
      };
      mockedGenerateCouponsPlan.mockResolvedValueOnce(geminiResponse);

      const res = await request(app)
        .post(`${baseURL}/ai-generate`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({
          ...validRequestData,
          numberOfPhases: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.strategySummary).toBe("Gemini 產生的促銷策略");
      expect(res.body.data.coupons[0].code).toBe("GEMINI50");
    });

    it("驗證 AI 回傳的折扣碼代碼格式正確", async () => {
      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(200);

      res.body.data.coupons.forEach((coupon: any) => {
        expect(coupon.code).toBeDefined();
        expect(typeof coupon.code).toBe("string");
        expect(coupon.code.length).toBeGreaterThan(0);
      });
    });

    it("驗證折扣碼名稱符合業務邏輯（中文標題）", async () => {
      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(200);

      res.body.data.coupons.forEach((coupon: any) => {
        expect(coupon.couponName).toBeDefined();
        expect(typeof coupon.couponName).toBe("string");
        expect(coupon.couponName.length).toBeGreaterThan(0);
        // 檢查是否包含中文字符
        expect(/[\u4e00-\u9fa5]/.test(coupon.couponName)).toBe(true);
      });
    });

    it("驗證 strategySummary 包含有效的行銷策略摘要", async () => {
      const res = await request(app).post(`${baseURL}/ai-generate`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);

      expect(res.status).toBe(200);
      expect(res.body.data.strategySummary).toBeDefined();
      expect(typeof res.body.data.strategySummary).toBe("string");
      expect(res.body.data.strategySummary.length).toBeGreaterThan(0);
      expect(/[\u4e00-\u9fa5]/.test(res.body.data.strategySummary)).toBe(true);
    });
  });
});
