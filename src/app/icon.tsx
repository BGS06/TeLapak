import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#b3261e",
          borderRadius: 40,
          color: "#faf8f5",
          fontSize: 88,
          fontWeight: 800,
          letterSpacing: "-0.05em",
        }}
      >
        LT
      </div>
    ),
    { ...size },
  );
}
