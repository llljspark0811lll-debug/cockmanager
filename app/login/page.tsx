"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const savedUsername = localStorage.getItem("lastLoginUsername");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  // ✅ 엔터키 대응을 위해 e: React.FormEvent 추가 및 preventDefault 실행
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // 폼 제출 시 페이지 새로고침 방지

    if (!username || !password) {
      setError("아이디와 비밀번호를 입력하세요.");
      return;
    }

    try {
      setError("");

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || "로그인에 실패했습니다.");
        return;
      }

      const data = await res.json();

      // ✅ 로컬 스토리지 저장 (custom1Label 포함)
      localStorage.setItem("adminUsername", data.username);
      localStorage.setItem("adminId", String(data.id));
      localStorage.setItem("lastLoginUsername", data.username);
      localStorage.setItem("custom1Label", data.custom1Label || "차량번호");

      router.push("/main");
    } catch (e) {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      {/* ✅ div 대신 form 태그를 사용하고 onSubmit 연결 */}
      <form 
        onSubmit={handleLogin}
        className="bg-white p-10 rounded-2xl shadow-lg w-[400px] text-center"
      >
        <h1 className="text-2xl font-bold mb-4 text-gray-600">
          🏸 전국 배드민턴 클럽 <br/>
          운영 관리 시스템
        </h1>

        <input
          type="text"
          placeholder="아이디"
          className="w-full border p-2 rounded mb-3 text-gray-900 placeholder:text-gray-500 focus:outline-blue-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="비밀번호"
          className="w-full border p-2 rounded mb-3 text-gray-900 placeholder:text-gray-500 focus:outline-blue-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}

        {/* ✅ button 타입을 submit으로 설정 */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          로그인
        </button>
      </form>
    </main>
  );
}