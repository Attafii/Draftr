"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ArrowRight, Download, FileText, Sparkles, Trash2 } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { MagicUploadZone } from "@/components/landing/magic-upload-zone";
import { ToolSuite } from "@/components/landing/tool-suite";
import { AISidebar } from "@/components/workspace/ai-sidebar";
import { LeftPanelPreview } from "@/components/workspace/left-panel-preview";
import { RightPanelOutput } from "@/components/workspace/right-panel-output";
import { draftrSpring } from "@/lib/animation";
import { type AiInsight, type AiMode, type ConvertedDocument } from "@/lib/document";
import { convertDocument } from "@/lib/document-client";
import { downloadMarkdownFile, downloadPdfFile } from "@/lib/download";
import { canRedoRevision, canUndoRevision, createRevisionEntry, emptyRevisionHistory, getActiveRevision, revisionHistoryReducer } from "@/lib/revision-history";
import { resolveWorkingText } from "@/lib/workspace";

type AiStatus = "idle" | "loading" | "ready" | "error";

interface AiResponse extends AiInsight {
  error?: string;
}

export default function HomePage() {
  const [document, setDocument] = useState<ConvertedDocument | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [editorText, setEditorText] = useState("");
  const [revisionHistory, dispatchRevision] = useReducer(revisionHistoryReducer, emptyRevisionHistory);
  const [aiOpen, setAiOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<AiInsight | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [aiLoadingMode, setAiLoadingMode] = useState<AiMode | null>(null);
  const [aiRequest, setAiRequest] = useState("Fix structure, improve clarity, and enhance the file.");
  const [aiError, setAiError] = useState<string | null>(null);
  const suppressHistoryCommitRef = useRef(false);
  const manualEditTimerRef = useRef<number | null>(null);

  const modelName = process.env.NEXT_PUBLIC_NVIDIA_MODEL ?? "meta/llama-3.1-405b-instruct";

  const isWorkspace = document !== null;

  const scrollToSection = (sectionId: string) => {
    globalThis.document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  useEffect(() => {
    if (document) {
      suppressHistoryCommitRef.current = true;
      dispatchRevision({
        type: "reset",
        entry: createRevisionEntry({
          label: "Imported document",
          source: "upload",
          mode: null,
          text: document.convertedText,
        }),
      });
    } else {
      suppressHistoryCommitRef.current = true;
      dispatchRevision({ type: "clear" });
    }
  }, [document]);

  useEffect(() => {
    const activeRevision = getActiveRevision(revisionHistory);

    suppressHistoryCommitRef.current = true;
    setEditorText(activeRevision?.text ?? "");
  }, [revisionHistory]);

  useEffect(() => {
    if (!document) {
      return;
    }

    if (suppressHistoryCommitRef.current) {
      suppressHistoryCommitRef.current = false;
      return;
    }

    if (manualEditTimerRef.current !== null) {
      window.clearTimeout(manualEditTimerRef.current);
    }

    manualEditTimerRef.current = window.setTimeout(() => {
      dispatchRevision({
        type: "push",
        entry: createRevisionEntry({
          label: "Manual edit",
          source: "manual",
          mode: null,
          text: editorText,
        }),
      });
    }, 600);

    return () => {
      if (manualEditTimerRef.current !== null) {
        window.clearTimeout(manualEditTimerRef.current);
      }
    };
  }, [document, editorText]);

  const applyEditorText = (value: string) => {
    setEditorText(value);
  };

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const file = selectedFiles[0];

    if (!file) {
      return;
    }

    setIsConverting(true);
    setConversionError(null);
    setAiOpen(false);
    setAiInsight(null);
    setAiStatus("idle");
    setAiError(null);

    let objectUrl: string | null = null;

    try {
      objectUrl = URL.createObjectURL(file);
      const payload = await convertDocument(file);
      setDocument(payload);
      setEditorText(payload.convertedText);
      setFileUrl(objectUrl);
      objectUrl = null;
    } catch (error) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      setDocument(null);
      setFileUrl(null);
      setConversionError(error instanceof Error ? error.message : "Conversion failed.");
    } finally {
      setIsConverting(false);
    }
  };

  const resetWorkspace = () => {
    setDocument(null);
    setFileUrl(null);
    setEditorText("");
    setAiOpen(false);
    setConversionError(null);
    setAiInsight(null);
    setAiStatus("idle");
    setAiLoadingMode(null);
    setAiError(null);
  };

  const requestAi = async (mode: AiMode) => {
    if (!document) {
      return;
    }

    setAiOpen(true);
    setAiStatus("loading");
    setAiLoadingMode(mode);
    setAiError(null);

    const workingText = resolveWorkingText(document, editorText);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: document.fileName,
          kind: document.kind,
          text: workingText,
          mode,
          instruction: mode === "rewrite" ? aiRequest : "",
        }),
      });

      const payload = (await response.json()) as AiResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "AI analysis failed.");
      }

      setAiInsight(payload);
      setAiStatus("ready");

      if (mode === "rewrite" && payload.revisedText.trim().length > 0) {
        suppressHistoryCommitRef.current = true;
        setEditorText(payload.revisedText);
        dispatchRevision({
          type: "push",
          entry: createRevisionEntry({
            label: "AI rewrite",
            source: "ai",
            mode: "rewrite",
            text: payload.revisedText,
          }),
        });
      }
    } catch (error) {
      setAiInsight(null);
      setAiStatus("error");
      setAiError(error instanceof Error ? error.message : "AI analysis failed.");
    } finally {
      setAiLoadingMode(null);
    }
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-black text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_26%)]" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(24,24,27,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.16)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(circle_at_center,black,transparent_88%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <LayoutGroup id="draftr-shell">
          <AnimatePresence mode="wait" initial={false}>
            {isWorkspace ? (
              <motion.section
                key="workspace"
                layoutId="draftr-shell"
                transition={draftrSpring}
                className="w-full max-w-[1600px] overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/90 shadow-shell backdrop-blur-2xl"
              >
                <div className="flex min-h-[86vh] flex-col">
                  <div className="flex flex-col gap-5 border-b border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.45em] text-zinc-500">Conversion workspace</p>
                      <div className="mt-3 flex items-center gap-3 text-sm text-zinc-400">
                        <FileText className="h-4 w-4 stroke-[1.25]" />
                        <span>{document.fileName}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void downloadPdfFile(document.fileName, resolveWorkingText(document, editorText), { preset: "clean" })}
                        className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5 stroke-[1.25]" />
                        Clean PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => void downloadPdfFile(document.fileName, resolveWorkingText(document, editorText), { preset: "print" })}
                        className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5 stroke-[1.25]" />
                        Print PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadMarkdownFile(document.fileName, resolveWorkingText(document, editorText), { preset: "normalized" })}
                        className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5 stroke-[1.25]" />
                        Normalized MD
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAiOpen(true);
                          void requestAi("analyze");
                        }}
                        className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <Sparkles className="h-3.5 w-3.5 stroke-[1.25]" />
                        {aiInsight ? "Regenerate insight" : "AI insight"}
                      </button>
                      <button
                        type="button"
                        onClick={resetWorkspace}
                        className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5 stroke-[1.25]" />
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_0.5px_minmax(0,1fr)]">
                    <LeftPanelPreview
                      document={document}
                      fileUrl={fileUrl}
                      editorText={editorText}
                      onEditorTextChange={applyEditorText}
                      isLoading={isConverting}
                    />
                    <div aria-hidden="true" className="hidden w-[0.5px] bg-zinc-800 xl:block" />
                    <RightPanelOutput document={document} editorText={editorText} isLoading={isConverting} />
                  </div>
                </div>
              </motion.section>
            ) : (
              <motion.section
                key="hero"
                layoutId="draftr-shell"
                transition={draftrSpring}
                className="w-full max-w-[1600px] overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/92 shadow-shell backdrop-blur-2xl"
              >
                <div className="flex min-h-[88vh] flex-col">
                  <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <div className="flex items-center gap-3">
                      <BrandMark size={44} />
                      <div>
                        <p className="text-[0.65rem] uppercase tracking-[0.45em] text-zinc-500">Draftr</p>
                        <p className="mt-2 text-sm text-zinc-400">Document architect for PDF and Markdown</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">
                        Private by default
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">
                        AI-assisted drafts
                      </span>
                    </div>
                  </div>

                  <div className="grid flex-1 gap-8 px-6 py-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:px-8 lg:py-10">
                    <div className="flex flex-col justify-between gap-8">
                      <div className="space-y-6">
                        <div className="text-[0.65rem] uppercase tracking-[0.45em] text-zinc-500">Document workbench</div>
                        <h1 className="max-w-xl font-display text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
                          Convert, refine, and ship documents without leaving the draft.
                        </h1>
                        <div className="prose prose-invert prose-zinc max-w-none prose-p:my-0 prose-p:text-zinc-400 prose-li:my-2 prose-li:text-zinc-300">
                          <p>
                            Upload a PDF or Markdown file, inspect the conversion, and move between preview, edits, OCR,
                            translation, compression, and AI rewrite tools in one calm interface.
                          </p>
                          <ul>
                            <li>Client-side conversion keeps the first pass fast and private.</li>
                            <li>Live revision history tracks manual edits and AI rewrites.</li>
                            <li>Split, merge, fill, compress, and enhance files when the draft needs more work.</li>
                          </ul>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => scrollToSection("magic-upload-zone")}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-black transition hover:bg-zinc-200"
                          >
                            Upload file
                            <ArrowRight className="h-3.5 w-3.5 stroke-[1.8]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => scrollToSection("tool-suite")}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                          >
                            Browse tools
                            <ArrowRight className="h-3.5 w-3.5 stroke-[1.8]" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          {
                            label: "Client-side",
                            value: "Conversion happens locally before AI requests are sent.",
                          },
                          {
                            label: "Revisions",
                            value: "Manual edits and AI rewrites stay in one history.",
                          },
                          {
                            label: "Batch tools",
                            value: "Split, merge, OCR, compress, and enhance assets.",
                          },
                        ].map((item) => (
                          <div key={item.label} className="border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-zinc-500">{item.label}</p>
                            <p className="mt-3 text-sm leading-6 text-zinc-300">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex h-full items-stretch">
                      <MagicUploadZone onFilesSelected={handleFilesSelected} isBusy={isConverting} className="h-full" />
                    </div>
                  </div>

                  <div className="border-t border-white/10 px-6 py-8 sm:px-8">
                    <ToolSuite
                      currentDocument={document}
                      onEditShortcut={() => {
                        scrollToSection("magic-upload-zone");
                      }}
                    />
                  </div>

                  {conversionError ? (
                    <div className="border-t border-red-500/20 bg-red-500/5 px-6 py-4 text-sm text-red-200 sm:px-8">
                      {conversionError}
                    </div>
                  ) : null}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </div>

      <AISidebar
        open={aiOpen}
        onOpenChange={setAiOpen}
        documentName={document?.fileName ?? null}
        documentKind={document?.kind ?? null}
        modelName={modelName}
        insight={aiInsight}
        isLoading={aiStatus === "loading"}
        loadingMode={aiLoadingMode}
        errorMessage={aiError}
        requestText={aiRequest}
        onRequestTextChange={setAiRequest}
        onPresetSelect={setAiRequest}
        onAnalyze={() => void requestAi("analyze")}
        onEnhance={() => void requestAi("rewrite")}
        revisionEntries={revisionHistory.entries}
        revisionIndex={revisionHistory.index}
        canUndo={canUndoRevision(revisionHistory)}
        canRedo={canRedoRevision(revisionHistory)}
        onUndo={() => dispatchRevision({ type: "undo" })}
        onRedo={() => dispatchRevision({ type: "redo" })}
        onJumpRevision={(index) => dispatchRevision({ type: "jump", index })}
      />
    </main>
  );
}
