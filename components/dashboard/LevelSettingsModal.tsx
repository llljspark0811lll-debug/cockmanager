"use client";

import { useEffect, useState } from "react";
import type { ClubLevel } from "@/components/dashboard/types";
import { DEFAULT_LEVEL_NAMES } from "@/lib/dashboard-constants";
import { getLevelTextClasses } from "@/components/dashboard/utils";

type LevelSettingsModalProps = {
  open: boolean;
  levels: ClubLevel[];
  onClose: () => void;
  onSave: (levels: ClubLevel[]) => Promise<void>;
};

export function LevelSettingsModal({
  open,
  levels,
  onClose,
  onSave,
}: LevelSettingsModalProps) {
  const [names, setNames] = useState<string[]>(() =>
    levels.map((l) => l.name)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNames(
        Array.from({ length: 7 }, (_, i) =>
          levels[i]?.name || DEFAULT_LEVEL_NAMES[i] || String(i + 1)
        )
      );
    }
  }, [open, levels]);

  if (!open) return null;

  function handleChange(index: number, value: string) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(
        levels.map((l, i) => ({
          rank: l.rank,
          name: names[i]?.trim() || DEFAULT_LEVEL_NAMES[i] || String(i + 1),
        }))
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const RANK_LABELS = [
    "1등급 (최상)",
    "2등급",
    "3등급",
    "4등급",
    "5등급",
    "6등급",
    "7등급 (최하)",
  ];

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm md:p-6">
      <div className="flex min-h-full items-start justify-center py-4 md:items-center">
        <div className="flex w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
          <div className="border-b border-slate-100 px-6 pb-4 pt-6">
            <h2 className="text-2xl font-black text-slate-900">급수 설정</h2>
            <p className="mt-2 text-sm text-slate-500">
              급수명을 수정할 수 있습니다. 순서는 고정이며, 각 급수의 이름만 변경할 수 있습니다.
            </p>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              {levels.map((level, index) => (
                <div
                  key={level.rank}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <span className={`w-24 shrink-0 text-xs font-extrabold ${getLevelTextClasses(String(level.rank))}`}>
                    {RANK_LABELS[index]}
                  </span>
                  <input
                    value={names[index] ?? ""}
                    onChange={(e) => handleChange(index, e.target.value)}
                    maxLength={10}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400"
                  />
                </div>
              ))}
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
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
