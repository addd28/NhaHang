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
  amount: number;
  paymentMethod: string; // CASH | QR | PAYPAL
  status: string;        // PENDING | CONFIRMED | CANCELLED
  requestedAt: string;
  confirmedAt?: string;
  confirmedByUserId?: number;
  alreadyPaid: boolean;  // true = PayPal đã thanh toán, chỉ cần xác nhận đóng bàn
  transactionCode?: string;
  paymentStatus?: string;
  bankName?: string;
  bankAccount?: string;
  accountName?: string;
  qrUrl?: string;
  transferContent?: string;
  createdAt?: string;
  expiredAt?: string;
  confirmedBy?: string;
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
  requestPayment: async (sessionId: number, paymentMethod: string): Promise<PaymentRequestItem> => {
    const response = await axiosInstance.post<PaymentRequestItem>(`/payments/request/${sessionId}`, null, {
      params: { paymentMethod },
    });
    return response.data;
  },

  /**
   * Kiểm tra session đã có PENDING request chưa.
   */
  checkPendingRequest: async (sessionId: number): Promise<{ hasPending: boolean, request?: PaymentRequestItem }> => {
    const response = await axiosInstance.get<{ hasPending: boolean, request?: PaymentRequestItem }>(`/payments/request/status`, {
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
  confirmPaymentRequest: async (id: number): Promise<PaymentRequestItem> => {
    const response = await axiosInstance.post<PaymentRequestItem>(`/payments/confirm/${id}`);
    return response.data;
  },

  cancelPaymentRequest: async (id: number): Promise<PaymentRequestItem> => {
    const response = await axiosInstance.post<PaymentRequestItem>(`/payments/cancel/${id}`);
    return response.data;
  },

  getPaymentRequest: async (id: number): Promise<PaymentRequestItem> => {
    const response = await axiosInstance.get<PaymentRequestItem>(`/payments/request/${id}`);
    return response.data;
  },

  getPaymentHistoryFiltered: async (filters: any): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>("/payments/history", { params: filters });
    return response.data;
  },

  getStatistics: async (filters: any): Promise<any> => {
    const response = await axiosInstance.get<any>("/payments/statistics", { params: filters });
    return response.data;
  },

  getTopItems: async (filters: any): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>("/payments/top-items", { params: filters });
    return response.data;
  },

  exportExcel: async (filters: any): Promise<Blob> => {
    const response = await axiosInstance.get("/payments/export/excel", {
      params: filters,
      responseType: "blob",
    });
    return response.data;
  },

  exportPdf: async (filters: any): Promise<Blob> => {
    const response = await axiosInstance.get("/payments/export/pdf", {
      params: filters,
      responseType: "blob",
    });
    return response.data;
  },

  getInvoicePdf: async (paymentId: number): Promise<Blob> => {
    const response = await axiosInstance.get(`/payments/${paymentId}/invoice`, {
      responseType: "blob",
    });
    return response.data;
  },
};
