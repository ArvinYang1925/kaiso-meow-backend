import { Router } from "express";
import express from "express";
import {
  previewOrder,
  getOrders,
  createOrder,
  getOrderDetail,
  applyCoupon,
  checkoutOrder,
  paymentCallback,
} from "../controllers/orderController";
import { isAuth } from "../middleware/isAuth";
import { isStudent } from "../middleware/isStudent";

const router = Router();

router.post("/preview", isAuth, isStudent, previewOrder);
router.get("/", isAuth, isStudent, getOrders);
router.post("/", isAuth, isStudent, createOrder);
router.get("/:orderId", isAuth, isStudent, getOrderDetail);
router.post("/:orderId/apply-coupon", isAuth, isStudent, applyCoupon);
router.post("/:orderId/checkout", isAuth, isStudent, checkoutOrder);
// 使用 urlencoded middleware 解析綠界的 form-urlencoded callback資料
router.post("/:orderId/payment-callback", express.urlencoded({ extended: true }), paymentCallback);

export default router;
