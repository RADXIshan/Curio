import type { ReelItem } from '../types';

const CLICKBAIT_PATTERNS = [
  /^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|•|\s)*comment\b/i,
  /^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|•|\s)*dm\b/i,
  /^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|•|\s)*follow\b/i,
  /^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|•|\s)*save\b/i,
  /^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|•|\s)*share\b/i,
  /^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|•|\s)*link in bio\b/i,
  /^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|•|\s)*drop a\b/i,
  /^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|•|\s)*type\b/i,
  /^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|•|\s)*want the\b/i,
  /^(?:👉|🚀|🔥|⚡|✨|👇|💡|📌|✅|✔️|\*|-|•|\s)*send me\b/i,
];

const CTA_TRANSFORMS: Array<[RegExp, string]> = [
  [/comment\s+["“']?git["”']?\s+to\s+get\s+(?:the\s+)?(?:full\s+)?pdf\s+guide/i, 'Complete Git & Version Control PDF Guide'],
  [/comment\s+["“']?agent["”']?\s+for\s+(?:the\s+)?setup\s+guide/i, 'AI Agent Architecture & Setup Guide'],
  [/comment\s+["“']?exam["”']?\s+and\s+i['’]?ll\s+send\s+over\s+all\s+(?:the\s+)?links/i, 'Tech & Coding Exam Preparation Resources'],
  [/comment\s+["“']?google["”']?\s+and\s+i['’]?ll\s+send\s+over\s+all\s+(?:the\s+)?links/i, 'Google Developer Tools & Learning Resources'],
  [/comment\s+["“']?ai["”']?\s+to\s+get\s+(?:the\s+)?link/i, 'Building Neural Networks & Perceptrons from Scratch'],
  [/comment\s+["“']?python["”']?\s+to\s+get\s+(?:the\s+)?links/i, '5 Practical Python Projects for Real-World Skills'],
  [/comment\s+["“']?repo["”']?\s+and\s+i['’]?ll\s+send\s+you\s+all\s+5\s+links/i, '5 Essential GitHub Repositories for Developers'],
  [/comment\s+["“']?games["”']?\s+and\s+i['’]?ll\s+send\s+you\s+all\s+the\s+links/i, 'Interactive Coding Games to Master AI & Reinforcement Learning'],
  [/comment\s+["“']?system["”']?\s+for\s+(?:the\s+)?(?:full\s+)?guide/i, 'System Design Interview & Architecture Guide'],
  [/comment\s+["“']?code["”']?\s+for\s+(?:the\s+)?source\s+code/i, 'Source Code & Project Implementation Guide'],
  [/comment\s+["“']?roadmap["”']?\s+for\s+(?:the\s+)?guide/i, 'Complete Software Engineering Learning Roadmap'],
];

export function cleanLeadingJunk(text: string): string {
  return text.replace(/^[•\-\*👉✔️✅🚀🔥⚡💡📌👇💬😎❤️\d\.\)\s]+/, '').trim();
}

export function isClickbaitLine(line: string): boolean {
  const cleaned = cleanLeadingJunk(line);
  return CLICKBAIT_PATTERNS.some((pattern) => pattern.test(cleaned));
}

/**
 * Extracts a content-first, informative title for any reel or post.
 * Replaces creator clickbait like "Comment for..." or "Save this..."
 * with what the content actually teaches.
 */
export function getReelTitle(reel: ReelItem): string {
  // If backend provided a clean title that is not clickbait, use it
  if (reel.title && !isClickbaitLine(reel.title)) {
    return cleanLeadingJunk(reel.title);
  }

  const caption = reel.caption?.trim() || '';
  const author = reel.owner?.name || reel.owner?.username || 'Creator';
  const category = reel.category || 'Tech Guide';

  if (!caption) {
    return `${author}: ${category}`;
  }

  // Check specific CTA transforms
  const firstSnippet = caption.slice(0, 300);
  for (const [regex, replacement] of CTA_TRANSFORMS) {
    if (regex.test(firstSnippet)) {
      return replacement;
    }
  }

  const lines = caption.split('\n').map((l) => l.trim()).filter(Boolean);

  let candidate = '';
  for (const line of lines) {
    const cleaned = cleanLeadingJunk(line);
    if (!cleaned) continue;
    if (cleaned.startsWith('#') || cleaned.startsWith('http') || cleaned.startsWith('www.')) continue;
    if (isClickbaitLine(cleaned)) continue;
    if (cleaned.length < 8 && lines.length > 2) continue;

    candidate = cleaned;
    break;
  }

  if (!candidate) {
    for (const line of lines) {
      const cleaned = cleanLeadingJunk(line);
      if (cleaned.length > 15 && !cleaned.startsWith('#') && !cleaned.startsWith('http')) {
        candidate = cleaned;
        break;
      }
    }
  }

  if (!candidate && lines.length > 0) {
    candidate = cleanLeadingJunk(lines[0]);
  }

  if (candidate) {
    // Strip trailing CTA like "...👉 comment below for links"
    candidate = candidate.replace(/(?:👉|👇)?\s*(?:follow|comment|dm|save|share|link in bio).*$/i, '').trim();
    candidate = cleanLeadingJunk(candidate);
    candidate = candidate.replace(/[•\-\*👉✔️✅🚀🔥⚡💡📌👇💬😎❤️]+$/, '').trim();

    if (candidate.length > 70) {
      const truncated = candidate.slice(0, 68);
      const lastSpace = truncated.lastIndexOf(' ');
      candidate = lastSpace > 35 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
    }

    if (candidate.length >= 4) {
      return candidate;
    }
  }

  return `${author}: ${category}`;
}

/**
 * Returns a clean preview snippet of the caption, skipping leading CTAs
 * so the card preview shows actual substance.
 */
export function getCleanCaptionSnippet(caption?: string | null): string {
  if (!caption || !caption.trim()) {
    return 'No caption provided.';
  }

  const lines = caption.split('\n').map((l) => l.trim()).filter(Boolean);
  const substantiveLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('http')) continue;
    if (isClickbaitLine(line)) continue;
    substantiveLines.push(line);
  }

  if (substantiveLines.length > 0) {
    return substantiveLines.join(' ');
  }

  return caption;
}
