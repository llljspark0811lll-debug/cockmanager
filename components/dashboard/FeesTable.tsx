import { useMemo, useState } from "react";
import type { Member } from "@/components/dashboard/types";

type FeesTableProps = {
  members: Member[];
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

type FeeQuickFilter = "ALL" | "UNPAID" | "PAID";

export function FeesTable({
  members,
  selectedYear,
  onChangeYear,
  onToggleFee,
  onMarkAllPaid,
  onMarkAllUnpaid,
}: FeesTableProps) {
  const [quickFilter, setQuickFilter] =
    useState<FeeQuickFilter>("ALL");

  const filteredMembers = useMemo(() => {
    if (quickFilter === "ALL") {
      return members;
    }

    return members.filter((member) => {
      const paidMonths = Array.from(
        { length: 12 },
        (_, index) => index + 1
      ).filter((month) =>
        member.fees.some(
          (fee) =>
            fee.year === selectedYear &&
            fee.month === month &&
            fee.paid
        )
      ).length;

      if (quickFilter === "UNPAID") {
        return paidMonths < 12;
      }

      return paidMonths === 12;
    });
  }, [members, quickFilter, selectedYear]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">
            연도별 회비 관리
          </h3>
          <p className="text-sm text-slate-500">
            월별 납부 상태를 빠르게 체크할 수 있어요.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex gap-2">
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
              onClick={() => setQuickFilter("UNPAID")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                quickFilter === "UNPAID"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              미납 회원만
            </button>
            <button
              onClick={() => setQuickFilter("PAID")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                quickFilter === "PAID"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              전액 납부만
            </button>
          </div>

          <input
            type="number"
            value={selectedYear}
            onChange={(event) =>
              onChangeYear(Number(event.target.value))
            }
            className="w-28 rounded-2xl border border-slate-200 px-4 py-3 text-center font-semibold outline-none transition focus:border-sky-400"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1060px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-4 font-semibold">회원</th>
                {Array.from({ length: 12 }, (_, index) => (
                  <th
                    key={index}
                    className="px-2 py-4 text-center font-semibold"
                  >
                    {index + 1}월
                  </th>
                ))}
                <th className="px-4 py-4 font-semibold">일괄 처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-bold text-slate-900">
                    {member.name}
                  </td>
                  {Array.from({ length: 12 }, (_, index) => {
                    const month = index + 1;
                    const fee = member.fees.find(
                      (item) =>
                        item.year === selectedYear &&
                        item.month === month
                    );
                    const isPaid = Boolean(fee?.paid);

                    return (
                      <td
                        key={month}
                        className="px-2 py-4 text-center"
                      >
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
              ))}

              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    회비를 관리할 회원이 없습니다.
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
