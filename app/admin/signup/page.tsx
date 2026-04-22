"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    clubName: "",
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

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
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "클럽/소모임 생성에 실패했습니다.");
        return;
      }

      alert("클럽/소모임 생성이 완료되었습니다.");
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-10 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">
          새 클럽/소모임 만들기
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            placeholder="클럽/소모임 이름"
            className="w-full rounded-lg border p-3"
            value={form.clubName}
            onChange={(event) =>
              setForm({
                ...form,
                clubName: event.target.value,
              })
            }
          />
          <input
            placeholder="관리자 아이디"
            className="w-full rounded-lg border p-3"
            value={form.username}
            onChange={(event) =>
              setForm({
                ...form,
                username: event.target.value,
              })
            }
          />
          <input
            type="password"
            placeholder="비밀번호"
            className="w-full rounded-lg border p-3"
            value={form.password}
            onChange={(event) =>
              setForm({
                ...form,
                password: event.target.value,
              })
            }
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            className="w-full rounded-lg border p-3"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm({
                ...form,
                confirmPassword: event.target.value,
              })
            }
          />
          <div className="space-y-2">
            <input
              type="email"
              placeholder="관리자 이메일"
              className="w-full rounded-lg border p-3"
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email: event.target.value,
                })
              }
            />
            <p className="text-xs leading-5 text-slate-500">
              아이디/비밀번호 찾기와 비밀번호 재설정 메일을 받는 주소입니다.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "클럽/소모임 생성 중..." : "클럽/소모임 생성"}
          </button>
        </form>
      </div>
    </main>
  );
}
