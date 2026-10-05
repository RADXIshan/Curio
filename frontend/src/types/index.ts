export interface OwnerInfo {
  name?: string | null;
  username?: string | null;
  url?: string | null;
}

export interface BrandPartnerInfo {
  name?: string | null;
  username?: string | null;
  url?: string | null;
}

export interface SearchMeta {
  score?: number;
  semantic_score?: number | null;
  match_reasons?: string[];
  matched_terms?: string[];
}

export interface ReelItem {
  id: string;
  type: 'reel' | 'post';
  url: string;
  title?: string | null;
  caption?: string | null;
  caption_generated?: boolean;
  category?: string;
  hashtags: string[];
  owner: OwnerInfo;
  brand_partner?: BrandPartnerInfo | null;
  saved_at?: string | null;
  saved_at_iso?: string | null;
  search_meta?: SearchMeta;
}

export interface SearchSuggestionItem {
  text: string;
  type: 'concept' | 'synonym' | 'title' | 'tag' | 'topic';
  category?: string;
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestionItem[];
  related_categories: string[];
}

export interface ReelsListResponse {
  total: number;
  offset: number;
  limit: number;
  count: number;
  items: ReelItem[];
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface TagCount {
  name: string;
  count: number;
}

export interface StatsResponse {
  total: number;
  reels_count: number;
  posts_count: number;
  categories: CategoryCount[];
  top_tags: TagCount[];
}

export interface AISummary {
  reel_id?: string;
  category?: string;
  one_line_summary?: string;
  key_takeaways?: string[];
  resources_mentioned?: string[];
  action_item?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  referenced_reels?: ReelItem[];
}

export interface SyncLogItem {
  time: string;
  message: string;
}

export interface SyncStatusResponse {
  status: 'idle' | 'running' | 'awaiting_otp' | 'extracting' | 'curating' | 'saving' | 'completed' | 'error';
  stage: string;
  awaiting_otp: boolean;
  otp_prompt?: string | null;
  error?: string | null;
  new_count: number;
  logs: SyncLogItem[];
}

