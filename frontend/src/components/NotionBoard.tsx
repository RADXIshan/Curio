import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Sparkles } from 'lucide-react';
import type { CategoryCount, ReelItem } from '../types';
import { getReelTitle, getCleanCaptionSnippet } from '../utils/titleUtils';

interface NotionBoardProps {
  reels: ReelItem[];
  categories: CategoryCount[];
  onOpen: (reel: ReelItem) => void;
  onTagClick: (tag: string) => void;
}

interface BoardCardProps {
  reel: ReelItem;
  onOpen: (reel: ReelItem) => void;
  onTagClick: (tag: string) => void;
}

const getCategoryDotColor = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('ai') || lower.includes('agent')) return 'bg-emerald-400 shadow-emerald-400/40';
  if (lower.includes('system') || lower.includes('backend')) return 'bg-blue-400 shadow-blue-400/40';
  if (lower.includes('python') || lower.includes('data')) return 'bg-teal-400 shadow-teal-400/40';
  if (lower.includes('devops') || lower.includes('cloud')) return 'bg-amber-400 shadow-amber-400/40';
  if (lower.includes('career') || lower.includes('intern')) return 'bg-rose-400 shadow-rose-400/40';
  if (lower.includes('web') || lower.includes('front')) return 'bg-cyan-400 shadow-cyan-400/40';
  if (lower.includes('tool') || lower.includes('open')) return 'bg-orange-400 shadow-orange-400/40';
  return 'bg-slate-400 shadow-slate-400/40';
};

const BoardCard: React.FC<BoardCardProps> = ({ reel, onOpen, onTagClick }) => {
  const [copied, setCopied] = useState(false);
  const isReel = reel.type === 'reel';

  const title = getReelTitle(reel);
  const snippet = getCleanCaptionSnippet(reel.caption);
  const username = reel.owner?.username ? `@${reel.owner.username}` : '';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(reel.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={() => onOpen(reel)}
      className="group bg-[#202020] hover:bg-[#252525] border border-[#2b2b2b] hover:border-[#3e3e3e] rounded-xl p-3.5 flex flex-col justify-between transition-all duration-150 cursor-pointer shadow-xs select-none space-y-2.5 hover:shadow-md"
    >
      <div className="space-y-2">
        {/* Top: Icon + Format pill + Date */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-sm select-none">{isReel ? '🎬' : '📸'}</span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                isReel
                  ? 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                  : 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40'
              }`}
            >
              {isReel ? 'Reel' : 'Post'}
            </span>

            {reel.caption_generated && (
              <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/25 flex items-center gap-0.5 font-mono">
                <Sparkles className="w-2.5 h-2.5" />
                AI
              </span>
            )}
          </div>
          {reel.saved_at && (
            <span className="text-[10px] text-[#6b6b6b] font-mono">
              {reel.saved_at}
            </span>
          )}
        </div>

        {/* Card Title: What the content is actually about */}
        <h4 className="text-xs font-semibold text-[#f0f0f0] group-hover:text-white leading-snug line-clamp-2">
          {title}
        </h4>

        {/* Author */}
        {username && (
          <div className="text-[11px] text-[#888888] font-mono truncate">
            {username}
          </div>
        )}

        {/* Caption Snippet */}
        <p className="text-[11px] text-[#7d7d7d] line-clamp-2 leading-relaxed">
          {snippet}
        </p>

        {/* Tags */}
        {reel.hashtags && reel.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {reel.hashtags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick(tag);
                }}
                className="text-[10px] text-[#6e6e6e] hover:text-cyan-300 px-1.5 py-0.2 rounded bg-[#1b1b1b] hover:bg-[#282828] border border-[#2a2a2a] hover:border-cyan-800/50 transition-colors"
              >
                #{tag}
              </span>
            ))}
            {reel.hashtags.length > 3 && (
              <span className="text-[10px] text-[#555555] self-center">
                +{reel.hashtags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Hover Footer */}
      <div className="pt-2 border-t border-[#292929] flex items-center justify-between text-[11px] text-[#737373]">
        <span className="group-hover:text-sky-300 flex items-center gap-1 transition-colors">
          <Sparkles className="w-3 h-3 text-[#777777] group-hover:text-sky-400 transition-colors" />
          <span>Inspect</span>
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded text-[#707070] hover:text-white hover:bg-[#2b2b2b] transition-colors cursor-pointer"
            title="Copy link"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <a
            href={reel.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded text-[#707070] hover:text-white hover:bg-[#2b2b2b] transition-colors cursor-pointer"
            title="Open on Instagram"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

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

  // Keep all standard categories or those with items
  const activeColumns = Object.keys(grouped).filter(
    (cat) => (grouped[cat]?.length || 0) > 0 || categories.some((c) => c.name === cat)
  );

  return (
    <div className="w-full overflow-x-auto pb-8 pt-1">
      <div className="flex gap-4 items-start min-w-max pb-2">
        {activeColumns.map((catName) => {
          const items = grouped[catName] || [];
          return (
            <div
              key={catName}
              className="w-80 shrink-0 bg-[#161616] border border-[#262626] rounded-lg flex flex-col max-h-[calc(100vh-230px)] shadow-xs"
            >
              {/* Column Header (Authentic Notion Kanban styling) */}
              <div className="px-3.5 py-3 border-b border-[#252525] flex items-center justify-between bg-[#181818] rounded-t-lg">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div className={`w-2 h-2 rounded-full shadow-xs shrink-0 ${getCategoryDotColor(catName)}`} />
                  <span className="text-xs font-semibold text-[#f0f0f0] truncate">
                    {catName}
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#242424] text-[#8e8e8e] border border-[#2e2e2e] shrink-0">
                  {items.length}
                </span>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                {items.length === 0 ? (
                  <div className="py-8 text-center text-[#555555] text-xs border border-dashed border-[#262626] rounded-md p-4">
                    No items in this topic
                  </div>
                ) : (
                  items.map((reel) => (
                    <BoardCard
                      key={reel.id}
                      reel={reel}
                      onOpen={onOpen}
                      onTagClick={onTagClick}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
