"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Highlighter, Layers3, MessageSquareQuote, PenLine, Trash2, Underline } from "lucide-react";

import { DocumentNavigator } from "@/components/workspace/document-navigator";
import { cn } from "@/lib/utils";
import { formatFileSize, type AnnotationKind, type ConvertedDocument, type PdfAnnotation, type PdfSelection, type RelativeRect } from "@/lib/document";
import { focusTextareaLine } from "@/lib/text-navigation";

interface PdfEditorPanelProps {
  document: ConvertedDocument;
  fileUrl: string | null;
  editorText: string;
  onEditorTextChange: (value: string) => void;
}

type ViewerMode = "pages" | "text";
type PdfViewport = {
  width: number;
  height: number;
};

type PdfPageProxy = {
  getViewport: (options: { scale: number }) => PdfViewport;
};

type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  destroy: () => Promise<void> | void;
};

type PdfRenderableView = {
  setPdfPage: (page: PdfPageProxy) => void;
  draw: () => Promise<void>;
  destroy: () => void;
};

type PdfRenderingQueue = {
  setViewer: (viewer: PdfRenderableView) => void;
  setThumbnailViewer: (viewer: PdfRenderableView) => void;
};

type PdfEventBus = object;

type PdfLinkService = {
  setDocument: (document: PdfDocumentProxy) => void;
};

type PdfPageViewOptions = {
  container: HTMLDivElement;
  eventBus: PdfEventBus;
  id: number;
  scale: number;
  defaultViewport: PdfViewport;
  renderingQueue: PdfRenderingQueue;
  textLayerMode: number;
  annotationMode: number;
  imageResourcesPath?: string;
};

type PdfThumbnailViewOptions = {
  container: HTMLDivElement;
  eventBus: PdfEventBus;
  id: number;
  defaultViewport: PdfViewport;
  linkService: PdfLinkService;
  renderingQueue: PdfRenderingQueue;
};

type PdfViewerModule = {
  PDFPageView: new (options: PdfPageViewOptions) => PdfRenderableView;
  PDFThumbnailView: new (options: PdfThumbnailViewOptions) => PdfRenderableView;
  PDFRenderingQueue: new () => PdfRenderingQueue;
  EventBus: new () => PdfEventBus;
  SimpleLinkService: new (options: { eventBus: PdfEventBus }) => PdfLinkService;
};

type PdfCoreModule = {
  getDocument: (options: { url: string; disableWorker?: boolean }) => { promise: Promise<PdfDocumentProxy> };
};

const TEXT_LAYER_MODE_ENABLE = 1;
const ANNOTATION_MODE_ENABLE_FORMS = 2;

function createId(prefix: string) {
  const randomPart = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${randomPart}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildRelativeRect(clientRect: DOMRect, containerRect: DOMRect): RelativeRect {
  const left = ((clientRect.left - containerRect.left) / containerRect.width) * 100;
  const top = ((clientRect.top - containerRect.top) / containerRect.height) * 100;
  const width = (clientRect.width / containerRect.width) * 100;
  const height = (clientRect.height / containerRect.height) * 100;

  return {
    left: clamp(left, 0, 100),
    top: clamp(top, 0, 100),
    width: clamp(width, 0, 100),
    height: clamp(height, 0, 100),
  };
}

function buildSelection(pageNumber: number, container: HTMLElement): PdfSelection | null {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const commonAncestor = range.commonAncestorContainer;

  if (!container.contains(commonAncestor)) {
    return null;
  }

  const text = selection.toString().trim();

  if (text.length === 0) {
    return null;
  }

  const rects = Array.from(range.getClientRects())
    .map((rect) => buildRelativeRect(rect, container.getBoundingClientRect()))
    .filter((rect) => rect.width > 0 && rect.height > 0);

  if (rects.length === 0) {
    return null;
  }

  return {
    pageNumber,
    text,
    rects,
    anchorRect: rects[0],
  };
}

function PdfThumbnailItem({
  pdfDocument,
  pageNumber,
  isActive,
  onSelect,
}: {
  pdfDocument: PdfDocumentProxy;
  pageNumber: number;
  isActive: boolean;
  onSelect: (pageNumber: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<PdfRenderableView | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderThumbnail = async () => {
      if (!containerRef.current) {
        return;
      }

      const viewerModule = (await import("pdfjs-dist/web/pdf_viewer.mjs")) as unknown as PdfViewerModule;
      const { PDFRenderingQueue, PDFThumbnailView, EventBus, SimpleLinkService } = viewerModule;

      if (cancelled || !containerRef.current) {
        return;
      }

      containerRef.current.replaceChildren();
      const page = await pdfDocument.getPage(pageNumber);
      const defaultViewport = page.getViewport({ scale: 0.18 });
      const eventBus = new EventBus();
      const renderingQueue = new PDFRenderingQueue();
      const linkService = new SimpleLinkService({ eventBus });
      const thumbnailView = new PDFThumbnailView({
        container: containerRef.current,
        eventBus,
        id: pageNumber,
        defaultViewport,
        linkService,
        renderingQueue,
      });

      renderingQueue.setThumbnailViewer(thumbnailView);
      linkService.setDocument(pdfDocument);
      thumbnailView.setPdfPage(page);
      viewRef.current = thumbnailView;

      await thumbnailView.draw();

      if (cancelled) {
        thumbnailView.destroy();
      }
    };

    void renderThumbnail();

    return () => {
      cancelled = true;
      viewRef.current?.destroy?.();
      viewRef.current = null;
    };
  }, [pageNumber, pdfDocument]);

  return (
    <button
      type="button"
      onClick={() => onSelect(pageNumber)}
      className={cn(
        "group w-full rounded-sm border px-2 py-2 text-left transition",
        isActive ? "border-white/25 bg-white/[0.06]" : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-white/[0.04]",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[0.6rem] uppercase tracking-[0.28em] text-zinc-500">
        <span>Page {pageNumber}</span>
        <span className={cn("transition", isActive ? "text-white" : "group-hover:text-zinc-300")}>{isActive ? "Active" : "View"}</span>
      </div>
      <div ref={containerRef} className="mt-2 overflow-hidden bg-zinc-100/5" />
    </button>
  );
}

function PdfPageSurface({
  pdfDocument,
  pageNumber,
  scale,
  annotations,
  onSelection,
  onSelectionClear,
}: {
  pdfDocument: PdfDocumentProxy;
  pageNumber: number;
  scale: number;
  annotations: PdfAnnotation[];
  onSelection: (selection: PdfSelection) => void;
  onSelectionClear: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<PdfRenderableView | null>(null);
  const [selectionText, setSelectionText] = useState("");

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!containerRef.current) {
        return;
      }

      const viewerModule = (await import("pdfjs-dist/web/pdf_viewer.mjs")) as unknown as PdfViewerModule;
      const { PDFPageView, PDFRenderingQueue, EventBus } = viewerModule;

      if (cancelled || !containerRef.current) {
        return;
      }

      containerRef.current.replaceChildren();
      const page = await pdfDocument.getPage(pageNumber);
      const defaultViewport = page.getViewport({ scale });
      const eventBus = new EventBus();
      const renderingQueue = new PDFRenderingQueue();
      const pageView = new PDFPageView({
        container: containerRef.current,
        eventBus,
        id: pageNumber,
        scale,
        defaultViewport,
        renderingQueue,
        textLayerMode: TEXT_LAYER_MODE_ENABLE,
        annotationMode: ANNOTATION_MODE_ENABLE_FORMS,
        imageResourcesPath: "",
      });

      renderingQueue.setViewer(pageView);
      pageView.setPdfPage(page);
      viewRef.current = pageView;

      await pageView.draw();

      if (cancelled) {
        pageView.destroy();
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      viewRef.current?.destroy?.();
      viewRef.current = null;
    };
  }, [pageNumber, pdfDocument, scale]);

  useEffect(() => {
    setSelectionText("");
  }, [pageNumber]);

  const handleMouseUp = () => {
    if (!containerRef.current) {
      return;
    }

    const selection = buildSelection(pageNumber, containerRef.current);

    if (!selection) {
      setSelectionText("");
      onSelectionClear();
      return;
    }

    setSelectionText(selection.text);
    onSelection(selection);
  };

  const pageAnnotations = useMemo(() => annotations.filter((annotation) => annotation.pageNumber === pageNumber), [annotations, pageNumber]);

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div
        ref={containerRef}
        data-testid="pdf-page-surface"
        onMouseUp={handleMouseUp}
        className="relative overflow-hidden border border-white/10 bg-white shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {pageAnnotations.map((annotation) =>
          annotation.rects.map((rect, index) => (
            <div
              key={`${annotation.id}-${index}`}
              className={cn(
                "absolute",
                annotation.kind === "highlight" && "bg-amber-300/25 ring-1 ring-amber-200/20",
                annotation.kind === "underline" && "border-b-2 border-cyan-200/70",
                annotation.kind === "note" && "bg-fuchsia-300/12 ring-1 ring-fuchsia-200/20",
              )}
              style={{
                left: `${rect.left}%`,
                top: `${rect.top}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
              }}
            />
          )),
        )}
      </div>

      {selectionText ? (
        <div className="mt-3 border border-white/10 bg-black/50 p-3 text-xs leading-5 text-zinc-400">
          Selected text: <span className="text-zinc-200">{selectionText}</span>
        </div>
      ) : null}
    </div>
  );
}

function PdfTextSurface({
  pageNumber,
  text,
  annotations,
  onSelection,
  onSelectionClear,
}: {
  pageNumber: number;
  text: string;
  annotations: PdfAnnotation[];
  onSelection: (selection: PdfSelection) => void;
  onSelectionClear: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectionText, setSelectionText] = useState("");

  useEffect(() => {
    setSelectionText("");
  }, [pageNumber, text]);

  const handleMouseUp = () => {
    if (!containerRef.current) {
      return;
    }

    const selection = buildSelection(pageNumber, containerRef.current);

    if (!selection) {
      setSelectionText("");
      onSelectionClear();
      return;
    }

    setSelectionText(selection.text);
    onSelection(selection);
  };

  const pageAnnotations = useMemo(() => annotations.filter((annotation) => annotation.pageNumber === pageNumber), [annotations, pageNumber]);

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div
        ref={containerRef}
        data-testid="pdf-page-surface"
        onMouseUp={handleMouseUp}
        className="relative overflow-hidden border border-white/10 bg-white shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
      >
        <pre className="whitespace-pre-wrap p-8 font-sans text-[0.96rem] leading-7 text-zinc-900">{text}</pre>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {pageAnnotations.map((annotation) =>
          annotation.rects.map((rect, index) => (
            <div
              key={`${annotation.id}-${index}`}
              className={cn(
                "absolute",
                annotation.kind === "highlight" && "bg-amber-300/25 ring-1 ring-amber-200/20",
                annotation.kind === "underline" && "border-b-2 border-cyan-200/70",
                annotation.kind === "note" && "bg-fuchsia-300/12 ring-1 ring-fuchsia-200/20",
              )}
              style={{
                left: `${rect.left}%`,
                top: `${rect.top}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
              }}
            />
          )),
        )}
      </div>

      {selectionText ? (
        <div className="mt-3 border border-white/10 bg-black/50 p-3 text-xs leading-5 text-zinc-400">
          Selected text: <span className="text-zinc-200">{selectionText}</span>
        </div>
      ) : null}
    </div>
  );
}

export function PdfEditorPanel({ document, fileUrl, editorText, onEditorTextChange }: PdfEditorPanelProps) {
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentProxy | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("pages");
  const [activePage, setActivePage] = useState(1);
  const [scale, setScale] = useState(1.18);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [selection, setSelection] = useState<PdfSelection | null>(null);
  const [annotationKind, setAnnotationKind] = useState<AnnotationKind>("highlight");
  const [annotationNote, setAnnotationNote] = useState("");
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const textTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let activeDocument: PdfDocumentProxy | null = null;

    const loadPdf = async () => {
      if (!fileUrl) {
        setPdfDocument(null);
        setViewerError(null);
        setIsLoadingPdf(false);
        return;
      }

      setIsLoadingPdf(true);
      setViewerError(null);
      setPdfDocument(null);
      setActivePage(1);
      setAnnotations([]);
      setSelection(null);
      setAnnotationNote("");

      try {
        const { getDocument } = (await import("pdfjs-dist")) as PdfCoreModule;
        const task = getDocument({ url: fileUrl, disableWorker: true });
        const loadedDocument = await task.promise;

        if (cancelled) {
          void loadedDocument.destroy();
          return;
        }

        activeDocument = loadedDocument;
        setPdfDocument(loadedDocument);
      } catch (error) {
        if (!cancelled) {
          setViewerError(error instanceof Error ? error.message : "Unable to load the PDF viewer.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPdf(false);
        }
      }
    };

    void loadPdf();

    return () => {
      cancelled = true;
      if (activeDocument) {
        void activeDocument.destroy();
      }
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!pdfDocument) {
      return;
    }

    setActivePage((currentPage) => clamp(currentPage, 1, pdfDocument.numPages));
  }, [pdfDocument]);

  const pageNumbers = useMemo(() => {
    if (!pdfDocument) {
      return [];
    }

    return Array.from({ length: pdfDocument.numPages }, (_, index) => index + 1);
  }, [pdfDocument]);

  const canAnnotate = viewerMode === "pages" && selection !== null;
  const currentAnnotationCount = annotations.length;

  const handleApplyAnnotation = (kind: AnnotationKind) => {
    if (!selection) {
      return;
    }

    const note = kind === "note" ? annotationNote.trim() : "";
    const nextAnnotation: PdfAnnotation = {
      id: createId("annotation"),
      pageNumber: selection.pageNumber,
      kind,
      text: selection.text,
      note,
      rects: selection.rects,
    };

    setAnnotations((current) => [nextAnnotation, ...current]);
    setSelection(null);
    setAnnotationNote("");
    window.getSelection()?.removeAllRanges();
  };

  const handleClearAnnotations = () => {
    setAnnotations([]);
    setSelection(null);
    setAnnotationNote("");
  };

  const handleJumpToTextLine = (lineNumber: number) => {
    focusTextareaLine(textTextareaRef.current, editorText, lineNumber);
  };

  const headerText = document.kind === "pdf" ? "Native PDF editor" : "Markdown editor";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.35em] text-zinc-500">
            <FileText className="h-4 w-4 stroke-[1.25]" />
            <span data-testid="pdf-editor-title">{headerText}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-white" data-testid="pdf-editor-file-name">{document.fileName}</p>
          <p className="mt-2 text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">
            {document.kind === "pdf"
              ? "Edit the extracted text, annotate pages, and export a revised PDF"
              : "Edit the markdown before exporting a fresh file"}
          </p>
        </div>

        <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.32em] text-zinc-500">
          <Layers3 className="h-4 w-4 stroke-[1.25]" />
          <span>{formatFileSize(document.byteSize)}</span>
        </div>
      </div>

      {document.kind === "pdf" ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setViewerMode("pages")}
                className={cn(
                  "inline-flex items-center gap-2 border px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] transition",
                  viewerMode === "pages"
                    ? "border-white/20 bg-white text-black"
                    : "border-white/10 bg-black/30 text-zinc-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white",
                )}
              >
                <Layers3 className="h-3.5 w-3.5 stroke-[1.25]" />
                Pages
              </button>
              <button
                type="button"
                onClick={() => setViewerMode("text")}
                className={cn(
                  "inline-flex items-center gap-2 border px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] transition",
                  viewerMode === "text"
                    ? "border-white/20 bg-white text-black"
                    : "border-white/10 bg-black/30 text-zinc-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white",
                )}
              >
                <PenLine className="h-3.5 w-3.5 stroke-[1.25]" />
                Text
              </button>
            </div>

            {viewerMode === "pages" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScale((current) => clamp(Number((current - 0.1).toFixed(2)), 0.9, 1.8))}
                  className="inline-flex items-center gap-2 border border-white/10 bg-black/30 px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                >
                  <ChevronLeft className="h-3.5 w-3.5 stroke-[1.25]" />
                  Zoom out
                </button>
                <div className="border border-white/10 bg-black/30 px-3 py-2 text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">
                  {Math.round(scale * 100)}%
                </div>
                <button
                  type="button"
                  onClick={() => setScale((current) => clamp(Number((current + 0.1).toFixed(2)), 0.9, 1.8))}
                  className="inline-flex items-center gap-2 border border-white/10 bg-black/30 px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                >
                  Zoom in
                  <ChevronRight className="h-3.5 w-3.5 stroke-[1.25]" />
                </button>
              </div>
            ) : (
              <div className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">
                Editing the extracted source text for export
              </div>
            )}
          </div>

          {viewerError ? (
            <div className="border border-red-500/20 bg-red-500/5 p-4 text-sm leading-6 text-red-200">{viewerError}</div>
          ) : null}

          {isLoadingPdf ? (
            <div className="flex min-h-[360px] items-center justify-center border border-white/10 bg-black/30 text-center text-sm text-zinc-500">
              Loading the native PDF viewer...
            </div>
          ) : viewerMode === "pages" ? (
            viewerError ? (
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-sm border border-white/10 bg-zinc-900/40 p-4">
                <div className="rounded-none border border-red-500/20 bg-red-500/5 p-4 text-sm leading-6 text-red-200">
                  {viewerError}
                </div>

                <PdfTextSurface
                  pageNumber={1}
                  text={editorText}
                  annotations={annotations}
                  onSelection={(nextSelection) => setSelection(nextSelection)}
                  onSelectionClear={() => setSelection(null)}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">
                    Page 1 of 1
                  </div>
                  <div className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">
                    {currentAnnotationCount} annotation{currentAnnotationCount === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 grid-cols-[92px_minmax(0,1fr)] gap-4">
                <aside className="min-h-0 space-y-3 overflow-y-auto pr-1">
                  {pageNumbers.map((pageNumber) => (
                    <PdfThumbnailItem
                      key={pageNumber}
                      pdfDocument={pdfDocument as PdfDocumentProxy}
                      pageNumber={pageNumber}
                      isActive={pageNumber === activePage}
                      onSelect={(selectedPage) => {
                        setActivePage(selectedPage);
                        setSelection(null);
                      }}
                    />
                  ))}
                </aside>

                <div className="min-h-0 overflow-y-auto rounded-sm border border-white/10 bg-zinc-900/40 p-4">
                  <PdfPageSurface
                    pdfDocument={pdfDocument as PdfDocumentProxy}
                    pageNumber={activePage}
                    scale={scale}
                    annotations={annotations}
                    onSelection={(nextSelection) => setSelection(nextSelection)}
                    onSelectionClear={() => setSelection(null)}
                  />

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <div className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">
                      Page {activePage} of {pdfDocument?.numPages ?? 0}
                    </div>
                    <div className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">
                      {currentAnnotationCount} annotation{currentAnnotationCount === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="min-h-0 flex-1 border border-white/10 bg-black/35 p-4">
              <div className="space-y-4">
                <DocumentNavigator text={editorText} onJumpToLine={handleJumpToTextLine} />
                <label className="flex h-full min-h-[420px] flex-col gap-3">
                  <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.32em] text-zinc-500">
                    <PenLine className="h-4 w-4 stroke-[1.25]" />
                    <span>Editable content</span>
                  </div>
                  <textarea
                    ref={textTextareaRef}
                    value={editorText}
                    onChange={(event) => onEditorTextChange(event.target.value)}
                    spellCheck={false}
                    className="min-h-[380px] flex-1 resize-none border border-white/10 bg-black/60 p-4 font-mono text-[0.92rem] leading-7 text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-white/20"
                    placeholder="Converted PDF text appears here. Edit it before exporting a revised PDF."
                  />
                </label>
              </div>
            </div>
          )}

          {viewerMode === "pages" ? (
            <div className="space-y-4 border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">Annotation tools</p>
                  <p className="mt-2 text-sm text-zinc-400">
                    Select text in the active page, then save a highlight, underline, or note.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearAnnotations}
                  disabled={annotations.length === 0}
                  className="inline-flex items-center gap-2 border border-white/10 bg-black/30 px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5 stroke-[1.25]" />
                  Clear
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAnnotationKind("highlight")}
                  className={cn(
                    "inline-flex items-center gap-2 border px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] transition",
                    annotationKind === "highlight"
                      ? "border-white/20 bg-white text-black"
                      : "border-white/10 bg-black/30 text-zinc-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  <Highlighter className="h-3.5 w-3.5 stroke-[1.25]" />
                  Highlight
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationKind("underline")}
                  className={cn(
                    "inline-flex items-center gap-2 border px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] transition",
                    annotationKind === "underline"
                      ? "border-white/20 bg-white text-black"
                      : "border-white/10 bg-black/30 text-zinc-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  <Underline className="h-3.5 w-3.5 stroke-[1.25]" />
                  Underline
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationKind("note")}
                  className={cn(
                    "inline-flex items-center gap-2 border px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] transition",
                    annotationKind === "note"
                      ? "border-white/20 bg-white text-black"
                      : "border-white/10 bg-black/30 text-zinc-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  <MessageSquareQuote className="h-3.5 w-3.5 stroke-[1.25]" />
                  Note
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
                <label className="flex flex-col gap-2">
                  <span className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">Note text</span>
                  <textarea
                    value={annotationNote}
                    onChange={(event) => setAnnotationNote(event.target.value)}
                    placeholder="Write a note for comment annotations."
                    className="min-h-24 resize-none border border-white/10 bg-black/50 p-3 text-sm leading-6 text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-white/20"
                  />
                </label>

                <div className="flex flex-col justify-between gap-3 border border-white/10 bg-black/30 p-3 text-sm text-zinc-400">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">Selection status</p>
                    <p className="mt-2 leading-6 text-zinc-300">
                      {canAnnotate
                        ? `Ready to save a ${annotationKind} on page ${selection?.pageNumber ?? activePage}.`
                        : "Select text on the active page to create an annotation."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyAnnotation(annotationKind)}
                    disabled={!selection}
                    className="inline-flex items-center justify-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save annotation
                  </button>
                </div>
              </div>

              {annotations.length > 0 ? (
                <div data-testid="pdf-annotation-history" className="border-t border-white/10 pt-4">
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">Annotation history</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {annotations.map((annotation) => (
                      <button
                        key={annotation.id}
                        type="button"
                        onClick={() => {
                          setActivePage(annotation.pageNumber);
                          setViewerMode("pages");
                        }}
                        className="inline-flex items-center gap-2 border border-white/10 bg-black/30 px-3 py-2 text-left text-[0.7rem] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                      >
                        <span className="uppercase tracking-[0.26em] text-zinc-500">{annotation.kind}</span>
                        <span className="max-w-[180px] truncate">{annotation.text}</span>
                        <span className="text-zinc-500">P{annotation.pageNumber}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 border border-white/10 bg-black/35 p-4">
          <label className="flex min-h-[420px] flex-1 flex-col gap-3">
            <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.32em] text-zinc-500">
              <PenLine className="h-4 w-4 stroke-[1.25]" />
              <span>Editable content</span>
            </div>
            <textarea
              value={editorText}
              onChange={(event) => onEditorTextChange(event.target.value)}
              spellCheck={false}
              className="min-h-[380px] flex-1 resize-none border border-white/10 bg-black/50 p-4 font-mono text-[0.92rem] leading-7 text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-white/20"
              placeholder="Write or refine markdown here. The preview updates live."
            />
          </label>
        </div>
      )}
    </div>
  );
}
