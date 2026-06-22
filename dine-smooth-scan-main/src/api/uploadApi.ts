import axiosInstance from "./axiosInstance";

export const uploadApi = {
  upload: async (file: File, type: "foods" | "posts" | "qr" = "foods"): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    const response = await axiosInstance.post<{ url: string }>("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
