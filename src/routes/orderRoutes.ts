import { Router } from "express";
import { previewOrder, getOrders, createOrder, getOrderDetail } from "../controllers/orderController";
import { isAuth } from "../middleware/isAuth";
import { isStudent } from "../middleware/isStudent";

const router = Router();

router.post("/preview", isAuth, isStudent, previewOrder);
router.get("/", isAuth, isStudent, getOrders);
router.post("/", isAuth, isStudent, createOrder);
router.get("/:orderId", isAuth, isStudent, getOrderDetail);
export default router;
