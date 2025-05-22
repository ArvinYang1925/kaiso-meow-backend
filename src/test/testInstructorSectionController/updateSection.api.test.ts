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
const fakeSectionId = "123e4567-e89b-12d3-a456-426614174999";
const fakeToken = createTestToken({ id: fakeUserId, role: "instructor" });
const studentToken = createTestToken({ id: fakeUserId, role: "student" });

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
});

const baseURL = `/api/v1/instructor/sections/${fakeSectionId}`;

describe("PATCH /instructor/sections/:sectionId", () => {
  // 🟢 正常流程
  it("✅ 成功更新章節 title", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      title: "舊標題",
      content: "舊內容",
      course: { instructorId: fakeUserId },
    });

    sectionRepoMock.save.mockResolvedValue({
      id: fakeSectionId,
      title: "新標題",
      content: "舊內容",
    });

    const res = await request(app).patch(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ title: "新標題" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("新標題");
  });

  // 🔐 身分驗證
  it("❌ 未帶 JWT → 回傳 401", async () => {
    const res = await request(app).patch(baseURL).send({ title: "abc" });
    expect(res.status).toBe(401);
  });

  it("❌ 學生身分呼叫 → 回傳 403", async () => {
    const res = await request(app).patch(baseURL).set("Authorization", `Bearer ${studentToken}`).send({ title: "abc" });

    expect(res.status).toBe(403);
  });

  // ⚠ Zod 驗證
  it("❌ 空物件 → 回傳 400", async () => {

    sectionRepoMock.findOne.mockResolvedValue({
    id: fakeSectionId,
    title: "原始標題",
    content: "原始內容",
    course: { instructorId: fakeUserId },
  });

    const res = await request(app).patch(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({});

    expect(res.status).toBe(400);
  });

  it("❌ title 長度過長 → 回傳 400", async () => {
     sectionRepoMock.findOne.mockResolvedValue({
    id: fakeSectionId,
    title: "原始標題",
    content: "原始內容",
    course: { instructorId: fakeUserId },
  });
    const res = await request(app)
      .patch(baseURL)
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ title: "a".repeat(101) });

    expect(res.status).toBe(400);
  });

  // 🔐 權限控制
  it("❌ 不是自己的課程 → 回傳 403", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      id: fakeSectionId,
      course: { instructorId: "other-instructor" },
    });

    const res = await request(app).patch(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ title: "abc" });

    expect(res.status).toBe(403);
  });

  // 🚫 狀態驗證
  it("❌ 查無章節 → 回傳 404", async () => {
    sectionRepoMock.findOne.mockResolvedValue(null);

    const res = await request(app).patch(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ title: "abc" });

    expect(res.status).toBe(404);
  });

  // 🧨 DB 錯誤處理
  it("❌ DB 查詢錯誤 → 回傳 500", async () => {
    sectionRepoMock.findOne.mockRejectedValue(new Error("DB Error"));

    const res = await request(app).patch(baseURL).set("Authorization", `Bearer ${fakeToken}`).send({ title: "abc" });

    expect(res.status).toBe(500);
  });
});