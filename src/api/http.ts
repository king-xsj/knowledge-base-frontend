import axios from "axios";
import { ElMessage } from "element-plus";

const http = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// 请求拦截：注入 JWT
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：401 跳登录，其余错误统一提示
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    } else {
      const msg = error.response?.data?.error || error.message || "请求失败";
      ElMessage.error(msg);
    }
    return Promise.reject(error);
  }
);

export default http;