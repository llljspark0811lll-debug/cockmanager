"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Member, SessionParticipant } from "@/components/dashboard/types";

type Tab = "member" | "guest";

const LEVELS = ["S", "A", "B", "C", "D", "E", "초심"];

type AdminRegisterModalProps = {
  open: boolean;
  sessionId: number;
  participants: SessionParticipant[];
  onClose: () => void;
  onSuccess: () => void;
};

function genderChipClass(gender: string, selected: boolean) {
  if (selected) {
    return gender === "남"
      ? "bg-sky-600 text-white border-sky-600"
      : "bg-rose-500 text-white border-rose-500";
  }
  return "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50";
}

function levelChipClass(level: string, selected: boolean) {
  if (!selected) return "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50";
  const map: Record<string, string> = {
    S: "bg-amber-500 text-white border-amber-500",
    A: "bg-emerald-600 text-white border-emerald-600",
    B: "bg-violet-600 text-white border-violet-600",
    C: "bg-orange-500 text-white border-orange-500",
    D: "bg-lime-600 text-white border-lime-600",
    E: "bg-slate-500 text-white border-slate-500",
    "초심": "bg-cyan-600 text-white border-cyan-600",
  };
  return map[level] ?? "bg-sky-600 text-white border-sky-600";
}

function genderBadge(gender: string) {
  if (gender === "남") return "border-sky-200 bg-sky-50 text-sky-700";
  if (gender === "여") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

function levelBadge(level: string) {
  const map: Record<string, string> = {
    S: "bg-amber-50 text-amber-700",
    A: "bg-emerald-50 text-emerald-700",
    B: "bg-violet-50 text-violet-700",
    C: "bg-orange-50 text-orange-700",
    D: "bg-lime-50 text-lime-700",
    E: "bg-slate-100 text-slate-600",
    "초심": "bg-cyan-50 text-cyan-700",
  };
  return map[level] ?? "bg-slate-100 text-slate-600";
}

export function AdminRegisterModal({
  open,
  sessionId,
  participants,
  onClose,
  onSuccess,
}: AdminRegisterModalProps) {
  const [tab, setTab] = useState<Tab>("member");
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [guestName, setGuestName] = useState("");
  const [guestGender, setGuestGender] = useState("");
  const [guestLevel, setGuestLevel] = useState("");
  const [hostMemberId, setHostMemberId] = useState<number | "">("");

  const searchRef = useRef<HTMLInputElement>(null);

  // fetch members once on open
  useEffect(() => {
    if (!open) return;
    setError("");
    setSuccessMsg("");
    setSearch("");
    setTab("member");
    resetGuestForm();

    setMembersLoading(true);
    fetch("/api/members", { credentials: "include" })
      .then((res) => res.json())
      .then((data: Member[]) => {
        setMembers(
          data.filter((m) => !m.deleted)
        );
      })
      .catch(() => setError("회원 목록을 불러오지 못했습니다."))
      .finally(() => setMembersLoading(false));
  }, [open]);

  useEffect(() => {
    if (open && tab === "member") {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, tab]);

  // precompute which memberIds are already active (REGISTERED or WAITLIST)
  const activeParticipantMemberIds = useMemo(() => {
    const ids = new Set<number>();
    for (const p of participants) {
      if (p.memberId && (p.status === "REGISTERED" || p.status === "WAITLIST")) {
        ids.add(p.memberId);
      }
    }
    return ids;
  }, [participants]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) =>
      !q || m.name.toLowerCase().includes(q)
    );
  }, [members, search]);

  function resetGuestForm() {
    setGuestName("");
    setGuestGender("");
    setGuestLevel("");
    setHostMemberId("");
  }

  async function handleAddMember(memberId: number) {
    setSubmitting(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/sessions/admin-register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, type: "member", memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "등록에 실패했습니다.");

      const label = data.status === "WAITLIST" ? "대기 등록" : "참석 등록";
      const member = members.find((m) => m.id === memberId);
      setSuccessMsg(`${member?.name ?? "회원"}님이 ${label}되었습니다.`);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddGuest() {
    if (!guestName.trim()) {
      setError("게스트 이름을 입력해주세요.");
      return;
    }
    if (!guestGender) {
      setError("성별을 선택해주세요.");
      return;
    }
    if (!guestLevel) {
      setError("급수를 선택해주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/sessions/admin-register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          type: "guest",
          guestName: guestName.trim(),
          guestGender,
          guestLevel,
          hostMemberId: hostMemberId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "등록에 실패했습니다.");

      const label = data.status === "WAITLIST" ? "대기 등록" : "참석 등록";
      setSuccessMsg(`${guestName.trim()}님(게스트)이 ${label}되었습니다.`);
      resetGuestForm();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/50"
        onClick={onClose}
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 pb-4 pt-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">참석자 직접 등록</h2>
            <p className="mt-0.5 text-xs text-slate-500">회원은 DB 정보 그대로 등록됩니다</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-slate-100 px-6 pt-3">
          {([["member", "회원 등록"], ["guest", "게스트 등록"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(""); setSuccessMsg(""); }}
              className={`rounded-t-lg px-4 py-2 text-sm font-bold transition ${
                tab === key
                  ? "border-b-2 border-sky-600 text-sky-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* feedback banners */}
        {successMsg ? (
          <div className="mx-6 mt-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
            ✓ {successMsg}
          </div>
        ) : null}
        {error ? (
          <div className="mx-6 mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">
            {error}
          </div>
        ) : null}

        {/* content */}
        {tab === "member" ? (
          <div className="flex flex-col overflow-hidden" style={{ maxHeight: "55vh" }}>
            {/* search */}
            <div className="px-6 py-3">
              <input
                ref={searchRef}
                type="text"
                placeholder="이름 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {/* member list */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {membersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  {search ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredMembers.map((member) => {
                    const alreadyActive = activeParticipantMemberIds.has(member.id);
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition ${
                          alreadyActive
                            ? "border-slate-100 bg-slate-50 opacity-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{member.name}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${genderBadge(member.gender)}`}>
                            {member.gender}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${levelBadge(member.level)}`}>
                            {member.level}
                          </span>
                        </div>
                        {alreadyActive ? (
                          <span className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500">
                            등록됨
                          </span>
                        ) : (
                          <button
                            disabled={submitting}
                            onClick={() => { handleAddMember(member.id).catch(() => undefined); }}
                            className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
                          >
                            추가
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto px-6 py-4 pb-6" style={{ maxHeight: "55vh" }}>
            {/* 이름 */}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  이름 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="게스트 이름"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              {/* 성별 */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">성별</label>
                <div className="flex gap-2">
                  {["남", "여"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGuestGender(guestGender === g ? "" : g)}
                      className={`rounded-2xl border px-5 py-2 text-sm font-bold transition ${genderChipClass(g, guestGender === g)}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* 급수 */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">급수</label>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map((lv) => (
                    <button
                      key={lv}
                      onClick={() => setGuestLevel(guestLevel === lv ? "" : lv)}
                      className={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${levelChipClass(lv, guestLevel === lv)}`}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
              </div>

              {/* 초대한 회원 */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  초대한 회원 <span className="text-slate-400 font-normal">(선택)</span>
                </label>
                <select
                  value={hostMemberId}
                  onChange={(e) => setHostMemberId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="">없음</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => { handleAddGuest().catch(() => undefined); }}
                disabled={submitting || !guestName.trim() || !guestGender || !guestLevel}
                className="w-full rounded-2xl bg-sky-600 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "등록 중..." : "게스트 추가"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
