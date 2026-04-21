"use client";

import { motion } from "framer-motion";
import { Sparkles, WandSparkles, RefreshCw, ShieldAlert, Wand2, MessageSquareQuote } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { type AiInsight, type AiMode } from "@/lib/document";
import { draftrSpring } from "@/lib/animation";

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
  onAnalyze: () => void;
  onEnhance: () => void;
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
  onAnalyze,
  onEnhance,
}: AISidebarProps) {
  const currentRequest = requestText.trim().length > 0 ? requestText.trim() : "Fix structure, improve clarity, and enhance the file.";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full border-white/10 bg-zinc-950 px-6 py-6 text-white sm:max-w-md sm:px-8">
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
              <SheetTitle>AI Insight</SheetTitle>
              <SheetDescription className="mt-1 text-zinc-500">
                Powered by {modelName}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 border-t border-white/10 pt-6">
          <div className="border border-white/10 bg-white/[0.03] p-4">
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
                value={requestText}
                onChange={(event) => onRequestTextChange(event.target.value)}
                placeholder="Fix structure, improve clarity, and enhance the file."
                className="min-h-28 w-full resize-none border border-white/10 bg-black/60 p-3 text-sm leading-6 text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-white/20"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={isLoading || !documentName}
                className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="border border-red-500/20 bg-red-500/5 p-4 text-sm leading-6 text-red-200">
              <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.28em] text-red-300">
                <ShieldAlert className="h-4 w-4 stroke-[1.25]" />
                <span>AI fallback</span>
              </div>
              <p className="mt-3">{errorMessage}</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="space-y-4">
              <div className="border border-white/10 bg-white/[0.03] p-4">
                <div className="h-3 w-32 bg-white/10" />
                <div className="mt-4 space-y-3">
                  <div className="h-2 w-full bg-white/5" />
                  <div className="h-2 w-11/12 bg-white/5" />
                  <div className="h-2 w-4/5 bg-white/5" />
                </div>
              </div>
              <div className="border border-white/10 bg-white/[0.03] p-4">
                <div className="h-3 w-28 bg-white/10" />
                <div className="mt-4 space-y-2">
                  <div className="h-2 w-full bg-white/5" />
                  <div className="h-2 w-10/12 bg-white/5" />
                </div>
              </div>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
