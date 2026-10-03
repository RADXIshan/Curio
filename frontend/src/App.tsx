import React, { useEffect, useState, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { NotionHeader } from './components/NotionHeader';
import { NotionCard } from './components/NotionCard';
import { NotionTable } from './components/NotionTable';
import { NotionBoard } from './components/NotionBoard';
import { NotionPageModal } from './components/NotionPageModal';
import { NotionAIChat } from './components/NotionAIChat';
import { fetchReels, fetchStats, triggerExtraction } from './services/api';
import type { ReelItem, StatsResponse } from './types';
import { Loader2, Inbox } from 'lucide-react';

export const App: React.FC = () => {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Layout & View states
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'gallery' | 'table' | 'board'>('gallery');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [activeReel, setActiveReel] = useState<ReelItem | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [limit, setLimit] = useState<number>(60);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadStats = async () => {
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (err: any) {
      console.warn('Could not load stats:', err);
    }
  };

  const loadReels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchReels({
        type: selectedType,
        category: selectedCategory,
        tag: selectedTag,
        search: searchQuery,
        limit,
        offset: 0,
      });
      setReels(data.items);
      setTotalCount(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load items.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadReels();
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedType, selectedCategory, selectedTag, limit]);

  // Keyboard shortcut listener: "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedTag('');
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await triggerExtraction();
      setSyncToast(`Synced ${res.count} posts from saved_posts.html!`);
      setTimeout(() => setSyncToast(null), 3500);
      await loadStats();
      await loadReels();
    } catch (err: any) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#191919] text-[#e0e0e0] flex font-sans selection:bg-[#3d3d3d]">
      {/* Notion Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        categories={stats?.categories || []}
        topTags={stats?.top_tags || []}
        totalCount={stats?.total || totalCount}
        reelsCount={stats?.reels_count || 0}
        postsCount={stats?.posts_count || 0}
        onOpenChat={() => setIsChatOpen(true)}
        onSync={handleSync}
        isSyncing={isSyncing}
        onFocusSearch={() => searchInputRef.current?.focus()}
      />

      {/* Main Workspace Canvas */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#191919]">
        {/* Sync Toast */}
        {syncToast && (
          <div className="bg-[#242424] border-b border-[#333333] text-purple-300 py-1.5 px-4 text-center text-xs font-mono">
            {syncToast}
          </div>
        )}

        {/* Notion Page Header */}
        <NotionHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          activeCategory={selectedCategory}
          activeType={selectedType}
          activeTag={selectedTag}
          totalFiltered={totalCount}
          totalCount={stats?.total || totalCount}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onResetFilters={handleResetFilters}
          onOpenChat={() => setIsChatOpen(true)}
          searchRef={searchInputRef}
        />

        {/* Canvas Body */}
        <main className="flex-1 px-6 sm:px-10 py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#808080] gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <p className="text-xs text-[#999999]">Loading database view...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-lg bg-[#241717] border border-[#3d2323] text-center space-y-2 max-w-lg mx-auto my-8">
              <p className="text-xs text-rose-300">{error}</p>
              <button
                onClick={() => loadReels()}
                className="px-3 py-1 text-xs rounded bg-[#2e1d1d] hover:bg-[#382323] text-rose-200 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : reels.length === 0 ? (
            <div className="p-12 text-center space-y-3 max-w-md mx-auto my-12 border border-[#2b2b2b] rounded-lg bg-[#1c1c1c]">
              <div className="w-10 h-10 rounded-full bg-[#262626] text-[#707070] flex items-center justify-center mx-auto">
                <Inbox className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#f0f0f0]">No pages in this view</h3>
              <p className="text-xs text-[#808080]">
                No saved posts match your current search or category filter.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 text-xs rounded bg-[#2a2a2a] hover:bg-[#333333] text-white transition-colors cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Gallery View */}
              {viewMode === 'gallery' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                  {reels.map((reel) => (
                    <NotionCard
                      key={reel.id}
                      reel={reel}
                      onOpen={setActiveReel}
                      onTagClick={(tag) => setSelectedTag(tag)}
                    />
                  ))}
                </div>
              )}

              {/* Table View */}
              {viewMode === 'table' && (
                <NotionTable
                  reels={reels}
                  onOpen={setActiveReel}
                  onTagClick={(tag) => setSelectedTag(tag)}
                />
              )}

              {/* Board View */}
              {viewMode === 'board' && (
                <NotionBoard
                  reels={reels}
                  categories={stats?.categories || []}
                  onOpen={setActiveReel}
                  onTagClick={(tag) => setSelectedTag(tag)}
                />
              )}

              {/* Pagination Load More */}
              {reels.length < totalCount && (
                <div className="flex justify-center pt-4 pb-12">
                  <button
                    onClick={() => setLimit((prev) => prev + 30)}
                    className="px-4 py-2 text-xs font-medium bg-[#222222] hover:bg-[#2a2a2a] text-[#cccccc] hover:text-white border border-[#2e2e2e] rounded-md transition-colors cursor-pointer"
                  >
                    Load more ({totalCount - reels.length} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Notion Page Modal */}
      <NotionPageModal
        reel={activeReel}
        onClose={() => setActiveReel(null)}
      />

      {/* Notion AI Chat Assistant */}
      <NotionAIChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onSelectReel={(reel) => {
          setActiveReel(reel);
        }}
      />
    </div>
  );
};

export default App;