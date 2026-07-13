"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { buildStyledExportText } from "@/lib/download";
import type { ExportStyleOptions } from "@/lib/document";

import { panelRevealVariants, draftrSpring } from "@/lib/animation";
import { type ConvertedDocument } from "@/lib/document";
import { cn } from "@/lib/utils";

interface RightPanelOutputProps {
  document: ConvertedDocument | null;
  editorText: string;
  isLoading?: boolean;
  className?: string;
  exportStyle?: ExportStyleOptions | null;
}

export function RightPanelOutput({ document, editorText, isLoading = false, className, exportStyle = null }: RightPanelOutputProps) {
  const previewText = exportStyle ? buildStyledExportText(editorText, { preset: exportStyle.preset, title: exportStyle.title }) : editorText;

  return (
    <motion.section
      variants={panelRevealVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={draftrSpring}
      className={cn("flex min-h-0 flex-col soft-card p-6 sm:p-8", className)}
    >
      <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.35em] text-zinc-500">
        <Sparkles className="h-4 w-4 stroke-[1.25]" />
        <span>Right panel output</span>
      </div>

      <div className="mt-8 flex min-h-0 flex-1 flex-col soft-card p-5 sm:p-6">
        {document ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-sm font-medium text-zinc-900">Rendered output</p>
                <p className="mt-2 text-[0.65rem] uppercase tracking-[0.32em] text-zinc-500">
                  {document.kind === "pdf"
                    ? "Live PDF text preview"
                    : "Live markdown rendering preview"}
                </p>
              </div>
              <div className="text-[0.65rem] uppercase tracking-[0.32em] text-zinc-500">
                Live conversion
              </div>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-auto pr-1">
              {document.kind === "markdown" ? (
                <div className="prose max-w-none prose-headings:tracking-[-0.04em] prose-h1:text-3xl prose-h2:text-2xl prose-p:text-zinc-700 prose-a:text-[hsl(var(--primary))] prose-strong:text-zinc-900 prose-code:rounded-none prose-code:bg-[hsl(var(--muted))] prose-code:px-1 prose-code:py-0.5 prose-pre:rounded-none prose-pre:border prose-pre:border-[hsl(var(--border))] prose-pre:bg-[hsl(var(--muted))]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewText}</ReactMarkdown>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-[0.96rem] leading-7 text-zinc-300">
                  {previewText}
                </pre>
              )}
            </div>
          </>
        ) : isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center text-center">
            <div className="space-y-3">
              <p className="text-sm text-zinc-300">Preparing conversion output</p>
              <p className="text-xs text-zinc-600">Rendered content appears here after extraction completes.</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[260px] items-center justify-center text-center">
            <div className="space-y-2">
              <p className="text-sm text-zinc-400">Output will appear here</p>
              <p className="text-xs text-zinc-600">This surface becomes the live-rendered result after conversion.</p>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
