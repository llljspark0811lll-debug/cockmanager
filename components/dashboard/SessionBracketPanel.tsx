"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ClubSession,
  SessionBracket,
  SessionParticipant,
} from "@/components/dashboard/types";
import { normalizeGenderLabel } from "@/components/dashboard/utils";
import {
  buildBracketImageFiles,
  downloadFiles,
} from "@/components/dashboard/session-bracket-export";

type SessionBracketPanelProps = {
  session: ClubSession;
  tutorialDefaultsActive?: boolean;
  onBracketGenerated?: () => void;
};

type BracketApiResponse = {
  sessionId: number;
  sessionTitle: string;
  participantCount: number;
  bracket: SessionBracket | null;
};

async function notifyAdminActivity(payload: Record<string, unknown>) {
  try {
    await fetch("/api/admin/activity", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Ignore telemetry failures so the editing flow stays responsive.
  }
}

function buildDefaultCourtCount(session: ClubSession) {
  const participantCount =
    session.registeredCount ??
    (session.participants ?? []).filter(
      (participant) => participant.status === "REGISTERED"
    ).length;

  return Math.max(1, Math.min(6, Math.ceil(participantCount / 4)));
}

function groupLabel(division: string) {
  if (division === "MEN") return "남복";
  if (division === "WOMEN") return "여복";
  return "랜덤 복식";
}

function playerBadgeLabel(
  player: SessionBracket["summary"]["playerStats"][number]
) {
  const gender = normalizeGenderLabel(player.gender);
  const guestText = player.isGuest ? "게스트" : "회원";
  return `${guestText} · ${gender} · ${player.level}`;
}

export function SessionBracketPanel({
  session,
  tutorialDefaultsActive = false,
  onBracketGenerated,
}: SessionBracketPanelProps) {
  const [courtCount, setCourtCount] = useState(
    buildDefaultCourtCount(session)
  );
  const [minGamesPerPlayer, setMinGamesPerPlayer] = useState(2);
  const [separateByGender, setSeparateByGender] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [bracket, setBracket] = useState<SessionBracket | null>(
    null
  );
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const [swapNotice, setSwapNotice] = useState("");
  const [exportingMode, setExportingMode] = useState<
    "download" | null
  >(null);
  const [fixedPairs, setFixedPairs] = useState<Array<[string, string]>>([]);
  const [pendingPairPlayerId, setPendingPairPlayerId] = useState<string | null>(null);

  type SwapSelection = {
    roundIndex: number;
    matchIndex: number;
    team: "A" | "B";
    playerIndex: number;
  };
  const [swapSelection, setSwapSelection] = useState<SwapSelection | null>(null);
  const swapNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registeredCount =
    session.registeredCount ??
    (session.participants ?? []).filter(
      (participant) => participant.status === "REGISTERED"
    ).length;

  const canGenerate = session.status === "CLOSED" && registeredCount >= 4;

  useEffect(() => {
    setCourtCount(tutorialDefaultsActive ? 2 : buildDefaultCourtCount(session));
    setMinGamesPerPlayer(tutorialDefaultsActive ? 4 : 2);
    setSeparateByGender(false);
    setFixedPairs([]);
    setPendingPairPlayerId(null);
    setSwapSelection(null);
    setError("");
    setBracket(null);
    setLoaded(false);
    setExportMessage("");
    setExportError("");
    setSwapNotice("");
    setExportingMode(null);
  }, [session.id, tutorialDefaultsActive]);

  useEffect(() => {
    return () => {
      if (swapNoticeTimeoutRef.current) {
        clearTimeout(swapNoticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBracket() {
      if (!canGenerate) {
        setLoaded(true);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/sessions/bracket?sessionId=${session.id}`,
          {
            credentials: "include",
          }
        );
        const data = (await response.json()) as BracketApiResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            data.error ?? "자동 대진표 정보를 불러오지 못했습니다."
          );
        }

        if (cancelled) {
          return;
        }

        setBracket(data.bracket);
        if (data.bracket) {
          setCourtCount(
            tutorialDefaultsActive ? 2 : data.bracket.config.courtCount
          );
          setMinGamesPerPlayer(
            tutorialDefaultsActive
              ? 4
              : data.bracket.config.minGamesPerPlayer
          );
          setSeparateByGender(
            tutorialDefaultsActive
              ? false
              : data.bracket.config.separateByGender
          );
          setFixedPairs(
            tutorialDefaultsActive ? [] : data.bracket.config.fixedPairs ?? []
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "자동 대진표 정보를 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoaded(true);
        }
      }
    }

    loadBracket().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [canGenerate, session.id, tutorialDefaultsActive]);

  const playerStats = useMemo(
    () => bracket?.summary.playerStats ?? [],
    [bracket]
  );

  const registeredParticipants = useMemo(
    () => (session.participants ?? []).filter((p) => p.status === "REGISTERED"),
    [session.participants]
  );

  const pairedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [a, b] of fixedPairs) {
      ids.add(a);
      ids.add(b);
    }
    return ids;
  }, [fixedPairs]);

  function getParticipantPlayerId(participant: SessionParticipant) {
    return participant.memberId !== null
      ? `member-${participant.memberId}`
      : `guest-${participant.id}`;
  }

  function getParticipantName(participant: SessionParticipant) {
    return participant.member?.name ?? participant.guestName ?? "?";
  }

  function handleParticipantCardClick(playerId: string) {
    if (pendingPairPlayerId === null) {
      setPendingPairPlayerId(playerId);
      return;
    }
    if (pendingPairPlayerId === playerId) {
      setPendingPairPlayerId(null);
      return;
    }
    const first = pendingPairPlayerId;
    setFixedPairs((prev) => {
      const filtered = prev.filter(
        ([a, b]) => a !== first && b !== first && a !== playerId && b !== playerId
      );
      return [...filtered, [first, playerId]];
    });
    setPendingPairPlayerId(null);
  }

  function removePair(pairIndex: number) {
    setFixedPairs((prev) => prev.filter((_, i) => i !== pairIndex));
  }

  async function handleGenerateBracket() {
    setLoading(true);
    setError("");
    setExportMessage("");
    setExportError("");
    setSwapNotice("");

    try {
      const response = await fetch("/api/sessions/bracket", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session.id,
          courtCount,
          minGamesPerPlayer,
          separateByGender,
          fixedPairs,
        }),
      });

      const data = (await response.json()) as BracketApiResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ?? "자동 대진표 생성에 실패했습니다."
        );
      }

      setBracket(data.bracket);
      setSwapSelection(null);
      onBracketGenerated?.();
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "자동 대진표 생성에 실패했습니다."
      );
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  function handlePlayerClick(
    roundIndex: number,
    matchIndex: number,
    team: "A" | "B",
    playerIndex: number
  ) {
    if (!bracket) return;

    setSwapNotice("");

    // 같은 선수 → 선택 해제
    if (
      swapSelection?.roundIndex === roundIndex &&
      swapSelection?.matchIndex === matchIndex &&
      swapSelection?.team === team &&
      swapSelection?.playerIndex === playerIndex
    ) {
      setSwapSelection(null);
      return;
    }

    // 첫 번째 선수 선택
    if (!swapSelection) {
      setSwapSelection({ roundIndex, matchIndex, team, playerIndex });
      return;
    }

    // 다른 라운드 선수 클릭 → 안내만 표시하고 첫 선택 유지
    if (swapSelection.roundIndex !== roundIndex) {
      const message =
        "다른 라운드 선수와는 위치를 바꿀 수 없습니다.\n같은 라운드에서 선택해 주세요.";
      if (swapNoticeTimeoutRef.current) {
        clearTimeout(swapNoticeTimeoutRef.current);
      }
      setSwapNotice(message);
      swapNoticeTimeoutRef.current = setTimeout(() => {
        setSwapNotice("");
        swapNoticeTimeoutRef.current = null;
      }, 3000);
      return;
    }

    // 같은 라운드 다른 선수 → 스왑
    const newBracket = JSON.parse(JSON.stringify(bracket)) as SessionBracket;
    const fromMatch =
      newBracket.rounds[swapSelection.roundIndex].matches[swapSelection.matchIndex];
    const toMatch = newBracket.rounds[roundIndex].matches[matchIndex];
    const fromTeam =
      swapSelection.team === "A" ? fromMatch.teamA : fromMatch.teamB;
    const toTeam = team === "A" ? toMatch.teamA : toMatch.teamB;
    const fromPlayer = fromTeam.players[swapSelection.playerIndex];
    const toPlayer = toTeam.players[playerIndex];
    fromTeam.players[swapSelection.playerIndex] = toPlayer;
    toTeam.players[playerIndex] = fromPlayer;
    setBracket(newBracket);
    setSwapSelection(null);
    setSwapNotice("");
    void notifyAdminActivity({
      event: "SESSION_BRACKET_SWAP",
      sessionTitle: session.title,
      roundNumber: newBracket.rounds[roundIndex].roundNumber,
      fromCourtNumber: fromMatch.courtNumber,
      toCourtNumber: toMatch.courtNumber,
      fromPlayerName: fromPlayer.name,
      toPlayerName: toPlayer.name,
    });
  }

  async function handleExport() {
    if (!bracket) {
      setExportError("내보낼 대진표가 아직 준비되지 않았습니다.");
      return;
    }

    setExportMessage("");
    setExportError("");
    setExportingMode("download");

    try {
      const files = await buildBracketImageFiles(session, bracket);

      await downloadFiles(files);
      void notifyAdminActivity({
        event: "SESSION_BRACKET_EXPORT",
        sessionTitle: session.title,
        imageCount: files.length,
      });
      setExportMessage(
        files.length > 1
          ? `대진표 이미지 ${files.length}장을 저장했습니다.`
          : "대진표 이미지를 저장했습니다."
      );
    } catch (exportErr) {
      if (
        exportErr instanceof DOMException &&
        exportErr.name === "AbortError"
      ) {
        setExportingMode(null);
        return;
      }

      setExportError(
        exportErr instanceof Error
          ? exportErr.message
          : "대진표 이미지를 처리하지 못했습니다."
      );
    } finally {
      setExportingMode(null);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 md:px-4 md:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-black text-slate-900">
              자동 대진표
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              마감된 참석 인원을 기준으로 코트 수와 최소 경기 수에 맞춘
              라운드형 대진표를 자동으로 생성합니다.
            </p>
          </div>
          <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 md:px-3 md:text-xs">
            참석 확정 {registeredCount}명
          </div>
        </div>
      </div>

      <div className="space-y-4 p-3 md:p-4">
        {session.status !== "CLOSED" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-700">
            자동 대진표는 마감 처리된 운동 일정에서만 생성할 수 있습니다.
            먼저 이 일정을 마감한 뒤 다시 시도해 주세요.
          </div>
        ) : null}

        {session.status === "CLOSED" && registeredCount < 4 ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium leading-6 text-rose-700">
            자동 대진표는 참석 확정 인원이 최소 4명 이상이어야 생성할 수
            있습니다.
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))]">
          <label className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500">
              사용할 코트 수
            </span>
            <select
              value={courtCount}
              onChange={(event) =>
                setCourtCount(Number(event.target.value))
              }
              disabled={!canGenerate || loading}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {Array.from({ length: 6 }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    {value}코트
                  </option>
                )
              )}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500">
              1인 최소 경기 수
            </span>
            <select
              value={minGamesPerPlayer}
              onChange={(event) =>
                setMinGamesPerPlayer(Number(event.target.value))
              }
              disabled={!canGenerate || loading}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {Array.from({ length: 5 }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    최소 {value}경기
                  </option>
                )
              )}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={separateByGender}
              onChange={(event) =>
                setSeparateByGender(event.target.checked)
              }
              disabled={!canGenerate || loading}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            남복 / 여복 분리 생성
          </label>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-medium leading-6 text-slate-500">
          같은 파트너와 같은 상대 반복은 최대한 줄이고, 직전 라운드를
          쉬었던 인원은 다음 라운드에 우선 배정합니다.
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-bold leading-6 text-sky-700">
          선수 이름을 클릭하면 같은 라운드 안에서 위치를 바꿀 수 있습니다.
        </div>

        {canGenerate && registeredParticipants.length >= 2 ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div>
              <p className="text-xs font-bold text-slate-700">고정 파트너 설정</p>
              <p className="mt-1 text-xs text-slate-400">
                {pendingPairPlayerId
                  ? "파트너로 묶을 두 번째 참가자를 클릭하세요."
                  : "매 라운드 같은 팀으로 묶을 첫 번째 참가자를 클릭하세요."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {registeredParticipants.map((participant) => {
                const pid = getParticipantPlayerId(participant);
                const name = getParticipantName(participant);
                const isPending = pendingPairPlayerId === pid;
                const isPaired = pairedPlayerIds.has(pid);
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => handleParticipantCardClick(pid)}
                    disabled={loading}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed",
                      isPending
                        ? "border-sky-400 bg-sky-100 text-sky-700"
                        : isPaired
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            {fixedPairs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  고정된 파트너
                </p>
                <div className="flex flex-wrap gap-2">
                  {fixedPairs.map(([aId, bId], index) => {
                    const aParticipant = registeredParticipants.find(
                      (p) => getParticipantPlayerId(p) === aId
                    );
                    const bParticipant = registeredParticipants.find(
                      (p) => getParticipantPlayerId(p) === bId
                    );
                    const aName = aParticipant
                      ? getParticipantName(aParticipant)
                      : aId;
                    const bName = bParticipant
                      ? getParticipantName(bParticipant)
                      : bId;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 pl-3 pr-1.5 py-1.5"
                      >
                        <span className="text-xs font-bold text-violet-700">
                          {aName}
                        </span>
                        <span className="text-[10px] font-bold text-violet-400">
                          &amp;
                        </span>
                        <span className="text-xs font-bold text-violet-700">
                          {bName}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePair(index)}
                          disabled={loading}
                          className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-200 text-[10px] font-black text-violet-600 transition hover:bg-violet-300 disabled:cursor-not-allowed"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              handleGenerateBracket().catch(() => undefined);
            }}
            disabled={!canGenerate || loading}
            data-tutorial-id="bracket-generate-button"
            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading
              ? "생성 중..."
              : bracket
                ? "대진표 다시 생성"
                : "자동 대진표 생성"}
          </button>
          <button
            onClick={() => {
              handleExport().catch(() => undefined);
            }}
            disabled={!bracket || loading || exportingMode !== null}
            data-tutorial-id="bracket-export-button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {exportingMode === "download"
              ? "이미지 준비 중..."
              : "이미지 저장"}
          </button>

        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium leading-6 text-rose-700">
            {error}
          </div>
        ) : null}

        {exportError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium leading-6 text-rose-700">
            {exportError}
          </div>
        ) : null}

        {exportMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700">
            {exportMessage}
          </div>
        ) : null}

        {loaded && bracket ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  생성 라운드
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {bracket.summary.totalRounds}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  총 경기 수
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {bracket.summary.totalMatches}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  생성 조건
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-900">
                  {bracket.config.courtCount}코트 · 최소{" "}
                  {bracket.config.minGamesPerPlayer}경기
                  <br />
                  {bracket.config.separateByGender
                    ? "남복/여복 분리"
                    : "랜덤 복식"}
                </p>
              </div>
            </div>

            {bracket.summary.warnings.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-bold text-amber-700">
                  확인 메시지
                </p>
                <ul className="mt-2 space-y-1.5 text-sm leading-6 text-amber-700">
                  {bracket.summary.warnings.map((warning) => (
                    <li key={warning}>- {warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-4" data-tutorial-id="bracket-rounds">
              {swapSelection && (
                <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5">
                  <span className="text-xs font-bold text-sky-700">
                    ✦ 바꿀 선수를 같은 라운드에서 선택하세요
                  </span>
                  <button
                    type="button"
                    onClick={() => setSwapSelection(null)}
                    className="ml-auto rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-600 transition hover:bg-sky-200"
                  >
                    취소
                  </button>
                </div>
              )}

            {bracket.rounds.map((round, roundIndex) => (
                <section
                  key={round.roundNumber}
                  className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white"
                >
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-sm font-black text-slate-900">
                        라운드 {round.roundNumber}
                      </h5>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">
                        경기 {round.matches.length}개
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    {round.matches.map((match, matchIndex) => (
                      <div
                        key={`${round.roundNumber}-${match.courtNumber}`}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
                              Court {match.courtNumber}
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {groupLabel(match.division)}
                            </p>
                          </div>
                        </div>

                        {(() => {
                          const isThisRoundSelected =
                            swapSelection?.roundIndex === roundIndex;

                          const renderTeam = (team: "A" | "B") => {
                            const teamData = team === "A" ? match.teamA : match.teamB;
                            return (
                              <div
                                className={[
                                  "min-w-0 rounded-xl px-2.5 py-2.5 md:rounded-2xl md:px-3 md:py-3",
                                  team === "A" ? "bg-sky-50" : "bg-emerald-50",
                                ].join(" ")}
                              >
                                <p className={["text-xs font-bold", team === "A" ? "text-sky-700" : "text-emerald-700"].join(" ")}>
                                  팀 {team}
                                </p>
                                <div className="mt-2 space-y-1">
                                  {teamData.players.map((player, playerIndex) => {
                                    const isSelected =
                                      swapSelection?.roundIndex === roundIndex &&
                                      swapSelection?.matchIndex === matchIndex &&
                                      swapSelection?.team === team &&
                                      swapSelection?.playerIndex === playerIndex;
                                    const isSwappable = isThisRoundSelected && !isSelected;
                                    return (
                                      <button
                                        key={player.playerId}
                                        type="button"
                                        onClick={() => handlePlayerClick(roundIndex, matchIndex, team, playerIndex)}
                                        className={[
                                          "w-full rounded-lg px-2 py-1.5 text-left transition",
                                          isSelected
                                            ? "bg-sky-500 ring-2 ring-sky-400 ring-offset-1"
                                            : isSwappable
                                              ? "bg-white ring-1 ring-sky-300 hover:ring-sky-400"
                                              : "hover:bg-white/70",
                                        ].join(" ")}
                                      >
                                        <span className={["truncate text-[15px] font-semibold leading-6 md:text-sm", isSelected ? "text-white" : "text-slate-900"].join(" ")}>
                                          {player.name}
                                        </span>
                                        <span className={["ml-2 text-xs font-medium", isSelected ? "text-sky-100" : "text-slate-500"].join(" ")}>
                                          {normalizeGenderLabel(player.gender)} · {player.level}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          };

                          return (
                            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] items-center gap-2 md:gap-3">
                              {renderTeam("A")}
                              <div className="text-center text-xs font-black text-slate-400 md:text-sm">VS</div>
                              {renderTeam("B")}
                            </div>
                          );
                        })()}
                      </div>
                    ))}

                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-bold text-slate-500">
                        이번 라운드 휴식
                      </p>
                      {round.restingPlayers.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {round.restingPlayers.map((player) => (
                            <span
                              key={`${round.roundNumber}-${player.playerId}`}
                              className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600"
                            >
                              {player.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm font-medium text-slate-400">
                          휴식 인원 없음
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h5 className="text-sm font-black text-slate-900">
                  참가자별 경기 수
                </h5>
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                {playerStats.map((player) => (
                  <div
                    key={player.playerId}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">
                          {player.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {playerBadgeLabel(player)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 text-xs font-bold">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                          경기 {player.games}회
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">
                          휴식 {player.rests}회
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : loaded && canGenerate ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            아직 저장된 자동 대진표가 없습니다. 설정을 확인한 뒤 생성 버튼을
            눌러 주세요.
          </div>
        ) : null}

        {swapNotice ? (
          <div className="pointer-events-none fixed bottom-5 right-5 z-50 max-w-[calc(100vw-2.5rem)] animate-pulse whitespace-pre-line rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 shadow-lg md:bottom-6 md:right-6 md:max-w-sm">
            {swapNotice}
          </div>
        ) : null}
      </div>
    </section>
    </>
  );
}
