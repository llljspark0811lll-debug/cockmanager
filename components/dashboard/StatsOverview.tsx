"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  ClubLevel,
  DashboardAllMemberStatsGroup,
  DashboardStats,
  DashboardStatsPeriod,
  DashboardStatsPeriodKey,
  DashboardTopMemberStat,
} from "@/components/dashboard/types";

function formatSessionDate(date: string | Date) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

type AllMemberSortKey = "HIGH" | "LOW" | "NAME";
const ALL_MEMBER_PAGE_SIZE = 10;
const STATS_SESSION_KEY = "cockmanager-stats-ui";

type StatsSessionState = {
  period: DashboardStatsPeriodKey;
  customStartDate: string;
  customEndDate: string;
  allMemberSort: AllMemberSortKey;
};

function readSessionState(): Partial<StatsSessionState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STATS_SESSION_KEY);
    return raw ? (JSON.parse(raw) as Partial<StatsSessionState>) : {};
  } catch {
    return {};
  }
}

type StatsOverviewProps = {
  stats: DashboardStats | null;
  loading: boolean;
  clubLevels: ClubLevel[];
};

type StatCard = {
  label: string;
  value: number;
  hint: string;
  accentClass: string;
  valueClass: string;
};

function formatPeriodLabel(
  label: string,
  startDate: string | Date,
  endDate: string | Date
) {
  const start = new Date(startDate).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });
  const end = new Date(endDate).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });

  return `${label} 기준 ${start} - ${end}`;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function StatsOverview({
  stats,
  loading,
  clubLevels,
}: StatsOverviewProps) {
  const [period, setPeriod] = useState<DashboardStatsPeriodKey>("CUSTOM");
  const [customStartDate, setCustomStartDate] = useState(() => {
    const now = new Date();
    return formatDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [customEndDate, setCustomEndDate] = useState(() =>
    formatDateInputValue(new Date())
  );
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState("");
  const [customStats, setCustomStats] =
    useState<DashboardStatsPeriod | null>(null);
  const [customTopMembers, setCustomTopMembers] = useState<
    DashboardTopMemberStat[]
  >([]);
  const [customAbsentMembers, setCustomAbsentMembers] = useState<
    DashboardTopMemberStat[]
  >([]);
  const [customAllMembersGroup, setCustomAllMembersGroup] =
    useState<DashboardAllMemberStatsGroup | null>(null);
  const [allMemberSort, setAllMemberSort] = useState<AllMemberSortKey>("HIGH");
  const [allMemberPage, setAllMemberPage] = useState(1);
  const saveInitialized = useRef(false);

  useEffect(() => {
    if (stats?.custom) setCustomStats(stats.custom);
    if (stats?.topMembers?.custom) setCustomTopMembers(stats.topMembers.custom);
    if (stats?.absentMembers?.custom) setCustomAbsentMembers(stats.absentMembers.custom);
    if (stats?.allMemberStats?.custom) setCustomAllMembersGroup(stats.allMemberStats.custom);
  }, [stats]);

  // sessionStorage에 UI 상태 저장 (마운트 첫 실행은 기본값 덮어쓰기 방지를 위해 건너뜀)
  useEffect(() => {
    if (!saveInitialized.current) {
      saveInitialized.current = true;
      return;
    }
    try {
      const state: StatsSessionState = { period, customStartDate, customEndDate, allMemberSort };
      localStorage.setItem(STATS_SESSION_KEY, JSON.stringify(state));
    } catch {}
  }, [period, customStartDate, customEndDate, allMemberSort]);

  const periodStats = useMemo(() => customStats, [customStats]);

  const periodTopMembers = useMemo(() => customTopMembers, [customTopMembers]);

  const periodAbsentMembers = useMemo(() => customAbsentMembers, [customAbsentMembers]);

  const periodAllMembersGroup = useMemo((): DashboardAllMemberStatsGroup => {
    return customAllMembersGroup ?? { members: [], sessions: [] };
  }, [customAllMembersGroup]);

  const periodSessions = periodAllMembersGroup.sessions;

  const sortedAllMembers = useMemo(() => {
    const list = [...periodAllMembersGroup.members];
    if (allMemberSort === "HIGH") {
      list.sort((a, b) => {
        const pctA = a.attendanceCount / Math.max(a.totalSessionCount ?? 0, 1);
        const pctB = b.attendanceCount / Math.max(b.totalSessionCount ?? 0, 1);
        return pctB - pctA || b.attendanceCount - a.attendanceCount || a.name.localeCompare(b.name, "ko");
      });
    } else if (allMemberSort === "LOW") {
      list.sort((a, b) => {
        const pctA = a.attendanceCount / Math.max(a.totalSessionCount ?? 0, 1);
        const pctB = b.attendanceCount / Math.max(b.totalSessionCount ?? 0, 1);
        return pctA - pctB || a.attendanceCount - b.attendanceCount || a.name.localeCompare(b.name, "ko");
      });
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    }
    return list;
  }, [periodAllMembersGroup, allMemberSort]);

  const allMemberTotalPages = Math.max(1, Math.ceil(sortedAllMembers.length / ALL_MEMBER_PAGE_SIZE));
  const pagedAllMembers = sortedAllMembers.slice(
    (allMemberPage - 1) * ALL_MEMBER_PAGE_SIZE,
    allMemberPage * ALL_MEMBER_PAGE_SIZE
  );

  const statCards = useMemo<StatCard[]>(() => {
    if (!periodStats) {
      return [];
    }

    return [
      {
        label: "신규 회원",
        value: periodStats.newMembersCount,
        hint: "선택한 기간에 가입된 신규 회원 수",
        accentClass:
          "border-violet-200 bg-violet-50/80",
        valueClass: "text-violet-700",
      },
      {
        label: "운동 일정",
        value: periodStats.sessionCount,
        hint: "선택한 기간에 마감된 운동 일정 수",
        accentClass:
          "border-sky-200 bg-sky-50/80",
        valueClass: "text-sky-700",
      },
      {
        label: "참석 회원",
        value: periodStats.memberAttendanceCount,
        hint: "마감 처리된 일정의 참석 회원 수",
        accentClass:
          "border-emerald-200 bg-emerald-50/80",
        valueClass: "text-emerald-700",
      },
      {
        label: "게스트",
        value: periodStats.guestCount,
        hint: "선택한 기간에 함께 참석한 게스트 수",
        accentClass:
          "border-amber-200 bg-amber-50/80",
        valueClass: "text-amber-700",
      },
      {
        label: "미납 회원",
        value: periodStats.unpaidMembersCount,
        hint: "기준 월 기준 월회비 미납 회원 수",
        accentClass:
          "border-rose-200 bg-rose-50/80",
        valueClass: "text-rose-700",
      },
    ];
  }, [periodStats]);

  useEffect(() => {
    setAllMemberPage(1);
  }, [allMemberSort]);

  async function handleLoadCustomStats() {
    if (!customStartDate || !customEndDate) {
      setCustomError("시작일과 종료일을 모두 선택해주세요.");
      return;
    }

    if (customStartDate > customEndDate) {
      setCustomError("시작일이 종료일보다 늦을 수 없습니다.");
      return;
    }

    await fetchCustomStats(customStartDate, customEndDate);
  }

  async function fetchCustomStats(startDate: string, endDate: string) {
    setCustomLoading(true);
    setCustomError("");

    try {
      const response = await fetch(
        `/api/dashboard-stats?startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "기간 통계를 불러오지 못했습니다.");
      }

      setCustomStats(data.custom ?? null);
      setCustomTopMembers(data.topMembers?.custom ?? []);
      setCustomAbsentMembers(data.absentMembers?.custom ?? []);
      setCustomAllMembersGroup(data.allMemberStats?.custom ?? null);
      setPeriod("CUSTOM");
    } catch (error) {
      setCustomError(
        error instanceof Error ? error.message : "기간 통계를 불러오지 못했습니다."
      );
    } finally {
      setCustomLoading(false);
    }
  }

  // 마운트 시 localStorage 복원 (useLayoutEffect: 페인트 전 동기 실행, SSR 미실행)
  useLayoutEffect(() => {
    const saved = readSessionState();
    if (saved.allMemberSort) setAllMemberSort(saved.allMemberSort as AllMemberSortKey);
    const startDate = saved.customStartDate ?? customStartDate;
    const endDate = saved.customEndDate ?? customEndDate;
    if (saved.customStartDate) setCustomStartDate(saved.customStartDate);
    if (saved.customEndDate) setCustomEndDate(saved.customEndDate);
    fetchCustomStats(startDate, endDate).catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            운영 통계
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            마감된 운동 일정 기준으로 회원 참여 흐름과 신규 회원,
            회비 상태까지 한 번에 확인할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_76px] items-center gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_88px]">
            <input
              type="date"
              value={customStartDate}
              onChange={(event) =>
                setCustomStartDate(event.target.value)
              }
              className="min-w-0 w-full appearance-none overflow-hidden rounded-xl border border-slate-200 bg-white px-2 py-2 text-[10px] text-slate-700 sm:px-3 sm:text-sm"
            />
            <input
              type="date"
              value={customEndDate}
              onChange={(event) =>
                setCustomEndDate(event.target.value)
              }
              className="min-w-0 w-full appearance-none overflow-hidden rounded-xl border border-slate-200 bg-white px-2 py-2 text-[10px] text-slate-700 sm:px-3 sm:text-sm"
            />
            <button
              onClick={handleLoadCustomStats}
              disabled={customLoading}
              className="min-w-0 whitespace-nowrap rounded-xl bg-sky-600 px-2 py-2 text-[11px] font-bold leading-none text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
            >
              {customLoading ? "조회 중..." : "기간 조회"}
            </button>
          </div>
        </div>
      </div>

      {customError ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
          {customError}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 rounded-[1.5rem] bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
          운영 통계를 불러오는 중입니다.
        </div>
      ) : stats && periodStats ? (
        <div className="mt-5 space-y-5">
          <div className="text-xs font-medium text-slate-400">
            {formatPeriodLabel("기간별 통계", periodStats.startDate, periodStats.endDate)}
          </div>

          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-5">
            {statCards.map((card) => (
              <article
                key={card.label}
                className={`overflow-hidden rounded-[1.5rem] border px-4 py-4 shadow-sm transition ${card.accentClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-600">
                    {card.label}
                  </p>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                    SUMMARY
                  </span>
                </div>
                <p
                  className={`mt-4 text-3xl font-black ${card.valueClass}`}
                >
                  {card.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {card.hint}
                </p>
              </article>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      활동 상위 회원
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      마감된 일정 기준으로 가장 자주 참석한 회원입니다.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                    TOP 5
                  </span>
                </div>
              </div>

              <div className="p-4">
                {periodTopMembers.length > 0 ? (
                  <div className="space-y-3">
                    {periodTopMembers.map((member, index) => {
                      const pct = Math.round(
                        (member.attendanceCount / Math.max(member.totalSessionCount ?? 0, 1)) * 100
                      );
                      const rankColors = ["bg-amber-400", "bg-slate-400", "bg-orange-400"];
                      return (
                        <div key={member.memberId} className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${index < 3 ? rankColors[index] : "bg-slate-300"}`}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-900">
                              {member.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {member.attendanceCount}회/{member.totalSessionCount ?? "-"}회 참석
                              <span className="ml-1.5 font-bold text-sky-700">
                                (참석률 {pct}%)
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                    선택한 기간 집계된 활동 회원이 아직 없습니다.
                  </div>
                )}
              </div>
            </article>

            <article className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      활동 하위 회원
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      마감된 일정 기준으로 가장 적게 참석한 회원입니다.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                    BOTTOM 5
                  </span>
                </div>
              </div>

              <div className="p-4">
                {periodAbsentMembers.length > 0 ? (
                  <div className="space-y-3">
                    {periodAbsentMembers.map((member) => {
                      const pct = Math.round(
                        (member.attendanceCount / Math.max(member.totalSessionCount ?? 0, 1)) * 100
                      );
                      return (
                        <div key={member.memberId} className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-900">
                              {member.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {member.attendanceCount}회/{member.totalSessionCount ?? "-"}회 참석
                              <span className={`ml-1.5 font-bold ${pct === 0 ? "text-rose-600" : "text-amber-600"}`}>
                                (참석률 {pct}%)
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                    선택한 기간 집계된 데이터가 없습니다.
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.5rem] bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
          운영 통계를 아직 불러오지 못했습니다.
        </div>
      )}

      {!loading && stats && (
        <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">전체 회원 출석 현황</h3>
                <p className="mt-1 text-sm text-slate-500">
                  선택한 기간 기준 전체 회원의 출석 횟수입니다.
                </p>
              </div>
              <select
                value={allMemberSort}
                onChange={(e) => setAllMemberSort(e.target.value as AllMemberSortKey)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                <option value="HIGH">출석 높은순</option>
                <option value="LOW">출석 낮은순</option>
                <option value="NAME">이름순</option>
              </select>
            </div>
          </div>

          <div className="p-4">
            {periodAllMembersGroup.members.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                선택한 기간에 집계된 회원 데이터가 없습니다.
              </div>
            ) : (
              <>
                {/* 통합 테이블: 모바일/PC 모두 날짜 컬럼 + 가로 스크롤 */}
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-white pb-2 md:pb-2.5 pr-2 md:pr-4 text-left text-[10px] md:text-xs font-semibold text-slate-400 w-7 md:w-10 border-b border-slate-100">순위</th>
                        <th className="sticky left-7 md:left-10 z-10 bg-white pb-2 md:pb-2.5 pr-2 md:pr-6 text-left text-[10px] md:text-xs font-semibold text-slate-400 w-16 md:w-24 border-b border-slate-100">이름</th>
                        <th className="hidden md:table-cell pb-2.5 pr-4 text-left text-xs font-semibold text-slate-400 w-10 border-b border-slate-100">성별</th>
                        <th className="hidden md:table-cell pb-2.5 pr-6 text-left text-xs font-semibold text-slate-400 w-10 border-b border-slate-100">급수</th>
                        {periodSessions.map((s) => (
                          <th key={s.id} className="pb-2 md:pb-2.5 px-1 md:px-2 text-center text-[10px] md:text-xs font-semibold text-slate-400 w-7 md:w-10 border-b border-slate-100">
                            {formatSessionDate(s.date)}
                          </th>
                        ))}
                        <th className="pb-2 md:pb-2.5 pl-1 pr-1 md:pr-4 text-right text-[10px] md:text-xs font-semibold text-slate-400 w-10 md:w-16 border-b border-slate-100 whitespace-nowrap">참석</th>
                        <th className="pb-2 md:pb-2.5 text-right text-[10px] md:text-xs font-semibold text-slate-400 w-9 md:w-14 border-b border-slate-100">출석률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedAllMembers.map((member, index) => {
                        const rank = (allMemberPage - 1) * ALL_MEMBER_PAGE_SIZE + index + 1;
                        const total = Math.max(member.totalSessionCount ?? 0, 1);
                        const pct = Math.round((member.attendanceCount / total) * 100);
                        const pctColor = pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-rose-600";
                        const attendedSet = new Set(member.attendedSessionIds ?? []);
                        return (
                          <tr key={member.memberId}>
                            <td className="sticky left-0 z-10 bg-white py-2 md:py-2.5 pr-2 md:pr-4 text-[10px] md:text-xs font-bold text-slate-400 border-b border-slate-50">#{rank}</td>
                            <td className="sticky left-7 md:left-10 z-10 bg-white py-2 md:py-2.5 pr-2 md:pr-6 text-xs md:text-sm font-black text-slate-900 border-b border-slate-50 max-w-[4rem] md:max-w-[6rem] truncate">{member.name}</td>
                            <td className="hidden md:table-cell py-2.5 pr-4 text-xs text-slate-500 border-b border-slate-50">{member.gender ?? "—"}</td>
                            <td className="hidden md:table-cell py-2.5 pr-6 text-xs text-slate-500 border-b border-slate-50">{clubLevels.find((l) => String(l.rank) === member.level)?.name ?? member.level ?? "—"}</td>
                            {periodSessions.map((s) => (
                              <td key={s.id} className="py-2 md:py-2.5 px-1 md:px-2 text-center border-b border-slate-50">
                                {attendedSet.has(s.id) ? (
                                  <span className="inline-block h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-emerald-400" />
                                ) : (
                                  <span className="inline-block h-2 w-2 md:h-2.5 md:w-2.5 rounded-full border-2 border-slate-200" />
                                )}
                              </td>
                            ))}
                            <td className="py-2 md:py-2.5 pl-1 pr-1 md:pr-4 text-right text-[10px] md:text-xs text-slate-500 border-b border-slate-50 whitespace-nowrap">{member.attendanceCount}/{member.totalSessionCount ?? 0}</td>
                            <td className={`py-2 md:py-2.5 text-right text-[10px] md:text-xs font-bold border-b border-slate-50 whitespace-nowrap ${pctColor}`}>{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {allMemberTotalPages > 1 && (
                  <div className="mt-5 flex items-center justify-center gap-1">
                    <button
                      onClick={() => setAllMemberPage((p) => Math.max(1, p - 1))}
                      disabled={allMemberPage === 1}
                      className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
                    >
                      &lt;
                    </button>
                    {Array.from({ length: allMemberTotalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setAllMemberPage(page)}
                        className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                          page === allMemberPage
                            ? "bg-slate-900 text-white"
                            : "text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setAllMemberPage((p) => Math.min(allMemberTotalPages, p + 1))}
                      disabled={allMemberPage === allMemberTotalPages}
                      className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
                    >
                      &gt;
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
