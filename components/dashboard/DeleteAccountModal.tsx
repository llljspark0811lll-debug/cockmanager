"use client";

import { useState } from "react";

type DeleteAccountModalProps = {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteAccountModal({ open, onClose, onDeleted }: DeleteAccountModalProps) {
  const [step, setStep] = useState<"warn" | "confirm">("warn");
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleClose() {
    if (submitting) return;
    onClose();
    setTimeout(() => {
      setStep("warn");
      setPassword("");
      setConfirmText("");
      setError("");
    }, 200);
  }

  async function handleDelete() {
    if (confirmText !== "탈퇴") {
      setError("'탈퇴'를 정확히 입력해주세요.");
      return;
    }
    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/delete-account", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm: confirmText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "탈퇴에 실패했습니다.");
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "탈퇴에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-md rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
        {step === "warn" ? (
          <>
            {/* 경고 헤더 */}
            <div className="flex flex-col items-center px-6 pb-2 pt-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
                <svg className="h-8 w-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-black text-slate-900">정말로 탈퇴하시겠어요?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                이 작업은 <span className="font-bold text-rose-600">되돌릴 수 없습니다</span>
              </p>
            </div>

            {/* 삭제될 데이터 목록 */}
            <div className="mx-6 mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-rose-500">삭제되는 데이터</p>
              <ul className="space-y-2">
                {[
                  ["👥", "전체 회원 정보 및 가입 이력"],
                  ["💰", "회비·특별회비 납부 내역 전체"],
                  ["📅", "모든 운동 일정 및 참석 현황"],
                  ["🏸", "대진표 기록 전체"],
                  ["⚙️", "클럽 설정 및 관리자 계정"],
                ].map(([icon, text]) => (
                  <li key={text} className="flex items-center gap-2.5 text-sm font-semibold text-rose-700">
                    <span className="text-base">{icon}</span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 px-6 py-5">
              <button
                onClick={handleClose}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={() => setStep("confirm")}
                className="flex-1 rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
              >
                계속 진행
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 최종 확인 헤더 */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 pb-4 pt-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">최종 확인</h2>
                <p className="mt-0.5 text-xs text-slate-500">비밀번호 확인 후 계정이 삭제됩니다</p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {/* 비밀번호 */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  현재 비밀번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력해주세요"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>

              {/* 탈퇴 타이핑 확인 */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  아래 칸에 <span className="rounded bg-rose-100 px-1.5 py-0.5 font-black text-rose-600">탈퇴</span>를 입력하세요
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="탈퇴"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => { setStep("warn"); setError(""); }}
                disabled={submitting}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                이전
              </button>
              <button
                onClick={() => { handleDelete().catch(() => undefined); }}
                disabled={submitting || confirmText !== "탈퇴" || !password}
                className="flex-1 rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "탈퇴 처리 중..." : "계정 영구 삭제"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
