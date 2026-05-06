"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AdminResetPasswordTokenPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
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
      const response = await fetch("/api/admin/recovery/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          newPassword: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ?? "비밀번호 재설정에 실패했습니다."
        );
        return;
      }

      alert(
        "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요."
      );
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-10 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">
          새 비밀번호 설정
        </h1>

        <p className="mb-6 text-center text-sm text-gray-500">
          이메일로 받은 링크에서 새 비밀번호를 설정해주세요.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="새 비밀번호"
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
            placeholder="새 비밀번호 확인"
            className="w-full rounded-lg border p-3"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm({
                ...form,
                confirmPassword: event.target.value,
              })
            }
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "재설정 중..." : "비밀번호 재설정"}
          </button>
        </form>
      </div>
    </main>
  );
}
