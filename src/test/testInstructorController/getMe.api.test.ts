import request from "supertest";
import app from "../../app"; // 你的 express 應用實例
import { AppDataSource } from "../../config/db";
import { createTestToken } from "../../utils/jwtUtils"; // 測試用 token 工具

let getMePath = "/api/v1/instructor/me";

jest.mock("../../config/db", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe("GET /api/v1/instructor/me", () => {
  const token = createTestToken({ id: "mock-user-id", role: "instructor" });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 🟢 正常流程
  it("✅ 成功回傳講師資料", async () => {
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue({
        id: "instructor-id",
        user: {
          name: "Meow",
          email: "meow@cat.com",
          profileUrl: "https://cdn.example.com/avatar.png",
        },
      }),
    });

    const res = await request(app).get(getMePath).set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: "success",
      message: "取得講師資料成功",
      data: {
        name: "Meow",
        email: "meow@cat.com",
        profileUrl: expect.any(String),
      },
    });
  });

  // 🔐 身分驗證
  it("❌ 未帶 Authorization Header → 401", async () => {
    const res = await request(app).get(getMePath);
    expect(res.statusCode).toBe(401);
  });

  it("❌ 使用者 role 不是 instructor → 403", async () => {
    const studentToken = createTestToken({ id: "mock-user", role: "student" });
    const res = await request(app).get(getMePath).set("Authorization", `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(403);
  });

  it("❌ 缺少 user.id 或 role → 400", async () => {
    const brokenToken = createTestToken({ id: "", role: "instructor" });
    const res = await request(app).get(getMePath).set("Authorization", `Bearer ${brokenToken}`);

    expect(res.statusCode).toBe(400);
  });

  // ⚠ 異常資料處理
  it("❌ 查無講師資料 → 400", async () => {
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app).get(getMePath).set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
  });

  it("❌ DB 查詢錯誤 → 500", async () => {
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockRejectedValue(new Error("DB error")),
    });

    const res = await request(app).get(getMePath).set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(500);
  });

  it("✅ 回傳格式正確且無洩漏敏感資訊", async () => {
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      findOne: jest.fn().mockResolvedValue({
        id: "instructor-id",
        user: {
          name: "Secure Cat",
          email: "cat@safe.com",
          profileUrl: "https://cdn.example.com/secure.png",
        },
      }),
    });

    const res = await request(app).get(getMePath).set("Authorization", `Bearer ${token}`);

    expect(res.body.data).not.toHaveProperty("token");
    expect(res.body.data).not.toHaveProperty("id", "mock-user-id"); // ID 是講師的，不是 JWT payload
  });
});
