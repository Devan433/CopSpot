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

// Generate a random username for the session
const ADJECTIVES = ["Fast", "Silent", "Neon", "Cyber", "Rogue", "Shadow", "Night", "Drift", "Ghost", "Turbo"];
const NOUNS = ["Falcon", "Owl", "Fox", "Wolf", "Runner", "Rider", "Pilot", "Hawk", "Viper", "Phantom"];
const getRandomUsername = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [username] = useState(getRandomUsername());
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const filter = new Filter();

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
        setMessages(data);
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
    if (filter.isProfane(inputText)) {
      alert("Please keep the chat respectful. Profane language is not allowed.");
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
      alert("Failed to send message.");
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
        className="absolute top-6 left-6 z-20 w-12 h-12 bg-[var(--color-rp-bg)] border-[4px] border-[var(--color-rp-border)] flex items-center justify-center hover:bg-[var(--color-rp-border)] hover:text-black transition-colors shadow-[0_4px_0_0_#000]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        {/* Unread dot indicator could go here if we tracked last read */}
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="absolute top-6 left-6 bottom-6 w-80 bg-[var(--color-rp-bg)] border-[4px] border-[var(--color-rp-border)] z-30 flex flex-col shadow-[8px_8px_0_0_#000] overflow-hidden">
          
          {/* Header */}
          <div className="p-3 border-b-[4px] border-[var(--color-rp-border)] flex justify-between items-center bg-black/20">
            <h2 className="font-bold text-lg" style={{ fontFamily: 'var(--font-pixel)' }}>LIVE CHAT</h2>
            <button onClick={() => setIsOpen(false)} className="hover:text-red-500 font-bold px-2">
              X
            </button>
          </div>

          {/* Sticky Notice */}
          <div className="bg-yellow-500/20 border-b-2 border-yellow-500/50 p-2 text-xs text-yellow-100 text-center">
            🕒 Messages automatically disappear after 3 hours to keep reports real-time.
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-2">
                <span className="text-2xl">🚦</span>
                <p className="text-sm">No reports in the last 3 hours. The streets are clear!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.username === username ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] opacity-70 mb-1">{msg.username}</span>
                  <div className={`px-3 py-2 text-sm border-2 ${msg.username === username ? 'bg-[var(--color-rp-border)] text-black border-black' : 'bg-black/40 border-[var(--color-rp-border)]'}`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] opacity-50 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-3 border-t-[4px] border-[var(--color-rp-border)] flex gap-2 bg-black/20">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Report activity..."
              maxLength={100}
              className="flex-1 bg-black/50 border-2 border-[var(--color-rp-border)] px-2 py-1 text-sm focus:outline-none focus:border-white"
            />
            <button
              type="submit"
              disabled={isSending || cooldown > 0 || !inputText.trim()}
              className="bg-[var(--color-rp-border)] text-black px-3 py-1 font-bold disabled:opacity-50 border-2 border-transparent focus:border-white"
            >
              {cooldown > 0 ? cooldown : 'SEND'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
