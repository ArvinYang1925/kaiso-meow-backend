/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import app from "../../app";
import { AppDataSource } from "../../config/db";
import { createTestToken } from "../../utils/jwtUtils";
import { generateSections } from "../../services/aiService";

jest.mock("../../config/db", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock("../../services/aiService");
const mockedGenerateSections = generateSections as jest.Mock;

const mockGetRepository = AppDataSource.getRepository as jest.Mock;

const fakeUserId = "user-123";
const fakeCourseId = "123e4567-e89b-12d3-a456-426614174999";
const fakeToken = createTestToken({ id: fakeUserId, role: "instructor" });

let sectionRepoMock: any;
let courseRepoMock: any;

function buildSectionRepoMock(overrides = {}) {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
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
  mockedGenerateSections.mockReset();
  mockedGenerateSections.mockResolvedValue({
    count: 2,
    sections: [
      { title: "章節一", description: "介紹第一個主題" },
      { title: "章節二", description: "介紹第二個主題" },
    ],
  });
});

const baseURL = "/api/v1/instructor/courses";

describe("POST /api/v1/courses/:courseId/ai-generated-sections", () => {
  it("🟢 成功產出章節草稿並寫入", async () => {
    courseRepoMock.findOne.mockResolvedValue({
      id: fakeCourseId,
      instructorId: fakeUserId,
      sections: [],
    });
    sectionRepoMock.save.mockResolvedValue([]);

    const res = await request(app)
      .post(`${baseURL}/${fakeCourseId}/ai-generated-sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({
        description: "這是一門後端入門課程",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data).toHaveProperty("count");
    expect(Array.isArray(res.body.data.sections)).toBe(true);
  });

  it("🔐 缺少 Authorization header 應回傳 401", async () => {
    const res = await request(app).post(`${baseURL}/${fakeCourseId}/ai-generated-sections`).send({ description: "test" });

    expect(res.status).toBe(401);
  });

  it("🔐 使用無效 JWT 應回傳 401", async () => {
    const res = await request(app)
      .post(`${baseURL}/${fakeCourseId}/ai-generated-sections`)
      .set("Authorization", "Bearer invalid.token.here")
      .send({ description: "test" });

    expect(res.status).toBe(401);
  });

  it("⚠ 缺少 description 欄位應回傳 400", async () => {
    const res = await request(app)
      .post(`${baseURL}/${fakeCourseId}/ai-generated-sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("⚠ description 為空字串應回傳 400", async () => {
    const res = await request(app)
      .post(`${baseURL}/${fakeCourseId}/ai-generated-sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ description: "" });

    expect(res.status).toBe(400);
  });

  it("⚠ expectedSectionCount 為負數應回傳 400", async () => {
    courseRepoMock.findOne.mockResolvedValue({
      id: fakeCourseId,
      instructorId: fakeUserId,
      sections: [],
    });
    const res = await request(app)
      .post(`${baseURL}/${fakeCourseId}/ai-generated-sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ description: "test", expectedSectionCount: -3 });

    expect(res.status).toBe(400);
  });

  it("⚠ description 為數字型別應回傳 400", async () => {
    const res = await request(app)
      .post(`${baseURL}/${fakeCourseId}/ai-generated-sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ description: 123 });

    expect(res.status).toBe(400);
  });

  it("⚠ 課程 ID 非 UUID 格式應回傳 400", async () => {
    const res = await request(app)
      .post(`${baseURL}/invalid-id/ai-generated-sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ description: "test" });

    expect(res.status).toBe(400);
  });

  it("⚠ 非講師擁有的課程應回傳 403", async () => {
    courseRepoMock.findOne.mockResolvedValue({ id: fakeCourseId, instructor: { userId: "other-user" } });

    const res = await request(app)
      .post(`${baseURL}/${fakeCourseId}/ai-generated-sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ description: "test" });

    expect(res.status).toBe(403);
  });

  it("🧨 找不到課程應回傳 404", async () => {
    courseRepoMock.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post(`${baseURL}/${fakeCourseId}/ai-generated-sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ description: "test" });

    expect(res.status).toBe(404);
  });

  it("🧨 模擬 AI 回傳空字串，應回傳 422", async () => {
    courseRepoMock.findOne.mockResolvedValue({
      id: fakeCourseId,
      instructorId: fakeUserId,
      sections: [],
    });
    mockedGenerateSections.mockResolvedValueOnce("");

    const res = await request(app)
      .post(`${baseURL}/${fakeCourseId}/ai-generated-sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ description: "test" });

    expect(res.status).toBe(422);
  });

  it("🧪 AI 回傳 count 與 sections 數量一致", async () => {
    courseRepoMock.findOne.mockResolvedValue({
      id: fakeCourseId,
      instructorId: fakeUserId,
      sections: [],
    });
    sectionRepoMock.save.mockResolvedValue([]);

    const res = await request(app)
      .post(`${baseURL}/${fakeCourseId}/ai-generated-sections`)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({
        description: "這是一門測試課程",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(res.body.data.sections.length);
  });
});
