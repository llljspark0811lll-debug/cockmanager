import { readFile } from "fs/promises";
import path from "path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET() {
  const imagePath = path.join(
    process.cwd(),
    "public",
    "share-thumbnail.png"
  );
  const imageBuffer = await readFile(imagePath);
  const imageBase64 = imageBuffer.toString("base64");
  const imageSrc = `data:image/png;base64,${imageBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e3157",
        }}
      >
        <img
          src={imageSrc}
          alt="배드민턴 클럽 운영 관리 프로그램"
          width={520}
          height={520}
          style={{
            objectFit: "contain",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
