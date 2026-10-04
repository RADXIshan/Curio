import React, { useState, useRef, useEffect } from 'react';
import { X, Send, User, Loader2, Trash2, ArrowUpRight, Zap } from 'lucide-react';
import type { ChatMessage, ReelItem } from '../types';
import { sendChatMessage } from '../services/api';
import { getReelTitle, getCleanCaptionSnippet } from '../utils/titleUtils';

interface NotionAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReel: (reel: ReelItem) => void;
}

const STARTER_PROMPTS = [
  'What AI agent frameworks or repos did I save?',
  'Find roadmaps or tips for System Design interviews',
  'What DSA and LeetCode preparation resources are saved?',
  'Show resources for Hackathons like Smart India Hackathon',
  'What productivity and learning techniques did I bookmark?',
];

export const NotionAIChat: React.FC<NotionAIChatProps> = ({
  isOpen,
  onClose,
  onSelectReel,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        "Hello! I am your Curio AI assistant, powered by Google Gemini. Ask me anything about the 448 posts and reels you've saved — whether you need to locate a specific tool, review a system design concept, or find project ideas.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Manage smooth enter & exit animation transitions
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 230);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (shouldRender) {
      scrollToBottom();
    }
  }, [messages, shouldRender]);

  const handleSmoothClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  if (!shouldRender) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendChatMessage(text, history);

      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'model',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        referenced_reels: res.referenced_reels,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'model',
          content: 'Sorry, I ran into an issue connecting to Gemini. Please try again in a moment.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        content: 'Chat history cleared. What would you like to explore next in your saved collection?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div
      onClick={handleSmoothClose}
      className={`fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md ${
        isClosing ? 'animate-curio-backdrop-out' : 'animate-curio-backdrop'
      }`}
    >
      <div
        className={`w-full max-w-md h-full bg-[#181818]/95 border-l border-sky-500/20 flex flex-col shadow-2xl relative overflow-hidden backdrop-blur-xl ${
          isClosing ? 'animate-curio-drawer-out' : 'animate-curio-drawer curio-glow-border'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Top-Right Shimmer Glow */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-gradient-to-br from-sky-500/20 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Drawer Header */}
        <div className="px-4 py-3.5 border-b border-[#292929] flex items-center justify-between bg-[#141414]/90 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 p-0.5 flex items-center justify-center shrink-0 shadow-md shadow-sky-500/10">
              <img src="/logo.png" alt="Curio AI" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-[#f5f5f5] tracking-tight">
                  Curio AI Assistant
                </h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping inline-block" />
                  Gemini
                </span>
              </div>
              <p className="text-[10px] text-[#787878]">Search & analyze 448 saved posts</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClear}
              className="p-1.5 rounded-md text-[#777777] hover:text-[#d0d0d0] hover:bg-[#252525] transition-colors cursor-pointer"
              title="Clear chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSmoothClose}
              className="p-1.5 rounded-md text-[#777777] hover:text-white hover:bg-[#252525] transition-colors cursor-pointer ml-0.5"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs relative z-10">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 animate-curio-message ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-bold overflow-hidden ${
                    isUser
                      ? 'bg-[#333333] text-white shadow-xs'
                      : 'bg-white/5 border border-white/10 p-0.5 shadow-xs'
                  }`}
                >
                  {isUser ? (
                    <User className="w-3.5 h-3.5 text-[#e0e0e0]" />
                  ) : (
                    <img src="/logo.png" alt="Curio AI" className="w-full h-full object-contain" />
                  )}
                </div>

                <div className={`max-w-[86%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-line shadow-xs ${
                      isUser
                        ? 'bg-blue-600 text-[#ffffff] rounded-tr-none'
                        : 'bg-[#202020] border border-[#2e2e2e] text-[#d6d6d6] rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Referenced Reel Cards */}
                  {msg.referenced_reels && msg.referenced_reels.length > 0 && (
                    <div className="space-y-1.5 pt-1.5">
                      <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Referenced Saved Posts:
                      </p>
                      {msg.referenced_reels.map((reel) => {
                        const contentTitle = getReelTitle(reel);
                        const snippet = getCleanCaptionSnippet(reel.caption);
                        return (
                          <div
                            key={reel.id}
                            onClick={() => {
                              onSelectReel(reel);
                              handleSmoothClose();
                            }}
                            className="p-2.5 rounded-lg bg-[#1f1f1f] hover:bg-[#262626] border border-[#2e2e2e] hover:border-sky-500/40 flex items-center justify-between gap-2.5 transition-all cursor-pointer group shadow-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] select-none">{reel.type === 'reel' ? '🎬' : '📸'}</span>
                                <p className="text-[11px] font-semibold text-[#f0f0f0] group-hover:text-sky-300 truncate">
                                  {contentTitle}
                                </p>
                              </div>
                              <p className="text-[10px] text-[#7a7a7a] line-clamp-1">
                                @{reel.owner?.username || 'creator'} • {snippet}
                              </p>
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#888888] group-hover:text-sky-400 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <span className="text-[10px] text-[#606060] block px-0.5 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-xs text-[#808080] animate-curio-message">
              <div className="w-6 h-6 rounded bg-white/5 border border-white/10 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/logo.png" alt="Curio AI" className="w-full h-full object-contain animate-pulse" />
              </div>
              <div className="px-3 py-2 rounded-xl bg-[#202020] border border-[#2b2b2b] flex items-center gap-2 text-[#cccccc]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Thinking with Gemini...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter Prompts */}
        {messages.length <= 2 && (
          <div className="px-3.5 py-2.5 border-t border-[#262626] bg-[#161616]/90 backdrop-blur-md relative z-10">
            <p className="text-[10px] text-[#707070] mb-1.5 uppercase font-medium">Quick Prompts</p>
            <div className="space-y-1">
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left text-[11px] text-[#a0a0a0] hover:text-sky-300 p-1.5 rounded-md hover:bg-[#222222] transition-colors truncate block cursor-pointer"
                >
                  • {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="p-3 border-t border-[#292929] bg-[#151515] relative z-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Curio AI about saved posts..."
              className="flex-1 px-3.5 py-2 bg-[#202020] text-xs text-[#f0f0f0] placeholder-[#666666] rounded-lg border border-[#303030] focus:border-sky-500 focus:bg-[#232323] outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-sky-600/20 shrink-0"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NotionAIChat;
