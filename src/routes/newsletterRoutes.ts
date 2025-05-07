import { Router } from "express";
import { optionalAuth } from "../middleware/optionalAuth";
import { subscribeNewsletter } from "../controllers/newSletterController";

const router = Router();

router.post("/subscribe", optionalAuth, subscribeNewsletter);

export default router; // 確保正確導出 router 對象
