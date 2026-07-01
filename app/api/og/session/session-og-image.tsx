import fs from "fs";
import path from "path";
import { ImageResponse } from "next/og";

const WIDTH = 1200;
const HEIGHT = 630;
const fontPath = path.join(
  process.cwd(),
  "public",
  "fonts",
  "NotoSansCJKkr-Bold.otf"
);

let cachedFont: ArrayBuffer | null = null;

function getFont() {
  if (cachedFont) {
    return cachedFont;
  }

  const buffer = fs.readFileSync(fontPath);
  cachedFont = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );

  return cachedFont;
}

function splitText(value: string, maxLength: number, maxLines: number) {
  const compact = value.trim().replace(/\s+/g, " ");
  const lines: string[] = [];
  let current = "";

  for (const char of compact) {
    if ([...current, char].length > maxLength) {
      lines.push(current);
      current = char;
      if (lines.length === maxLines) break;
    } else {
      current += char;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length === maxLines && compact.length > lines.join("").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}...`;
  }

  return lines.length > 0 ? lines : ["운동 일정"];
}

function removeEmoji(value: string) {
  return value
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .trim();
}

export function buildSessionOgImageResponse(input: {
  title: string;
  clubName: string;
}) {
  const titleLines = splitText(
    removeEmoji(input.title) || "운동 일정 참석 신청",
    16,
    3
  );
  const titleFontSize = titleLines.length >= 3 ? 66 : 76;
  const titleLineHeight = titleLines.length >= 3 ? 78 : 88;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#facc15",
          fontFamily: "CockmanagerKorean",
          padding: 48,
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
            background: "#111827",
            borderRadius: 28,
            padding: 40,
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              background: "#fefce8",
              borderRadius: 20,
              padding: "38px 40px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: 24,
                top: 4,
                width: 168,
                height: 168,
                borderRadius: 999,
                background: "rgba(22, 163, 74, 0.18)",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: -58,
                bottom: -36,
                width: 224,
                height: 224,
                borderRadius: 999,
                background: "rgba(56, 189, 248, 0.15)",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 184,
                height: 52,
                borderRadius: 26,
                background: "#111827",
                color: "#facc15",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              참석 신청
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 38,
                color: "#111827",
                fontSize: titleFontSize,
                fontWeight: 900,
                lineHeight: `${titleLineHeight}px`,
                letterSpacing: 0,
              }}
            >
              {titleLines.map((line) => (
                <div key={line} style={{ display: "flex" }}>
                  {line}
                </div>
              ))}
            </div>
            <div
              style={{
                width: 380,
                height: 8,
                borderRadius: 999,
                background: "#111827",
                marginTop: "auto",
                marginBottom: 26,
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                color: "#111827",
                fontWeight: 900,
              }}
            >
              <div style={{ display: "flex", fontSize: 34 }}>
                {input.clubName}
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 8,
                  fontSize: 30,
                  color: "#475569",
                }}
              >
                운동 일정 참석 링크
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                right: 80,
                bottom: 40,
                display: "flex",
                color: "#111827",
                fontSize: 34,
                fontWeight: 900,
              }}
            >
              콕매니저
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: "CockmanagerKorean",
          data: getFont(),
          weight: 900,
          style: "normal",
        },
      ],
    }
  );
}
