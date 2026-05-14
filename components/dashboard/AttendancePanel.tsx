"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { SessionBracketPanel } from "@/components/dashboard/SessionBracketPanel";
import type { ClubSession } from "@/components/dashboard/types";
import {
  formatDate,
  getLevelTextClasses,
  getParticipantDisplayName,
  getParticipantGenderLabel,
  getParticipantLevelLabel,
  getParticipantRemarkText,
  getSortedLevels,
  isGuestParticipant,
} from "@/components/dashboard/utils";

type AttendancePanelProps = {
  sessions: ClubSession[];
  selectedSessionId: number | null;
  loadingSelectedSession: boolean;
  onSelectSession: (id: number) => void;
  tutorialDefaultsActive?: boolean;
  onBracketGenerated?: () => void;
  onOpenCourtBoard?: (sessionId: number) => void;
};

type ParticipantSortOption = "name" | "gender" | "level" | "recent";

type ParticipantFilterState = {
  searchQuery: string;
  typeFilter: string;
  genderFilter: string;
  levelFilter: string;
  sortOption: ParticipantSortOption;
};

type SessionSelectOption = {
  id: number;
  title: string;
  date: string | Date;
  startTime: string;
};

const initialFilters: ParticipantFilterState = {
  searchQuery: "",
  typeFilter: "ALL",
  genderFilter: "ALL",
  levelFilter: "ALL",
  sortOption: "name",
};
const ATTENDANCE_PAGE_SIZE = 15;

function getGenderBadgeClass(gender: string) {
  if (gender === "남") return "bg-sky-50 text-sky-700";
  if (gender === "여") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-500";
}

function getLevelBadgeClass(level: string) {
  return `bg-slate-100 ${getLevelTextClasses(level)}`;
}

function filterAndSortParticipants(
  participants: ReturnType<typeof getRegisteredParticipants>,
  filters: ParticipantFilterState
) {
  const query = filters.searchQuery.trim().toLowerCase();

  return participants
    .filter((participant) => {
      const name = getParticipantDisplayName(participant);
      const remark = getParticipantRemarkText(participant);
      const gender = getParticipantGenderLabel(participant);
      const level = getParticipantLevelLabel(participant);

      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        remark.toLowerCase().includes(query) ||
        gender.toLowerCase().includes(query) ||
        level.toLowerCase().includes(query);

      const participantType = isGuestParticipant(participant) ? "GUEST" : "MEMBER";
      const matchesType =
        filters.typeFilter === "ALL" || participantType === filters.typeFilter;
      const matchesGender =
        filters.genderFilter === "ALL" || gender === filters.genderFilter;
      const matchesLevel =
        filters.levelFilter === "ALL" || level === filters.levelFilter;

      return matchesSearch && matchesType && matchesGender && matchesLevel;
    })
    .sort((left, right) => {
      if (filters.sortOption === "gender") {
        const genderOrder = { 남: 0, 여: 1, "-": 2 } as const;
        const leftRank =
          genderOrder[getParticipantGenderLabel(left) as keyof typeof genderOrder] ?? 9;
        const rightRank =
          genderOrder[getParticipantGenderLabel(right) as keyof typeof genderOrder] ?? 9;
        if (leftRank !== rightRank) return leftRank - rightRank;
      }

      if (filters.sortOption === "level") {
        const levelOrder = ["S", "A", "B", "C", "D", "E", "초심"];
        const leftRank = levelOrder.indexOf(getParticipantLevelLabel(left));
        const rightRank = levelOrder.indexOf(getParticipantLevelLabel(right));
        if (leftRank !== rightRank) {
          return (leftRank === -1 ? 99 : leftRank) - (rightRank === -1 ? 99 : rightRank);
        }
      }

      if (filters.sortOption === "recent") {
        return (
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );
      }

      return getParticipantDisplayName(left).localeCompare(
        getParticipantDisplayName(right),
        "ko"
      );
    });
}

function getRegisteredParticipants(session: ClubSession) {
  return (session.participants ?? []).filter((p) => p.status === "REGISTERED");
}

const AttendanceSessionPicker = memo(
  function AttendanceSessionPicker({
    options,
    selectedSessionId,
    onSelectSession,
  }: {
    options: SessionSelectOption[];
    selectedSessionId: number | null;
    onSelectSession: (id: number) => void;
  }) {
    return (
      <label className="block space-y-1.5">
        <span className="text-xs font-bold tracking-[0.18em] text-slate-400">
          TODAY SESSION
        </span>
        <select
          value={selectedSessionId ?? ""}
          onChange={(event) => onSelectSession(Number(event.target.value))}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold outline-none transition focus:border-sky-400 sm:px-4 sm:text-sm"
        >
          <option value="" disabled>
            대진표를 생성할 운동 일정을 선택해 주세요
          </option>
          {options.map((session) => (
            <option key={session.id} value={session.id}>
              {session.title} / {formatDate(session.date)} / {session.startTime}
            </option>
          ))}
        </select>
      </label>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.selectedSessionId !== nextProps.selectedSessionId) {
      return false;
    }

    if (prevProps.options.length !== nextProps.options.length) {
      return false;
    }

    return prevProps.options.every((option, index) => {
      const nextOption = nextProps.options[index];
      return (
        option.id === nextOption.id &&
        option.title === nextOption.title &&
        String(option.date) === String(nextOption.date) &&
        option.startTime === nextOption.startTime
      );
    });
  }
);

export function AttendancePanel({
  sessions,
  selectedSessionId,
  loadingSelectedSession,
  onSelectSession,
  tutorialDefaultsActive = false,
  onBracketGenerated,
  onOpenCourtBoard,
}: AttendancePanelProps) {
  const hasSelectedSession = sessions.some(
    (session) => session.id === selectedSessionId
  );

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ??
    sessions[0] ??
    null;

  const [filters, setFilters] = useState<ParticipantFilterState>(initialFilters);
  const [page, setPage] = useState(1);

  const sessionPickerOptions = useMemo(
    () =>
      sessions.map((session) => ({
        id: session.id,
        title: session.title,
        date: session.date,
        startTime: session.startTime,
      })),
    [
      sessions
        .map(
          (session) =>
            `${session.id}|${session.title}|${String(session.date)}|${session.startTime}`
        )
        .join("||"),
    ]
  );

  useEffect(() => {
    if (!hasSelectedSession && sessions[0]) {
      onSelectSession(sessions[0].id);
    }
  }, [hasSelectedSession, onSelectSession, sessions]);

  useEffect(() => {
    setFilters(initialFilters);
  }, [selectedSession?.id]);

  const registeredParticipants = useMemo(
    () => (selectedSession ? getRegisteredParticipants(selectedSession) : []),
    [selectedSession]
  );

  const filteredParticipants = useMemo(
    () => filterAndSortParticipants(registeredParticipants, filters),
    [registeredParticipants, filters]
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredParticipants.length / ATTENDANCE_PAGE_SIZE)
  );
  const paginatedParticipants = useMemo(() => {
    const startIndex = (page - 1) * ATTENDANCE_PAGE_SIZE;

    return filteredParticipants.slice(
      startIndex,
      startIndex + ATTENDANCE_PAGE_SIZE
    );
  }, [filteredParticipants, page]);

  useEffect(() => {
    setPage(1);
  }, [
    selectedSession?.id,
    filters.searchQuery,
    filters.typeFilter,
    filters.genderFilter,
    filters.levelFilter,
    filters.sortOption,
    registeredParticipants.length,
  ]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const summary = useMemo(() => {
    const levelCounts = new Map<string, number>();
    let maleCount = 0;
    let femaleCount = 0;

    for (const p of registeredParticipants) {
      const gender = getParticipantGenderLabel(p);
      const level = getParticipantLevelLabel(p);
      if (gender === "남") maleCount += 1;
      else if (gender === "여") femaleCount += 1;
      if (level && level !== "-") {
        levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
      }
    }

    return {
      totalCount: registeredParticipants.length,
      maleCount,
      femaleCount,
      levels: getSortedLevels([...levelCounts.keys()]).map((level) => ({
        level,
        count: levelCounts.get(level) ?? 0,
      })),
    };
  }, [registeredParticipants]);

  const sortedLevels = useMemo(
    () => getSortedLevels(summary.levels.map((item) => item.level)),
    [summary.levels]
  );

  const filteredMemberCount = filteredParticipants.filter(
    (p) => !isGuestParticipant(p)
  ).length;
  const filteredGuestCount = filteredParticipants.filter(
    (p) => isGuestParticipant(p)
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">자동 대진표</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                최종 참석 명단을 확인하고 자동 대진표를 생성합니다.
              </p>
            </div>

            {selectedSession ? (
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-black text-slate-900">
                    {selectedSession.title}
                  </p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    {selectedSession.status === "CLOSED" ? "마감 일정" : "모집중 일정"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500 md:text-sm">
                  <span>운동날짜 · {formatDate(selectedSession.date)}</span>
                  <span>
                    운동시간 · {selectedSession.startTime} – {selectedSession.endTime}
                  </span>
                  {selectedSession.location ? (
                    <span>운동장소 · {selectedSession.location}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="w-full xl:max-w-[320px]">
            <AttendanceSessionPicker
              options={sessionPickerOptions}
              selectedSessionId={selectedSession?.id ?? null}
              onSelectSession={onSelectSession}
            />
            {false ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold tracking-[0.18em] text-slate-400">
                TODAY SESSION
              </span>
              <select
                value={selectedSession?.id ?? ""}
                onChange={(event) => onSelectSession(Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400"
              >
                <option value="" disabled>
                  대진표를 생성할 운동 일정을 선택해 주세요
                </option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title} / {formatDate(session.date)} / {session.startTime}
                  </option>
                ))}
              </select>
            </label>
            ) : null}
          </div>
        </div>
      </section>

      {loadingSelectedSession ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
          참석 명단을 불러오는 중입니다.
        </div>
      ) : selectedSession ? (
        <section
          className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"
          data-tutorial-id="attendance-participant-summary"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 md:px-4 md:py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-black text-slate-900">최종 참석 명단</h4>
                <p className="mt-1 text-sm text-slate-500">
                  운동 일정을 마감한 최종 참석자 명단입니다.
                </p>
              </div>
              <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 md:px-3 md:text-xs">
                회원 {filteredMemberCount}명 / 게스트 {filteredGuestCount}명
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 md:mt-4">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 md:px-4 md:text-sm">
                전체 {summary.totalCount}명
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 md:px-4 md:text-sm">
                남자 {summary.maleCount}명
              </span>
              <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 md:px-4 md:text-sm">
                여자 {summary.femaleCount}명
              </span>
              {summary.levels.map((item) => (
                <span
                  key={item.level}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold md:px-4 md:text-sm ${getLevelBadgeClass(item.level)}`}
                >
                  {item.level} {item.count}명
                </span>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
              <input
                value={filters.searchQuery}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    searchQuery: event.target.value,
                  }))
                }
                placeholder="이름, 비고 검색"
                className="col-span-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-sky-400 md:col-span-1 md:px-4 md:py-3 md:text-sm"
              />

              <select
                value={filters.typeFilter}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, typeFilter: event.target.value }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-sky-400 md:px-4 md:py-3 md:text-sm"
              >
                <option value="ALL">전체 구분</option>
                <option value="MEMBER">회원만</option>
                <option value="GUEST">게스트만</option>
              </select>

              <select
                value={filters.genderFilter}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, genderFilter: event.target.value }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-sky-400 md:px-4 md:py-3 md:text-sm"
              >
                <option value="ALL">전체 성별</option>
                <option value="남">남자만</option>
                <option value="여">여자만</option>
              </select>

              <select
                value={filters.levelFilter}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, levelFilter: event.target.value }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-sky-400 md:px-4 md:py-3 md:text-sm"
              >
                <option value="ALL">전체 급수</option>
                {sortedLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>

              <select
                value={filters.sortOption}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    sortOption: event.target.value as ParticipantSortOption,
                  }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-sky-400 md:px-4 md:py-3 md:text-sm"
              >
                <option value="name">이름순</option>
                <option value="gender">성별순</option>
                <option value="level">급수순</option>
                <option value="recent">최근 신청순</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden">
            <table className="w-full table-fixed text-[10px] sm:text-[11px] md:text-sm">
              <thead className="bg-white text-left text-slate-500">
                <tr>
                  <th className="w-[22%] px-2 py-3 font-semibold md:px-4 md:py-4">이름</th>
                  <th className="w-[15%] px-1 py-3 text-center font-semibold md:px-4 md:py-4">구분</th>
                  <th className="w-[11%] px-1.5 py-3 text-center font-semibold md:px-4 md:py-4">성별</th>
                  <th className="w-[11%] px-1.5 py-3 text-center font-semibold md:px-4 md:py-4">급수</th>
                  <th className="px-2 py-3 font-semibold md:px-4 md:py-4">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedParticipants.map((participant) => {
                  const gender = getParticipantGenderLabel(participant);
                  const level = getParticipantLevelLabel(participant);
                  return (
                    <tr key={participant.id} className="hover:bg-slate-50">
                      <td className="px-2 py-3 font-bold leading-4 text-slate-900 md:px-4 md:py-4 md:leading-5">
                        <span className="break-keep">
                          {getParticipantDisplayName(participant)}
                        </span>
                      </td>
                      <td className="px-1 py-3 text-center md:px-4 md:py-4">
                        <span
                          className={`inline-flex min-w-[2.9rem] items-center justify-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold md:min-w-0 md:px-2.5 md:py-1 md:text-xs ${
                            isGuestParticipant(participant)
                              ? "bg-amber-50 text-amber-700"
                              : "bg-sky-50 text-sky-700"
                          }`}
                        >
                          {isGuestParticipant(participant) ? "게스트" : "회원"}
                        </span>
                      </td>
                      <td className="px-1.5 py-3 text-center md:px-4 md:py-4">
                        <span
                          className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold md:px-2.5 md:py-1 md:text-xs ${getGenderBadgeClass(gender)}`}
                        >
                          {gender}
                        </span>
                      </td>
                      <td className="px-1.5 py-3 text-center md:px-4 md:py-4">
                        <span
                          className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold md:px-2.5 md:py-1 md:text-xs ${getLevelBadgeClass(level)}`}
                        >
                          {level}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-[10px] leading-4 text-slate-500 md:px-4 md:py-4 md:text-sm md:leading-5">
                        <span className="block whitespace-pre-line break-keep">
                          {getParticipantRemarkText(participant)}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-10 text-center text-xs text-slate-400 md:px-4 md:py-12 md:text-sm"
                    >
                      {registeredParticipants.length === 0
                        ? "최종 참석 확정 인원이 없습니다."
                        : "조건에 맞는 참석자가 없습니다."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-4 py-4">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          </div>
        </section>
      ) : null}

      {selectedSession ? (
        <SessionBracketPanel
          session={selectedSession}
          tutorialDefaultsActive={tutorialDefaultsActive}
          onBracketGenerated={onBracketGenerated}
          onOpenCourtBoard={onOpenCourtBoard}
        />
      ) : null}
    </div>
  );
}
