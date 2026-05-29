"use client";

import { useEffect, useRef, useState } from "react";

const RESEND_COOLDOWN = 60;

type PersonalSettingsModalProps = {
  open: boolean;
  clubName: string;
  adminEmail: string;
  currentPassword: string;
  saving: boolean;
  onChangeClubName: (value: string) => void;
  onChangeAdminEmail: (value: string) => void;
  onChangeCurrentPassword: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onDeleteAccount: () => void;
};

export function PersonalSettingsModal({
  open,
  clubName,
  adminEmail,
  currentPassword,
  saving,
  onChangeClubName,
  onChangeAdminEmail,
  onChangeCurrentPassword,
  onClose,
  onSubmit,
  onDeleteAccount,
}: PersonalSettingsModalProps) {
  // 이메일 변경 인증 상태 (모달 내부 관리)
  const [emailEditMode, setEmailEditMode] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  // 모달 열릴 때 이메일 편집 상태 초기화
  useEffect(() => {
    if (open) {
      setEmailEditMode(false);
      setNewEmail("");
      setCodeSent(false);
      setCode("");
      setEmailVerified(false);
      setCodeError("");
      setCooldown(0);
    }
  }, [open]);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleStartEmailEdit() {
    setEmailEditMode(true);
    setNewEmail("");
    setCodeSent(false);
    setCode("");
    setEmailVerified(false);
    setCodeError("");
  }

  function handleCancelEmailEdit() {
    setEmailEditMode(false);
    setNewEmail("");
    setCodeSent(false);
    setCode("");
    setEmailVerified(false);
    setCodeError("");
    // 부모 상태도 원래 이메일로 복원
    onChangeAdminEmail(adminEmail);
  }

  async function handleSendCode() {
    const email = newEmail.trim().toLowerCase();
    if (!email) { setCodeError("변경할 이메일을 입력해 주세요."); return; }

    setSendingCode(true);
    setCodeError("");
    try {
      const res = await fetch("/api/admin/signup/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setCodeError(data.error ?? "발송에 실패했습니다."); return; }
      setCodeSent(true);
      setCode("");
      startCooldown();
    } catch {
      setCodeError("네트워크 오류가 발생했습니다.");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode() {
    if (!code.trim()) { setCodeError("인증 코드를 입력해 주세요."); return; }

    setVerifyingCode(true);
    setCodeError("");
    try {
      const res = await fetch("/api/admin/signup/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim().toLowerCase(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCodeError(data.error ?? "인증에 실패했습니다."); return; }
      setEmailVerified(true);
      setCodeError("");
      // 부모에게 인증 완료된 이메일 전달
      onChangeAdminEmail(newEmail.trim().toLowerCase());
    } catch {
      setCodeError("네트워크 오류가 발생했습니다.");
    } finally {
      setVerifyingCode(false);
    }
  }

  if (!open) return null;

  const isEmailChanged = emailEditMode;
  const canSubmit = !isEmailChanged || emailVerified;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm md:p-6">
      <div className="flex min-h-full items-start justify-center py-4 md:items-center">
        <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl md:max-h-[92vh]">
          <div className="border-b border-slate-100 px-6 pb-4 pt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              개인 설정
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              계정과 클럽 정보를 변경하세요
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              클럽/소모임명과 관리자 복구 이메일을 변경할 수 있습니다.
              안전한 변경을 위해 현재 비밀번호 확인이 필요합니다.
            </p>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">
                  클럽/소모임명
                </span>
                <input
                  value={clubName}
                  onChange={(e) => onChangeClubName(e.target.value)}
                  placeholder="예: 민턴클럽"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </label>

              {/* 이메일 영역 */}
              <div className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">
                  관리자 복구 이메일
                </span>

                {!emailEditMode ? (
                  // 현재 이메일 + 변경 버튼
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3">
                    <span className="flex-1 text-sm text-slate-700">{adminEmail || "미설정"}</span>
                    <button
                      type="button"
                      onClick={handleStartEmailEdit}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      변경
                    </button>
                  </div>
                ) : (
                  // 이메일 변경 인증 영역
                  <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-sky-700">이메일 변경 인증</p>
                      <button
                        type="button"
                        onClick={handleCancelEmailEdit}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        취소
                      </button>
                    </div>

                    {!emailVerified ? (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            placeholder="변경할 이메일 주소"
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                            value={newEmail}
                            onChange={(e) => {
                              setNewEmail(e.target.value);
                              setCodeSent(false);
                              setCode("");
                              setCodeError("");
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleSendCode}
                            disabled={sendingCode || cooldown > 0 || !newEmail.trim()}
                            className="shrink-0 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {sendingCode ? "발송 중..." : cooldown > 0 ? `${cooldown}초` : codeSent ? "재발송" : "인증코드 발송"}
                          </button>
                        </div>

                        {codeSent && (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500">
                              <span className="font-bold">{newEmail}</span>로 인증 코드를 발송했습니다.
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="인증 코드 6자리"
                                maxLength={6}
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm tracking-widest outline-none focus:border-sky-400"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                              />
                              <button
                                type="button"
                                onClick={handleVerifyCode}
                                disabled={verifyingCode || code.length !== 6}
                                className="shrink-0 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {verifyingCode ? "확인 중..." : "인증 확인"}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                        <span className="text-sm font-bold text-emerald-700">✓ 인증 완료</span>
                        <span className="text-sm text-emerald-600">— {newEmail}</span>
                      </div>
                    )}

                    {codeError && (
                      <p className="text-xs font-medium text-red-500">{codeError}</p>
                    )}
                  </div>
                )}
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">
                  현재 비밀번호
                </span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => onChangeCurrentPassword(e.target.value)}
                  placeholder="현재 로그인 비밀번호를 입력하세요"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </label>

              {isEmailChanged && !emailVerified && (
                <p className="text-xs font-medium text-amber-600">
                  이메일을 변경하려면 인증을 완료해 주세요.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 border-t border-slate-100 px-6 py-5">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={onSubmit}
              disabled={saving || !canSubmit}
              className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "저장 중..." : "변경 저장"}
            </button>
          </div>

          <div className="border-t border-dashed border-rose-200 bg-rose-50/60 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-rose-700">계정 탈퇴</p>
                <p className="mt-0.5 text-xs text-rose-400">클럽과 모든 데이터가 영구 삭제됩니다</p>
              </div>
              <button
                onClick={onDeleteAccount}
                className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition hover:border-rose-400 hover:bg-rose-600 hover:text-white"
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
