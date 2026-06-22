import axiosInstance from "./axiosInstance";
import { Article } from "../types";

export const articleApi = {
  getArticles: async (status?: string): Promise<Article[]> => {
    const url = status ? `/articles?status=${status}` : "/articles";
    const response = await axiosInstance.get<Article[]>(url);
    return response.data;
  },

  getArticleById: async (id: number): Promise<Article> => {
    const response = await axiosInstance.get<Article>(`/articles/${id}`);
    return response.data;
  },

  createArticle: async (request: Article): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>("/articles", request);
    return response.data;
  },

  updateArticle: async (id: number, request: Article): Promise<{ message: string }> => {
    const response = await axiosInstance.put<{ message: string }>(`/articles/${id}`, request);
    return response.data;
  },

  deleteArticle: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/articles/${id}`);
    return response.data;
  },
};
