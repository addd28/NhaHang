import axiosInstance from "./axiosInstance";
import { Category } from "../types";

export const categoryApi = {
  getCategories: async (): Promise<Category[]> => {
    const response = await axiosInstance.get<Category[]>("/categories");
    return response.data;
  },
  createCategory: async (request: { name: string; description?: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>("/categories", request);
    return response.data;
  },
  updateCategory: async (id: number, request: { name: string; description?: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.put<{ message: string }>(`/categories/${id}`, request);
    return response.data;
  },
  deleteCategory: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/categories/${id}`);
    return response.data;
  },
};
