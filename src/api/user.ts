import http from "./http";
import type { User } from "@/types";

export function listUsers() {
  return http.get<User[]>("/users");
}

export interface UserPayload {
  email?: string;
  phone?: string;
  name?: string;
  roleId?: number;
  department?: string;
  password?: string;
}

export function createUser(data: UserPayload) {
  return http.post<User>("/users", data);
}

export function updateUser(id: string, data: UserPayload) {
  return http.put<User>(`/users/${id}`, data);
}

export function deleteUser(id: string) {
  return http.delete(`/users/${id}`);
}