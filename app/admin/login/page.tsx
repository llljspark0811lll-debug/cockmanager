"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const LAST_LOGIN_ID_KEY = "admin-last-username";

export default function AdminLoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [checkingAutoLogin, setCheckingAutoLogin] =
    useState(true);

  useEffect(() => {
    const savedUsername =
      window.localStorage.getItem(LAST_LOGIN_ID_KEY) ?? "";

    if (savedUsername) {
      setForm((current) => ({
        ...current,
        username: savedUsername,
      }));
    }

    fetch("/api/club-info", {
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          router.replace("/admin/dashboard");
        }
      })
      .finally(() => {
        setCheckingAutoLogin(false);
      });
  }, [router]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "로그인에 실패했습니다.");
        return;
      }

      window.localStorage.setItem(
        LAST_LOGIN_ID_KEY,
        form.username.trim()
      );
      router.push("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAutoLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="rounded-2xl bg-white px-8 py-6 text-sm font-semibold text-slate-500 shadow-xl">
          로그인 상태를 확인하는 중입니다...
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-10 shadow-xl">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          콕매니저 관리자 로그인
        </h1>

        <p className="mb-6 text-center text-sm text-gray-500">
          클럽/소모임 관리자 전용 로그인 페이지입니다.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            value={form.username}
            placeholder="아이디"
            className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(event) =>
              setForm({
                ...form,
                username: event.target.value,
              })
            }
          />

          <input
            type="password"
            value={form.password}
            placeholder="비밀번호"
            className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(event) =>
              setForm({
                ...form,
                password: event.target.value,
              })
            }
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p
          className="mt-6 cursor-pointer text-center text-sm text-gray-500 hover:underline"
          onClick={() => router.push("/admin/signup")}
        >
          클럽 / 소모임이 없나요? 새로 만들기
        </p>
        <p
          className="mt-3 cursor-pointer text-center text-sm text-gray-500 hover:underline"
          onClick={() => router.push("/admin/reset-password")}
        >
          아이디 / 비밀번호를 잊으셨나요?
        </p>
      </div>
    </main>
  );
}
