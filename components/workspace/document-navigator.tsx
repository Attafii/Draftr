"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { extractDocumentHeadings, searchDocumentText } from "@/lib/document";

interface DocumentNavigatorProps {
  text: string;
  onJumpToLine: (lineNumber: number) => void;
  className?: string;
}

export function DocumentNavigator({ text, onJumpToLine, className }: DocumentNavigatorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const headings = useMemo(() => extractDocumentHeadings(text), [text]);
  const searchHits = useMemo(() => searchDocumentText(text, searchQuery), [text, searchQuery]);

  return (
    <div className={cn("space-y-3 soft-card p-4", className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center soft-card">
          <Search className="h-4 w-4 stroke-[1.25] text-[hsl(var(--primary))]" />
        </div>
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">Search and headings</p>
          <p className="mt-1 text-sm text-zinc-400">Jump to important lines inside the converted text.</p>
        </div>
      </div>

      <label className="block space-y-2">
        <span className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">Search</span>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search the document"
          className="w-full border bg-[hsl(var(--input))] px-3 py-2 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-500 focus:border-[hsl(var(--ring))]"
        />
      </label>

      {searchHits.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">
            <span>Matches</span>
            <span>{searchHits.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchHits.slice(0, 8).map((hit) => (
                <button
                key={hit.id}
                type="button"
                onClick={() => onJumpToLine(hit.lineNumber)}
                className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-left text-[0.63rem] uppercase tracking-[0.24em] text-zinc-600 transition hover:text-white"
              >
                <span>Line {hit.lineNumber}</span>
                <ArrowRight className="h-3 w-3 stroke-[1.25]" />
                <span className="max-w-[200px] truncate normal-case tracking-normal">{hit.lineText}</span>
              </button>
            ))}
          </div>
        </div>
      ) : searchQuery.trim().length > 0 ? (
        <div className="border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-3 text-sm text-zinc-600">No matches found.</div>
      ) : null}

      {headings.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">
            <span>Headings</span>
            <span>{headings.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {headings.slice(0, 10).map((heading) => (
              <button
                key={heading.id}
                type="button"
                onClick={() => onJumpToLine(heading.lineNumber)}
                className={cn(
                  "inline-flex items-center gap-2 border px-3 py-2 text-left text-[0.63rem] uppercase tracking-[0.24em] transition",
                  heading.level === 1
                    ? "btn-accent text-white"
                    : "border btn-ghost text-zinc-600 hover:bg-[hsl(var(--muted))]",
                )}
              >
                <span>H{heading.level}</span>
                <span className="max-w-[220px] truncate normal-case tracking-normal">{heading.title}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-white/10 bg-black/25 p-3 text-sm text-zinc-500">No obvious headings detected yet.</div>
      )}
    </div>
  );
}
