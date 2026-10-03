import React from 'react';
import {
  PanelLeft,
  LayoutGrid,
  Table as TableIcon,
  Search,
  X,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

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
  vaultSearchRef,
  keywordRef,
}) => {
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
          {!isSidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded hover:bg-[#282828] text-[#999999] hover:text-white transition-colors cursor-pointer mr-1"
              title="Open sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <span className="hover:text-[#dedede] transition-colors cursor-pointer font-medium text-[#cccccc]">
            Curio
          </span>
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

        {/* Right: Global Search Vault + Ask AI */}
        <div className="flex items-center gap-2.5">
          {/* Global Vault Search Input */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#707070]" />
            <input
              ref={vaultSearchRef}
              type="text"
              value={vaultSearch}
              onChange={(e) => onVaultSearchChange(e.target.value)}
              placeholder="Search vault..."
              className="pl-8 pr-12 py-1.5 text-xs bg-[#222222] hover:bg-[#252525] focus:bg-[#222222] text-[#ededed] placeholder-[#666666] rounded-md border border-[#303030] focus:border-sky-500 focus:outline-none w-48 sm:w-56 transition-all shadow-xs"
            />
            {vaultSearch ? (
              <button
                onClick={() => onVaultSearchChange('')}
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
          </div>

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

      {/* Notion Page Header: Title + Description (No top emoji) */}
      <div className="pt-3 pb-2 space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
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
