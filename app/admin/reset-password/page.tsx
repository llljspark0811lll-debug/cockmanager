"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ?? "복구 메일 전송에 실패했습니다."
        );
        return;
      }

      if (data.debugResetUrl) {
        alert(
          `개발 환경에서 메일 설정이 없어 재설정 링크를 화면에 표시합니다.\n\n${data.debugResetUrl}`
        );
      } else {
        alert(
          "입력한 이메일이 등록되어 있다면 아이디 안내와 비밀번호 재설정 메일을 보냈습니다."
        );
      }

      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-10 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">
          아이디 / 비밀번호 찾기
        </h1>

        <p className="mb-3 text-center text-sm text-gray-500">
          관리자 이메일을 입력하면 아이디 안내와 비밀번호 재설정 메일을 보내드립니다.
        </p>
        <p className="mb-6 text-center text-xs leading-5 text-slate-400">
          클럽 생성 시 등록한 관리자 이메일이 필요합니다.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="관리자 이메일"
            className="w-full rounded-lg border p-3"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "메일 전송 중..." : "메일 보내기"}
          </button>
        </form>

        <button
          type="button"
          className="mt-6 block w-full text-center text-sm text-gray-500 hover:underline"
          onClick={() => router.push("/admin/login")}
        >
          로그인으로 돌아가기
        </button>
      </div>
    </main>
  );
}
