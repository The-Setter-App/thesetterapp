"use client";

import { useState } from "react";
import { ChatSession, Message } from "@/types/ai";
import ChatSidebar from "@/components/setter-ai/ChatSidebar";
import ChatArea from "@/components/setter-ai/ChatArea";

export default function SetterAiPage() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: 1,
      title: "New Conversation",
      createdAt: Date.now(),
      messages: []
    }
  ]);

  const [activeSessionId, setActiveSessionId] = useState<number>(1);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const activeSession = chatSessions.find(s => s.id === activeSessionId) || chatSessions[0];

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isLoading) return;

    const sessionId = activeSessionId;
    const sessionSnapshot = chatSessions.find((session) => session.id === sessionId);
    if (!sessionSnapshot) return;

    const newUserMessage: Message = { id: Date.now(), role: "user", text: textToSend };
    const assistantMessageId = Date.now() + 1;
    const requestMessages = [...sessionSnapshot.messages, newUserMessage];

    setChatSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        const isFirstUserMsg = session.messages.length <= 1;
        const newTitle = isFirstUserMsg ? textToSend.slice(0, 30) + (textToSend.length > 30 ? "..." : "") : session.title;

        return {
          ...session,
          title: newTitle,
          messages: [
            ...session.messages,
            newUserMessage,
            { id: assistantMessageId, role: "ai", text: "" }
          ]
        };
      }
      return session;
    }));

    if (!overrideText) setInput("");
    setIsLoading(true);

    try {
      const payloadMessages = requestMessages.map((message) => ({
        role: message.role === "user" ? "user" : "assistant",
        content: message.text,
      }));

      const response = await fetch("/api/setter-ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to stream AI response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const token = decoder.decode(value, { stream: true });
        if (!token) continue;

        assistantText += token;
        setChatSessions((prev) =>
          prev.map((session) => {
            if (session.id !== sessionId) return session;
            return {
              ...session,
              messages: session.messages.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, text: assistantText }
                  : message
              ),
            };
          })
        );
      }

      if (!assistantText.trim()) {
        setChatSessions((prev) =>
          prev.map((session) => {
            if (session.id !== sessionId) return session;
            return {
              ...session,
              messages: session.messages.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, text: "No response returned from model." }
                  : message
              ),
            };
          })
        );
      }
    } catch {
      setChatSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId) return session;
          return {
            ...session,
            messages: session.messages.map((message) =>
              message.id === assistantMessageId
                ? { ...message, text: "Failed to generate AI response. Please try again." }
                : message
            ),
          };
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (activeSession.messages.length > 0) {
      const newSession: ChatSession = {
        id: Date.now(),
        title: "New Conversation",
        createdAt: Date.now(),
        messages: []
      };
      setChatSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setSearchTerm("");
    }
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#F8F7FF] text-[#101011] lg:flex-row">
      <ChatSidebar 
        sessions={chatSessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={handleNewChat}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <ChatArea 
        messages={activeSession.messages}
        isLoading={isLoading}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        searchTerm={searchTerm}
      />
      </div>
  );
}
