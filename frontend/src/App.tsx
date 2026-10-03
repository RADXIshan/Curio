import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { FilterControls } from './components/FilterControls';
import { ReelCard } from './components/ReelCard';
import { ReelDetailModal } from './components/ReelDetailModal';
import { ChatBotDrawer } from './components/ChatBotDrawer';
import { fetchReels, fetchStats, triggerExtraction } from './services/api';
import type { ReelItem, StatsResponse } from './types';
import { Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [limit, setLimit] = useState<number>(60);

  // Modals & Drawers
  const [activeReel, setActiveReel] = useState<ReelItem | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Load stats once on mount
  const loadStats = async () => {
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (err: any) {
      console.warn('Could not load stats:', err);
    }
  };

  // Load reels whenever filters change
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
      setError(err.message || 'Failed to load reels.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Debounced filter effect
  useEffect(() => {
    const handler = setTimeout(() => {
      loadReels();
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedType, selectedCategory, selectedTag, limit]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedTag('');
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await triggerExtraction();
      setSyncMessage(`Successfully synced ${result.count} posts!`);
      setTimeout(() => setSyncMessage(null), 3000);
      await loadStats();
      await loadReels();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        totalCount={stats?.total || totalCount}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      {/* Sync Success Toast Banner */}
      {syncMessage && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 py-2 px-4 text-center text-xs font-medium animate-in fade-in">
          {syncMessage}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Banner / Overview */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/60 border border-indigo-500/20 shadow-2xl mb-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personal Knowledge Hub</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Explore & Query Your Saved Instagram Collection
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Curio automatically categorizes your saved reels and posts into actionable knowledge. Use Gemini AI to generate instant summaries, extract code repositories, or chat with your collection.
            </p>
          </div>
        </div>

        {/* Dashboard Statistics Bar */}
        <StatsBar stats={stats} />

        {/* Search & Interactive Filter Controls */}
        <FilterControls
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
          categories={stats?.categories || []}
          topTags={stats?.top_tags || []}
          onReset={handleResetFilters}
          totalFiltered={totalCount}
        />

        {/* Content State: Loading, Error, Empty, or Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium text-slate-300">Curating your saved posts...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3 my-8">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-sm text-rose-200 font-medium">{error}</p>
            <button
              onClick={() => loadReels()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : reels.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center space-y-4 my-8 border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No saved posts match your criteria</h3>
              <p className="text-xs text-slate-400 mt-1">
                Try searching with different keywords or clearing your active filters.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Grid of Reels & Posts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {reels.map((reel) => (
                <ReelCard
                  key={reel.id}
                  reel={reel}
                  onOpenDetail={setActiveReel}
                  onOpenSummary={setActiveReel}
                  onTagClick={(tag) => setSelectedTag(tag)}
                />
              ))}
            </div>

            {/* Load More Button if more posts are available */}
            {reels.length < totalCount && (
              <div className="flex justify-center pt-4 pb-8">
                <button
                  onClick={() => setLimit((prev) => prev + 30)}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-md"
                >
                  Load More Posts ({totalCount - reels.length} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Detail & AI Summary Modal */}
      <ReelDetailModal
        reel={activeReel}
        onClose={() => setActiveReel(null)}
      />

      {/* Floating AI Chat Assistant Trigger Button (Bottom Right) */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 animate-spin" />
          <span className="text-xs font-semibold">Ask Curio AI</span>
        </button>
      )}

      {/* Slide-over Curio AI Chatbot Drawer */}
      <ChatBotDrawer
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