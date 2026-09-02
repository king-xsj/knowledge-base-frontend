import http from "./http";
import type { Role } from "@/types";

export function listRoles() {
  return http.get<Role[]>("/roles");
}

export interface RolePayload {
  name?: string;
  description?: string;
}

export function createRole(data: RolePayload) {
  return http.post<Role>("/roles", data);
}

export function updateRole(id: number, data: RolePayload) {
  return http.put<Role>(`/roles/${id}`, data);
}

export function deleteRole(id: number) {
  return http.delete(`/roles/${id}`);
}
