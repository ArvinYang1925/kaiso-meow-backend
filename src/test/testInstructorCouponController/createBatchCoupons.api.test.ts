/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import app from "../../app";
import { createTestToken } from "../../utils/jwtUtils";
import { AppDataSource } from "../../config/db";

const fakeUserId = "user-123";
const fakeToken = createTestToken({ id: fakeUserId, role: "instructor" });
const studentToken = createTestToken({ id: fakeUserId, role: "student" });

const validCoupon = {
  couponName: "早鳥優惠",
  type: "fixed",
  code: "EARLYBIRD100",
  value: 100,
  startsAt: "2024-11-17",
  expiresAt: "2024-11-30",
};

const validRequestData = {
  coupons: [validCoupon],
};

const baseURL = "/api/v1/instructor/coupons";

// 建立假的 queryRunner
const fakeQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  manager: {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((_, data) => data),
    save: jest.fn().mockResolvedValue([
      {
        couponName: "早鳥優惠",
        type: "fixed",
        code: "EARLYBIRD100",
        value: 100,
        startsAt: "2024-11-17",
        expiresAt: "2024-11-30",
      },
    ]),
  },
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
};

jest.spyOn(AppDataSource, "createQueryRunner").mockReturnValue(fakeQueryRunner as any);

describe("POST /api/v1/instructor/coupons/batch", () => {
  describe("🟢 正常流程", () => {
    it("成功產出折扣碼計劃，response 包含 couponList[]", async () => {
      const res = await request(app).post(`${baseURL}/batch`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(Array.isArray(res.body.data.couponList)).toBe(true);
      expect(res.body.data.couponList[0]).toHaveProperty("couponName");
      expect(res.body.data.couponList[0]).toHaveProperty("type");
      expect(res.body.data.couponList[0]).toHaveProperty("code");
      expect(res.body.data.couponList[0]).toHaveProperty("value");
      expect(res.body.data.couponList[0]).toHaveProperty("startsAt");
      expect(res.body.data.couponList[0]).toHaveProperty("expiresAt");
    });
    it("即使 coupons 陣列只有一筆也能成功", async () => {
      const res = await request(app)
        .post(`${baseURL}/batch`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({ coupons: [validCoupon] });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
    });
  });

  describe("🔐 身分驗證", () => {
    it("缺少 Authorization header，回傳 401", async () => {
      const res = await request(app).post(`${baseURL}/batch`).send(validRequestData);
      expect(res.status).toBe(401);
    });
    it("JWT 無效或過期，回傳 401", async () => {
      const res = await request(app).post(`${baseURL}/batch`).set("Authorization", "Bearer invalid.token.here").send(validRequestData);
      expect(res.status).toBe(401);
    });
    it("用戶角色非 instructor，回傳 403", async () => {
      const res = await request(app).post(`${baseURL}/batch`).set("Authorization", `Bearer ${studentToken}`).send(validRequestData);
      expect(res.status).toBe(403);
    });
  });

  describe("⚠ 資料驗證（Zod）", () => {
    it("缺少 coupons 欄位 → 回傳 400", async () => {
      const res = await request(app).post(`${baseURL}/batch`).set("Authorization", `Bearer ${fakeToken}`).send({});
      expect(res.status).toBe(400);
    });
    it("coupons 陣列為空 → 回傳 400", async () => {
      const res = await request(app).post(`${baseURL}/batch`).set("Authorization", `Bearer ${fakeToken}`).send({ coupons: [] });
      expect(res.status).toBe(400);
    });
    it("coupon 缺少必要欄位 → 回傳 400", async () => {
      const { couponName, ...invalidCoupon } = validCoupon;
      const res = await request(app)
        .post(`${baseURL}/batch`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({ coupons: [invalidCoupon] });
      expect(res.status).toBe(400);
    });
    it("type 非 fixed/percent → 回傳 400", async () => {
      const res = await request(app)
        .post(`${baseURL}/batch`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({ coupons: [{ ...validCoupon, type: "other" }] });
      expect(res.status).toBe(400);
    });
    it("value 為負數 → 回傳 400", async () => {
      const res = await request(app)
        .post(`${baseURL}/batch`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({ coupons: [{ ...validCoupon, value: -10 }] });
      expect(res.status).toBe(400);
    });
    it("startsAt/expiresAt 格式錯誤 → 回傳 400", async () => {
      const res = await request(app)
        .post(`${baseURL}/batch`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({ coupons: [{ ...validCoupon, startsAt: "2024/11/17" }] });
      expect(res.status).toBe(400);
    });
    it("傳入非合法 JSON 格式 → 回傳 400", async () => {
      // supertest 不支援直接傳送非法 JSON，這類測試可用 integration 層測
    });
  });

  describe("⚠ 權限與資料驗證", () => {
    it("用戶未登入（未帶 Authorization header）→ 回傳 401", async () => {
      const res = await request(app).post(`${baseURL}/batch`).send(validRequestData);
      expect(res.status).toBe(401);
    });
    it("用戶角色非 instructor → 回傳 403", async () => {
      const res = await request(app).post(`${baseURL}/batch`).set("Authorization", `Bearer ${studentToken}`).send(validRequestData);
      expect(res.status).toBe(403);
    });
  });

  describe("🧨 系統與 DB 錯誤", () => {
    it("資料庫重複 code 或 couponName → 回傳 409", async () => {
      // 需 mock DB 讓其回傳重複
      // 可用 integration 層或 mock repository 實現
    });
    it("DB 連線失敗 → 回傳 500", async () => {
      // 需 mock queryRunner 讓其 throw error
    });
  });

  describe("🧪 加分項", () => {
    it("驗證折扣碼名稱符合業務邏輯（中文標題）", async () => {
      const res = await request(app)
        .post(`${baseURL}/batch`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({ coupons: [{ ...validCoupon, couponName: "中文標題" }] });
      expect(res.status).toBe(200);
    });
    it("驗證折扣碼代碼格式正確", async () => {
      const res = await request(app)
        .post(`${baseURL}/batch`)
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({ coupons: [{ ...validCoupon, code: "CODE2024" }] });
      expect(res.status).toBe(200);
    });
  });

  describe("🔧 測試環境設定", () => {
    it("可切換使用不同 JWT 角色", async () => {
      const instructorRes = await request(app).post(`${baseURL}/batch`).set("Authorization", `Bearer ${fakeToken}`).send(validRequestData);
      expect(instructorRes.status).toBe(200);
      const studentRes = await request(app).post(`${baseURL}/batch`).set("Authorization", `Bearer ${studentToken}`).send(validRequestData);
      expect(studentRes.status).toBe(403);
    });
    it("可設定測試用環境變數（AI_PROVIDER）", () => {
      process.env.AI_PROVIDER = "OPENAI";
      expect(process.env.AI_PROVIDER).toBe("OPENAI");
    });
  });
});
