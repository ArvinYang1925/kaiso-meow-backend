/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import app from "../../app";
import { AppDataSource } from "../../config/db";
import { createTestToken } from "../../utils/jwtUtils";
import { simpleQueue } from "../../utils/simpleQueue";

jest.mock("../../config/db", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock("../../utils/simpleQueue", () => ({
  simpleQueue: {
    getTaskInfo: jest.fn(),
    hasTask: jest.fn(),
  },
}));

const mockGetRepository = AppDataSource.getRepository as jest.Mock;
const mockSimpleQueue = simpleQueue as jest.Mocked<typeof simpleQueue>;

const fakeUserId = "user-123";
const fakeSectionId = "123e4567-e89b-12d3-a456-426614174999";
const fakeToken = createTestToken({ id: fakeUserId, role: "instructor" });
const studentToken = createTestToken({ id: fakeUserId, role: "student" });

let sectionRepoMock: any;

function buildSectionRepoMock(overrides = {}) {
  return {
    findOne: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  sectionRepoMock = buildSectionRepoMock();
  mockGetRepository.mockImplementation((entity) => {
    if (entity.name === "Section") return sectionRepoMock;
  });
  jest.clearAllMocks();
});

const baseURL = `/api/v1/instructor/sections/${fakeSectionId}/video/status`;

describe("GET /api/v1/instructor/sections/:sectionId/video/status", () => {
  // 🟢 正常流程
  test("🟢當 videoUrl 為合法 Firebase URL 時，回傳 completed 狀態", async () => {
    const validFirebaseUrl = "https://storage.googleapis.com/bucket-name/section-123/video.m3u8";
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: validFirebaseUrl,
      course: { instructorId: fakeUserId },
    });

    const res = await request(app).get(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      message: "成功取得影片狀態",
      data: {
        uploadStatus: "completed",
        videoUrl: validFirebaseUrl,
      },
    });
  });

  test("🟢當 videoUrl 為 null 且任務在佇列中時，回傳 pending 狀態", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: null,
      course: { instructorId: fakeUserId },
    });
    mockSimpleQueue.getTaskInfo.mockReturnValue({
      id: fakeSectionId,
      status: "pending",
    });

    const res = await request(app).get(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      uploadStatus: "pending",
      videoUrl: null,
    });
  });

  test("🟢當 videoUrl 為 null 且任務處理中時，回傳 processing 狀態", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: null,
      course: { instructorId: fakeUserId },
    });
    mockSimpleQueue.getTaskInfo.mockReturnValue({
      id: fakeSectionId,
      status: "processing",
    });

    const res = await request(app).get(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      uploadStatus: "processing",
      videoUrl: null,
    });
  });

  test("🟢當 videoUrl 為 null 且無任務時，回傳 no_video 狀態", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: null,
      course: { instructorId: fakeUserId },
    });
    mockSimpleQueue.getTaskInfo.mockReturnValue(null);

    const res = await request(app).get(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      uploadStatus: "no_video",
      videoUrl: null,
    });
  });

  test("🟢當 videoUrl 包含轉檔失敗錯誤時，回傳 failed 狀態", async () => {
    const errorMessage = "轉檔失敗：不支援的影片格式";
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: `error:${errorMessage}`,
      course: { instructorId: fakeUserId },
    });

    const res = await request(app).get(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      uploadStatus: "failed",
      videoUrl: errorMessage,
      errorType: "transcode",
    });
  });

  test("🟢當 videoUrl 包含上傳失敗錯誤時，回傳 failed 狀態", async () => {
    const errorMessage = "上傳失敗：Firebase 連線錯誤";
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: `error:${errorMessage}`,
      course: { instructorId: fakeUserId },
    });

    const res = await request(app).get(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      uploadStatus: "failed",
      videoUrl: errorMessage,
      errorType: "upload",
    });
  });

  // 🔐 身分驗證相關
  test("🔐缺少 JWT → 回傳 401", async () => {
    const res = await request(app).get(baseURL);
    expect(res.status).toBe(401);
  });

  test("🔐使用學生身分 → 回傳 403", async () => {
    const res = await request(app).get(baseURL).set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  test("🔐非課程講師 → 回傳 403", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      course: { instructorId: "other-instructor" },
    });

    const res = await request(app).get(baseURL).set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).toBe(403);
  });

  // ⚠ 請求參數驗證
  test("❌無效的 sectionId 格式 → 回傳 400", async () => {
    const res = await request(app).get("/api/v1/instructor/sections/invalid-uuid/video/status").set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/章節ID格式/);
  });

  test("❌找不到章節 → 回傳 404", async () => {
    sectionRepoMock.findOne.mockResolvedValue(null);

    const res = await request(app).get(baseURL).set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).toBe(404);
  });

  // 🧨 錯誤處理
  test("🧨資料庫查詢錯誤 → 回傳 500", async () => {
    sectionRepoMock.findOne.mockRejectedValue(new Error("資料庫錯誤"));

    const res = await request(app).get(baseURL).set("Authorization", `Bearer ${fakeToken}`);
    expect(res.status).toBe(500);
  });

  // 📊 URL 驗證
  test("❌非 HTTPS URL → 視為無效 URL", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: "http://example.com/video.m3u8",
      course: { instructorId: fakeUserId },
    });

    const res = await request(app).get(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      uploadStatus: "failed",
      videoUrl: "影片處理失敗：無效的影片 URL 格式",
      errorType: "unknown",
    });
  });

  test("❌非 Firebase Storage URL → 視為無效 URL", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      videoUrl: "https://example.com/video.m3u8",
      course: { instructorId: fakeUserId },
    });

    const res = await request(app).get(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      uploadStatus: "failed",
      videoUrl: "影片處理失敗：無效的影片 URL 格式",
      errorType: "unknown",
    });
  });
});
