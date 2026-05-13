"use client";

import { useState } from "react";
import type { ClubPosition } from "@/components/dashboard/types";

type PositionSettingsModalProps = {
  open: boolean;
  positions: ClubPosition[];
  onClose: () => void;
  onPositionAdd: (name: string) => Promise<void>;
  onPositionRename: (id: number, name: string) => Promise<void>;
  onPositionDelete: (id: number) => Promise<void>;
  onPositionReorder: (positions: { id: number; order: number }[]) => Promise<void>;
};

export function PositionSettingsModal({
  open,
  positions,
  onClose,
  onPositionAdd,
  onPositionRename,
  onPositionDelete,
  onPositionReorder,
}: PositionSettingsModalProps) {
  const [newPositionName, setNewPositionName] = useState("");
  const [addingPosition, setAddingPosition] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [positionActionLoading, setPositionActionLoading] = useState(false);

  if (!open) return null;

  async function handleAdd() {
    const name = newPositionName.trim();
    if (!name) return;
    setAddingPosition(true);
    try {
      await onPositionAdd(name);
      setNewPositionName("");
    } finally {
      setAddingPosition(false);
    }
  }

  async function handleRename(id: number) {
    const name = editingName.trim();
    if (!name) return;
    setPositionActionLoading(true);
    try {
      await onPositionRename(id, name);
      setEditingId(null);
    } finally {
      setPositionActionLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("이 직위를 삭제하면 해당 직위로 지정된 회원이 미지정으로 변경됩니다. 계속할까요?")) return;
    setPositionActionLoading(true);
    try {
      await onPositionDelete(id);
    } finally {
      setPositionActionLoading(false);
    }
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const next = [...positions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    const reordered = next.map((p, i) => ({ id: p.id, order: i }));
    setPositionActionLoading(true);
    try {
      await onPositionReorder(reordered);
    } finally {
      setPositionActionLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm md:p-6">
      <div className="flex min-h-full items-start justify-center py-4 md:items-center">
        <div className="flex w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
          <div className="border-b border-slate-100 px-6 pb-4 pt-6">
            <h2 className="text-2xl font-black text-slate-900">직위 설정</h2>
            <p className="mt-2 text-sm text-slate-500">
              직위를 추가·수정·삭제하고 순서를 변경할 수 있습니다.
              직위 순서가 회원 목록 정렬 기준이 됩니다.
            </p>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              {positions.map((position, index) => (
                <div
                  key={position.id}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => void handleMove(index, "up")}
                      disabled={index === 0 || positionActionLoading}
                      className="rounded px-1 py-0.5 text-slate-400 transition hover:text-slate-700 disabled:opacity-30"
                      title="위로"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => void handleMove(index, "down")}
                      disabled={index === positions.length - 1 || positionActionLoading}
                      className="rounded px-1 py-0.5 text-slate-400 transition hover:text-slate-700 disabled:opacity-30"
                      title="아래로"
                    >
                      ▼
                    </button>
                  </div>

                  {editingId === position.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRename(position.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="min-w-0 flex-1 rounded-xl border border-sky-400 px-3 py-1.5 text-sm outline-none"
                    />
                  ) : (
                    <span className="flex-1 text-sm font-bold text-slate-800">
                      {position.name}
                    </span>
                  )}

                  {editingId === position.id ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => void handleRename(position.id)}
                        disabled={positionActionLoading}
                        className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setEditingId(position.id);
                          setEditingName(position.name);
                        }}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => void handleDelete(position.id)}
                        disabled={positionActionLoading}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {positions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                  등록된 직위가 없습니다.
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={newPositionName}
                onChange={(e) => setNewPositionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAdd();
                }}
                placeholder="새 직위 이름 입력"
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
              />
              <button
                onClick={() => void handleAdd()}
                disabled={addingPosition || !newPositionName.trim()}
                className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingPosition ? "추가 중..." : "추가"}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 px-6 py-5">
            <button
              onClick={onClose}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
