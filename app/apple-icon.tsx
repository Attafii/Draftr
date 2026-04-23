import { ImageResponse } from "next/og";

import { BrandMark } from "@/components/brand-mark";

export const runtime = "edge";
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #121212 0%, #050505 100%)",
        }}
      >
        <BrandMark size={136} variant="dark" />
      </div>
    ),
    size,
  );
}