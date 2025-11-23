import axios from "@/api/axiosInstance";

export const vendorApi = {
  getAll: () => axios.get("/vendors"),
  create: (data: any) => axios.post("/vendors", data),
  update: (id: number, data: any) => axios.put(`/vendors/${id}`, data),
  remove: (id: number) => axios.delete(`/vendors/${id}`),
};
