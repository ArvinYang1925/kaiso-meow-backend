/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import app from "../../app";
import { AppDataSource } from "../../config/db";
import { createTestToken } from "../../utils/jwtUtils";

// Mock資料與設定
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

function buildSectionRepoMock(overrides = {}) {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  courseRepoMock = { findOne: jest.fn() };
  sectionRepoMock = buildSectionRepoMock();

  mockGetRepository.mockImplementation((entity) => {
    if (entity.name === "Course") return courseRepoMock;
    if (entity.name === "Section") return sectionRepoMock;
  });
});

const baseURL = `/api/v1/instructor/sections/${fakeSectionId}`;

describe("DELETE /api/v1/instructor/sections/:sectionId", () => {
  it("🟢 成功刪除章節", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      course: {
        id: "course-1",
        instructorId: fakeUserId,
      },
    });

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("章節已成功刪除");
    expect(sectionRepoMock.remove).toHaveBeenCalled();
    expect(reorderSections).toHaveBeenCalledWith("course-1");
  });

  it("❌ 缺少 JWT → 回傳 401", async () => {
    const res = await request(app).delete(baseURL);
    expect(res.status).toBe(401);
  });

  it("❌ 學生身分呼叫 → 回傳 403", async () => {
    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it("❌ sectionId 非 UUID → 回傳 400", async () => {
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

  it("❌ 非該講師的章節 → 回傳 403", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      course: {
        id: "course-1",
        instructorId: "other-instructor",
      },
    });

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("無權限存取.");
  });

  it("🧨 模擬 remove 出錯 → 回傳 500", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      course: {
        id: "course-1",
        instructorId: fakeUserId,
      },
    });

    sectionRepoMock.remove.mockRejectedValue(new Error("DB Remove Failed"));

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(500);
  });
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

  it("❌ 課程已有學生訂單 → 回傳 422", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      isPublished: false,
      course: {
        id: "course-1",
        instructorId: fakeUserId,
        isPublished: false,
        orders: [{}], // 模擬有一筆訂單
        progresses: [],
      },
    });

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(422);
    expect(res.body.message).toBe("已有學生購買此課程，無法刪除章節");
  });

  it("❌ 課程已有學生觀看紀錄 → 回傳 422", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      isPublished: false,
      course: {
        id: "course-1",
        instructorId: fakeUserId,
        isPublished: false,
        orders: [],
        progresses: [{}], // 模擬有一筆進度紀錄
      },
    });

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(422);
    expect(res.body.message).toBe("已有學生觀看紀錄，無法刪除章節");
  });
});
