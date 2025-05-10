import { Router } from "express";
import { getCourses, getCourseDetail } from "../controllers/courseController";

const router = Router();

router.get("/", getCourses);
router.get("/:courseId", getCourseDetail);

export default router;
