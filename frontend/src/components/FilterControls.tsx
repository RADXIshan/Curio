import React from 'react';
import { Search, X, Video, Image, LayoutGrid, Hash } from 'lucide-react';
import type { CategoryCount, TagCount } from '../types';

interface FilterControlsProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedType: string;
  onTypeChange: (t: string) => void;
  selectedCategory: string;
  onCategoryChange: (c: string) => void;
  selectedTag: string;
  onTagChange: (t: string) => void;
  categories: CategoryCount[];
  topTags: TagCount[];
  onReset: () => void;
  totalFiltered: number;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedCategory,
  onCategoryChange,
  selectedTag,
  onTagChange,
  categories,
  topTags,
  onReset,
  totalFiltered,
}) => {
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedTag !== '';

  return (
    <div className="space-y-4 my-6">
      {/* Search Bar & Type Switcher Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search saved posts by caption, author, tech, or topic..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-xl border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type Toggle: All / Reels / Posts */}
        <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => onTypeChange('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedType === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>All</span>
          </button>

          <button
            onClick={() => onTypeChange('reel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedType === 'reel'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Reels</span>
          </button>

          <button
            onClick={() => onTypeChange('post')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedType === 'post'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            <span>Posts</span>
          </button>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
        <button
          onClick={() => onCategoryChange('all')}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:bg-slate-800/60'
          }`}
        >
          All Topics
        </button>

        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => onCategoryChange(cat.name === selectedCategory ? 'all' : cat.name)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
              selectedCategory.toLowerCase() === cat.name.toLowerCase()
                ? 'bg-purple-500/25 text-purple-200 border-purple-500/50 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:bg-slate-800/60'
            }`}
          >
            <span>{cat.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Popular Hashtags & Active Filters Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/40 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 overflow-hidden max-h-16">
          <span className="text-slate-500 flex items-center gap-1 mr-1">
            <Hash className="w-3 h-3 text-slate-500" />
            Tags:
          </span>
          {topTags.slice(0, 10).map((t) => (
            <button
              key={t.name}
              onClick={() => onTagChange(selectedTag === t.name ? '' : t.name)}
              className={`px-2 py-0.5 rounded-md text-[11px] transition-all cursor-pointer ${
                selectedTag.toLowerCase() === t.name.toLowerCase()
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              #{t.name}
            </button>
          ))}
        </div>

        {/* Results Counter & Reset */}
        <div className="flex items-center gap-2 ml-auto text-slate-400">
          <span>
            Showing <strong className="text-white">{totalFiltered}</strong> results
          </span>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer ml-1"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
