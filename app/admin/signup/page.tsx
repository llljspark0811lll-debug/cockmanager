"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_USERNAME_REGEX = /^[a-z0-9]+$/;
const RESEND_COOLDOWN = 60;

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

export default function AdminSignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    clubName: "",
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
  });

  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const normalizedUsername = useMemo(
    () => form.username.trim().toLowerCase(),
    [form.username]
  );

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  useEffect(() => {
    if (!normalizedUsername) {
      setUsernameStatus("idle");
      setUsernameMessage("영문 소문자와 숫자만 사용할 수 있습니다.");
      return;
    }

    if (!ADMIN_USERNAME_REGEX.test(normalizedUsername)) {
      setUsernameStatus("invalid");
      setUsernameMessage("관리자 아이디는 영문 소문자와 숫자만 사용할 수 있습니다.");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      setUsernameMessage("아이디를 확인하는 중입니다.");

      try {
        const res = await fetch(
          `/api/admin/check-username?username=${encodeURIComponent(normalizedUsername)}`,
          { signal: controller.signal }
        );
        const data = await res.json();

        if (!res.ok) {
          setUsernameStatus("invalid");
          setUsernameMessage(data.error ?? "아이디를 확인할 수 없습니다.");
          return;
        }

        if (data.available) {
          setUsernameStatus("available");
          setUsernameMessage("사용 가능한 관리자 아이디입니다.");
        } else {
          setUsernameStatus("taken");
          setUsernameMessage("이미 사용 중인 관리자 아이디입니다.");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setUsernameStatus("error");
        setUsernameMessage("아이디 확인 중 오류가 발생했습니다.");
      }
    }, 500);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [normalizedUsername]);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleEmailChange(value: string) {
    setForm({ ...form, email: value });
    setCodeSent(false);
    setEmailVerified(false);
    setCode("");
    setCodeError("");
  }

  function handleUsernameChange(value: string) {
    setForm({ ...form, username: value.trim().toLowerCase() });
  }

  async function handleSendCode() {
    const email = form.email.trim().toLowerCase();
    if (!email) {
      setCodeError("이메일을 입력해주세요.");
      return;
    }

    setSendingCode(true);
    setCodeError("");
    try {
      const res = await fetch("/api/admin/signup/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error ?? "인증 코드 발송에 실패했습니다.");
        return;
      }
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
    if (!code.trim()) {
      setCodeError("인증 코드를 입력해주세요.");
      return;
    }

    setVerifyingCode(true);
    setCodeError("");
    try {
      const res = await fetch("/api/admin/signup/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error ?? "인증에 실패했습니다.");
        return;
      }
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

    if (usernameStatus !== "available") {
      alert("사용 가능한 관리자 아이디를 입력해주세요.");
      return;
    }

    if (!emailVerified) {
      alert("이메일 인증을 완료해주세요.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (form.password.length < 6) {
      alert("비밀번호는 6자 이상으로 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, username: normalizedUsername }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error ?? "클럽 생성에 실패했습니다.");
        return;
      }

      alert("클럽 생성이 완료되었습니다.");
      router.push("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  }

  const usernameHelpClass =
    usernameStatus === "available"
      ? "text-emerald-600"
      : usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "error"
        ? "text-red-500"
        : "text-slate-500";

  return (
    <main className="bg-gray-100 px-4 pt-10 pb-[60vh]">
      <div className="mx-auto w-full max-w-[420px] rounded-2xl bg-white p-10 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">
          클럽/소모임 만들기
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            placeholder="클럽/소모임 이름"
            className="w-full rounded-lg border p-3"
            value={form.clubName}
            onChange={(e) => setForm({ ...form, clubName: e.target.value })}
          />

          <div className="space-y-1">
            <input
              placeholder="관리자 아이디"
              className="w-full rounded-lg border p-3"
              value={form.username}
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(e) => handleUsernameChange(e.target.value)}
            />
            <p className={`text-xs leading-5 ${usernameHelpClass}`}>
              {usernameMessage || "영문 소문자와 숫자만 사용할 수 있습니다."}
            </p>
          </div>

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

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">이메일 인증</p>

            <div className="flex gap-2">
              <input
                type="email"
                placeholder="관리자 이메일"
                className={`flex-1 rounded-lg border p-3 text-sm ${emailVerified ? "border-emerald-300 bg-emerald-50" : "bg-white"}`}
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
                  인증 완료
                </div>
              )}
            </div>

            {codeSent && !emailVerified && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  <span className="font-bold">{form.email}</span>로 인증 코드를 발송했습니다. 10분 이내에 입력해주세요.
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
            disabled={loading || !emailVerified || usernameStatus !== "available"}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "클럽 생성 중..." : "클럽 생성"}
          </button>
        </form>
      </div>
    </main>
  );
}
