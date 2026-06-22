import axiosInstance from "./axiosInstance";
import { Province } from "../types";

export const provinceApi = {
  getProvinces: async (): Promise<Province[]> => {
    const response = await axiosInstance.get<Province[]>("/provinces");
    return response.data;
  },
  createProvince: async (request: { name: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>("/provinces", request);
    return response.data;
  },
  updateProvince: async (id: number, request: { name: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.put<{ message: string }>(`/provinces/${id}`, request);
    return response.data;
  },
  deleteProvince: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/provinces/${id}`);
    return response.data;
  },
};
