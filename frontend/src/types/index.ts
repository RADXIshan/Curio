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

export interface ReelItem {
  id: string;
  type: 'reel' | 'post';
  url: string;
  caption?: string | null;
  category?: string;
  hashtags: string[];
  owner: OwnerInfo;
  brand_partner?: BrandPartnerInfo | null;
  saved_at?: string | null;
  saved_at_iso?: string | null;
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
