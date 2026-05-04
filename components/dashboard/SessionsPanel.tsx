"use client";

import { useEffect, useMemo, useState } from "react";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import type {
  ClubSession,
  SessionParticipant,
} from "@/components/dashboard/types";
import { AdminRegisterModal } from "@/components/dashboard/AdminRegisterModal";
import {
  formatDate,
  getCanceledParticipants,
  getLevelTextClasses,
  getParticipantDisplayName,
  getParticipantGenderLabel,
  getParticipantLevelLabel,
  getParticipantRemarkText,
  getRegisteredParticipants,
  getSortedLevels,
  getWaitlistedParticipants,
  isGuestParticipant,
} from "@/components/dashboard/utils";

type SessionFormPayload = {
  title: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: string;
};

type SessionsPanelProps = {
  sessions: ClubSession[];
  selectedSessionId: number | null;
  publicSessionBaseUrl: string;
  loadingSelectedSession: boolean;
  onSelectSession: (id: number) => void;
  onCreateSession: (payload: SessionFormPayload) => Promise<void>;
  onUpdateSession: (
    sessionId: number,
    payload: SessionFormPayload
  ) => Promise<void>;
  onDeleteSession: (sessionId: number) => Promise<void>;
  onUpdateSessionStatus: (
    sessionId: number,
    status: ClubSession["status"]
  ) => Promise<void>;
  onCancelParticipant: (participantId: number) => Promise<void>;
  onRefreshSession: (sessionId: number) => Promise<void>;
};

type ParticipantSummary = {
  totalCount: number;
  maleCount: number;
  femaleCount: number;
  levels: Array<{
    level: string;
    count: number;
  }>;
};

type ParticipantSortOption = "name" | "gender" | "level" | "recent";

type ParticipantFilterState = {
  searchQuery: string;
  typeFilter: string;
  genderFilter: string;
  levelFilter: string;
  sortOption: ParticipantSortOption;
};

type ParticipantSectionProps = {
  title: string;
  description: string;
  participants: SessionParticipant[];
  filteredParticipants: SessionParticipant[];
  summary: ParticipantSummary;
  levels: string[];
  filters: ParticipantFilterState;
  setFilters: React.Dispatch<
    React.SetStateAction<ParticipantFilterState>
  >;
  emptyMessage: string;
  onCancelClick?: (participant: SessionParticipant) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const SESSION_LIST_PAGE_SIZE = 5;
const PARTICIPANT_LIST_PAGE_SIZE = 15;

const SESSION_STATUS_LABEL: Record<ClubSession["status"], string> = {
  OPEN: "모집 중",
  CLOSED: "마감",
  CANCELED: "취소",
};

const initialForm: SessionFormPayload = {
  title: "",
  description: "",
  location: "",
  date: "",
  startTime: "19:00",
  endTime: "21:00",
  capacity: "",
};

const initialParticipantFilters: ParticipantFilterState = {
  searchQuery: "",
  typeFilter: "ALL",
  genderFilter: "ALL",
  levelFilter: "ALL",
  sortOption: "name",
};

function getTodayDateInputValue() {
  const now = new Date();
  const offsetDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60 * 1000
  );

  return offsetDate.toISOString().split("T")[0];
}

function statusButtonClass(status: ClubSession["status"]) {
  if (status === "OPEN") {
    return "bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
  }

  if (status === "CLOSED") {
    return "bg-amber-50 text-amber-700 hover:bg-amber-100";
  }

  return "bg-rose-50 text-rose-700 hover:bg-rose-100";
}

function toSessionForm(session: ClubSession): SessionFormPayload {
  return {
    title: session.title ?? "",
    description: session.description ?? "",
    location: session.location ?? "",
    date: new Date(session.date).toISOString().split("T")[0],
    startTime: session.startTime ?? "19:00",
    endTime: session.endTime ?? "21:00",
    capacity:
      session.capacity === null || session.capacity === undefined
        ? ""
        : String(session.capacity),
  };
}

function getParticipantSummary(
  participants: SessionParticipant[]
): ParticipantSummary {
  const levelCounts = new Map<string, number>();
  let maleCount = 0;
  let femaleCount = 0;

  for (const participant of participants) {
    const gender = getParticipantGenderLabel(participant);
    const level = getParticipantLevelLabel(participant);

    if (gender === "남") {
      maleCount += 1;
    } else if (gender === "여") {
      femaleCount += 1;
    }

    if (level && level !== "-") {
      levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
    }
  }

  return {
    totalCount: participants.length,
    maleCount,
    femaleCount,
    levels: getSortedLevels([...levelCounts.keys()]).map(
      (level) => ({
        level,
        count: levelCounts.get(level) ?? 0,
      })
    ),
  };
}

function getGenderBadgeClass(gender: string) {
  if (gender === "남") {
    return "bg-sky-50 text-sky-700";
  }

  if (gender === "여") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-slate-500";
}

function getLevelBadgeClass(level: string) {
  return `bg-slate-100 ${getLevelTextClasses(level)}`;
}

function filterParticipants(
  participants: SessionParticipant[],
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
      const participantType = isGuestParticipant(participant)
        ? "GUEST"
        : "MEMBER";
      const matchesType =
        filters.typeFilter === "ALL" ||
        participantType === filters.typeFilter;

      const matchesGender =
        filters.genderFilter === "ALL" ||
        gender === filters.genderFilter;
      const matchesLevel =
        filters.levelFilter === "ALL" ||
        level === filters.levelFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesGender &&
        matchesLevel
      );
    })
    .sort((left, right) => {
      if (filters.sortOption === "gender") {
        const genderOrder = {
          남: 0,
          여: 1,
          "-": 2,
        } as const;

        const leftRank =
          genderOrder[
            getParticipantGenderLabel(left) as keyof typeof genderOrder
          ] ?? 9;
        const rightRank =
          genderOrder[
            getParticipantGenderLabel(right) as keyof typeof genderOrder
          ] ?? 9;

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }
      }

      if (filters.sortOption === "level") {
        const sortedLevels = [
          "S",
          "A",
          "B",
          "C",
          "D",
          "E",
          "초심",
        ];
        const leftRank = sortedLevels.indexOf(
          getParticipantLevelLabel(left)
        );
        const rightRank = sortedLevels.indexOf(
          getParticipantLevelLabel(right)
        );

        if (leftRank !== rightRank) {
          return (
            (leftRank === -1 ? 99 : leftRank) -
            (rightRank === -1 ? 99 : rightRank)
          );
        }
      }

      if (filters.sortOption === "recent") {
        return (
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
        );
      }

      return getParticipantDisplayName(left).localeCompare(
        getParticipantDisplayName(right),
        "ko"
      );
    });
}

function renderParticipantSummaryChips(
  summary: ParticipantSummary
) {
  return (
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
          className={`rounded-full px-3 py-1.5 text-xs font-bold md:px-4 md:text-sm ${getLevelBadgeClass(
            item.level
          )}`}
        >
          {item.level} {item.count}명
        </span>
      ))}
    </div>
  );
}

function ParticipantSection({
  title,
  description,
  participants,
  filteredParticipants,
  summary,
  levels,
  filters,
  setFilters,
  emptyMessage,
  onCancelClick,
  page,
  totalPages,
  onPageChange,
}: ParticipantSectionProps) {
  const filteredMemberCount = filteredParticipants.filter(
    (participant) => !isGuestParticipant(participant)
  ).length;
  const filteredGuestCount = filteredParticipants.filter(
    (participant) => isGuestParticipant(participant)
  ).length;
  const paginatedParticipants = useMemo(() => {
    const startIndex = (page - 1) * PARTICIPANT_LIST_PAGE_SIZE;

    return filteredParticipants.slice(
      startIndex,
      startIndex + PARTICIPANT_LIST_PAGE_SIZE
    );
  }, [filteredParticipants, page]);

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 md:px-4 md:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-black text-slate-900">
              {title}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          </div>
          <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 md:px-3 md:text-xs">
            회원 {filteredMemberCount}명 / 게스트 {filteredGuestCount}
            명
          </div>
        </div>

        {renderParticipantSummaryChips(summary)}

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
              setFilters((current) => ({
                ...current,
                typeFilter: event.target.value,
              }))
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
              setFilters((current) => ({
                ...current,
                genderFilter: event.target.value,
              }))
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
              setFilters((current) => ({
                ...current,
                levelFilter: event.target.value,
              }))
            }
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-sky-400 md:px-4 md:py-3 md:text-sm"
          >
            <option value="ALL">전체 급수</option>
            {levels.map((level) => (
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
                sortOption: event.target
                  .value as ParticipantSortOption,
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
              <th className={`px-2 py-3 font-semibold md:px-4 md:py-4 ${onCancelClick ? "w-[18%]" : "w-[22%]"}`}>
                이름
              </th>
              <th className="w-[15%] px-1 py-3 text-center font-semibold md:px-4 md:py-4">
                구분
              </th>
              <th className="w-[11%] px-1.5 py-3 text-center font-semibold md:px-4 md:py-4">
                성별
              </th>
              <th className="w-[11%] px-1.5 py-3 text-center font-semibold md:px-4 md:py-4">
                급수
              </th>
              <th className={`px-2 py-3 font-semibold md:px-4 md:py-4 ${onCancelClick ? "w-[28%]" : "w-[41%]"}`}>
                비고
              </th>
              {onCancelClick ? (
                <th className="w-[17%] px-2 py-3 text-center font-semibold md:px-4 md:py-4">
                  관리
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedParticipants.map((participant) => {
              const gender = getParticipantGenderLabel(participant);
              const level = getParticipantLevelLabel(participant);

              return (
                <tr
                  key={participant.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-2 py-3 font-bold leading-4 text-slate-900 md:px-4 md:py-4 md:leading-5">
                    <span className="break-keep">
                      {getParticipantDisplayName(participant)}
                    </span>
                  </td>
                  <td className="px-1 py-3 text-center md:px-4 md:py-4">
                    <span
                      className={`inline-flex min-w-[2.9rem] items-center justify-center whitespace-nowrap break-keep rounded-full px-1.5 py-0.5 text-[10px] font-bold md:min-w-0 md:px-2.5 md:py-1 md:text-xs ${
                        isGuestParticipant(participant)
                          ? "bg-amber-50 text-amber-700"
                          : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {isGuestParticipant(participant)
                        ? "게스트"
                        : "회원"}
                    </span>
                  </td>
                  <td className="px-1.5 py-3 text-center md:px-4 md:py-4">
                    <span
                      className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold md:px-2.5 md:py-1 md:text-xs ${getGenderBadgeClass(
                        gender
                      )}`}
                    >
                      {gender}
                    </span>
                  </td>
                  <td className="px-1.5 py-3 text-center md:px-4 md:py-4">
                    <span
                      className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold md:px-2.5 md:py-1 md:text-xs ${getLevelBadgeClass(
                        level
                      )}`}
                    >
                      {level}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-[10px] leading-4 text-slate-500 md:px-4 md:py-4 md:text-sm md:leading-5">
                    <span className="block whitespace-pre-line break-keep">
                      {getParticipantRemarkText(participant)}
                    </span>
                  </td>
                  {onCancelClick ? (
                    <td className="px-2 py-3 text-center md:px-4 md:py-4">
                      <button
                        onClick={() => onCancelClick(participant)}
                        className="rounded-xl border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50 md:px-3 md:py-1.5 md:text-xs"
                      >
                        참가 취소
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}

            {filteredParticipants.length === 0 ? (
              <tr>
                <td
                  colSpan={onCancelClick ? 6 : 5}
                  className="px-3 py-10 text-center text-xs text-slate-400 md:px-4 md:py-12 md:text-sm"
                >
                  {participants.length === 0
                    ? emptyMessage
                    : "조건에 맞는 신청자가 없습니다."}
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
          onChange={onPageChange}
        />
      </div>
    </section>
  );
}

export function SessionsPanel({
  sessions,
  selectedSessionId,
  publicSessionBaseUrl,
  loadingSelectedSession,
  onSelectSession,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  onUpdateSessionStatus,
  onCancelParticipant,
  onRefreshSession,
}: SessionsPanelProps) {
  const [adminRegisterOpen, setAdminRegisterOpen] = useState(false);
  const [form, setForm] = useState({
    ...initialForm,
    date: getTodayDateInputValue(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(
    null
  );
  const [registeredFilters, setRegisteredFilters] = useState(
    initialParticipantFilters
  );
  const [waitlistedFilters, setWaitlistedFilters] = useState(
    initialParticipantFilters
  );
  const [canceledFilters, setCanceledFilters] = useState(
    initialParticipantFilters
  );
  const [registeredPage, setRegisteredPage] = useState(1);
  const [waitlistedPage, setWaitlistedPage] = useState(1);
  const [canceledPage, setCanceledPage] = useState(1);
  const [sessionListPage, setSessionListPage] = useState(1);
  const [cancelTarget, setCancelTarget] =
    useState<SessionParticipant | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [noticeText, setNoticeText] = useState("");
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeSaved, setNoticeSaved] = useState(false);

  const hasSelectedSession = sessions.some(
    (session) => session.id === selectedSessionId
  );

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ??
    sessions[0] ??
    null;

  useEffect(() => {
    if (!hasSelectedSession && sessions[0]) {
      onSelectSession(sessions[0].id);
    }
  }, [hasSelectedSession, onSelectSession, sessions]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(sessions.length / SESSION_LIST_PAGE_SIZE)
    );

    setSessionListPage((current) => Math.min(current, totalPages));
  }, [sessions.length]);

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }

    const selectedIndex = sessions.findIndex(
      (session) => session.id === selectedSessionId
    );

    if (selectedIndex === -1) {
      return;
    }

    setSessionListPage(
      Math.floor(selectedIndex / SESSION_LIST_PAGE_SIZE) + 1
    );
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    if (!selectedSession) return;
    setNoticeText("");
    setNoticeSaved(false);
    fetch(`/api/sessions/notice?sessionId=${selectedSession.id}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.notice === "string") setNoticeText(data.notice);
      })
      .catch(() => undefined);
  }, [selectedSession?.id]);

  const sessionListTotalPages = Math.max(
    1,
    Math.ceil(sessions.length / SESSION_LIST_PAGE_SIZE)
  );
  const paginatedSessions = useMemo(() => {
    const startIndex =
      (sessionListPage - 1) * SESSION_LIST_PAGE_SIZE;

    return sessions.slice(
      startIndex,
      startIndex + SESSION_LIST_PAGE_SIZE
    );
  }, [sessionListPage, sessions]);

  const publicSessionLink = useMemo(() => {
    if (!selectedSession) {
      return "";
    }

    return `${publicSessionBaseUrl}/${selectedSession.publicToken}`;
  }, [publicSessionBaseUrl, selectedSession]);

  const registeredParticipants = selectedSession
    ? getRegisteredParticipants(selectedSession)
    : [];
  const waitlistedParticipants = selectedSession
    ? getWaitlistedParticipants(selectedSession)
    : [];
  const canceledParticipants = selectedSession
    ? getCanceledParticipants(selectedSession)
    : [];

  const filteredRegisteredParticipants = filterParticipants(
    registeredParticipants,
    registeredFilters
  );
  const filteredWaitlistedParticipants = filterParticipants(
    waitlistedParticipants,
    waitlistedFilters
  );
  const filteredCanceledParticipants = filterParticipants(
    canceledParticipants,
    canceledFilters
  );
  const registeredTotalPages = Math.max(
    1,
    Math.ceil(
      filteredRegisteredParticipants.length / PARTICIPANT_LIST_PAGE_SIZE
    )
  );
  const waitlistedTotalPages = Math.max(
    1,
    Math.ceil(
      filteredWaitlistedParticipants.length / PARTICIPANT_LIST_PAGE_SIZE
    )
  );
  const canceledTotalPages = Math.max(
    1,
    Math.ceil(
      filteredCanceledParticipants.length / PARTICIPANT_LIST_PAGE_SIZE
    )
  );

  const registeredSummary = getParticipantSummary(
    filteredRegisteredParticipants
  );
  const waitlistedSummary = getParticipantSummary(
    filteredWaitlistedParticipants
  );
  const canceledSummary = getParticipantSummary(
    filteredCanceledParticipants
  );

  const registeredLevels = getSortedLevels(
    Array.from(
      new Set(
        registeredParticipants
          .map((participant) =>
            getParticipantLevelLabel(participant)
          )
          .filter((level) => level && level !== "-")
      )
    )
  );
  const waitlistedLevels = getSortedLevels(
    Array.from(
      new Set(
        waitlistedParticipants
          .map((participant) =>
            getParticipantLevelLabel(participant)
          )
          .filter((level) => level && level !== "-")
      )
    )
  );
  const canceledLevels = getSortedLevels(
    Array.from(
      new Set(
        canceledParticipants
          .map((participant) =>
            getParticipantLevelLabel(participant)
          )
          .filter((level) => level && level !== "-")
      )
    )
  );

  useEffect(() => {
    setRegisteredPage(1);
  }, [
    selectedSession?.id,
    registeredFilters.searchQuery,
    registeredFilters.typeFilter,
    registeredFilters.genderFilter,
    registeredFilters.levelFilter,
    registeredFilters.sortOption,
  ]);

  useEffect(() => {
    setWaitlistedPage(1);
  }, [
    selectedSession?.id,
    waitlistedFilters.searchQuery,
    waitlistedFilters.typeFilter,
    waitlistedFilters.genderFilter,
    waitlistedFilters.levelFilter,
    waitlistedFilters.sortOption,
  ]);

  useEffect(() => {
    setCanceledPage(1);
  }, [
    selectedSession?.id,
    canceledFilters.searchQuery,
    canceledFilters.typeFilter,
    canceledFilters.genderFilter,
    canceledFilters.levelFilter,
    canceledFilters.sortOption,
  ]);

  useEffect(() => {
    setRegisteredPage((current) =>
      Math.min(current, registeredTotalPages)
    );
  }, [registeredTotalPages]);

  useEffect(() => {
    setWaitlistedPage((current) =>
      Math.min(current, waitlistedTotalPages)
    );
  }, [waitlistedTotalPages]);

  useEffect(() => {
    setCanceledPage((current) => Math.min(current, canceledTotalPages));
  }, [canceledTotalPages]);

  const registeredMemberCount = registeredParticipants.filter(
    (participant) => !isGuestParticipant(participant)
  ).length;
  const registeredGuestCount = registeredParticipants.filter(
    (participant) => isGuestParticipant(participant)
  ).length;
  const waitlistedMemberCount = waitlistedParticipants.filter(
    (participant) => !isGuestParticipant(participant)
  ).length;
  const waitlistedGuestCount = waitlistedParticipants.filter(
    (participant) => isGuestParticipant(participant)
  ).length;
  const canceledMemberCount = canceledParticipants.filter(
    (participant) => !isGuestParticipant(participant)
  ).length;
  const canceledGuestCount = canceledParticipants.filter(
    (participant) => isGuestParticipant(participant)
  ).length;

  function resetForm() {
    setForm({
      ...initialForm,
      date: getTodayDateInputValue(),
    });
    setEditingSessionId(null);
  }

  async function handleSubmit() {
    if (
      editingSessionId &&
      selectedSession &&
      form.capacity !== ""
    ) {
      const nextCapacity = Number(form.capacity);
      const previousCapacity = selectedSession.capacity;
      const currentRegisteredCount =
        selectedSession.registeredCount ?? registeredParticipants.length;

      if (
        Number.isFinite(nextCapacity) &&
        nextCapacity >= 0 &&
        currentRegisteredCount > nextCapacity &&
        (previousCapacity === null || nextCapacity < previousCapacity)
      ) {
        const shouldContinue = confirm(
          "현재 참석 인원이 정원을 초과합니다.\n가장 마지막 신청 단위부터 대기 인원으로 이동됩니다."
        );

        if (!shouldContinue) {
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      if (editingSessionId) {
        await onUpdateSession(editingSessionId, form);
      } else {
        await onCreateSession(form);
      }

      resetForm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : editingSessionId
            ? "운동 일정을 수정하지 못했습니다."
            : "운동 일정을 생성하지 못했습니다.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await onCancelParticipant(cancelTarget.id);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "참가 취소를 처리하지 못했습니다."
      );
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  }

  async function handleCopyLink() {
    if (!publicSessionLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicSessionLink);
      alert("참석 신청 링크를 복사했습니다.");
    } catch {
      alert("참석 신청 링크 복사에 실패했습니다.");
    }
  }

  async function handleSaveNotice() {
    if (!selectedSession) return;
    setNoticeSaving(true);
    setNoticeSaved(false);
    try {
      const res = await fetch("/api/sessions/notice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: selectedSession.id, notice: noticeText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "공지를 저장하지 못했습니다.");
      setNoticeSaved(true);
      setTimeout(() => setNoticeSaved(false), 3000);
      alert("공지가 저장되었습니다.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "공지를 저장하지 못했습니다.");
    } finally {
      setNoticeSaving(false);
    }
  }

  async function handleUpdateStatus(
    sessionId: number,
    status: ClubSession["status"]
  ) {
    await onUpdateSessionStatus(sessionId, status);
    alert(
      status === "OPEN"
        ? "운동 일정이 모집중으로 변경되었습니다."
        : "운동 일정이 마감으로 변경되었습니다."
    );
  }

  function startEditingSelectedSession() {
    if (!selectedSession) {
      return;
    }

    setEditingSessionId(selectedSession.id);
    setForm(toSessionForm(selectedSession));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-6">
      {selectedSession ? (
        <AdminRegisterModal
          open={adminRegisterOpen}
          sessionId={selectedSession.id}
          participants={selectedSession.participants ?? []}
          onClose={() => setAdminRegisterOpen(false)}
          onSuccess={() => {
            onRefreshSession(selectedSession.id).catch(() => undefined);
          }}
        />
      ) : null}

      {/* 참가 취소 확인 모달 */}
      {cancelTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-6 shadow-xl">
            <h3 className="text-base font-black text-slate-900">
              참가 취소 확인
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              <span className="font-bold text-slate-900">
                {getParticipantDisplayName(cancelTarget)}
              </span>
              님을 참가 취소하시겠습니까?
            </p>
            {cancelTarget.status === "REGISTERED" ? (
              <p className="mt-1 text-sm text-amber-600">
                확정 인원이 취소되면 대기 인원이 자동으로 참가 확정됩니다.
              </p>
            ) : null}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  handleConfirmCancel().catch(() => undefined);
                }}
                disabled={cancelling}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600 disabled:opacity-50"
              >
                {cancelling ? "취소 중..." : "참가 취소"}
              </button>
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="min-w-0 space-y-6">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {editingSessionId
                  ? "운동 일정 수정"
                  : "운동 일정 만들기"}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500 md:mt-2 md:text-sm">
                날짜, 시간, 장소, 정원을 입력하면 카카오톡 공유용 참석 링크까지
                바로 만들 수 있어요.
              </p>
            </div>

            {editingSessionId ? (
              <button
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                수정 취소
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-2.5 md:mt-5 md:space-y-3">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="예: 목요일 정기 운동"
              className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-400 md:px-4 md:py-3"
            />
            <input
              value={form.location}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
              placeholder="장소"
              className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-400 md:px-4 md:py-3"
            />
            <div className="grid grid-cols-2 gap-2.5 md:gap-3">
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 md:px-4 md:py-3"
              />
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    capacity: event.target.value,
                  }))
                }
                placeholder="정원"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 md:px-4 md:py-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:gap-3">
              <input
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 md:px-4 md:py-3"
              />
              <input
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endTime: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 md:px-4 md:py-3"
              />
            </div>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="운영 메모"
              className="h-20 w-full resize-none rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-400 md:h-24 md:px-4 md:py-3"
            />
          </div>

          <button
            onClick={() => {
              handleSubmit().catch(() => undefined);
            }}
            disabled={submitting}
            className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 md:mt-5 md:py-3"
          >
            {submitting
              ? editingSessionId
                ? "수정 중..."
                : "생성 중..."
              : editingSessionId
                ? "운동 일정 수정"
                : "운동 일정 생성"}
          </button>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-slate-900">
              일정 목록
            </h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              총 {sessions.length}개
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {paginatedSessions.map((session) => {
              const isSelected = selectedSession?.id === session.id;

              return (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full rounded-2xl border p-3.5 text-left transition md:p-4 ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold md:text-base">
                      {session.title}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {SESSION_STATUS_LABEL[session.status]}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs opacity-80 md:mt-2 md:text-sm">
                    {formatDate(session.date)} {session.startTime} -{" "}
                    {session.endTime}
                  </div>
                  <div className="mt-1.5 text-xs opacity-80 md:mt-2 md:text-sm">
                    참석 {session.registeredCount ?? 0}명 / 대기{" "}
                    {session.waitlistedCount ?? 0}명
                  </div>
                </button>
              );
            })}

            {sessions.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                아직 등록된 운동 일정이 없습니다.
              </p>
            ) : null}
          </div>


          {sessions.length > SESSION_LIST_PAGE_SIZE ? (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() =>
                  setSessionListPage((current) =>
                    Math.max(1, current - 1)
                  )
                }
                disabled={sessionListPage === 1}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {"<"}
              </button>
              <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                {sessionListPage} / {sessionListTotalPages}
              </span>
              <button
                onClick={() =>
                  setSessionListPage((current) =>
                    Math.min(sessionListTotalPages, current + 1)
                  )
                }
                disabled={sessionListPage === sessionListTotalPages}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {">"}
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        {selectedSession ? (
          <>
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-xl font-black text-slate-900 md:text-2xl">
                      {selectedSession.title}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {SESSION_STATUS_LABEL[selectedSession.status]}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-xs leading-5 text-slate-500 md:text-sm">
                    {formatDate(selectedSession.date)}{" "}
                    {selectedSession.startTime} - {selectedSession.endTime}
                    {selectedSession.location
                      ? ` | ${selectedSession.location}`
                      : ""}
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-400 md:text-sm">
                    {selectedSession.description || "설명 없음"}
                  </p>

                  <div className="mt-3">
                    {selectedSession.status === "OPEN" ? (
                      <button
                        onClick={() => setAdminRegisterOpen(true)}
                        className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100 md:text-sm md:px-5 md:py-2.5"
                      >
                        + 참석자 직접 등록
                      </button>
                    ) : (
                      <div className="group relative inline-block">
                        <button
                          disabled
                          className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-400 md:text-sm md:px-5 md:py-2.5"
                        >
                          + 참석자 직접 등록
                        </button>
                        <div className="pointer-events-none absolute left-0 top-full z-10 mt-1.5 hidden w-64 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-600 shadow-lg group-hover:block">
                          마감 상태의 일정은 참석자를 추가할 수 없습니다. 모집 중으로 상태 변경을 먼저 해주세요.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={startEditingSelectedSession}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:text-xs"
                  >
                    수정
                  </button>
                  {(["OPEN", "CLOSED"] as const).map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() =>
                          handleUpdateStatus(
                            selectedSession.id,
                            status
                          ).catch((error: Error) => {
                            alert(error.message);
                          })
                        }
                        className={`rounded-xl px-3 py-2 text-[11px] font-bold transition md:text-xs ${statusButtonClass(
                          status
                        )}`}
                      >
                        {SESSION_STATUS_LABEL[status]}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => {
                      if (
                        !confirm(
                          "이 운동 일정을 삭제할까요? 참석 명단과 대기 명단도 함께 삭제됩니다."
                        )
                      ) {
                        return;
                      }

                      onDeleteSession(selectedSession.id).catch(
                        (error: Error) => {
                          alert(error.message);
                        }
                      );
                    }}
                    className="rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-rose-700 md:text-xs"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-sky-50 p-3 md:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 max-w-2xl">
                    <p className="text-xs font-semibold text-sky-700 md:text-sm">
                      참석 신청 공유 링크
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-slate-600 md:mt-2 md:text-sm md:leading-6">
                      회원과 게스트는 링크에서 현재 참석 현황을 보고 참석 신청,
                      취소, 게스트 등록까지 할 수 있습니다.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleCopyLink().catch(() => {
                        alert("참석 신청 링크 복사에 실패했습니다.");
                      });
                    }}
                    className="w-full rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700 lg:w-auto lg:py-3"
                  >
                    링크 복사
                  </button>
                </div>

                <div className="mt-3 break-all rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-5 text-slate-500 sm:text-sm sm:leading-7 md:mt-4 md:px-4 md:py-3">
                  {publicSessionLink}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-3 md:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-amber-700 md:text-sm">
                      관리자 공지
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500 md:text-xs">
                      운동 링크 댓글 섹션 최상단에 공지로 고정됩니다. 비우면 공지가 숨겨집니다.
                    </p>
                  </div>
                  {noticeSaved ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">
                      저장됨
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 space-y-2">
                  <textarea
                    value={noticeText}
                    onChange={(e) => setNoticeText(e.target.value.slice(0, 500))}
                    rows={3}
                    placeholder="운동 관련 공지사항을 입력해주세요."
                    className="w-full resize-none rounded-2xl border border-amber-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-400"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400">{noticeText.length}/500</span>
                    <button
                      onClick={() => { handleSaveNotice().catch(() => undefined); }}
                      disabled={noticeSaving}
                      className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {noticeSaving ? "저장 중..." : "공지 저장"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:mt-5 md:grid-cols-4 md:gap-4">
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 md:p-4">
                <p className="text-[11px] font-semibold text-sky-600 md:text-sm">
                  정원
                </p>
                <p className="mt-1.5 text-xl font-black text-sky-700 md:mt-2 md:text-2xl">
                  {selectedSession.capacity ?? "제한 없음"}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 md:p-4">
                <p className="text-[11px] font-semibold text-emerald-600 md:text-sm">
                  참석 인원
                </p>
                <p className="mt-1.5 text-xl font-black text-emerald-700 md:mt-2 md:text-2xl">
                  {selectedSession.registeredCount ??
                    registeredParticipants.length}
                </p>
                <p className="mt-1.5 text-[10px] font-medium leading-4 text-emerald-600 md:mt-2 md:text-xs">
                  회원 {registeredMemberCount}명 / 게스트{" "}
                  {registeredGuestCount}명
                </p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3 md:p-4">
                <p className="text-[11px] font-semibold text-rose-400 md:text-sm">
                  불참 인원
                </p>
                <p className="mt-1.5 text-xl font-black text-rose-500 md:mt-2 md:text-2xl">
                  {canceledParticipants.length}
                </p>
                <p className="mt-1.5 text-[10px] font-medium leading-4 text-rose-400 md:mt-2 md:text-xs">
                  회원 {canceledMemberCount}명 / 게스트{" "}
                  {canceledGuestCount}명
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 md:p-4">
                <p className="text-[11px] font-semibold text-amber-600 md:text-sm">
                  대기 인원
                </p>
                <p className="mt-1.5 text-xl font-black text-amber-700 md:mt-2 md:text-2xl">
                  {selectedSession.waitlistedCount ??
                    waitlistedParticipants.length}
                </p>
                <p className="mt-1.5 text-[10px] font-medium leading-4 text-amber-600 md:mt-2 md:text-xs">
                  회원 {waitlistedMemberCount}명 / 게스트{" "}
                  {waitlistedGuestCount}명
                </p>
              </div>
            </div>

            {loadingSelectedSession ? (
              <div className="mt-6 rounded-[1.5rem] bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
                참석 명단을 불러오는 중입니다.
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <ParticipantSection
                  title="참석 신청 명단"
                  description="링크로 실제 참석 신청한 회원과 게스트 명단입니다."
                  participants={registeredParticipants}
                  filteredParticipants={filteredRegisteredParticipants}
                  summary={registeredSummary}
                  levels={registeredLevels}
                  filters={registeredFilters}
                  setFilters={setRegisteredFilters}
                  emptyMessage="아직 참석 신청한 사람이 없습니다."
                  onCancelClick={setCancelTarget}
                  page={registeredPage}
                  totalPages={registeredTotalPages}
                  onPageChange={setRegisteredPage}
                />

                <ParticipantSection
                  title="대기 인원 명단"
                  description="정원 초과 시 자동으로 대기 인원으로 들어갑니다."
                  participants={waitlistedParticipants}
                  filteredParticipants={filteredWaitlistedParticipants}
                  summary={waitlistedSummary}
                  levels={waitlistedLevels}
                  filters={waitlistedFilters}
                  setFilters={setWaitlistedFilters}
                  emptyMessage="현재 대기 인원이 없습니다."
                  onCancelClick={setCancelTarget}
                  page={waitlistedPage}
                  totalPages={waitlistedTotalPages}
                  onPageChange={setWaitlistedPage}
                />

                <ParticipantSection
                  title="불참 명단"
                  description="참가 취소된 회원과 게스트 명단입니다."
                  participants={canceledParticipants}
                  filteredParticipants={filteredCanceledParticipants}
                  summary={canceledSummary}
                  levels={canceledLevels}
                  filters={canceledFilters}
                  setFilters={setCanceledFilters}
                  emptyMessage="불참 인원이 없습니다."
                  page={canceledPage}
                  totalPages={canceledTotalPages}
                  onPageChange={setCanceledPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full min-h-[360px] items-center justify-center rounded-[1.5rem] bg-slate-50 text-sm font-medium text-slate-400">
            먼저 운동 일정을 하나 선택해주세요.
          </div>
        )}
      </section>
    </div>
  );
}

