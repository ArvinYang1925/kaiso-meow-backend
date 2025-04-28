import { Router } from "express";
import { register, login, logout } from "../controllers/authController";
import { isAuth } from "../middleware/isAuth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", isAuth, logout);

export default router; // 確保正確導出 router 對象
