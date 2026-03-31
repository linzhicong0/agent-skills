#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { scanKB } from "./scanner.js";
import { searchEntries, listEntries, formatResults } from "./search.js";
import type { KBEntry } from "./types.js";

const KB_DIR = process.env.KB_DIR ?? "./knowledge-base";
const DEFAULT_PAGE_SIZE = 15;

// ─── Build in-memory index at startup ───

let index: KBEntry[] = [];
let kbAbsDir = "";

function rebuildIndex(): void {
  kbAbsDir = path.resolve(KB_DIR);
  const startTime = Date.now();
  index = scanKB(kbAbsDir);
  const elapsed = Date.now() - startTime;
  console.error(`[kb] Indexed ${index.length} files from ${kbAbsDir} in ${elapsed}ms`);
}

rebuildIndex();

// ─── File watcher (optional, debounced) ───

let watchTimeout: ReturnType<typeof setTimeout> | undefined;
try {
  fs.watch(kbAbsDir, { recursive: true }, (_event, filename) => {
    if (!filename?.endsWith(".md")) return;
    if (watchTimeout) clearTimeout(watchTimeout);
    watchTimeout = setTimeout(() => {
      console.error(`[kb] Change detected (${filename}), rebuilding index...`);
      rebuildIndex();
    }, 2000);
  });
  console.error(`[kb] Watching ${kbAbsDir} for changes`);
} catch {
  console.error(`[kb] File watching not available for ${kbAbsDir}`);
}

// ─── MCP Server ───

const server = new McpServer({
  name: "kb",
  version: "1.0.0",
});

server.tool(
  "kb_search",
  `Search the knowledge base by keywords. Returns paginated frontmatter entries
(title, description, read_when, keywords) ranked by relevance. Use this first
to find relevant files, then use kb_read to load the full content of matching files.`,
  {
    query: z.string().describe("Search terms — space-separated keywords to match against title, description, read_when, and keywords fields"),
    page: z.number().default(1).describe("Page number (1-indexed)"),
    size: z.number().default(DEFAULT_PAGE_SIZE).describe("Results per page"),
  },
  async ({ query, page, size }) => {
    const result = searchEntries(index, query, page, size);
    const text = formatResults(result, true);
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "kb_list",
  `Browse all knowledge base entries paginated. Returns frontmatter (title,
description, read_when, keywords) for each file. Use this to explore the KB
when you don't have specific search terms.`,
  {
    page: z.number().default(1).describe("Page number (1-indexed)"),
    size: z.number().default(DEFAULT_PAGE_SIZE).describe("Results per page"),
  },
  async ({ page, size }) => {
    const result = listEntries(index, page, size);
    const text = formatResults(result, false);
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "kb_read",
  `Read the full content of a specific knowledge base file by its relative path.
Use this after kb_search or kb_list to load the complete document.`,
  {
    path: z.string().describe("Relative path of the KB file (as shown in kb_search/kb_list results)"),
  },
  async ({ path: filePath }) => {
    // Sanitize: prevent path traversal
    const sanitized = filePath.replace(/\.\./g, "").replace(/\\/g, "/");
    const fullPath = path.join(kbAbsDir, sanitized);

    if (!fullPath.startsWith(kbAbsDir)) {
      return {
        content: [{ type: "text", text: `Error: path escapes KB directory: ${filePath}` }],
        isError: true,
      };
    }

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      return { content: [{ type: "text", text: content }] };
    } catch {
      return {
        content: [{ type: "text", text: `Error: file not found: ${filePath}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  "kb_stats",
  "Get knowledge base statistics: total files, directory path, index status.",
  {},
  async () => {
    const text = [
      `Knowledge Base Statistics:`,
      `  Directory: ${kbAbsDir}`,
      `  Total files: ${index.length}`,
      `  Files with keywords: ${index.filter((e) => e.keywords.length > 0).length}`,
      `  Files with read_when: ${index.filter((e) => e.read_when.length > 0).length}`,
      `  Files with description: ${index.filter((e) => e.description.length > 0).length}`,
    ].join("\n");
    return { content: [{ type: "text", text }] };
  },
);

// ─── Start ───

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[kb] MCP server started — ${index.length} files indexed`);
}

main().catch((err) => {
  console.error("[kb] Fatal:", err);
  process.exit(1);
});
