/**
 * Converts text containing raw markdown syntax (###, ##, ***, **, etc.)
 * into clean, natural human-readable prose and bullet points.
 */
export function toNormalText(text?: string | null): string {
  if (!text) return '';

  let cleaned = text;

  // Remove markdown headers: '### Heading' -> 'Heading'
  cleaned = cleaned.replace(/^(?:#{1,6}\s*)(.*?)$/gm, '$1');

  // Remove horizontal rules or isolated asterisk lines: '***', '---'
  cleaned = cleaned.replace(/^\s*[\*\-_]{3,}\s*$/gm, '');

  // Remove bold-italic: ***text*** -> text
  cleaned = cleaned.replace(/\*{3}(.*?)\*{3}/g, '$1');

  // Remove bold: **text** -> text
  cleaned = cleaned.replace(/\*{2}(.*?)\*{2}/g, '$1');

  // Remove single asterisks or underscores for italics: *text* -> text, _text_ -> text
  cleaned = cleaned.replace(/(?<!\*)\*([^\*\n]+?)\*(?!\*)/g, '$1');
  cleaned = cleaned.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '$1');

  // Convert markdown bullet points: '* item' or '- item' -> '• item'
  cleaned = cleaned.replace(/^\s*[\*\-]\s+/gm, '• ');

  // Remove inline backticks: `code` -> code
  cleaned = cleaned.replace(/\`{1,3}(.*?)\`{1,3}/g, '$1');

  // Remove raw markdown links: [Label](url) -> Label (url)
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');

  // Normalize excess blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}
