import type { KBEntry } from "./types.js";

export type ScoredEntry = KBEntry & { score: number };

/**
 * Tokenize a query string into lowercase search terms.
 * Splits on whitespace and common punctuation.
 */
function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s\-_,.:/!?(){}[\]"']+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * Score a single KB entry against search terms.
 * Weights: keywords (3x) > title (2x) > description (1x) > read_when (1x)
 */
function scoreEntry(entry: KBEntry, terms: string[]): number {
  let score = 0;
  const titleLower = entry.title.toLowerCase();
  const descLower = entry.description.toLowerCase();
  const readWhenLower = entry.read_when.map((r) => r.toLowerCase()).join(" ");
  const keywordsLower = entry.keywords.map((k) => k.toLowerCase()).join(" ");

  for (const term of terms) {
    if (keywordsLower.includes(term)) score += 3;
    if (titleLower.includes(term)) score += 2;
    if (descLower.includes(term)) score += 1;
    if (readWhenLower.includes(term)) score += 1;
  }
  return score;
}

/**
 * Search KB entries by query string.
 * Returns entries sorted by score (descending), paginated.
 */
export function searchEntries(
  index: KBEntry[],
  query: string,
  page: number = 1,
  size: number = 15,
): { entries: ScoredEntry[]; total: number; page: number; totalPages: number } {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return listEntries(index, page, size);
  }

  const scored = index
    .map((entry) => ({ ...entry, score: scoreEntry(entry, terms) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || a.relativePath.localeCompare(b.relativePath));

  const total = scored.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const start = (page - 1) * size;
  const entries = scored.slice(start, start + size);

  return { entries, total, page, totalPages };
}

/**
 * List all KB entries paginated (no search filter).
 */
export function listEntries(
  index: KBEntry[],
  page: number = 1,
  size: number = 15,
): { entries: ScoredEntry[]; total: number; page: number; totalPages: number } {
  const total = index.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const start = (page - 1) * size;
  const entries = index.slice(start, start + size).map((entry) => ({ ...entry, score: 0 }));

  return { entries, total, page, totalPages };
}

/**
 * Format search results into a compact, token-efficient string for the LLM.
 */
export function formatResults(
  result: { entries: ScoredEntry[]; total: number; page: number; totalPages: number },
  isSearch: boolean,
): string {
  const lines: string[] = [];

  if (isSearch && result.total > 0) {
    lines.push(`Found ${result.total} matches (page ${result.page}/${result.totalPages}):`);
  } else if (isSearch) {
    lines.push("No matches found. Try different keywords or use kb_list to browse.");
    return lines.join("\n");
  } else {
    lines.push(
      `KB index (page ${result.page}/${result.totalPages}, ${result.total} total entries):`,
    );
  }

  lines.push("");

  for (const entry of result.entries) {
    const stars = isSearch
      ? "★".repeat(Math.min(entry.score, 5)) + " "
      : "";
    lines.push(`${stars}${entry.relativePath}`);
    lines.push(`  Title: ${entry.title}`);
    if (entry.description) {
      lines.push(`  Description: ${entry.description}`);
    }
    if (entry.keywords.length > 0) {
      lines.push(`  Keywords: ${entry.keywords.join(", ")}`);
    }
    if (entry.read_when.length > 0) {
      lines.push(`  Read when: ${entry.read_when.join("; ")}`);
    }
    lines.push("");
  }

  if (result.page < result.totalPages) {
    lines.push(
      `──────────`,
      `Page ${result.page} of ${result.totalPages} • Use kb_search(query, page=${result.page + 1}) or kb_list(page=${result.page + 1}) for more`,
    );
  }
  lines.push("Use kb_read(path) to load full content of a specific file.");

  return lines.join("\n");
}
