import { Router } from "express";
import { getMe, updateMe, getStudentsByInstructor, uploadAvatar } from "../controllers/instructorController";
import { getInstructorOrders } from "../controllers/instructorOrdersController";
import { isInstructor } from "../middleware/isInstructor";
import { isAuth } from "../middleware/isAuth";
import { imageUpload } from "../middleware/imageUpload";
import { createCoupon, getCouponsByInstructor, deleteCoupon } from "../controllers/instructorCouponController";
import {
  createCourse,
  getCourseDetailByInstructor,
  updateCourseByInstructor,
  getCoursesByInstructor,
  toggleCoursePublishStatus,
  deleteCourse,
  uploadCourseCover,
} from "../controllers/instructorCourseController";

import {
  getCourseSectionsByInstructor,
  createSectionByInstructor,
  updateSection,
  deleteSection,
  publishSection,
  generateCourseSections,
} from "../controllers/instructorSectionsController";

const router = Router();

router.get("/me", isAuth, isInstructor, getMe);
router.put("/me", isAuth, isInstructor, updateMe);
router.post(
  "/upload/avatar",
  isAuth,
  isInstructor,
  imageUpload.single("file"), // ★ field name = file
  uploadAvatar,
);

router.get("/students", isAuth, isInstructor, getStudentsByInstructor);

router.get("/orders", isAuth, isInstructor, getInstructorOrders);

router.post("/courses", isAuth, isInstructor, createCourse);
router.get("/courses", isAuth, isInstructor, getCoursesByInstructor);
router.get("/courses/:id", isAuth, isInstructor, getCourseDetailByInstructor);
router.put("/courses/:id", isAuth, isInstructor, updateCourseByInstructor);
router.patch("/courses/:id/publish", isAuth, isInstructor, toggleCoursePublishStatus);
router.delete("/courses/:id", isAuth, isInstructor, deleteCourse);
// 課程封面上傳路由
router.post(
  "/uploads/cover",
  isAuth,
  isInstructor,
  imageUpload.single("file"), // ★ field name = file
  uploadCourseCover,
);

router.post("/coupons", isAuth, isInstructor, createCoupon);
router.get("/coupons", isAuth, isInstructor, getCouponsByInstructor);
router.delete("/coupons/:id", isAuth, isInstructor, deleteCoupon);

router.get("/courses/:id/sections", isAuth, isInstructor, getCourseSectionsByInstructor);
router.post("/courses/:id/sections", isAuth, isInstructor, createSectionByInstructor);

router.patch("/sections/:id", isAuth, isInstructor, updateSection);
router.delete("/sections/:id", isAuth, isInstructor, deleteSection);
router.patch("/sections/:id/publish", isAuth, isInstructor, publishSection);

router.post("/courses/:id/ai-generated-sections", isAuth, isInstructor, generateCourseSections);

export default router;
