"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Fetch initial messages and set up subscription
  useEffect(() => {
    const fetchMessages = async () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .gt('created_at', threeHoursAgo)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error("Error fetching messages:", error);
      } else if (data) {
        setMessages(data as ChatMessage[]);
      }
    };

    fetchMessages();

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

  // Load Turnstile script once
  useEffect(() => {
    if (!siteKey) return;
    if (document.querySelector('script[src*="turnstile"]')) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    document.head.appendChild(script);
  }, [siteKey]);

  // Render Turnstile widget when chat opens
  const renderWidget = useCallback(() => {
    if (!siteKey || !turnstileRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: siteKey,
      theme: 'dark',
      size: 'invisible',
      callback: (token: string) => { setTurnstileToken(token); },
      'error-callback': () => { setTurnstileToken(null); },
    });
  }, [siteKey]);

  useEffect(() => {
    if (!isOpen || !siteKey) return;
    const interval = setInterval(() => {
      if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
        renderWidget();
        clearInterval(interval);
      }
    }, 200);
    return () => {
      clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [isOpen, siteKey, renderWidget]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || cooldown > 0 || isSending) return;
    if (!turnstileToken && siteKey) return; // Wait for Turnstile token

    // Client-side profanity check for instant UX feedback (server validates too)
    if (profanityFilter.isProfane(inputText)) {
      showToast?.("Please keep the chat respectful. Profane language is not allowed.", "warning");
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText.trim(), username, turnstileToken: turnstileToken || undefined }),
      });

      // Reset Turnstile for next message (tokens are single-use)
      if (widgetIdRef.current && window.turnstile) {
        setTurnstileToken(null);
        window.turnstile.reset(widgetIdRef.current);
      }

      if (res.status === 429) {
        const data = await res.json();
        showToast?.(data.error || "Too many messages. Please slow down.", "warning");
        setIsSending(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        showToast?.(data.error || "Failed to send message.", "error");
        setIsSending(false);
        return;
      }

      setInputText("");
      setCooldown(3);
    } catch (err) {
      console.error("Error sending message:", err);
      showToast?.("Failed to send message.", "error");
    }

    setIsSending(false);
  };

  return (
    <>
      {/* Toggle Button — round white FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        className="btn-fab"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="fixed inset-0 sm:absolute sm:inset-auto sm:bottom-16 sm:right-0 sm:w-80 z-30 flex flex-col overflow-hidden">
          <div className="flex-1 sm:flex-none sm:h-[420px] bg-black border border-white/20 flex flex-col sm:rounded-2xl rounded-none">
          
            {/* Header */}
            <div className="p-4 pb-3 flex justify-between items-center border-b border-white/10">
              <h2 className="font-bold text-base text-white">
                Live Chat
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center transition-colors rounded-full hover:bg-white/10 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Sticky Notice */}
            <div className="text-center py-1.5 text-[10px] text-gray-400 border-b border-white/5 flex items-center justify-center gap-1">
              Messages auto-expire after 3 hours
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <p className="text-sm text-gray-400">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.username === username ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-gray-400 mb-1">{msg.username}</span>
                    <div className={`px-3 py-2 text-sm rounded-2xl max-w-[80%] ${msg.username === username ? 'bg-[#EF4444] text-white rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm'}`}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1 opacity-60">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div ref={turnstileRef} className="overflow-hidden h-0" />
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                maxLength={100}
                className="flex-1 bg-white/5 border border-white/10 px-3 py-2.5 text-sm rounded-full focus:outline-none focus:border-white/30 transition-colors min-h-[44px] text-white placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={isSending || cooldown > 0 || !inputText.trim() || (!turnstileToken && !!siteKey)}
                className="bg-[#EF4444] text-white w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-opacity shrink-0 self-center"
              >
                {cooldown > 0 ? (
                  <span className="text-xs font-bold">{cooldown}</span>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
