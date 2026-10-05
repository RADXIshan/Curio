import React from 'react';
import {
  Calendar,
  Clock,
  X,
  Video,
  Image,
  Layers,
  Search,
} from 'lucide-react';

interface PageFilterBarProps {
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedTag: string;
  onTagChange: (tag: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalFiltered: number;
  totalCount: number;
  reelsCount: number;
  postsCount: number;
  onResetFilters: () => void;
}

export const TopicFilterBar: React.FC<PageFilterBarProps> = ({
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
  selectedTag,
  onTagChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  totalFiltered,
  totalCount,
  reelsCount,
  postsCount,
  onResetFilters,
}) => {
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedTag !== '';

  return (
    <div className="space-y-2.5 mb-5 select-none">
      {/* Page Filter Controls: Date-Wise Filter / Sort & Format Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1d1d1d] border border-[#2b2b2b] rounded-xl px-3.5 py-2.5 shadow-xs">
        {/* Left: Format Switcher (Inside Page) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#151515] p-0.5 rounded-lg border border-[#2b2b2b] text-xs">
            <button
              onClick={() => onTypeChange('all')}
              className={`px-3 py-1 rounded-md transition-all duration-150 cursor-pointer font-medium active:scale-95 ${
                selectedType === 'all'
                  ? 'bg-[#292929] text-white shadow-xs'
                  : 'text-[#808080] hover:text-[#cccccc] hover:bg-[#1a1a1a]'
              }`}
            >
              All Formats
            </button>
            <button
              onClick={() => onTypeChange('reel')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all duration-150 cursor-pointer font-medium active:scale-95 ${
                selectedType === 'reel'
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40 shadow-xs'
                  : 'text-[#808080] hover:text-[#cccccc] hover:bg-[#1a1a1a]'
              }`}
              title={`Filter Reels (${reelsCount})`}
            >
              <Video className="w-3 h-3 text-rose-400" />
              <span>Reels</span>
              <span className="text-[10px] text-[#707070] font-mono">({reelsCount})</span>
            </button>
            <button
              onClick={() => onTypeChange('post')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all duration-150 cursor-pointer font-medium active:scale-95 ${
                selectedType === 'post'
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 shadow-xs'
                  : 'text-[#808080] hover:text-[#cccccc] hover:bg-[#1a1a1a]'
              }`}
              title={`Filter Posts (${postsCount})`}
            >
              <Image className="w-3 h-3 text-cyan-400" />
              <span>Posts</span>
              <span className="text-[10px] text-[#707070] font-mono">({postsCount})</span>
            </button>
          </div>
        </div>

        {/* Right: Date-wise Filter / Sort Selector (Inside Page) */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#707070] font-medium flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#666666]" />
            Sort by date:
          </span>
          <div className="flex items-center gap-1.5 bg-[#151515] px-2.5 py-1 rounded-lg border border-[#2b2b2b] text-xs text-[#a0a0a0]">
            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-[#e0e0e0] font-medium focus:outline-none cursor-pointer pr-1 text-xs"
            >
              {searchQuery && (
                <option value="relevance" className="bg-[#1c1c1c] text-sky-300 font-medium">
                  Best Match (Relevance)
                </option>
              )}
              <option value="newest" className="bg-[#1c1c1c] text-[#dedede]">
                Newest saved date
              </option>
              <option value="oldest" className="bg-[#1c1c1c] text-[#dedede]">
                Oldest saved date
              </option>
              <option value="title" className="bg-[#1c1c1c] text-[#dedede]">
                Title (A-Z)
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs px-1 animate-content-enter">
          <span className="text-[11px] text-[#707070] mr-1">Active filter:</span>

          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-200 border border-sky-500/30 text-[11px] font-medium shadow-xs">
              <Layers className="w-3 h-3 text-sky-400" />
              <span>Topic: {selectedCategory}</span>
              <button
                onClick={() => onCategoryChange('all')}
                className="hover:text-white cursor-pointer ml-1 p-0.5 rounded-full hover:bg-sky-500/20"
                title="Clear topic filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedType !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#262626] text-[#e0e0e0] border border-[#383838] text-[11px] capitalize">
              <span>Format: {selectedType}s</span>
              <button
                onClick={() => onTypeChange('all')}
                className="hover:text-white cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedTag && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/40 text-[11px] font-mono">
              <span>#{selectedTag}</span>
              <button
                onClick={() => onTagChange('')}
                className="hover:text-white cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#262626] text-[#dedede] border border-[#383838] text-[11px] font-medium shadow-xs">
              <Search className="w-3 h-3 text-[#888888] shrink-0" />
              <span>Search: &ldquo;{searchQuery}&rdquo;</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#333333] text-[#aaaaaa] text-[10px] font-mono">
                {totalFiltered} {totalFiltered === 1 ? 'result' : 'results'}
              </span>
              <button
                onClick={() => onSearchChange('')}
                className="hover:text-white cursor-pointer ml-0.5 p-0.5 hover:bg-[#333333] rounded-full"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={onResetFilters}
            className="text-[11px] text-rose-400 hover:text-rose-300 underline underline-offset-2 ml-1 cursor-pointer transition-colors"
          >
            Clear all
          </button>

          <span className="text-[11px] text-[#606060] ml-auto font-mono">
            Showing {totalFiltered} of {totalCount} posts
          </span>
        </div>
      )}
    </div>
  );
};

export default TopicFilterBar;
