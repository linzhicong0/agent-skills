import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatAllKeywords, formatEntriesByKeywords } from "../src/search.js";
import type { KBEntry } from "../src/types.js";

// ── Shared fixtures ──────────────────────────────────────────────────────────

const ALPHA: KBEntry = {
    relativePath: "alpha.md",
    title: "Alpha Document",
    description: "Describes the alpha feature",
    read_when: ["When working on alpha features", "When debugging alpha issues"],
    keywords: ["alpha", "feature", "core"],
};

const BETA: KBEntry = {
    relativePath: "beta.md",
    title: "Beta Document",
    description: "Describes the beta feature",
    read_when: ["When working on beta features"],
    keywords: ["beta", "feature", "experimental"],
};

const DUP: KBEntry = {
    relativePath: "dup.md",
    title: "Duplicate Keywords",
    description: "",
    read_when: [],
    keywords: ["dup", "DUP", "Dup", "unique"],
};

const INDEX: KBEntry[] = [ALPHA, BETA, DUP];

// ── formatAllKeywords ────────────────────────────────────────────────────────

describe("formatAllKeywords", () => {
    it("includes a header with file count and keyword count", () => {
        const out = formatAllKeywords(INDEX);
        assert.ok(out.includes("3 files"), "should mention 3 files");
    });

    it("deduplicates keywords case-insensitively", () => {
        const out = formatAllKeywords(INDEX);
        // DUP entry has 'dup', 'DUP', 'Dup' — all should collapse to one 'dup'
        const matches = out.match(/\bdup\b/gi) ?? [];
        assert.equal(matches.length, 1, "keyword 'dup' should appear exactly once");
    });

    it("lists keywords in sorted alphabetical order", () => {
        const out = formatAllKeywords(INDEX);
        // Extract the keywords line (last non-empty line)
        const lines = out.split("\n").filter(Boolean);
        const kwLine = lines[lines.length - 1];
        const kws = kwLine.split(", ");
        assert.deepEqual(kws, [...kws].sort(), "keywords should be sorted");
    });

    it("includes all unique keywords from all entries", () => {
        const out = formatAllKeywords(INDEX);
        const expected = ["alpha", "beta", "core", "dup", "experimental", "feature", "unique"];
        for (const kw of expected) {
            assert.ok(out.includes(kw), `keyword '${kw}' should be present`);
        }
    });

    it("mentions the required 3-step workflow", () => {
        const out = formatAllKeywords(INDEX);
        assert.ok(out.includes("kb_list_keywords"));
        assert.ok(out.includes("kb_list_frontmatter_by_keywords"));
        assert.ok(out.includes("kb_read_file"));
    });

    it("handles an empty index", () => {
        const out = formatAllKeywords([]);
        assert.ok(out.includes("0 files"));
        assert.ok(out.includes("0 unique keywords"));
    });

    it("handles a single entry", () => {
        const out = formatAllKeywords([ALPHA]);
        assert.ok(out.includes("1 file"), "should use singular 'file'");
    });
});

// ── formatEntriesByKeywords ──────────────────────────────────────────────────

describe("formatEntriesByKeywords", () => {
    it("returns entries that match any of the given keywords", () => {
        const out = formatEntriesByKeywords(INDEX, ["alpha"]);
        assert.ok(out.includes("Alpha Document"));
        assert.ok(!out.includes("Beta Document"));
    });

    it("matches across multiple entries when multiple keywords given", () => {
        const out = formatEntriesByKeywords(INDEX, ["alpha", "beta"]);
        assert.ok(out.includes("Alpha Document"));
        assert.ok(out.includes("Beta Document"));
    });

    it("matching is case-insensitive", () => {
        const out = formatEntriesByKeywords(INDEX, ["ALPHA"]);
        assert.ok(out.includes("Alpha Document"));
    });

    it("includes file path in output", () => {
        const out = formatEntriesByKeywords(INDEX, ["alpha"]);
        assert.ok(out.includes("alpha.md"));
    });

    it("includes read_when triggers when present", () => {
        const out = formatEntriesByKeywords(INDEX, ["alpha"]);
        assert.ok(out.includes("When working on alpha features"));
        assert.ok(out.includes("When debugging alpha issues"));
    });

    it("omits read_when section when entry has none", () => {
        const out = formatEntriesByKeywords(INDEX, ["dup"]);
        assert.ok(!out.includes("read when:"));
    });

    it("returns no-match message when keyword has no entries", () => {
        const out = formatEntriesByKeywords(INDEX, ["nonexistent"]);
        assert.ok(out.includes("No entries found for: nonexistent"));
        assert.ok(out.includes("kb_list_keywords"));
    });

    it("returns prompt message when keyword list is empty", () => {
        const out = formatEntriesByKeywords(INDEX, []);
        assert.ok(out.includes("No keywords provided"));
    });

    it("returns prompt message when keyword list contains only whitespace", () => {
        const out = formatEntriesByKeywords(INDEX, ["  ", ""]);
        assert.ok(out.includes("No keywords provided"));
    });

    it("shared keyword 'feature' matches both alpha and beta", () => {
        const out = formatEntriesByKeywords(INDEX, ["feature"]);
        assert.ok(out.includes("Alpha Document"));
        assert.ok(out.includes("Beta Document"));
        assert.ok(out.includes("Found 2 entries"));
    });

    it("output ends with a next-step hint", () => {
        const out = formatEntriesByKeywords(INDEX, ["alpha"]);
        assert.ok(out.includes("kb_read_file"));
    });
});
