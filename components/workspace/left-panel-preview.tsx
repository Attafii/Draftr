"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { FileText, HardDriveUpload, PencilLine } from "lucide-react";

import { DocumentNavigator } from "@/components/workspace/document-navigator";
import { PdfEditorPanel } from "@/components/workspace/pdf-editor-panel";
import { panelRevealVariants, draftrSpring } from "@/lib/animation";
import { cn } from "@/lib/utils";
import {
  formatFileSize,
  type ConvertedDocument,
} from "@/lib/document";
import { focusTextareaLine } from "@/lib/text-navigation";

interface LeftPanelPreviewProps {
  document: ConvertedDocument | null;
  fileUrl: string | null;
  editorText: string;
  onEditorTextChange: (value: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function LeftPanelPreview({
  document,
  fileUrl,
  editorText,
  onEditorTextChange,
  isLoading = false,
  className,
}: LeftPanelPreviewProps) {
  const editorTitle = document?.kind === "pdf" ? "PDF editor" : "Markdown editor";
  const markdownTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleMarkdownJump = (lineNumber: number) => {
    focusTextareaLine(markdownTextareaRef.current, editorText, lineNumber);
  };

  return (
    <motion.section
      variants={panelRevealVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={draftrSpring}
      className={cn("flex min-h-0 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] p-6 sm:p-8", className)}
    >
      <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.35em] text-zinc-500">
        <FileText className="h-4 w-4 stroke-[1.25]" />
        <span>{editorTitle}</span>
      </div>

      <div className="mt-8 flex min-h-0 flex-1 flex-col border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        {document ? (
          document.kind === "pdf" ? (
            <PdfEditorPanel
              document={document}
              fileUrl={fileUrl}
              editorText={editorText}
              onEditorTextChange={onEditorTextChange}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-medium text-white">{document.fileName}</p>
                  <p className="mt-2 text-[0.65rem] uppercase tracking-[0.32em] text-zinc-500">
                    Edit the markdown before exporting a fresh file
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.32em] text-zinc-500">
                  <HardDriveUpload className="h-4 w-4 stroke-[1.25]" />
                  <span>{formatFileSize(document.byteSize)}</span>
                </div>
              </div>

              <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3">
                <DocumentNavigator text={editorText} onJumpToLine={handleMarkdownJump} />
                <label className="flex flex-1 flex-col gap-3">
                  <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.32em] text-zinc-500">
                    <PencilLine className="h-4 w-4 stroke-[1.25]" />
                    <span>Editable content</span>
                  </div>

                    <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const el = markdownTextareaRef.current;
                        if (!el) return;
                        const start = el.selectionStart ?? 0;
                        const end = el.selectionEnd ?? 0;
                        const val = el.value;
                        const selected = val.slice(start, end);
                        const next = `${val.slice(0, start)}**${selected || "bold text"}**${val.slice(end)}`;
                        onEditorTextChange(next);
                        setTimeout(() => {
                          el.focus();
                          el.selectionStart = start + 2;
                          el.selectionEnd = start + 2 + (selected || "bold text").length;
                        }, 0);
                      }}
                      className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm text-zinc-300"
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const el = markdownTextareaRef.current;
                        if (!el) return;
                        const start = el.selectionStart ?? 0;
                        const end = el.selectionEnd ?? 0;
                        const val = el.value;
                        const selected = val.slice(start, end);
                        const next = `${val.slice(0, start)}*${selected || "italic text"}*${val.slice(end)}`;
                        onEditorTextChange(next);
                        setTimeout(() => {
                          el.focus();
                          el.selectionStart = start + 1;
                          el.selectionEnd = start + 1 + (selected || "italic text").length;
                        }, 0);
                      }}
                      className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm text-zinc-300"
                    >
                      <em>I</em>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const color = window.prompt("Enter hex color (e.g. FF8800)", "FF8800");
                        if (!color) return;
                        const hex = color.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).padEnd(6, "0");
                        const el = markdownTextareaRef.current;
                        if (!el) return;
                        const start = el.selectionStart ?? 0;
                        const end = el.selectionEnd ?? 0;
                        const val = el.value;
                        const selected = val.slice(start, end) || "colored text";
                        const next = `${val.slice(0, start)}<color=#${hex}>${selected}</color>${val.slice(end)}`;
                        onEditorTextChange(next);
                        setTimeout(() => {
                          el.focus();
                        }, 0);
                      }}
                      className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm text-zinc-300"
                    >
                      Color
                    </button>
                  </div>

                  <textarea
                    ref={markdownTextareaRef}
                    value={editorText}
                    onChange={(event) => onEditorTextChange(event.target.value)}
                    spellCheck={false}
                    className="min-h-[420px] flex-1 resize-none border border-white/10 bg-black/50 p-4 font-mono text-[0.92rem] leading-7 text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-white/20"
                    placeholder="Write or refine markdown here. The preview updates live."
                  />
                </label>
              </div>
            </>
          )
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
