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

describe("PATCH /api/v1/instructor/sections/:sectionId/publish", () => {
  const url = `/api/v1/instructor/sections/${fakeSectionId}/publish`;

  const mockSection = {
    id: fakeSectionId,
    title: "第一章",
    isPublished: false,
    course: {
      instructorId: fakeUserId,
    },
  };

  // 🟢 正常流程
  it("should publish the section successfully", async () => {
    sectionRepoMock.findOne.mockResolvedValue({ ...mockSection });
    sectionRepoMock.save.mockResolvedValue({
      ...mockSection,
      isPublished: true,
    });

    const res = await request(app).patch(url).set("Authorization", `Bearer ${fakeToken}`).send({ isPublished: true });

    expect(res.status).toBe(200);
    expect(res.body.data.isPublished).toBe(true);
  });

  // 🔐 身分驗證
  it("should return 401 if token is missing", async () => {
    const res = await request(app).patch(url).send({ isPublished: true });
    expect(res.status).toBe(401);
  });

  it("should return 403 if user role is not instructor", async () => {
    const res = await request(app).patch(url).set("Authorization", `Bearer ${studentToken}`).send({ isPublished: true });

    expect(res.status).toBe(403);
  });

  // ⚠ 請求參數驗證
  it("should return 400 if isPublished is missing", async () => {
    const res = await request(app).patch(url).set("Authorization", `Bearer ${fakeToken}`).send({});

    expect(res.status).toBe(400);
  });

  it("should return 400 if isPublished is not boolean", async () => {
    const res = await request(app).patch(url).set("Authorization", `Bearer ${fakeToken}`).send({ isPublished: "true" });

    expect(res.status).toBe(400);
  });

  // 🔐 權限控制
  it("should return 403 if section does not belong to instructor", async () => {
    sectionRepoMock.findOne.mockResolvedValue({
      ...mockSection,
      course: { instructorId: "other-user" },
    });

    const res = await request(app).patch(url).set("Authorization", `Bearer ${fakeToken}`).send({ isPublished: true });

    expect(res.status).toBe(403);
  });

  // 🚫 狀態驗證與流程判斷
  it("should return 404 if section not found", async () => {
    sectionRepoMock.findOne.mockResolvedValue(null);

    const res = await request(app).patch(url).set("Authorization", `Bearer ${fakeToken}`).send({ isPublished: true });

    expect(res.status).toBe(404);
  });

  // 🧨 非預期錯誤
  it("should return 500 if save throws error", async () => {
    sectionRepoMock.findOne.mockResolvedValue(mockSection);
    sectionRepoMock.save.mockRejectedValue(new Error("DB error"));

    const res = await request(app).patch(url).set("Authorization", `Bearer ${fakeToken}`).send({ isPublished: true });

    expect(res.status).toBe(500);
  });

  it("should return 400 if sectionId is invalid UUID", async () => {
    const res = await request(app)
      .patch("/api/v1/instructor/sections/invalid/publish")
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ isPublished: true });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/無效的章節ID格式/);
  });
});
