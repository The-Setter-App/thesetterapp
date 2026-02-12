"use client";

import { useState } from "react";
import { ChatSession, Message, ModelType } from "@/types/ai";
import ChatSidebar from "@/components/setter-ai/ChatSidebar";
import ChatArea from "@/components/setter-ai/ChatArea";

export default function SetterAiPage() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: 1,
      title: "New Conversation",
      createdAt: Date.now(),
      messages: [
        { 
          id: 1, 
          role: "ai", 
          text: "Lead says they're interested but 'not sure if now is the right time.' What should I reply?" 
        },
        {
          id: 2,
          role: "ai",
          text: "This is a classic timing objection. Your goal is not to convince them, but to diagnose what's really behind the hesitation.\n\nStep 1: Acknowledge without resistance\n'Totally understand—most people I speak to feel that way at first.'\n\nStep 2: Isolate the real objection\n'When you say not right now, is it more about budget, timing in your schedule, or just wanting a bit more clarity?'"
        }
      ]
    }
  ]);

  const [activeSessionId, setActiveSessionId] = useState<number>(1);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<ModelType>("gemini-3");
  const [searchTerm, setSearchTerm] = useState("");

  const activeSession = chatSessions.find(s => s.id === activeSessionId) || chatSessions[0];

  const handleSend = (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim()) return;

    const newUserMessage: Message = { id: Date.now(), role: "user", text: textToSend };
    
    setChatSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        const isFirstUserMsg = session.messages.length <= 1; 
        const newTitle = isFirstUserMsg ? textToSend.slice(0, 30) + (textToSend.length > 30 ? "..." : "") : session.title;
        
        return {
          ...session,
          title: newTitle,
          messages: [...session.messages, newUserMessage]
        };
      }
      return session;
    }));

    if (!overrideText) setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const mockResponse: Message = {
        id: Date.now() + 1,
        role: "ai",
        text: "AI integration has been removed. This is a UI-only demo response. To enable real AI responses, integrate your preferred AI service.",
      };

      setChatSessions(prev => prev.map(session => {
        if (session.id === activeSessionId) {
          return { ...session, messages: [...session.messages, mockResponse] };
        }
        return session;
      }));

      setIsLoading(false);
    }, 1000);
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

  const handleRegenerate = () => {
    const lastUserIndex = activeSession.messages.map(m => m.role).lastIndexOf("user");
    if (lastUserIndex === -1) return;
    const textToResend = activeSession.messages[lastUserIndex].text;
    
    setChatSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        return { ...session, messages: session.messages.slice(0, lastUserIndex + 1) };
      }
      return session;
    }));
    handleSend(textToResend);
  };

  return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden text-gray-900">
      <ChatSidebar 
        sessions={chatSessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={handleNewChat}
      />

      <ChatArea 
        messages={activeSession.messages}
        isLoading={isLoading}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onRegenerate={handleRegenerate}
        activeModel={activeModel}
        setActiveModel={setActiveModel}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
    </div>
  );
}