import http from "./http";
import type { DocumentConfig } from "@/types";

/** 文档配置列表 */
export function listDocuments() {
  return http.get<DocumentConfig[]>("/documents");
}

/** 更新文档部门（后端会立即重新索引该文档） */
export function updateDocument(
  id: number,
  data: { department?: string | null }
) {
  return http.put<DocumentConfig>(`/documents/${id}`, data);
}

/** 重建全部索引 */
export function reindexAllDocuments() {
  return http.post("/documents/reindex-all");
}
