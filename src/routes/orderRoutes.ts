import { Router } from "express";
import { previewOrder, getOrders, createOrder, getOrderDetail, applyCoupon } from "../controllers/orderController";
import { isAuth } from "../middleware/isAuth";
import { isStudent } from "../middleware/isStudent";

const router = Router();

router.post("/preview", isAuth, isStudent, previewOrder);
router.get("/", isAuth, isStudent, getOrders);
router.post("/", isAuth, isStudent, createOrder);
router.get("/:orderId", isAuth, isStudent, getOrderDetail);
router.post("/:orderId/apply-coupon", isAuth, isStudent, applyCoupon);

export default router;
