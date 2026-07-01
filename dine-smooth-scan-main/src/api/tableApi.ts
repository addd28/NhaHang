import axiosInstance from "./axiosInstance";
import { RestaurantTable, ReservationResponse, AdminCheckInResponse } from "../types";

export interface ReserveTableResponse {
  message: string;
  reservationId: number;
  confirmationCode: string;
  reservationCode: string;
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

export interface WaitlistResponse {
  reservationId: number;
  customerName: string;
  phoneNumber: string;
  guestCount: number;
  reservationTime: string;
  waitingMinutes: number;
}

export interface ReservationDashboardStats {
  bookedToday: number;
  waitlistToday: number;
  seatedToday: number;
  noShowToday: number;
  totalToday: number;
  successRate: number;
  chart7Days: Array<{
    date: string;
    booked: number;
    waitlist: number;
    seated: number;
    noShow: number;
  }>;
  chart30Days: Array<{
    date: string;
    booked: number;
    waitlist: number;
    seated: number;
    noShow: number;
  }>;
}

export const tableApi = {
  getTables: async (): Promise<RestaurantTable[]> => {
    const response = await axiosInstance.get<RestaurantTable[]>("/tables");
    return response.data;
  },
  createTable: async (request: { tableNumber: number; capacity: number }): Promise<string> => {
    const response = await axiosInstance.post<string>("/tables", request);
    return response.data;
  },
  updateTable: async (id: number, request: { tableNumber: number; capacity: number }): Promise<{ message: string }> => {
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
  
  // Public reservation slot booking
  reserveSlot: async (request: any): Promise<ReserveTableResponse> => {
    const response = await axiosInstance.post<ReserveTableResponse>("/reservations", request);
    return response.data;
  },

  // Admin/Cashier/Waiter Reservation endpoints
  getReservations: async (): Promise<ReservationResponse[]> => {
    const response = await axiosInstance.get<ReservationResponse[]>("/reservations");
    return response.data;
  },
  getReservationById: async (id: number): Promise<ReservationResponse> => {
    const response = await axiosInstance.get<ReservationResponse>(`/reservations/${id}`);
    return response.data;
  },
  searchReservations: async (q: string): Promise<ReservationResponse[]> => {
    const response = await axiosInstance.get<ReservationResponse[]>("/reservations/search", {
      params: { q }
    });
    return response.data;
  },
  checkInReservation: async (id: number, tableId: number): Promise<AdminCheckInResponse> => {
    const response = await axiosInstance.post<AdminCheckInResponse>(`/reservations/checkin/${id}`, null, {
      params: { tableId }
    });
    return response.data;
  },
  getOccupancy: async (dateTime: string): Promise<{ status: "PLENTY" | "NEAR_FULL" | "CROWDED"; message: string; count: number; totalTables: number }> => {
    const response = await axiosInstance.get<{ status: "PLENTY" | "NEAR_FULL" | "CROWDED"; message: string; count: number; totalTables: number }>("/reservations/occupancy", {
      params: { dateTime }
    });
    return response.data;
  },
  cancelReservation: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.post<{ success: boolean; message: string }>(`/reservations/cancel/${id}`);
    return response.data;
  },
  getHistory: async (): Promise<ReservationResponse[]> => {
    const response = await axiosInstance.get<ReservationResponse[]>("/reservations/history");
    return response.data;
  },
  getDashboardStats: async (): Promise<ReservationDashboardStats> => {
    const response = await axiosInstance.get<ReservationDashboardStats>("/reservations/dashboard-stats");
    return response.data;
  },
};
