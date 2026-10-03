import React from 'react';
import { NotionCard } from './NotionCard';
import type { CategoryCount, ReelItem } from '../types';

interface NotionBoardProps {
  reels: ReelItem[];
  categories: CategoryCount[];
  onOpen: (reel: ReelItem) => void;
  onTagClick: (tag: string) => void;
}

export const NotionBoard: React.FC<NotionBoardProps> = ({
  reels,
  categories,
  onOpen,
  onTagClick,
}) => {
  // Group reels by category
  const grouped = React.useMemo(() => {
    const map: Record<string, ReelItem[]> = {};
    for (const cat of categories) {
      map[cat.name] = [];
    }
    map['General Tech'] = map['General Tech'] || [];

    for (const reel of reels) {
      const cat = reel.category || 'General Tech';
      if (!map[cat]) map[cat] = [];
      map[cat].push(reel);
    }
    return map;
  }, [reels, categories]);

  const activeColumns = Object.keys(grouped).filter((cat) => (grouped[cat]?.length || 0) > 0);

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 scroll-smooth">
      {activeColumns.map((catName) => {
        const items = grouped[catName] || [];
        return (
          <div
            key={catName}
            className="w-72 shrink-0 bg-[#161616] border border-[#272727] rounded-lg flex flex-col max-h-[75vh]"
          >
            {/* Column Header */}
            <div className="p-3 border-b border-[#252525] flex items-center justify-between bg-[#191919] rounded-t-lg">
              <span className="text-xs font-semibold text-[#e2e2e2] truncate pr-2">
                {catName}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#262626] text-[#888888]">
                {items.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
              {items.map((reel) => (
                <NotionCard
                  key={reel.id}
                  reel={reel}
                  onOpen={onOpen}
                  onTagClick={onTagClick}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
