import React, { useState, useEffect, useRef } from 'react';
import {
  PanelLeft,
  LayoutGrid,
  Table as TableIcon,
  Search,
  X,
  Sparkles,
  RotateCcw,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { fetchSearchSuggestions } from '../services/api';
import type { SearchSuggestionItem } from '../types';


interface NotionHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeCategory: string;
  activeType: string;
  activeTag: string;
  totalFiltered: number;
  totalCount?: number;
  viewMode: 'gallery' | 'table';
  onViewModeChange: (mode: 'gallery' | 'table') => void;
  vaultSearch: string;
  onVaultSearchChange: (q: string) => void;
  keywordQuery: string;
  onKeywordQueryChange: (q: string) => void;
  onResetFilters: () => void;
  onOpenChat: () => void;
  onOpenSync?: () => void;
  isSyncing?: boolean;
  vaultSearchRef?: React.RefObject<HTMLInputElement | null>;
  keywordRef?: React.RefObject<HTMLInputElement | null>;
}


export const NotionHeader: React.FC<NotionHeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  activeCategory,
  activeType,
  activeTag,
  totalFiltered,
  viewMode,
  onViewModeChange,
  vaultSearch,
  onVaultSearchChange,
  keywordQuery,
  onKeywordQueryChange,
  onResetFilters,
  onOpenChat,
  onOpenSync,
  isSyncing,
  vaultSearchRef,
  keywordRef,
}) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch smart suggestions when typing or focusing
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetchSearchSuggestions(vaultSearch);
        if (active) {
          setSuggestions(res.suggestions || []);
        }
      } catch {
        if (active) setSuggestions([]);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [vaultSearch]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        vaultSearchRef?.current &&
        !vaultSearchRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [vaultSearchRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setShowSuggestions(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        onVaultSearchChange(suggestions[selectedIndex].text);
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const selectSuggestion = (text: string) => {
    onVaultSearchChange(text);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const hasActiveFilters =
    vaultSearch.trim() !== '' ||
    keywordQuery.trim() !== '' ||
    activeType !== 'all' ||
    activeCategory !== 'all' ||
    activeTag !== '';

  return (
    <div className="border-b border-[#282828] bg-[#191919] px-6 sm:px-10 pt-3 pb-0 select-none">
      {/* Top Navbar: Breadcrumbs on left, Global Vault Search in center/right, Ask AI button on right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#242424]/80 text-xs text-[#8c8c8c]">
        {/* Left: Sidebar toggle + Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Animated Sidebar Toggle Button */}
          <div
            className={`flex items-center overflow-hidden navbar-toggle-transition ${
              !isSidebarOpen
                ? 'w-7 opacity-100 scale-100 mr-1'
                : 'w-0 opacity-0 scale-75 mr-0 pointer-events-none'
            }`}
          >
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded hover:bg-[#282828] text-[#999999] hover:text-white transition-all cursor-pointer active:scale-90"
              title="Open navbar (⌘\)"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>

          <div
            onClick={onResetFilters}
            className="flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer mr-0.5 group"
            title="Curio Home"
          >
            <img
              src="/logo.png"
              alt="Curio Logo"
              className="w-4 h-4 rounded object-contain shrink-0 group-hover:scale-105 transition-transform"
            />
            <span className="font-semibold text-[#f0f0f0] tracking-tight text-xs">
              Curio
            </span>
          </div>
          <span className="text-[#555555]">/</span>
          <span className="hover:text-[#dedede] transition-colors cursor-pointer text-[#a0a0a0]">
            {vaultSearch ? 'Global Vault Search' : activeCategory === 'all' ? 'All Saved Vault' : activeCategory}
          </span>
          {!vaultSearch && activeType !== 'all' && (
            <>
              <span className="text-[#555555]">/</span>
              <span className="capitalize text-[#cccccc]">{activeType}s</span>
            </>
          )}
          {!vaultSearch && activeTag && (
            <>
              <span className="text-[#555555]">/</span>
              <span className="text-cyan-400 font-mono font-medium">#{activeTag}</span>
            </>
          )}
        </div>

        {/* Right: Global Search Vault + Sync Vault + Ask AI */}
        <div className="flex items-center gap-2.5">
          {/* Global Vault Search Input */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#707070] pointer-events-none" />
            <input
              ref={vaultSearchRef}
              type="text"
              value={vaultSearch}
              onFocus={() => {
                if (vaultSearch.trim()) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                onVaultSearchChange(e.target.value);
                if (e.target.value.trim()) setShowSuggestions(true);
                else setShowSuggestions(false);
              }}
              placeholder="Search vault..."
              className="pl-8 pr-12 py-1.5 text-xs bg-[#222222] hover:bg-[#252525] focus:bg-[#222222] text-[#ededed] placeholder-[#666666] rounded-md border border-[#303030] focus:border-sky-500 focus:outline-none w-52 sm:w-64 transition-all shadow-xs"
            />
            {vaultSearch ? (
              <button
                onClick={() => {
                  onVaultSearchChange('');
                  setShowSuggestions(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#707070] hover:text-white transition-colors cursor-pointer"
                title="Clear vault search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-[#1c1c1c] border border-[#333333] text-[#707070] pointer-events-none">
                /
              </kbd>
            )}

            {/* Suggestions Floating Dropdown (active when user types) */}
            {showSuggestions && vaultSearch.trim() && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-1.5 bg-[#1b1b1b] border border-[#333333] rounded-lg shadow-xl shadow-black/60 z-50 overflow-hidden py-1 min-w-[280px] animate-content-enter select-none"
              >
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#737373] font-semibold flex items-center justify-between border-b border-[#262626]">
                  <span className="flex items-center gap-1.5 text-[#888888]">
                    <Search className="w-3 h-3 text-[#707070]" />
                    Suggestions
                  </span>
                  <span className="text-[9px] text-[#555555] font-mono">↑↓ Enter</span>
                </div>

                <div className="max-h-64 overflow-y-auto py-1">
                  {suggestions.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    const isTag = item.type === 'tag' || item.text.startsWith('#');
                    return (
                      <div
                        key={`${item.type}-${item.text}-${idx}`}
                        onClick={() => selectSuggestion(item.text)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`px-3 py-1.5 flex items-center gap-2.5 cursor-pointer transition-colors text-xs ${
                          isSelected
                            ? 'bg-sky-500/15 text-sky-200'
                            : 'text-[#d0d0d0] hover:bg-[#252525]'
                        }`}
                      >
                        {isTag ? (
                          <Tag className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        ) : (
                          <Search className="w-3.5 h-3.5 text-[#707070] shrink-0" />
                        )}
                        <span className="truncate">{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sync Vault Button */}
          {onOpenSync && (
            <button
              onClick={onOpenSync}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#222222] hover:bg-[#2b2b2b] text-[#d6d6d6] hover:text-white border border-[#383838] hover:border-sky-500/50 transition-all cursor-pointer text-xs font-medium shadow-xs group"
              title="Sync new saved reels from Instagram"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-rose-400 group-hover:text-rose-300 transition-colors ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          )}

          {/* Ask AI Button (Vibrant Sky/Cyan Accent) */}
          <button
            onClick={onOpenChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#242424] hover:bg-[#2c2c2c] text-[#ededed] hover:text-white border border-sky-500/30 hover:border-sky-400 transition-all cursor-pointer text-xs font-medium shadow-xs group"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400 group-hover:text-sky-300 transition-colors" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </div>


      {/* Notion Page Header: Title + Description */}
      <div className="pt-3 pb-2 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          {(!vaultSearch && activeCategory === 'all') && (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/5 border border-white/10 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img src="/logo.png" alt="Curio" className="w-full h-full object-contain" />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#f0f0f0]">
            {vaultSearch
              ? `Search Results for "${vaultSearch}"`
              : activeCategory === 'all'
              ? 'Saved Posts & Reels Knowledge Base'
              : activeCategory}
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#242424] text-[#a0a0a0] font-mono border border-[#2e2e2e]">
            {totalFiltered} {totalFiltered === 1 ? 'item' : 'items'}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#888888] max-w-2xl leading-relaxed">
          {vaultSearch
            ? 'Searching across all saved Instagram reels, posts, code references, and topics in the vault.'
            : 'Structured Instagram archive powered by Google Gemini. Filter by category, view code references, generate instant summaries, or ask questions with Curio AI.'}
        </p>
      </div>

      {/* Database Toolbar: Tabs (Gallery / Table / Board) + Local Keyword Search & Reset Button with generous gap from the line below */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 pb-3.5">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 -mb-[15px]">
          <button
            onClick={() => onViewModeChange('gallery')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              viewMode === 'gallery'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-[#7e7e7e] hover:text-[#d0d0d0]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Gallery</span>
          </button>

          <button
            onClick={() => onViewModeChange('table')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-[#7e7e7e] hover:text-[#d0d0d0]'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>

        {/* Local Page Keyword Search Bar & Reset Button (with generous gap above the bottom line) */}
        <div className="flex items-center gap-2 mb-1">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#707070]" />
            <input
              ref={keywordRef}
              type="text"
              value={keywordQuery}
              onChange={(e) => onKeywordQueryChange(e.target.value)}
              placeholder="Filter by keyword..."
              className="pl-8 pr-7 py-1.5 text-xs bg-[#222222] hover:bg-[#252525] focus:bg-[#222222] text-[#ededed] placeholder-[#666666] rounded-md border border-[#303030] focus:border-sky-500 focus:outline-none w-48 sm:w-56 transition-all shadow-xs"
            />
            {keywordQuery && (
              <button
                onClick={() => onKeywordQueryChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#707070] hover:text-white transition-colors cursor-pointer"
                title="Clear keyword filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-[#252525] hover:bg-[#303030] text-rose-300 hover:text-rose-200 border border-rose-900/40 hover:border-rose-700 transition-all cursor-pointer shadow-xs"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3 text-rose-400" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
