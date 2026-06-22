import axiosInstance from "./axiosInstance";

export interface PaymentItem {
  menuItemName: string;
  quantity: number;
  price: number;
}

export interface PaymentResponse {
  sessionId: number;
  items: PaymentItem[];
  totalAmount: number;
}

export interface CashierSession {
  sessionId: number;
  tableNumber: number;
  customerName: string;
  startTime: string;
  totalAmount: number;
  paymentStatus?: string;
  paymentMethod?: string;
}

export interface PaymentRequestItem {
  id: number;
  sessionId: number;
  tableNumber: number;
  branchName: string;
  amount: number;
  paymentMethod: string; // CASH | QR | PAYPAL
  status: string;        // PENDING | CONFIRMED | CANCELLED
  requestedAt: string;
  confirmedAt?: string;
  confirmedByUserId?: number;
  alreadyPaid: boolean;  // true = PayPal đã thanh toán, chỉ cần xác nhận đóng bàn
}

export const paymentApi = {
  getBill: async (sessionId: number): Promise<PaymentResponse> => {
    const response = await axiosInstance.get<PaymentResponse>(`/payments/${sessionId}`);
    return response.data;
  },

  /** [DEPRECATED] — đóng session ngay, chỉ dùng cho backward-compat PayPal */
  payment: async (sessionId: number, paymentMethod: string = "CASH"): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>(`/payments/${sessionId}`, null, {
      params: { paymentMethod },
    });
    return response.data;
  },

  /**
   * [NEW] Khách gửi yêu cầu thanh toán — KHÔNG đóng session.
   */
  requestPayment: async (sessionId: number, paymentMethod: string): Promise<{ success: boolean; message: string; requestId: number }> => {
    const response = await axiosInstance.post(`/payments/request`, {
      sessionId,
      paymentMethod,
    });
    return response.data;
  },

  /**
   * Kiểm tra session đã có PENDING request chưa (tránh gửi 2 lần).
   */
  checkPendingRequest: async (sessionId: number): Promise<{ hasPending: boolean }> => {
    const response = await axiosInstance.get(`/payments/request/status`, {
      params: { sessionId },
    });
    return response.data;
  },

  getPaymentHistory: async (): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>("/payments/history");
    return response.data;
  },

  getCashierSessions: async (): Promise<CashierSession[]> => {
    const response = await axiosInstance.get<CashierSession[]>("/cashier/sessions");
    return response.data;
  },

  closeSession: async (sessionId: number): Promise<{ success: boolean }> => {
    const response = await axiosInstance.post<{ success: boolean }>(`/cashier/close-session/${sessionId}`);
    return response.data;
  },

  /**
   * [NEW] Danh sách yêu cầu thanh toán PENDING — dành cho Cashier.
   */
  getPendingPaymentRequests: async (): Promise<PaymentRequestItem[]> => {
    const response = await axiosInstance.get<PaymentRequestItem[]>("/cashier/payment-requests");
    return response.data;
  },

  /**
   * [NEW] Cashier xác nhận đã nhận tiền → đóng session → giải phóng bàn.
   */
  confirmPaymentRequest: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.post(`/cashier/payment-requests/${id}/confirm`);
    return response.data;
  },
};
