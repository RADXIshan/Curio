import React, { useState } from 'react';
import { ExternalLink, Sparkles, Copy, Check, Video, Image, Calendar, UserCheck } from 'lucide-react';
import type { ReelItem } from '../types';

interface ReelCardProps {
  reel: ReelItem;
  onOpenDetail?: (reel: ReelItem) => void;
  onOpenSummary: (reel: ReelItem) => void;
  onTagClick: (tag: string) => void;
}

export const ReelCard: React.FC<ReelCardProps> = ({
  reel,
  onOpenSummary,
  onTagClick,
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isReel = reel.type === 'reel';
  const ownerName = reel.owner?.name || reel.owner?.username || 'Creator';
  const ownerUsername = reel.owner?.username || '';
  const initial = (ownerName || ownerUsername || 'C').charAt(0).toUpperCase();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(reel.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Truncate long captions
  const captionText = reel.caption || 'No caption available.';
  const isLong = captionText.length > 220;
  const displayCaption = !expanded && isLong ? captionText.slice(0, 220) + '...' : captionText;

  // Category badge colors
  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case 'AI & Agents':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'System Design & Backend':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Python & Data Science':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'DevOps & Cloud':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Career & Internships':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Web & Frontend':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col justify-between group border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300">
      <div>
        {/* Top Header: Author + Post Type Badge */}
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar Initials */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/80 to-purple-600/80 flex items-center justify-center text-white font-bold text-xs shadow-inner shrink-0">
              {initial}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                {ownerName}
              </p>
              {ownerUsername && (
                <p className="text-[11px] text-slate-400 truncate">
                  @{ownerUsername}
                </p>
              )}
            </div>
          </div>

          {/* Type Badge (Reel vs Post) */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
              isReel
                ? 'bg-pink-500/15 text-pink-400 border-pink-500/30'
                : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            }`}
          >
            {isReel ? <Video className="w-3 h-3" /> : <Image className="w-3 h-3" />}
            {isReel ? 'Reel' : 'Post'}
          </span>
        </div>

        {/* AI Search Match Banner */}
        {reel.search_meta && (
          <div className="mb-3 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-between text-xs text-sky-300">
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="truncate text-[11px] font-medium">
                {reel.search_meta.match_reasons?.[0] || 'Smart Match'}
              </span>
            </div>
            {reel.search_meta.score !== undefined && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-200 shrink-0 ml-1.5 font-semibold">
                {Math.round(reel.search_meta.score)} pts
              </span>
            )}
          </div>
        )}

        {/* Category & Date Row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {reel.category && (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${getCategoryColor(reel.category)}`}>
              {reel.category}
            </span>
          )}

          {reel.saved_at && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar className="w-3 h-3" />
              {reel.saved_at}
            </span>
          )}
        </div>

        {/* Brand Partner Banner if present */}
        {reel.brand_partner?.username && (
          <div className="mb-3 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Partner: <strong>@{reel.brand_partner.username}</strong></span>
          </div>
        )}

        {/* Caption */}
        <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line mb-3">
          {displayCaption}
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-indigo-400 hover:text-indigo-300 text-[11px] font-medium ml-1.5 cursor-pointer underline underline-offset-2"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Hashtags Chips */}
        {reel.hashtags && reel.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {reel.hashtags.slice(0, 5).map((tag, idx) => (
              <button
                key={idx}
                onClick={() => onTagClick(tag)}
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900/90 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors border border-slate-800 cursor-pointer"
              >
                #{tag}
              </button>
            ))}
            {reel.hashtags.length > 5 && (
              <span className="text-[10px] text-slate-500 self-center">
                +{reel.hashtags.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
        {/* Summarize with Gemini Button */}
        <button
          onClick={() => onOpenSummary(reel)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 font-medium transition-all cursor-pointer text-[11px]"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Gemini AI</span>
        </button>

        <div className="flex items-center gap-1">
          {/* Copy Link */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Copy Instagram link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Open Instagram in new tab */}
          <a
            href={reel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-[11px]"
            title="Open post on Instagram"
          >
            <span>Instagram</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  );
};
