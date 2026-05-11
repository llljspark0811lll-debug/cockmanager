"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  DashboardStats,
  DashboardStatsPeriod,
  DashboardStatsPeriodKey,
  DashboardTopMemberStat,
} from "@/components/dashboard/types";

type StatsOverviewProps = {
  stats: DashboardStats | null;
  loading: boolean;
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
}: StatsOverviewProps) {
  const [period, setPeriod] =
    useState<DashboardStatsPeriodKey>("WEEK");
  const [customStartDate, setCustomStartDate] = useState(() => {
    const now = new Date();
    return formatDateInputValue(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );
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

  useEffect(() => {
    setCustomStats(stats?.custom ?? null);
    setCustomTopMembers(stats?.topMembers.custom ?? []);
    setCustomAbsentMembers(stats?.absentMembers?.custom ?? []);
  }, [stats]);

  const periodStats = useMemo(() => {
    if (!stats) {
      return null;
    }

    if (period === "WEEK") {
      return stats.week;
    }

    if (period === "MONTH") {
      return stats.month;
    }

    return customStats;
  }, [customStats, period, stats]);

  const periodTopMembers = useMemo(() => {
    if (!stats) return [];
    if (period === "WEEK") return stats.topMembers.week;
    if (period === "MONTH") return stats.topMembers.month;
    return customTopMembers;
  }, [customTopMembers, period, stats]);

  const periodAbsentMembers = useMemo(() => {
    if (!stats) return [];
    if (period === "WEEK") return stats.absentMembers?.week ?? [];
    if (period === "MONTH") return stats.absentMembers?.month ?? [];
    return customAbsentMembers;
  }, [customAbsentMembers, period, stats]);

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

  async function handleLoadCustomStats() {
    if (!customStartDate || !customEndDate) {
      setCustomError("시작일과 종료일을 모두 선택해주세요.");
      return;
    }

    if (customStartDate > customEndDate) {
      setCustomError("시작일이 종료일보다 늦을 수 없습니다.");
      return;
    }

    setCustomLoading(true);
    setCustomError("");

    try {
      const response = await fetch(
        `/api/dashboard-stats?startDate=${customStartDate}&endDate=${customEndDate}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ?? "기간 통계를 불러오지 못했습니다."
        );
      }

      setCustomStats(data.custom ?? null);
      setCustomTopMembers(data.topMembers?.custom ?? []);
      setCustomAbsentMembers(data.absentMembers?.custom ?? []);
      setPeriod("CUSTOM");
    } catch (error) {
      setCustomError(
        error instanceof Error
          ? error.message
          : "기간 통계를 불러오지 못했습니다."
      );
    } finally {
      setCustomLoading(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            주간/월간 운영 통계
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            마감된 운동 일정 기준으로 회원 참여 흐름과 신규 회원,
            회비 상태까지 한 번에 확인할 수 있게 정리했습니다.
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPeriod("WEEK")}
              className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                period === "WEEK"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              이번 주
            </button>
            <button
              onClick={() => setPeriod("MONTH")}
              className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                period === "MONTH"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              이번 달
            </button>
          </div>

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
            {formatPeriodLabel(
              period === "WEEK"
                ? "주간 통계"
                : period === "MONTH"
                  ? "월간 통계"
                  : "직접 설정 기간 통계",
              periodStats.startDate,
              periodStats.endDate
            )}
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
                      마감된 일정 기준으로 참석이 가장 적었던 회원입니다.
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
    </section>
  );
}
