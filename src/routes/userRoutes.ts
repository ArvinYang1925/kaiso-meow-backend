// 將你的 userRoutes.ts 文件修改為：
import { Router } from "express";
import { register, login, logout } from "../controllers/userController";
import { isAuth } from "../middleware/isAuth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", isAuth, logout);

export default router; // 確保正確導出 router 對象
