import axiosInstance from "./axiosInstance";
import { OrderItem } from "../types";

export interface CreateOrderItem {
  menuItemId: number;
  quantity: number;
  note: string;
  optionIds?: number[];
}

export interface CreateOrderRequest {
  sessionId?: number;
  reservationId?: number;
  items: CreateOrderItem[];
}

export const orderApi = {
  createOrder: async (request: CreateOrderRequest): Promise<string> => {
    const response = await axiosInstance.post<string>("/orders", request);
    return response.data;
  },
  getOrdersBySession: async (sessionId: number): Promise<OrderItem[]> => {
    const response = await axiosInstance.get<OrderItem[]>(`/orders/session/${sessionId}`);
    return response.data;
  },
  getKitchenOrders: async (): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>("/kitchen/orders");
    return response.data;
  },
  getServiceTables: async (): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>("/service/tables");
    return response.data;
  },
  updateOrderItemStatus: async (itemId: number, status: string): Promise<string> => {
    const response = await axiosInstance.put<string>(`/orders/items/${itemId}/status`, null, {
      params: { status },
    });
    return response.data;
  },
  getNewRequests: async (): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>("/waiter/order-requests");
    return response.data;
  },
  confirmOrder: async (itemId: number, quantity?: number, menuItemId?: number): Promise<any> => {
    const response = await axiosInstance.post<any>(`/waiter/confirm-order/${itemId}`, null, {
      params: { quantity, menuItemId },
    });
    return response.data;
  },
};
