import { Router } from "express";
import { previewOrder, getOrders, createOrder } from "../controllers/orderController";
import { isAuth } from "../middleware/isAuth";
import { isStudent } from "../middleware/isStudent";

const router = Router();

router.post("/preview", isAuth, isStudent, previewOrder);
router.get("/", isAuth, isStudent, getOrders);
router.post("/", isAuth, isStudent, createOrder);
export default router;
