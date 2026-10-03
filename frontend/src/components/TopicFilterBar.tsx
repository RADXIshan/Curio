import React from 'react';
import {
  Cpu,
  Server,
  Code,
  Cloud,
  GraduationCap,
  Globe,
  Wrench,
  Folder,
  ArrowUpDown,
  X,
  Video,
  Image,
  Layers,
} from 'lucide-react';
import type { CategoryCount } from '../types';

interface TopicFilterBarProps {
  categories: CategoryCount[];
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

const getCategoryIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('ai') || lower.includes('agent')) return <Cpu className="w-3.5 h-3.5 text-emerald-400" />;
  if (lower.includes('system') || lower.includes('backend')) return <Server className="w-3.5 h-3.5 text-blue-400" />;
  if (lower.includes('python') || lower.includes('data')) return <Code className="w-3.5 h-3.5 text-teal-400" />;
  if (lower.includes('devops') || lower.includes('cloud')) return <Cloud className="w-3.5 h-3.5 text-amber-400" />;
  if (lower.includes('career') || lower.includes('intern')) return <GraduationCap className="w-3.5 h-3.5 text-rose-400" />;
  if (lower.includes('web') || lower.includes('front')) return <Globe className="w-3.5 h-3.5 text-cyan-400" />;
  if (lower.includes('tool') || lower.includes('open')) return <Wrench className="w-3.5 h-3.5 text-orange-400" />;
  return <Folder className="w-3.5 h-3.5 text-slate-400" />;
};

export const TopicFilterBar: React.FC<TopicFilterBarProps> = ({
  categories,
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
    <div className="space-y-3 mb-6 select-none">
      {/* Top Filter Controls Row: Topic Tabs + Type Pills + Sort Dropdown */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#1d1d1d] border border-[#2b2b2b] rounded-xl p-2.5 shadow-sm">
        {/* Horizontal Scrollable Topic Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs">
          <button
            onClick={() => onCategoryChange('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                : 'text-[#909090] hover:text-[#e0e0e0] hover:bg-[#252525] border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Topics</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#272727] text-[#a5a5a5] font-mono">
              {totalCount}
            </span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.name}
                onClick={() => onCategoryChange(isSelected ? 'all' : cat.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500/20 text-sky-200 border border-sky-500/50 shadow-xs'
                    : 'text-[#909090] hover:text-[#e0e0e0] hover:bg-[#252525] border border-transparent'
                }`}
              >
                {getCategoryIcon(cat.name)}
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-sky-500/30 text-sky-200' : 'bg-[#272727] text-[#808080]'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Utility Group: Format Switcher & Sort Selector */}
        <div className="flex items-center gap-2 shrink-0 pt-1 lg:pt-0 border-t lg:border-t-0 border-[#262626]">
          {/* Format Toggle */}
          <div className="flex items-center bg-[#151515] p-0.5 rounded-lg border border-[#2b2b2b] text-[11px]">
            <button
              onClick={() => onTypeChange('all')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                selectedType === 'all'
                  ? 'bg-[#2a2a2a] text-white font-medium shadow-xs'
                  : 'text-[#777777] hover:text-[#cccccc]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => onTypeChange('reel')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                selectedType === 'reel'
                  ? 'bg-rose-950/60 text-rose-300 font-medium border border-rose-800/40'
                  : 'text-[#777777] hover:text-[#cccccc]'
              }`}
              title={`Filter Reels (${reelsCount})`}
            >
              <Video className="w-3 h-3 text-rose-400" />
              <span>Reels</span>
            </button>
            <button
              onClick={() => onTypeChange('post')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                selectedType === 'post'
                  ? 'bg-cyan-950/60 text-cyan-300 font-medium border border-cyan-800/40'
                  : 'text-[#777777] hover:text-[#cccccc]'
              }`}
              title={`Filter Posts (${postsCount})`}
            >
              <Image className="w-3 h-3 text-cyan-400" />
              <span>Posts</span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-[#151515] px-2 py-1 rounded-lg border border-[#2b2b2b] text-[11px] text-[#a0a0a0]">
            <ArrowUpDown className="w-3 h-3 text-[#707070]" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-[#cccccc] focus:outline-none cursor-pointer pr-1"
            >
              <option value="newest" className="bg-[#1c1c1c] text-[#dedede]">
                Newest saved
              </option>
              <option value="oldest" className="bg-[#1c1c1c] text-[#dedede]">
                Oldest saved
              </option>
              <option value="title" className="bg-[#1c1c1c] text-[#dedede]">
                Title (A-Z)
              </option>
              <option value="author" className="bg-[#1c1c1c] text-[#dedede]">
                Creator (@)
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips Bar (Shown when any filter is active) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs px-1">
          <span className="text-[11px] text-[#707070] mr-1">Filtered by:</span>

          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/25 text-[11px]">
              {getCategoryIcon(selectedCategory)}
              <span>{selectedCategory}</span>
              <button
                onClick={() => onCategoryChange('all')}
                className="hover:text-white cursor-pointer ml-0.5"
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
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#262626] text-[#dedede] border border-[#383838] text-[11px]">
              <span>Search: &ldquo;{searchQuery}&rdquo;</span>
              <button
                onClick={() => onSearchChange('')}
                className="hover:text-white cursor-pointer ml-0.5"
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
