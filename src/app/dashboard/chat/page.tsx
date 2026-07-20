'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'customer' | 'dispatcher';
  text: string;
  timestamp: Date;
  read: boolean;
}

interface Conversation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  customerAvatar: string;
  lastMessage: string;
  lastTimestamp: Date;
  unreadCount: number;
  pastJobs: { id: string; date: string; type: string; status: string }[];
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    customerName: 'Mike Johnson',
    customerPhone: '(555) 234-8901',
    customerLocation: '1420 Elm St, Austin, TX 78701',
    customerAvatar: 'MJ',
    lastMessage: 'My car broke down on I-35, need a tow ASAP!',
    lastTimestamp: new Date(Date.now() - 2 * 60 * 1000),
    unreadCount: 3,
    pastJobs: [
      { id: 'JOB-1042', date: '2026-06-12', type: 'Flatbed Tow', status: 'Completed' },
      { id: 'JOB-987', date: '2026-04-03', type: 'Jump Start', status: 'Completed' },
    ],
  },
  {
    id: 'conv-2',
    customerName: 'Sarah Williams',
    customerPhone: '(555) 678-1234',
    customerLocation: '890 Congress Ave, Austin, TX 78701',
    customerAvatar: 'SW',
    lastMessage: 'How much for a long-distance tow to San Antonio?',
    lastTimestamp: new Date(Date.now() - 15 * 60 * 1000),
    unreadCount: 1,
    pastJobs: [
      { id: 'JOB-1105', date: '2026-07-01', type: 'Lockout Service', status: 'Completed' },
    ],
  },
  {
    id: 'conv-3',
    customerName: 'David Chen',
    customerPhone: '(555) 901-4567',
    customerLocation: '3200 S Lamar Blvd, Austin, TX 78704',
    customerAvatar: 'DC',
    lastMessage: 'Thanks, the driver was great!',
    lastTimestamp: new Date(Date.now() - 45 * 60 * 1000),
    unreadCount: 0,
    pastJobs: [
      { id: 'JOB-1200', date: '2026-07-18', type: 'Flatbed Tow', status: 'Completed' },
      { id: 'JOB-1188', date: '2026-07-10', type: 'Tire Change', status: 'Completed' },
      { id: 'JOB-1145', date: '2026-06-22', type: 'Winch Out', status: 'Completed' },
    ],
  },
  {
    id: 'conv-4',
    customerName: 'Emily Rodriguez',
    customerPhone: '(555) 345-6789',
    customerLocation: '1100 E Riverside Dr, Austin, TX 78704',
    customerAvatar: 'ER',
    lastMessage: 'I need a quote for towing my RV',
    lastTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    unreadCount: 0,
    pastJobs: [],
  },
  {
    id: 'conv-5',
    customerName: 'James Parker',
    customerPhone: '(555) 567-8901',
    customerLocation: '4500 Burnet Rd, Austin, TX 78756',
    customerAvatar: 'JP',
    lastMessage: 'My motorcycle needs to be picked up from the shop',
    lastTimestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    unreadCount: 2,
    pastJobs: [
      { id: 'JOB-1190', date: '2026-07-12', type: 'Motorcycle Tow', status: 'Completed' },
    ],
  },
];

const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  'conv-1': [
    { id: 'm1', conversationId: 'conv-1', sender: 'customer', text: 'Hi, my car just broke down on I-35 near exit 234', timestamp: new Date(Date.now() - 10 * 60 * 1000), read: true },
    { id: 'm2', conversationId: 'conv-1', sender: 'dispatcher', text: 'I\'m sorry to hear that! What type of vehicle are you driving?', timestamp: new Date(Date.now() - 9 * 60 * 1000), read: true },
    { id: 'm3', conversationId: 'conv-1', sender: 'customer', text: 'It\'s a 2022 Honda Accord, silver color', timestamp: new Date(Date.now() - 8 * 60 * 1000), read: true },
    { id: 'm4', conversationId: 'conv-1', sender: 'dispatcher', text: 'Got it. Are you in a safe location? Is the car on the shoulder?', timestamp: new Date(Date.now() - 7 * 60 * 1000), read: true },
    { id: 'm5', conversationId: 'conv-1', sender: 'customer', text: 'Yes, I pulled over to the right shoulder', timestamp: new Date(Date.now() - 5 * 60 * 1000), read: true },
    { id: 'm6', conversationId: 'conv-1', sender: 'dispatcher', text: 'Perfect. We have a flatbed truck available. A driver can be there in approximately 20 minutes.', timestamp: new Date(Date.now() - 4 * 60 * 1000), read: true },
    { id: 'm7', conversationId: 'conv-1', sender: 'customer', text: 'That would be great, thank you!', timestamp: new Date(Date.now() - 3 * 60 * 1000), read: false },
    { id: 'm8', conversationId: 'conv-1', sender: 'customer', text: 'How much will it cost?', timestamp: new Date(Date.now() - 2.5 * 60 * 1000), read: false },
    { id: 'm9', conversationId: 'conv-1', sender: 'customer', text: 'My car broke down on I-35, need a tow ASAP!', timestamp: new Date(Date.now() - 2 * 60 * 1000), read: false },
  ],
  'conv-2': [
    { id: 'm10', conversationId: 'conv-2', sender: 'customer', text: 'Hello, I need some information about your towing services', timestamp: new Date(Date.now() - 30 * 60 * 1000), read: true },
    { id: 'm11', conversationId: 'conv-2', sender: 'dispatcher', text: 'Hi Sarah! Of course, I\'d be happy to help. What do you need?', timestamp: new Date(Date.now() - 28 * 60 * 1000), read: true },
    { id: 'm12', conversationId: 'conv-2', sender: 'customer', text: 'How much for a long-distance tow to San Antonio?', timestamp: new Date(Date.now() - 15 * 60 * 1000), read: false },
  ],
  'conv-3': [
    { id: 'm13', conversationId: 'conv-3', sender: 'customer', text: 'Just wanted to say the tow was handled perfectly', timestamp: new Date(Date.now() - 50 * 60 * 1000), read: true },
    { id: 'm14', conversationId: 'conv-3', sender: 'dispatcher', text: 'That\'s wonderful to hear, David! We appreciate your business.', timestamp: new Date(Date.now() - 48 * 60 * 1000), read: true },
    { id: 'm15', conversationId: 'conv-3', sender: 'customer', text: 'Thanks, the driver was great!', timestamp: new Date(Date.now() - 45 * 60 * 1000), read: true },
  ],
  'conv-4': [
    { id: 'm16', conversationId: 'conv-4', sender: 'customer', text: 'Hi there, do you handle RV towing?', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), read: true },
    { id: 'm17', conversationId: 'conv-4', sender: 'dispatcher', text: 'Yes, we do! We have heavy-duty flatbed trucks for RVs. What are the details?', timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000), read: true },
    { id: 'm18', conversationId: 'conv-4', sender: 'customer', text: 'I need a quote for towing my RV', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), read: true },
  ],
  'conv-5': [
    { id: 'm19', conversationId: 'conv-5', sender: 'customer', text: 'Hey, I need my motorcycle picked up', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), read: true },
    { id: 'm20', conversationId: 'conv-5', sender: 'dispatcher', text: 'Sure! Where is it located?', timestamp: new Date(Date.now() - 5.5 * 60 * 60 * 1000), read: true },
    { id: 'm21', conversationId: 'conv-5', sender: 'customer', text: 'My motorcycle needs to be picked up from the shop', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), read: false },
  ],
};

const QUICK_REPLIES = [
  "We'll be there in 20 minutes!",
  'Your driver is on the way.',
  'The estimated cost is $85 for the first 5 miles.',
  'We accept cash, card, and digital payments.',
  'Can you share your exact location or a pin?',
  'What type of vehicle do you need towed?',
  'Our service area covers the greater Austin metro.',
  'Thank you for choosing TowHub! Stay safe.',
];

const AUTO_RESPONSE = "Thanks for reaching out! We're currently offline but will get back to you within 30 minutes. For emergencies, call (555) 000-TOWS.";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ------------------------------------------------------------------ */
/*  SVG Icons (inline, no external libs)                               */
/* ------------------------------------------------------------------ */

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconZap = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconPhone = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const IconMapPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

const IconBriefcase = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
  </svg>
);

const IconMessageSquare = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconCheckCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 6 9 17 4 12" /><polyline points="22 6 13 17" />
  </svg>
);

const IconPaperclip = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
);

const IconSmile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(MOCK_MESSAGES);
  const [activeConvId, setActiveConvId] = useState<string>('conv-1');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [typingConvs, setTypingConvs] = useState<Set<string>>(new Set());
  const [showCustomerPanel, setShowCustomerPanel] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConvId);
  const activeMessages = messages[activeConvId] || [];
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  /* ---- Auto-scroll ---- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeConvId]);

  /* ---- Simulate typing indicator for demo ---- */
  const simulateTyping = useCallback(
    (convId: string) => {
      setTypingConvs((prev) => new Set(prev).add(convId));
      setTimeout(() => {
        setTypingConvs((prev) => {
          const next = new Set(prev);
          next.delete(convId);
          return next;
        });
      }, 3000);
    },
    [],
  );

  /* ---- Send message ---- */
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !activeConvId) return;

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        conversationId: activeConvId,
        sender: 'dispatcher',
        text: text.trim(),
        timestamp: new Date(),
        read: true,
      };

      setMessages((prev) => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] || []), newMsg],
      }));

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, lastMessage: text.trim(), lastTimestamp: new Date() }
            : c,
        ),
      );

      setInputText('');
      setShowQuickReplies(false);

      // Simulate customer typing back after a delay
      setTimeout(() => {
        simulateTyping(activeConvId);
        setTimeout(() => {
          const replies = [
            'Okay, thank you!',
            'Got it, I\'ll wait here.',
            'Sounds good, how do I pay?',
            'Perfect, appreciate the quick response!',
            'Can you give me a call?',
          ];
          const reply: ChatMessage = {
            id: `msg-${Date.now()}`,
            conversationId: activeConvId,
            sender: 'customer',
            text: replies[Math.floor(Math.random() * replies.length)],
            timestamp: new Date(),
            read: false,
          };
          setMessages((prev) => ({
            ...prev,
            [activeConvId]: [...(prev[activeConvId] || []), reply],
          }));
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConvId
                ? { ...c, lastMessage: reply.text, lastTimestamp: new Date(), unreadCount: c.unreadCount + 1 }
                : c,
            ),
          );
        }, 3500);
      }, 1500);
    },
    [activeConvId, simulateTyping],
  );

  /* ---- Select conversation ---- */
  const selectConversation = (convId: string) => {
    setActiveConvId(convId);
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)),
    );
    // Mark messages as read
    setMessages((prev) => ({
      ...prev,
      [convId]: (prev[convId] || []).map((m) => ({ ...m, read: true })),
    }));
    inputRef.current?.focus();
  };

  /* ---- Filtered conversations ---- */
  const filteredConversations = conversations
    .filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.customerName.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        c.customerPhone.includes(q)
      );
    })
    .sort((a, b) => b.lastTimestamp.getTime() - a.lastTimestamp.getTime());

  /* ---- Toggle online/offline ---- */
  const toggleOnline = () => {
    setIsOnline((prev) => {
      const next = !prev;
      if (!next) {
        // Send auto-response to most recent active conversation
        const autoMsg: ChatMessage = {
          id: `auto-${Date.now()}`,
          conversationId: activeConvId,
          sender: 'dispatcher',
          text: AUTO_RESPONSE,
          timestamp: new Date(),
          read: true,
        };
        setMessages((prevMsgs) => ({
          ...prevMsgs,
          [activeConvId]: [...(prevMsgs[activeConvId] || []), autoMsg],
        }));
      }
      return next;
    });
  };

  /* ---- Handle key press ---- */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f6f9fc' }}>
      {/* ---- Header ---- */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: '#0a2540',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #635bff, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconMessageSquare />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
              Live Chat
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Unread badge */}
          {totalUnread > 0 && (
            <div
              style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                lineHeight: '18px',
              }}
            >
              {totalUnread}
            </div>
          )}

          {/* Online / Offline toggle */}
          <button
            onClick={toggleOnline}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: isOnline ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              color: isOnline ? '#34d399' : '#f87171',
              transition: 'all 0.2s',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isOnline ? '#34d399' : '#f87171',
                boxShadow: isOnline ? '0 0 6px #34d399' : '0 0 6px #f87171',
              }}
            />
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>
      </header>

      {/* ---- Main Content ---- */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ============== LEFT PANEL: Conversation List ============== */}
        <aside
          style={{
            width: 320,
            minWidth: 320,
            background: '#fff',
            borderRight: '1px solid #e3e8ee',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e3e8ee' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: '#f6f9fc',
                borderRadius: 8,
                border: '1px solid #e3e8ee',
              }}
            >
              <span style={{ color: '#8898aa' }}>
                <IconSearch />
              </span>
              <input
                type="text"
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  color: '#0a2540',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    width: '100%',
                    padding: '14px 16px',
                    border: 'none',
                    borderBottom: '1px solid #f0f3f7',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: isActive ? '#f0f5ff' : conv.unreadCount > 0 ? '#fafbff' : '#fff',
                    borderLeft: isActive ? '3px solid #635bff' : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: isActive
                        ? 'linear-gradient(135deg, #635bff, #7c3aed)'
                        : conv.unreadCount > 0
                          ? '#635bff'
                          : '#e3e8ee',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      color: isActive || conv.unreadCount > 0 ? '#fff' : '#525f7f',
                      flexShrink: 0,
                    }}
                  >
                    {conv.customerAvatar}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: conv.unreadCount > 0 ? 700 : 500,
                          color: '#0a2540',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {conv.customerName}
                      </span>
                      <span style={{ fontSize: 11, color: '#8898aa', flexShrink: 0, marginLeft: 8 }}>
                        {timeAgo(conv.lastTimestamp)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: 13,
                          color: conv.unreadCount > 0 ? '#0a2540' : '#8898aa',
                          fontWeight: conv.unreadCount > 0 ? 500 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 200,
                        }}
                      >
                        {conv.lastMessage}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span
                          style={{
                            background: '#635bff',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 700,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginLeft: 8,
                          }}
                        >
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredConversations.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: '#8898aa', fontSize: 13 }}>
                No conversations found
              </div>
            )}
          </div>
        </aside>

        {/* ============== CENTER: Chat Messages ============== */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f6f9fc' }}>
          {/* Chat header */}
          {activeConversation && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 24px',
                background: '#fff',
                borderBottom: '1px solid #e3e8ee',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #635bff, #7c3aed)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {activeConversation.customerAvatar}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0a2540' }}>
                    {activeConversation.customerName}
                  </div>
                  <div style={{ fontSize: 12, color: '#8898aa', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#34d399',
                        display: 'inline-block',
                      }}
                    />
                    Active now
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCustomerPanel((p) => !p)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #e3e8ee',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#525f7f',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <IconUser />
                {showCustomerPanel ? 'Hide' : 'Show'} Info
              </button>
            </div>
          )}

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 16px' }}>
            {/* Date separator */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span
                style={{
                  fontSize: 12,
                  color: '#8898aa',
                  background: '#e3e8ee',
                  padding: '4px 14px',
                  borderRadius: 12,
                  fontWeight: 500,
                }}
              >
                Today
              </span>
            </div>

            {activeMessages.map((msg, i) => {
              const isDispatcher = msg.sender === 'dispatcher';
              const showAvatar =
                i === 0 || activeMessages[i - 1].sender !== msg.sender;
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: isDispatcher ? 'flex-end' : 'flex-start',
                    marginBottom: showAvatar ? 16 : 4,
                  }}
                >
                  {!isDispatcher && (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: '#e3e8ee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#525f7f',
                        marginRight: 8,
                        marginTop: 2,
                        flexShrink: 0,
                        visibility: showAvatar ? 'visible' : 'hidden',
                      }}
                    >
                      {activeConversation?.customerAvatar}
                    </div>
                  )}

                  <div style={{ maxWidth: '65%' }}>
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: isDispatcher
                          ? '16px 16px 4px 16px'
                          : '16px 16px 16px 4px',
                        background: isDispatcher ? '#635bff' : '#fff',
                        color: isDispatcher ? '#fff' : '#0a2540',
                        fontSize: 14,
                        lineHeight: 1.5,
                        boxShadow: isDispatcher ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                        border: isDispatcher ? 'none' : '1px solid #e3e8ee',
                      }}
                    >
                      {msg.text}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isDispatcher ? 'flex-end' : 'flex-start',
                        gap: 4,
                        marginTop: 4,
                        paddingLeft: isDispatcher ? 0 : 0,
                      }}
                    >
                      <span style={{ fontSize: 11, color: '#8898aa' }}>{formatTime(msg.timestamp)}</span>
                      {isDispatcher && (
                        <span style={{ color: msg.read ? '#635bff' : '#8898aa' }}>
                          {msg.read ? <IconCheckCheck /> : <IconCheck />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingConvs.has(activeConvId) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#e3e8ee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#525f7f',
                  }}
                >
                  {activeConversation?.customerAvatar}
                </div>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #e3e8ee',
                    borderRadius: '16px 16px 16px 4px',
                    padding: '10px 16px',
                    display: 'flex',
                    gap: 4,
                  }}
                >
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#8898aa',
                        animation: `typingBounce 1.4s infinite`,
                        animationDelay: `${dot * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          {showQuickReplies && (
            <div
              style={{
                padding: '8px 24px',
                background: '#fff',
                borderTop: '1px solid #e3e8ee',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                maxHeight: 120,
                overflowY: 'auto',
              }}
            >
              {QUICK_REPLIES.map((qr, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(qr)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 16,
                    border: '1px solid #e3e8ee',
                    background: '#f6f9fc',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#525f7f',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#635bff';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = '#635bff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f6f9fc';
                    e.currentTarget.style.color = '#525f7f';
                    e.currentTarget.style.borderColor = '#e3e8ee';
                  }}
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div
            style={{
              padding: '12px 24px',
              background: '#fff',
              borderTop: '1px solid #e3e8ee',
              flexShrink: 0,
            }}
          >
            {!isOnline && (
              <div
                style={{
                  marginBottom: 8,
                  padding: '6px 12px',
                  background: '#fef3c7',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontWeight: 600 }}>Offline mode</span>
                — Auto-response will be sent to new messages
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setShowQuickReplies((p) => !p)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: showQuickReplies ? '1px solid #635bff' : '1px solid #e3e8ee',
                  background: showQuickReplies ? '#f0f0ff' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: showQuickReplies ? '#635bff' : '#525f7f',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
                title="Quick replies"
              >
                <IconZap />
              </button>
              <button
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid #e3e8ee',
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#525f7f',
                  flexShrink: 0,
                }}
                title="Attach file"
              >
                <IconPaperclip />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isOnline ? 'Type a message…' : "You're offline — messages will auto-respond…"}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid #e3e8ee',
                  outline: 'none',
                  fontSize: 14,
                  color: '#0a2540',
                  background: '#f6f9fc',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#635bff')}
                onBlur={(e) => (e.target.style.borderColor = '#e3e8ee')}
              />
              <button
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid #e3e8ee',
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#525f7f',
                  flexShrink: 0,
                }}
                title="Emoji"
              >
                <IconSmile />
              </button>
              <button
                onClick={() => sendMessage(inputText)}
                disabled={!inputText.trim()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: 'none',
                  background: inputText.trim() ? '#635bff' : '#e3e8ee',
                  cursor: inputText.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: inputText.trim() ? '#fff' : '#8898aa',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                <IconSend />
              </button>
            </div>
          </div>
        </main>

        {/* ============== RIGHT PANEL: Customer Info ============== */}
        {showCustomerPanel && activeConversation && (
          <aside
            style={{
              width: 280,
              minWidth: 280,
              background: '#fff',
              borderLeft: '1px solid #e3e8ee',
              overflowY: 'auto',
              padding: 24,
            }}
          >
            {/* Customer profile */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #635bff, #7c3aed)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#fff',
                  margin: '0 auto 12px',
                }}
              >
                {activeConversation.customerAvatar}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0a2540', marginBottom: 4 }}>
                {activeConversation.customerName}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: '#10b981',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#10b981',
                  }}
                />
                Online
              </div>
            </div>

            {/* Contact info */}
            <div style={{ marginBottom: 24 }}>
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#8898aa',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 12,
                }}
              >
                Contact Info
              </h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: '#f6f9fc',
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ color: '#635bff' }}>
                  <IconPhone />
                </span>
                <span style={{ fontSize: 13, color: '#0a2540', fontWeight: 500 }}>
                  {activeConversation.customerPhone}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  background: '#f6f9fc',
                  borderRadius: 8,
                }}
              >
                <span style={{ color: '#635bff', marginTop: 1 }}>
                  <IconMapPin />
                </span>
                <span style={{ fontSize: 13, color: '#0a2540', fontWeight: 500, lineHeight: 1.4 }}>
                  {activeConversation.customerLocation}
                </span>
              </div>
            </div>

            {/* Past jobs */}
            <div>
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#8898aa',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 12,
                }}
              >
                Service History
              </h3>
              {activeConversation.pastJobs.length > 0 ? (
                activeConversation.pastJobs.map((job) => (
                  <div
                    key={job.id}
                    style={{
                      padding: '10px 12px',
                      background: '#f6f9fc',
                      borderRadius: 8,
                      marginBottom: 8,
                      border: '1px solid #e3e8ee',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#635bff' }}>{job.id}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#10b981',
                          background: '#ecfdf5',
                          padding: '2px 8px',
                          borderRadius: 10,
                        }}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#0a2540', fontWeight: 500, marginBottom: 2 }}>
                      {job.type}
                    </div>
                    <div style={{ fontSize: 12, color: '#8898aa' }}>{job.date}</div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: '16px 12px',
                    background: '#f6f9fc',
                    borderRadius: 8,
                    textAlign: 'center',
                    fontSize: 13,
                    color: '#8898aa',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <IconBriefcase />
                  No service history
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Typing animation keyframes */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
