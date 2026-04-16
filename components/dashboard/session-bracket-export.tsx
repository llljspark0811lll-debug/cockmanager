"use client";

import type {
  ClubSession,
  SessionBracket,
  SessionBracketMatch,
  SessionBracketPlayerEntry,
} from "@/components/dashboard/types";
import {
  formatDate,
  normalizeGenderLabel,
} from "@/components/dashboard/utils";

const IMAGE_WIDTH = 1080;
const PADDING_X = 44;
const PADDING_Y = 40;
const HEADER_HEIGHT = 160;
const SUMMARY_HEIGHT = 96;
const ROUND_HEADER_HEIGHT = 42;
const TABLE_HEADER_HEIGHT = 42;
const MATCH_ROW_HEIGHT = 48;
const REST_ROW_HEIGHT = 42;
const SECTION_GAP = 26;
const BODY_FONT = 20;

function sanitizeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ /g, "-");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function estimateTextWidth(text: string, fontSize: number) {
  let width = 0;

  for (const char of text) {
    if (char === " ") {
      width += fontSize * 0.32;
      continue;
    }

    if (/[A-Za-z0-9]/.test(char)) {
      width += fontSize * 0.56;
      continue;
    }

    if (/[./:-]/.test(char)) {
      width += fontSize * 0.34;
      continue;
    }

    width += fontSize * 0.9;
  }

  return width;
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const normalized = text.trim();

  if (!normalized) {
    return [""];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (estimateTextWidth(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [normalized];
}

function textBlock(
  x: number,
  y: number,
  lines: string[],
  options: {
    fontSize: number;
    lineHeight: number;
    fill: string;
    fontWeight?: number;
    anchor?: "start" | "middle" | "end";
  }
) {
  return `<text x="${x}" y="${y}" fill="${options.fill}" font-size="${options.fontSize}" font-weight="${options.fontWeight ?? 500}" text-anchor="${options.anchor ?? "start"}" font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif">${lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : options.lineHeight;
      return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("")}</text>`;
}

function playerText(player: SessionBracketPlayerEntry) {
  return `${player.name} ${normalizeGenderLabel(player.gender)} · ${player.level}`;
}

function teamText(players: SessionBracketPlayerEntry[]) {
  return players.map((player) => playerText(player)).join(" / ");
}

function sectionHeight(round: SessionBracket["rounds"][number]) {
  const restHeight = round.restingPlayers.length > 0 ? REST_ROW_HEIGHT : 0;
  return (
    ROUND_HEADER_HEIGHT +
    TABLE_HEADER_HEIGHT +
    round.matches.length * MATCH_ROW_HEIGHT +
    restHeight
  );
}

function totalImageHeight(bracket: SessionBracket) {
  const roundsHeight = bracket.rounds.reduce(
    (sum, round) => sum + sectionHeight(round) + SECTION_GAP,
    0
  );

  return (
    PADDING_Y +
    HEADER_HEIGHT +
    20 +
    SUMMARY_HEIGHT +
    28 +
    roundsHeight +
    24
  );
}

function tableColumnX() {
  const innerWidth = IMAGE_WIDTH - PADDING_X * 2;

  return {
    left: PADDING_X,
    court: PADDING_X,
    teamA: PADDING_X + 132,
    teamB: PADDING_X + 132 + (innerWidth - 132) / 2,
    innerWidth,
    teamWidth: (innerWidth - 132) / 2,
  };
}

function renderSummary(bracket: SessionBracket, y: number) {
  const innerWidth = IMAGE_WIDTH - PADDING_X * 2;
  const cardGap = 16;
  const cardWidth = (innerWidth - cardGap * 2) / 3;
  const entries = [
    {
      label: "코트 / 최소 경기",
      value: `${bracket.config.courtCount}코트 · 최소 ${bracket.config.minGamesPerPlayer}경기`,
      fill: "#0f172a",
    },
    {
      label: "총 라운드 / 총 경기",
      value: `${bracket.summary.totalRounds}라운드 · ${bracket.summary.totalMatches}경기`,
      fill: "#0f172a",
    },
    {
      label: "생성 방식",
      value: bracket.config.separateByGender
        ? "남복 / 여복 분리"
        : "랜덤 복식",
      fill: "#0f172a",
    },
  ];

  return entries
    .map((entry, index) => {
      const x = PADDING_X + index * (cardWidth + cardGap);

      return `
        <rect x="${x}" y="${y}" width="${cardWidth}" height="${SUMMARY_HEIGHT}" rx="22" fill="#ffffff" stroke="#d8e0ea" />
        ${textBlock(x + 18, y + 28, [entry.label], {
          fontSize: 16,
          lineHeight: 18,
          fill: "#7b8798",
          fontWeight: 700,
        })}
        ${textBlock(
          x + 18,
          y + 62,
          wrapText(entry.value, cardWidth - 36, 24),
          {
            fontSize: 24,
            lineHeight: 28,
            fill: entry.fill,
            fontWeight: 900,
          }
        )}
      `;
    })
    .join("");
}

function renderRoundSection(round: SessionBracket["rounds"][number], y: number) {
  const column = tableColumnX();
  let markup = `
    <rect x="${column.left}" y="${y}" width="${column.innerWidth}" height="${ROUND_HEADER_HEIGHT}" rx="16" fill="#eef2f7" />
    ${textBlock(column.left + 18, y + 28, [`라운드 ${round.roundNumber}`], {
      fontSize: 24,
      lineHeight: 26,
      fill: "#0f172a",
      fontWeight: 900,
    })}
  `;

  const headerY = y + ROUND_HEADER_HEIGHT;

  markup += `
    <rect x="${column.court}" y="${headerY}" width="132" height="${TABLE_HEADER_HEIGHT}" fill="#dcdcdc" />
    <rect x="${column.teamA}" y="${headerY}" width="${column.teamWidth}" height="${TABLE_HEADER_HEIGHT}" fill="#fde9d9" />
    <rect x="${column.teamB}" y="${headerY}" width="${column.teamWidth}" height="${TABLE_HEADER_HEIGHT}" fill="#dbe5f1" />
    ${textBlock(column.court + 66, headerY + 27, ["코트"], {
      fontSize: 20,
      lineHeight: 22,
      fill: "#334155",
      fontWeight: 800,
      anchor: "middle",
    })}
    ${textBlock(column.teamA + column.teamWidth / 2, headerY + 27, ["팀A"], {
      fontSize: 20,
      lineHeight: 22,
      fill: "#7c3f00",
      fontWeight: 900,
      anchor: "middle",
    })}
    ${textBlock(column.teamB + column.teamWidth / 2, headerY + 27, ["팀B"], {
      fontSize: 20,
      lineHeight: 22,
      fill: "#1e3a5f",
      fontWeight: 900,
      anchor: "middle",
    })}
  `;

  round.matches.forEach((match, index) => {
    const rowY = headerY + TABLE_HEADER_HEIGHT + index * MATCH_ROW_HEIGHT;
    const courtLabel = `${match.courtNumber}코트`;
    const teamALines = wrapText(
      teamText(match.teamA.players),
      column.teamWidth - 28,
      BODY_FONT
    );
    const teamBLines = wrapText(
      teamText(match.teamB.players),
      column.teamWidth - 28,
      BODY_FONT
    );

    markup += `
      <rect x="${column.court}" y="${rowY}" width="132" height="${MATCH_ROW_HEIGHT}" fill="#f0f0f0" />
      <rect x="${column.teamA}" y="${rowY}" width="${column.teamWidth}" height="${MATCH_ROW_HEIGHT}" fill="#fde9d9" />
      <rect x="${column.teamB}" y="${rowY}" width="${column.teamWidth}" height="${MATCH_ROW_HEIGHT}" fill="#dbe5f1" />
      ${textBlock(column.court + 66, rowY + 30, [courtLabel], {
        fontSize: 18,
        lineHeight: 20,
        fill: "#111827",
        fontWeight: 800,
        anchor: "middle",
      })}
      ${textBlock(column.teamA + column.teamWidth / 2, rowY + 30, teamALines, {
        fontSize: BODY_FONT,
        lineHeight: 22,
        fill: "#111827",
        fontWeight: 700,
        anchor: "middle",
      })}
      ${textBlock(column.teamB + column.teamWidth / 2, rowY + 30, teamBLines, {
        fontSize: BODY_FONT,
        lineHeight: 22,
        fill: "#111827",
        fontWeight: 700,
        anchor: "middle",
      })}
    `;
  });

  if (round.restingPlayers.length > 0) {
    const restY =
      headerY + TABLE_HEADER_HEIGHT + round.matches.length * MATCH_ROW_HEIGHT;
    const restText = `휴식 : ${round.restingPlayers
      .map((player) => player.name)
      .join(", ")}`;
    const restLines = wrapText(
      restText,
      column.innerWidth - 36,
      18
    );

    markup += `
      <rect x="${column.left}" y="${restY}" width="${column.innerWidth}" height="${REST_ROW_HEIGHT}" fill="#eef7df" />
      ${textBlock(column.left + 18, restY + 27, restLines, {
        fontSize: 18,
        lineHeight: 20,
        fill: "#3f6212",
        fontWeight: 800,
      })}
    `;
  }

  return markup;
}

function renderSvg(session: ClubSession, bracket: SessionBracket) {
  const height = totalImageHeight(bracket);
  let currentY = PADDING_Y;

  let markup = `
    <rect x="0" y="0" width="${IMAGE_WIDTH}" height="${height}" fill="#ffffff" />
    <text x="${IMAGE_WIDTH / 2}" y="${currentY + 18}" fill="#111827" font-size="30" font-weight="900" text-anchor="middle" font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif">${escapeXml(
      `'${session.title}' 대진표`
    )}</text>
    ${textBlock(
      IMAGE_WIDTH / 2,
      currentY + 54,
      [`${formatDate(session.date)} · ${session.startTime} ~ ${session.endTime}`],
      {
        fontSize: 22,
        lineHeight: 24,
        fill: "#1f2937",
        fontWeight: 800,
        anchor: "middle",
      }
    )}
    <rect x="${PADDING_X}" y="${currentY + 76}" width="${IMAGE_WIDTH - PADDING_X * 2}" height="2" fill="#d7dce3" />
  `;

  currentY += HEADER_HEIGHT;
  markup += renderSummary(bracket, currentY);
  currentY += SUMMARY_HEIGHT + 28;

  bracket.rounds.forEach((round) => {
    markup += renderRoundSection(round, currentY);
    currentY += sectionHeight(round) + SECTION_GAP;
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_WIDTH}" height="${height}" viewBox="0 0 ${IMAGE_WIDTH} ${height}">
      ${markup}
    </svg>
  `;
}

async function svgToPngBlob(svgMarkup: string) {
  const blob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () =>
        reject(new Error("대진표 이미지를 렌더링하지 못했습니다."));
      nextImage.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("이미지 캔버스를 준비하지 못했습니다.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
          return;
        }

        reject(new Error("PNG 파일로 변환하지 못했습니다."));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function buildBracketImageFiles(
  session: ClubSession,
  bracket: SessionBracket
) {
  const svgMarkup = renderSvg(session, bracket);
  const blob = await svgToPngBlob(svgMarkup);
  const fileName = `${sanitizeFileName(session.title)}-자동대진표.png`;

  return [
    new File([blob], fileName, {
      type: "image/png",
    }),
  ];
}

export async function downloadFiles(files: File[]) {
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // 모바일: Web Share API로 네이티브 갤러리 저장
  // (iOS → "사진 저장", Android → 갤러리/파일 저장)
  // navigator.share가 AbortError를 throw하면 호출부(handleExport)에서 처리
  if (isMobile) {
    const canWebShare =
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files });

    if (canWebShare) {
      await navigator.share({ files, title: files[0]?.name });
      return;
    }
  }

  // PC (기존 동작) + 모바일 Web Share 미지원 폴백: 앵커 다운로드
  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  });
}

