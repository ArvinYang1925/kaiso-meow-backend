import { Router } from "express";
import { register, login, logout, getStudentProfile, editStudentProfile } from "../controllers/authController";
import { isAuth } from "../middleware/isAuth";
import { isStudent } from "../middleware/isStudent";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", isAuth, logout);
router.get("/profile", isAuth, isStudent, getStudentProfile);
router.put("/profile", isAuth, isStudent, editStudentProfile);

export default router; // 確保正確導出 router 對象
