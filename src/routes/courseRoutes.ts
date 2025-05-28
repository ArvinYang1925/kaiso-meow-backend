import { Router } from "express";
import { getCourses, getCourseDetail, getCourseSections, getCourseProgress } from "../controllers/courseController";
import { isAuth } from "../middleware/isAuth";
import { isStudent } from "../middleware/isStudent";

const router = Router();

router.get("/", getCourses);
router.get("/:courseId", getCourseDetail);
router.get("/:courseId/sections", isAuth, isStudent, getCourseSections);
router.get("/:courseId/progress", isAuth, isStudent, getCourseProgress);

export default router;
