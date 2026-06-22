import axiosInstance from "./axiosInstance";
import { RestaurantTable, ReservationResponse, AdminLookupResponse, AdminCheckInResponse } from "../types";

export interface ReserveTableResponse {
  message: string;
  reservationId: number;
  confirmationCode: string;
  tableNumber: number;
}

export interface CheckInByCodeResponse {
  sessionId: number;
  tableNumber: number;
  customerName: string;
  phone: string;
  guestCount: number;
  message: string;
  preOrderCount: number;
}

export const tableApi = {
  getTables: async (branchId?: number): Promise<RestaurantTable[]> => {
    const response = await axiosInstance.get<RestaurantTable[]>("/tables", {
      params: branchId ? { branchId } : {},
    });
    return response.data;
  },
  createTable: async (request: { tableNumber: number; capacity: number; branchId: number }): Promise<string> => {
    const response = await axiosInstance.post<string>("/tables", request);
    return response.data;
  },
  updateTable: async (id: number, request: { tableNumber: number; capacity: number; branchId?: number }): Promise<{ message: string }> => {
    const response = await axiosInstance.put<{ message: string }>(`/tables/${id}`, request);
    return response.data;
  },
  deleteTable: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/tables/${id}`);
    return response.data;
  },
  checkIn: async (tableId: number): Promise<{ sessionId: number }> => {
    const response = await axiosInstance.post<{ sessionId: number }>(`/tables/${tableId}/checkin`);
    return response.data;
  },
  resetTable: async (tableId: number): Promise<string> => {
    const response = await axiosInstance.put<string>(`/tables/${tableId}/reset`);
    return response.data;
  },
  reserveTable: async (tableId: number, request: any): Promise<ReserveTableResponse> => {
    const response = await axiosInstance.post<ReserveTableResponse>(`/tables/${tableId}/reserve`, request);
    return response.data;
  },
  reserveSlot: async (request: any): Promise<ReserveTableResponse> => {
    const response = await axiosInstance.post<ReserveTableResponse>("/reservations", request);
    return response.data;
  },
  checkinByCode: async (confirmationCode: string): Promise<CheckInByCodeResponse> => {
    const response = await axiosInstance.post<CheckInByCodeResponse>("/tables/checkin-by-code", { confirmationCode });
    return response.data;
  },
  getReservations: async (): Promise<ReservationResponse[]> => {
    const response = await axiosInstance.get<ReservationResponse[]>("/tables/reservations");
    return response.data;
  },
  getWaitlist: async (): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>("/admin/reservations/waitlist");
    return response.data;
  },
  adminLookup: async (code: string): Promise<AdminLookupResponse> => {
    const response = await axiosInstance.get<AdminLookupResponse>("/admin/reservations/lookup", {
      params: { code }
    });
    return response.data;
  },
  adminCheckIn: async (reservationCode: string): Promise<AdminCheckInResponse> => {
    const response = await axiosInstance.post<AdminCheckInResponse>("/admin/reservations/check-in", { reservationCode });
    return response.data;
  },
};

