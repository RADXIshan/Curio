import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User, Loader2, Trash2, ArrowUpRight } from 'lucide-react';
import type { ChatMessage, ReelItem } from '../types';
import { sendChatMessage } from '../services/api';

interface NotionAIChatProps {
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
        content: "Chat history cleared. What would you like to explore next?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md h-full bg-[#181818] border-l border-[#292929] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-4 py-3 border-b border-[#292929] flex items-center justify-between bg-[#151515]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-semibold text-[#f0f0f0]">
              Curio AI Q&A
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono font-medium">
              Gemini
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClear}
              className="p-1 rounded text-[#777777] hover:text-[#d0d0d0] hover:bg-[#252525] transition-colors cursor-pointer"
              title="Clear chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#777777] hover:text-white hover:bg-[#252525] transition-colors cursor-pointer"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-[#333333] text-white'
                      : 'bg-sky-950/60 text-sky-300 border border-sky-800/50'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5 text-[#e0e0e0]" /> : <Bot className="w-3.5 h-3.5 text-sky-300" />}
                </div>

                <div className={`max-w-[86%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-lg text-xs leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-[#282828] text-[#f2f2f2]'
                        : 'bg-[#1e1e1e] border border-[#2b2b2b] text-[#cccccc]'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Referenced Reel Cards */}
                  {msg.referenced_reels && msg.referenced_reels.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider">
                        Referenced Saved Posts:
                      </p>
                      {msg.referenced_reels.map((reel) => (
                        <div
                          key={reel.id}
                          onClick={() => onSelectReel(reel)}
                          className="p-2 rounded bg-[#202020] hover:bg-[#252525] border border-[#2e2e2e] hover:border-sky-500/40 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-[#e0e0e0] truncate">
                              @{reel.owner?.username || 'creator'} • {reel.category}
                            </p>
                            <p className="text-[10px] text-[#7a7a7a] truncate">
                              {reel.caption?.slice(0, 50) || 'Instagram post'}
                            </p>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-[#606060] block px-0.5">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-xs text-[#808080]">
              <div className="w-6 h-6 rounded bg-sky-950/60 border border-sky-800/50 flex items-center justify-center text-sky-300 shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="px-3 py-2 rounded-lg bg-[#1e1e1e] border border-[#2b2b2b] flex items-center gap-2 text-[#cccccc]">
                <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                <span>Thinking with Gemini...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter Prompts */}
        {messages.length <= 2 && (
          <div className="px-3.5 py-2.5 border-t border-[#262626] bg-[#161616]">
            <p className="text-[10px] text-[#707070] mb-1.5 uppercase font-medium">Suggestions</p>
            <div className="space-y-1">
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left text-[11px] text-[#a0a0a0] hover:text-sky-300 p-1.5 rounded hover:bg-[#222222] transition-colors truncate block cursor-pointer"
                >
                  • {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-[#292929] bg-[#151515]">
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
              placeholder="Ask Curio AI..."
              className="flex-1 px-3 py-2 bg-[#202020] text-xs text-[#f0f0f0] placeholder-[#666666] rounded-md border border-[#303030] focus:border-sky-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
