import React from 'react';
import { Video, Image, Layers, BookmarkCheck } from 'lucide-react';
import type { StatsResponse } from '../types';

interface StatsBarProps {
  stats: StatsResponse | null;
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-6">
      {/* Total Items */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all"></div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <BookmarkCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Saved</p>
            <p className="text-2xl font-bold text-white tracking-tight">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* Total Reels */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-pink-500/10 rounded-full blur-xl group-hover:bg-pink-500/20 transition-all"></div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Video Reels</p>
            <p className="text-2xl font-bold text-white tracking-tight">{stats.reels_count}</p>
          </div>
        </div>
      </div>

      {/* Total Posts */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all"></div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Image className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Posts & Carousels</p>
            <p className="text-2xl font-bold text-white tracking-tight">{stats.posts_count}</p>
          </div>
        </div>
      </div>

      {/* Categories Count */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all"></div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">AI Categories</p>
            <p className="text-2xl font-bold text-white tracking-tight">{stats.categories.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
