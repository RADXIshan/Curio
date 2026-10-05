import { Video, Image, Sparkles } from 'lucide-react';
import type { ReelItem } from '../types';
import { getReelTitle } from '../utils/titleUtils';

interface NotionTableProps {
  reels: ReelItem[];
  onOpen: (reel: ReelItem) => void;
  onTagClick: (tag: string) => void;
}

const getCategoryBadgeClass = (category?: string) => {
  switch (category) {
    case 'AI & Agents':
      return 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40';
    case 'System Design & Backend':
      return 'bg-blue-950/50 text-blue-300 border-blue-800/40';
    case 'DSA & Problem Solving':
    case 'DSA & Coding Prep':
      return 'bg-purple-950/50 text-purple-300 border-purple-800/40';
    case 'Python & Data Science':
      return 'bg-teal-950/50 text-teal-300 border-teal-800/40';
    case 'DevOps & Cloud':
      return 'bg-amber-950/50 text-amber-300 border-amber-800/40';
    case 'Career & Internships':
    case 'Career & Coding Prep':
      return 'bg-rose-950/50 text-rose-300 border-rose-800/40';
    case 'Web & Frontend':
      return 'bg-cyan-950/50 text-cyan-300 border-cyan-800/40';
    case 'Dev Tools & Repos':
    case 'Dev Tools & Resources':
    case 'Dev Tools & Open Source':
      return 'bg-orange-950/50 text-orange-300 border-orange-800/40';
    case 'Hackathons & Projects':
      return 'bg-yellow-950/50 text-yellow-300 border-yellow-800/40';
    case 'Productivity & Learning':
      return 'bg-indigo-950/50 text-indigo-300 border-indigo-800/40';
    case 'Health, Lifestyle & Interests':
      return 'bg-pink-950/50 text-pink-300 border-pink-800/40';
    default:
      return 'bg-[#262626] text-[#cccccc] border-[#383838]';
  }
};

export const NotionTable: React.FC<NotionTableProps> = ({ reels, onOpen, onTagClick }) => {
  return (
    <div className="w-full overflow-x-auto border border-[#2b2b2b] rounded-xl bg-[#1a1a1a]">
      <table className="w-full text-left text-xs text-[#d4d4d4] border-collapse">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-[#2b2b2b] bg-[#161616] text-[#7a7a7a] font-normal uppercase text-[11px] tracking-wider">
            <th className="py-2.5 px-4 font-medium w-[40%]">Post / Title</th>
            <th className="py-2.5 px-3 font-medium w-[12%]">Category</th>
            <th className="py-2.5 px-3 font-medium w-[12%]">Creator</th>
            <th className="py-2.5 px-3 font-medium w-[10%]">Format</th>
            <th className="py-2.5 px-3 font-medium w-[16%]">Tags</th>
            <th className="py-2.5 px-3 font-medium w-[10%]">Date</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-[#262626]">
          {reels.map((reel) => {
            const isReel = reel.type === 'reel';
            const title = getReelTitle(reel);

            return (
              <tr
                key={reel.id}
                onClick={() => onOpen(reel)}
                className="hover:bg-[#232323] transition-colors cursor-pointer group"
              >
                {/* Title */}
                <td className="py-2.5 px-4 font-medium text-[#ededed] group-hover:text-white">
                  <div className="flex items-center gap-2 max-w-lg">
                    <span className="text-sm shrink-0">{isReel ? '🎬' : '📸'}</span>
                    <span className="truncate">{title}</span>
                    {reel.search_meta && (
                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40 shrink-0 flex items-center gap-1 font-mono">
                        <Sparkles className="w-2.5 h-2.5 text-sky-400" />
                        {Math.round(reel.search_meta.score || 0)}pts
                      </span>
                    )}
                    {reel.caption_generated && (
                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/25 shrink-0 flex items-center gap-0.5 font-mono">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI
                      </span>
                    )}
                  </div>
                </td>

                {/* Category */}
                <td className="py-2.5 px-3">
                  {reel.category ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${getCategoryBadgeClass(reel.category)}`}>
                      {reel.category}
                    </span>
                  ) : (
                    <span className="text-[#606060]">—</span>
                  )}
                </td>

                {/* Creator */}
                <td className="py-2.5 px-3 text-[#999999] truncate font-mono text-[11px]">
                  {reel.owner?.username ? `@${reel.owner.username}` : '—'}
                </td>

                {/* Format */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                      isReel
                        ? 'text-rose-300 bg-rose-950/40 border-rose-800/40'
                        : 'text-cyan-300 bg-cyan-950/40 border-cyan-800/40'
                    }`}
                  >
                    {isReel ? <Video className="w-3 h-3 text-rose-400" /> : <Image className="w-3 h-3 text-cyan-400" />}
                    <span>{isReel ? 'Reel' : 'Post'}</span>
                  </span>
                </td>

                {/* Tags */}
                <td className="py-2.5 px-3">
                  <div className="flex flex-wrap gap-1 max-w-[200px] overflow-hidden max-h-6">
                    {reel.hashtags && reel.hashtags.length > 0 ? (
                      reel.hashtags.slice(0, 2).map((t, idx) => (
                        <span
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTagClick(t);
                          }}
                          className="text-[10px] text-[#7a7a7a] hover:text-[#d0d0d0] px-1 rounded bg-[#202020] hover:bg-[#2c2c2c] cursor-pointer"
                        >
                          #{t}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#606060]">—</span>
                    )}
                  </div>
                </td>

                {/* Date */}
                <td className="py-2.5 px-3 text-[11px] text-[#737373] font-mono whitespace-nowrap">
                  {reel.saved_at || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
