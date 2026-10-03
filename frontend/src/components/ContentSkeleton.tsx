import React from 'react';

interface ContentSkeletonProps {
  viewMode: 'gallery' | 'table';
  count?: number;
}

export const ContentSkeleton: React.FC<ContentSkeletonProps> = ({ viewMode, count = 6 }) => {
  if (viewMode === 'table') {
    return (
      <div className="w-full overflow-x-auto border border-[#2b2b2b] rounded-xl bg-[#1a1a1a] animate-pulse">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#2b2b2b] bg-[#161616] text-[#666666] uppercase text-[11px] tracking-wider">
              <th className="py-2.5 px-4 font-medium w-[40%]">Post / Title</th>
              <th className="py-2.5 px-3 font-medium w-[12%]">Category</th>
              <th className="py-2.5 px-3 font-medium w-[12%]">Creator</th>
              <th className="py-2.5 px-3 font-medium w-[10%]">Format</th>
              <th className="py-2.5 px-3 font-medium w-[16%]">Tags</th>
              <th className="py-2.5 px-3 font-medium w-[10%]">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {Array.from({ length: count }).map((_, idx) => (
              <tr key={idx} className="h-12">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded skeleton-shimmer shrink-0" />
                    <div
                      className="h-3.5 rounded skeleton-shimmer"
                      style={{ width: `${60 + (idx % 4) * 10}%` }}
                    />
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="w-20 h-5 rounded-md skeleton-shimmer" />
                </td>
                <td className="py-3 px-3">
                  <div className="w-16 h-3 rounded skeleton-shimmer" />
                </td>
                <td className="py-3 px-3">
                  <div className="w-12 h-5 rounded skeleton-shimmer" />
                </td>
                <td className="py-3 px-3">
                  <div className="flex gap-1">
                    <div className="w-10 h-4 rounded skeleton-shimmer" />
                    <div className="w-8 h-4 rounded skeleton-shimmer" />
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="w-14 h-3 rounded skeleton-shimmer" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Gallery Skeleton Grid
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-[#202020] border border-[#2b2b2b] rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-xs"
        >
          <div className="space-y-3">
            {/* Header: Format badge & Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md skeleton-shimmer" />
                <div className="w-12 h-4 rounded skeleton-shimmer" />
              </div>
              <div className="w-16 h-3 rounded skeleton-shimmer" />
            </div>

            {/* Title lines */}
            <div className="space-y-1.5 pt-1">
              <div
                className="h-4 rounded skeleton-shimmer"
                style={{ width: `${80 + (idx % 3) * 8}%` }}
              />
              <div
                className="h-4 rounded skeleton-shimmer"
                style={{ width: `${55 + (idx % 4) * 10}%` }}
              />
            </div>

            {/* Property Pills */}
            <div className="flex items-center gap-2 pt-1">
              <div className="w-24 h-5 rounded-md skeleton-shimmer" />
              <div className="w-16 h-5 rounded-md skeleton-shimmer" />
            </div>

            {/* Caption snippet lines */}
            <div className="space-y-1.5 pt-1">
              <div className="h-3 rounded skeleton-shimmer w-full" />
              <div className="h-3 rounded skeleton-shimmer w-4/5" />
            </div>
          </div>

          {/* Card footer */}
          <div className="pt-3 border-t border-[#272727] flex items-center justify-between">
            <div className="w-28 h-3 rounded skeleton-shimmer" />
            <div className="w-12 h-3 rounded skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContentSkeleton;
