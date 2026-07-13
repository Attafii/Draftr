import { describe, expect, it } from "vitest";

import { buildStyledExportText, sanitizeTextForPdf } from "@/lib/download";

describe("pdf export helpers", () => {
  it("removes unsupported control characters before PDF export", () => {
    expect(sanitizeTextForPdf("Hello\u0083world")).toBe("Hello world");
    expect(sanitizeTextForPdf("Line1\u0000Line2")).toBe("Line1 Line2");
  });

  it("adds a studio-style executive summary for designed exports", () => {
    const styled = buildStyledExportText("Plain content", {
      preset: "studio",
      title: "Quarterly brief",
    });

    expect(styled).toContain("# Quarterly brief");
    expect(styled).toContain("## Executive summary");
    expect(styled).toContain("Plain content");
  });

  it("keeps minimal exports concise with the chosen title", () => {
    const styled = buildStyledExportText("Short draft", {
      preset: "minimal",
      title: "Launch plan",
    });

    expect(styled).toContain("# Launch plan");
    expect(styled).not.toContain("## Executive summary");
    expect(styled).toContain("Short draft");
  });
});
