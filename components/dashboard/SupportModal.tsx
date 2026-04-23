"use client";

import { useState } from "react";

const CATEGORIES = ["사용방법 문의", "기능 추가 요구", "버그 제보", "기타"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_META: Record<Category, { emoji: string; placeholder: string }> = {
  "사용방법 문의": {
    emoji: "💬",
    placeholder: "어떤 기능이 궁금하신가요? 최대한 상세히 알려주시면 빠르게 도움드릴게요.",
  },
  "기능 추가 요구": {
    emoji: "✨",
    placeholder: "어떤 기능이 있으면 좋을 것 같으신가요? 운영 중 불편한 점과 함께 알려주세요.",
  },
  "버그 제보": {
    emoji: "🐛",
    placeholder: "어떤 상황에서 문제가 발생했나요? 어떤 화면에서, 어떤 동작을 했을 때 문제가 생겼는지 알려주시면 빠르게 수정할게요.",
  },
  "기타": {
    emoji: "📝",
    placeholder: "자유롭게 문의 내용을 적어주세요.",
  },
};

const MAX_LENGTH = 2000;

type SupportModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SupportModal({ open, onClose }: SupportModalProps) {
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function handleClose() {
    onClose();
    // 닫힌 뒤 상태 초기화 (애니메이션 끝나고)
    setTimeout(() => {
      setCategory(null);
      setMessage("");
      setError("");
      setSent(false);
    }, 200);
  }

  async function handleSubmit() {
    if (!category) { setError("문의 유형을 선택해주세요."); return; }
    if (!message.trim()) { setError("문의 내용을 입력해주세요."); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "전송에 실패했습니다.");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "전송에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/50" onClick={handleClose} />

      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 pb-4 pt-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">문의 / 요청</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              보내주신 내용을 확인 후 이메일로 답변드립니다 (1–2 영업일)
            </p>
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

        {sent ? (
          /* 전송 완료 화면 */
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              ✓
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">문의가 접수되었습니다</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              확인 후 등록하신 이메일로 답변드릴게요.
              <br />
              보통 1–2 영업일 이내에 답변드립니다.
            </p>
            <button
              onClick={handleClose}
              className="mt-8 w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              닫기
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto px-6 py-5 pb-6" style={{ maxHeight: "70vh" }}>
            {/* 문의 유형 */}
            <div>
              <p className="mb-2 text-xs font-bold text-slate-700">문의 유형</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const selected = category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => { setCategory(cat); setError(""); }}
                      className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                        selected
                          ? "border-sky-500 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-base">{meta.emoji}</span>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 문의 내용 */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">문의 내용</p>
                <span className={`text-xs font-medium ${message.length > MAX_LENGTH * 0.9 ? "text-rose-500" : "text-slate-400"}`}>
                  {message.length}/{MAX_LENGTH}
                </span>
              </div>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                placeholder={category ? CATEGORY_META[category].placeholder : "먼저 문의 유형을 선택해주세요."}
                disabled={!category}
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            {/* 에러 */}
            {error ? (
              <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">
                {error}
              </div>
            ) : null}

            {/* 전송 버튼 */}
            <button
              onClick={() => { handleSubmit().catch(() => undefined); }}
              disabled={submitting || !category || !message.trim()}
              className="mt-4 w-full rounded-2xl bg-sky-600 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "전송 중..." : "문의 보내기"}
            </button>

            <p className="mt-3 text-center text-xs text-slate-400">
              등록된 관리자 이메일로 직접 답변드립니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
