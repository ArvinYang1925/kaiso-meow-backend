// src/utils/couponUtils.ts
import { Coupon } from "../entities/Coupon";

export interface CouponValidationResult {
  isValid: boolean;
  message?: string;
}

export function validateCouponStatus(coupon: Coupon | null): CouponValidationResult {
  if (!coupon) {
    return {
      isValid: false,
      message: "折扣碼不存在",
    };
  }

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    return {
      isValid: false,
      message: "折扣碼尚未啟用",
    };
  }

  if (coupon.expiresAt && now > coupon.expiresAt) {
    return {
      isValid: false,
      message: "折扣碼已過期",
    };
  }

  return {
    isValid: true,
  };
}
