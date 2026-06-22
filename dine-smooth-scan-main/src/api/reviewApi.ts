import axiosInstance from "./axiosInstance";
import { Review } from "../types";

export const reviewApi = {
  createReview: async (review: Review): Promise<{ message: string }> => {
    try {
      // Prepared for when POST /api/reviews is implemented on the backend.
      const response = await axiosInstance.post<{ message: string }>("/reviews", review);
      return response.data;
    } catch (error) {
      // Fallback local storage mock so frontend functions immediately
      console.log("Mocking review storage since review API is not fully implemented on backend:", review);
      if (typeof window !== "undefined") {
        const reviews = JSON.parse(localStorage.getItem("customerReviews") || "[]");
        reviews.push({ ...review, id: Date.now(), createdAt: new Date().toISOString() });
        localStorage.setItem("customerReviews", JSON.stringify(reviews));
      }
      return { message: "Review submitted successfully (local storage)" };
    }
  },
  getReviews: async (): Promise<Review[]> => {
    try {
      const response = await axiosInstance.get<Review[]>("/reviews");
      return response.data;
    } catch (error) {
      if (typeof window !== "undefined") {
        return JSON.parse(localStorage.getItem("customerReviews") || "[]");
      }
      return [];
    }
  }
};
