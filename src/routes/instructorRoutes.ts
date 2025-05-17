import { Router } from "express";
import { getMe, updateMe } from "../controllers/instructorController";
import { getInstructorOrders } from "../controllers/instructorOrdersController";

import { isInstructor } from "../middleware/isInstructor";
import { isAuth } from "../middleware/isAuth";
import { createCoupon, getCouponsByInstructor, deleteCoupon } from "../controllers/instructorCouponController";
import {
  createCourse,
  getCourseDetailByInstructor,
  updateCourseByInstructor,
  getCoursesByInstructor,
} from "../controllers/instructorCourseController";

const router = Router();

router.get("/me", isAuth, isInstructor, getMe);
router.put("/me", isAuth, isInstructor, updateMe);
router.get("/orders", isAuth, isInstructor, getInstructorOrders);
router.post("/courses", isAuth, isInstructor, createCourse);
router.get("/courses", isAuth, isInstructor, getCoursesByInstructor);
router.put("/courses/:id", isAuth, isInstructor, updateCourseByInstructor);
router.get("/courses/:id", isAuth, isInstructor, getCourseDetailByInstructor);
router.post("/coupons", isAuth, isInstructor, createCoupon);
router.get("/coupons", isAuth, isInstructor, getCouponsByInstructor);
router.delete("/coupons/:id", isAuth, isInstructor, deleteCoupon);

export default router;
