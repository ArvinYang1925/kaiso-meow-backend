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

  export default class ecpay_payment {
    constructor(options: EcpayOptions);
    payment_client: {
      aio_check_out_all: (params: EcpayPaymentParams) => string;
    };
  }
}
