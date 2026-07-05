export interface UserOut {
  id: string;
  username: string;
  role: string;
}

export interface MessageOut {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  token_count: number | null;
  latency_ms: number | null;
  created_at: string;
}

export interface ConversationOut {
  id: string;
  title: string;
  pinned: boolean;
  model: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithMessages extends ConversationOut {
  messages: MessageOut[];
}

export type WsServerEvent =
  | { type: "user_message_saved"; message: MessageOut }
  | { type: "token"; delta: string }
  | { type: "assistant_message_saved"; message: MessageOut }
  | { type: "error"; detail: string };

export type WsClientEvent = { type: "user_message"; content: string };
