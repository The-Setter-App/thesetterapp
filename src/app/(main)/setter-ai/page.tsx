"use client";

import { useState, useRef, useEffect } from "react";

// Local types (no AI service)
interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
}

interface ChatSession {
  id: number;
  title: string;
  messages: Message[];
  createdAt: number;
}

type ModelType = "gemini-3" | "flash";

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = chatSessions.find(s => s.id === activeSessionId) || chatSessions[0];
  
  const displayedMessages = activeSession.messages.filter(msg => 
    msg.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!searchTerm) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeSession.messages, searchTerm, activeSessionId]);

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

    // Simulate AI response (UI only - no actual AI integration)
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

  const switchChat = (sessionId: number) => {
    setActiveSessionId(sessionId);
    setSearchTerm("");
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
    <div style={styles.appContainer}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.brandTitle}>Setter AI</h2>
          <p style={styles.brandSubtitle}>Real-time AI coaching for every message, every lead, every deal.</p>
        </div>
        
        <div style={styles.sidebarSection}>
          <span style={styles.sidebarLabel}>Your chats</span>
          
          <div style={styles.newChatButton} onClick={handleNewChat}>
            + New Conversation
          </div>

          <div style={styles.historyList}>
            {chatSessions.map((session) => (
              <div 
                key={session.id}
                style={session.id === activeSessionId ? styles.historyItemActive : styles.historyItem}
                onClick={() => switchChat(session.id)}
              >
                <span style={{ marginRight: "8px", fontSize: '14px' }}>💬</span>
                <span style={styles.historyText}>{session.title}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main style={styles.mainContent}>
        <header style={styles.topHeader}>
           <div style={{flex: 1}}></div>
           <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
             <div style={styles.notificationWrapper}>
                <img src="/icons/setterAI/Bell.svg" alt="Notification Bell"/> <span style={styles.notificationBadge}>6</span>
             </div>
             <div style={styles.searchWrapper}>
                <span style={{color: '#9CA3AF', paddingLeft: '10px'}}>
                  <img src="/icons/setterAI/Search.svg" alt="Search Icon" className="w-4 h-4 mr-5"/>
                </span>
                <input 
                  placeholder="Search" 
                  style={styles.headerSearch} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
           </div>
        </header>

        <div style={styles.modelSelectorContainer}>
           <div style={styles.modelSelector}>
             <div 
               style={activeModel === "gemini-3" ? styles.modelActive : styles.modelInactive}
               onClick={() => setActiveModel("gemini-3")}
             >
               <span style={styles.modelIconColor}>✨</span> Gemini 3
             </div>
             <div 
               style={activeModel === "flash" ? styles.modelActive : styles.modelInactive}
               onClick={() => setActiveModel("flash")}
             >
               <span style={styles.modelIconFade}>⚡</span> Flash
             </div>
           </div>
        </div>

        <div style={styles.chatScrollArea}>
          {displayedMessages.map((msg) => (
            <div key={msg.id} style={styles.messageRow}>
              <div style={styles.avatarColumn}>
                {msg.role === "user" ? (
                   <div style={styles.userAvatar}>👤</div>
                ) : (
                   <div style={styles.aiAvatar}>
                     <span style={{color: 'white', fontWeight: 'bold', fontSize: '14px'}}>#</span>
                   </div>
                )}
              </div>

              <div style={msg.role === "user" ? styles.userMessageCard : styles.aiMessageCard}>
                <div style={styles.messageText}>{msg.text}</div>
              </div>
            </div>
          ))}
          
          {isLoading && (
             <div style={styles.messageRow}>
               <div style={styles.avatarColumn}>
                 <div style={styles.aiAvatar}>#</div>
               </div>
               <div style={{...styles.aiMessageCard, color: '#888'}}>
                 Thinking...
               </div>
             </div>
          )}
          <div ref={messagesEndRef} style={{ height: "40px" }} />
        </div>

        <div style={styles.inputContainer}>
          <button 
            style={{
              ...styles.regenerateButton, 
              opacity: activeSession.messages.length < 2 || isLoading ? 0.5 : 1,
              pointerEvents: activeSession.messages.length < 2 || isLoading ? 'none' : 'auto'
            }}
            onClick={handleRegenerate}
          >
            🔄 Regenerate response
          </button>
          
          <div style={styles.inputRow}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
              placeholder="Send a message"
              style={styles.textInput}
              disabled={isLoading}
            />
            <button 
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              style={{
                ...styles.submitButton,
                opacity: isLoading || !input.trim() ? 0.7 : 1,
                cursor: isLoading || !input.trim() ? "not-allowed" : "pointer"
              }}
            >
              Submit
            </button>
          </div>
          <p style={styles.disclaimer}>
            Setter AI Copilot — Real-time guidance based on your team's highest-performing conversations.
          </p>
        </div>
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  appContainer: { display: "flex", height: "100vh", width: "100%", backgroundColor: "#FFFFFF", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", overflow: "hidden", color: "#1F2937" },
  sidebar: { width: "280px", backgroundColor: "#FFFFFF", borderRight: "1px solid #F3F4F6", display: "flex", flexDirection: "column", padding: "24px", paddingLeft: "40px", flexShrink: 0 },
  sidebarHeader: { marginBottom: "40px" },
  brandTitle: { fontSize: "20px", fontWeight: "700", margin: "0 0 8px 0", color: "#111827", letterSpacing: "-0.5px" },
  brandSubtitle: { fontSize: "13px", color: "#6B7280", margin: 0, lineHeight: "1.4" },
  sidebarSection: { display: "flex", flexDirection: "column", gap: "12px", flex: 1, overflow: "hidden" },
  sidebarLabel: { fontSize: "13px", fontWeight: "500", color: "#9CA3AF", marginBottom: "8px" },
  newChatButton: { padding: "12px", backgroundColor: "#FFFFFF", border: "1px dashed #E5E7EB", borderRadius: "8px", fontSize: "14px", color: "#4B5563", cursor: "pointer", transition: "all 0.2s", fontWeight: "500", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" },
  historyList: { display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", flex: 1, paddingRight: "5px" },
  historyItem: { padding: "10px 12px", borderRadius: "8px", fontSize: "14px", color: "#4B5563", cursor: "pointer", display: "flex", alignItems: "center", transition: "background 0.2s", overflow: "hidden" },
  historyItemActive: { padding: "10px 12px", backgroundColor: "#F9FAFB", borderRadius: "8px", fontSize: "14px", color: "#111827", cursor: "default", display: "flex", alignItems: "center", fontWeight: "600", overflow: "hidden" },
  historyText: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  mainContent: { flex: 1, display: "flex", flexDirection: "column", position: "relative", backgroundColor: "#FFFFFF" },
  topHeader: { height: "70px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" },
  searchWrapper: { display: "flex", alignItems: "center", backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "8px 12px", width: "240px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" },
  headerSearch: { border: "none", outline: "none", fontSize: "14px", color: "#374151", marginLeft: "8px", width: "100%" },
  notificationWrapper: { position: 'relative', cursor: 'pointer', fontSize: '20px', color: '#9CA3AF' },
  notificationBadge: { position: 'absolute', top: '-5px', right: '-8px', backgroundColor: '#3B82F6', color: 'white', fontSize: '10px', borderRadius: '10px', padding: '2px 5px', fontWeight: 'bold' },
  modelSelectorContainer: { display: "flex", justifyContent: "center", paddingBottom: "10px" },
  modelSelector: { display: "flex", backgroundColor: "#FFFFFF", padding: "4px", borderRadius: "16px", gap: "4px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)", border: "1px solid #F3F4F6" },
  modelActive: { backgroundColor: "#F9FAFB", padding: "8px 20px", borderRadius: "12px", fontSize: "14px", fontWeight: "600", color: "#111827", display: "flex", alignItems: "center", cursor: "default", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  modelInactive: { padding: "8px 20px", borderRadius: "12px", fontSize: "14px", color: "#9CA3AF", display: "flex", alignItems: "center", cursor: "pointer", transition: "color 0.2s" },
  modelIconColor: { marginRight: "8px", background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  modelIconFade: { marginRight: "8px", opacity: 0.5 },
  chatScrollArea: { flex: 1, overflowY: "auto", padding: "20px 0 160px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "30px" },
  messageRow: { display: "flex", gap: "16px", alignItems: "flex-start", width: "100%", maxWidth: "800px", padding: "0 20px" },
  avatarColumn: { width: "40px", flexShrink: 0, display: "flex", justifyContent: "center" },
  userAvatar: { width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#6B7280" },
  aiAvatar: { width: "28px", height: "28px", borderRadius: "6px", background: "linear-gradient(135deg, #C084FC 0%, #8B5CF6 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(139, 92, 246, 0.3)" },
  userMessageCard: { backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "16px 20px", fontSize: "15px", color: "#111827", lineHeight: "1.5", maxWidth: "100%", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.02)" },
  aiMessageCard: { backgroundColor: "#FFFFFF", borderRadius: "12px", padding: "24px 30px", fontSize: "15px", color: "#374151", lineHeight: "1.7", maxWidth: "100%", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)", border: "1px solid #F9FAFB" },
  messageText: { whiteSpace: "pre-wrap" },
  inputContainer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", borderTop: "1px solid transparent" },
  regenerateButton: { backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "30px", padding: "8px 24px", fontSize: "13px", color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: "500", boxShadow: "0 2px 5px rgba(0,0,0,0.03)", transition: "all 0.2s" },
  inputRow: { width: "100%", maxWidth: "800px", display: "flex", gap: "12px", alignItems: "center" },
  textInput: { flex: 1, padding: "16px 24px", borderRadius: "16px", border: "1px solid #E5E7EB", fontSize: "15px", outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", transition: "border 0.2s", backgroundColor: "#FFFFFF" },
  submitButton: { background: "linear-gradient(90deg, #C084FC 0%, #8B5CF6 100%)", color: "white", border: "none", borderRadius: "16px", padding: "0 32px", height: "52px", fontWeight: "600", fontSize: "15px", cursor: "pointer", boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)", transition: "transform 0.1s" },
  disclaimer: { fontSize: "11px", color: "#9CA3AF", marginTop: "4px" },
};