import fs from "fs";
import path from "path";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;
const fontPath = path.join(
  process.cwd(),
  "public",
  "fonts",
  "NotoSansCJKkr-Bold.otf"
);

let cachedFontCss: string | null = null;

function getFontCss() {
  if (cachedFontCss) {
    return cachedFontCss;
  }

  const font = fs.readFileSync(fontPath).toString("base64");
  cachedFontCss = `
  <style>
    @font-face {
      font-family: "CockmanagerKorean";
      src: url("data:font/otf;base64,${font}") format("opentype");
      font-weight: 700 900;
    }
    text {
      font-family: "CockmanagerKorean", sans-serif;
    }
  </style>`;

  return cachedFontCss;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}…`;
  }

  return lines.length > 0 ? lines : ["운동 일정"];
}

export function removeEmoji(value: string) {
  return value
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .trim();
}

function textLines(
  lines: string[],
  x: number,
  y: number,
  options: { fontSize: number; lineHeight: number; fill: string; weight: number }
) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * options.lineHeight}" font-size="${options.fontSize}" font-weight="${options.weight}" fill="${options.fill}">${escapeXml(line)}</text>`
    )
    .join("");
}

function buildSvg(input: { title: string; clubName: string }) {
  const titleLines = splitText(input.title, 16, 3);
  const titleFontSize = titleLines.length >= 3 ? 66 : 76;
  const titleLineHeight = titleLines.length >= 3 ? 78 : 88;

  return `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  ${getFontCss()}
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#facc15"/>
  <rect x="48" y="48" width="1104" height="534" rx="28" fill="#111827"/>
  <rect x="88" y="88" width="1024" height="454" rx="20" fill="#fefce8"/>
  <circle cx="1005" cy="176" r="84" fill="#16a34a" opacity="0.18"/>
  <circle cx="1058" cy="465" r="112" fill="#38bdf8" opacity="0.15"/>
  <rect x="128" y="126" width="184" height="52" rx="26" fill="#111827"/>
  <text x="220" y="161" text-anchor="middle" font-size="24" font-weight="900" fill="#facc15">참석 신청</text>
  ${textLines(titleLines, 128, 268, {
    fontSize: titleFontSize,
    lineHeight: titleLineHeight,
    fill: "#111827",
    weight: 900,
  })}
  <line x1="128" y1="432" x2="504" y2="432" stroke="#111827" stroke-width="8" stroke-linecap="round"/>
  <text x="128" y="492" font-size="34" font-weight="900" fill="#111827">${escapeXml(input.clubName)}</text>
  <text x="128" y="535" font-size="30" font-weight="800" fill="#475569">운동 일정 참석 링크</text>
  <text x="1032" y="500" text-anchor="end" font-size="34" font-weight="900" fill="#111827">콕매니저</text>
</svg>`;
}

export async function buildSessionOgImage(input: {
  title: string;
  clubName: string;
}) {
  const svg = buildSvg({
    title: removeEmoji(input.title) || "운동 일정 참석 신청",
    clubName: input.clubName,
  });

  return await sharp(Buffer.from(svg)).png().toBuffer();
}
