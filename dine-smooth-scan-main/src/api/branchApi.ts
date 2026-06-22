import axiosInstance from "./axiosInstance";
import { Branch } from "../types";

export const branchApi = {
  getBranches: async (): Promise<Branch[]> => {
    const response = await axiosInstance.get<Branch[]>("/branches");
    return response.data;
  },
  createBranch: async (request: { name: string; address?: string; phone?: string; provinceId?: number }): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>("/branches", request);
    return response.data;
  },
  updateBranch: async (id: number, request: { name: string; address?: string; phone?: string; provinceId?: number }): Promise<{ message: string }> => {
    const response = await axiosInstance.put<{ message: string }>(`/branches/${id}`, request);
    return response.data;
  },
  deleteBranch: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/branches/${id}`);
    return response.data;
  },
};
