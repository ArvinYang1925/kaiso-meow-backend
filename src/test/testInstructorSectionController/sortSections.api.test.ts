/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import app from "../../app";
import { AppDataSource } from "../../config/db";
import { createTestToken } from "../../utils/jwtUtils";

jest.mock("../../config/db", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    transaction: jest.fn().mockImplementation((callback) => callback({ update: jest.fn() })),
  },
}));

const mockGetRepository = AppDataSource.getRepository as jest.Mock;

const fakeUserId = "user-123";
const fakeCourseId = "123e4567-e89b-12d3-a456-426614174999";
const fakeToken = createTestToken({ id: fakeUserId, role: "instructor" });
const studentToken = createTestToken({ id: fakeUserId, role: "student" });

let sectionRepoMock: any;
let courseRepoMock: any;

function buildSectionRepoMock(overrides = {}) {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
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

const baseURL = `/api/v1/instructor/courses/${fakeCourseId}/sections/sort`;

describe("PUT /api/v1/instructor/courses/:courseId/sections/sort", () => {
  const mockSections = [
    { id: "section-1", order: 1 },
    { id: "section-2", order: 2 },
    { id: "section-3", order: 3 },
  ];

  const mockUpdatedSections = [
    { id: "section-1", title: "第一章", content: "內容1", videoUrl: null, isPublished: false },
    { id: "section-2", title: "第二章", content: "內容2", videoUrl: null, isPublished: false },
    { id: "section-3", title: "第三章", content: "內容3", videoUrl: null, isPublished: false },
  ];

  // 🟢 正常流程
  it("✅ 成功更新章節順序", async () => {
    courseRepoMock.findOne.mockResolvedValue({
      id: fakeCourseId,
      instructorId: fakeUserId,
      isPublished: false,
      orders: [],
    });

    sectionRepoMock.find.mockResolvedValue(mockUpdatedSections);

    const res = await request(app).put(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ sections: mockSections });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0]).toHaveProperty("id");
    expect(res.body.data[0]).toHaveProperty("title");
    expect(res.body.data[0]).toHaveProperty("content");
    expect(res.body.data[0]).toHaveProperty("videoUrl");
    expect(res.body.data[0]).toHaveProperty("isPublished");
  });

  // 🔐 身分驗證
  it("❌ 未帶 JWT → 回傳 401", async () => {
    const res = await request(app).put(baseURL).send({ sections: mockSections });
    expect(res.status).toBe(401);
  });

  it("❌ 學生身分呼叫 → 回傳 403", async () => {
    const res = await request(app).put(baseURL).set("Authorization", `Bearer ${studentToken}`).send({ sections: mockSections });

    expect(res.status).toBe(403);
  });

  // ⚠ Zod 驗證
  it("❌ 缺少 sections 欄位 → 回傳 400", async () => {
    const res = await request(app).put(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({});

    expect(res.status).toBe(400);
  });

  it("❌ sections 不是陣列 → 回傳 400", async () => {
    const res = await request(app).put(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ sections: "not-an-array" });

    expect(res.status).toBe(400);
  });

  it("❌ sections 為空陣列 → 回傳 400", async () => {
    const res = await request(app).put(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ sections: [] });

    expect(res.status).toBe(400);
  });

  it("❌ order 值重複 → 回傳 422", async () => {
    courseRepoMock.findOne.mockResolvedValue({
      id: fakeCourseId,
      instructorId: fakeUserId,
      isPublished: false,
      orders: [],
    });
    sectionRepoMock.find.mockResolvedValue([
      { id: "section-1", isPublished: false },
      { id: "section-2", isPublished: false },
    ]);
    const res = await request(app)
      .put(baseURL)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({
        sections: [
          { id: "section-1", order: 1 },
          { id: "section-2", order: 1 },
        ],
      });
    expect(res.status).toBe(422);
  });

  it("❌ order 值不從 1 開始 → 回傳 422", async () => {
    courseRepoMock.findOne.mockResolvedValue({
      id: fakeCourseId,
      instructorId: fakeUserId,
      isPublished: false,
      orders: [],
    });
    sectionRepoMock.find.mockResolvedValue([
      { id: "section-1", isPublished: false },
      { id: "section-2", isPublished: false },
    ]);
    const res = await request(app)
      .put(baseURL)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({
        sections: [
          { id: "section-1", order: 2 },
          { id: "section-2", order: 3 },
        ],
      });
    expect(res.status).toBe(422);
  });

  // 🔐 權限控制
  it("❌ 不是自己的課程 → 回傳 403", async () => {
    courseRepoMock.findOne.mockResolvedValue({
      id: fakeCourseId,
      instructorId: "other-instructor",
    });

    const res = await request(app).put(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ sections: mockSections });

    expect(res.status).toBe(403);
  });

  // 🚫 狀態驗證
  it("❌ 查無課程 → 回傳 404", async () => {
    courseRepoMock.findOne.mockResolvedValue(null);

    const res = await request(app).put(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ sections: mockSections });

    expect(res.status).toBe(404);
  });

  it("❌ 課程已發布且有學生購買 → 回傳 422", async () => {
    courseRepoMock.findOne.mockResolvedValue({
      id: fakeCourseId,
      instructorId: fakeUserId,
      isPublished: true,
      orders: [{ paidAt: new Date() }],
    });

    const res = await request(app).put(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ sections: mockSections });

    expect(res.status).toBe(422);
  });

  it("❌ 包含已發布的章節 → 回傳 422", async () => {
    courseRepoMock.findOne.mockResolvedValue({
      id: fakeCourseId,
      instructorId: fakeUserId,
      isPublished: false,
      orders: [],
    });

    sectionRepoMock.find.mockResolvedValue([
      { id: "section-1", isPublished: true },
      { id: "section-2", isPublished: false },
    ]);

    const res = await request(app).put(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ sections: mockSections });

    expect(res.status).toBe(422);
  });

  // 🧨 錯誤處理
  it("❌ 資料庫查詢錯誤 → 回傳 500", async () => {
    courseRepoMock.findOne.mockRejectedValue(new Error("DB Error"));

    const res = await request(app).put(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ sections: mockSections });

    expect(res.status).toBe(500);
  });

  it("❌ 資料庫更新錯誤 → 回傳 500", async () => {
    courseRepoMock.findOne.mockResolvedValue({
      id: fakeCourseId,
      instructorId: fakeUserId,
      isPublished: false,
      orders: [],
    });

    (AppDataSource.transaction as jest.Mock).mockRejectedValueOnce(new Error("Transaction Error"));

    const res = await request(app).put(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ sections: mockSections });

    expect(res.status).toBe(500);
  });
}); 