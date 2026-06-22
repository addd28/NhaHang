import axiosInstance from "./axiosInstance";
import { User } from "../types";

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  login: async (request: any): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>("/auth/login", request);
    return response.data;
  },
  register: async (request: any): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>("/auth/register", request);
    return response.data;
  },
};
