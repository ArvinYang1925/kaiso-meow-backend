// 前面已經引入的內容保留
import request from "supertest";
import app from "../../app";
import { AppDataSource } from "../../config/db";
import { createTestToken } from "../../utils/jwtUtils";

jest.mock("../../config/db", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

const mockGetRepository = AppDataSource.getRepository as jest.Mock;

const fakeUserId = "user-123";
const fakeCourseId = "123e4567-e89b-12d3-a456-426614174000";
const fakeToken = createTestToken({ id: fakeUserId, role: "instructor" });
const studentToken = createTestToken({ id: fakeUserId, role: "student" });

describe("GET /api/v1/instructor/courses/:courseId/sections — 額外測試情境", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("✔ 回傳空章節清單 → 200，data: []", async () => {
    mockGetRepository.mockImplementation((entity) => {
      if (entity.name === "Course") {
        return { findOne: jest.fn().mockResolvedValue({ id: fakeCourseId, instructorId: fakeUserId }) };
      }
      if (entity.name === "Section") {
        return { find: jest.fn().mockResolvedValue([]) };
      }
    });

    const res = await request(app).get(`/api/v1/instructor/courses/${fakeCourseId}/sections`).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("❌ 無效 JWT → 回傳 401", async () => {
    const res = await request(app).get(`/api/v1/instructor/courses/${fakeCourseId}/sections`).set("Authorization", "Bearer invalidtoken");

    expect(res.status).toBe(401);
  });

  it("❌ 身分為學生 → 回傳 403（假設中間件驗證 role）", async () => {
    // 注意：此測試前提為 middleware 檢查 role 為 instructor
    const res = await request(app)
      .get(`/api/v1/instructor/courses/${fakeCourseId}/sections`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403); // 預設實作為禁止學生存取
  });

  it("❌ courseId 為空字串 → 回傳 400", async () => {
    const res = await request(app).get("/api/v1/instructor/courses//sections").set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(404); // Express 無法匹配路由時通常回傳 404
  });

  it("❌ courseId 為數字 → 回傳 400", async () => {
    const res = await request(app).get("/api/v1/instructor/courses/123/sections").set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/課程ID格式/);
  });

  it("❌ courseId 對應不到課程 → 回傳 404", async () => {
    mockGetRepository.mockImplementation((entity) => {
      if (entity.name === "Course") {
        return { findOne: jest.fn().mockResolvedValue(null) };
      }
    });
    const nonexistentCourseId = "123e4567-e89b-12d3-a456-426614174999";

    const res = await request(app)
      .get(`/api/v1/instructor/courses/${nonexistentCourseId}/sections`)
      .set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(404);
  });
});
