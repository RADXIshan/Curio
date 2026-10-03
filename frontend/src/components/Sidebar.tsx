import React from 'react';
import {
  RefreshCw,
  PanelLeftClose,
  Camera,
  Cpu,
  Server,
  Code,
  Cloud,
  GraduationCap,
  Globe,
  Wrench,
  Folder,
  Layers,
} from 'lucide-react';
import type { CategoryCount, TagCount } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedCategory: string;
  onCategoryChange: (c: string) => void;
  selectedTag: string;
  onTagChange: (t: string) => void;
  categories: CategoryCount[];
  topTags: TagCount[];
  totalCount: number;
  onSync: () => void;
  isSyncing: boolean;
}

const getCategoryIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('ai') || lower.includes('agent')) return <Cpu className="w-4 h-4 text-emerald-400" />;
  if (lower.includes('system') || lower.includes('backend')) return <Server className="w-4 h-4 text-blue-400" />;
  if (lower.includes('python') || lower.includes('data')) return <Code className="w-4 h-4 text-teal-400" />;
  if (lower.includes('devops') || lower.includes('cloud')) return <Cloud className="w-4 h-4 text-amber-400" />;
  if (lower.includes('career') || lower.includes('intern')) return <GraduationCap className="w-4 h-4 text-rose-400" />;
  if (lower.includes('web') || lower.includes('front')) return <Globe className="w-4 h-4 text-cyan-400" />;
  if (lower.includes('tool') || lower.includes('open')) return <Wrench className="w-4 h-4 text-orange-400" />;
  return <Folder className="w-4 h-4 text-slate-400" />;
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  selectedCategory,
  onCategoryChange,
  selectedTag,
  onTagChange,
  categories,
  topTags,
  totalCount,
  onSync,
  isSyncing,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-[#141414] border-r border-[#262626] flex flex-col justify-between select-none transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {/* Workspace Header */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#202020] transition-colors cursor-pointer group">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                C
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#f0f0f0] truncate block">
                  Curio Workspace
                </span>
                <span className="text-[10px] text-[#777777] block">
                  Instagram Saved Vault
                </span>
              </div>
            </div>

            <button
              onClick={onToggle}
              className="p-1 rounded text-[#8c8c8c] hover:text-[#e0e0e0] hover:bg-[#282828] transition-colors cursor-pointer"
              title="Close sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* TOPICS & COLLECTIONS (Strictly in Sidebar) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-2.5">
              <p className="text-[10px] font-semibold text-[#777777] tracking-wider uppercase">
                Topics & Collections
              </p>
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => onCategoryChange('all')}
                  className="text-[10px] text-sky-400 hover:text-sky-300 cursor-pointer"
                >
                  Show all
                </button>
              )}
            </div>

            <div className="space-y-0.5 text-xs">
              {/* All Topics Item */}
              <button
                onClick={() => {
                  onCategoryChange('all');
                  onTagChange('');
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-left ${
                  selectedCategory === 'all' && !selectedTag
                    ? 'bg-sky-500/15 text-sky-200 font-medium border border-sky-500/30 shadow-xs'
                    : 'text-[#a6a6a6] hover:bg-[#1e1e1e] hover:text-[#ededed] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-1">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span className="truncate">All Topics</span>
                </div>
                <span
                  className={`text-[10px] shrink-0 font-mono px-1.5 py-0.2 rounded-full ${
                    selectedCategory === 'all' && !selectedTag
                      ? 'bg-sky-500/25 text-sky-200'
                      : 'bg-[#1e1e1e] text-[#707070]'
                  }`}
                >
                  {totalCount}
                </span>
              </button>

              {/* Specific Topics */}
              {categories.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.name}
                    onClick={() => onCategoryChange(isSelected ? 'all' : cat.name)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-sky-500/15 text-sky-200 font-medium border border-sky-500/30 shadow-xs'
                        : 'text-[#a6a6a6] hover:bg-[#1e1e1e] hover:text-[#ededed] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-1">
                      {getCategoryIcon(cat.name)}
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <span
                      className={`text-[10px] shrink-0 font-mono px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-sky-500/25 text-sky-200' : 'bg-[#1e1e1e] text-[#707070]'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* POPULAR TAGS SECTION */}
          <div className="space-y-1">
            <p className="px-2.5 text-[10px] font-semibold text-[#666666] tracking-wider uppercase">
              Top Tags
            </p>
            <div className="flex flex-wrap gap-1 px-1.5">
              {topTags.slice(0, 14).map((t) => {
                const isSelected = selectedTag.toLowerCase() === t.name.toLowerCase();
                return (
                  <button
                    key={t.name}
                    onClick={() => onTagChange(isSelected ? '' : t.name)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'bg-[#1e1e1e] hover:bg-[#282828] text-[#8e8e8e] hover:text-cyan-300'
                    }`}
                  >
                    #{t.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#262626] bg-[#121212] space-y-2 text-xs">
          {/* Sync status & action */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#202020] text-[#8c8c8c] hover:text-[#e0e0e0] transition-colors cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-400' : 'text-[#888888]'}`} />
              <span className="text-[11px]">{isSyncing ? 'Syncing...' : 'Sync saved_posts.html'}</span>
            </div>
            <span className="text-[10px] px-1 rounded bg-[#202020] text-[#707070]">v0.2</span>
          </button>

          {/* User profile footer */}
          <div className="flex items-center gap-2 px-2.5 py-1 text-[#7a7a7a]">
            <Camera className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[11px] truncate">@ishan_roy31</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
