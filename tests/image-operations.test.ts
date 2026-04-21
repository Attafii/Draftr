import { describe, expect, it } from "vitest";

import { buildImageOutputName, calculateContainedSize } from "@/lib/image-operations";

describe("image helpers", () => {
  it("calculates contained dimensions while preserving aspect ratio", () => {
    expect(calculateContainedSize(4000, 2000, 2000)).toEqual({ width: 2000, height: 1000 });
    expect(calculateContainedSize(800, 600, 1200)).toEqual({ width: 800, height: 600 });
  });

  it("builds stable image output names", () => {
    expect(buildImageOutputName("photo.png", "compressed")).toBe("photo-compressed.jpg");
    expect(buildImageOutputName("scan.tiff", "enhanced", "webp")).toBe("scan-enhanced.webp");
  });
});
