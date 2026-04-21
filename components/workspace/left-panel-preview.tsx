"use client";

import { motion } from "framer-motion";
import { FileText, HardDriveUpload, PencilLine } from "lucide-react";

import { panelRevealVariants, draftrSpring } from "@/lib/animation";
import { cn } from "@/lib/utils";
import {
  formatFileSize,
  type ConvertedDocument,
} from "@/lib/document";

interface LeftPanelPreviewProps {
  document: ConvertedDocument | null;
  editorText: string;
  onEditorTextChange: (value: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function LeftPanelPreview({
  document,
  editorText,
  onEditorTextChange,
  isLoading = false,
  className,
}: LeftPanelPreviewProps) {
  const editorTitle = document?.kind === "pdf" ? "PDF editor" : "Markdown editor";

  return (
    <motion.section
      variants={panelRevealVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={draftrSpring}
      className={cn("flex min-h-0 flex-col bg-zinc-950/70 p-6 sm:p-8", className)}
    >
      <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.35em] text-zinc-500">
        <FileText className="h-4 w-4 stroke-[1.25]" />
        <span>{editorTitle}</span>
      </div>

      <div className="mt-8 flex min-h-0 flex-1 flex-col border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        {document ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-sm font-medium text-white">{document.fileName}</p>
                <p className="mt-2 text-[0.65rem] uppercase tracking-[0.32em] text-zinc-500">
                  {document.kind === "pdf"
                    ? "Edit the extracted text before exporting a revised PDF"
                    : "Edit the markdown before exporting a fresh file"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.32em] text-zinc-500">
                <HardDriveUpload className="h-4 w-4 stroke-[1.25]" />
                <span>{formatFileSize(document.byteSize)}</span>
              </div>
            </div>

            <label className="mt-5 flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.32em] text-zinc-500">
                <PencilLine className="h-4 w-4 stroke-[1.25]" />
                <span>Editable content</span>
              </div>
              <textarea
                value={editorText}
                onChange={(event) => onEditorTextChange(event.target.value)}
                spellCheck={false}
                className="min-h-[420px] flex-1 resize-none border border-white/10 bg-black/50 p-4 font-mono text-[0.92rem] leading-7 text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-white/20"
                placeholder={
                  document.kind === "pdf"
                    ? "Converted PDF text appears here. Edit it before exporting a revised PDF."
                    : "Write or refine markdown here. The preview updates live."
                }
              />
            </label>
          </>
        ) : isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center text-center">
            <div className="space-y-3">
              <p className="text-sm text-zinc-300">Extracting document text</p>
              <p className="text-xs text-zinc-600">The uploaded file is being parsed before the workspace split appears.</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[260px] items-center justify-center text-center">
            <div className="space-y-2">
              <p className="text-sm text-zinc-400">Awaiting document input</p>
              <p className="text-xs text-zinc-600">This surface becomes the left-hand preview editor after upload.</p>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
