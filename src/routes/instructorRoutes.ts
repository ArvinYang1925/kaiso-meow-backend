import { Router } from "express";
import { getMe, updateMe } from "../controllers/instructorController";
import { getInstructorOrders } from "../controllers/instructorOrdersController";

import { isInstructor } from "../middleware/isInstructor";
import { isAuth } from "../middleware/isAuth";

const router = Router();

router.get("/me", isAuth, isInstructor, getMe);
router.put("/me", isAuth, isInstructor, updateMe);
router.get("/orders", isAuth, isInstructor, getInstructorOrders);

export default router;
