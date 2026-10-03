import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Video, Trash2, ArrowUpRight } from 'lucide-react';
import type { ChatMessage, ReelItem } from '../types';
import { sendChatMessage } from '../services/api';

interface ChatBotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReel: (reel: ReelItem) => void;
}

const STARTER_PROMPTS = [
  'What AI agent frameworks or repos did I save?',
  'Find roadmaps or tips for System Design interviews',
  'What Python and Data Science projects are saved?',
  'Show resources for internships and resume tips',
];

export const ChatBotDrawer: React.FC<ChatBotDrawerProps> = ({
  isOpen,
  onClose,
  onSelectReel,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        "Hello! I'm Curio AI, powered by Google Gemini. I have complete access to your 448 saved Instagram reels and posts. Ask me anything about the coding tools, AI frameworks, system design roadmaps, or career resources you've saved!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

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
        content: "Chat cleared! How can I assist you with your saved posts?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg h-full glass-panel border-l border-slate-700/80 bg-slate-950/95 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 p-1 flex items-center justify-center shrink-0 shadow-md">
              <img src="/logo.png" alt="Curio Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Curio Assistant</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Gemini Active
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Grounded in your 448 saved posts</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold overflow-hidden ${
                    isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/5 border border-white/10 p-0.5'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <img src="/logo.png" alt="Curio AI" className="w-full h-full object-contain" />}
                </div>

                {/* Message Body */}
                <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Referenced Reel Cards if provided by Gemini */}
                  {msg.referenced_reels && msg.referenced_reels.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                        Referenced Saved Posts:
                      </p>
                      <div className="space-y-1.5">
                        {msg.referenced_reels.map((reel) => (
                          <div
                            key={reel.id}
                            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 text-xs flex items-center justify-between gap-2 group transition-all"
                          >
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate flex items-center gap-1.5">
                                <Video className="w-3 h-3 text-pink-400 shrink-0" />
                                <span>@{reel.owner?.username || 'creator'}</span>
                                <span className="text-[10px] text-slate-400 px-1.5 rounded bg-slate-800">
                                  {reel.category}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {reel.caption?.slice(0, 60) || 'Instagram post'}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                onSelectReel(reel);
                              }}
                              className="px-2 py-1 rounded-md text-[10px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <span>View</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 block px-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-slate-400">
              <div className="w-7 h-7 rounded-lg bg-purple-600/50 flex items-center justify-center text-white shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Curio AI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter Prompts */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 bg-slate-900/30 border-t border-slate-800/60">
            <p className="text-[11px] text-slate-400 mb-1.5 font-medium">Suggested queries:</p>
            <div className="flex flex-wrap gap-1.5">
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors text-left cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/70">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your saved reels, tools, or tips..."
              className="flex-1 px-4 py-2.5 bg-slate-950 text-xs sm:text-sm text-white placeholder-slate-500 rounded-xl border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white disabled:opacity-40 transition-all cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
