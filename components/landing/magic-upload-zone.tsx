"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useId,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { FileUp, Sparkles, Upload } from "lucide-react";

import { draftrSpring, shimmerVariants } from "@/lib/animation";
import { cn } from "@/lib/utils";

interface MagicUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
  isBusy?: boolean;
}

const ACCEPTED_EXTENSIONS = [".pdf", ".md", ".markdown"];
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "text/markdown",
  "text/x-markdown",
  "application/x-markdown",
];

function isSupportedDocument(file: File): boolean {
  const normalizedName = file.name.toLowerCase();

  return (
    ACCEPTED_MIME_TYPES.includes(file.type) ||
    ACCEPTED_EXTENSIONS.some((extension) => normalizedName.endsWith(extension))
  );
}

export function MagicUploadZone({ onFilesSelected, className, isBusy = false }: MagicUploadZoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetDragState = () => {
    dragCounterRef.current = 0;
    setIsDragActive(false);
  };

  const commitFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      setErrorMessage("Drop a PDF or Markdown file to continue.");
      return;
    }

    const acceptedFiles = Array.from(fileList).filter(isSupportedDocument);

    if (acceptedFiles.length === 0) {
      setErrorMessage("Only PDF and Markdown files are supported for this workspace.");
      return;
    }

    setErrorMessage(null);
    resetDragState();
    onFilesSelected(acceptedFiles);
  };

  const openPicker = () => {
    if (isBusy || !inputRef.current) {
      return;
    }

    inputRef.current.value = "";
    inputRef.current.click();
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    commitFiles(event.target.files);
  };

  const handleDragEnter = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);

    if (dragCounterRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    commitFiles(event.dataTransfer.files);
  };

  return (
    <div id="magic-upload-zone" data-testid="magic-upload-zone" className={cn("relative flex h-full w-full p-px", className)}>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(255,255,255,0)_0deg,rgba(255,255,255,0.12)_50deg,rgba(255,255,255,0)_120deg,rgba(255,255,255,0.28)_210deg,rgba(255,255,255,0)_290deg,rgba(255,255,255,0.12)_360deg)] opacity-0 blur-[1px]"
        variants={shimmerVariants}
        animate={isDragActive || isBusy ? "active" : "idle"}
        initial="idle"
      />

      <button
        type="button"
        onClick={openPicker}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={isBusy}
        aria-busy={isBusy}
        className={cn(
          "relative flex h-full min-h-[520px] w-full flex-col overflow-hidden rounded-[1.85rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] px-6 py-6 text-left shadow-[0_20px_80px_rgba(0,0,0,0.36)] outline-none transition-transform duration-300 focus-visible:ring-1 focus-visible:ring-white/40 sm:px-8 sm:py-8",
          isBusy ? "cursor-progress opacity-90" : "cursor-pointer",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.65rem] uppercase tracking-[0.45em] text-zinc-500">Magic Upload</p>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.62rem] uppercase tracking-[0.24em] text-zinc-500">
              PDF / MD
            </span>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-2 py-10 text-center sm:px-8">
            <motion.div
              animate={{ scale: isDragActive ? 1.05 : 1, y: isDragActive ? -2 : 0 }}
              transition={draftrSpring}
              className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              {isBusy ? (
                <Sparkles className="h-7 w-7 stroke-[1.25] text-white" />
              ) : isDragActive ? (
                <Sparkles className="h-7 w-7 stroke-[1.25] text-white" />
              ) : (
                <Upload className="h-7 w-7 stroke-[1.25] text-white" />
              )}
            </motion.div>

            <h2 className="max-w-3xl text-3xl font-display font-semibold tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl">
              {isBusy ? "Converting your document." : "Drop a PDF or Markdown file to begin."}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              {isBusy
                ? "The uploaded file is being parsed, cleaned up, and prepared for the workspace."
                : "The file lands in a polished preview flow with editor output, AI insight, and export controls."}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.28em] text-zinc-500">
              <span className="inline-flex items-center gap-2 border border-white/10 px-3 py-2">
                <FileUp className="h-3.5 w-3.5 stroke-[1.25]" />
                PDF
              </span>
              <span className="border border-white/10 px-3 py-2">Markdown</span>
              <span className="border border-white/10 px-3 py-2">Click or drag</span>
            </div>

            <p className={cn("mt-8 max-w-xl text-sm text-zinc-500", errorMessage ? "text-red-300" : "")}>
              {errorMessage ?? (isBusy ? "Parsing content and preparing the AI sidebar." : "Client-side conversion keeps the first pass fast and private.")}
            </p>
          </div>
        </div>
      </button>

      <input
        ref={inputRef}
        id={inputId}
        data-testid="magic-upload-input"
        className="sr-only"
        type="file"
        accept=".pdf,.md,.markdown,application/pdf,text/markdown,text/x-markdown,application/x-markdown"
        multiple
        onChange={handleInputChange}
      />
    </div>
  );
}
