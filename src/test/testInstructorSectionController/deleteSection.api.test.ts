/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import app from "../../app";
import { AppDataSource } from "../../config/db";
import { createTestToken } from "../../utils/jwtUtils";

jest.mock("../../config/db", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock("../../utils/sectionUtils", () => ({
  reorderSections: jest.fn().mockResolvedValue(undefined),
}));

import { reorderSections } from "../../utils/sectionUtils";

const mockGetRepository = AppDataSource.getRepository as jest.Mock;

const fakeUserId = "user-123";
const fakeSectionId = "123e4567-e89b-12d3-a456-426614174999";
const fakeToken = createTestToken({ id: fakeUserId, role: "instructor" });
const studentToken = createTestToken({ id: fakeUserId, role: "student" });

let sectionRepoMock: any;
let courseRepoMock: any;
let progressRepoMock: any;

beforeEach(() => {
  sectionRepoMock = { findOne: jest.fn(), remove: jest.fn() };
  courseRepoMock = { findOne: jest.fn() };
  progressRepoMock = { findOne: jest.fn() };

  mockGetRepository.mockImplementation((entity) => {
    if (entity.name === "Section") return sectionRepoMock;
    if (entity.name === "Course") return courseRepoMock;
    if (entity.name === "StudentProgress") return progressRepoMock;
  });
});

const baseURL = `/api/v1/instructor/sections/${fakeSectionId}`;

describe("DELETE /api/v1/instructor/sections/:sectionId", () => {
  // ✅ 成功刪除
  it("🟢 成功刪除章節", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      isPublished: false,
      course: {
        id: "course-1",
        instructorId: fakeUserId,
        isPublished: false,
        orders: [],
        progresses: [],
      },
    });

    progressRepoMock.findOne.mockResolvedValue(null);
    sectionRepoMock.remove.mockResolvedValue(undefined);

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("章節已成功刪除");
    expect(sectionRepoMock.remove).toHaveBeenCalled();
    expect(reorderSections).toHaveBeenCalledWith("course-1");
  });

  // 🔐 身分驗證
  it("❌ 未帶 JWT → 回傳 401", async () => {
    const res = await request(app).delete(baseURL);
    expect(res.status).toBe(401);
  });

  it("❌ 學生身分呼叫 → 回傳 403", async () => {
    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  // ⚠ 請求錯誤
  it("❌ 非 UUID → 回傳 400", async () => {
    const res = await request(app).delete("/api/v1/instructor/sections/not-a-uuid").set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("無效的章節ID格式");
  });

  it("❌ 查無章節 → 回傳 400", async () => {
    sectionRepoMock.findOne.mockResolvedValue(null);

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("章節不存在");
  });

  it("❌ 非自己課程的章節 → 回傳 403", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      isPublished: false,
      course: {
        id: "course-1",
        instructorId: "someone-else",
        isPublished: false,
        orders: [],
        progresses: [],
      },
    });

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("無權限存取.");
  });

  // 🚫 刪除限制條件
  it("❌ 章節已發佈 → 回傳 422", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      isPublished: true,
      course: {
        id: "course-1",
        instructorId: fakeUserId,
        isPublished: false,
        orders: [],
        progresses: [],
      },
    });

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(422);
    expect(res.body.message).toBe("章節已發佈，無法刪除");
  });

  it("❌ 課程已發佈 → 回傳 422", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      isPublished: false,
      course: {
        id: "course-1",
        instructorId: fakeUserId,
        isPublished: true,
        orders: [],
        progresses: [],
      },
    });

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(422);
    expect(res.body.message).toBe("課程已發佈，無法刪除章節");
  });

  it("❌ 課程已有付款訂單 → 回傳 422", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      isPublished: false,
      course: {
        id: "course-1",
        instructorId: fakeUserId,
        isPublished: false,
        orders: [{ id: "order-1", paidAt: new Date() }],
        progresses: [],
      },
    });

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(422);
    expect(res.body.message).toBe("已有學生購買此課程，無法刪除章節");
  });

  it("❌ 該章節有學生觀看紀錄 → 回傳 422", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      isPublished: false,
      course: {
        id: "course-1",
        instructorId: fakeUserId,
        isPublished: false,
        orders: [],
        progresses: [],
      },
    });

    progressRepoMock.findOne.mockResolvedValue({
      id: "progress-1",
      section: { id: fakeSectionId },
    });

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(422);
    expect(res.body.message).toBe("已有學生觀看紀錄，無法刪除章節");
  });

  // 🧨 非預期錯誤
  it("❌ remove 過程錯誤 → 回傳 500", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      isPublished: false,
      course: {
        id: "course-1",
        instructorId: fakeUserId,
        isPublished: false,
        orders: [],
        progresses: [],
      },
    });

    progressRepoMock.findOne.mockResolvedValue(null);
    sectionRepoMock.remove.mockRejectedValue(new Error("DB Remove Failed"));

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(500);
  });
});
