"use client";

import { useState } from "react";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/lib/subscription";

const BANK_ACCOUNT = "카카오뱅크 3333-1114-9690-1";
const ACCOUNT_HOLDER = "박준성";

type SubscriptionModalProps = {
  clubName: string;
  onClose: () => void;
};

export function SubscriptionModal({ clubName, onClose }: SubscriptionModalProps) {
  const [step, setStep] = useState<"plan" | "account" | "done">("plan");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [depositorName, setDepositorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!selectedPlan || !depositorName.trim()) {
      setError("입금자명을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/subscription/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, depositorName: depositorName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">콕매니저🏸 구독 신청</h2>
          {step !== "done" && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
          )}
        </div>

        {step === "plan" && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="mb-2 font-bold text-emerald-700">지금도 무료</p>
                {["회원 관리", "가입 신청", "탈퇴 회원", "회비 관리", "운동 일정"].map(f => (
                  <p key={f} className="flex items-center gap-1 text-slate-700 leading-6">
                    <span className="text-emerald-500">✓</span> {f}
                  </p>
                ))}
              </div>
              <div className="rounded-2xl bg-sky-50 p-3">
                <p className="mb-2 font-bold text-sky-700">구독 시 사용</p>
                {["자동 대진", "활동 통계", "장부 관리"].map(f => (
                  <p key={f} className="flex items-center gap-1 text-slate-700 leading-6">
                    <span className="text-sky-400">🔒</span> {f}
                  </p>
                ))}
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {(Object.entries(SUBSCRIPTION_PLANS) as [SubscriptionPlan, typeof SUBSCRIPTION_PLANS[SubscriptionPlan]][]).map(
                ([key, plan]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`w-full rounded-2xl border-2 px-5 py-4 text-left transition ${
                      selectedPlan === key
                        ? "border-sky-500 bg-sky-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{plan.label}</span>
                      <span className="font-black text-sky-600">
                        {plan.amount.toLocaleString()}원
                      </span>
                    </div>
                    {key === "YEARLY" && (
                      <p className="mt-0.5 text-xs font-medium text-emerald-600">
                        월 환산 {Math.round(plan.amount / 12).toLocaleString()}원 · 가장 저렴해요
                      </p>
                    )}
                    {key === "QUARTERLY" && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        월 환산 {Math.round(plan.amount / 3).toLocaleString()}원
                      </p>
                    )}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => { if (selectedPlan) setStep("account"); }}
              disabled={!selectedPlan}
              className="mt-5 w-full rounded-2xl bg-sky-600 py-4 font-black text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
            >
              다음
            </button>
          </>
        )}

        {step === "account" && selectedPlan && (
          <>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">입금 계좌</p>
              <p className="mt-1 text-lg font-black text-slate-900">{BANK_ACCOUNT}</p>
              <p className="mt-0.5 text-sm text-slate-600">예금주: {ACCOUNT_HOLDER}</p>
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-sm font-medium text-slate-500">입금 금액</p>
                <p className="mt-1 text-xl font-black text-sky-600">
                  {SUBSCRIPTION_PLANS[selectedPlan].amount.toLocaleString()}원
                </p>
                <p className="text-xs text-slate-400">
                  ({SUBSCRIPTION_PLANS[selectedPlan].label} 구독)
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                입금자명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={depositorName}
                onChange={e => setDepositorName(e.target.value)}
                placeholder={`${clubName}`}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
              />
              <p className="mt-1 text-xs text-slate-400">
                입금자명 확인 후 12시간 이내로 처리됩니다.
              </p>
            </div>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setStep("plan")}
                className="flex-1 rounded-2xl border border-slate-200 py-3 font-medium text-slate-600 hover:bg-slate-50"
              >
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-2xl bg-sky-600 py-3 font-black text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {submitting ? "처리 중..." : "입금했어요 ✓"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="mt-8 text-center">
            <div className="text-5xl">✅</div>
            <p className="mt-4 font-bold text-slate-900">입금 신청 완료!</p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-2xl bg-sky-600 py-3 font-bold text-white hover:bg-sky-700"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
