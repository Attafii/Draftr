"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Image as ImageIcon, Languages, Layers3, Minimize2, PenLine, ScanText, Scissors, Sparkles, Upload } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { downloadBlobFile, downloadMarkdownFile, downloadPdfFile } from "@/lib/download";
import { compressPdfFile, fillPdfFile, mergePdfFiles, splitPdfFile, zipBinaryFiles } from "@/lib/file-operations";
import { compressImageFile, enhanceImageFile, ocrImageFile, ocrPdfFile } from "@/lib/image-operations";
import { FILE_TOOL_GROUPS, getToolCardByKey, type FileToolCard, type FileToolKey } from "@/lib/tool-catalog";
import { buildAiRequestPayload } from "@/lib/workspace";
import { convertDocument } from "@/lib/document-client";
import { buildExportFileName, stripFileExtension, type ConvertedDocument } from "@/lib/document";
import { cn } from "@/lib/utils";

interface ToolSuiteProps {
  currentDocument: ConvertedDocument | null;
  onEditShortcut: () => void;
}

interface TranslateResponse {
  error?: string;
  revisedText?: string;
  summary?: string;
  usedFallback?: boolean;
}

const TRANSLATION_LANGUAGES = [
  "Arabic",
  "Chinese",
  "Dutch",
  "English",
  "French",
  "German",
  "Hindi",
  "Italian",
  "Japanese",
  "Korean",
  "Portuguese",
  "Spanish",
];

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function getAcceptForTool(tool: FileToolKey): string {
  if (tool === "compress-images" || tool === "enhance-image") {
    return "image/*";
  }

  return ".pdf,.md,.markdown,application/pdf,text/markdown,text/x-markdown,application/x-markdown";
}

function canSelectMultiple(tool: FileToolKey): boolean {
  return tool === "merge-pdf" || tool === "compress-images" || tool === "enhance-image";
}

function getToolIcon(tool: FileToolKey) {
  switch (tool) {
    case "edit-pdf":
      return FileText;
    case "compress-pdf":
      return Minimize2;
    case "translate-pdf":
      return Languages;
    case "ocr-pdf":
      return ScanText;
    case "fill-pdf":
      return PenLine;
    case "compress-images":
      return ImageIcon;
    case "enhance-image":
      return Sparkles;
    case "merge-pdf":
      return Layers3;
    case "split-pdf":
      return Scissors;
    default:
      return FileText;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function buildZipName(fileName: string, suffix: string): string {
  return `${stripFileExtension(fileName)}-${suffix}.zip`;
}

function bytesToBlobPart(bytes: Uint8Array): BlobPart {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function cardAccentClasses(accent: FileToolCard["accent"]) {
  switch (accent) {
    case "strong":
      return "border-white/20 bg-white/[0.08] text-white";
    case "soft":
      return "border-white/10 bg-white/[0.04] text-zinc-200";
    default:
      return "border-white/10 bg-black/25 text-zinc-200";
  }
}

export function ToolSuite({ currentDocument, onEditShortcut }: ToolSuiteProps) {
  const [activeTool, setActiveTool] = useState<FileToolKey | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [translateLanguage, setTranslateLanguage] = useState("Spanish");
  const [translateOutput, setTranslateOutput] = useState<"markdown" | "pdf">("markdown");
  const [fillText, setFillText] = useState("Approved for final export.");
  const [fillPage, setFillPage] = useState(1);
  const [fillX, setFillX] = useState(56);
  const [fillY, setFillY] = useState(720);
  const [fillSize, setFillSize] = useState(12);
  const [ocrMode, setOcrMode] = useState<"auto" | "eng">("auto");
  const [imageQuality, setImageQuality] = useState(0.84);
  const [imageMaxDimension, setImageMaxDimension] = useState(2200);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeCard = activeTool ? getToolCardByKey(activeTool) ?? null : null;
  const ActiveIcon = activeTool ? getToolIcon(activeTool) : null;

  useEffect(() => {
    if (!activeTool) {
      return;
    }

    setSelectedFiles([]);
    setStatusMessage(null);
    setErrorMessage(null);
  }, [activeTool]);

  const handleOpenTool = (tool: FileToolKey) => {
    if (tool === "edit-pdf") {
      onEditShortcut();
      return;
    }

    setActiveTool(tool);
  };

  const handleFilePick = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setSelectedFiles(Array.from(files));
    setErrorMessage(null);
    setStatusMessage(`${files.length} file${files.length === 1 ? "" : "s"} selected.`);
  };

  const handleOpenPicker = () => {
    if (!fileInputRef.current || !activeTool) {
      return;
    }

    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const uploadAccept = activeTool ? getAcceptForTool(activeTool) : ".pdf";
  const allowMultiple = activeTool ? canSelectMultiple(activeTool) : false;
  const ocrLanguage = ocrMode === "auto" ? "eng" : ocrMode;

  const executeTool = async () => {
    if (!activeTool) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      switch (activeTool) {
        case "compress-pdf": {
          const file = selectedFiles[0];

          if (!file) {
            throw new Error("Select a PDF file to compress.");
          }

          const compressedBytes = await compressPdfFile(await file.arrayBuffer());
          downloadBlobFile(
            buildExportFileName(file.name.replace(/\.pdf$/i, ""), "pdf"),
            new Blob([bytesToBlobPart(compressedBytes)], { type: "application/pdf" }),
          );
          setStatusMessage(`Compressed ${file.name} and prepared a smaller PDF download.`);
          break;
        }
        case "merge-pdf": {
          if (selectedFiles.length < 2) {
            throw new Error("Select at least two PDF files to merge.");
          }

          const mergedBytes = await mergePdfFiles(await Promise.all(selectedFiles.map((file) => file.arrayBuffer())));
          const outputName = `${stripFileExtension(selectedFiles[0].name)}-merged.pdf`;

          downloadBlobFile(outputName, new Blob([bytesToBlobPart(mergedBytes)], { type: "application/pdf" }));
          setStatusMessage(`Merged ${selectedFiles.length} files into one PDF.`);
          break;
        }
        case "split-pdf": {
          const file = selectedFiles[0];

          if (!file) {
            throw new Error("Select a PDF file to split.");
          }

          const splitPages = await splitPdfFile(await file.arrayBuffer(), file.name);
          const zipBytes = await zipBinaryFiles(splitPages);

          downloadBlobFile(buildZipName(file.name, "split"), new Blob([bytesToBlobPart(zipBytes)], { type: "application/zip" }));
          setStatusMessage(`Split ${file.name} into ${splitPages.length} page files.`);
          break;
        }
        case "fill-pdf": {
          const file = selectedFiles[0];

          if (!file) {
            throw new Error("Select a PDF file to fill.");
          }

          if (fillText.trim().length === 0) {
            throw new Error("Enter the text that should be added to the PDF.");
          }

          const filledBytes = await fillPdfFile(await file.arrayBuffer(), [
            {
              pageNumber: fillPage,
              text: fillText.trim(),
              x: fillX,
              y: fillY,
              size: fillSize,
            },
          ]);

          downloadBlobFile(
            `${stripFileExtension(file.name)}-filled.pdf`,
            new Blob([bytesToBlobPart(filledBytes)], { type: "application/pdf" }),
          );
          setStatusMessage(`Placed text on page ${fillPage} and prepared a filled PDF.`);
          break;
        }
        case "translate-pdf": {
          const file = selectedFiles[0];

          if (!file) {
            throw new Error("Select a document to translate.");
          }

          const converted = await convertDocument(file);
          const response = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              buildAiRequestPayload(
                converted,
                converted.convertedText,
                "rewrite",
                `Translate the document into ${translateLanguage}. Preserve the original structure, meaning, and tone.`,
              ),
            ),
          });

          const payload = (await response.json()) as TranslateResponse;

          if (!response.ok) {
            throw new Error(payload.error ?? "Translation failed.");
          }

          const translatedText = payload.revisedText ?? "";

          if (translateOutput === "pdf") {
            await downloadPdfFile(file.name, translatedText);
          } else {
            downloadMarkdownFile(file.name, translatedText);
          }

          setStatusMessage(`Translated ${file.name} into ${translateLanguage}.`);
          break;
        }
        case "ocr-pdf": {
          const file = selectedFiles[0];

          if (!file) {
            throw new Error("Select a PDF or image file to OCR.");
          }

          let recognizedText = "";

          if (isImageFile(file)) {
            recognizedText = await ocrImageFile(file, ocrLanguage);
          } else {
            recognizedText = await ocrPdfFile(file, ocrLanguage);
          }

          if (recognizedText.trim().length === 0) {
            throw new Error("No readable text was detected.");
          }

          downloadMarkdownFile(file.name, recognizedText);
          setStatusMessage(`OCR extracted text from ${file.name}.`);
          break;
        }
        case "compress-images": {
          if (selectedFiles.length === 0) {
            throw new Error("Select one or more image files to compress.");
          }

          const archiveFiles = await Promise.all(
            selectedFiles.map(async (file) => ({
              fileName: `${stripFileExtension(file.name)}-compressed.jpg`,
              bytes: new Uint8Array(await (await compressImageFile(file, { quality: imageQuality, maxDimension: imageMaxDimension })).arrayBuffer()),
            })),
          );

          const zipBytes = await zipBinaryFiles(archiveFiles);
          downloadBlobFile("compressed-images.zip", new Blob([bytesToBlobPart(zipBytes)], { type: "application/zip" }));
          setStatusMessage(`Compressed ${selectedFiles.length} image${selectedFiles.length === 1 ? "" : "s"}.`);
          break;
        }
        case "enhance-image": {
          if (selectedFiles.length === 0) {
            throw new Error("Select one or more image files to enhance.");
          }

          const archiveFiles = await Promise.all(
            selectedFiles.map(async (file) => ({
              fileName: `${stripFileExtension(file.name)}-enhanced.jpg`,
              bytes: new Uint8Array(await (await enhanceImageFile(file, { quality: imageQuality, maxDimension: imageMaxDimension })).arrayBuffer()),
            })),
          );

          const zipBytes = await zipBinaryFiles(archiveFiles);
          downloadBlobFile("enhanced-images.zip", new Blob([bytesToBlobPart(zipBytes)], { type: "application/zip" }));
          setStatusMessage(`Enhanced ${selectedFiles.length} image${selectedFiles.length === 1 ? "" : "s"}.`);
          break;
        }
        default:
          throw new Error("Unsupported tool.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The tool could not complete the task.");
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedFileSummary = useMemo(() => {
    if (selectedFiles.length === 0) {
      return activeTool === "merge-pdf" || activeTool === "compress-images" || activeTool === "enhance-image"
        ? "Select multiple files to continue."
        : "Select a file to continue.";
    }

    return selectedFiles
      .map((file) => `${file.name} · ${formatFileSize(file.size)}`)
      .join("\n");
  }, [activeTool, selectedFiles]);

  return (
    <section id="tool-suite" data-testid="tool-suite" aria-labelledby="tool-suite-heading" className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.45em] text-zinc-500">Tool board</p>
          <h2 id="tool-suite-heading" className="mt-3 font-display text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">
            Workflow tools
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
            The suite stays readable on large and small screens, with each tool opening in a focused sheet when needed.
          </p>
        </div>

        <button
          type="button"
          onClick={onEditShortcut}
          className="inline-flex items-center gap-2 self-start border border-white/10 bg-white/[0.03] px-4 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
        >
          <Upload className="h-3.5 w-3.5 stroke-[1.25]" />
          Jump to upload
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {FILE_TOOL_GROUPS.map((group) => (
          <article key={group.title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 shadow-shell sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="font-display text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">{group.title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{group.description}</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-[0.62rem] uppercase tracking-[0.24em] text-zinc-500">
                {group.items.length} tools
              </span>
            </div>

            <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {group.items.map((card) => {
                const Icon = getToolIcon(card.key);

                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => handleOpenTool(card.key)}
                    className={cn(
                      "group flex min-h-[210px] flex-col justify-between rounded-[1.25rem] border p-5 text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] focus-visible:ring-1 focus-visible:ring-white/40",
                      cardAccentClasses(card.accent),
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-black/25 text-white transition group-hover:border-white/20 group-hover:bg-white/[0.08]">
                        <Icon className="h-5 w-5 stroke-[1.8]" />
                      </div>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.22em] text-zinc-500">
                        {card.category}
                      </span>
                    </div>

                    <div className="mt-6">
                      <span className="block text-lg font-medium tracking-[-0.03em] text-white">{card.label}</span>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">{card.description}</p>
                    </div>

                    <div className="mt-5 flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.26em] text-zinc-500">
                      <span className="h-px flex-1 bg-white/10" />
                      <span>Open sheet</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <Sheet
        open={activeTool !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveTool(null);
          }
        }}
      >
        <SheetContent side="right" className="ai-sidebar-scrollbar w-full overflow-y-auto border-white/10 bg-zinc-950 px-6 py-6 text-white sm:max-w-xl sm:px-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          <SheetHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-white/[0.03]">
                {ActiveIcon ? <ActiveIcon className="h-5 w-5 stroke-[1.4]" /> : <Upload className="h-5 w-5 stroke-[1.4]" />}
              </div>
              <div>
                <SheetTitle>{activeCard?.label ?? "Tool"}</SheetTitle>
                <SheetDescription className="mt-1 text-zinc-500">{activeCard?.description ?? "Select files and configure the operation."}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {activeTool ? (
            <div className="space-y-5 border-t border-white/10 pt-6">
              <div className="border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">Files</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {activeTool === "merge-pdf" || activeTool === "compress-images" || activeTool === "enhance-image"
                        ? "Upload multiple files for batch processing."
                        : "Upload a file, then run the tool."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenPicker}
                    className="inline-flex items-center gap-2 border border-white/10 bg-black/30 px-3 py-2 text-[0.65rem] uppercase tracking-[0.26em] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                  >
                    <Upload className="h-3.5 w-3.5 stroke-[1.25]" />
                    Browse
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  data-testid="tool-suite-file-input"
                  accept={uploadAccept}
                  multiple={allowMultiple}
                  className="sr-only"
                  onChange={(event) => handleFilePick(event.target.files)}
                />

                <div className="mt-4 border border-dashed border-white/10 bg-black/30 p-4 text-sm leading-6 text-zinc-400 whitespace-pre-line">
                  {selectedFileSummary}
                </div>
              </div>

              {activeTool === "translate-pdf" ? (
                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <label className="block space-y-2">
                    <span className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">Target language</span>
                    <select
                      value={translateLanguage}
                      onChange={(event) => setTranslateLanguage(event.target.value)}
                      className="w-full border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-white/20"
                    >
                      {TRANSLATION_LANGUAGES.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mt-4 block space-y-2">
                    <span className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">Output</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTranslateOutput("markdown")}
                        className={cn(
                          "flex-1 border px-3 py-2 text-[0.65rem] uppercase tracking-[0.24em] transition",
                          translateOutput === "markdown"
                            ? "border-white/20 bg-white text-black"
                            : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
                        )}
                      >
                        Markdown
                      </button>
                      <button
                        type="button"
                        onClick={() => setTranslateOutput("pdf")}
                        className={cn(
                          "flex-1 border px-3 py-2 text-[0.65rem] uppercase tracking-[0.24em] transition",
                          translateOutput === "pdf"
                            ? "border-white/20 bg-white text-black"
                            : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
                        )}
                      >
                        PDF
                      </button>
                    </div>
                  </label>
                </div>
              ) : null}

              {activeTool === "fill-pdf" ? (
                <div className="grid gap-4 border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
                  <label className="block space-y-2 sm:col-span-2">
                    <span className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">Fill text</span>
                    <textarea
                      value={fillText}
                      onChange={(event) => setFillText(event.target.value)}
                      className="min-h-28 w-full resize-none border border-white/10 bg-black/50 p-3 text-sm leading-6 text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-white/20"
                      placeholder="Enter the content you want placed on the page."
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">Page</span>
                    <input
                      type="number"
                      min={1}
                      value={fillPage}
                      onChange={(event) => setFillPage(Number(event.target.value) || 1)}
                      className="w-full border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-white/20"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">Font size</span>
                    <input
                      type="number"
                      min={8}
                      max={48}
                      value={fillSize}
                      onChange={(event) => setFillSize(Number(event.target.value) || 12)}
                      className="w-full border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-white/20"
                    />
                  </label>

                  <label className="block space-y-2 sm:col-span-2">
                    <span className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">Placement</span>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <input
                        type="number"
                        min={0}
                        value={fillX}
                        onChange={(event) => setFillX(Number(event.target.value) || 0)}
                        className="w-full border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-white/20"
                        placeholder="X"
                      />
                      <input
                        type="number"
                        min={0}
                        value={fillY}
                        onChange={(event) => setFillY(Number(event.target.value) || 0)}
                        className="w-full border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-white/20"
                        placeholder="Y"
                      />
                      <div className="col-span-2 text-xs leading-5 text-zinc-500 sm:text-right">Use the bottom-left origin used by PDF coordinates.</div>
                    </div>
                  </label>
                </div>
              ) : null}

              {activeTool === "compress-images" || activeTool === "enhance-image" ? (
                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">Max dimension</span>
                      <input
                        type="range"
                        min={1200}
                        max={3200}
                        step={100}
                        value={imageMaxDimension}
                        onChange={(event) => setImageMaxDimension(Number(event.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-zinc-500">{imageMaxDimension}px</p>
                    </label>
                    <label className="block space-y-2">
                      <span className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">Quality</span>
                      <input
                        type="range"
                        min={0.5}
                        max={0.98}
                        step={0.01}
                        value={imageQuality}
                        onChange={(event) => setImageQuality(Number(event.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-zinc-500">{Math.round(imageQuality * 100)}%</p>
                    </label>
                  </div>
                </div>
              ) : null}

              {activeTool === "ocr-pdf" ? (
                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <label className="block space-y-2">
                    <span className="text-[0.65rem] uppercase tracking-[0.28em] text-zinc-500">OCR mode</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOcrMode("auto")}
                        className={cn(
                          "flex-1 border px-3 py-2 text-[0.65rem] uppercase tracking-[0.24em] transition",
                          ocrMode === "auto"
                            ? "border-white/20 bg-white text-black"
                            : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
                        )}
                      >
                        Auto
                      </button>
                      <button
                        type="button"
                        onClick={() => setOcrMode("eng")}
                        className={cn(
                          "flex-1 border px-3 py-2 text-[0.65rem] uppercase tracking-[0.24em] transition",
                          ocrMode === "eng"
                            ? "border-white/20 bg-white text-black"
                            : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
                        )}
                      >
                        English
                      </button>
                    </div>
                  </label>
                </div>
              ) : null}

              <div className="space-y-3 border border-white/10 bg-black/35 p-4">
                {currentDocument ? (
                  <div className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                    Current document: {currentDocument.fileName}
                  </div>
                ) : null}
                {statusMessage ? <p className="text-sm leading-6 text-zinc-300">{statusMessage}</p> : null}
                {errorMessage ? <p className="text-sm leading-6 text-red-200">{errorMessage}</p> : null}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void executeTool()}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] px-4 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : "Run tool"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTool(null)}
                    className="inline-flex items-center gap-2 border border-white/10 bg-black/30 px-4 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
