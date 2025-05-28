// tests/instructor/batchCreateSections.test.ts
import request from "supertest";
import app from "../../app";
import { AppDataSource } from "../../config/db";
import { createTestToken } from "../../utils/jwtUtils";
import { Course } from "../../entities/Course";
import { Section } from "../../entities/Section";

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

let courseRepoMock: { findOne: jest.Mock };
let sectionRepoMock: ReturnType<typeof buildSectionRepoMock>;

function buildSectionRepoMock(overrides = {}) {
  return {
    save: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  courseRepoMock = {
    findOne: jest.fn(),
  };

  sectionRepoMock = buildSectionRepoMock();

  mockGetRepository.mockImplementation((entity) => {
    if (entity === Course || entity.name === "Course") return courseRepoMock;
    if (entity === Section || entity.name === "Section") return sectionRepoMock;
  });
});

describe("POST /api/v1/instructor/courses/:courseId/sections/batch", () => {
  const endpoint = `/api/v1/instructor/courses/${fakeCourseId}/sections/batch`;

  const validPayload = {
    sections: [
      { title: "第一章", content: "簡介" },
      { title: "第二章", content: "進階內容" },
    ],
  };

  it("✅ 成功新增章節", async () => {
    courseRepoMock.findOne.mockResolvedValue({
      id: fakeCourseId,
      instructorId: fakeUserId,
      sections: [{}, {}, {}], // 模擬已存在三個章節
    });

    sectionRepoMock.save.mockResolvedValue([
      {
        id: "section-1",
        title: "第一章",
        content: "簡介",
        videoUrl: null,
        isPublished: false,
        orderIndex: 4,
      },
      {
        id: "section-2",
        title: "第二章",
        content: "進階內容",
        videoUrl: null,
        isPublished: false,
        orderIndex: 5,
      },
    ]);

    const res = await request(app).post(endpoint).set("Authorization", `Bearer ${fakeToken}`).send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toHaveProperty("id");
    expect(res.body.data[0].order).toBe(4);
  });

  it("🔐 缺少 JWT → 回傳 401", async () => {
    const res = await request(app).post(endpoint).send(validPayload);
    expect(res.status).toBe(401);
  });

  it("🔐 使用學生身份 → 回傳 403", async () => {
    courseRepoMock.findOne.mockResolvedValue(null);
    const res = await request(app).post(endpoint).set("Authorization", `Bearer ${studentToken}`).send(validPayload);
    expect(res.status).toBe(403);
  });

  it("🚫 非合法 courseId 格式 → 回傳 400", async () => {
    const res = await request(app)
      .post("/api/v1/instructor/courses/invalid-id/sections/batch")
      .set("Authorization", `Bearer ${fakeToken}`)
      .send(validPayload);
    expect(res.status).toBe(400);
  });

  it("⚠ sections 為空陣列 → 回傳 400", async () => {
    const res = await request(app).post(endpoint).set("Authorization", `Bearer ${fakeToken}`).send({ sections: [] });

    expect(res.status).toBe(400);
  });

  it("⚠ sections 缺 title → 回傳 400", async () => {
    const res = await request(app)
      .post(endpoint)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ sections: [{ content: "沒標題" }] });

    expect(res.status).toBe(400);
  });

  it("🧨 資料庫錯誤 → 回傳 500", async () => {
    courseRepoMock.findOne.mockRejectedValue(new Error("DB query error"));

    const res = await request(app).post(endpoint).set("Authorization", `Bearer ${fakeToken}`).send(validPayload);

    expect(res.status).toBe(500);
  });
});
