import dotenv from "dotenv";

dotenv.config();

interface PaymentConfig {
  operationMode: string;
  merchantId: string;
  hashKey: string;
  hashIV: string;
  backendUrl: string;
  frontendUrl: string;
}

function validatePaymentConfig(): PaymentConfig {
  const requiredVars = {
    operationMode: process.env.ECPAY_OPERATION_MODE,
    merchantId: process.env.ECPAY_MERCHANT_ID,
    hashKey: process.env.ECPAY_HASH_KEY,
    hashIV: process.env.ECPAY_HASH_IV,
    backendUrl: process.env.BACKEND_URL,
    frontendUrl: process.env.FRONTEND_URL,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`缺少必要的支付環境變數: ${missingVars.join(", ")}`);
  }

  return requiredVars as PaymentConfig;
}

const config = validatePaymentConfig();

export const paymentConfig = {
  // 前後端路由
  BACKEND_URL: config.backendUrl,
  FRONTEND_URL: config.frontendUrl,

  // ECPay SDK 的結構
  options: {
    OperationMode: config.operationMode,
    MercProfile: {
      MerchantID: config.merchantId,
      HashKey: config.hashKey,
      HashIV: config.hashIV,
    },
    IgnorePayment: [] as string[],
    IsProjectContractor: false,
  },
} as const;
