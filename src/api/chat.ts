import type { ChatMessage, ChatStreamEvent } from "@/types";
import http from "./http";

export interface ChatHistoryResult {
  messages: ChatMessage[];
  hasMore: boolean;
}

interface ChatHistoryRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

/**
 * 分页拉取历史消息（每次 limit 条，按时间升序返回）。
 * @param before 游标：返回 id 小于该值的更早消息；省略则取最新
 */
export async function fetchChatHistory(
  before?: string,
  limit = 10
): Promise<ChatHistoryResult> {
  const { data } = await http.get<{ messages: ChatHistoryRow[]; hasMore: boolean }>(
    "/qa/history",
    { params: { before, limit } }
  );
  return {
    messages: data.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      status: "done",
    })),
    hasMore: data.hasMore,
  };
}

/**
 * 通过 NDJSON 流式 POST 请求获取回答。
 * 后端逐行返回 JSON：{type:"delta"|"done"|"error", ...}
 */
export async function streamChat(
  question: string,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/qa/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`请求失败（${res.status}）: ${body}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        onEvent(JSON.parse(line) as ChatStreamEvent);
      } catch {
        // 忽略无法解析的行
      }
    }
  }
}