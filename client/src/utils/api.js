// client/src/utils/api.js
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API,
  timeout: 15000,
  headers: { "Accept": "application/json" },
});

// optional: attach simple response interceptor for uniform errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // normalize error object
    const payload = {
      message: err?.response?.data?.error || err?.message || "Unknown error",
      status: err?.response?.status || 500,
      details: err?.response?.data || null,
    };
    return Promise.reject(payload);
  }
);

export default api;
