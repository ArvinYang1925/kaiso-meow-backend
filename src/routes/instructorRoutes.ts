import { Router } from "express";
import { getMe, updateMe } from "../controllers/instructorController";
import { isInstructor } from "../middleware/isInstructor";
import { isAuth } from "../middleware/isAuth";
import { createCourse, getCourseDetailByInstructor, updateCourseByInstructor } from "../controllers/instructorCourseController";

const router = Router();

router.get("/me", isAuth, isInstructor, getMe);
router.put("/me", isAuth, isInstructor, updateMe);
router.post("/courses", isAuth, isInstructor, createCourse);
router.put("/courses/:id", isAuth, isInstructor, updateCourseByInstructor);
router.get("/courses/:id", isAuth, isInstructor, getCourseDetailByInstructor);

export default router;
