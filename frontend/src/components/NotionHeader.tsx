import React from 'react';
import {
  PanelLeft,
  LayoutGrid,
  Table as TableIcon,
  Columns,
  Search,
  X,
  Sparkles,
} from 'lucide-react';

interface NotionHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeCategory: string;
  activeType: string;
  activeTag: string;
  totalFiltered: number;
  totalCount?: number;
  viewMode: 'gallery' | 'table' | 'board';
  onViewModeChange: (mode: 'gallery' | 'table' | 'board') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onResetFilters: () => void;
  onOpenChat: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
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
  searchQuery,
  onSearchChange,
  onResetFilters,
  onOpenChat,
  searchRef,
}) => {
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    activeType !== 'all' ||
    activeCategory !== 'all' ||
    activeTag !== '';

  return (
    <div className="border-b border-[#282828] bg-[#191919] px-6 sm:px-10 pt-4 pb-0 space-y-4">
      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between gap-3 text-xs text-[#8c8c8c]">
        <div className="flex items-center gap-2 min-w-0">
          {!isSidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="p-1 rounded hover:bg-[#282828] text-[#999999] hover:text-white transition-colors cursor-pointer mr-1"
              title="Open sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <span className="hover:text-[#dedede] transition-colors cursor-pointer">Curio</span>
          <span>/</span>
          <span className="hover:text-[#dedede] transition-colors cursor-pointer">
            {activeCategory === 'all' ? 'All Saved Vault' : activeCategory}
          </span>
          {activeType !== 'all' && (
            <>
              <span>/</span>
              <span className="capitalize">{activeType}s</span>
            </>
          )}
          {activeTag && (
            <>
              <span>/</span>
              <span className="text-indigo-400">#{activeTag}</span>
            </>
          )}
        </div>

        {/* Top Right Quick Ask AI */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenChat}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#252525] hover:bg-[#2d2d2d] text-[#e0e0e0] border border-[#333333] transition-colors cursor-pointer text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </div>

      {/* Notion Page Header: Icon + Title + Description */}
      <div className="pt-2 pb-1 space-y-2">
        <div className="text-3xl select-none">⚡</div>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#ededed]">
            {activeCategory === 'all' ? 'Saved Posts & Reels Knowledge Base' : activeCategory}
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#262626] text-[#999999] font-mono">
            {totalFiltered} {totalFiltered === 1 ? 'item' : 'items'}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#8a8a8a] max-w-2xl leading-relaxed">
          Structured Instagram archive powered by Google Gemini. Filter by category, view code references, generate instant summaries, or ask questions with Curio AI.
        </p>
      </div>

      {/* Notion Database Toolbar: Tabs (Gallery / Table / Board) + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 -mb-[1px]">
          <button
            onClick={() => onViewModeChange('gallery')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              viewMode === 'gallery'
                ? 'border-white text-white'
                : 'border-transparent text-[#808080] hover:text-[#d0d0d0]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Gallery</span>
          </button>

          <button
            onClick={() => onViewModeChange('table')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'border-white text-white'
                : 'border-transparent text-[#808080] hover:text-[#d0d0d0]'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>

          <button
            onClick={() => onViewModeChange('board')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              viewMode === 'board'
                ? 'border-white text-white'
                : 'border-transparent text-[#808080] hover:text-[#d0d0d0]'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Board by Topic</span>
          </button>
        </div>

        {/* Search & Reset */}
        <div className="flex items-center gap-2 pb-2 sm:pb-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#737373]" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter by keyword..."
              className="pl-8 pr-7 py-1.5 text-xs bg-[#222222] text-[#e0e0e0] placeholder-[#666666] rounded-md border border-[#333333] focus:border-slate-500 focus:outline-none w-44 sm:w-60 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#737373] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="px-2 py-1 text-[11px] rounded bg-[#262626] hover:bg-[#303030] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
