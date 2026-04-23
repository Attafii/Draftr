import { ImageResponse } from "next/og";

import { BrandMark } from "@/components/brand-mark";

export const runtime = "edge";
export const size = {
  width: 64,
  height: 64,
};
export const contentType = "image/png";

export default function Icon() {
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
        <BrandMark size={50} variant="dark" />
      </div>
    ),
    size,
  );
}