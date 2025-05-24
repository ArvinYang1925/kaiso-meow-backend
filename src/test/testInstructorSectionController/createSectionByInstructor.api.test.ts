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
let courseRepoMock: { findOne: jest.Mock };
let sectionRepoMock: ReturnType<typeof buildSectionRepoMock>;

// ⬇️ 封裝好的 Section mock 建構器
function buildSectionRepoMock(overrides = {}) {
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: () => ({
        select: () => ({
          getRawOne: () => Promise.resolve({ max: 0 }),
        }),
      }),
    }),
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

describe("POST /api/v1/instructor/courses/:courseId/sections", () => {
  it("✔ 應成功新增章節", async () => {
    courseRepoMock.findOne.mockResolvedValue({ id: fakeCourseId, instructorId: fakeUserId });

    sectionRepoMock.create.mockReturnValue({
      id: "section-1",
      title: "章節標題",
      createdAt: new Date("2025-01-01T00:00:00Z"),
    });

    sectionRepoMock.save.mockResolvedValue({});

    const res = await request(app)
      .post(`/api/v1/instructor/courses/${fakeCourseId}/sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ title: "章節標題" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.title).toBe("章節標題");
  });

  it("❌ 應回傳 401，若缺少 JWT", async () => {
    const res = await request(app).post(`/api/v1/instructor/courses/${fakeCourseId}/sections`).send({ title: "章節標題" });

    expect(res.status).toBe(401);
  });

  it("❌ 應回傳 403，若為學生角色", async () => {
    courseRepoMock.findOne.mockResolvedValue({ id: fakeCourseId, instructorId: fakeUserId });

    const res = await request(app)
      .post(`/api/v1/instructor/courses/${fakeCourseId}/sections`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ title: "章節標題" });

    expect(res.status).toBe(403);
  });

  it("❌ 應回傳 400，若缺少 title", async () => {
    const res = await request(app)
      .post(`/api/v1/instructor/courses/${fakeCourseId}/sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/title/i); // 需配合 sectionSchema 定義訊息
  });

  it("❌ 應回傳 400，若 title 為空字串", async () => {
    const res = await request(app)
      .post(`/api/v1/instructor/courses/${fakeCourseId}/sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ title: "" });

    expect(res.status).toBe(400);
  });

  it("❌ 應回傳 403，若非自己課程", async () => {
    courseRepoMock.findOne.mockResolvedValue({ id: fakeCourseId, instructorId: "other-id" });

    const res = await request(app)
      .post(`/api/v1/instructor/courses/${fakeCourseId}/sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ title: "章節標題" });

    expect(res.status).toBe(403);
  });

  it("❌ 應回傳 404，若課程不存在", async () => {
    courseRepoMock.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/v1/instructor/courses/${fakeCourseId}/sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ title: "章節標題" });

    expect(res.status).toBe(404);
  });

  it("❌ 應回傳 400，若 courseId 非合法 UUID", async () => {
    const res = await request(app)
      .post("/api/v1/instructor/courses/not-a-uuid/sections")
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ title: "章節標題" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/課程ID格式/);
  });

  it("❌ 應回傳 500，若儲存章節時發生錯誤", async () => {
    courseRepoMock.findOne.mockResolvedValue({ id: fakeCourseId, instructorId: fakeUserId });

    sectionRepoMock.create.mockReturnValue({ title: "章節標題" });
    sectionRepoMock.save.mockRejectedValue(new Error("DB Save Error"));

    const res = await request(app)
      .post(`/api/v1/instructor/courses/${fakeCourseId}/sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ title: "章節標題" });

    expect(res.status).toBe(500);
  });
});
