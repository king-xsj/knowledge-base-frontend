import http from "./http";
import type { LoginResult } from "@/types";

/** 登录（account 支持邮箱或手机号） */
export function login(account: string, password: string) {
  return http.post<LoginResult>("/login", { account, password });
}