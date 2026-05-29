"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_USERNAME_REGEX = /^[A-Za-z0-9]+$/;
const RESEND_COOLDOWN = 60;

export default function AdminSignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    clubName: "",
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
  });

  // 이메일 인증 상태
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(false);

  // 재발송 쿨다운 타이머
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

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

  // 이메일이 바뀌면 인증 상태 초기화
  function handleEmailChange(value: string) {
    setForm({ ...form, email: value });
    setCodeSent(false);
    setEmailVerified(false);
    setCode("");
    setCodeError("");
  }

  async function handleSendCode() {
    const email = form.email.trim().toLowerCase();
    if (!email) { setCodeError("이메일을 입력해 주세요."); return; }

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
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCodeError(data.error ?? "인증에 실패했습니다."); return; }
      setEmailVerified(true);
      setCodeError("");
    } catch {
      setCodeError("네트워크 오류가 발생했습니다.");
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!emailVerified) {
      alert("이메일 인증을 완료해 주세요.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (form.password.length < 6) {
      alert("비밀번호는 6자 이상으로 입력해 주세요.");
      return;
    }

    if (!ADMIN_USERNAME_REGEX.test(form.username.trim())) {
      alert("관리자 아이디는 영문과 숫자만 사용할 수 있습니다.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error ?? "클럽/소모임 생성에 실패했습니다.");
        return;
      }

      alert("클럽/소모임 생성이 완료되었습니다.");
      router.push("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-gray-100 px-4 pt-10 pb-[60vh]">
      <div className="mx-auto w-full max-w-[420px] rounded-2xl bg-white p-10 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">
          새 클럽/소모임 만들기
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            placeholder="클럽/소모임 이름"
            className="w-full rounded-lg border p-3"
            value={form.clubName}
            onChange={(e) => setForm({ ...form, clubName: e.target.value })}
          />
          <input
            placeholder="관리자 아이디"
            className="w-full rounded-lg border p-3"
            value={form.username}
            inputMode="text"
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <p className="-mt-2 text-xs leading-5 text-slate-500">
            관리자 아이디는 영문과 숫자만 사용할 수 있습니다.
          </p>
          <input
            type="password"
            placeholder="비밀번호"
            className="w-full rounded-lg border p-3"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            className="w-full rounded-lg border p-3"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />

          {/* 이메일 + 인증 영역 */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">이메일 인증</p>

            {/* 이메일 입력 + 발송 버튼 */}
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="관리자 이메일"
                className={`flex-1 rounded-lg border p-3 text-sm ${emailVerified ? "bg-emerald-50 border-emerald-300" : "bg-white"}`}
                value={form.email}
                disabled={emailVerified}
                onChange={(e) => handleEmailChange(e.target.value)}
              />
              {!emailVerified && (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || cooldown > 0 || !form.email.trim()}
                  className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendingCode ? "발송 중..." : cooldown > 0 ? `${cooldown}초` : codeSent ? "재발송" : "인증코드 발송"}
                </button>
              )}
              {emailVerified && (
                <div className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-600">
                  ✓ 인증 완료
                </div>
              )}
            </div>

            {/* 인증 코드 입력 */}
            {codeSent && !emailVerified && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  <span className="font-bold">{form.email}</span>로 인증 코드를 발송했습니다. (10분 이내 입력)
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="인증 코드 6자리"
                    maxLength={6}
                    className="flex-1 rounded-lg border p-3 text-sm tracking-widest"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || code.length !== 6}
                    className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {verifyingCode ? "확인 중..." : "인증 확인"}
                  </button>
                </div>
              </div>
            )}

            {codeError && (
              <p className="text-xs font-medium text-red-500">{codeError}</p>
            )}

            <p className="text-xs leading-5 text-slate-400">
              아이디/비밀번호 찾기와 비밀번호 재설정 메일을 받을 주소입니다.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !emailVerified}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "클럽/소모임 생성 중..." : "클럽/소모임 생성"}
          </button>
        </form>
      </div>
    </main>
  );
}
