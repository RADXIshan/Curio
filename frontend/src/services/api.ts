import type { AISummary, ReelItem, ReelsListResponse, StatsResponse } from '../types';

const envUrl = import.meta.env.VITE_API_URL;
const API_BASE = envUrl ? `${envUrl.replace(/\/$/, '')}/api` : '/api';

export async function fetchReels(params: {
  type?: string;
  category?: string;
  tag?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<ReelsListResponse> {
  const query = new URLSearchParams();
  if (params.type && params.type !== 'all') query.append('type', params.type);
  if (params.category && params.category !== 'all') query.append('category', params.category);
  if (params.tag) query.append('tag', params.tag);
  if (params.search) query.append('search', params.search);
  if (params.sort) query.append('sort', params.sort);
  query.append('limit', String(params.limit ?? 50));
  query.append('offset', String(params.offset ?? 0));

  const res = await fetch(`${API_BASE}/reels?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch reels: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE}/reels/stats`);
  if (!res.ok) {
    throw new Error(`Failed to fetch stats: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchReelById(id: string): Promise<ReelItem> {
  const res = await fetch(`${API_BASE}/reels/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch reel: ${res.statusText}`);
  }
  return res.json();
}

export async function summarizeReel(id: string): Promise<AISummary> {
  const res = await fetch(`${API_BASE}/ai/summarize/${id}`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to summarize reel: ${res.statusText}`);
  }
  return res.json();
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'model'; content: string }>
): Promise<{ reply: string; referenced_reels: ReelItem[] }> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    throw new Error(`Chat error: ${res.statusText}`);
  }
  return res.json();
}

export async function triggerExtraction(): Promise<{ status: string; count: number; message: string }> {
  const res = await fetch(`${API_BASE}/reels/extract`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Extraction failed: ${res.statusText}`);
  }
  return res.json();
}
