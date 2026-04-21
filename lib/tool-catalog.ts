export type FileToolKey =
  | "edit-pdf"
  | "compress-pdf"
  | "translate-pdf"
  | "ocr-pdf"
  | "fill-pdf"
  | "compress-images"
  | "enhance-image"
  | "merge-pdf"
  | "split-pdf";

export interface FileToolCard {
  key: FileToolKey;
  label: string;
  description: string;
  category: string;
  accent: "neutral" | "soft" | "strong";
}

export interface FileToolGroup {
  title: string;
  description: string;
  items: FileToolCard[];
}

export const FILE_TOOL_GROUPS: FileToolGroup[] = [
  {
    title: "Edit & Compress",
    description: "Refine documents, reduce size, and clean up image assets.",
    items: [
      {
        key: "edit-pdf",
        label: "Edit a PDF",
        description: "Open the converted editor and keep working on the current draft.",
        category: "PDF",
        accent: "strong",
      },
      {
        key: "compress-pdf",
        label: "Compress PDF",
        description: "Rebuild a smaller PDF with optimized object streams.",
        category: "PDF",
        accent: "neutral",
      },
      {
        key: "translate-pdf",
        label: "Translate PDF",
        description: "Translate the current document while preserving structure and tone.",
        category: "AI",
        accent: "soft",
      },
      {
        key: "ocr-pdf",
        label: "OCR PDF",
        description: "Extract text from searchable pages and scanned documents.",
        category: "OCR",
        accent: "neutral",
      },
      {
        key: "fill-pdf",
        label: "Fill PDF",
        description: "Overlay typed content onto a page for a quick fill workflow.",
        category: "PDF",
        accent: "soft",
      },
      {
        key: "compress-images",
        label: "Compress Images",
        description: "Shrink image uploads without sacrificing a clean preview.",
        category: "Image",
        accent: "neutral",
      },
      {
        key: "enhance-image",
        label: "Enhance Image",
        description: "Sharpen, lift contrast, and polish flat-looking images.",
        category: "Image",
        accent: "strong",
      },
    ],
  },
  {
    title: "Split & Merge",
    description: "Reorganize entire PDFs into fresh deliverables.",
    items: [
      {
        key: "merge-pdf",
        label: "Merge PDF",
        description: "Combine multiple PDF files into one polished export.",
        category: "PDF",
        accent: "strong",
      },
      {
        key: "split-pdf",
        label: "Split PDF",
        description: "Split one PDF into per-page downloads and a clean archive.",
        category: "PDF",
        accent: "neutral",
      },
    ],
  },
];

export function getToolCardByKey(key: FileToolKey): FileToolCard | undefined {
  for (const group of FILE_TOOL_GROUPS) {
    const match = group.items.find((item) => item.key === key);

    if (match) {
      return match;
    }
  }

  return undefined;
}
