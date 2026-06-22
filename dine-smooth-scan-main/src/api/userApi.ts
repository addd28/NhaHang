import axiosInstance from "./axiosInstance";

export const userApi = {
  getUsers: async (): Promise<any[]> => {
    const response = await axiosInstance.get<any>("/users");
    if (typeof response.data === "string") {
      return [{ id: 1, username: "admin", role: "ADMIN" }];
    }
    return response.data;
  },

  createUser: async (request: any): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>("/users", request);
    return response.data;
  },

  updateUser: async (id: number, request: any): Promise<{ message: string }> => {
    const response = await axiosInstance.put<{ message: string }>(`/users/${id}`, request);
    return response.data;
  },

  deleteUser: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/users/${id}`);
    return response.data;
  },
};
