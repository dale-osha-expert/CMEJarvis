"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatContextValue {
  messages: ChatMessage[];
  conversationId: string | undefined;
  loading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearConversation: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Good morning. I'm Jarvis — your CertifyMe ops assistant. I can pull analytics, check support tickets, review ad performance, or do research. What do you need?",
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, conversationId }),
        });
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        setConversationId(data.conversationId);
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, something went wrong. Please try again." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, conversationId]
  );

  const clearConversation = useCallback(() => {
    setMessages([WELCOME]);
    setConversationId(undefined);
  }, []);

  return (
    <ChatContext.Provider value={{ messages, conversationId, loading, sendMessage, clearConversation }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
