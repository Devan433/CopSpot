"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Filter } from "bad-words";

// Define the Message type
export type ChatMessage = {
  id: string;
  text: string;
  username: string;
  created_at: string;
};

// Instantiate profanity filter once outside the component
const profanityFilter = new Filter();

// Generate a random username for the session, persisted to localStorage
const ADJECTIVES = ["Fast", "Silent", "Neon", "Cyber", "Rogue", "Shadow", "Night", "Drift", "Ghost", "Turbo"];
const NOUNS = ["Falcon", "Owl", "Fox", "Wolf", "Runner", "Rider", "Pilot", "Hawk", "Viper", "Phantom"];
const getRandomUsername = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
};

const getOrCreateUsername = (): string => {
  if (typeof window === "undefined") return getRandomUsername();
  const stored = localStorage.getItem("copspot_username");
  if (stored) return stored;
  const newName = getRandomUsername();
  localStorage.setItem("copspot_username", newName);
  return newName;
};

export default function ChatWidget({ showToast }: { showToast?: (msg: string, type: "success" | "error" | "warning") => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [username] = useState(getOrCreateUsername);
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages and set up subscription
  useEffect(() => {
    const fetchMessages = async () => {
      // Calculate 3 hours ago
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .gt('created_at', threeHoursAgo) // Only fetch messages from last 3 hours
        .order('created_at', { ascending: true }); // Oldest to newest
        
      if (error) {
        console.error("Error fetching messages:", error);
      } else if (data) {
        setMessages(data as ChatMessage[]);
      }
    };

    fetchMessages();

    // Subscribe to new real-time messages
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Handle cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || cooldown > 0 || isSending) return;

    // Check for bad words
    if (profanityFilter.isProfane(inputText)) {
      showToast?.("Please keep the chat respectful. Profane language is not allowed.", "warning");
      return;
    }

    setIsSending(true);

    const { error } = await supabase.from('messages').insert({
      text: inputText.trim(),
      username: username
    });

    setIsSending(false);

    if (error) {
      console.error("Error sending message:", error);
      showToast?.("Failed to send message.", "error");
    } else {
      setInputText("");
      setCooldown(3); // 3-second cooldown
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        className="btn-icon w-12 h-12 md:w-14 md:h-14 rounded-sm shadow-xl flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="fixed inset-4 sm:absolute sm:inset-auto sm:top-0 sm:left-0 sm:bottom-0 sm:w-80 bg-[var(--color-cs-panel)] border border-[var(--color-cs-border-light)] z-30 flex flex-col shadow-xl overflow-hidden backdrop-blur-sm">
          
          {/* Header */}
          <div className="p-3 border-b border-[var(--color-cs-border)] flex justify-between items-center bg-[var(--color-cs-frame)]">
            <h2 className="font-bold text-sm tracking-widest uppercase flex items-center gap-2 text-[var(--color-cs-text)]">
              <span className="text-[var(--color-cs-text-muted)] font-mono font-normal">CS//</span>
              Live Chat
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="text-[var(--color-cs-text-muted)] hover:text-white bg-[var(--color-cs-base)] hover:bg-[var(--color-cs-border)] border border-[var(--color-cs-border)] w-6 h-6 flex items-center justify-center transition-colors text-xs font-mono"
            >
              ✕
            </button>
          </div>

          {/* Sticky Notice */}
          <div className="text-center p-2 text-[10px] text-[var(--color-cs-text-muted)] border-b border-[var(--color-cs-border)] bg-[var(--color-cs-frame)] flex items-center justify-center gap-1 font-mono tracking-wider">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            AUTO-EXPIRE: 3H
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p className="text-sm">No reports in the last 3 hours. The streets are clear!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.username === username ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-[var(--color-cs-text-muted)] mb-1 font-mono">{msg.username}</span>
                  <div className={`px-3 py-2 text-sm border ${msg.username === username ? 'bg-[var(--color-cs-cyan)] text-[var(--color-cs-base)] border-[var(--color-cs-cyan)] font-medium' : 'bg-[var(--color-cs-frame)] border-[var(--color-cs-border)]'}`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-[var(--color-cs-text-muted)] mt-1 font-mono">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--color-cs-border)] flex gap-2 bg-[var(--color-cs-frame)]">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Report activity..."
              maxLength={100}
              className="flex-1 bg-[var(--color-cs-base)] border border-[var(--color-cs-border-light)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-cs-cyan)] transition-colors min-h-[44px] text-[var(--color-cs-text)] placeholder-[var(--color-cs-text-muted)]"
            />
            <button
              type="submit"
              disabled={isSending || cooldown > 0 || !inputText.trim()}
              className="bg-[var(--color-cs-cyan)] text-[var(--color-cs-base)] px-4 py-2 font-bold text-sm tracking-wider disabled:opacity-40 disabled:cursor-not-allowed border border-transparent focus:border-white min-h-[44px] transition-opacity uppercase"
            >
              {cooldown > 0 ? cooldown : 'Send'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
