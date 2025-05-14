import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { options } from "../config/ecpay";
import ecpay_payment from "ecpay_aio_nodejs";
import { Course } from "../entities/Course";
import { AuthRequest } from "../middleware/isAuth";
import { User } from "../entities/User";
import { Order } from "../entities/Order";
import { Coupon } from "../entities/Coupon";
import { formatDate } from "../utils/dateUtils";
import { validateCouponStatus } from "../utils/couponUtils";
import { paginationSchema, uuidSchema } from "../validator/commonValidationSchemas";

// 訂單狀態對應的中文說明
const ORDER_STATUS_MAP = {
  pending: "待付款",
  paid: "購買課程",
  failed: "付款失敗",
} as const;

// 在檔案開頭加入環境變數
const MERCHANTID = process.env.ECPAY_MERCHANT_ID!;
const BACKEND_URL = process.env.BACKEND_URL!;
const FRONTEND_URL = process.env.FRONTEND_URL!;
/**
 * API #10 GET /api/v1/orders
 */
export async function getOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. 取得分頁參數
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const skip = (page - 1) * pageSize;

    // 2. 驗證分頁參數
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: err.message });
      return;
    }
    console.log("user:", req.user);
    // 3. 查詢訂單
    const [orders, total] = await AppDataSource.getRepository(Order)
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.course", "course")
      .where("order.userId = :userId", { userId: req.user!.id })
      .orderBy("order.createdAt", "DESC")
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    // 4. 格式化訂單資料
    const orderList = orders.map((order) => ({
      id: order.id,
      title: order.course.title,
      orderPrice: order.orderPrice,
      status: ORDER_STATUS_MAP[order.status as keyof typeof ORDER_STATUS_MAP] || order.status,
      createdAt: formatDate(order.createdAt),
      updatedAt: formatDate(order.updatedAt),
      paidAt: order.paidAt ? formatDate(order.paidAt) : null,
    }));

    // 5. 回傳結果
    res.json({
      status: "success",
      data: {
        orderList,
        pagination: {
          currentPage: page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
/**
 * API #13 POST /api/v1/orders/preview
 */
export async function previewOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      res.status(400).json({
        status: "failed",
        message: "課程ID不能為空",
      });
      return;
    }
    const parsed = uuidSchema.safeParse(courseId);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: `courseId ${err.message}` });
      return;
    }
    // 1. 取得課程資訊
    const course = await AppDataSource.getRepository(Course)
      .createQueryBuilder("course")
      .where("course.id = :courseId", { courseId })
      .andWhere("course.deleted_at IS NULL")
      .andWhere("course.is_published = true")
      .getOne();

    if (!course) {
      res.status(404).json({
        status: "failed",
        message: "找不到此課程",
      });
      return;
    }
    // 2. 取得完整的用戶資訊
    const user = (await AppDataSource.getRepository(User)
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.student", "student")
      .where("user.id = :id", { id: req.user!.id })
      .getOne())!;

    // 3 .檢查是否已購買過此課程
    const existingOrder = await AppDataSource.getRepository(Order)
      .createQueryBuilder("order")
      .where("order.user_id = :userId", { userId: user.id })
      .andWhere("order.course_id = :courseId", { courseId })
      .orderBy("order.updated_at", "DESC") // 加入排序，確保取得最新的訂單
      .getOne();

    if (existingOrder) {
      if (existingOrder.status === "pending") {
        res.status(400).json({
          status: "failed",
          message: "您有未完成的訂單，請先完成付款",
        });
        return;
      }

      if (existingOrder.status === "paid") {
        res.status(400).json({
          status: "failed",
          message: "您已購買過此課程",
        });
        return;
      }
    }

    // 3. 計算價格
    const originalPrice = course.price;
    const orderPrice = course.price;

    // 4. 回傳預覽資訊
    res.json({
      status: "success",
      data: {
        originalPrice,
        orderPrice,
        status: "pending",
        course: {
          title: course.title,
          cover_url: course.coverUrl,
        },
        user: {
          id: user.id,
          name: user.name,
          phoneNumber: user.student?.phoneNumber || "",
          email: user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
/**
 * API #14 POST /api/v1/orders
 */
export async function createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { courseId, couponId } = req.body;

    // 1. 檢查必要參數
    if (!courseId) {
      res.status(400).json({
        status: "failed",
        message: "courseId不得為空",
      });
      return;
    }
    // 2.驗證 courseId 格式
    const parsed = uuidSchema.safeParse(courseId);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: `courseId ${err.message}` });
      return;
    }

    // 3. 驗證 couponId 格式（如果有的話）
    if (couponId) {
      const couponIdResult = uuidSchema.safeParse(couponId);
      if (!couponIdResult.success) {
        const err = couponIdResult.error.errors[0];
        res.status(400).json({ status: "failed", message: `couponId ${err.message}` });
        return;
      }
    }

    // 3. 取得課程資訊
    const course = await AppDataSource.getRepository(Course)
      .createQueryBuilder("course")
      .where("course.id = :courseId", { courseId })
      .andWhere("course.deleted_at IS NULL")
      .andWhere("course.is_published = true")
      .getOne();

    if (!course) {
      res.status(400).json({
        status: "failed",
        message: "courseId錯誤",
      });
      return;
    }

    // 3. 取得用戶資訊
    const user = await AppDataSource.getRepository(User)
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.student", "student")
      .where("user.id = :id", { id: req.user!.id })
      .getOne();

    if (!user) {
      res.status(404).json({
        status: "failed",
        message: "找不到用戶資料",
      });
      return;
    }

    // 4. 檢查是否已購買過此課程
    const existingOrder = await AppDataSource.getRepository(Order)
      .createQueryBuilder("order")
      .where("order.user_id = :userId", { userId: user.id })
      .andWhere("order.course_id = :courseId", { courseId })
      .orderBy("order.updated_at", "DESC")
      .getOne();

    if (existingOrder) {
      if (existingOrder.status === "pending") {
        res.status(400).json({
          status: "failed",
          message: "您有未完成的訂單，請先完成付款",
        });
        return;
      }

      if (existingOrder.status === "paid") {
        res.status(400).json({
          status: "failed",
          message: "已購買此課程",
        });
        return;
      }
    }

    // 5. 檢查優惠券（如果有的話）
    let coupon = null;
    let orderPrice = course.price;
    let originalPrice = course.price;

    if (couponId) {
      coupon = await AppDataSource.getRepository(Coupon)
        .createQueryBuilder("coupon")
        .where("coupon.id = :id", { id: couponId })
        .andWhere("coupon.deleted_at IS NULL")
        .andWhere("coupon.starts_at <= CURRENT_TIMESTAMP")
        .andWhere("coupon.expires_at >= CURRENT_TIMESTAMP")
        .getOne();
      console.log(coupon);
      if (coupon) {
        originalPrice = course.price;
        if (coupon.type === "fixed") {
          orderPrice = Math.max(0, course.price - coupon.value);
        } else if (coupon.type === "percentage") {
          orderPrice = Math.round(course.price * (1 - coupon.value / 100));
        }
      }
    }

    // 6. 建立訂單
    const order = AppDataSource.getRepository(Order).create({
      userId: user.id,
      courseId: course.id,
      originalPrice: originalPrice,
      orderPrice,
      status: "pending",
      couponId: coupon?.id,
    });

    await AppDataSource.getRepository(Order).save(order);

    // 7. 回傳結果
    res.status(201).json({
      status: "success",
      data: {
        id: order.id,
        originalPrice,
        orderPrice,
        status: "pending",
        createdAt: order.createdAt,
        coupon: coupon
          ? {
              couponCode: coupon.code,
              couponName: coupon.couponName,
            }
          : null,
        course: {
          title: course.title,
        },
        user: {
          id: user.id,
          name: user.name,
          phoneNumber: user.student?.phoneNumber || "",
          email: user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
/**
 * API #15 GET /api/v1/orders/:orderId
 */
export async function getOrderDetail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderId } = req.params;

    // 1. 驗證 orderId 格式
    const parsed = uuidSchema.safeParse(orderId);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: `orderId ${err.message}` });
      return;
    }

    // 2. 查詢訂單詳情，加入 user 和 student 關聯
    const order = await AppDataSource.getRepository(Order)
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.course", "course")
      .leftJoinAndSelect("order.coupon", "coupon")
      .leftJoinAndSelect("order.user", "user")
      .leftJoinAndSelect("user.student", "student")
      .where("order.id = :orderId", { orderId })
      .andWhere("order.userId = :userId", { userId: req.user!.id })
      .getOne();

    if (!order) {
      res.status(400).json({
        status: "failed",
        message: "無此訂單",
      });
      return;
    }

    // 3. 格式化回傳資料
    const orderDetail = {
      id: order.id,
      originalPrice: order.originalPrice,
      orderPrice: order.orderPrice,
      status: ORDER_STATUS_MAP[order.status as keyof typeof ORDER_STATUS_MAP] || order.status,
      createdAt: formatDate(order.createdAt),
      updatedAt: formatDate(order.updatedAt),
      paidAt: order.paidAt ? formatDate(order.paidAt) : null,
      course: {
        title: order.course.title,
        coverUrl: order.course.coverUrl,
      },
      coupon: order.coupon
        ? {
            couponValue: order.coupon.value,
            couponCode: order.coupon.code,
            couponType: order.coupon.type,
            couponName: order.coupon.couponName,
          }
        : null,
      user: {
        id: order.user.id,
        name: order.user.name,
        phoneNumber: order.user.student?.phoneNumber || "",
        email: order.user.email,
      },
    };

    // 4. 回傳結果
    res.json({
      status: "success",
      data: orderDetail,
    });
  } catch (error) {
    next(error);
  }
}
/**
 * API #16 POST /api/v1/orders/preview/apply-coupon
 */
export async function applyCoupon(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { couponCode, originalPrice } = req.body;

    // 1. 檢查必要參數
    if (!couponCode) {
      res.status(400).json({
        status: "failed",
        message: "請輸入折扣碼",
      });
      return;
    }

    // 2. 查詢優惠券
    const coupon = await AppDataSource.getRepository(Coupon)
      .createQueryBuilder("coupon")
      .where("coupon.code = :code", { code: couponCode })
      .getOne();
    console.log("輸入的折扣碼:", couponCode);
    console.log("查詢參數:", { code: couponCode });
    console.log("查詢結果:", coupon);

    // 3. 驗證優惠券狀態
    const validationResult = validateCouponStatus(coupon);
    if (!validationResult.isValid) {
      res.status(400).json({
        status: "failed",
        message: validationResult.message,
      });
      return;
    }

    // 4. 計算折扣後價格
    let discountedPrice = originalPrice;
    if (coupon && coupon.type === "fixed") {
      discountedPrice = Math.max(0, originalPrice - coupon.value);
    } else if (coupon && coupon.type === "percentage") {
      discountedPrice = Math.round(originalPrice * (1 - coupon.value / 100));
    }

    // 5. 回傳結果
    res.json({
      status: "success",
      data: {
        coupon: {
          id: coupon!.id,
          value: coupon!.value,
          code: coupon!.code,
          type: coupon!.type,
          couponName: coupon!.couponName,
        },
        order: {
          orderPrice: discountedPrice,
          originalPrice,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
/**
 * API #17 POST /api/v1/orders/:orderId/checkout
 */
export async function checkoutOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderId } = req.params;

    // 1. 驗證 orderId 格式
    const parsed = uuidSchema.safeParse(orderId);
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      res.status(400).json({ status: "failed", message: `orderId ${err.message}` });
      return;
    }

    // 2. 查詢訂單資訊
    const order = await AppDataSource.getRepository(Order)
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.course", "course")
      .where("order.id = :orderId", { orderId })
      .andWhere("order.userId = :userId", { userId: req.user!.id })
      .getOne();

    if (!order) {
      res.status(400).json({
        status: "failed",
        message: "無此訂單",
      });
      return;
    }

    // 3. 產生訂單編號
    const orderPrefix = orderId.substring(0, 7);
    const MerchantTradeNo = `${orderPrefix}${new Date().getTime()}`;

    // 4. 產生交易時間
    const MerchantTradeDate = new Date().toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // 5. 準備交易資料
    const base_param = {
      MerchantID: MERCHANTID,
      MerchantTradeNo: MerchantTradeNo,
      MerchantTradeDate: MerchantTradeDate,
      PaymentType: "aio",
      TotalAmount: Math.round(order.orderPrice).toString(),
      TradeDesc: "課程購買",
      ItemName: order.course.title,
      ReturnURL: `${BACKEND_URL}/api/v1/orders/${orderId}/payment-callback`,
      ClientBackURL: `${FRONTEND_URL}/test-payment.html?orderId=${orderId}`,
      ChoosePayment: "ALL",
    };

    // 6. 建立綠界付款頁面
    const create = new ecpay_payment(options);
    const html = create.payment_client.aio_check_out_all(base_param);
    //console.log("html:", html);
    // 7. 回傳 HTML
    res.send(html);
  } catch (error) {
    next(error);
  }
}
/**
 * API #18 POST /api/v1/orders/:orderId/payment-callback
 * 綠界付款回調處理
 */
export async function PaymentCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderId } = req.params;
    const { RtnCode, PaymentDate } = req.body;

    console.log("Payment callback received:", req.body);

    // 1. 查詢訂單
    const order = await AppDataSource.getRepository(Order).createQueryBuilder("order").where("order.id = :orderId", { orderId }).getOne();

    if (!order) {
      console.error("Order not found:", orderId);
      res.status(400).send("Order not found");
      return;
    }

    // 2. 更新訂單狀態
    // RtnCode = 1 為付款成功
    if (RtnCode === "1") {
      order.status = "paid";
      order.paidAt = new Date(PaymentDate);
    } else {
      order.status = "failed";
    }

    // 3. 儲存更新
    await AppDataSource.getRepository(Order).save(order);

    // 4. 回應綠界
    res.send("1|OK");
  } catch (error) {
    console.error("Payment callback error:", error);
    next(error);
  }
}
