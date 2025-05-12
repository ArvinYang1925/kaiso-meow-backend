import { Router } from "express";
import { getMe, updateMe, getStudentsByInstructor } from "../controllers/instructorController";
import { isInstructor } from "../middleware/isInstructor";
import { isAuth } from "../middleware/isAuth";

const router = Router();

router.get("/me", isAuth, isInstructor, getMe);
router.put("/me", isAuth, isInstructor, updateMe);
router.get("/students", isAuth, isInstructor, getStudentsByInstructor);

export default router;
