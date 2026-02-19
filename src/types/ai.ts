export interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  createdAt?: string;
  pending?: boolean;
  clientTempId?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string;
}

export type ModelType = "gemini-3" | "flash";
