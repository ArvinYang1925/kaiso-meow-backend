import { Router } from "express";
import { register, login, logout, getStudentProfile, editStudentProfile } from "../controllers/authController";
import { sendForgotPasswordEmail, resetPasswordWithToken, changePassword } from "../controllers/passwordController";

import { isAuth } from "../middleware/isAuth";
import { isStudent } from "../middleware/isStudent";
import { isResetTokenValid } from "../middleware/isResetTokenValid";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", isAuth, logout);
router.get("/profile", isAuth, isStudent, getStudentProfile);
router.put("/profile", isAuth, isStudent, editStudentProfile);
router.post("/password/forgot", sendForgotPasswordEmail);
router.post("/password/reset", isResetTokenValid, resetPasswordWithToken);
router.put("/api/v1/auth/password/change", isAuth, changePassword);

export default router; // 確保正確導出 router 對象
