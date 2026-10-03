import React from 'react';
import { Sparkles, RefreshCw, Compass, BookmarkCheck } from 'lucide-react';

interface NavbarProps {
  totalCount: number;
  isChatOpen: boolean;
  onToggleChat: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalCount,
  isChatOpen,
  onToggleChat,
  onSync,
  isSyncing,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Compass className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Curio
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                AI Curator
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Intelligent Saved Posts & Reels Knowledge Base
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Saved Posts Count Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <BookmarkCheck className="w-4 h-4 text-emerald-400" />
            <span><strong className="text-white">{totalCount}</strong> Saved Items</span>
          </div>

          {/* Sync / Refresh Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
            title="Re-extract posts from saved_posts.html"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Ask AI Chatbot Trigger */}
          <button
            onClick={onToggleChat}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all shadow-md cursor-pointer ${
              isChatOpen
                ? 'bg-indigo-600 text-white shadow-indigo-600/30 ring-2 ring-indigo-400/50'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white shadow-purple-600/25'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask Curio AI</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
