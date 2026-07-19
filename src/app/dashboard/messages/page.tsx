"use client";

import { useState, useEffect, useRef } from "react";

interface Message { id: string; conversationId: string; senderId: string; receiverId: string; text: string; translatedText?: string; isTranslated: boolean; detectedLanguage?: string; targetLanguage?: string; isRead: boolean; createdAt: string; }
interface Conversation { id: string; lastMessage: Message; unreadCount: number; participants: string[]; }
interface TeamUser { id: string; firstName: string; lastName: string; role: string; }

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/messages").then(r => r.json()).then(d => setConversations(d.conversations || []));
    fetch("/api/drivers").then(r => r.json()).then(d => setTeam(d.users || []));
  }, []);

  useEffect(() => {
    if (selectedConvo) {
      fetch(`/api/messages?conversationId=${selectedConvo}`).then(r => r.json()).then(d => {
        setMessages(d.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      });
    }
  }, [selectedConvo]);

  const send = async () => {
    if (!newMessage.trim()) return;
    const rid = receiverId || (selectedConvo ? conversations.find(c => c.id === selectedConvo)?.participants.find(p => p !== "me") : "");
    await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiverId: rid, text: newMessage, conversationId: selectedConvo }) });
    setNewMessage("");
    if (selectedConvo) {
      fetch(`/api/messages?conversationId=${selectedConvo}`).then(r => r.json()).then(d => {
        setMessages(d.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      });
    }
  };

  const startNewChat = (userId: string) => {
    setReceiverId(userId);
    const convoId = [userId, "me"].sort().join("_");
    setSelectedConvo(convoId);
    setShowNewChat(false);
  };

  const LANG_FLAGS: Record<string, string> = { en: "🇺🇸", es: "🇪🇸", ru: "🇷🇺", fr: "🇫🇷", de: "🇩🇪", zh: "🇨🇳", ja: "🇯🇵", ko: "🇰🇷", ar: "🇸🇦", pt: "🇧🇷" };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Conversation list */}
      <div className="w-[280px] bg-white border border-[#e5edf5] rounded-lg overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-[#e5edf5] flex items-center justify-between">
          <div className="text-[14px] font-semibold">Messages</div>
          <button onClick={() => setShowNewChat(true)} className="text-[12px] text-[#533afd] font-medium">+ New</button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[#e5edf5]">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-[#64748d]">No conversations yet</div>
          ) : conversations.map(c => (
            <div key={c.id} onClick={() => setSelectedConvo(c.id)}
              className={`px-4 py-3 cursor-pointer hover:bg-[#f6f9fc] ${selectedConvo === c.id ? "bg-[#533afd]/[0.04] border-l-2 border-[#533afd]" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-medium truncate">{c.participants.join(", ")}</span>
                {c.unreadCount > 0 && <span className="bg-[#533afd] text-white text-[10px] px-1.5 py-0.5 rounded-full">{c.unreadCount}</span>}
              </div>
              <div className="text-[12px] text-[#64748d] truncate">{c.lastMessage?.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white border border-[#e5edf5] rounded-lg overflow-hidden flex flex-col">
        {!selectedConvo ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[48px] mb-3 opacity-20">💬</div>
              <div className="text-[15px] font-medium text-[#64748d]">Select a conversation</div>
              <div className="text-[13px] text-[#94a3b8] mt-1">Or start a new one</div>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.senderId === "me" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-lg px-4 py-2.5 ${m.senderId === "me" ? "bg-[#533afd] text-white" : "bg-[#f6f9fc] border border-[#e5edf5]"}`}>
                    <div className="text-[14px]">{m.text}</div>
                    {m.isTranslated && m.translatedText && (
                      <div className="mt-2 pt-2 border-t border-white/20 text-[12px] opacity-80">
                        <span className="mr-1">{LANG_FLAGS[m.detectedLanguage || ""] || "🌐"}</span>
                        {m.translatedText}
                      </div>
                    )}
                    <div className={`text-[10px] mt-1 ${m.senderId === "me" ? "text-white/60" : "text-[#94a3b8]"}`}>
                      {new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      {m.isTranslated && <span className="ml-1">🌐 translated</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#e5edf5] p-4 flex gap-3">
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Type a message... (auto-translates to recipient's language)"
                className="flex-1 px-4 py-2.5 border border-[#e5edf5] rounded-lg text-[14px] outline-none focus:border-[#533afd]" />
              <button onClick={send} className="bg-[#533afd] text-white px-5 py-2.5 rounded-lg text-[14px] font-medium">Send</button>
            </div>
          </>
        )}
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowNewChat(false)}>
          <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-semibold mb-4">Start New Conversation</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {team.map(u => (
                <div key={u.id} onClick={() => startNewChat(u.id)} className="p-3 border border-[#e5edf5] rounded-lg cursor-pointer hover:border-[#b9b9f9] hover:bg-[#f6f9fc]">
                  <div className="text-[13px] font-medium">{u.firstName} {u.lastName}</div>
                  <div className="text-[11px] text-[#64748d] capitalize">{u.role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
