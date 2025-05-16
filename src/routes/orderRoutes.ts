import { Router } from "express";
import {
  previewOrder,
  getOrders,
  createOrder,
  getOrderDetail,
  applyCoupon,
  checkoutOrder,
  PaymentCallback,
} from "../controllers/orderController";
import { isAuth } from "../middleware/isAuth";
import { isStudent } from "../middleware/isStudent";

const router = Router();

router.post("/preview", isAuth, isStudent, previewOrder);
router.get("/", isAuth, isStudent, getOrders);
router.post("/", isAuth, isStudent, createOrder);
router.get("/:orderId", isAuth, isStudent, getOrderDetail);
router.post("/preview/apply-coupon", isAuth, isStudent, applyCoupon);
router.post("/:orderId/checkout", isAuth, isStudent, checkoutOrder);
router.post("/:orderId/payment-callback", PaymentCallback);

export default router;
