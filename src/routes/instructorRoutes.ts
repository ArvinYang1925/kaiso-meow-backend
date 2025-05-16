import { Router } from "express";
import { getMe, updateMe } from "../controllers/instructorController";
import { getInstructorOrders } from "../controllers/instructorOrdersController";

import { isInstructor } from "../middleware/isInstructor";
import { isAuth } from "../middleware/isAuth";
import { createCourse, getCourseDetailByInstructor, updateCourseByInstructor } from "../controllers/instructorCourseController";

const router = Router();

router.get("/me", isAuth, isInstructor, getMe);
router.put("/me", isAuth, isInstructor, updateMe);
<<<<<<< HEAD
router.get("/orders", isAuth, isInstructor, getInstructorOrders);
=======
router.post("/courses", isAuth, isInstructor, createCourse);
router.put("/courses/:id", isAuth, isInstructor, updateCourseByInstructor);
router.get("/courses/:id", isAuth, isInstructor, getCourseDetailByInstructor);
>>>>>>> origin/develop

export default router;
