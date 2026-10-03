import { Video, Image } from 'lucide-react';
import type { ReelItem } from '../types';

interface NotionTableProps {
  reels: ReelItem[];
  onOpen: (reel: ReelItem) => void;
  onTagClick: (tag: string) => void;
}

export const NotionTable: React.FC<NotionTableProps> = ({ reels, onOpen, onTagClick }) => {
  return (
    <div className="w-full overflow-x-auto border border-[#2b2b2b] rounded-lg bg-[#1a1a1a]">
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
            const caption = reel.caption || 'Untitled post';
            const firstLine = caption.split('\n')[0].trim() || 'Untitled post';

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
                    <span className="truncate">{firstLine}</span>
                  </div>
                </td>

                {/* Category */}
                <td className="py-2.5 px-3">
                  {reel.category ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#262626] text-[#cccccc] border border-[#333333] whitespace-nowrap">
                      {reel.category}
                    </span>
                  ) : (
                    <span className="text-[#606060]">—</span>
                  )}
                </td>

                {/* Creator */}
                <td className="py-2.5 px-3 text-[#999999] truncate">
                  {reel.owner?.username ? `@${reel.owner.username}` : '—'}
                </td>

                {/* Format */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                      isReel
                        ? 'text-pink-400 bg-pink-950/30'
                        : 'text-cyan-400 bg-cyan-950/30'
                    }`}
                  >
                    {isReel ? <Video className="w-3 h-3" /> : <Image className="w-3 h-3" />}
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
