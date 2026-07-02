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

export const paymentApi = {
  /**
   * Lấy hóa đơn của một bàn
   */
  getBill: async (sessionId: number): Promise<PaymentResponse> => {
    const response = await axiosInstance.get<PaymentResponse>(
      `/payments/${sessionId}`
    );
    return response.data;
  },

  /**
   * Thu ngân xác nhận thanh toán và đóng bàn
   */
  payment: async (
    sessionId: number,
    paymentMethod: string = "CASH"
  ): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>(
      `/payments/${sessionId}`,
      null,
      {
        params: {
          paymentMethod,
        },
      }
    );

    return response.data;
  },

  /**
   * Danh sách các bàn đang có khách
   */
  getCashierSessions: async (): Promise<CashierSession[]> => {
    const response = await axiosInstance.get<CashierSession[]>(
      "/cashier/sessions"
    );
    return response.data;
  },

  /**
   * Đóng bàn (fallback nếu cần)
   */
  closeSession: async (
    sessionId: number
  ): Promise<{ success: boolean }> => {
    const response = await axiosInstance.post<{ success: boolean }>(
      `/cashier/close-session/${sessionId}`
    );

    return response.data;
  },

  /**
   * Lịch sử thanh toán
   */
  getPaymentHistory: async (): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>(
      "/payments/history"
    );

    return response.data;
  },

  getPaymentHistoryFiltered: async (filters: any): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>(
      "/payments/history",
      {
        params: filters,
      }
    );

    return response.data;
  },

  /**
   * Dashboard
   */
  getStatistics: async (filters: any): Promise<any> => {
    const response = await axiosInstance.get(
      "/payments/statistics",
      {
        params: filters,
      }
    );

    return response.data;
  },

  getTopItems: async (filters: any): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>(
      "/payments/top-items",
      {
        params: filters,
      }
    );

    return response.data;
  },

  /**
   * Export
   */
  exportExcel: async (filters: any): Promise<Blob> => {
    const response = await axiosInstance.get(
      "/payments/export/excel",
      {
        params: filters,
        responseType: "blob",
      }
    );

    return response.data;
  },

  exportPdf: async (filters: any): Promise<Blob> => {
    const response = await axiosInstance.get(
      "/payments/export/pdf",
      {
        params: filters,
        responseType: "blob",
      }
    );

    return response.data;
  },

  getInvoicePdf: async (paymentId: number): Promise<Blob> => {
    const response = await axiosInstance.get(
      `/payments/${paymentId}/invoice`,
      {
        responseType: "blob",
      }
    );

    return response.data;
  },

  /**
   * Gọi nhân viên
   */
  callCashier: async (sessionId: number): Promise<any> => {
    const response = await axiosInstance.post(
      `/cashier/call/${sessionId}`
    );

    return response.data;
  },

  getCalls: async (): Promise<any[]> => {
    try {
      const response = await axiosInstance.get<any[]>(
        "/cashier/calls"
      );
      return response.data;
    } catch {
      return [];
    }
  },

  clearCall: async (sessionId: number): Promise<any> => {
    const response = await axiosInstance.delete(
      `/cashier/call/${sessionId}`
    );

    return response.data;
  },

  /**
   * Tạo yêu cầu thanh toán từ cashier (sau khi check SERVED)
   */
  requestPayment: async (
    sessionId: number,
    paymentMethod: string = "QR"
  ): Promise<any> => {
    const response = await axiosInstance.post(
      `/payments/request/${sessionId}`,
      null,
      {
        params: { paymentMethod },
      }
    );

    return response.data;
  },

  /**
   * Xác nhận yêu cầu thanh toán (Cashier confirm sau khi khách thanh toán)
   */
  confirmPaymentRequest: async (requestId: number): Promise<any> => {
    const response = await axiosInstance.post(
      `/payments/confirm/${requestId}`
    );

    return response.data;
  },

  /**
   * Hủy yêu cầu thanh toán
   */
  cancelPaymentRequest: async (requestId: number): Promise<any> => {
    const response = await axiosInstance.post(
      `/payments/cancel/${requestId}`
    );

    return response.data;
  },

  /**
   * Lấy danh sách yêu cầu thanh toán chờ xác nhận
   * [Cần implement backend endpoint nếu chưa có]
   */
  getPendingPaymentRequests: async (): Promise<any[]> => {
    try {
      const response = await axiosInstance.get<any[]>(
        "/payments/pending"
      );
      return response.data;
    } catch {
      return [];
    }
  },

  /**
   * Kiểm tra session có yêu cầu thanh toán chờ không
   */
  checkPendingRequest: async (sessionId: number): Promise<any> => {
    const response = await axiosInstance.get(
      "/payments/request/status",
      {
        params: { sessionId },
      }
    );

    return response.data;
  },
};