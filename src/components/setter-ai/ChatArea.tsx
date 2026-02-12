import React, { useRef, useEffect } from 'react';
import { Bell, Search, Sparkles, Zap, RefreshCw, Send, User as UserIcon } from 'lucide-react';
import { Message, ModelType } from '@/types/ai';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  input: string;
  setInput: (val: string) => void;
  onSend: (override?: string) => void;
  onRegenerate: () => void;
  activeModel: ModelType;
  setActiveModel: (model: ModelType) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

export default function ChatArea({
  messages,
  isLoading,
  input,
  setInput,
  onSend,
  onRegenerate,
  activeModel,
  setActiveModel,
  searchTerm,
  setSearchTerm
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Filter messages based on search (UI logic preserved from original)
  const displayedMessages = messages.filter(msg => 
    msg.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!searchTerm) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, searchTerm]);

  return (
    <main className="flex-1 flex flex-col h-screen bg-white relative">
      {/* Header */}
      <header className="h-[80px] flex items-center justify-between px-10 shrink-0 border-b border-gray-50/50">
        <div className="flex-1"></div>
        <div className="flex items-center gap-6">
          <div className="relative cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
            <Bell size={24} />
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
              6
            </span>
          </div>
          <div className="w-64">
             <Input 
               icon={<Search size={16} />} 
               placeholder="Search chat..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="bg-gray-50 border-transparent focus:bg-white focus:border-[#8771FF]"
             />
          </div>
        </div>
      </header>

      {/* Model Selector */}
      <div className="flex justify-center py-4 shrink-0">
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm gap-1">
          <button
            onClick={() => setActiveModel("gemini-3")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeModel === "gemini-3" 
                ? 'bg-gray-50 text-gray-900 shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Sparkles size={16} className={activeModel === "gemini-3" ? "text-purple-500" : ""} />
            Gemini 3
          </button>
          <button
            onClick={() => setActiveModel("flash")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeModel === "flash" 
                ? 'bg-gray-50 text-gray-900 shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Zap size={16} className={activeModel === "flash" ? "text-amber-500" : ""} />
            Flash
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center gap-8 scrollbar-thin scrollbar-thumb-gray-200">
        {displayedMessages.map((msg) => (
          <div key={msg.id} className="flex gap-4 items-start w-full max-w-3xl px-4">
            <div className="shrink-0 w-10 flex justify-center">
              {msg.role === "user" ? (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                   <UserIcon size={16} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C084FC] to-[#8B5CF6] flex items-center justify-center text-white shadow-md shadow-purple-200">
                   <span className="font-bold text-sm">#</span>
                </div>
              )}
            </div>

            <div className={`rounded-2xl p-6 text-[15px] leading-relaxed shadow-sm border
              ${msg.role === "user" 
                ? 'bg-white border-gray-200 text-gray-900' 
                : 'bg-white border-gray-100 text-gray-700 shadow-lg shadow-gray-100/50'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4 items-start w-full max-w-3xl px-4 animate-pulse">
            <div className="shrink-0 w-10 flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C084FC] to-[#8B5CF6] flex items-center justify-center text-white">
                  <span className="font-bold text-sm">#</span>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <span className="text-gray-400 text-sm">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-10" />
      </div>

      {/* Input Area */}
      <div className="p-6 pb-8 flex flex-col items-center gap-4 bg-white/80 backdrop-blur-sm border-t border-gray-50">
         <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full bg-white text-gray-500 border-gray-200 hover:text-gray-700 hover:bg-gray-50"
            onClick={onRegenerate}
            disabled={messages.length < 2 || isLoading}
            leftIcon={<RefreshCw size={14} />}
         >
            Regenerate response
         </Button>

         <div className="w-full max-w-3xl relative flex gap-3 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && onSend()}
              placeholder="Send a message"
              className="flex-1 bg-white border border-gray-200 rounded-2xl px-6 py-4 text-[15px] focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-[#8771FF] transition-all shadow-sm placeholder:text-gray-400"
              disabled={isLoading}
            />
            <Button 
              size="lg"
              className="h-[58px] rounded-2xl px-8 bg-gradient-to-r from-[#C084FC] to-[#8B5CF6] hover:shadow-lg hover:shadow-purple-200 transition-all active:scale-95"
              onClick={() => onSend()}
              disabled={isLoading || !input.trim()}
            >
              Submit
            </Button>
         </div>
         <p className="text-[11px] text-gray-400 text-center font-medium">
            Setter AI Copilot — Real-time guidance based on your team's highest-performing conversations.
         </p>
      </div>
    </main>
  );
}