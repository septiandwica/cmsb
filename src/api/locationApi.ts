import axiosInstance from "@/api/axiosInstance";

export const locationApi = {
  getAll: () => axiosInstance.get("/locations"),
};
