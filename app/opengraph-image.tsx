import { ImageResponse } from "next/og";

import { BrandMark } from "@/components/brand-mark";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function Chip({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        borderRadius: 9999,
        border: "1px solid rgba(255, 255, 255, 0.12)",
        background: "rgba(255, 255, 255, 0.04)",
        padding: "10px 16px",
        color: "#d4d4d8",
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at top left, rgba(255, 255, 255, 0.12), transparent 30%), radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.08), transparent 28%), linear-gradient(180deg, #0f0f10 0%, #050505 100%)",
          color: "#f5f5f5",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(circle at center, black, transparent 82%)",
            opacity: 0.75,
          }}
        />

        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            padding: 64,
            gap: 48,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 560 }}>
              <BrandMark size={96} variant="dark" />

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "0.42em",
                    textTransform: "uppercase",
                    color: "#9ca3af",
                  }}
                >
                  Draftr
                </div>
                <div
                  style={{
                    fontSize: 72,
                    lineHeight: 0.94,
                    fontWeight: 700,
                    letterSpacing: "-0.07em",
                  }}
                >
                  Document workflows, cleaned up.
                </div>
                <div style={{ fontSize: 28, lineHeight: 1.35, color: "#a1a1aa", maxWidth: 520 }}>
                  A dark workspace for PDF and Markdown conversion, editing, compression, OCR, and AI-assisted rewrites.
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <Chip label="PDF" />
                <Chip label="Markdown" />
                <Chip label="OCR" />
                <Chip label="AI rewrite" />
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, color: "#71717a", fontSize: 20, lineHeight: 1.4, maxWidth: 520 }}>
              <div style={{ flex: 1 }}>
                Client-side conversion, revision history, and batch tools live in one focused editor flow.
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: 458,
              flexShrink: 0,
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
                borderRadius: 32,
                border: "1px solid rgba(255, 255, 255, 0.14)",
                background: "rgba(255, 255, 255, 0.04)",
                padding: 28,
                boxShadow: "0 24px 80px rgba(0, 0, 0, 0.45)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <BrandMark size={72} variant="light" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#d4d4d8" }}>
                      Edit & Compress
                    </div>
                    <div style={{ fontSize: 22, color: "#a1a1aa" }}>Preview, refine, and export without losing the draft.</div>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 9999,
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    padding: "10px 16px",
                    color: "#d4d4d8",
                    fontSize: 18,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Live
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div
                  style={{
                    borderRadius: 24,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    background: "rgba(0, 0, 0, 0.28)",
                    padding: 18,
                    minHeight: 170,
                  }}
                >
                  <div style={{ fontSize: 16, letterSpacing: "0.26em", textTransform: "uppercase", color: "#71717a" }}>Merge PDF</div>
                  <div style={{ marginTop: 14, fontSize: 22, lineHeight: 1.35, color: "#f4f4f5" }}>
                    Combine multiple files into one polished export.
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 24,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    background: "rgba(0, 0, 0, 0.28)",
                    padding: 18,
                    minHeight: 170,
                  }}
                >
                  <div style={{ fontSize: 16, letterSpacing: "0.26em", textTransform: "uppercase", color: "#71717a" }}>Split PDF</div>
                  <div style={{ marginTop: 14, fontSize: 22, lineHeight: 1.35, color: "#f4f4f5" }}>
                    Break one PDF into per-page downloads and a clean archive.
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                borderRadius: 28,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.03)",
                padding: 22,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 16, letterSpacing: "0.28em", textTransform: "uppercase", color: "#71717a" }}>Tool suite</div>
                <div style={{ fontSize: 24, lineHeight: 1.35, color: "#f4f4f5" }}>Modern controls for document and image workflows.</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", color: "#d4d4d8", fontSize: 20, letterSpacing: "0.24em", textTransform: "uppercase" }}>
                Draftr
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}