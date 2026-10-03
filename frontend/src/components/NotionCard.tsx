import React, { useState } from 'react';
import { ExternalLink, Sparkles, Copy, Check, Calendar } from 'lucide-react';
import type { ReelItem } from '../types';
import { getReelTitle, getCleanCaptionSnippet } from '../utils/titleUtils';

interface NotionCardProps {
  reel: ReelItem;
  onOpen: (reel: ReelItem) => void;
  onTagClick: (tag: string) => void;
}

const getCategoryBadgeClass = (category?: string) => {
  switch (category) {
    case 'AI & Agents':
      return 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40';
    case 'System Design & Backend':
      return 'bg-blue-950/50 text-blue-300 border-blue-800/40';
    case 'Python & Data Science':
      return 'bg-teal-950/50 text-teal-300 border-teal-800/40';
    case 'DevOps & Cloud':
      return 'bg-amber-950/50 text-amber-300 border-amber-800/40';
    case 'Career & Coding Prep':
    case 'Career & Internships':
      return 'bg-rose-950/50 text-rose-300 border-rose-800/40';
    case 'Web & Frontend':
      return 'bg-cyan-950/50 text-cyan-300 border-cyan-800/40';
    case 'Dev Tools & Resources':
    case 'Dev Tools & Open Source':
      return 'bg-orange-950/50 text-orange-300 border-orange-800/40';
    default:
      return 'bg-[#282828] text-[#cccccc] border-[#383838]';
  }
};

export const NotionCard: React.FC<NotionCardProps> = ({ reel, onOpen, onTagClick }) => {
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
      className="group bg-[#202020] hover:bg-[#252525] border border-[#2d2d2d] hover:border-[#404040] rounded-xl p-4 flex flex-col justify-between transition-all duration-150 cursor-pointer shadow-xs select-none hover:shadow-lg hover:shadow-black/30"
    >
      <div>
        {/* Notion Page Icon & Format Badge */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-base select-none">{isReel ? '🎬' : '📸'}</span>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                isReel
                  ? 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                  : 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40'
              }`}
            >
              {isReel ? 'Reel' : 'Post'}
            </span>

            {reel.caption_generated && (
              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/25 flex items-center gap-1 font-mono">
                <Sparkles className="w-2.5 h-2.5" />
                AI Caption
              </span>
            )}
          </div>

          {reel.saved_at && (
            <span className="text-[11px] text-[#737373] flex items-center gap-1 font-mono">
              <Calendar className="w-3 h-3 text-[#666666]" />
              {reel.saved_at}
            </span>
          )}
        </div>

        {/* Page Title: What the content is actually about */}
        <h3 className="text-sm font-semibold text-[#f0f0f0] group-hover:text-white leading-snug mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Notion Properties Pills: Category & Author */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          {reel.category && (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded border ${getCategoryBadgeClass(
                reel.category
              )}`}
            >
              {reel.category}
            </span>
          )}

          {username && (
            <span className="text-[11px] text-[#8e8e8e] px-1.5 py-0.5 rounded bg-[#181818] border border-[#2c2c2c] truncate max-w-[140px] font-mono">
              {username}
            </span>
          )}
        </div>

        {/* Caption Snippet (Cleaned of CTAs) */}
        <p className="text-xs text-[#8c8c8c] line-clamp-3 leading-relaxed mb-3">
          {snippet}
        </p>

        {/* Hashtags */}
        {reel.hashtags && reel.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {reel.hashtags.slice(0, 4).map((tag, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick(tag);
                }}
                className="text-[10px] text-[#777777] hover:text-[#d0d0d0] px-1.5 py-0.5 rounded bg-[#1a1a1a] hover:bg-[#2c2c2c] transition-colors"
              >
                #{tag}
              </button>
            ))}
            {reel.hashtags.length > 4 && (
              <span className="text-[10px] text-[#555555] self-center">
                +{reel.hashtags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Notion Card Footer */}
      <div className="pt-2.5 border-t border-[#292929] flex items-center justify-between text-xs text-[#8c8c8c]">
        {/* Open Notion Page View */}
        <span className="text-[11px] text-[#7a7a7a] group-hover:text-sky-300 flex items-center gap-1 transition-colors">
          <Sparkles className="w-3 h-3 text-[#7a7a7a] group-hover:text-sky-400 transition-colors" />
          <span>Open page & AI summary</span>
        </span>

        <div className="flex items-center gap-1">
          {/* Copy link */}
          <button
            onClick={handleCopy}
            className="p-1 rounded text-[#777777] hover:text-[#e0e0e0] hover:bg-[#2d2d2d] transition-colors cursor-pointer"
            title="Copy link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Instagram link */}
          <a
            href={reel.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded text-[#777777] hover:text-[#e0e0e0] hover:bg-[#2d2d2d] transition-colors cursor-pointer"
            title="Open on Instagram"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
