"use client";

import { useEffect, useRef, useState } from "react";
import type { Court, CourtBoard, CourtPlayer, SessionParticipant } from "@/components/dashboard/types";
import {
  getParticipantDisplayName,
  getParticipantGenderLabel,
  getParticipantLevelLabel,
  getLevelTextClasses,
  normalizeGenderLabel,
} from "@/components/dashboard/utils";

type MatchWinner = "A" | "B" | null;

type CompletedMatch = {
  matchId: number;
  courtId: number;
  teamA: CourtPlayer[];
  teamB: CourtPlayer[];
  winner: MatchWinner;
  completedAt: string;
};

// v3: 라운드 없는 코트별 독립 관리
type BoardData = {
  v: 3;
  courtCount: number;
  courts: Court[];
  history: CompletedMatch[];
};

type CourtBoardModalProps = {
  open: boolean;
  clubName: string;
  session: {
    id: number;
    title: string;
    participants?: SessionParticipant[];
  } | null;
  onClose: () => void;
};

const MAX_COURTS = 8;
const MIN_COURTS = 1;
const MAX_TEAM_SIZE = 2;

function buildEmptyCourt(id: number): Court {
  return { id, teamA: [], teamB: [] };
}

function getAllAssignedIds(courts: Court[]): Set<number> {
  const ids = new Set<number>();
  for (const court of courts) {
    for (const p of court.teamA) ids.add(p.participantId);
    for (const p of court.teamB) ids.add(p.participantId);
  }
  return ids;
}

function makeCourtsFromCount(count: number, existing: Court[]): Court[] {
  return Array.from({ length: count }, (_, i) => {
    const id = i + 1;
    return existing.find((c) => c.id === id) ?? buildEmptyCourt(id);
  });
}

function parseBoardData(raw: unknown, fallback = 2): BoardData {
  if (!raw || (Array.isArray(raw) && raw.length === 0)) {
    return { v: 3, courtCount: fallback, courts: makeCourtsFromCount(fallback, []), history: [] };
  }
  if (Array.isArray(raw)) {
    const courts = raw as Court[];
    const count = courts.length > 0 ? courts.length : fallback;
    return { v: 3, courtCount: count, courts, history: [] };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.v === 2 && Array.isArray(obj.rounds)) {
    type V2Round = { roundNumber: number; courts: Court[]; results: { courtId: number; winner: MatchWinner }[] };
    const rounds = obj.rounds as V2Round[];
    const lastRound = rounds[rounds.length - 1];
    const courts = lastRound?.courts ?? makeCourtsFromCount(fallback, []);
    const history: CompletedMatch[] = [];
    let matchId = 1;
    for (const round of rounds.slice(0, -1)) {
      for (const court of round.courts) {
        if (court.teamA.length > 0 || court.teamB.length > 0) {
          const res = round.results.find((r) => r.courtId === court.id);
          history.push({ matchId: matchId++, courtId: court.id, teamA: court.teamA, teamB: court.teamB, winner: res?.winner ?? null, completedAt: new Date().toISOString() });
        }
      }
    }
    return { v: 3, courtCount: (obj.courtCount as number) || courts.length || fallback, courts, history };
  }
  if (obj.v === 3) {
    return obj as unknown as BoardData;
  }
  return { v: 3, courtCount: fallback, courts: makeCourtsFromCount(fallback, []), history: [] };
}

function computeAgeDecade(participant: SessionParticipant): string {
  if (participant.guestName) {
    if (!participant.guestAge) return "";
    const decade = Math.floor(participant.guestAge / 10) * 10;
    return decade >= 10 ? `${decade}` : "";
  }
  const birth = participant.member?.birth;
  if (!birth) return "";
  const birthYear = new Date(birth).getFullYear();
  const age = new Date().getFullYear() - birthYear;
  const decade = Math.floor(age / 10) * 10;
  return decade >= 10 && decade <= 100 ? `${decade}` : "";
}

function getPlayerTag(participant: SessionParticipant): string {
  const level = getParticipantLevelLabel(participant);
  const decade = computeAgeDecade(participant);
  if (decade && level !== "-") return `${decade}${level}`;
  if (level !== "-") return level;
  return "";
}

// ── 대기 선수 풀 칩 ──────────────────────────────────────────────
function PoolChip({
  participant,
  isSelected,
  onClick,
}: {
  participant: SessionParticipant;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isGuest = Boolean(participant.guestName);
  const name = getParticipantDisplayName(participant);
  const gender = getParticipantGenderLabel(participant);
  const tag = getPlayerTag(participant);
  const levelClass = getLevelTextClasses(getParticipantLevelLabel(participant));

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-left transition active:scale-95 ${
        isSelected
          ? "border-sky-400 bg-sky-500 shadow-md"
          : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50"
      }`}
    >
      <span className={`min-w-0 flex-1 truncate text-base font-black leading-tight ${isSelected ? "text-white" : "text-slate-800"}`}>
        {name}
      </span>
      <span className={`flex shrink-0 items-center gap-1 text-[11px] font-semibold ${isSelected ? "text-sky-100" : "text-slate-500"}`}>
        {isGuest ? (
          <span className={`rounded px-1 text-[10px] font-bold ${isSelected ? "bg-white/20 text-white" : "bg-violet-100 text-violet-600"}`}>
            게스트
          </span>
        ) : (
          <span className={`rounded px-1 text-[10px] font-bold ${isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"}`}>
            회원
          </span>
        )}
        {gender !== "-" && (
          <span className={isSelected ? "" : gender === "남" ? "text-sky-600" : "text-rose-500"}>
            {gender}
          </span>
        )}
        {tag && (
          <span className={isSelected ? "text-sky-100" : levelClass}>{tag}</span>
        )}
      </span>
    </button>
  );
}

// ── 코트 내 선수 칩 ──────────────────────────────────────────────
function CourtPlayerChip({
  player,
  participant,
  team,
  onRemove,
}: {
  player: CourtPlayer;
  participant: SessionParticipant | undefined;
  team: "A" | "B";
  onRemove: () => void;
}) {
  const isGuest = Boolean(participant?.guestName);
  const gender = participant ? getParticipantGenderLabel(participant) : "";
  const tag = participant ? getPlayerTag(participant) : "";
  const levelClass = participant ? getLevelTextClasses(getParticipantLevelLabel(participant)) : "";
  const teamBg = team === "A" ? "bg-sky-50 border-sky-100" : "bg-rose-50 border-rose-100";

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${teamBg}`}>
      <span className="min-w-0 flex-1 truncate text-base font-black text-slate-800">{player.name}</span>
      <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-500">
        {isGuest ? (
          <span className="rounded bg-violet-100 px-1 text-[10px] font-bold text-violet-600">게스트</span>
        ) : (
          <span className="rounded bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700">회원</span>
        )}
        {gender && gender !== "-" && (
          <span className={gender === "남" ? "text-sky-500" : "text-rose-400"}>{gender}</span>
        )}
        {tag && <span className={levelClass}>{tag}</span>}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-rose-500 active:scale-95"
        title="대기실로 이동"
      >
        ✕
      </button>
    </div>
  );
}

function winnerLabel(w: MatchWinner) {
  if (w === "A") return "A팀 승";
  if (w === "B") return "B팀 승";
  return "결과 없음";
}

function winnerBadgeClass(w: MatchWinner) {
  if (w === "A") return "bg-sky-100 text-sky-700";
  if (w === "B") return "bg-rose-100 text-rose-700";
  return "bg-slate-50 text-slate-400";
}

// ── 모바일 전용 컴팩트 풀 칩 ─────────────────────────────────────
function MobilePoolChip({
  participant,
  isSelected,
  onClick,
}: {
  participant: SessionParticipant;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isGuest = Boolean(participant.guestName);
  const name = getParticipantDisplayName(participant);
  const gender = getParticipantGenderLabel(participant);
  const tag = getPlayerTag(participant);

  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex flex-col items-start rounded-xl border-2 px-3 py-2 text-left transition active:scale-95 ${
        isSelected
          ? "border-sky-400 bg-sky-500 shadow-md"
          : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50"
      }`}
    >
      <span className={`text-xs font-black leading-tight ${isSelected ? "text-white" : "text-slate-800"}`}>
        {name}
      </span>
      <span className={`mt-0.5 flex items-center gap-0.5 text-[10px] font-semibold leading-tight ${isSelected ? "text-sky-100" : "text-slate-500"}`}>
        <span className={`rounded px-0.5 text-[9px] font-bold ${isSelected ? "bg-white/20 text-white" : isGuest ? "bg-violet-100 text-violet-600" : "bg-emerald-100 text-emerald-700"}`}>
          {isGuest ? "게" : "회"}
        </span>
        {gender !== "-" && (
          <span className={isSelected ? "text-sky-100" : gender === "남" ? "text-sky-600" : "text-rose-500"}>{gender}</span>
        )}
        {tag && <span className={isSelected ? "text-sky-100" : ""}>{tag}</span>}
      </span>
    </button>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export function CourtBoardModal({ open, clubName, session, onClose }: CourtBoardModalProps) {
  const [boardId, setBoardId] = useState<number | null>(null);
  const [boardData, setBoardData] = useState<BoardData>(() => ({
    v: 3, courtCount: 2, courts: [buildEmptyCourt(1), buildEmptyCourt(2)], history: [],
  }));
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [pendingComplete, setPendingComplete] = useState<number | null>(null);
  const [pendingWinner, setPendingWinner] = useState<MatchWinner>(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // refs for auto-save
  const boardIdRef = useRef<number | null>(null);
  const boardDataRef = useRef(boardData);
  // session이 null이 돼도 마지막 세션 ID 유지
  const lastSessionIdRef = useRef<number | null>(null);
  // 현재 메모리에 로드된 세션 ID — 같은 세션이면 재로드 스킵
  const loadedSessionIdRef = useRef<number | null>(null);
  // 로드에 의한 setBoardData는 dirty 처리 안 함
  const justLoadedRef = useRef(false);
  const isDirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { boardIdRef.current = boardId; }, [boardId]);
  useEffect(() => { boardDataRef.current = boardData; }, [boardData]);
  useEffect(() => { if (session?.id != null) lastSessionIdRef.current = session.id; }, [session]);

  const registeredParticipants: SessionParticipant[] =
    session?.participants?.filter((p) => p.status === "REGISTERED") ?? [];

  // 참가자 id → 객체 맵
  const participantMap = new Map(registeredParticipants.map((p) => [p.id, p]));

  const assignedIds = getAllAssignedIds(boardData.courts);
  const poolParticipants = registeredParticipants.filter((p) => !assignedIds.has(p.id));

  // 열릴 때마다 트래킹 알람 (skip-reload 여부 무관)
  useEffect(() => {
    if (!open || !session) return;
    fetch("/api/court-board/track", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    }).catch(() => undefined);
  }, [open, session?.id]);

  // 로드 — 같은 세션은 재로드 안 함 (닫기→다시열기 시 메모리 데이터 유지)
  useEffect(() => {
    if (!open || !session) return;
    // 동일 세션이면 메모리에 데이터 있음 → 스킵
    if (loadedSessionIdRef.current === session.id) return;

    setLoading(true);
    isDirtyRef.current = false;

    fetch(`/api/court-board?sessionId=${session.id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data: CourtBoard | null) => {
        justLoadedRef.current = true; // 다음 boardData effect를 dirty 처리 안 함
        if (data) {
          setBoardId(data.id);
          boardIdRef.current = data.id;
          setBoardData(parseBoardData(data.courts, 2));
        } else {
          setBoardId(null);
          boardIdRef.current = null;
          setBoardData({ v: 3, courtCount: 2, courts: [buildEmptyCourt(1), buildEmptyCourt(2)], history: [] });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        setLoading(false);
        loadedSessionIdRef.current = session.id;
      });
  }, [open, session?.id]);

  // boardData 변경 시 자동저장 (디바운스 500ms)
  useEffect(() => {
    // 로드에 의한 변경은 dirty 처리 스킵
    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }
    if (loadedSessionIdRef.current === null) return; // 아직 첫 로드 전
    isDirtyRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void doAutoSave();
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardData]);

  async function ensureBoard(): Promise<number> {
    const existing = boardIdRef.current;
    if (existing) return existing;
    const sessionId = lastSessionIdRef.current;
    if (!sessionId) throw new Error("No session");
    const res = await fetch("/api/court-board", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const created = await res.json() as CourtBoard;
    setBoardId(created.id);
    boardIdRef.current = created.id;
    return created.id;
  }

  async function doAutoSave() {
    isDirtyRef.current = false;
    setSaveStatus("saving");
    try {
      const id = await ensureBoard();
      await fetch("/api/court-board", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, courts: boardDataRef.current }),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => s === "saved" ? "idle" : s), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }

  if (!open || !session) return null;

  function handleSelectPool(participantId: number) {
    setSelectedParticipantId((prev) => (prev === participantId ? null : participantId));
  }

  function handleAssignToTeam(courtId: number, team: "A" | "B") {
    if (!selectedParticipantId) return;
    const participant = registeredParticipants.find((p) => p.id === selectedParticipantId);
    if (!participant) return;

    const court = boardData.courts.find((c) => c.id === courtId);
    if (!court) return;
    const teamPlayers = team === "A" ? court.teamA : court.teamB;
    if (teamPlayers.length >= MAX_TEAM_SIZE) return;

    const player: CourtPlayer = {
      participantId: selectedParticipantId,
      name: getParticipantDisplayName(participant),
    };

    setBoardData((prev) => ({
      ...prev,
      courts: prev.courts.map((court) =>
        court.id !== courtId
          ? court
          : team === "A"
            ? { ...court, teamA: [...court.teamA, player] }
            : { ...court, teamB: [...court.teamB, player] }
      ),
    }));
    setSelectedParticipantId(null);
  }

  function handleRemoveFromCourt(courtId: number, team: "A" | "B", participantId: number) {
    setBoardData((prev) => ({
      ...prev,
      courts: prev.courts.map((court) =>
        court.id !== courtId
          ? court
          : team === "A"
            ? { ...court, teamA: court.teamA.filter((p) => p.participantId !== participantId) }
            : { ...court, teamB: court.teamB.filter((p) => p.participantId !== participantId) }
      ),
    }));
  }

  function openCompleteDialog(courtId: number) {
    setPendingComplete(courtId);
    setPendingWinner(null);
  }

  function confirmComplete() {
    if (pendingComplete === null) return;
    const court = boardData.courts.find((c) => c.id === pendingComplete);
    if (!court) return;

    const newMatch: CompletedMatch = {
      matchId: Date.now(),
      courtId: court.id,
      teamA: court.teamA,
      teamB: court.teamB,
      winner: pendingWinner,
      completedAt: new Date().toISOString(),
    };

    setBoardData((prev) => ({
      ...prev,
      courts: prev.courts.map((c) =>
        c.id === pendingComplete ? buildEmptyCourt(c.id) : c
      ),
      history: [newMatch, ...prev.history],
    }));

    setPendingComplete(null);
    setPendingWinner(null);
    setSelectedParticipantId(null);
  }

  // 닫기 - onClose 호출 전에 저장을 시작해 session이 null이 되기 전에 요청을 쏨
  function handleClose() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (isDirtyRef.current) {
      isDirtyRef.current = false;
      void doAutoSave();
    }
    onClose();
  }

  function handleReset() {
    if (!confirm("대진을 초기화하시겠습니까?\n현재 코트 배정과 완료 기록이 모두 사라집니다.")) return;
    setBoardData((prev) => ({
      v: 3,
      courtCount: prev.courtCount,
      courts: makeCourtsFromCount(prev.courtCount, []),
      history: [],
    }));
    setSelectedParticipantId(null);
    setPendingComplete(null);
    setPendingWinner(null);
  }

  function handleChangeCourtCount(delta: number) {
    const next = Math.min(MAX_COURTS, Math.max(MIN_COURTS, boardData.courtCount + delta));
    if (next === boardData.courtCount) return;

    if (next < boardData.courtCount) {
      const removed = boardData.courts.filter((c) => c.id > next);
      const hasPlayers = removed.some((c) => c.teamA.length > 0 || c.teamB.length > 0);
      if (hasPlayers && !confirm(`코트 ${boardData.courtCount}번을 삭제하면 배정된 선수가 대기실로 이동됩니다. 계속할까요?`)) {
        return;
      }
    }

    setBoardData((prev) => ({
      ...prev,
      courtCount: next,
      courts: makeCourtsFromCount(next, prev.courts),
    }));
  }

  const pendingCourt = boardData.courts.find((c) => c.id === pendingComplete);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* 경기 완료 확인 모달 */}
      {pendingComplete !== null && pendingCourt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black text-slate-900">경기 완료 — 코트 {pendingCourt.id}</h3>
            <p className="mt-1 text-sm text-slate-500">경기 결과를 선택하면 선수들이 대기실로 이동합니다.</p>

            <div className="mt-5 space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">결과 선택 (선택 안 해도 됩니다)</p>
              <div className="grid grid-cols-2 gap-2">
                {(["A", "B"] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setPendingWinner((prev) => (prev === w ? null : w))}
                    className={`rounded-2xl py-3.5 text-sm font-bold transition active:scale-95 ${
                      pendingWinner === w
                        ? w === "A" ? "bg-sky-500 text-white shadow" : "bg-rose-500 text-white shadow"
                        : "border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {w === "A" ? "A팀 승" : "B팀 승"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={confirmComplete}
                className="flex-1 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-600 active:scale-95"
              >
                완료 처리
              </button>
              <button
                onClick={() => { setPendingComplete(null); setPendingWinner(null); }}
                className="flex-1 rounded-2xl border-2 border-slate-200 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 border-b border-slate-200 bg-white px-3 py-2 shadow-sm md:px-4 md:py-3">
        <div className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center md:gap-2.5">
          {/* 제목: 모바일은 팀이름 줄바꿈 후 실시간 대진 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-base font-black text-slate-900 md:text-lg">
              {clubName && (
                <>
                  <span className="text-sky-500">[{clubName}]</span>
                  <br className="md:hidden" />
                </>
              )}
              실시간 대진
            </h2>
            {/* PC: 제목 옆에 뱃지/완료 버튼 */}
            <span className="hidden max-w-none truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 md:inline-block">
              {session.title}
            </span>
            {boardData.history.length > 0 && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="hidden shrink-0 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 transition hover:bg-violet-100 md:inline-block"
              >
                완료 {boardData.history.length}경기 {showHistory ? "▲" : "▼"}
              </button>
            )}
          </div>
          {/* 모바일: 세션명(왼쪽) + 완료경기(오른쪽) 한 줄 */}
          <div className="flex items-center justify-between gap-2 md:hidden">
            <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
              {session.title}
            </span>
            {boardData.history.length > 0 && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
              >
                완료 {boardData.history.length}경기 {showHistory ? "▲" : "▼"}
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          {/* 자동저장 상태 */}
          {saveStatus === "saving" && (
            <span className="text-xs text-slate-400">저장 중...</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs font-semibold text-emerald-500">✓ 저장됨</span>
          )}

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 px-2 py-1.5 md:px-2.5 md:py-2">
            <button
              onClick={() => handleChangeCourtCount(-1)}
              disabled={boardData.courtCount <= MIN_COURTS}
              className="h-6 w-6 rounded-lg text-base font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
            <span className="px-1 text-center text-xs font-bold text-slate-700">
              {boardData.courtCount}코트
            </span>
            <button
              onClick={() => handleChangeCourtCount(1)}
              disabled={boardData.courtCount >= MAX_COURTS}
              className="h-6 w-6 rounded-lg text-base font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            onClick={handleReset}
            className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 active:scale-95 md:px-3.5 md:py-2"
          >
            초기화
          </button>

          <button
            onClick={handleClose}
            className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 md:px-3.5 md:py-2"
          >
            닫기
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">불러오는 중...</div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">

          {/* ── 왼쪽: 코트 영역 ── */}
          <div className="flex flex-1 flex-col overflow-hidden">

            {/* 모바일 대기 선수 스트립 (md 미만) */}
            <div className="shrink-0 border-b-2 border-slate-200 bg-slate-50 md:hidden">
              <div className="flex items-center gap-2 px-3 pb-1 pt-2">
                <span className="text-xs font-black text-slate-700">대기 {poolParticipants.length}명</span>
                {selectedParticipantId ? (
                  <span className="text-xs font-semibold text-sky-600">→ 코트 팀A/B를 탭하세요</span>
                ) : (
                  <span className="text-xs text-slate-400">선수 탭 → 코트 팀 탭하여 배정</span>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto px-3 pb-2">
                {poolParticipants.length === 0 ? (
                  <p className="py-1 text-xs text-slate-400">모든 선수가 코트에 배정됐습니다.</p>
                ) : (
                  poolParticipants.map((p) => (
                    <MobilePoolChip
                      key={p.id}
                      participant={p}
                      isSelected={selectedParticipantId === p.id}
                      onClick={() => handleSelectPool(p.id)}
                    />
                  ))
                )}
              </div>
            </div>
            {/* 완료 히스토리 */}
            {showHistory && boardData.history.length > 0 && (
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">완료된 경기 ({boardData.history.length}경기)</p>
                <div className="flex flex-wrap gap-2">
                  {boardData.history.map((match) => (
                    <div key={match.matchId} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                      <span className="font-semibold text-slate-400">코트{match.courtId} </span>
                      <span className="font-bold text-sky-700">{match.teamA.map((p) => p.name).join("·")}</span>
                      <span className="mx-1.5 text-slate-300">vs</span>
                      <span className="font-bold text-rose-600">{match.teamB.map((p) => p.name).join("·")}</span>
                      {match.winner && (
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${winnerBadgeClass(match.winner)}`}>
                          {winnerLabel(match.winner)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 코트 그리드 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {boardData.courts.map((court) => {
                  const hasPlayers = court.teamA.length > 0 || court.teamB.length > 0;
                  const isTargeting = Boolean(selectedParticipantId);

                  return (
                    <div
                      key={court.id}
                      className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm"
                    >
                      {/* 코트 헤더 */}
                      <div className="bg-slate-900 px-4 py-3 text-center">
                        <span className="text-base font-black text-white">코트 {court.id}</span>
                      </div>

                      {/* 팀A */}
                      <div
                        onClick={() => (isTargeting && court.teamA.length < MAX_TEAM_SIZE) ? handleAssignToTeam(court.id, "A") : undefined}
                        className={`px-3 py-3 transition ${(isTargeting && court.teamA.length < MAX_TEAM_SIZE) ? "cursor-pointer hover:bg-sky-50" : ""}`}
                      >
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-500">팀 A</p>
                        <div className="flex flex-col gap-2">
                          {court.teamA.map((player) => (
                            <CourtPlayerChip
                              key={player.participantId}
                              player={player}
                              participant={participantMap.get(player.participantId)}
                              team="A"
                              onRemove={() => handleRemoveFromCourt(court.id, "A", player.participantId)}
                            />
                          ))}
                          {Array.from({ length: MAX_TEAM_SIZE - court.teamA.length }).map((_, i) => (
                            <div key={`a-empty-${i}`} className={`flex h-12 items-center justify-center rounded-xl border-2 border-dashed text-sm font-semibold transition ${
                              isTargeting ? "border-sky-300 text-sky-400" : "border-slate-200 text-slate-300"
                            }`}>
                              {isTargeting ? "탭하여 배정" : "비어있음"}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* VS */}
                      <div className="bg-slate-100 py-1 text-center text-xs font-black tracking-widest text-slate-400">VS</div>

                      {/* 팀B */}
                      <div
                        onClick={() => (isTargeting && court.teamB.length < MAX_TEAM_SIZE) ? handleAssignToTeam(court.id, "B") : undefined}
                        className={`px-3 py-3 transition ${(isTargeting && court.teamB.length < MAX_TEAM_SIZE) ? "cursor-pointer hover:bg-rose-50" : ""}`}
                      >
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-500">팀 B</p>
                        <div className="flex flex-col gap-2">
                          {court.teamB.map((player) => (
                            <CourtPlayerChip
                              key={player.participantId}
                              player={player}
                              participant={participantMap.get(player.participantId)}
                              team="B"
                              onRemove={() => handleRemoveFromCourt(court.id, "B", player.participantId)}
                            />
                          ))}
                          {Array.from({ length: MAX_TEAM_SIZE - court.teamB.length }).map((_, i) => (
                            <div key={`b-empty-${i}`} className={`flex h-12 items-center justify-center rounded-xl border-2 border-dashed text-sm font-semibold transition ${
                              isTargeting ? "border-rose-300 text-rose-400" : "border-slate-200 text-slate-300"
                            }`}>
                              {isTargeting ? "탭하여 배정" : "비어있음"}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 경기 완료 버튼 */}
                      {hasPlayers && (
                        <div className="border-t-2 border-slate-100 p-3">
                          <button
                            onClick={() => openCompleteDialog(court.id)}
                            className="w-full rounded-2xl bg-emerald-500 py-3 text-sm font-black text-white transition hover:bg-emerald-600 active:scale-95 active:bg-emerald-700"
                          >
                            경기 완료
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 하단 안내 (md 이상에서만 표시) */}
            <div className="hidden border-t border-slate-100 bg-slate-50 px-4 py-2 text-center text-xs text-slate-400 md:block">
              오른쪽 대기 선수 탭 → 코트 팀A/팀B 탭 = 배정 &nbsp;·&nbsp; ✕ = 대기 복귀 &nbsp;·&nbsp; 경기 완료 = 복귀 + 기록
            </div>
          </div>

          {/* ── 오른쪽: 대기 선수 패널 (md 이상에서만 표시) ── */}
          <div className="hidden w-64 shrink-0 flex-col border-l-2 border-slate-200 bg-slate-50 md:flex">
            {/* 패널 헤더 */}
            <div className="border-b border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-black text-slate-700">
                대기 선수
                <span className="ml-1.5 text-slate-400">({poolParticipants.length}명)</span>
              </p>
              {selectedParticipantId ? (
                <p className="mt-1 text-xs font-semibold text-sky-600">→ 코트의 팀A 또는 팀B를 탭하세요</p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">선수를 탭해서 선택하세요</p>
              )}
            </div>

            {/* 선수 목록 */}
            <div className="flex-1 overflow-y-auto p-3">
              {poolParticipants.length === 0 ? (
                <div className="mt-8 text-center text-sm text-slate-400">
                  모든 선수가<br />코트에 배정됐습니다.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {poolParticipants.map((p) => (
                    <PoolChip
                      key={p.id}
                      participant={p}
                      isSelected={selectedParticipantId === p.id}
                      onClick={() => handleSelectPool(p.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
