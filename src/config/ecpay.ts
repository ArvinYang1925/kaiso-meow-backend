import dotenv from "dotenv";

dotenv.config();

if (!process.env.ECPAY_OPERATION_MODE || !process.env.ECPAY_MERCHANT_ID || !process.env.ECPAY_HASH_KEY || !process.env.ECPAY_HASH_IV) {
  throw new Error("Missing required ECPAY environment variables");
}

export const options = {
  OperationMode: process.env.ECPAY_OPERATION_MODE, // 營運模式 : 測試 or 正式
  MercProfile: {
    MerchantID: process.env.ECPAY_MERCHANT_ID, // 商店代號
    HashKey: process.env.ECPAY_HASH_KEY, // HashKey
    HashIV: process.env.ECPAY_HASH_IV, // HashIV
  },
  IgnorePayment: [] as string[], // 隱藏付款方式
  IsProjectContractor: false,
} as const;
