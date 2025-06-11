/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import app from "../../app";
import { AppDataSource } from "../../config/db";
import { createTestToken } from "../../utils/jwtUtils";
import { deleteHLSFolderFromFirebase } from "../../utils/firebaseUtils";

jest.mock("../../config/db", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    query: jest.fn(),
  },
}));

jest.mock("../../utils/firebaseUtils", () => ({
  deleteHLSFolderFromFirebase: jest.fn().mockResolvedValue(undefined),
}));

const mockGetRepository = AppDataSource.getRepository as jest.Mock;
const mockQuery = AppDataSource.query as jest.Mock;
const mockDeleteHLSFolder = deleteHLSFolderFromFirebase as jest.Mock;

const fakeUserId = "user-123";
const fakeSectionId = "123e4567-e89b-12d3-a456-426614174999";
const fakeToken = createTestToken({ id: fakeUserId, role: "instructor" });
const studentToken = createTestToken({ id: fakeUserId, role: "student" });

let sectionRepoMock: any;
let orderRepoMock: any;

function buildSectionRepoMock(overrides = {}) {
  return {
    findOne: jest.fn(),
    ...overrides,
  };
}

function buildOrderRepoMock(overrides = {}) {
  return {
    count: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  sectionRepoMock = buildSectionRepoMock();
  orderRepoMock = buildOrderRepoMock();

  mockGetRepository.mockImplementation((entity) => {
    if (entity.name === "Section") return sectionRepoMock;
    if (entity.name === "Order") return orderRepoMock;
  });

  jest.clearAllMocks();
});

const baseURL = `/api/v1/instructor/sections/${fakeSectionId}/video`;

describe("DELETE /api/v1/instructor/sections/:sectionId/video", () => {
  // 🟢 正常流程
  test("🟢 講師成功刪除自己課程章節的影片", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      title: "測試章節",
      content: "測試內容",
      videoUrl: "https://storage.googleapis.com/bucket/video.m3u8",
      isPublished: false,
      course: {
        id: "course-123",
        instructorId: fakeUserId,
      },
      progresses: [],
    });

    orderRepoMock.count.mockResolvedValue(0);

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      data: {
        id: fakeSectionId,
        title: "測試章節",
        content: "測試內容",
        videoUrl: null,
        isPublished: false,
      },
    });
    expect(mockQuery).toHaveBeenCalledWith("UPDATE sections SET video_url = NULL WHERE id = $1", [fakeSectionId]);
  });

  // 🔐 身分驗證相關
  test("🔐 缺少 JWT → 回傳 401", async () => {
    const res = await request(app).delete(baseURL);
    expect(res.status).toBe(401);
  });

  test("🔐 使用學生身分 → 回傳 403", async () => {
    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  test("🔐 非課程講師 → 回傳 403", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: "https://storage.googleapis.com/bucket/video.m3u8",
      course: { instructorId: "other-instructor" },
      progresses: [],
    });

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).toBe(403);
  });

  // ⚠ 請求參數驗證
  test("⚠ 無效的 sectionId 格式 → 回傳 400", async () => {
    const res = await request(app).delete("/api/v1/instructor/sections/invalid-uuid/video").set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/章節ID格式/);
  });

  // 🚫 狀態驗證與流程判斷
  test("🚫 找不到章節 → 回傳 404", async () => {
    sectionRepoMock.findOne.mockResolvedValue(null);

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).toBe(404);
  });

  test("🚫 章節沒有影片 → 回傳 404", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: null,
      course: { instructorId: fakeUserId },
    });

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/沒有影片可刪除/);
  });

  test("🚫 章節已公開且有訂單 → 回傳 422", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: "https://storage.googleapis.com/bucket/video.m3u8",
      isPublished: true,
      course: {
        id: "course-123",
        instructorId: fakeUserId,
      },
      progresses: [],
    });

    orderRepoMock.count.mockResolvedValue(1);

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/章節已公開或已有觀看紀錄/);
  });

  test("🚫 章節已有觀看紀錄 → 回傳 422", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: "https://storage.googleapis.com/bucket/video.m3u8",
      isPublished: true,
      course: {
        id: "course-123",
        instructorId: fakeUserId,
      },
      progresses: [{ id: "progress-1" }],
    });

    orderRepoMock.count.mockResolvedValue(0);

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/章節已公開或已有觀看紀錄/);
  });

  // 🧨 錯誤處理
  test("🧨 資料庫查詢錯誤 → 回傳 500", async () => {
    sectionRepoMock.findOne.mockRejectedValue(new Error("資料庫錯誤"));

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).toBe(500);
  });

  test("🧨 Firebase 刪除錯誤 → 回傳 500", async () => {
    mockDeleteHLSFolder.mockRejectedValue(new Error("Firebase 錯誤"));

    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: "https://storage.googleapis.com/bucket/video.m3u8",
      isPublished: false,
      course: {
        id: "course-123",
        instructorId: fakeUserId,
      },
      progresses: [],
    });

    orderRepoMock.count.mockResolvedValue(0);

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).toBe(500);
  });

  test("🧨 資料庫更新錯誤 → 回傳 500", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: "https://storage.googleapis.com/bucket/video.m3u8",
      isPublished: false,
      course: {
        id: "course-123",
        instructorId: fakeUserId,
      },
      progresses: [],
    });

    orderRepoMock.count.mockResolvedValue(0);
    mockQuery.mockRejectedValue(new Error("更新錯誤"));

    const res = await request(app).delete(baseURL).set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).toBe(500);
  });
});
