declare module "ecpay_aio_nodejs" {
  interface EcpayPaymentParams {
    MerchantID: string;
    MerchantTradeNo: string;
    MerchantTradeDate: string;
    PaymentType: string;
    TotalAmount: string;
    TradeDesc: string;
    ItemName: string;
    ReturnURL: string;
    ClientBackURL: string;
    ChoosePayment: string;
  }

  interface EcpayOptions {
    OperationMode: string;
    MercProfile: {
      MerchantID: string;
      HashKey: string;
      HashIV: string;
    };
    IgnorePayment: string[];
    IsProjectContractor: boolean;
  }
  // 綠界回調請求體
  export interface EcpayCallbackBody {
    RtnCode?: string;
    MerchantTradeNo?: string;
    TradeNo?: string;
    TradeAmt?: string;
    PaymentType?: string;
    PaymentTypeChargeFee?: string;
    TradeDate?: string;
    SimulatePaid?: string;
    CheckMacValue?: string;
    [key: string]: string | undefined;
  }

  export default class ecpay_payment {
    constructor(options: EcpayOptions);
    payment_client: {
      aio_check_out_all: (params: EcpayPaymentParams) => string;
      helper: {
        gen_chk_mac_value: (params: Record<string, string | undefined>) => string;
      };
    };
  }
}
