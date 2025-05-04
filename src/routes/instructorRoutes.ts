import { Router } from "express";
import { getMe, updateMe } from "../controllers/instructorController";
import { isAuth } from "../middleware/isAuth";
import { validateUpdateProfile } from "../middleware/validateInstructor";

const router = Router();

router.get("/me", isAuth, getMe);
router.put("/me", isAuth, validateUpdateProfile, updateMe);

export default router;
