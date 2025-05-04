import { Router } from "express";
import { getMe } from "../controllers/instructorController";
import { isAuth } from "../middleware/isAuth";

const router = Router();

router.get("/me", isAuth, getMe);

export default router;
