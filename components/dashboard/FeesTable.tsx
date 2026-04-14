import { memo, useMemo, useState } from "react";
import type { Fee, FeeMember } from "@/components/dashboard/types";

type FeesTableProps = {
  members: FeeMember[];
  fees: Fee[];
  selectedYear: number;
  onChangeYear: (year: number) => void;
  onToggleFee: (
    memberId: number,
    year: number,
    month: number,
    currentPaid: boolean
  ) => void;
  onMarkAllPaid: (memberId: number) => void;
  onMarkAllUnpaid: (memberId: number) => void;
};

type FeeQuickFilter =
  | "ALL"
  | "MONTH_UNPAID"
  | "CUMULATIVE_UNPAID"
  | "PAID";

type FeeRowProps = {
  member: FeeMember;
  monthStates: boolean[];
  selectedYear: number;
  onToggleFee: (
    memberId: number,
    year: number,
    month: number,
    currentPaid: boolean
  ) => void;
  onMarkAllPaid: (memberId: number) => void;
  onMarkAllUnpaid: (memberId: number) => void;
};

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const EMPTY_MONTH_STATES = MONTHS.map(() => false);

function getYearOptions(selectedYear: number) {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>();

  for (let year = currentYear - 3; year <= currentYear + 3; year += 1) {
    years.add(year);
  }

  years.add(selectedYear);

  return [...years].sort((left, right) => right - left);
}

const FeeMemberRow = memo(
  function FeeMemberRow({
    member,
    monthStates,
    selectedYear,
    onToggleFee,
    onMarkAllPaid,
    onMarkAllUnpaid,
  }: FeeRowProps) {
    return (
      <tr className="hover:bg-slate-50">
        <td className="px-4 py-4 font-bold text-slate-900">
          {member.name}
        </td>
        {MONTHS.map((month, index) => {
          const isPaid = monthStates[index];

          return (
            <td key={month} className="px-2 py-4 text-center">
              <button
                onClick={() =>
                  onToggleFee(
                    member.id,
                    selectedYear,
                    month,
                    isPaid
                  )
                }
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-lg font-black transition ${
                  isPaid
                    ? "bg-rose-500 text-white hover:bg-rose-600"
                    : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                }`}
                aria-label={`${member.name} ${month}월 회비 ${
                  isPaid ? "미납으로 변경" : "납부로 변경"
                }`}
              >
                ✓
              </button>
            </td>
          );
        })}
        <td className="px-4 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => onMarkAllPaid(member.id)}
              className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
            >
              전체 납부
            </button>
            <button
              onClick={() => onMarkAllUnpaid(member.id)}
              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
            >
              전체 미납
            </button>
          </div>
        </td>
      </tr>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.member.id !== nextProps.member.id) {
      return false;
    }

    if (prevProps.member.name !== nextProps.member.name) {
      return false;
    }

    if (prevProps.selectedYear !== nextProps.selectedYear) {
      return false;
    }

    return prevProps.monthStates.every(
      (value, index) => value === nextProps.monthStates[index]
    );
  }
);

export function FeesTable({
  members,
  fees,
  selectedYear,
  onChangeYear,
  onToggleFee,
  onMarkAllPaid,
  onMarkAllUnpaid,
}: FeesTableProps) {
  const [quickFilter, setQuickFilter] =
    useState<FeeQuickFilter>("ALL");
  const [referenceMonth, setReferenceMonth] = useState(
    new Date().getMonth() + 1
  );

  const yearOptions = useMemo(
    () => getYearOptions(selectedYear),
    [selectedYear]
  );

  const memberMonthStates = useMemo(() => {
    const paidKeySet = new Set<string>();

    for (const fee of fees) {
      if (fee.memberId === undefined || !fee.paid) {
        continue;
      }

      paidKeySet.add(`${fee.memberId}-${fee.year}-${fee.month}`);
    }

    const nextMap = new Map<number, boolean[]>();

    for (const member of members) {
      nextMap.set(
        member.id,
        MONTHS.map((month) =>
          paidKeySet.has(`${member.id}-${selectedYear}-${month}`)
        )
      );
    }

    return nextMap;
  }, [fees, members, selectedYear]);

  const filteredMembers = useMemo(() => {
    if (quickFilter === "ALL") {
      return members;
    }

    return members.filter((member) => {
      const monthStates =
        memberMonthStates.get(member.id) ?? EMPTY_MONTH_STATES;
      const paidCountUntilReferenceMonth = monthStates
        .slice(0, referenceMonth)
        .filter(Boolean).length;
      const isReferenceMonthPaid =
        monthStates[referenceMonth - 1] ?? false;

      if (quickFilter === "MONTH_UNPAID") {
        return !isReferenceMonthPaid;
      }

      if (quickFilter === "CUMULATIVE_UNPAID") {
        return paidCountUntilReferenceMonth < referenceMonth;
      }

      return paidCountUntilReferenceMonth === referenceMonth;
    });
  }, [memberMonthStates, members, quickFilter, referenceMonth]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px_300px] xl:items-center">
          <div className="min-w-0">
          <h3 className="text-lg font-black text-slate-900">
            연도별 회비 관리
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            기준 월을 직접 선택해서 해당 월 미납과 누적 미납 회원을 빠르게 확인할 수 있어요.
          </p>
          </div>

          <div className="grid grid-cols-2 gap-2 xl:w-full xl:max-w-[420px] xl:justify-self-center">
            <button
              onClick={() => setQuickFilter("ALL")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                quickFilter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              전체 보기
            </button>
            <button
              onClick={() => setQuickFilter("MONTH_UNPAID")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                quickFilter === "MONTH_UNPAID"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              해당 월 미납만
            </button>
            <button
              onClick={() =>
                setQuickFilter("CUMULATIVE_UNPAID")
              }
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                quickFilter === "CUMULATIVE_UNPAID"
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 text-orange-700 hover:bg-orange-100"
              }`}
            >
              누적 미납만
            </button>
            <button
              onClick={() => setQuickFilter("PAID")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                quickFilter === "PAID"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              기준 월까지 완납만
            </button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row xl:justify-self-end">
            <select
              value={selectedYear}
              onChange={(event) =>
                onChangeYear(Number(event.target.value))
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 sm:w-36"
              aria-label="회비 연도 선택"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>

            <select
              value={referenceMonth}
              onChange={(event) =>
                setReferenceMonth(Number(event.target.value))
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 sm:w-36"
              aria-label="회비 기준 월 선택"
            >
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  기준 월 {month}월
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1060px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-4 font-semibold">회원</th>
                {MONTHS.map((month) => (
                  <th
                    key={month}
                    className="px-2 py-4 text-center font-semibold"
                  >
                    {month}월
                  </th>
                ))}
                <th className="px-4 py-4 font-semibold">일괄 처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <FeeMemberRow
                  key={member.id}
                  member={member}
                  monthStates={
                    memberMonthStates.get(member.id) ??
                    EMPTY_MONTH_STATES
                  }
                  selectedYear={selectedYear}
                  onToggleFee={onToggleFee}
                  onMarkAllPaid={onMarkAllPaid}
                  onMarkAllUnpaid={onMarkAllUnpaid}
                />
              ))}

              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    선택한 기준에 맞는 회원이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
