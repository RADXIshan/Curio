import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Terminal,
  ArrowRight,
  Loader2,
  User,
  Calendar,
  Tag,
  Link2,
  Bookmark,
} from 'lucide-react';
import type { AISummary, ReelItem } from '../types';
import { summarizeReel } from '../services/api';
import { getReelTitle } from '../utils/titleUtils';

interface NotionPageModalProps {
  reel: ReelItem | null;
  onClose: () => void;
}

export const NotionPageModal: React.FC<NotionPageModalProps> = ({ reel, onClose }) => {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reel) {
      setSummary(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    summarizeReel(reel.id)
      .then((data) => {
        if (isMounted) setSummary(data);
      })
      .catch((err) => {
        console.error('Failed to get summary:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!reel) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(reel.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const caption = reel.caption || 'No caption available.';
  const title = getReelTitle(reel);
  const isReel = reel.type === 'reel';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-[#1f1f1f] text-[#dedede] border border-[#2d2d2d] rounded-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Notion Top Action Bar */}
        <div className="sticky top-0 z-10 px-6 py-2.5 bg-[#1f1f1f]/95 backdrop-blur-md border-b border-[#2b2b2b] flex items-center justify-between text-xs text-[#8c8c8c]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#777777]">ID: {reel.id}</span>
            {reel.caption_generated && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1 font-mono">
                <Sparkles className="w-3 h-3 text-sky-400" />
                AI Generated Caption
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-[#2c2c2c] hover:text-[#e0e0e0] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy link'}</span>
            </button>

            <a
              href={reel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-[#2c2c2c] hover:text-[#e0e0e0] transition-colors"
            >
              <span>Instagram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#2c2c2c] hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Page Content Body */}
        <div className="px-8 sm:px-12 py-8 space-y-6">
          {/* Notion Page Icon & Title */}
          <div className="space-y-3">
            <div className="text-4xl select-none">{isReel ? '🎬' : '📸'}</div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#f4f4f4] leading-snug">
              {title}
            </h1>

            {reel.caption_generated && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-sky-950/40 border border-sky-500/30 text-xs text-sky-200">
                <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sky-300">AI Synthesized Technical Caption</p>
                  <p className="text-[11px] text-sky-200/80 leading-relaxed mt-0.5">
                    This post originally did not contain a text caption in the Instagram export. Curio AI synthesized this technical breakdown and concepts based on the creator&apos;s verified domain and profile.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Notion Properties Grid */}
          <div className="py-2 border-y border-[#292929] space-y-2 text-xs">
            {/* Creator Property */}
            <div className="grid grid-cols-[130px_1fr] items-center gap-2">
              <span className="text-[#757575] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Creator</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[#ededed] font-medium">
                  {reel.owner?.name || reel.owner?.username || 'Creator'}
                </span>
                {reel.owner?.username && (
                  <span className="text-[11px] text-sky-400 font-mono">@{reel.owner.username}</span>
                )}
              </div>
            </div>

            {/* Category Property */}
            <div className="grid grid-cols-[130px_1fr] items-center gap-2">
              <span className="text-[#757575] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Category</span>
              </span>
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#242424] text-[#cccccc] border border-[#333333]">
                  {reel.category || 'General Tech'}
                </span>
              </div>
            </div>

            {/* Format Property */}
            <div className="grid grid-cols-[130px_1fr] items-center gap-2">
              <span className="text-[#757575] flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5" />
                <span>Format</span>
              </span>
              <span className={`capitalize font-medium ${isReel ? 'text-rose-300' : 'text-cyan-300'}`}>
                {reel.type === 'reel' ? 'Video Reel' : 'Post / Carousel'}
              </span>
            </div>

            {/* Date Saved Property */}
            {reel.saved_at && (
              <div className="grid grid-cols-[130px_1fr] items-center gap-2">
                <span className="text-[#757575] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date Saved</span>
                </span>
                <span className="text-[#999999] font-mono text-[11px]">{reel.saved_at}</span>
              </div>
            )}

            {/* URL Property */}
            <div className="grid grid-cols-[130px_1fr] items-center gap-2">
              <span className="text-[#757575] flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                <span>Source Link</span>
              </span>
              <a
                href={reel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline underline-offset-2 truncate"
              >
                {reel.url}
              </a>
            </div>
          </div>

          {/* Gemini AI Callout Box (Rich Sapphire / Sky Blue Notion Style - NO Purple) */}
          <div className="p-5 rounded-lg border border-sky-900/40 bg-[#161a24] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-200">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Gemini AI Summary & Takeaways</span>
              </div>
              {summary?.category && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">
                  {summary.category}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-sky-200/80 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>Curating insights with Google Gemini...</span>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-[#d0d0d0]">
                {/* One line summary */}
                {summary?.one_line_summary && (
                  <p className="p-3.5 rounded-md bg-[#13161f] border border-sky-500/20 text-[#e6edf8] leading-relaxed">
                    {summary.one_line_summary}
                  </p>
                )}

                {/* Key Takeaways */}
                {summary?.key_takeaways && summary.key_takeaways.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Key Takeaways
                    </h4>
                    <ul className="space-y-1 pl-1">
                      {summary.key_takeaways.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[#cccccc] leading-relaxed">
                          <span className="text-sky-400 font-bold">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Resources Mentioned */}
                {summary?.resources_mentioned && summary.resources_mentioned.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <h4 className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      Mentioned Resources & Frameworks
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.resources_mentioned.map((res, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950/40 text-cyan-300 border border-cyan-800/40"
                        >
                          {res}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Item */}
                {summary?.action_item && (
                  <div className="p-2.5 rounded-md bg-amber-950/30 border border-amber-500/30 flex items-center gap-2 text-[11px] text-amber-200">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-semibold text-amber-300">Next Action: </span>
                      {summary.action_item}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document Content / Original Caption */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-semibold text-[#808080] uppercase tracking-wider">
              Post Content
            </h3>
            <div className="p-4 rounded-lg bg-[#181818] border border-[#2b2b2b] text-xs text-[#cccccc] leading-relaxed whitespace-pre-line font-sans">
              {caption}
            </div>
          </div>

          {/* Hashtags Footer */}
          {reel.hashtags && reel.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#292929]">
              {reel.hashtags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[11px] text-[#7a7a7a] bg-[#1c1c1c] border border-[#2b2b2b]"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
