"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Download, FileText, Sparkles, Trash2 } from "lucide-react";

import { MagicUploadZone } from "@/components/landing/magic-upload-zone";
import { AISidebar } from "@/components/workspace/ai-sidebar";
import { LeftPanelPreview } from "@/components/workspace/left-panel-preview";
import { RightPanelOutput } from "@/components/workspace/right-panel-output";
import { draftrSpring } from "@/lib/animation";
import { type AiInsight, type AiMode, type ConvertedDocument } from "@/lib/document";
import { convertDocument } from "@/lib/document-client";
import { downloadMarkdownFile, downloadPdfFile } from "@/lib/download";

type AiStatus = "idle" | "loading" | "ready" | "error";

interface AiResponse extends AiInsight {
  error?: string;
}

export default function HomePage() {
  const [document, setDocument] = useState<ConvertedDocument | null>(null);
  const [editorText, setEditorText] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<AiInsight | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [aiLoadingMode, setAiLoadingMode] = useState<AiMode | null>(null);
  const [aiRequest, setAiRequest] = useState("Fix structure, improve clarity, and enhance the file.");
  const [aiError, setAiError] = useState<string | null>(null);

  const modelName = process.env.NEXT_PUBLIC_NVIDIA_MODEL ?? "meta/llama-3.1-405b-instruct";

  const isWorkspace = document !== null;

  useEffect(() => {
    if (document) {
      setEditorText(document.convertedText);
    } else {
      setEditorText("");
    }
  }, [document]);

  const applyEditorText = (value: string) => {
    setEditorText(value);
    setDocument((current) =>
      current
        ? {
            ...current,
            sourceText: value,
            convertedText: value,
          }
        : current,
    );
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

    try {
      const payload = await convertDocument(file);
      setDocument(payload);
      setEditorText(payload.convertedText);
    } catch (error) {
      setDocument(null);
      setConversionError(error instanceof Error ? error.message : "Conversion failed.");
    } finally {
      setIsConverting(false);
    }
  };

  const resetWorkspace = () => {
    setDocument(null);
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

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: document.fileName,
          kind: document.kind,
          text: editorText || document.convertedText,
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
        applyEditorText(payload.revisedText);
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
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-black [background-image:linear-gradient(rgba(24,24,27,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.2)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(circle_at_center,black,transparent_88%)]"
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <LayoutGroup id="draftr-shell">
          <AnimatePresence mode="wait" initial={false}>
            {isWorkspace ? (
              <motion.section
                key="workspace"
                layoutId="draftr-shell"
                transition={draftrSpring}
                className="w-full max-w-[1500px] overflow-hidden border border-white/10 bg-zinc-950/90 shadow-shell backdrop-blur-2xl"
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
                        onClick={() => void downloadPdfFile(document.fileName, editorText || document.convertedText)}
                        className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5 stroke-[1.25]" />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadMarkdownFile(document.fileName, editorText || document.convertedText)}
                        className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5 stroke-[1.25]" />
                        MD
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
                className="w-full max-w-4xl overflow-hidden border border-white/10 bg-zinc-950/90 shadow-shell backdrop-blur-2xl"
              >
                <div className="flex min-h-[78vh] flex-col">
                  <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 sm:px-8">
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.45em] text-zinc-500">Draftr</p>
                      <p className="mt-2 text-sm text-zinc-400">Digital Zen for PDF and Markdown</p>
                    </div>
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-zinc-600">Upload to continue</p>
                  </div>

                  <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
                    <MagicUploadZone onFilesSelected={handleFilesSelected} isBusy={isConverting} />
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
        onAnalyze={() => void requestAi("analyze")}
        onEnhance={() => void requestAi("rewrite")}
      />
    </main>
  );
}
