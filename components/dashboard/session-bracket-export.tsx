"use client";

import type {
  ClubLevel,
  ClubSession,
  SessionBracket,
  SessionBracketMatch,
  SessionBracketPlayerEntry,
  SessionBracketRound,
} from "@/components/dashboard/types";
import { DEFAULT_LEVEL_NAMES, LEVEL_COUNT } from "@/lib/dashboard-constants";

const DEFAULT_CLUB_LEVELS: ClubLevel[] = Array.from({ length: LEVEL_COUNT }, (_, i) => ({
  rank: i + 1,
  name: DEFAULT_LEVEL_NAMES[i] ?? String(i + 1),
}));
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
const RANK_SECTION_GAP = 36;
const RANK_HEADER_HEIGHT = 52;
const RANK_TABLE_HEADER_HEIGHT = 44;
const RANK_ROW_HEIGHT = 44;
const RANK_MSG_HEIGHT = 72;
const RC_RANK = 70;
const RC_NAME = 400;
const RC_GAMES = 96;
const RC_WIN = 110;
const RC_LOSS = 110;
const RC_WP = 110;


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

export function stripTrialPrefix(name: string) {
  return name.replace(/^\[체험( 게스트)?\]\s*/, "");
}

function playerText(player: SessionBracketPlayerEntry, clubLevels: ClubLevel[]) {
  const levelName = clubLevels.find((l) => String(l.rank) === player.level)?.name ?? player.level;
  return `${stripTrialPrefix(player.name)} ${normalizeGenderLabel(player.gender)} · ${levelName}`;
}

function teamText(players: SessionBracketPlayerEntry[], clubLevels: ClubLevel[]) {
  return players.map((player) => playerText(player, clubLevels)).join(" / ");
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

function mergeGroupRounds(bracket: SessionBracket): SessionBracket["rounds"] {
  const groups = bracket.levelGroupData;
  if (!groups || groups.length === 0) return bracket.rounds;

  const maxRound = Math.max(
    ...groups.map((g) => g.rounds.reduce((m, r) => Math.max(m, r.roundNumber), 0))
  );

  return Array.from({ length: maxRound }, (_, ri) => {
    const allMatches: SessionBracketMatch[] = [];
    const allResting: SessionBracketPlayerEntry[] = [];
    let courtOffset = 0;

    groups.forEach((g) => {
      const round = g.rounds.find((r) => r.roundNumber === ri + 1);
      if (!round) {
        allResting.push(...g.summary.playerStats);
        return;
      }
      round.matches.forEach((m) => {
        allMatches.push({ ...m, courtNumber: m.courtNumber + courtOffset });
      });
      courtOffset += round.matches.length;
      allResting.push(...round.restingPlayers);
    });

    return { roundNumber: ri + 1, matches: allMatches, restingPlayers: allResting };
  });
}

function totalImageHeight(bracket: SessionBracket, includeScores = false) {
  const rounds = mergeGroupRounds(bracket);
  const roundsHeight = rounds.reduce(
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
    24 +
    totalRankingHeight(bracket, includeScores)
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
  const teamBattleLabel = `${bracket.config.teamLabels?.A?.trim() || "팀A"} vs ${
    bracket.config.teamLabels?.B?.trim() || "팀B"
  }`;
  const groups = bracket.levelGroupData;
  const isMultiGroup = groups && groups.length > 0;
  const totalRounds = isMultiGroup
    ? groups.reduce((s, g) => s + g.summary.totalRounds, 0)
    : bracket.summary.totalRounds;
  const totalMatches = isMultiGroup
    ? groups.reduce((s, g) => s + g.summary.totalMatches, 0)
    : bracket.summary.totalMatches;

  const entries = [
    {
      label: "코트 / 최소 경기",
      value: `${bracket.config.courtCount}코트 · 최소 ${bracket.config.minGamesPerPlayer}경기`,
      fill: "#0f172a",
    },
    {
      label: "총 라운드 / 총 경기",
      value: `${totalRounds}라운드 · ${totalMatches}경기`,
      fill: "#0f172a",
    },
    {
      label: "생성 방식",
      value: isMultiGroup
        ? (bracket.config.levelMode === "filter" ? "급수필터별" : "동일급수별")
        : bracket.config.separateByGender ? "남복 / 여복 분리" : "랜덤 복식",
      fill: "#0f172a",
    },
  ];

  if (bracket.config.generationMode === "TEAM_BATTLE") {
    entries[2].value = bracket.config.separateByGender
      ? "?⑤났 / ?щ났 遺꾨━"
      : "?쒕뜡 蹂듭떇";
  }

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

function renderSummaryCards(bracket: SessionBracket, y: number) {
  const innerWidth = IMAGE_WIDTH - PADDING_X * 2;
  const cardGap = 16;
  const cardWidth = (innerWidth - cardGap * 2) / 3;
  const groups = bracket.levelGroupData;
  const isMultiGroup = groups && groups.length > 0;
  const totalRounds = isMultiGroup
    ? groups.reduce((s, g) => s + g.summary.totalRounds, 0)
    : bracket.summary.totalRounds;
  const totalMatches = isMultiGroup
    ? groups.reduce((s, g) => s + g.summary.totalMatches, 0)
    : bracket.summary.totalMatches;

  const entries = [
    {
      label: "코트 / 최소 경기",
      value: `${bracket.config.courtCount}코트 · 최소 ${bracket.config.minGamesPerPlayer}경기`,
      fill: "#0f172a",
    },
    {
      label: "총 라운드 / 총 경기",
      value: `${totalRounds}라운드 · ${totalMatches}경기`,
      fill: "#0f172a",
    },
    {
      label: "생성 방식",
      value: bracket.config.separateByGender
        ? "\uB0A8\uBCF5 / \uC5EC\uBCF5 \uBD84\uB9AC"
        : "\uB79C\uB364 \uBCF5\uC2DD",
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

function renderRoundSection(
  round: SessionBracket["rounds"][number],
  y: number,
  bracket: SessionBracket,
  clubLevels: ClubLevel[],
  includeScores = false
) {
  const column = tableColumnX();
  const teamALabel =
    bracket.config.generationMode === "TEAM_BATTLE"
      ? bracket.config.teamLabels?.A?.trim() || "팀A"
      : "팀A";
  const teamBLabel =
    bracket.config.generationMode === "TEAM_BATTLE"
      ? bracket.config.teamLabels?.B?.trim() || "팀B"
      : "팀B";
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

  if (bracket.config.generationMode === "TEAM_BATTLE") {
    markup = markup
      .replace(">팀A<", `>${escapeXml(teamALabel)}<`)
      .replace(">팀B<", `>${escapeXml(teamBLabel)}<`)
      .replace(">?\u0080A<", `>${escapeXml(teamALabel)}<`)
      .replace(">?\u0080B<", `>${escapeXml(teamBLabel)}<`);
  }

  round.matches.forEach((match, index) => {
    const rowY = headerY + TABLE_HEADER_HEIGHT + index * MATCH_ROW_HEIGHT;
    const courtLabel = `${match.courtNumber}코트`;
    const teamALines = wrapText(
      teamText(match.teamA.players, clubLevels),
      column.teamWidth - 28,
      BODY_FONT
    );
    const teamBLines = wrapText(
      teamText(match.teamB.players, clubLevels),
      column.teamWidth - 28,
      BODY_FONT
    );

    const hasScore = includeScores && match.scoreA != null && match.scoreB != null;
    const aWon = hasScore && (match.scoreA ?? 0) > (match.scoreB ?? 0);
    const bWon = hasScore && (match.scoreB ?? 0) > (match.scoreA ?? 0);
    const teamAFill = aWon ? "#fbbf24" : "#fde9d9";
    const teamBFill = bWon ? "#fbbf24" : "#dbe5f1";
    const teamATextFill = aWon ? "#78350f" : "#111827";
    const teamBTextFill = bWon ? "#78350f" : "#111827";

    markup += `
      <rect x="${column.court}" y="${rowY}" width="132" height="${MATCH_ROW_HEIGHT}" fill="#f0f0f0" />
      <rect x="${column.teamA}" y="${rowY}" width="${column.teamWidth}" height="${MATCH_ROW_HEIGHT}" fill="${teamAFill}" />
      <rect x="${column.teamB}" y="${rowY}" width="${column.teamWidth}" height="${MATCH_ROW_HEIGHT}" fill="${teamBFill}" />
      ${hasScore
        ? textBlock(column.court + 66, rowY + 18, [courtLabel], {
            fontSize: 15,
            lineHeight: 17,
            fill: "#334155",
            fontWeight: 800,
            anchor: "middle",
          }) +
          textBlock(column.court + 66, rowY + 36, [`${match.scoreA} : ${match.scoreB}`], {
            fontSize: 17,
            lineHeight: 19,
            fill: "#0f172a",
            fontWeight: 900,
            anchor: "middle",
          })
        : textBlock(column.court + 66, rowY + 30, [courtLabel], {
            fontSize: 18,
            lineHeight: 20,
            fill: "#111827",
            fontWeight: 800,
            anchor: "middle",
          })
      }
      ${textBlock(column.teamA + column.teamWidth / 2, rowY + 30, teamALines, {
        fontSize: BODY_FONT,
        lineHeight: 22,
        fill: teamATextFill,
        fontWeight: 700,
        anchor: "middle",
      })}
      ${textBlock(column.teamB + column.teamWidth / 2, rowY + 30, teamBLines, {
        fontSize: BODY_FONT,
        lineHeight: 22,
        fill: teamBTextFill,
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


interface PlayerRankEntry {
  player: SessionBracketPlayerEntry;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

function allScoresEntered(rounds: SessionBracketRound[]): boolean {
  const all = rounds.flatMap((r) => r.matches);
  return all.length > 0 && all.every((m) => m.scoreA != null && m.scoreB != null);
}

function computePlayerRankings(rounds: SessionBracketRound[]): PlayerRankEntry[] {
  const map = new Map<string, PlayerRankEntry>();
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.scoreA == null || match.scoreB == null) continue;
      const sA = match.scoreA;
      const sB = match.scoreB;
      const aWon = sA > sB;
      const bWon = sB > sA;
      const drew = !aWon && !bWon;
      const update = (
        player: SessionBracketPlayerEntry,
        pf: number,
        pa: number,
        won: boolean,
        draw: boolean
      ) => {
        let e = map.get(player.playerId);
        if (!e) {
          e = { player, games: 0, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
          map.set(player.playerId, e);
        }
        e.games++;
        e.pointsFor += pf;
        e.pointsAgainst += pa;
        if (won) e.wins++;
        else if (draw) e.draws++;
        else e.losses++;
      };
      for (const p of match.teamA.players) update(p, sA, sB, aWon, drew);
      for (const p of match.teamB.players) update(p, sB, sA, bWon, drew);
    }
  }
  return [...map.values()].sort((a, b) => {
    const aWP = a.wins * 2 + a.draws;
    const bWP = b.wins * 2 + b.draws;
    if (bWP !== aWP) return bWP - aWP;
    const aDiff = a.pointsFor - a.pointsAgainst;
    const bDiff = b.pointsFor - b.pointsAgainst;
    if (bDiff !== aDiff) return bDiff - aDiff;
    return b.pointsFor - a.pointsFor;
  });
}

function rankingSectionHeight(rowCount: number): number {
  return RANK_HEADER_HEIGHT + RANK_TABLE_HEADER_HEIGHT + rowCount * RANK_ROW_HEIGHT;
}

const RANK_INCOMPLETE_HEIGHT = RANK_SECTION_GAP + RANK_HEADER_HEIGHT + RANK_MSG_HEIGHT;

function totalRankingHeight(bracket: SessionBracket, includeScores: boolean): number {
  if (!includeScores) return 0;
  const isTeamBattle = bracket.config.generationMode === "TEAM_BATTLE";
  if (isTeamBattle) {
    if (!allScoresEntered(bracket.rounds)) return RANK_INCOMPLETE_HEIGHT;
    return RANK_SECTION_GAP + rankingSectionHeight(2);
  }
  const groups = bracket.levelGroupData;
  if (groups && groups.length > 0) {
    if (!groups.every((g) => allScoresEntered(g.rounds))) return RANK_INCOMPLETE_HEIGHT;
    return groups.reduce((sum, g) => {
      const count = new Set(
        g.rounds.flatMap((r) =>
          r.matches.flatMap((m) =>
            [...m.teamA.players, ...m.teamB.players].map((p) => p.playerId)
          )
        )
      ).size;
      return sum + RANK_SECTION_GAP + rankingSectionHeight(Math.min(count, 5));
    }, 0);
  }
  const rounds = mergeGroupRounds(bracket);
  if (!allScoresEntered(rounds)) return RANK_INCOMPLETE_HEIGHT;
  const count = new Set(
    rounds.flatMap((r) =>
      r.matches.flatMap((m) =>
        [...m.teamA.players, ...m.teamB.players].map((p) => p.playerId)
      )
    )
  ).size;
  return RANK_SECTION_GAP + rankingSectionHeight(Math.min(count, 5));
}

function renderPlayerRankingSection(
  title: string,
  entries: PlayerRankEntry[],
  y: number,
  clubLevels: ClubLevel[]
): string {
  const top5 = entries.slice(0, 5);
  const innerWidth = IMAGE_WIDTH - PADDING_X * 2;
  const rcDiff = innerWidth - RC_RANK - RC_NAME - RC_GAMES - RC_WIN - RC_LOSS - RC_WP;
  const xRank = PADDING_X;
  const xName = PADDING_X + RC_RANK;
  const xGames = xName + RC_NAME;
  const xWin = xGames + RC_GAMES;
  const xLoss = xWin + RC_WIN;
  const xWP = xLoss + RC_LOSS;
  const xDiff = xWP + RC_WP;

  let markup = `
    <rect x="${PADDING_X}" y="${y}" width="${innerWidth}" height="${RANK_HEADER_HEIGHT}" rx="16" fill="#1e293b" />
    ${textBlock(PADDING_X + 20, y + 34, [escapeXml(title)], { fontSize: 24, lineHeight: 26, fill: "#ffffff", fontWeight: 900 })}
  `;

  const hy = y + RANK_HEADER_HEIGHT;
  markup += `
    <rect x="${xRank}" y="${hy}" width="${RC_RANK}" height="${RANK_TABLE_HEADER_HEIGHT}" fill="#e2e8f0" />
    <rect x="${xName}" y="${hy}" width="${RC_NAME}" height="${RANK_TABLE_HEADER_HEIGHT}" fill="#e2e8f0" />
    <rect x="${xGames}" y="${hy}" width="${RC_GAMES}" height="${RANK_TABLE_HEADER_HEIGHT}" fill="#e2e8f0" />
    <rect x="${xWin}" y="${hy}" width="${RC_WIN}" height="${RANK_TABLE_HEADER_HEIGHT}" fill="#e2e8f0" />
    <rect x="${xLoss}" y="${hy}" width="${RC_LOSS}" height="${RANK_TABLE_HEADER_HEIGHT}" fill="#e2e8f0" />
    <rect x="${xWP}" y="${hy}" width="${RC_WP}" height="${RANK_TABLE_HEADER_HEIGHT}" fill="#e2e8f0" />
    <rect x="${xDiff}" y="${hy}" width="${rcDiff}" height="${RANK_TABLE_HEADER_HEIGHT}" fill="#e2e8f0" />
    ${textBlock(xRank + RC_RANK / 2, hy + 28, ["순위"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800, anchor: "middle" })}
    ${textBlock(xName + 16, hy + 28, ["선수"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800 })}
    ${textBlock(xGames + RC_GAMES / 2, hy + 28, ["경기"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800, anchor: "middle" })}
    ${textBlock(xWin + RC_WIN / 2, hy + 28, ["승"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800, anchor: "middle" })}
    ${textBlock(xLoss + RC_LOSS / 2, hy + 28, ["패"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800, anchor: "middle" })}
    ${textBlock(xWP + RC_WP / 2, hy + 28, ["승점"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800, anchor: "middle" })}
    ${textBlock(xDiff + rcDiff / 2, hy + 28, ["득실차"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800, anchor: "middle" })}
  `;

  top5.forEach((entry, idx) => {
    const ry = hy + RANK_TABLE_HEADER_HEIGHT + idx * RANK_ROW_HEIGHT;
    const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    const diff = entry.pointsFor - entry.pointsAgainst;
    const diffLabel = diff > 0 ? `+${diff}` : String(diff);
    const rankColor =
      idx === 0 ? "#d97706" : idx === 1 ? "#64748b" : idx === 2 ? "#b45309" : "#1e293b";
    const levelName =
      clubLevels.find((l) => String(l.rank) === entry.player.level)?.name ?? entry.player.level;
    const nameLabel = `${stripTrialPrefix(entry.player.name)} ${normalizeGenderLabel(entry.player.gender)} · ${levelName}`;
    markup += `
      <rect x="${xRank}" y="${ry}" width="${RC_RANK}" height="${RANK_ROW_HEIGHT}" fill="${bg}" />
      <rect x="${xName}" y="${ry}" width="${RC_NAME}" height="${RANK_ROW_HEIGHT}" fill="${bg}" />
      <rect x="${xGames}" y="${ry}" width="${RC_GAMES}" height="${RANK_ROW_HEIGHT}" fill="${bg}" />
      <rect x="${xWin}" y="${ry}" width="${RC_WIN}" height="${RANK_ROW_HEIGHT}" fill="${bg}" />
      <rect x="${xLoss}" y="${ry}" width="${RC_LOSS}" height="${RANK_ROW_HEIGHT}" fill="${bg}" />
      <rect x="${xWP}" y="${ry}" width="${RC_WP}" height="${RANK_ROW_HEIGHT}" fill="${bg}" />
      <rect x="${xDiff}" y="${ry}" width="${rcDiff}" height="${RANK_ROW_HEIGHT}" fill="${bg}" />
      ${textBlock(xRank + RC_RANK / 2, ry + 28, [String(idx + 1)], { fontSize: 20, lineHeight: 22, fill: rankColor, fontWeight: 900, anchor: "middle" })}
      ${textBlock(xName + 16, ry + 28, wrapText(nameLabel, RC_NAME - 32, BODY_FONT), { fontSize: BODY_FONT, lineHeight: 22, fill: "#1e293b", fontWeight: 700 })}
      ${textBlock(xGames + RC_GAMES / 2, ry + 28, [String(entry.games)], { fontSize: 20, lineHeight: 22, fill: "#475569", fontWeight: 700, anchor: "middle" })}
      ${textBlock(xWin + RC_WIN / 2, ry + 28, [String(entry.wins)], { fontSize: 20, lineHeight: 22, fill: "#16a34a", fontWeight: 800, anchor: "middle" })}
      ${textBlock(xLoss + RC_LOSS / 2, ry + 28, [String(entry.losses)], { fontSize: 20, lineHeight: 22, fill: "#dc2626", fontWeight: 800, anchor: "middle" })}
      ${textBlock(xWP + RC_WP / 2, ry + 28, [String(entry.wins * 2 + entry.draws)], { fontSize: 22, lineHeight: 24, fill: "#0f172a", fontWeight: 900, anchor: "middle" })}
      ${textBlock(xDiff + rcDiff / 2, ry + 28, [diffLabel], { fontSize: 20, lineHeight: 22, fill: diff > 0 ? "#16a34a" : diff < 0 ? "#dc2626" : "#475569", fontWeight: 800, anchor: "middle" })}
    `;
  });

  return markup;
}

function renderTeamRankingSection(bracket: SessionBracket, y: number): string {
  const innerWidth = IMAGE_WIDTH - PADDING_X * 2;
  const teamALabel = bracket.config.teamLabels?.A?.trim() || "팀A";
  const teamBLabel = bracket.config.teamLabels?.B?.trim() || "팀B";
  let teamAWins = 0;
  let teamBWins = 0;
  let draws = 0;
  for (const round of bracket.rounds) {
    for (const match of round.matches) {
      if (match.scoreA == null || match.scoreB == null) continue;
      if (match.scoreA > match.scoreB) teamAWins++;
      else if (match.scoreB > match.scoreA) teamBWins++;
      else draws++;
    }
  }
  const totalMatches = teamAWins + teamBWins + draws;
  const teams = [
    { label: teamALabel, wins: teamAWins, draws, losses: teamBWins, wp: teamAWins * 2 + draws },
    { label: teamBLabel, wins: teamBWins, draws, losses: teamAWins, wp: teamBWins * 2 + draws },
  ].sort((a, b) => b.wp - a.wp);

  const tcRank = 70;
  const tcTeam = 430;
  const tcWin = 112;
  const tcDraw = 112;
  const tcLoss = 112;
  const tcWP = innerWidth - tcRank - tcTeam - tcWin - tcDraw - tcLoss;
  const xRank = PADDING_X;
  const xTeam = xRank + tcRank;
  const xWin = xTeam + tcTeam;
  const xDraw = xWin + tcWin;
  const xLoss = xDraw + tcDraw;
  const xWP = xLoss + tcLoss;

  let markup = `
    <rect x="${PADDING_X}" y="${y}" width="${innerWidth}" height="${RANK_HEADER_HEIGHT}" rx="16" fill="#1e293b" />
    ${textBlock(PADDING_X + 20, y + 34, ["팀 순위"], { fontSize: 24, lineHeight: 26, fill: "#ffffff", fontWeight: 900 })}
    ${textBlock(IMAGE_WIDTH - PADDING_X - 20, y + 34, [`총 ${totalMatches}경기`], { fontSize: 18, lineHeight: 20, fill: "#94a3b8", fontWeight: 700, anchor: "end" })}
  `;

  const hy = y + RANK_HEADER_HEIGHT;
  for (const col of [
    { x: xRank, w: tcRank },
    { x: xTeam, w: tcTeam },
    { x: xWin, w: tcWin },
    { x: xDraw, w: tcDraw },
    { x: xLoss, w: tcLoss },
    { x: xWP, w: tcWP },
  ]) {
    markup += `<rect x="${col.x}" y="${hy}" width="${col.w}" height="${RANK_TABLE_HEADER_HEIGHT}" fill="#e2e8f0" />`;
  }
  markup += `
    ${textBlock(xRank + tcRank / 2, hy + 28, ["순위"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800, anchor: "middle" })}
    ${textBlock(xTeam + 16, hy + 28, ["팀"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800 })}
    ${textBlock(xWin + tcWin / 2, hy + 28, ["승"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800, anchor: "middle" })}
    ${textBlock(xDraw + tcDraw / 2, hy + 28, ["무"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800, anchor: "middle" })}
    ${textBlock(xLoss + tcLoss / 2, hy + 28, ["패"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800, anchor: "middle" })}
    ${textBlock(xWP + tcWP / 2, hy + 28, ["승점"], { fontSize: 17, lineHeight: 19, fill: "#475569", fontWeight: 800, anchor: "middle" })}
  `;

  teams.forEach((team, idx) => {
    const ry = hy + RANK_TABLE_HEADER_HEIGHT + idx * RANK_ROW_HEIGHT;
    const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    const rankColor = idx === 0 ? "#d97706" : "#64748b";
    for (const col of [
      { x: xRank, w: tcRank },
      { x: xTeam, w: tcTeam },
      { x: xWin, w: tcWin },
      { x: xDraw, w: tcDraw },
      { x: xLoss, w: tcLoss },
      { x: xWP, w: tcWP },
    ]) {
      markup += `<rect x="${col.x}" y="${ry}" width="${col.w}" height="${RANK_ROW_HEIGHT}" fill="${bg}" />`;
    }
    markup += `
      ${textBlock(xRank + tcRank / 2, ry + 28, [String(idx + 1)], { fontSize: 20, lineHeight: 22, fill: rankColor, fontWeight: 900, anchor: "middle" })}
      ${textBlock(xTeam + 16, ry + 28, [escapeXml(team.label)], { fontSize: 22, lineHeight: 24, fill: "#1e293b", fontWeight: 900 })}
      ${textBlock(xWin + tcWin / 2, ry + 28, [String(team.wins)], { fontSize: 20, lineHeight: 22, fill: "#16a34a", fontWeight: 800, anchor: "middle" })}
      ${textBlock(xDraw + tcDraw / 2, ry + 28, [String(team.draws)], { fontSize: 20, lineHeight: 22, fill: "#475569", fontWeight: 700, anchor: "middle" })}
      ${textBlock(xLoss + tcLoss / 2, ry + 28, [String(team.losses)], { fontSize: 20, lineHeight: 22, fill: "#dc2626", fontWeight: 800, anchor: "middle" })}
      ${textBlock(xWP + tcWP / 2, ry + 28, [String(team.wp)], { fontSize: 22, lineHeight: 24, fill: "#0f172a", fontWeight: 900, anchor: "middle" })}
    `;
  });

  return markup;
}

function renderSvg(session: ClubSession, bracket: SessionBracket, clubLevels: ClubLevel[], includeScores = false) {
  const height = totalImageHeight(bracket, includeScores);
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
  markup += renderSummaryCards(bracket, currentY);
  currentY += SUMMARY_HEIGHT + 28;

  mergeGroupRounds(bracket).forEach((round) => {
    markup += renderRoundSection(round, currentY, bracket, clubLevels, includeScores);
    currentY += sectionHeight(round) + SECTION_GAP;
  });

  // 순위표 (결과 포함 저장 시 항상 표시, 점수 미입력 시 안내 문구)
  if (includeScores) {
    const isTeamBattle = bracket.config.generationMode === "TEAM_BATTLE";
    const innerWidth = IMAGE_WIDTH - PADDING_X * 2;
    const renderIncompleteNotice = (y: number) => `
      <rect x="${PADDING_X}" y="${y}" width="${innerWidth}" height="${RANK_HEADER_HEIGHT}" rx="16" fill="#1e293b" />
      ${textBlock(PADDING_X + 20, y + 34, ["순위"], { fontSize: 24, lineHeight: 26, fill: "#ffffff", fontWeight: 900 })}
      <rect x="${PADDING_X}" y="${y + RANK_HEADER_HEIGHT}" width="${innerWidth}" height="${RANK_MSG_HEIGHT}" fill="#f8fafc" />
      ${textBlock(IMAGE_WIDTH / 2, y + RANK_HEADER_HEIGHT + RANK_MSG_HEIGHT / 2 + 8, ["모든 경기 점수를 입력하면 순위표가 표시됩니다."], { fontSize: 19, lineHeight: 22, fill: "#94a3b8", fontWeight: 600, anchor: "middle" })}
    `;
    if (isTeamBattle) {
      currentY += RANK_SECTION_GAP;
      if (allScoresEntered(bracket.rounds)) {
        markup += renderTeamRankingSection(bracket, currentY);
      } else {
        markup += renderIncompleteNotice(currentY);
      }
    } else {
      const groups = bracket.levelGroupData;
      if (groups && groups.length > 0) {
        if (groups.every((g) => allScoresEntered(g.rounds))) {
          groups.forEach((g) => {
            const entries = computePlayerRankings(g.rounds);
            currentY += RANK_SECTION_GAP;
            markup += renderPlayerRankingSection(`${g.groupName} 순위`, entries, currentY, clubLevels);
            currentY += rankingSectionHeight(Math.min(entries.length, 5));
          });
        } else {
          currentY += RANK_SECTION_GAP;
          markup += renderIncompleteNotice(currentY);
        }
      } else {
        const rounds = mergeGroupRounds(bracket);
        currentY += RANK_SECTION_GAP;
        if (allScoresEntered(rounds)) {
          const entries = computePlayerRankings(rounds);
          markup += renderPlayerRankingSection("순위", entries, currentY, clubLevels);
        } else {
          markup += renderIncompleteNotice(currentY);
        }
      }
    }
  }

    // 워터마크: 헤더 우측 상단 (제목/날짜가 중앙 정렬이라 우측에 여백)
  const wmX = IMAGE_WIDTH - PADDING_X;
  const wmY = PADDING_Y + 62;
  markup += `
    <text
      x="${wmX}" y="${wmY}"
      fill="#64748b"
      fill-opacity="0.28"
      font-size="64"
      font-weight="900"
      text-anchor="end"
      dominant-baseline="middle"
      transform="rotate(-12, ${wmX}, ${wmY})"
      font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
      pointer-events="none"
    >콕매니저🏸</text>
  `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_WIDTH}" height="${height}" viewBox="0 0 ${IMAGE_WIDTH} ${height}">
      ${markup}
    </svg>
  `;
}

async function svgToPngBlob(
  svgMarkup: string,
  svgWidth: number,
  svgHeight: number
): Promise<Blob> {
  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error("대진표 이미지를 렌더링하지 못했습니다."));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    // .width/.height는 DOM 미삽입 시 모바일에서 0 반환 → naturalWidth 우선 사용
    canvas.width = image.naturalWidth > 0 ? image.naturalWidth : svgWidth;
    canvas.height = image.naturalHeight > 0 ? image.naturalHeight : svgHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("이미지 캔버스를 준비하지 못했습니다.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

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
  bracket: SessionBracket,
  clubLevels: ClubLevel[] = DEFAULT_CLUB_LEVELS,
  options: { includeScores?: boolean } = {}
) {
  const { includeScores = false } = options;
  const effectiveLevels = clubLevels.length > 0 ? clubLevels : DEFAULT_CLUB_LEVELS;
  const height = totalImageHeight(bracket, includeScores);
  const svgMarkup = renderSvg(session, bracket, effectiveLevels, includeScores);
  const blob = await svgToPngBlob(svgMarkup, IMAGE_WIDTH, height);
  const suffix = includeScores ? "-결과" : "-자동대진표";
  const fileName = `${sanitizeFileName(session.title)}${suffix}.png`;

  return [
    new File([blob], fileName, {
      type: "image/png",
    }),
  ];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("이미지를 준비하지 못했습니다."));
    reader.readAsDataURL(blob);
  });
}

function showImageOverlay(dataUrl: string) {
  const overlay = document.createElement("div");
  overlay.setAttribute("data-download-ui", "true");
  overlay.style.cssText = [
    "position:fixed;inset:0;z-index:99999",
    "background:rgba(0,0,0,0.92)",
    "display:flex;flex-direction:column;align-items:center;justify-content:center",
    "gap:20px;padding:24px;box-sizing:border-box",
  ].join(";");

  const img = document.createElement("img");
  img.src = dataUrl;
  img.style.cssText =
    "max-width:100%;max-height:65vh;object-fit:contain;border-radius:8px";

  const hint = document.createElement("p");
  hint.textContent = "이미지를 길게 눌러 저장하세요";
  hint.style.cssText =
    "color:#fff;font-size:16px;font-weight:700;margin:0;text-align:center;font-family:sans-serif";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "닫기";
  closeBtn.style.cssText = [
    "padding:12px 32px;background:#fff;border:none",
    "border-radius:999px;font-size:15px;font-weight:700;cursor:pointer",
    "font-family:sans-serif",
  ].join(";");
  closeBtn.onclick = () => overlay.remove();

  overlay.appendChild(img);
  overlay.appendChild(hint);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
}

export async function downloadFiles(files: File[]) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isKakaoTalk = /KAKAOTALK/i.test(ua);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

  // 카카오톡 인앱 브라우저: 다운로드/Web Share 모두 차단됨
  // → 이미지를 화면에 띄우고 길게 눌러 저장하도록 안내
  if (isKakaoTalk) {
    const dataUrl = await blobToDataUrl(files[0]);
    showImageOverlay(dataUrl);
    return;
  }

  // 일반 모바일 브라우저: Web Share API로 갤러리 저장
  if (isMobile && typeof navigator?.share === "function") {
    try {
      await navigator.share({ files, title: files[0]?.name });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      // Web Share 실패 → 앵커 다운로드로 폴백
    }
  }

  // PC + 그 외 폴백: 앵커 다운로드
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
