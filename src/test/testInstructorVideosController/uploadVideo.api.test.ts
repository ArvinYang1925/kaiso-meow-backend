/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("firebase-admin", () => {
  return {
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(),
    },
    storage: jest.fn(() => ({
      bucket: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue(["uploaded"]),
      })),
    })),
  };
});

import request from "supertest";
import path from "path";
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
const fakeSectionId = "123e4567-e89b-12d3-a456-426614174999";
const fakeToken = createTestToken({ id: fakeUserId, role: "instructor" });
const studentToken = createTestToken({ id: fakeUserId, role: "student" });

let sectionRepoMock: any;

function buildSectionRepoMock(overrides = {}) {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  sectionRepoMock = buildSectionRepoMock();

  mockGetRepository.mockImplementation((entity) => {
    if (entity.name === "Section") return sectionRepoMock;
  });
});

const baseURL = `/api/v1/instructor/sections/${fakeSectionId}/video`;

describe("POST /api/v1/instructor/sections/:sectionId/video", () => {
  test("🟢 成功上傳影片並回傳 202", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      title: "測試章節",
      course: {
        instructorId: fakeUserId,
      },
    });
    const res = await request(app)
      .post(baseURL)
      .set("Authorization", `Bearer ${fakeToken}`)
      .attach("file", path.join(__dirname, "../fixtures/sample.mp4"));

    expect(res.status).toBe(202);
    expect(res.body.status).toBe("success");
  });

  test("🔐 未提供 JWT → 回傳 401", async () => {
    const res = await request(app).post(baseURL).field("dummy", "123"); // 不 attach，避免 EPIPE;

    expect(res.status).toBe(401);
  });

  test("🔐 學生身分 → 回傳 403", async () => {
    const res = await request(app).post(baseURL).set("Authorization", `Bearer ${studentToken}`).field("dummy", "123"); // 不 attach，避免 EPIPE
    expect(res.status).toBe(403);
  });

  test("⚠ 無效 sectionId 格式 → 回傳 400", async () => {
    const res = await request(app)
      .post("/api/v1/instructor/sections/invalid-uuid/video")
      .set("Authorization", `Bearer ${fakeToken}`)
      .attach("file", path.join(__dirname, "../fixtures/sample.mp4"));

    expect(res.status).toBe(400);
  });

  test("🚫 沒有上傳影片檔案 → 回傳 400", async () => {
    const res = await request(app).post(baseURL).set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(400);
  });

  test("🧨 模擬 DB 查詢錯誤 → 回傳 500", async () => {
    sectionRepoMock.findOne.mockRejectedValue(new Error("資料庫錯誤"));

    const res = await request(app)
      .post(baseURL)
      .set("Authorization", `Bearer ${fakeToken}`)
      .attach("file", path.join(__dirname, "../fixtures/sample.mp4"));

    expect(res.status).toBe(500);
  });
});
