import { Router } from "express";
import {
  getCourses,
  getCourseDetail,
  getCourseSections,
  getCourseProgress,
  markSectionComplete,
  getSectionDetail,
  getMyLearningCourses,
} from "../controllers/courseController";
import { isAuth } from "../middleware/isAuth";
import { isStudent } from "../middleware/isStudent";

const router = Router();

router.get("/", getCourses);
router.get("/my-learning", isAuth, isStudent, getMyLearningCourses);
router.get("/:courseId", getCourseDetail);
router.get("/:courseId/sections", isAuth, isStudent, getCourseSections);
router.get("/:courseId/progress", isAuth, isStudent, getCourseProgress);
router.get("/:courseId/sections/:sectionId", isAuth, isStudent, getSectionDetail);
router.patch("/:courseId/sections/:sectionId/complete", isAuth, isStudent, markSectionComplete);

export default router;
