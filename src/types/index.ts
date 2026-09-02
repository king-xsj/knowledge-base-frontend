export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  roleId: number;
  roleName: string;
  department: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
}

export interface DocumentConfig {
  id: number;
  source: string;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginResult {
  token: string;
  user: User;
}

export type ChatStreamEvent =
  | { type: "delta"; content: string }
  | { type: "done"; answer: string }
  | { type: "error"; message: string };

export type ChatMessageStatus = "streaming" | "done" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: ChatMessageStatus;
}