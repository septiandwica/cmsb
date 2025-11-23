import axios from "axios";

// BASE URL dari environment
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

// Inject Authorization token jika ada
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Optional: global error handler
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    // Token invalid → logout
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
