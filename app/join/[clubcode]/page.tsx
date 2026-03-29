"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GENDERS, LEVELS } from "@/lib/dashboard-constants";
import { formatPhoneNumber } from "@/lib/phone";

type JoinConfig = {
  name: string;
  customFieldLabel: string;
  publicJoinToken: string;
};

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();

  const accessKey =
    typeof params.clubcode === "string"
      ? params.clubcode
      : params.clubcode?.[0];

  const [clubConfig, setClubConfig] = useState<JoinConfig>({
    name: "클럽",
    customFieldLabel: "차량번호",
    publicJoinToken: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    gender: "",
    phone: "",
    level: "",
    customFieldValue: "",
    note: "",
  });

  useEffect(() => {
    if (!accessKey) return;

    fetch(`/api/public/clubs/${accessKey}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.name) {
          setClubConfig({
            name: data.name,
            customFieldLabel: data.customFieldLabel ?? "차량번호",
            publicJoinToken: data.publicJoinToken ?? accessKey,
          });
        }
      })
      .catch(() => {
        setClubConfig({
          name: "클럽",
          customFieldLabel: "차량번호",
          publicJoinToken: accessKey ?? "",
        });
      });
  }, [accessKey]);

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    if (!clubConfig.publicJoinToken) {
      alert("가입 링크 정보가 올바르지 않습니다.");
      return;
    }

    if (!form.name.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }

    if (!form.gender) {
      alert("성별을 선택해주세요.");
      return;
    }

    if (!form.phone.trim()) {
      alert("연락처를 입력해주세요.");
      return;
    }

    if (!form.level) {
      alert("급수를 선택해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/member-request/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          birth: new Date().toISOString(),
          phone: formatPhoneNumber(form.phone),
          joinToken: clubConfig.publicJoinToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "가입 신청에 실패했습니다.");
        return;
      }

      alert("가입 신청이 완료되었습니다.");
      router.push("/");
    } catch {
      alert("가입 신청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-6 sm:p-6">
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
        <h2 className="mb-2 text-center text-2xl font-bold">
          {clubConfig.name} 가입 신청
        </h2>
        <p className="mb-6 text-center text-sm text-gray-500">
          회원 정보를 입력하면 운영진이 확인 후 승인합니다.
        </p>

        <div className="space-y-4">
          <input
            placeholder="이름"
            className="w-full rounded-lg border p-3"
            value={form.name}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-3">
            {GENDERS.map((gender) => (
              <button
                key={gender}
                type="button"
                className={`rounded-lg border py-3 text-sm font-semibold transition ${
                  form.gender === gender
                    ? gender === "남"
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-rose-500 bg-rose-500 text-white"
                    : "border-slate-200 bg-white text-gray-600"
                }`}
                onClick={() => setForm({ ...form, gender })}
              >
                {gender}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
            신청일은 오늘 날짜로 자동 기록됩니다.
          </div>

          <input
            placeholder="연락처"
            className="w-full rounded-lg border p-3"
            value={form.phone}
            onChange={(event) =>
              setForm({
                ...form,
                phone: formatPhoneNumber(event.target.value),
              })
            }
          />

          <select
            className="w-full rounded-lg border p-3"
            value={form.level}
            onChange={(event) =>
              setForm({ ...form, level: event.target.value })
            }
          >
            <option value="">급수 선택</option>
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          <input
            placeholder={clubConfig.customFieldLabel}
            className="w-full rounded-lg border p-3"
            value={form.customFieldValue}
            onChange={(event) =>
              setForm({
                ...form,
                customFieldValue: event.target.value,
              })
            }
          />

          <input
            placeholder="비고"
            className="w-full rounded-lg border p-3"
            value={form.note}
            onChange={(event) =>
              setForm({ ...form, note: event.target.value })
            }
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {submitting ? "가입 신청 중..." : "가입 신청하기"}
        </button>
      </div>
    </main>
  );
}
