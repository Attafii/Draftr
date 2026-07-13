"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, RefreshCw, ShieldAlert, Sparkles, Wand2, WandSparkles, MessageSquareQuote } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HoverCard, HoverButton } from "@/components/ui/hover";
import { buildLineDiff, type AiInsight, type AiMode, type RevisionEntry } from "@/lib/document";
import { draftrSpring } from "@/lib/animation";
import { cn } from "@/lib/utils";

interface AISidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string | null;
  documentKind: "pdf" | "markdown" | null;
  modelName: string;
  insight: AiInsight | null;
  isLoading: boolean;
  loadingMode: AiMode | null;
  errorMessage: string | null;
  requestText: string;
  onRequestTextChange: (value: string) => void;
  onPresetSelect: (value: string) => void;
  onAnalyze: () => void;
  onEnhance: () => void;
  revisionEntries: RevisionEntry[];
  revisionIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onJumpRevision: (index: number) => void;
}

function InsightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <WandSparkles className="h-4 w-4 stroke-[1.25] text-white" />
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-300">{title}</p>
      </div>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-400">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-px w-4 shrink-0 bg-white/20" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AISidebar({
  open,
  onOpenChange,
  documentName,
  documentKind,
  modelName,
  insight,
  isLoading,
  loadingMode,
  errorMessage,
  requestText,
  onRequestTextChange,
  onPresetSelect,
  onAnalyze,
  onEnhance,
  revisionEntries,
  revisionIndex,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onJumpRevision,
}: AISidebarProps) {
  const currentRequest = requestText.trim().length > 0 ? requestText.trim() : "Fix structure, improve clarity, and enhance the file.";
  const activeRevision = revisionEntries[revisionIndex] ?? null;
  const previousRevision = revisionEntries[revisionIndex - 1] ?? null;
  const diffRows = activeRevision && previousRevision ? buildLineDiff(previousRevision.text, activeRevision.text, 20) : [];
  const promptPresets = [
    {
      label: "Simplify",
      value: "Simplify the language, remove repetition, and keep the original meaning intact.",
    },
    {
      label: "Formalize",
      value: "Make the tone more formal, precise, and professional while preserving the message.",
    },
    {
      label: "Shorten",
      value: "Condense the document, remove filler, and keep only the essential points.",
    },
    {
      label: "Expand",
      value: "Expand the document with clearer context, fuller transitions, and stronger detail.",
    },
    {
      label: "Fix structure",
      value: "Reorganize the document for better headings, flow, and section hierarchy.",
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="ai-sidebar-scrollbar w-full overflow-y-auto border-white/10 bg-zinc-950 px-6 py-6 text-white sm:max-w-md sm:px-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: isLoading ? 360 : 0, scale: isLoading ? 1.05 : 1 }}
              transition={isLoading ? { duration: 1.4, repeat: Infinity, ease: "linear" } : draftrSpring}
              className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/[0.03]"
            >
              <Sparkles className="h-4 w-4 stroke-[1.25] text-white" />
            </motion.div>
            <div>
              <SheetTitle data-testid="ai-sidebar-title">AI Insight</SheetTitle>
              <SheetDescription className="mt-1 text-zinc-500">
                Powered by {modelName}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 border-t border-white/10 pt-6">
          <HoverCard className="soft-card p-4">
            <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">
              <Wand2 className="h-4 w-4 stroke-[1.25] text-white" />
              <span>{documentName ?? "No document loaded"}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Ask the model to analyze the document or rewrite it with better structure and tone.
            </p>

            <label className="mt-4 block space-y-3">
              <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">
                <MessageSquareQuote className="h-4 w-4 stroke-[1.25] text-white" />
                <span>Edit request</span>
              </div>
              <textarea
                data-testid="ai-request-textarea"
                value={requestText}
                onChange={(event) => onRequestTextChange(event.target.value)}
                placeholder="Fix structure, improve clarity, and enhance the file."
                className="min-h-28 w-full resize-none border border-white/10 bg-black/50 p-3 text-sm leading-6 text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-white/20"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              {promptPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onPresetSelect(preset.value)}
                  className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-[0.63rem] uppercase tracking-[0.24em] text-zinc-400 transition hover:text-white"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={isLoading || !documentName}
                className="btn-accent inline-flex items-center gap-2 px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading && loadingMode === "analyze" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-[1.25]" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 stroke-[1.25]" />
                )}
                {insight ? "Regenerate insight" : "Analyze"}
              </button>

              <button
                type="button"
                onClick={onEnhance}
                disabled={isLoading || !documentName}
                className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading && loadingMode === "rewrite" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-[1.25]" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5 stroke-[1.25]" />
                )}
                Enhance file
              </button>
            </div>

            <p className="mt-3 text-xs uppercase tracking-[0.28em] text-zinc-500">
              {documentKind === "markdown"
                ? "Markdown syntax will be preserved in rewrite mode."
                : "PDF requests will rewrite the extracted text and export cleanly back to PDF."}
            </p>

            <p className="mt-3 text-xs leading-5 text-zinc-600">
              Current request: {currentRequest}
            </p>
          </div>

          {errorMessage ? (
            <div className="soft-card p-4 text-sm leading-6 text-red-200" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
              <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.28em] text-red-300">
                <ShieldAlert className="h-4 w-4 stroke-[1.25]" />
                <span>AI fallback</span>
              </div>
              <p className="mt-3">{errorMessage}</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="space-y-4">
              <HoverCard className="soft-card p-4">
                <div className="h-3 w-32 bg-white/10" />
                <div className="mt-4 space-y-3">
                  <div className="h-2 w-full bg-white/5" />
                  <div className="h-2 w-11/12 bg-white/5" />
                  <div className="h-2 w-4/5 bg-white/5" />
                </div>
              </HoverCard>
              <HoverCard className="soft-card p-4">
                <div className="h-3 w-28 bg-white/10" />
                <div className="mt-4 space-y-2">
                  <div className="h-2 w-full bg-white/5" />
                  <div className="h-2 w-10/12 bg-white/5" />
                </div>
              </HoverCard>
            </div>
          ) : insight ? (
            <div className="space-y-4">
              <div className="border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">
                  <Sparkles className="h-4 w-4 stroke-[1.25] text-white" />
                  <span>{insight.usedFallback ? "Heuristic insight" : "AI-generated insight"}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{insight.summary}</p>
              </div>

              <InsightCard title="Key takeaways" items={insight.keyTakeaways} />
              <InsightCard title="Structural fixes" items={insight.structuralFixes} />
              <InsightCard title="Tone notes" items={insight.toneNotes} />
              <InsightCard title="Next steps" items={insight.nextSteps} />

              {insight.mode === "rewrite" && insight.revisedText ? (
                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">Rewritten draft applied to editor</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    The editor has been updated with the revised draft. Export again to generate a new file.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-500">
              Load a document, then generate a summary pass to inspect semantic structure and conversion quality.
            </div>
          )}

          <div className="border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">Revision history</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Undo and redo across uploads, manual edits, and AI rewrites.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="inline-flex items-center gap-2 border border-white/10 bg-black/30 px-3 py-2 text-[0.63rem] uppercase tracking-[0.24em] text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5 stroke-[1.25]" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="inline-flex items-center gap-2 border border-white/10 bg-black/30 px-3 py-2 text-[0.63rem] uppercase tracking-[0.24em] text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Redo
                  <ChevronRight className="h-3.5 w-3.5 stroke-[1.25]" />
                </button>
              </div>
            </div>

            {revisionEntries.length > 0 ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {revisionEntries.map((entry, index) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onJumpRevision(index)}
                      className={cn(
                        "inline-flex items-center gap-2 border px-3 py-2 text-left text-[0.63rem] uppercase tracking-[0.24em] transition",
                        index === revisionIndex
                          ? "border-white/20 bg-white text-black"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      <span>{entry.label}</span>
                      <span className={index === revisionIndex ? "text-black/60" : "text-zinc-600"}>{entry.source}</span>
                    </button>
                  ))}
                </div>

                {activeRevision && previousRevision ? (
                  <div className="border border-white/10 bg-black/40 p-3">
                    <div className="flex items-center justify-between gap-3 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">
                      <span>Diff view</span>
                      <span>{diffRows.filter((row) => row.changed).length} changed lines</span>
                    </div>
                    <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1 text-xs leading-5">
                      {diffRows.map((row) => (
                        <div
                          key={row.lineNumber}
                          className={cn(
                            "grid grid-cols-[42px_minmax(0,1fr)] gap-3 border-l-2 px-3 py-2",
                            row.changed ? "border-emerald-400/40 bg-emerald-400/5 text-zinc-200" : "border-white/10 bg-white/[0.02] text-zinc-500",
                          )}
                        >
                          <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-zinc-600">{row.lineNumber}</span>
                          <div className="space-y-1">
                            <p className={cn("font-mono", row.changed ? "text-emerald-200" : "text-zinc-500")}>
                              {row.before || ""}
                            </p>
                            {row.changed ? <p className="font-mono text-zinc-200">{row.after || ""}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 border border-dashed border-white/10 bg-black/25 p-3 text-sm leading-6 text-zinc-500">
                No revisions yet. Upload a file or make an edit to start the history timeline.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
