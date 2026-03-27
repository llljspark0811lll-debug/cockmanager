"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Member,
  SpecialFee,
} from "@/components/dashboard/types";
import { formatDate, formatPhoneNumber } from "@/components/dashboard/utils";

type SpecialFeesPanelProps = {
  members: Member[];
  specialFees: SpecialFee[];
  onCreateFee: (payload: {
    title: string;
    amount: string;
    dueDate: string;
    description: string;
  }) => Promise<void>;
  onTogglePayment: (
    specialFeeId: number,
    memberId: number,
    paid: boolean
  ) => Promise<void>;
};

type SpecialFeeQuickFilter = "ALL" | "UNPAID";

const initialForm = {
  title: "",
  amount: "",
  dueDate: "",
  description: "",
};

export function SpecialFeesPanel({
  members,
  specialFees,
  onCreateFee,
  onTogglePayment,
}: SpecialFeesPanelProps) {
  const [form, setForm] = useState(initialForm);
  const [selectedFeeId, setSelectedFeeId] = useState<number | null>(
    specialFees[0]?.id ?? null
  );
  const [creating, setCreating] = useState(false);
  const [quickFilter, setQuickFilter] =
    useState<SpecialFeeQuickFilter>("ALL");

  useEffect(() => {
    if (!specialFees.length) {
      setSelectedFeeId(null);
      return;
    }

    const exists = specialFees.some(
      (specialFee) => specialFee.id === selectedFeeId
    );

    if (!exists) {
      setSelectedFeeId(specialFees[0].id);
    }
  }, [selectedFeeId, specialFees]);

  const selectedFee =
    specialFees.find((specialFee) => specialFee.id === selectedFeeId) ??
    null;

  const selectedPayments = useMemo(() => {
    if (!selectedFee) return [];

    const allRows = members.map((member) => {
      const payment = selectedFee.payments.find(
        (item) => item.memberId === member.id
      );

      return {
        member,
        payment,
        paid: payment?.paid ?? false,
      };
    });

    if (quickFilter === "UNPAID") {
      return allRows.filter((row) => !row.paid);
    }

    return allRows;
  }, [members, quickFilter, selectedFee]);

  async function handleCreate() {
    setCreating(true);
    try {
      await onCreateFee(form);
      setForm(initialForm);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "수시회비 생성에 실패했습니다.";
      alert(message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-900">
            수시회비 항목 만들기
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            대회 참가비, 단체복비, 코트 추가비처럼 일시적인 회비 항목을
            만들고 관리할 수 있어요.
          </p>

          <div className="mt-5 space-y-3">
            <input
              value={form.title}
              onChange={(event) =>
                setForm({
                  ...form,
                  title: event.target.value,
                })
              }
              placeholder="예: 봄철 대회 참가비"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            />
            <input
              type="number"
              value={form.amount}
              onChange={(event) =>
                setForm({
                  ...form,
                  amount: event.target.value,
                })
              }
              placeholder="금액"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            />
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm({
                  ...form,
                  dueDate: event.target.value,
                })
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            />
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({
                  ...form,
                  description: event.target.value,
                })
              }
              placeholder="비고 또는 안내"
              className="h-24 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {creating ? "생성 중..." : "수시회비 생성"}
          </button>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-900">
            수시회비 목록
          </h3>
          <div className="mt-4 space-y-3">
            {specialFees.map((specialFee) => {
              const paidCount = specialFee.payments.filter(
                (payment) => payment.paid
              ).length;

              return (
                <button
                  key={specialFee.id}
                  onClick={() => setSelectedFeeId(specialFee.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedFeeId === specialFee.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold">
                        {specialFee.title}
                      </p>
                      <p className="mt-2 text-sm opacity-80">
                        {specialFee.amount.toLocaleString()}원
                      </p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                      {paidCount}/{members.length} 납부
                    </span>
                  </div>
                </button>
              );
            })}

            {specialFees.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                아직 등록된 수시회비가 없습니다.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        {selectedFee ? (
          <>
            <div className="border-b border-slate-200 pb-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    {selectedFee.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    금액 {selectedFee.amount.toLocaleString()}원
                    {selectedFee.dueDate
                      ? ` · 납부기한 ${formatDate(selectedFee.dueDate)}`
                      : ""}
                  </p>
                </div>

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
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {selectedFee.description || "설명 없음"}
              </p>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-4 font-semibold">회원</th>
                      <th className="px-4 py-4 font-semibold">연락처</th>
                      <th className="px-4 py-4 font-semibold">납부 상태</th>
                      <th className="px-4 py-4 font-semibold">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPayments.map(({ member, paid }) => (
                      <tr key={member.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 font-bold text-slate-900">
                          {member.name}
                        </td>
                        <td className="px-4 py-4 text-slate-500">
                          {formatPhoneNumber(member.phone) || "-"}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              paid
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {paid ? "납부 완료" : "미납"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() =>
                              onTogglePayment(
                                selectedFee.id,
                                member.id,
                                paid
                              ).catch((error: Error) => {
                                alert(error.message);
                              })
                            }
                            className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                              paid
                                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {paid ? "미납으로 변경" : "납부 처리"}
                          </button>
                        </td>
                      </tr>
                    ))}

                    {selectedPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-12 text-center text-sm text-slate-400"
                        >
                          조건에 맞는 회원이 없습니다.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[360px] items-center justify-center rounded-[1.5rem] bg-slate-50 text-sm font-medium text-slate-400">
            먼저 수시회비 항목을 선택해주세요.
          </div>
        )}
      </section>
    </div>
  );
}
