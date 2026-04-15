"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ClubSession,
  SessionBracket,
} from "@/components/dashboard/types";
import { normalizeGenderLabel } from "@/components/dashboard/utils";

type SessionBracketPanelProps = {
  session: ClubSession;
};

type BracketApiResponse = {
  sessionId: number;
  sessionTitle: string;
  participantCount: number;
  bracket: SessionBracket | null;
};

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

  const registeredCount =
    session.registeredCount ??
    (session.participants ?? []).filter(
      (participant) => participant.status === "REGISTERED"
    ).length;

  const canGenerate = session.status === "CLOSED" && registeredCount >= 4;

  useEffect(() => {
    setCourtCount(buildDefaultCourtCount(session));
    setMinGamesPerPlayer(2);
    setSeparateByGender(false);
    setError("");
    setBracket(null);
    setLoaded(false);
  }, [session.id]);

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
          setCourtCount(data.bracket.config.courtCount);
          setMinGamesPerPlayer(
            data.bracket.config.minGamesPerPlayer
          );
          setSeparateByGender(
            data.bracket.config.separateByGender
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
  }, [canGenerate, session.id]);

  const playerStats = useMemo(
    () => bracket?.summary.playerStats ?? [],
    [bracket]
  );

  async function handleGenerateBracket() {
    setLoading(true);
    setError("");

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

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200">
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

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              handleGenerateBracket().catch(() => undefined);
            }}
            disabled={!canGenerate || loading}
            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading
              ? "생성 중..."
              : bracket
                ? "대진표 다시 생성"
                : "자동 대진표 생성"}
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium leading-6 text-rose-700">
            {error}
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

            <div className="space-y-4">
              {bracket.rounds.map((round) => (
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
                    {round.matches.map((match) => (
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

                        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] items-center gap-2 md:gap-3">
                          <div className="min-w-0 rounded-xl bg-sky-50 px-2.5 py-2.5 md:rounded-2xl md:px-3 md:py-3">
                            <p className="text-xs font-bold text-sky-700">
                              팀 A
                            </p>
                            <div className="mt-2 space-y-1.5">
                              {match.teamA.players.map((player) => (
                                <p
                                  key={player.playerId}
                                  className="truncate text-[15px] font-semibold leading-6 text-slate-900 md:text-sm"
                                >
                                  {player.name}
                                  <span className="ml-2 text-xs font-medium text-slate-500">
                                    {normalizeGenderLabel(player.gender)} ·{" "}
                                    {player.level}
                                  </span>
                                </p>
                              ))}
                            </div>
                          </div>

                          <div className="text-center text-xs font-black text-slate-400 md:text-sm">
                            VS
                          </div>

                          <div className="min-w-0 rounded-xl bg-emerald-50 px-2.5 py-2.5 md:rounded-2xl md:px-3 md:py-3">
                            <p className="text-xs font-bold text-emerald-700">
                              팀 B
                            </p>
                            <div className="mt-2 space-y-1.5">
                              {match.teamB.players.map((player) => (
                                <p
                                  key={player.playerId}
                                  className="truncate text-[15px] font-semibold leading-6 text-slate-900 md:text-sm"
                                >
                                  {player.name}
                                  <span className="ml-2 text-xs font-medium text-slate-500">
                                    {normalizeGenderLabel(player.gender)} ·{" "}
                                    {player.level}
                                  </span>
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
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
      </div>
    </section>
  );
}
