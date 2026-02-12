export interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
}

export interface ChatSession {
  id: number;
  title: string;
  messages: Message[];
  createdAt: number;
}

export type ModelType = "gemini-3" | "flash";