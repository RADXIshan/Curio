import React, { useEffect, useState } from 'react';
import { X, Brain, ExternalLink, Copy, Check, CheckCircle2, Terminal, ArrowRight, Loader2 } from 'lucide-react';
import type { AISummary, ReelItem } from '../types';
import { summarizeReel } from '../services/api';

interface ReelDetailModalProps {
  reel: ReelItem | null;
  onClose: () => void;
}

export const ReelDetailModal: React.FC<ReelDetailModalProps> = ({ reel, onClose }) => {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reel) {
      setSummary(null);
      return;
    }

    // Auto-fetch summary when modal opens
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

  // Handle ESC key to close modal
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 relative space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pr-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-md">
              {(reel.owner?.name || reel.owner?.username || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {reel.owner?.name || reel.owner?.username || 'Creator'}
              </h2>
              {reel.owner?.username && (
                <p className="text-xs text-indigo-400">@{reel.owner.username}</p>
              )}
              <span className="text-[11px] text-slate-500">{reel.saved_at}</span>
            </div>
          </div>
        </div>

        {/* Gemini AI Insights Section */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-purple-950/30 border border-indigo-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span>Gemini AI Insights & Summary</span>
            </div>
            {summary?.category && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {summary.category}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Analyzing reel content with Gemini...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* One line summary */}
              {summary?.one_line_summary && (
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-indigo-500/20">
                  {summary.one_line_summary}
                </p>
              )}

              {/* Key Takeaways */}
              {summary?.key_takeaways && summary.key_takeaways.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Key Takeaways
                  </h4>
                  <ul className="space-y-1.5">
                    {summary.key_takeaways.map((point, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resources Mentioned */}
              {summary?.resources_mentioned && summary.resources_mentioned.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    Resources / Repos Mentioned
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.resources_mentioned.map((res, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono bg-cyan-950/40 text-cyan-300 border border-cyan-500/30"
                      >
                        {res}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Item */}
              {summary?.action_item && (
                <div className="p-3 rounded-xl bg-purple-900/20 border border-purple-500/30 flex items-center gap-2.5 text-xs text-purple-200">
                  <ArrowRight className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-purple-300">Action: </span>
                    {summary.action_item}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Original Caption */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Original Post Caption
          </h4>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
            {reel.caption || 'No caption provided.'}
          </div>
        </div>

        {/* Hashtags */}
        {reel.hashtags && reel.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reel.hashtags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-900 text-slate-400 border border-slate-800"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied!' : 'Copy Instagram Link'}</span>
          </button>

          <a
            href={reel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white shadow-md transition-all cursor-pointer"
          >
            <span>Open on Instagram</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
