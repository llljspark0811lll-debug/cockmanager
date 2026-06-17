"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ClubLevel,
  ClubSession,
  LevelMode,
  SessionBracket,
  SessionBracketLevelGroup,
  SessionParticipant,
} from "@/components/dashboard/types";
import { normalizeGenderLabel } from "@/components/dashboard/utils";
import { DEFAULT_LEVEL_NAMES, LEVEL_COUNT } from "@/lib/dashboard-constants";

const DEFAULT_CLUB_LEVELS = Array.from({ length: LEVEL_COUNT }, (_, i) => ({
  rank: i + 1,
  name: DEFAULT_LEVEL_NAMES[i] ?? String(i + 1),
}));
import {
  buildBracketImageFiles,
  downloadFiles,
  stripTrialPrefix,
} from "@/components/dashboard/session-bracket-export";

type SessionBracketPanelProps = {
  session: ClubSession;
  tutorialDefaultsActive?: boolean;
  onBracketGenerated?: () => void;
  clubLevels: ClubLevel[];
};

type BracketApiResponse = {
  sessionId: number;
  sessionTitle: string;
  participantCount: number;
  bracket: SessionBracket | null;
  canProceedWithRelaxedMode?: boolean;
  warnings?: string[];
};

const RELAXABLE_ERROR_PATTERNS = [
  "연속 휴식 없이",
  "직전 라운드를 쉰 인원을 모두 이번 라운드에 넣을 수 없습니다",
  "직전 라운드 휴식 인원을 모두 다음 라운드에 배치할 수 없습니다",
  "최소 경기 수를 배정할 수 없습니다",
];

function shouldOfferRelaxedMode(
  canProceedWithRelaxedMode: boolean | undefined,
  errorMessage: string | undefined
) {
  if (canProceedWithRelaxedMode) {
    return true;
  }

  if (!errorMessage) {
    return false;
  }

  return RELAXABLE_ERROR_PATTERNS.some((pattern) =>
    errorMessage.includes(pattern)
  );
}

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

const LEGACY_LEVEL_MAP: Record<string, string> = {
  S: "1", A: "2", B: "3", C: "4", D: "5", E: "6", 초심: "7",
};

function normalizeLevelLocal(v: string): string {
  const t = String(v ?? "").trim();
  if (!t) return "7";
  if (["1", "2", "3", "4", "5", "6", "7"].includes(t)) return t;
  return LEGACY_LEVEL_MAP[t] ?? "7";
}

function allocateCourtsProportionally(
  groups: { id: string; count: number }[],
  totalCourts: number
): Record<string, number> {
  if (groups.length === 0) return {};
  const total = groups.reduce((s, g) => s + g.count, 0);
  if (total === 0) return {};

  const floored = groups.map((g) => Math.max(1, Math.floor((g.count / total) * totalCourts)));
  let remainder = totalCourts - floored.reduce((s, v) => s + v, 0);

  if (remainder > 0) {
    const fracs = groups
      .map((g, i) => ({ i, frac: (g.count / total) * totalCourts - Math.floor((g.count / total) * totalCourts) }))
      .sort((a, b) => b.frac - a.frac);
    for (const { i } of fracs) {
      if (remainder <= 0) break;
      floored[i]++;
      remainder--;
    }
  }

  const result: Record<string, number> = {};
  groups.forEach((g, i) => { result[g.id] = floored[i]; });
  return result;
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


function getParticipantGenderGroup(participant: SessionParticipant) {
  const raw = String(
    participant.member?.gender ?? participant.guestGender ?? ""
  )
    .trim()
    .toLowerCase();

  if (
    raw === "남" ||
    raw === "남자" ||
    raw === "m" ||
    raw === "male"
  ) {
    return "MEN";
  }

  if (
    raw === "여" ||
    raw === "여자" ||
    raw === "f" ||
    raw === "female"
  ) {
    return "WOMEN";
  }

  return "OTHER";
}

function ScoreInputRow({
  roundNumber,
  courtNumber,
  initialA,
  initialB,
  saving,
  teamLabelA,
  teamLabelB,
  onSave,
}: {
  roundNumber: number;
  courtNumber: number;
  initialA: number | null;
  initialB: number | null;
  saving: boolean;
  teamLabelA: string;
  teamLabelB: string;
  onSave: (roundNumber: number, courtNumber: number, a: number | null, b: number | null) => Promise<void>;
}) {
  const [a, setA] = useState(initialA !== null ? String(initialA) : "");
  const [b, setB] = useState(initialB !== null ? String(initialB) : "");

  const parsed = {
    a: a.trim() === "" ? null : Number(a),
    b: b.trim() === "" ? null : Number(b),
  };
  const bothEntered = parsed.a !== null && !isNaN(parsed.a) && parsed.b !== null && !isNaN(parsed.b);

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
      {/* 1줄: 점수 입력 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 shrink-0">점수</span>
        <span className="text-xs font-bold text-sky-700 shrink-0">{teamLabelA}</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={a}
          onChange={(e) => setA(e.target.value.replace(/[^0-9]/g, ""))}
          onFocus={(e) => e.target.select()}
          placeholder=""
          className="w-14 min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-black text-sky-700 outline-none focus:border-sky-400"
        />
        <span className="text-xs font-bold text-slate-400">:</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={b}
          onChange={(e) => setB(e.target.value.replace(/[^0-9]/g, ""))}
          onFocus={(e) => e.target.select()}
          placeholder=""
          className="w-14 min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-black text-emerald-700 outline-none focus:border-sky-400"
        />
        <span className="text-xs font-bold text-emerald-700 shrink-0">{teamLabelB}</span>
      </div>
      {/* 2줄: 버튼 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving || !bothEntered}
          onClick={() => void onSave(roundNumber, courtNumber, parsed.a, parsed.b)}
          className="rounded-xl bg-sky-600 px-4 py-1.5 text-xs font-black text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "저장 중" : "저장"}
        </button>
        {(initialA !== null || initialB !== null) && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave(roundNumber, courtNumber, null, null)}
            className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
}

export function SessionBracketPanel({
  session,
  tutorialDefaultsActive = false,
  onBracketGenerated,
  clubLevels: clubLevelsProp,
}: SessionBracketPanelProps) {
  const clubLevels = clubLevelsProp.length > 0 ? clubLevelsProp : DEFAULT_CLUB_LEVELS;
  const [generationMode, setGenerationMode] = useState<
    "STANDARD" | "TEAM_BATTLE"
  >("STANDARD");
  const [courtCount, setCourtCount] = useState(
    buildDefaultCourtCount(session)
  );
  const [minGamesPerPlayer, setMinGamesPerPlayer] = useState(2);
  const [separateByGender, setSeparateByGender] = useState(false);
  const [teamLabels, setTeamLabels] = useState({ A: "팀A", B: "팀B" });
  const [teamAssignments, setTeamAssignments] = useState<
    Record<string, "A" | "B">
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // 슬롯별 대진 저장: 키 = "STANDARD_none" | "STANDARD_separate" | "STANDARD_filter" | "TEAM_BATTLE"
  const [bracketSlots, setBracketSlots] = useState<Record<string, SessionBracket | null>>({});
  // 이미 로드 시도한 슬롯 추적 (ref = 비반응형 가드, state = 렌더 트리거)
  const loadedSlotsRef = useRef<Set<string>>(new Set());
  const [loadedSlots, setLoadedSlots] = useState<Set<string>>(new Set());
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const [swapNotice, setSwapNotice] = useState("");
  const [exportingMode, setExportingMode] = useState<
    "download" | null
  >(null);
  const [fixedPairs, setFixedPairs] = useState<Array<[string, string]>>([]);
  const [pendingPairPlayerId, setPendingPairPlayerId] = useState<string | null>(null);
  // 점수 입력 모드: 어느 경기가 활성화됐는지 (roundNumber-courtNumber)
  const [scoreEditKey, setScoreEditKey] = useState<string | null>(null);
  const [scoreSaving, setScoreSaving] = useState(false);
  // 급수별 대진 모드
  const [levelMode, setLevelMode] = useState<LevelMode>("none");
  const [filterGroups, setFilterGroups] = useState<SessionBracketLevelGroup[]>([
    { id: "group_0", name: "그룹 1", levels: [], courtCount: 1 },
    { id: "group_1", name: "그룹 2", levels: [], courtCount: 1 },
  ]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  type SwapSelection = {
    roundIndex: number;
    matchIndex: number;
    team: "A" | "B";
    playerIndex: number;
  };
  const [swapSelection, setSwapSelection] = useState<SwapSelection | null>(null);
  const swapNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 현재 활성 슬롯 키 / 대진 / 로드 여부 (파생값)
  const slotKey = generationMode === "TEAM_BATTLE" ? "TEAM_BATTLE" : `STANDARD_${levelMode}`;
  const bracket = bracketSlots[slotKey] ?? null;
  const loaded = loadedSlots.has(slotKey);

  function markSlotLoaded(key: string) {
    loadedSlotsRef.current.add(key);
    setLoadedSlots(new Set(loadedSlotsRef.current));
  }

  const registeredCount =
    session.registeredCount ??
    (session.participants ?? []).filter(
      (participant) => participant.status === "REGISTERED"
    ).length;

  const canGenerate = session.status === "CLOSED" && registeredCount >= 4;

  // 세션 변경 시 전체 초기화
  useEffect(() => {
    setGenerationMode("STANDARD");
    setCourtCount(tutorialDefaultsActive ? 2 : buildDefaultCourtCount(session));
    setMinGamesPerPlayer(tutorialDefaultsActive ? 4 : 2);
    setSeparateByGender(false);
    setTeamLabels({ A: "팀A", B: "팀B" });
    setTeamAssignments({});
    setFixedPairs([]);
    setPendingPairPlayerId(null);
    setSwapSelection(null);
    setError("");
    loadedSlotsRef.current = new Set();
    setLoadedSlots(new Set());
    setBracketSlots({});
    setExportMessage("");
    setExportError("");
    setSwapNotice("");
    setExportingMode(null);
    setLevelMode("none");
    setFilterGroups([
      { id: "group_0", name: "그룹 1", levels: [], courtCount: 1 },
      { id: "group_1", name: "그룹 2", levels: [], courtCount: 1 },
    ]);
    setActiveGroupId(null);
  }, [session.id, tutorialDefaultsActive]);

  useEffect(() => {
    return () => {
      if (swapNoticeTimeoutRef.current) {
        clearTimeout(swapNoticeTimeoutRef.current);
      }
    };
  }, []);

  // 슬롯별 대진표 lazy 로드: generationMode/levelMode 전환 시 해당 슬롯이 없으면 fetch
  useEffect(() => {
    const currentSlotKey = generationMode === "TEAM_BATTLE" ? "TEAM_BATTLE" : `STANDARD_${levelMode}`;

    // 이미 로드된 슬롯이면 스킵 (ref로 최신값 확인)
    if (loadedSlotsRef.current.has(currentSlotKey)) return;

    let cancelled = false;

    async function loadSlot() {
      if (!canGenerate) {
        loadedSlotsRef.current.add(currentSlotKey);
        setLoadedSlots(new Set(loadedSlotsRef.current));
        return;
      }

      setLoading(true);
      setError("");

      let autoSwitching = false;

      try {
        const levelModeParam = generationMode === "STANDARD" ? `&levelMode=${levelMode}` : "";
        const response = await fetch(
          `/api/sessions/bracket?sessionId=${session.id}&generationMode=${generationMode}${levelModeParam}`,
          { credentials: "include" }
        );
        const data = (await response.json()) as BracketApiResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "자동 대진표 정보를 불러오지 못했습니다.");
        }

        if (cancelled) return;

        // 초기 STANDARD_none 로드 시 TEAM_BATTLE 대진표 자동 감지
        if (!data.bracket && currentSlotKey === "STANDARD_none") {
          try {
            const tbRes = await fetch(
              `/api/sessions/bracket?sessionId=${session.id}&generationMode=TEAM_BATTLE`,
              { credentials: "include" }
            );
            if (tbRes.ok && !cancelled) {
              const tbData = (await tbRes.json()) as BracketApiResponse;
              if (tbData.bracket && !cancelled) {
                autoSwitching = true;
                setGenerationMode("TEAM_BATTLE");
                return;
              }
            }
          } catch {
            // 자동 감지 실패 시 무시
          }
        }

        setBracketSlots((prev) => ({ ...prev, [currentSlotKey]: data.bracket }));

        // 초기 슬롯(none/TEAM_BATTLE)에서만 폼 설정 복원
        const isInitialSlot = currentSlotKey === "STANDARD_none" || currentSlotKey === "TEAM_BATTLE";

        if (data.bracket) {
          // 급수필터별 슬롯: filterGroups 복원
          if (currentSlotKey === "STANDARD_filter" && !tutorialDefaultsActive) {
            const groups = data.bracket.config.levelGroups ?? [];
            if (groups.length > 0) {
              setFilterGroups(groups.map((g) => ({
                id: g.id, name: g.name, levels: g.levels, courtCount: g.courtCount,
              })));
            }
          }
          if (data.bracket.levelGroupData && data.bracket.levelGroupData.length > 0) {
            setActiveGroupId(data.bracket.levelGroupData[0]!.groupId);
          }
          if (isInitialSlot && !tutorialDefaultsActive) {
            setCourtCount(data.bracket.config.courtCount);
            setMinGamesPerPlayer(data.bracket.config.minGamesPerPlayer);
            setSeparateByGender(data.bracket.config.separateByGender);
            setFixedPairs(data.bracket.config.fixedPairs ?? []);
            let resolved = {
              A: data.bracket.config.teamLabels?.A?.trim() || "팀A",
              B: data.bracket.config.teamLabels?.B?.trim() || "팀B",
            };
            try {
              const saved = localStorage.getItem(`team_labels_${session.id}`);
              if (saved) {
                const parsed = JSON.parse(saved) as { A?: string; B?: string };
                if (parsed.A?.trim()) resolved.A = parsed.A.trim();
                if (parsed.B?.trim()) resolved.B = parsed.B.trim();
              }
            } catch {}
            setTeamLabels(resolved);
            setTeamAssignments(data.bracket.config.teamAssignments ?? {});
          }
        } else if (currentSlotKey === "TEAM_BATTLE" && !tutorialDefaultsActive) {
          try {
            const saved = localStorage.getItem(`team_labels_${session.id}`);
            if (saved) {
              const parsed = JSON.parse(saved) as { A?: string; B?: string };
              setTeamLabels({ A: parsed.A?.trim() || "팀A", B: parsed.B?.trim() || "팀B" });
            } else {
              setTeamLabels({ A: "팀A", B: "팀B" });
            }
          } catch {
            setTeamLabels({ A: "팀A", B: "팀B" });
          }
          setTeamAssignments({});
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
        if (!cancelled && !autoSwitching) {
          loadedSlotsRef.current.add(currentSlotKey);
          setLoadedSlots(new Set(loadedSlotsRef.current));
          setLoading(false);
        }
      }
    }

    loadSlot().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate, generationMode, levelMode, session.id, tutorialDefaultsActive]);

  const registeredParticipants = useMemo(
    () => (session.participants ?? []).filter((p) => p.status === "REGISTERED"),
    [session.participants]
  );

  // 급수별 참가자 현황 (registeredParticipants 이후)
  const participantLevelCounts = useMemo(() => {
    const map = new Map<string, { count: number; maleCount: number; femaleCount: number }>();
    for (const p of registeredParticipants) {
      const level = normalizeLevelLocal(String(p.member?.level ?? p.guestLevel ?? ""));
      const existing = map.get(level) ?? { count: 0, maleCount: 0, femaleCount: 0 };
      const gender = getParticipantGenderGroup(p);
      map.set(level, {
        count: existing.count + 1,
        maleCount: existing.maleCount + (gender === "MEN" ? 1 : 0),
        femaleCount: existing.femaleCount + (gender === "WOMEN" ? 1 : 0),
      });
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([level, { count, maleCount, femaleCount }]) => ({ level, count, maleCount, femaleCount }));
  }, [registeredParticipants]);

  // 동일급수별 모드: 자동 감지 그룹 (코트 수는 전역 설정 사용)
  const separateGroups = useMemo(() => {
    return participantLevelCounts.map(({ level, count, maleCount, femaleCount }) => {
      const id = `level_${level}`;
      const levelName = clubLevels.find((l) => String(l.rank) === level)?.name ?? `${level}급`;
      return { id, name: levelName, levels: [level], count, maleCount, femaleCount, courtCount };
    });
  }, [participantLevelCounts, clubLevels, courtCount]);

  // 급수필터별 모드: 그룹별 인원수
  const filterGroupsWithCounts = useMemo(() => {
    return filterGroups.map((g) => {
      const matched = participantLevelCounts.filter(({ level }) => g.levels.includes(level));
      return {
        ...g,
        count: matched.reduce((s, { count }) => s + count, 0),
        maleCount: matched.reduce((s, { maleCount }) => s + maleCount, 0),
        femaleCount: matched.reduce((s, { femaleCount }) => s + femaleCount, 0),
      };
    });
  }, [filterGroups, participantLevelCounts]);

  // 필터 모드에서 미배정 급수
  const assignedLevelsInFilter = useMemo(() => {
    const set = new Set<string>();
    for (const g of filterGroups) for (const l of g.levels) set.add(l);
    return set;
  }, [filterGroups]);

  const unassignedLevels = useMemo(() => {
    return participantLevelCounts.filter(({ level }) => !assignedLevelsInFilter.has(level));
  }, [participantLevelCounts, assignedLevelsInFilter]);

  // 급수 모드 유효성 오류
  const levelModeErrors = useMemo(() => {
    const errors: string[] = [];

    // 급수통합 / 동일급수별 전용: 전체 인원 기준 최소 코트 수 검증
    // 급수필터별은 아래 별도 로직으로 처리 — 이 블록 건드리지 말 것
    if (levelMode === "none" || levelMode === "separate") {
      const minRequiredCourts = Math.ceil(registeredCount / 8);
      if (courtCount < minRequiredCourts) {
        errors.push(
          `코트 수 부족 — ${registeredCount}명에 최소 ${minRequiredCourts}코트 필요`
        );
      }
    }

    if (levelMode === "none") return errors;
    const checkGroup = (name: string, count: number, maleCount: number, femaleCount: number) => {
      if (separateByGender) {
        if (maleCount < 4) errors.push(`${name} 남복 (${maleCount}명): 4명 미만 — 대진 생성 불가`);
        if (femaleCount < 4) errors.push(`${name} 여복 (${femaleCount}명): 4명 미만 — 대진 생성 불가`);
      } else {
        if (count < 4) errors.push(`${name} (${count}명): 4명 미만 — 대진 생성 불가`);
      }
    };
    if (levelMode === "separate") {
      for (const g of separateGroups) {
        checkGroup(g.name, g.count, g.maleCount, g.femaleCount);
      }
    }
    if (levelMode === "filter") {
      const unassignedCount = unassignedLevels.reduce((s, l) => s + l.count, 0);
      if (unassignedCount > 0) errors.push(`${unassignedCount}명이 아직 그룹에 배정되지 않았습니다.`);
      for (const g of filterGroupsWithCounts) {
        if (g.levels.length > 0) checkGroup(g.name, g.count, g.maleCount, g.femaleCount);
      }
      // 급수필터별 전용: 그룹별 연속 휴식 방지 최소 코트 합산 검증
      const activeGroups = filterGroupsWithCounts.filter((g) => g.levels.length > 0 && g.count >= 4);
      if (activeGroups.length > 0) {
        const requiredCourts = activeGroups.reduce((sum, g) => sum + Math.ceil(g.count / 8), 0);
        if (requiredCourts > courtCount) {
          const breakdown = activeGroups
            .map((g) => `${g.name} ${g.count}명 → ${Math.ceil(g.count / 8)}코트`)
            .join(" / ");
          errors.push(
            `코트 수 부족 — 최소 ${requiredCourts}코트 필요 (${breakdown})`
          );
        }
      }
    }
    return errors;
  }, [levelMode, separateGroups, filterGroupsWithCounts, unassignedLevels, separateByGender, courtCount, registeredCount]);

  // 급수 구분 모드: 모든 그룹 라운드를 합산해서 표시
  // MergedMatch = SessionBracketMatch + 그룹 메타 (cast로 접근)
  const { displayRounds, displaySummary } = useMemo(() => {
    if (!bracket) return { displayRounds: [], displaySummary: null };
    const groups = bracket.levelGroupData;
    if (!groups || groups.length === 0) {
      return { displayRounds: bracket.rounds, displaySummary: bracket.summary };
    }

    // 동적 코트 배분 — 그룹별 rounds 배열은 코트 배정 받은 라운드만 존재(압축됨)
    // 반드시 roundNumber 기준으로 조회해야 그룹 간 라운드가 정확히 정렬됨
    const maxRounds = Math.max(
      ...groups.map((g) =>
        g.rounds.reduce((m, r) => Math.max(m, r.roundNumber), 0)
      )
    );
    const merged = Array.from({ length: maxRounds }, (_, ri) => {
      const allMatches: Array<ReturnType<typeof Object.assign>> = [];
      const allResting: typeof bracket.rounds[0]["restingPlayers"] = [];
      let courtOffset = 0;

      groups.forEach((g) => {
        const round = g.rounds.find((r) => r.roundNumber === ri + 1);
        if (!round) return;
        round.matches.forEach((m, origMatchIdx) => {
          allMatches.push(Object.assign({}, m, {
            courtNumber: m.courtNumber + courtOffset,
            _levelGroupId: g.groupId,
            _levelGroupName: g.groupName,
            _origCourtNumber: m.courtNumber,
            _origMatchIndex: origMatchIdx,
          }));
        });
        courtOffset += round.matches.length;
        allResting.push(...round.restingPlayers);
      });

      return { roundNumber: ri + 1, matches: allMatches, restingPlayers: allResting };
    }) as typeof bracket.rounds;

    const aggregateSummary = {
      totalPlayers: groups.reduce((s, g) => s + g.summary.totalPlayers, 0),
      totalRounds: maxRounds,
      totalMatches: groups.reduce((s, g) => s + g.summary.totalMatches, 0),
      warnings: groups.flatMap((g) =>
        g.summary.warnings.map((w) => `[${g.groupName}] ${w}`)
      ),
      playerStats: groups.flatMap((g) => g.summary.playerStats),
    };

    return { displayRounds: merged, displaySummary: aggregateSummary };
  }, [bracket]);

  const playerStats = useMemo(
    () => displaySummary?.playerStats ?? [],
    [displaySummary]
  );

  const teamGroupedParticipants = useMemo(
    () => ({
      A: registeredParticipants.filter(
        (participant) => getParticipantTeam(participant) === "A"
      ),
      B: registeredParticipants.filter(
        (participant) => getParticipantTeam(participant) === "B"
      ),
    }),
    [registeredParticipants, teamAssignments]
  );

  const fixedPairsByTeam = useMemo(() => {
    const initial = {
      A: [] as Array<{
        index: number;
        aId: string;
        bId: string;
        aName: string;
        bName: string;
      }>,
      B: [] as Array<{
        index: number;
        aId: string;
        bId: string;
        aName: string;
        bName: string;
      }>,
    };

    fixedPairs.forEach(([aId, bId], index) => {
      const aParticipant = registeredParticipants.find(
        (p) => getParticipantPlayerId(p) === aId
      );
      const bParticipant = registeredParticipants.find(
        (p) => getParticipantPlayerId(p) === bId
      );
      const team = aParticipant ? getParticipantTeam(aParticipant) : undefined;
      if (team !== "A" && team !== "B") {
        return;
      }

      initial[team].push({
        index,
        aId,
        bId,
        aName: aParticipant ? getParticipantName(aParticipant) : aId,
        bName: bParticipant ? getParticipantName(bParticipant) : bId,
      });
    });

    return initial;
  }, [fixedPairs, registeredParticipants, teamAssignments]);

  const teamBattleSummaries = useMemo(() => {
    const emptyLevels = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 };
    const initial = {
      A: {
        members: [] as Array<{ id: string; name: string; gender: string; level: string }>,
        total: 0,
        men: 0,
        women: 0,
        levels: { ...emptyLevels },
      },
      B: {
        members: [] as Array<{ id: string; name: string; gender: string; level: string }>,
        total: 0,
        men: 0,
        women: 0,
        levels: { ...emptyLevels },
      },
    };

    for (const participant of registeredParticipants) {
      const playerId = getParticipantPlayerId(participant);
      const team = teamAssignments[playerId];
      if (!team) continue;

      const gender = normalizeGenderLabel(
        participant.member?.gender ?? participant.guestGender ?? ""
      );
      const level = participant.member?.level ?? participant.guestLevel ?? "7";
      const rank = parseInt(level, 10);
      const normalizedLevel = (rank >= 1 && rank <= 7) ? String(rank) : "7";
      const summary = initial[team];

      summary.members.push({
        id: playerId,
        name: getParticipantName(participant),
        gender,
        level: normalizedLevel,
      });
      summary.total += 1;
      const genderGroup = getParticipantGenderGroup(participant);
      if (genderGroup === "MEN") summary.men += 1;
      if (genderGroup === "WOMEN") summary.women += 1;
      (summary.levels as Record<string, number>)[normalizedLevel] += 1;
    }

    for (const team of [initial.A, initial.B]) {
      team.members.sort((left, right) => left.name.localeCompare(right.name, "ko"));
    }

    return initial;
  }, [registeredParticipants, teamAssignments]);

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

  function getParticipantTeam(participant: SessionParticipant) {
    return teamAssignments[getParticipantPlayerId(participant)];
  }

  function updateTeamAssignment(
    playerId: string,
    nextTeam: "A" | "B"
  ) {
    setTeamAssignments((prev) => ({
      ...prev,
      [playerId]: nextTeam,
    }));
    setFixedPairs((prev) =>
      prev.filter(([a, b]) => {
        const leftTeam = a === playerId ? nextTeam : teamAssignments[a];
        const rightTeam = b === playerId ? nextTeam : teamAssignments[b];
        return !leftTeam || !rightTeam || leftTeam === rightTeam;
      })
    );
  }

  function showTransientNotice(message: string) {
    if (swapNoticeTimeoutRef.current) {
      clearTimeout(swapNoticeTimeoutRef.current);
    }
    setSwapNotice(message);
    swapNoticeTimeoutRef.current = setTimeout(() => {
      setSwapNotice("");
      swapNoticeTimeoutRef.current = null;
    }, 3000);
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
    if (generationMode === "TEAM_BATTLE") {
      const firstTeam = teamAssignments[pendingPairPlayerId];
      const secondTeam = teamAssignments[playerId];
      if (firstTeam && secondTeam && firstTeam !== secondTeam) {
        showTransientNotice(
          "팀 대항 자동대진에서는 같은 팀 안에서만 고정 파트너를 설정할 수 있습니다."
        );
        setPendingPairPlayerId(null);
        return;
      }
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

  function assignLevelToGroup(level: string, groupId: string) {
    setFilterGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) return { ...g, levels: g.levels.includes(level) ? g.levels : [...g.levels, level] };
        return { ...g, levels: g.levels.filter((l) => l !== level) };
      })
    );
  }

  function removeLevelFromFilterGroup(groupId: string, level: string) {
    setFilterGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, levels: g.levels.filter((l) => l !== level) } : g))
    );
  }

  async function requestBracketGeneration(relaxedMode = false) {
    const activeLevelMode = generationMode === "STANDARD" ? levelMode : "none";

    const levelGroupsConfig = (() => {
      if (activeLevelMode === "separate") {
        const eligible = separateGroups.filter((g) => g.count >= 4);
        const allocated = allocateCourtsProportionally(eligible, courtCount);
        return eligible.map((g) => ({
          id: g.id, name: g.name, levels: g.levels,
          courtCount: allocated[g.id] ?? 1,
        }));
      }
      if (activeLevelMode === "filter") {
        const eligible = filterGroupsWithCounts.filter((g) => g.levels.length > 0 && g.count >= 4);
        const allocated = allocateCourtsProportionally(eligible, courtCount);
        return eligible.map((g) => ({
          id: g.id, name: g.name, levels: g.levels,
          courtCount: allocated[g.id] ?? 1,
        }));
      }
      return [];
    })();

    const totalCourtCount = courtCount;

    const response = await fetch("/api/sessions/bracket", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: session.id,
        courtCount: totalCourtCount,
        minGamesPerPlayer,
        separateByGender,
        relaxedMode,
        generationMode,
        teamAssignments,
        teamLabels,
        fixedPairs,
        levelMode: activeLevelMode,
        levelGroupsConfig,
      }),
    });

    const data = (await response.json()) as BracketApiResponse & {
      error?: string;
    };

    return { response, data };
  }

  async function handleGenerateBracket() {
    setLoading(true);
    setError("");
    setExportMessage("");
    setExportError("");
    setSwapNotice("");

    try {
      let { response, data } = await requestBracketGeneration(false);

      if (!response.ok) {
        if (shouldOfferRelaxedMode(data.canProceedWithRelaxedMode, data.error)) {
          const confirmed = window.confirm(
            [
              "현재 조건에서는 모든 선수의 경기수, 휴식수, 밸런스를 만족하는 대진표를 만들 수 없습니다.",
              "",
              ...((data.warnings?.length
                ? data.warnings
                : [
                    "일부 선수는 두 경기 연속 휴식할 수 있습니다.",
                    "같은 파트너나 상대를 다시 만날 수 있습니다.",
                    "일부 선수의 경기 수나 밸런스가 완벽하게 맞지 않을 수 있습니다.",
                  ]) ?? []),
              "",
              "그래도 진행하시겠습니까?",
            ].join("\n")
          );

          if (!confirmed) {
            setError(
              "현재 조건에서는 모든 선수의 경기수, 휴식수, 밸런스를 만족하는 대진표를 만들 수 없습니다."
            );
            return;
          }

          ({ response, data } = await requestBracketGeneration(true));
        }

        if (!response.ok) {
          throw new Error(
            data.error ?? "자동 대진표 생성에 실패했습니다."
          );
        }
      }

      setBracketSlots((prev) => ({ ...prev, [slotKey]: data.bracket }));
      markSlotLoaded(slotKey);
      setSwapSelection(null);
      if (data.bracket?.levelGroupData && data.bracket.levelGroupData.length > 0) {
        setActiveGroupId(data.bracket.levelGroupData[0]!.groupId);
      } else {
        setActiveGroupId(null);
      }
      onBracketGenerated?.();
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "자동 대진표 생성에 실패했습니다."
      );
    } finally {
      setLoading(false);
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
      showTransientNotice(message);
      return;
    }

    if (
      bracket.config.generationMode === "TEAM_BATTLE" &&
      swapSelection.team !== team
    ) {
      const message =
        "팀 대항 자동대진에서는 같은 팀 슬롯끼리만 위치를 바꿀 수 있습니다.";
      showTransientNotice(message);
      return;
    }

    if (
      bracket.config.generationMode === "TEAM_BATTLE" &&
      bracket.rounds[swapSelection.roundIndex].matches[swapSelection.matchIndex]
        .division !== bracket.rounds[roundIndex].matches[matchIndex].division
    ) {
      const message =
        "팀 대항 자동대진에서는 같은 복식 구분 안에서만 위치를 바꿀 수 있습니다.";
      showTransientNotice(message);
      return;
    }

    // 같은 라운드 다른 선수 → 스왑
    // merged 모드에서는 match에 _levelGroupId, _origMatchIndex 메타가 있음
    type M = typeof displayRounds[0]["matches"][0] & {
      _levelGroupId?: string;
      _origMatchIndex?: number;
      _origCourtNumber?: number;
    };
    const fromDisplayMatch = displayRounds[swapSelection.roundIndex]?.matches[swapSelection.matchIndex] as M | undefined;
    const toDisplayMatch = displayRounds[roundIndex]?.matches[matchIndex] as M | undefined;

    const fromGroupId = fromDisplayMatch?._levelGroupId ?? null;
    const toGroupId = toDisplayMatch?._levelGroupId ?? null;

    // 급수 구분 모드에서 다른 그룹 간 스왑 방지
    if (bracket.levelGroupData && fromGroupId !== toGroupId) {
      showTransientNotice("급수 구분 대진에서는 같은 급수 그룹 내에서만 선수를 교체할 수 있습니다.");
      setSwapSelection(null);
      return;
    }

    const swapGroupId = fromGroupId ?? activeGroupId;
    const fromOrigMatchIdx = fromDisplayMatch?._origMatchIndex ?? swapSelection.matchIndex;
    const toOrigMatchIdx = toDisplayMatch?._origMatchIndex ?? matchIndex;

    const newBracket = JSON.parse(JSON.stringify(bracket)) as SessionBracket;
    const getMutableRounds = (b: SessionBracket) => {
      if (swapGroupId && b.levelGroupData) {
        return b.levelGroupData.find((g) => g.groupId === swapGroupId)?.rounds ?? b.rounds;
      }
      return b.rounds;
    };
    const mutableRounds = getMutableRounds(newBracket);
    const fromMatch = mutableRounds[swapSelection.roundIndex]?.matches[fromOrigMatchIdx];
    const toMatch = mutableRounds[roundIndex]?.matches[toOrigMatchIdx];
    if (!fromMatch || !toMatch) { setSwapSelection(null); return; }

    const fromTeam = swapSelection.team === "A" ? fromMatch.teamA : fromMatch.teamB;
    const toTeam = team === "A" ? toMatch.teamA : toMatch.teamB;
    const fromPlayer = fromTeam.players[swapSelection.playerIndex];
    const toPlayer = toTeam.players[playerIndex];
    fromTeam.players[swapSelection.playerIndex] = toPlayer;
    toTeam.players[playerIndex] = fromPlayer;
    setBracketSlots((prev) => ({ ...prev, [slotKey]: newBracket }));
    setSwapSelection(null);
    setSwapNotice("");

    const saveRounds = async () => {
      try {
        const res = await fetch("/api/sessions/bracket/rounds", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            generationMode: newBracket.config.generationMode ?? "STANDARD",
            levelMode: newBracket.config.levelMode ?? "none",
            rounds: getMutableRounds(newBracket),
            levelGroupId: swapGroupId ?? undefined,
          }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          const msg = data.error ?? "선수 위치 저장에 실패했습니다. 페이지를 새로고침 해주세요.";
          if (swapNoticeTimeoutRef.current) clearTimeout(swapNoticeTimeoutRef.current);
          setSwapNotice(msg);
        }
      } catch {
        const msg = "선수 위치 저장에 실패했습니다. 페이지를 새로고침 해주세요.";
        if (swapNoticeTimeoutRef.current) clearTimeout(swapNoticeTimeoutRef.current);
        setSwapNotice(msg);
      }
    };
    void saveRounds();

    void notifyAdminActivity({
      event: "SESSION_BRACKET_SWAP",
      sessionTitle: session.title,
      roundNumber: roundIndex + 1,
      fromCourtNumber: fromDisplayMatch?._origCourtNumber ?? fromMatch.courtNumber,
      toCourtNumber: toDisplayMatch?._origCourtNumber ?? toMatch.courtNumber,
      fromPlayerName: fromPlayer.name,
      toPlayerName: toPlayer.name,
    });
  }

  async function handleSaveScore(
    roundNumber: number,
    courtNumber: number,  // merged 뷰에서는 remapped court number — origCourtNumber/levelGroupId로 보정
    scoreA: number | null,
    scoreB: number | null,
    overrideLevelGroupId?: string,
    origCourtNumber?: number
  ) {
    if (!bracket) return;
    const levelGroupId = overrideLevelGroupId ?? activeGroupId ?? undefined;
    const actualCourtNumber = origCourtNumber ?? courtNumber;
    setScoreSaving(true);
    try {
      const res = await fetch("/api/sessions/bracket/score", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          generationMode: bracket.config.generationMode ?? "STANDARD",
          levelMode: bracket.config.levelMode ?? "none",
          roundNumber,
          courtNumber: actualCourtNumber,
          scoreA,
          scoreB,
          levelGroupId,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "점수 저장에 실패했습니다.");
      }
      // 로컬 슬롯 상태에도 바로 반영
      setBracketSlots((prev) => {
        const current = prev[slotKey];
        if (!current) return prev;
        const next = JSON.parse(JSON.stringify(current)) as SessionBracket;
        if (levelGroupId && next.levelGroupData) {
          const group = next.levelGroupData.find((g) => g.groupId === levelGroupId);
          if (group) {
            const round = group.rounds.find((r) => r.roundNumber === roundNumber);
            if (round) {
              const match = round.matches.find((m) => m.courtNumber === actualCourtNumber);
              if (match) { match.scoreA = scoreA; match.scoreB = scoreB; }
            }
          }
        } else {
          const round = next.rounds.find((r) => r.roundNumber === roundNumber);
          if (round) {
            const match = round.matches.find((m) => m.courtNumber === actualCourtNumber);
            if (match) { match.scoreA = scoreA; match.scoreB = scoreB; }
          }
        }
        return { ...prev, [slotKey]: next };
      });
      setScoreEditKey(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "점수 저장에 실패했습니다.");
    } finally {
      setScoreSaving(false);
    }
  }

  function bracketWithCurrentLabels() {
    if (!bracket) return null;
    return {
      ...bracket,
      config: { ...bracket.config, teamLabels },
    };
  }

  async function handleExportWithScores() {
    const b = bracketWithCurrentLabels();
    if (!b) {
      setExportError("내보낼 대진표가 아직 준비되지 않았습니다.");
      return;
    }
    setExportMessage("");
    setExportError("");
    setExportingMode("download");
    try {
      const files = await buildBracketImageFiles(session, b, clubLevels, { includeScores: true });
      await downloadFiles(files);
      setExportMessage(
        files.length > 1
          ? `결과 이미지 ${files.length}장을 저장했습니다.`
          : "결과 이미지를 저장했습니다."
      );
    } catch (exportErr) {
      if (exportErr instanceof DOMException && exportErr.name === "AbortError") {
        setExportingMode(null);
        return;
      }
      setExportError(
        exportErr instanceof Error
          ? exportErr.message
          : "결과 이미지를 처리하지 못했습니다."
      );
    } finally {
      setExportingMode(null);
    }
  }

  async function handleExport() {
    const b = bracketWithCurrentLabels();
    if (!b) {
      setExportError("내보낼 대진표가 아직 준비되지 않았습니다.");
      return;
    }

    setExportMessage("");
    setExportError("");
    setExportingMode("download");

    try {
      const files = await buildBracketImageFiles(session, b, clubLevels);

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

        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500">
              대진 생성 방식
            </span>
            <div className="grid gap-2 md:grid-cols-2">
              {[
                {
                  value: "STANDARD" as const,
                  title: "일반 자동대진",
                  description: "전체 참가자를 기준으로 자동 대진을 생성합니다.",
                },
                {
                  value: "TEAM_BATTLE" as const,
                  title: "팀 대항 자동대진",
                  description: "A팀 vs B팀 구도를 유지한 채 자동 대진을 생성합니다.",
                },
              ].map((option) => {
                const active = generationMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setGenerationMode(option.value);
                      if (option.value !== "STANDARD") {
                        setLevelMode("none");
                        setActiveGroupId(null);
                      }
                    }}
                    disabled={!canGenerate || loading || tutorialDefaultsActive}
                    className={[
                      "rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:bg-slate-50",
                      active
                        ? "border-sky-300 bg-sky-50 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.15)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={[
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition",
                          active
                            ? "border-sky-500 bg-sky-500"
                            : "border-slate-300 bg-white",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "h-1.5 w-1.5 rounded-full transition",
                            active ? "bg-white" : "bg-transparent",
                          ].join(" ")}
                        />
                      </span>
                      <div className="min-w-0">
                        <p
                          className={[
                            "text-sm font-black",
                            active ? "text-sky-700" : "text-slate-900",
                          ].join(" ")}
                        >
                          {option.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        {/* 급수 구분 옵션 (일반 자동대진 전용) */}
        {generationMode === "STANDARD" && (
          <div className="space-y-2">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-500">급수 구분</span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { value: "none" as LevelMode, label: "급수 통합" },
                    { value: "separate" as LevelMode, label: "동일급수별" },
                    { value: "filter" as LevelMode, label: "급수필터별" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setLevelMode(opt.value); setActiveGroupId(null); }}
                    disabled={!canGenerate || loading}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
                      levelMode === opt.value
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 동일급수별: 자동 감지 그룹 + 코트 수 설정 */}
            {levelMode === "separate" && (
              <div className="space-y-1.5 rounded-2xl border border-slate-200 p-3">
                <p className="text-xs font-bold text-slate-700">급수별 그룹 구성</p>
                {separateGroups.length === 0 ? (
                  <p className="text-xs text-slate-400">참가자 급수 정보가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {separateGroups.map((g) => (
                      <div key={g.id} className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{g.name}</span>
                        {separateByGender ? (
                          <>
                            <span className={["text-xs font-bold rounded-full px-2 py-0.5", g.maleCount < 4 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"].join(" ")}>
                              남 {g.maleCount}명{g.maleCount < 4 ? " ⚠ 4명 미만" : ""}
                            </span>
                            <span className={["text-xs font-bold rounded-full px-2 py-0.5", g.femaleCount < 4 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"].join(" ")}>
                              여 {g.femaleCount}명{g.femaleCount < 4 ? " ⚠ 4명 미만" : ""}
                            </span>
                          </>
                        ) : (
                          <span className={["text-xs font-bold", g.count < 4 ? "text-rose-600" : "text-slate-800"].join(" ")}>
                            {g.count}명{g.count < 4 ? " ⚠ 4명 미만" : ""}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 급수필터별: 유저 직접 그룹 배정 */}
            {levelMode === "filter" && (
              <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
                <p className="text-xs font-bold text-slate-700">급수 그룹 배정</p>
                <p className="text-[11px] text-slate-400">각 그룹 안의 회색 급수를 탭하면 해당 그룹에 배정됩니다. 배정된 급수는 탭하면 해제됩니다.</p>
                {/* 그룹 목록 — 각 그룹 안에 배정된 급수 + 미배정 급수를 함께 표시 */}
                {filterGroupsWithCounts.map((g, groupIndex) => (
                  <div key={g.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">그룹 {groupIndex + 1}</span>
                        {g.levels.length > 0 && (separateByGender ? (
                          <>
                            <span className={["text-xs font-bold rounded-full px-2 py-0.5", g.maleCount < 4 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"].join(" ")}>
                              남 {g.maleCount}명{g.maleCount < 4 ? " ⚠ 4명 미만" : ""}
                            </span>
                            <span className={["text-xs font-bold rounded-full px-2 py-0.5", g.femaleCount < 4 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"].join(" ")}>
                              여 {g.femaleCount}명{g.femaleCount < 4 ? " ⚠ 4명 미만" : ""}
                            </span>
                          </>
                        ) : (
                          <span className={["text-xs font-bold", g.count < 4 ? "text-rose-600" : "text-slate-700"].join(" ")}>
                            {g.count}명{g.count < 4 ? " ⚠ 4명 미만" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {/* 이 그룹에 배정된 급수 (탭하면 해제) */}
                      {g.levels.map((level) => {
                        const levelName = clubLevels.find((l) => String(l.rank) === level)?.name ?? `${level}급`;
                        const cnt = participantLevelCounts.find((pl) => pl.level === level)?.count ?? 0;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => removeLevelFromFilterGroup(g.id, level)}
                            className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-rose-100 hover:text-rose-700"
                            title="탭하면 해제"
                          >
                            {levelName} {cnt}명 ×
                          </button>
                        );
                      })}
                      {/* 미배정 급수 (탭하면 이 그룹에 배정) */}
                      {unassignedLevels.map(({ level, count }) => {
                        const levelName = clubLevels.find((l) => String(l.rank) === level)?.name ?? `${level}급`;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => assignLevelToGroup(level, g.id)}
                            className="rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-400 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
                            title="탭하면 이 그룹에 배정"
                          >
                            {levelName} {count}명 +
                          </button>
                        );
                      })}
                      {g.levels.length === 0 && unassignedLevels.length === 0 && (
                        <span className="text-xs text-slate-400">다른 그룹의 급수를 탭해서 이동할 수 있습니다</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* 코트 수 / 경기 수 / 복식 구분 (급수 통합 모드에서만 코트 수 표시) */}
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
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-bold leading-6 text-sky-700">
          {generationMode === "TEAM_BATTLE"
            ? "선수 이름을 클릭하면 같은 라운드 안에서 위치를 바꿀 수 있습니다. 팀 대항 자동대진에서는 같은 팀 안에서만 위치를 바꿀 수 있습니다."
            : "선수 이름을 클릭하면 같은 라운드 안에서 위치를 바꿀 수 있습니다."}
          
        </div>

        {generationMode === "TEAM_BATTLE" ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">
                  A팀 이름
                </span>
                <input
                  value={teamLabels.A}
                  onChange={(event) => {
                    const next = { ...teamLabels, A: event.target.value };
                    setTeamLabels(next);
                    try { localStorage.setItem(`team_labels_${session.id}`, JSON.stringify(next)); } catch {}
                  }}
                  disabled={!canGenerate || loading}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">
                  B팀 이름
                </span>
                <input
                  value={teamLabels.B}
                  onChange={(event) => {
                    const next = { ...teamLabels, B: event.target.value };
                    setTeamLabels(next);
                    try { localStorage.setItem(`team_labels_${session.id}`, JSON.stringify(next)); } catch {}
                  }}
                  disabled={!canGenerate || loading}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </label>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700">팀 배정</p>
              <p className="mt-1 text-xs text-slate-400">
                참가자를 {teamLabels.A || "팀A"} / {teamLabels.B || "팀B"}로 나눠 주세요. 팀 대항 자동대진은 같은 팀끼리 붙지 않고, 팀 간 밸런스를 최대한 맞춰 생성됩니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {registeredParticipants.map((participant) => {
                const playerId = getParticipantPlayerId(participant);
                const team = getParticipantTeam(participant);
                const name = getParticipantName(participant);
                return (
                  <div
                    key={playerId}
                    className="flex w-full min-w-0 items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 sm:w-auto sm:justify-start"
                  >
                    <span className="truncate text-xs font-bold text-slate-700">
                      {name}
                    </span>
                    <div className="flex shrink-0 items-center rounded-full bg-slate-100 p-0.5">
                      <button
                        type="button"
                        onClick={() => updateTeamAssignment(playerId, "A")}
                        disabled={loading}
                        className={[
                          "rounded-full px-2 py-1 text-[10px] font-bold transition sm:px-2.5 sm:text-[11px]",
                          team === "A"
                            ? "bg-rose-500 text-white"
                            : "text-slate-500 hover:bg-white hover:text-slate-700",
                        ].join(" ")}
                      >
                        {teamLabels.A || "팀A"}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTeamAssignment(playerId, "B")}
                        disabled={loading}
                        className={[
                          "rounded-full px-2 py-1 text-[10px] font-bold transition sm:px-2.5 sm:text-[11px]",
                          team === "B"
                            ? "bg-sky-500 text-white"
                            : "text-slate-500 hover:bg-white hover:text-slate-700",
                        ].join(" ")}
                      >
                        {teamLabels.B || "팀B"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {([
                {
                  key: "A" as const,
                  title: teamLabels.A || "팀A",
                  tone: "rose",
                },
                {
                  key: "B" as const,
                  title: teamLabels.B || "팀B",
                  tone: "sky",
                },
              ] as const).map((team) => {
                const summary = teamBattleSummaries[team.key];
                const toneClasses =
                  team.tone === "rose"
                    ? {
                        border: "border-rose-200",
                        bg: "bg-rose-50",
                        badge: "bg-rose-100 text-rose-700",
                        title: "text-rose-700",
                      }
                    : {
                        border: "border-sky-200",
                        bg: "bg-sky-50",
                        badge: "bg-sky-100 text-sky-700",
                        title: "text-sky-700",
                      };

                return (
                  <div
                    key={team.key}
                    className={`rounded-2xl border ${toneClasses.border} ${toneClasses.bg} p-4`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-black ${toneClasses.title}`}>
                        {team.title}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClasses.badge}`}
                      >
                        총 {summary.total}명
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        남자 {summary.men}명
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        여자 {summary.women}명
                      </span>
                      {(["1","2","3","4","5","6","7"] as const).map((rank) => {
                        const count = (summary.levels as Record<string, number>)[rank] ?? 0;
                        if (!count) return null;
                        const name = clubLevels.find((l) => String(l.rank) === rank)?.name ?? rank;
                        return (
                          <span
                            key={rank}
                            className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600"
                          >
                            {name} {count}명
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-3 rounded-2xl bg-white/80 px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                        팀 배정됨
                      </p>
                      {summary.members.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {summary.members.map((member) => (
                            <span
                              key={member.id}
                              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700"
                            >
                              {member.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs font-medium text-slate-400">
                          아직 배정된 참가자가 없습니다.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {canGenerate && registeredParticipants.length >= 2 ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div>
              <p className="text-xs font-bold text-slate-700">고정 파트너 설정</p>
              <p className="mt-1 text-xs text-slate-400">
                {pendingPairPlayerId
                  ? "파트너로 묶을 두 번째 참가자를 클릭하세요."
                  : generationMode === "TEAM_BATTLE"
                    ? "매 라운드 같은 팀으로 묶을 첫 번째 참가자를 클릭하세요. 팀 대항 모드에서는 같은 팀 안에서만 설정할 수 있습니다."
                    : "매 라운드 같은 팀으로 묶을 첫 번째 참가자를 클릭하세요."}
              </p>
            </div>
            {generationMode === "TEAM_BATTLE" ? (
              <div className="grid gap-3 md:grid-cols-2">
                {([
                  {
                    key: "A" as const,
                    title: teamLabels.A || "팀A",
                    tone:
                      "border-rose-200 bg-rose-50/70 text-rose-700" as const,
                  },
                  {
                    key: "B" as const,
                    title: teamLabels.B || "팀B",
                    tone:
                      "border-sky-200 bg-sky-50/70 text-sky-700" as const,
                  },
                ] as const).map((team) => (
                  <div
                    key={team.key}
                    className={`rounded-2xl border ${team.tone} p-3`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-black">{team.title}</p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">
                        {teamGroupedParticipants[team.key].length}명
                      </span>
                    </div>
                    {teamGroupedParticipants[team.key].length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {teamGroupedParticipants[team.key].map((participant) => {
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
                    ) : (
                      <p className="text-xs font-medium text-slate-400">
                        아직 이 팀에 배정된 참가자가 없습니다.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
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
            )}
            {fixedPairs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  고정된 파트너
                </p>
                {generationMode === "TEAM_BATTLE" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {([
                      {
                        key: "A" as const,
                        title: teamLabels.A || "팀A",
                        tone: "border-rose-200 bg-rose-50/70 text-rose-700",
                      },
                      {
                        key: "B" as const,
                        title: teamLabels.B || "팀B",
                        tone: "border-sky-200 bg-sky-50/70 text-sky-700",
                      },
                    ] as const).map((team) => (
                      <div
                        key={team.key}
                        className={`rounded-2xl border ${team.tone} p-3`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="text-sm font-black">{team.title}</p>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">
                            {fixedPairsByTeam[team.key].length}개
                          </span>
                        </div>
                        {fixedPairsByTeam[team.key].length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {fixedPairsByTeam[team.key].map((pair) => (
                              <div
                                key={pair.index}
                                className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 pl-3 pr-1.5 py-1.5"
                              >
                                <span className="text-xs font-bold text-violet-700">
                                  {pair.aName}
                                </span>
                                <span className="text-[10px] font-bold text-violet-400">
                                  &amp;
                                </span>
                                <span className="text-xs font-bold text-violet-700">
                                  {pair.bName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removePair(pair.index)}
                                  disabled={loading}
                                  className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-200 text-[10px] font-black text-violet-600 transition hover:bg-violet-300 disabled:cursor-not-allowed"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-medium text-slate-400">
                            아직 고정된 파트너가 없습니다.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
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
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {levelModeErrors.length > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium leading-6 text-rose-700 space-y-0.5">
            {levelModeErrors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => {
              handleGenerateBracket().catch(() => undefined);
            }}
            disabled={!canGenerate || loading || levelModeErrors.length > 0}
            data-tutorial-id="bracket-generate-button"
            className="flex-1 rounded-2xl bg-slate-900 px-2 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:px-4 sm:text-sm"
          >
            {loading
              ? "생성 중..."
              : bracket
                ? "다시 생성"
                : "대진표 생성"}
          </button>
          <button
            onClick={() => {
              handleExport().catch(() => undefined);
            }}
            disabled={!bracket || loading || exportingMode !== null || levelModeErrors.length > 0}
            data-tutorial-id="bracket-export-button"
            className="flex-1 rounded-2xl border border-amber-300 bg-amber-50 px-2 py-2.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
          >
            {exportingMode === "download" ? "준비 중..." : "대진표 저장"}
          </button>
          {bracket && (
            <button
              onClick={() => {
                handleExportWithScores().catch(() => undefined);
              }}
              disabled={
                loading ||
                exportingMode !== null ||
                levelModeErrors.length > 0 ||
                !(
                  bracket.rounds?.some((r) =>
                    r.matches?.some((m) => m.scoreA != null && m.scoreB != null)
                  ) ||
                  bracket.levelGroupData?.some((g) =>
                    g.rounds?.some((r) =>
                      r.matches?.some((m) => m.scoreA != null && m.scoreB != null)
                    )
                  )
                )
              }
              className="flex-1 rounded-2xl border border-sky-200 bg-sky-50 px-2 py-2.5 text-xs font-bold text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              {exportingMode === "download" ? "준비 중..." : "결과 포함 저장"}
            </button>
          )}
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
                  {displaySummary?.totalRounds ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  총 경기 수
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {displaySummary?.totalMatches ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  생성 조건
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-900">
                  {`${bracket.config.courtCount}코트`}{" "}
                  · 최소 {bracket.config.minGamesPerPlayer}경기
                  <br />
                  {bracket.config.generationMode === "TEAM_BATTLE"
                    ? `${teamLabels.A || "팀A"} vs ${teamLabels.B || "팀B"}`
                    : bracket.config.separateByGender
                      ? "남복/여복 분리"
                      : "랜덤 복식"}
                </p>
              </div>
            </div>

            {(displaySummary?.warnings.length ?? 0) > 0 &&
            !bracket.config.relaxedMode ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-bold text-amber-700">
                  확인 메시지
                </p>
                <ul className="mt-2 space-y-1.5 text-sm leading-6 text-amber-700">
                  {(displaySummary?.warnings ?? []).map((warning) => (
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

            {displayRounds.map((round, roundIndex) => (
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
                    {round.matches.map((match, matchIndex) => {
                      // merged 모드에서 그룹 메타 추출
                      type MM = typeof match & { _levelGroupId?: string; _levelGroupName?: string; _origCourtNumber?: number };
                      const mm = match as MM;
                      const matchGroupId = mm._levelGroupId;
                      const matchGroupName = mm._levelGroupName;
                      const origCourtNum = mm._origCourtNumber;
                      return (
                      <div
                        key={`${round.roundNumber}-${match.courtNumber}`}
                        className={[
                          "rounded-2xl border bg-white px-4 py-3",
                          match.scoreA != null && match.scoreB != null
                            ? "border-slate-300"
                            : "border-slate-200",
                        ].join(" ")}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
                                Court {match.courtNumber}
                              </p>
                              {matchGroupName && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                  {matchGroupName}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {groupLabel(match.division)}
                            </p>
                          </div>
                          {/* 점수 표시 / 입력 버튼 */}
                          {match.scoreA != null && match.scoreB != null ? (
                            <button
                              type="button"
                              onClick={() =>
                                setScoreEditKey(
                                  scoreEditKey === `${round.roundNumber}-${match.courtNumber}`
                                    ? null
                                    : `${round.roundNumber}-${match.courtNumber}`
                                )
                              }
                              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-700 hover:bg-slate-200"
                            >
                              <span className={match.scoreA > match.scoreB ? "text-amber-600" : "text-slate-500"}>
                                {match.scoreA}
                              </span>
                              <span className="text-slate-300 text-xs">:</span>
                              <span className={match.scoreB > match.scoreA ? "text-amber-600" : "text-slate-500"}>
                                {match.scoreB}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setScoreEditKey(
                                  scoreEditKey === `${round.roundNumber}-${match.courtNumber}`
                                    ? null
                                    : `${round.roundNumber}-${match.courtNumber}`
                                )
                              }
                              className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:border-sky-300 hover:text-sky-600"
                            >
                              점수 입력
                            </button>
                          )}
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
                                  {bracket.config.generationMode === "TEAM_BATTLE"
                                    ? team === "A"
                                      ? teamLabels.A || "팀A"
                                      : teamLabels.B || "팀B"
                                    : `팀 ${team}`}
                                  </p>
                                <div className="mt-2 space-y-1">
                                  {teamData.players.map((player, playerIndex) => {
                                    const isSelected =
                                      swapSelection?.roundIndex === roundIndex &&
                                      swapSelection?.matchIndex === matchIndex &&
                                      swapSelection?.team === team &&
                                      swapSelection?.playerIndex === playerIndex;
                                    const selectedMatch = swapSelection
                                      ? displayRounds[swapSelection.roundIndex]?.matches[
                                          swapSelection.matchIndex
                                        ] ?? null
                                      : null;
                                    const isSameDivision =
                                      !selectedMatch ||
                                      selectedMatch.division === match.division;
                                    const isSwappable =
                                      isThisRoundSelected &&
                                      !isSelected &&
                                      (bracket.config.generationMode !==
                                        "TEAM_BATTLE" ||
                                        (swapSelection?.team === team &&
                                          isSameDivision));
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
                                        <span
                                          className={[
                                            "flex items-baseline gap-0.5 whitespace-nowrap text-[12px] font-semibold leading-5 md:block md:text-sm",
                                            isSelected ? "text-white" : "text-slate-900",
                                          ].join(" ")}
                                        >
                                          <span className="whitespace-nowrap">
                                            {stripTrialPrefix(player.name)}
                                          </span>
                                          <span
                                            className={[
                                              "shrink-0 text-[10px] font-medium md:ml-2 md:text-xs",
                                              isSelected ? "text-sky-100" : "text-slate-500",
                                            ].join(" ")}
                                          >
                                            {normalizeGenderLabel(player.gender)} · {clubLevels.find((l) => String(l.rank) === player.level)?.name ?? player.level}
                                          </span>
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          };

                          return (
                            <>
                              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] items-center gap-2 md:gap-3">
                                {renderTeam("A")}
                                <div className="text-center text-xs font-black text-slate-400 md:text-sm">VS</div>
                                {renderTeam("B")}
                              </div>
                              {scoreEditKey === `${round.roundNumber}-${match.courtNumber}` && (
                                <ScoreInputRow
                                  roundNumber={round.roundNumber}
                                  courtNumber={match.courtNumber}
                                  initialA={match.scoreA ?? null}
                                  initialB={match.scoreB ?? null}
                                  saving={scoreSaving}
                                  teamLabelA={bracket.config.generationMode === "TEAM_BATTLE" ? teamLabels.A || "팀A" : "팀A"}
                                  teamLabelB={bracket.config.generationMode === "TEAM_BATTLE" ? teamLabels.B || "팀B" : "팀B"}
                                  onSave={(rn, _cn, sA, sB) =>
                                    handleSaveScore(rn, _cn, sA, sB, matchGroupId, origCourtNum)
                                  }
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>
                    );
                    })}

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
                              {stripTrialPrefix(player.name)}
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
                          {stripTrialPrefix(player.name)}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {player.isGuest ? "게스트" : "회원"} · {normalizeGenderLabel(player.gender)} · {clubLevels.find((l) => String(l.rank) === player.level)?.name ?? player.level}
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
