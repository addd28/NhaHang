import axiosInstance from "./axiosInstance";
import { MenuItem, OptionGroup, ItemOption, OptionGroupType, SelectionType } from "../types";

export interface CreateMenuItemRequest {
  name: string;
  price: number;
  description?: string;
  image?: string;
  imageUrl?: string;
  categoryId: number;
  type: "INSTANT" | "KITCHEN";
}

export interface UpdateMenuItemRequest {
  name: string;
  price: number;
  description?: string;
  image?: string;
  imageUrl?: string;
  categoryId: number;
  type: "INSTANT" | "KITCHEN";
}

/** Extract a user-friendly error message from an Axios error.
 *  If backend returned structured validation details, returns the first detail message.
 *  Falls back to response.data.message, then to generic network message. */
export function extractApiError(err: any): string {
  const data = err?.response?.data;
  if (!data) return err?.message || "Lỗi không xác định";
  if (Array.isArray(data.details) && data.details.length > 0) {
    return data.details.map((d: any) => d.message).join(" | ");
  }
  return data.message || err.message || "Lỗi không xác định";
}

/** Extract structured validation details array from an Axios error. */
export function extractApiDetails(err: any): { field: string; message: string }[] {
  return err?.response?.data?.details || [];
}

export interface CreateOptionGroupRequest {
  name: string;
  type: OptionGroupType;
  selectionType: SelectionType;
  required: boolean;
  minSelect?: number;
  maxSelect?: number;
  displayOrder?: number;
  available?: boolean;
}

export interface CreateItemOptionRequest {
  optionCode: string;
  name: string;
  price: number;
  displayOrder?: number;
  available?: boolean;
}

export const menuApi = {
  // Customer menu items
  getMenuItems: async (): Promise<MenuItem[]> => {
    const response = await axiosInstance.get<MenuItem[]>("/customer/menu-items");
    return response.data;
  },
  getMenuItemById: async (id: number): Promise<MenuItem> => {
    const response = await axiosInstance.get<MenuItem>(`/customer/menu-items/${id}`);
    return response.data;
  },
  // Admin menu items
  getAdminMenuItems: async (): Promise<MenuItem[]> => {
    const response = await axiosInstance.get<MenuItem[]>("/admin/menu-items");
    return response.data;
  },
  getAdminMenuItemById: async (id: number): Promise<MenuItem> => {
    const response = await axiosInstance.get<MenuItem>(`/admin/menu-items/${id}`);
    return response.data;
  },
  createMenuItem: async (request: CreateMenuItemRequest): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>("/menu-items", request);
    return response.data;
  },
  updateMenuItem: async (id: number, request: UpdateMenuItemRequest): Promise<{ message: string }> => {
    const response = await axiosInstance.put<{ message: string }>(`/menu-items/${id}`, request);
    return response.data;
  },
  deleteMenuItem: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/menu-items/${id}`);
    return response.data;
  },

  // Option Groups API
  createOptionGroup: async (menuItemId: number | string, request: CreateOptionGroupRequest): Promise<OptionGroup> => {
    const response = await axiosInstance.post<OptionGroup>(`/menu-items/${menuItemId}/option-groups`, request);
    return response.data;
  },
  updateOptionGroup: async (id: number, request: CreateOptionGroupRequest): Promise<OptionGroup> => {
    const response = await axiosInstance.put<OptionGroup>(`/option-groups/${id}`, request);
    return response.data;
  },
  deleteOptionGroup: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/option-groups/${id}`);
    return response.data;
  },

  // Item Options API
  createItemOption: async (optionGroupId: number, request: CreateItemOptionRequest): Promise<ItemOption> => {
    const response = await axiosInstance.post<ItemOption>(`/option-groups/${optionGroupId}/options`, request);
    return response.data;
  },
  updateItemOption: async (id: number, request: CreateItemOptionRequest): Promise<ItemOption> => {
    const response = await axiosInstance.put<ItemOption>(`/item-options/${id}`, request);
    return response.data;
  },
  deleteItemOption: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/item-options/${id}`);
    return response.data;
  },
};
