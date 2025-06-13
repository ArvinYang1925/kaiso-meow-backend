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
import { checkCourseAccess } from "../middleware/checkCourseAccess";

const router = Router();

router.get("/", getCourses);
router.get("/my-learning", isAuth, isStudent, getMyLearningCourses);
router.get("/:courseId", getCourseDetail);
router.get("/:courseId/sections", isAuth, isStudent, checkCourseAccess, getCourseSections);
router.get("/:courseId/progress", isAuth, isStudent, checkCourseAccess, getCourseProgress);
router.get("/:courseId/sections/:sectionId", isAuth, isStudent, checkCourseAccess, getSectionDetail);
router.patch("/:courseId/sections/:sectionId/complete", isAuth, isStudent, checkCourseAccess, markSectionComplete);

export default router;
