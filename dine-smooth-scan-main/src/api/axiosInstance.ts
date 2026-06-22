import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Attach JWT token if available
axiosInstance.interceptors.request.use(
  (config) => {
    const rawToken = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
    const token = rawToken && rawToken !== "null" && rawToken !== "undefined" ? rawToken : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 unauthorized globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect if trying to access admin endpoints
      if (typeof window !== "undefined") {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
        
        if (window.location.pathname.startsWith("/admin")) {
          window.location.href = "/admin/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
