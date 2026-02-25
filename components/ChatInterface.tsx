'use client';
// components/ChatInterface.tsx
// ============================================================
// JARVIS Main Interface
// Layout: Sidebar (chat history) + Main (chat) + Panel (tools)
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Menu, X, Zap, Settings } from 'lucide-react';
import { chatMemory, linkMemory, type ChatMessage, type ChatSession } from '@/lib/memory';
import { detectIntentWithRateLimit } from '@/lib/intent-detector';
import { getLinksByCategory, getLinkById, JARVIS_LINKS, AI_CATEGORIES } from '@/lib/links';
import InputBar from './InputBar';
import LinkCard from './LinkCard';
import ChatBubble from './ChatBubble';

export default function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);
  const [highlightedToolIds, setHighlightedToolIds] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load data on mount
  useEffect(() => {
    const allSessions = chatMemory.getAllSessions();
    setSessions(allSessions);
    const activeId = chatMemory.getActiveSessionId();
    if (activeId) {
      const session = chatMemory.getSession(activeId);
      if (session) {
        setActiveSessionId(activeId);
        setMessages(session.messages);
        return;
      }
    }
    // Create first session if none
    if (allSessions.length === 0) {
      handleNewChat();
    } else {
      setActiveSessionId(allSessions[0].id);
      setMessages(allSessions[0].messages);
      chatMemory.setActiveSession(allSessions[0].id);
    }
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  function handleNewChat() {
    const session = chatMemory.createSession();
    setSessions(chatMemory.getAllSessions());
    setActiveSessionId(session.id);
    setMessages([]);
  }

  function handleSelectSession(id: string) {
    const session = chatMemory.getSession(id);
    if (session) {
      chatMemory.setActiveSession(id);
      setActiveSessionId(id);
      setMessages(session.messages);
      setSidebarOpen(false);
    }
  }

  function handleDeleteSession(id: string) {
    chatMemory.deleteSession(id);
    const updated = chatMemory.getAllSessions();
    setSessions(updated);
    if (id === activeSessionId) {
      if (updated.length > 0) {
        handleSelectSession(updated[0].id);
      } else {
        handleNewChat();
      }
    }
  }

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !activeSessionId || isThinking) return;

    // Add user message
    const userMsg = chatMemory.addMessage(activeSessionId, {
      role: 'user',
      content,
      timestamp: Date.now(),
    });
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      // Detect intent
      const intent = await detectIntentWithRateLimit(content);

      // Get top tools for this intent
      const topTools = intent.suggestedToolIds
        .map(id => getLinkById(id))
        .filter(Boolean);

      // Highlight these tools in the panel
      setHighlightedToolIds(intent.suggestedToolIds);
      setSelectedCategory(intent.category);

      // Build JARVIS response
      let responseText = '';
      if (topTools.length > 0) {
        const toolNames = topTools.map(t => `**${t!.name}**`).join(', ');
        responseText = `Got it! For "${content}", the best tools are: ${toolNames}\n\nI've highlighted them in the tools panel →`;
        if (intent.fallbackUsed) {
          responseText += '\n\n_(Using quick match — AI detection unavailable right now)_';
        }
      } else {
        responseText = `I'll help with that! Let me show you the best AI tools for **${intent.category}**.`;
      }

      // Add JARVIS response
      const jarvisMsg = chatMemory.addMessage(activeSessionId, {
        role: 'jarvis',
        content: responseText,
        timestamp: Date.now(),
        intent: intent.intent,
        toolUsed: topTools[0]?.id,
      });
      setMessages(prev => [...prev, jarvisMsg]);
      setSessions(chatMemory.getAllSessions());

      // Auto-open tools panel if closed
      if (!toolsPanelOpen) setToolsPanelOpen(true);

    } catch (error) {
      const errorMsg = chatMemory.addMessage(activeSessionId, {
        role: 'jarvis',
        content: 'Something went wrong. Please try again!',
        timestamp: Date.now(),
      });
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  }, [activeSessionId, isThinking, toolsPanelOpen]);

  // Filter links for the tools panel
  const visibleLinks = (() => {
    const prefs = linkMemory.getAll();
    let links = selectedCategory === 'all'
      ? JARVIS_LINKS
      : getLinksByCategory(selectedCategory);

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      links = links.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.tags.some(t => t.includes(q))
      );
    }

    // Filter hidden
    links = links.filter(l => !prefs[l.id]?.isHidden);

    // Sort: favorites first, then by usage
    return links.sort((a, b) => {
      const aFav = prefs[a.id]?.isFavorite ? 1 : 0;
      const bFav = prefs[b.id]?.isFavorite ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return (prefs[b.id]?.usageCount || 0) - (prefs[a.id]?.usageCount || 0);
    });
  })();

  return (
    <div className="flex h-screen bg-[#080818] overflow-hidden">

      {/* ─── SIDEBAR (Chat History) ─── */}
      <div className={`sidebar w-64 flex-shrink-0 flex flex-col ${sidebarOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="p-4 border-b border-[rgba(255,26,136,0.2)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-[#ff1a88]" />
              <span className="font-bold text-gradient text-lg">JARVIS</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
          <button
            onClick={handleNewChat}
            className="jarvis-btn w-full flex items-center justify-center gap-2 text-sm py-2"
          >
            <Plus size={16} /> New Chat
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <p className="text-center text-gray-500 text-sm mt-8">No chats yet</p>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer mb-1 transition-all
                  ${session.id === activeSessionId
                    ? 'bg-[rgba(255,26,136,0.15)] text-white'
                    : 'text-gray-400 hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                  }`}
              >
                <span className="text-sm truncate flex-1">{session.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 ml-2 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[rgba(255,26,136,0.2)]">
          <p className="text-xs text-gray-500 text-center">
            🔒 All data stays in your browser
          </p>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ─── MAIN CHAT AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,26,136,0.2)] bg-[#10102a]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-bold text-white">JARVIS</h1>
              <p className="text-xs text-gray-500">Your AI Tool Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setToolsPanelOpen(!toolsPanelOpen)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#ff1a88] transition-colors px-3 py-1.5 rounded-lg border border-[rgba(255,26,136,0.2)] hover:border-[rgba(255,26,136,0.4)]"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Tools</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <WelcomeScreen onSuggestion={handleSendMessage} />
          ) : (
            messages.map(msg => (
              <ChatBubble key={msg.id} message={msg} />
            ))
          )}

          {/* Typing indicator */}
          {isThinking && (
            <div className="flex items-center gap-2 message-in">
              <div className="w-8 h-8 rounded-full bg-[rgba(255,26,136,0.2)] flex items-center justify-center">
                <Zap size={14} className="text-[#ff1a88]" />
              </div>
              <div className="jarvis-card px-4 py-3 flex gap-1.5">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <InputBar onSend={handleSendMessage} isDisabled={isThinking} />
      </div>

      {/* ─── TOOLS PANEL ─── */}
      <div className={`
        transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0
        ${toolsPanelOpen ? 'w-80' : 'w-0'}
        border-l border-[rgba(255,26,136,0.2)] bg-[#10102a] flex flex-col
      `}>
        {toolsPanelOpen && (
          <>
            {/* Panel header */}
            <div className="p-3 border-b border-[rgba(255,26,136,0.2)]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm">🛠️ AI Tools</span>
                <button onClick={() => setToolsPanelOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="jarvis-input text-sm py-2"
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 px-3 py-2 overflow-x-auto border-b border-[rgba(255,26,136,0.2)]">
              {AI_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            {/* Links grid */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {visibleLinks.length === 0 ? (
                <p className="text-center text-gray-500 text-sm mt-8">No tools found</p>
              ) : (
                visibleLinks.map(link => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    isHighlighted={highlightedToolIds.includes(link.id)}
                  />
                ))
              )}
            </div>

            {/* Panel footer */}
            <div className="p-3 border-t border-[rgba(255,26,136,0.2)]">
              <p className="text-xs text-gray-500 text-center">
                {visibleLinks.length} tools • All free
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── WELCOME SCREEN ───
function WelcomeScreen({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  const suggestions = [
    { emoji: '🎨', text: 'Create an AI image' },
    { emoji: '🎬', text: 'Make a video from images' },
    { emoji: '✍️', text: 'Write a blog post' },
    { emoji: '💻', text: 'Help me with code' },
    { emoji: '🎵', text: 'Generate music' },
    { emoji: '🧊', text: 'Create a 3D model' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
      <div className="mb-6">
        <div className="w-16 h-16 rounded-full bg-[rgba(255,26,136,0.15)] flex items-center justify-center mx-auto mb-4 animate-pulse-pink">
          <Zap size={32} className="text-[#ff1a88]" />
        </div>
        <h2 className="text-2xl font-bold text-gradient mb-2">JARVIS Ready</h2>
        <p className="text-gray-400 text-sm max-w-sm">
          Tell me what you want to create or do. I'll find the perfect free AI tool for you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full max-w-md">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(s.text)}
            className="jarvis-card p-3 text-left text-sm hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span className="mr-2">{s.emoji}</span>
            <span className="text-gray-300">{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
