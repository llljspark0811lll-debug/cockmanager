"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Participant = {
  id: number;
  type: "MEMBER" | "GUEST";
  name: string;
  age: number | null;
  gender: string | null;
  level: string | null;
  hostMemberName?: string | null;
};

type SessionData = {
  id: number;
  publicToken: string;
  notice: string;
  title: string;
  description: string | null;
  location: string | null;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  status: string;
  clubName: string;
  joinToken: string | null;
  registeredCount: number;
  waitlistCount: number;
  registeredMemberCount: number;
  registeredGuestCount: number;
  waitlistMemberCount: number;
  waitlistGuestCount: number;
  registeredParticipants: Participant[];
  waitlistedParticipants: Participant[];
  absentParticipants: Participant[];
  pendingMembers: { id: number; name: string }[];
};

type SessionComment = {
  id: number;
  content: string;
  createdAt: string;
  member: {
    id: number;
    name: string;
  };
};

type GuestDraft = {
  name: string;
  age: string;
  gender: string;
  level: string;
};

type IdentifiedMember = {
  id: number;
  name: string;
  currentStatus: "NONE" | "REGISTERED" | "WAITLIST" | "CANCELED";
  guests: GuestDraft[];
};

type BoardGroup = {
  genderLabel: string;
  genderKey: "남" | "여" | "기타";
  participants: Participant[];
  levels: Array<{
    level: string;
    participants: Participant[];
  }>;
};

const LEVELS = ["S", "A", "B", "C", "D", "E", "초심"];
const GENDERS = ["남", "여"];
const MAX_GUESTS = 5;

function emptyGuest(): GuestDraft {
  return { name: "", age: "", gender: "", level: "" };
}

function storageKey(joinToken: string) {
  return `public-session-member:club:${joinToken}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeGender(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["남", "남자", "m", "male"].includes(normalized)) return "남";
  if (["여", "여자", "f", "female"].includes(normalized)) return "여";
  return "기타";
}

function normalizeLevel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized || "미정";
}

function levelRank(level: string) {
  const index = LEVELS.indexOf(level);
  return index === -1 ? LEVELS.length : index;
}

function compareParticipants(left: Participant, right: Participant) {
  const diff =
    levelRank(normalizeLevel(left.level)) - levelRank(normalizeLevel(right.level));
  if (diff !== 0) return diff;
  return left.name.localeCompare(right.name, "ko");
}

function buildBoard(participants: Participant[]): BoardGroup[] {
  const sorted = [...participants].sort(compareParticipants);
  const genders: Array<"남" | "여" | "기타"> = ["남", "여", "기타"];

  return genders
    .map((genderKey) => {
      const sameGender = sorted.filter(
        (participant) => normalizeGender(participant.gender) === genderKey
      );
      if (sameGender.length === 0) return null;

      const levels = [...new Set(sameGender.map((item) => normalizeLevel(item.level)))]
        .sort((a, b) => levelRank(a) - levelRank(b))
        .map((level) => ({
          level,
          participants: sameGender.filter(
            (participant) => normalizeLevel(participant.level) === level
          ),
        }));

      return {
        genderLabel: genderKey === "기타" ? "기타/미정" : genderKey,
        genderKey,
        participants: sameGender,
        levels,
      };
    })
    .filter((group): group is BoardGroup => Boolean(group));
}

function genderBadgeClass(gender: string | null | undefined) {
  const normalized = normalizeGender(gender);
  if (normalized === "남") return "border-sky-200 bg-sky-50 text-sky-700";
  if (normalized === "여") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function levelChipClass(level: string | null | undefined) {
  const normalized = normalizeLevel(level);
  if (normalized === "S") return "bg-amber-50 text-amber-700";
  if (normalized === "A") return "bg-emerald-50 text-emerald-700";
  if (normalized === "B") return "bg-violet-50 text-violet-700";
  if (normalized === "C") return "bg-orange-50 text-orange-700";
  if (normalized === "D") return "bg-lime-50 text-lime-700";
  if (normalized === "E") return "bg-slate-100 text-slate-700";
  if (normalized === "초심") return "bg-cyan-50 text-cyan-700";
  return "bg-slate-100 text-slate-600";
}

function StatChip({
  label,
  accent = "default",
}: {
  label: string;
  accent?: "default" | "male" | "female" | "level";
}) {
  const classes =
    accent === "male"
      ? "bg-sky-50 text-sky-700"
      : accent === "female"
      ? "bg-rose-50 text-rose-700"
      : accent === "level"
      ? "bg-violet-50 text-violet-700"
      : "bg-slate-100 text-slate-700";

  return (
    <div className={`rounded-full px-4 py-2 text-sm font-bold ${classes}`}>
      {label}
    </div>
  );
}

function ageGroupLabel(age: number | null): string {
  if (!age) return "나이 미정";
  if (age <= 29) return "10/20대";
  if (age <= 39) return "30대";
  if (age <= 49) return "40대";
  if (age <= 59) return "50대";
  return "60대";
}

function ParticipantCard({ participant }: { participant: Participant }) {
  const isGuest = participant.type === "GUEST";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-900">{participant.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            {isGuest
              ? `${ageGroupLabel(participant.age)} · 게스트`
              : "회원"}
          </div>
          {isGuest && participant.hostMemberName && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
              <span>🤝</span>
              <span>동반 회원 {participant.hostMemberName}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${genderBadgeClass(
              participant.gender
            )}`}
          >
            {normalizeGender(participant.gender)}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${levelChipClass(
              participant.level
            )}`}
          >
            {normalizeLevel(participant.level)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-6 w-6 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function PendingMembersSection({
  members,
}: {
  members: { id: number; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 p-6 text-left sm:p-8"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-2xl font-black text-slate-900">미투표 회원 현황</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500">
            {members.length}명
          </span>
        </div>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-6 pb-6 sm:px-8 sm:pb-8">
          <p className="pt-5 text-sm leading-6 text-slate-500">
            아직 참석·불참 응답을 하지 않은 회원입니다.
          </p>
          {members.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
              모든 회원이 응답을 완료했습니다 🎉
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-600"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {member.name}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ParticipantSummary({
  participants,
}: {
  participants: Participant[];
}) {
  const male = participants.filter(
    (participant) => normalizeGender(participant.gender) === "남"
  ).length;
  const female = participants.filter(
    (participant) => normalizeGender(participant.gender) === "여"
  ).length;
  const levels = LEVELS.map((level) => ({
    level,
    count: participants.filter(
      (participant) => normalizeLevel(participant.level) === level
    ).length,
  })).filter((item) => item.count > 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StatChip label={`전체 ${participants.length}명`} />
        <StatChip label={`남자 ${male}명`} accent="male" />
        <StatChip label={`여자 ${female}명`} accent="female" />
      </div>
      {levels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {levels.map((item) => (
            <StatChip
              key={item.level}
              label={`${item.level} ${item.count}명`}
              accent="level"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ParticipantGroups({
  title,
  participants,
  emptyMessage,
}: {
  title: string;
  participants: Participant[];
  emptyMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => buildBoard(participants), [participants]);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 p-6 text-left sm:p-8"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-black text-slate-900">{title}</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500">
              {participants.length}명
            </span>
          </div>
          <div className="mt-3">
            <ParticipantSummary participants={participants} />
          </div>
        </div>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-6 pb-6 sm:px-8 sm:pb-8">
          <p className="pt-5 text-sm leading-6 text-slate-500">
            남/여 구분 후 급수 순으로 자동 정렬됩니다.
          </p>
          {participants.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
              {emptyMessage}
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {groups.map((group) => (
                <div
                  key={group.genderKey}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:p-5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-sm font-bold ${genderBadgeClass(
                        group.genderKey
                      )}`}
                    >
                      {group.genderLabel}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      {group.participants.length}명
                    </span>
                  </div>

                  <div className="mt-4 space-y-4">
                    {group.levels.map((levelGroup) => (
                      <div key={`${group.genderKey}-${levelGroup.level}`}>
                        <div className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                          {levelGroup.level}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {levelGroup.participants.map((participant) => (
                            <ParticipantCard
                              key={`${title}-${participant.id}`}
                              participant={participant}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: Array<number | string> = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index];
    const previous = sorted[index - 1];

    if (previous && page - previous > 1) {
      items.push(`ellipsis-${previous}-${page}`);
    }

    items.push(page);
  }

  return items;
}

export default function PublicSessionPage() {
  const params = useParams();
  const token = String(params?.token ?? "");

  const [session, setSession] = useState<SessionData | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<{ id: number; name: string; gender: string | null; level: string | null }[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberSearchError, setMemberSearchError] = useState("");
  const [identifiedMember, setIdentifiedMember] = useState<IdentifiedMember | null>(
    null
  );
  const [identifyLoading, setIdentifyLoading] = useState(false);
  const [identifyError, setIdentifyError] = useState("");
  const [registrationMode, setRegistrationMode] = useState<"member" | "guest">("member");
  const [guestName, setGuestName] = useState("");
  const [guestAge, setGuestAge] = useState("");
  const [guestGender, setGuestGender] = useState("");
  const [guestLevel, setGuestLevel] = useState("");
  const [guestSubmitLoading, setGuestSubmitLoading] = useState(false);
  const [guestSubmitSuccessMessage, setGuestSubmitSuccessMessage] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");
  const [commentSubmitError, setCommentSubmitError] = useState("");
  const [commentListError, setCommentListError] = useState("");
  const [commentDeletingId, setCommentDeletingId] = useState<number | null>(null);
  const [comments, setComments] = useState<SessionComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);
  const [commentsTotalCount, setCommentsTotalCount] = useState(0);

  // 클럽 단위 인증 키 — 세션이 로드되면 joinToken(클럽 고유값)으로 업데이트됨
  const clubJoinTokenRef = useRef<string | null>(null);
  function getStorageKey() {
    return storageKey(clubJoinTokenRef.current ?? token);
  }

  async function fetchSessionData() {
    if (!token) return;
    try {
      setSessionError("");
      const response = await fetch(`/api/public/sessions/${token}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "운동 일정 정보를 불러오지 못했습니다.");
      }
      if (data.joinToken) {
        clubJoinTokenRef.current = data.joinToken;
      }
      setSession(data);
    } catch (error) {
      setSessionError(
        error instanceof Error
          ? error.message
          : "운동 일정 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoadingSession(false);
    }
  }

  async function fetchComments(
    targetPage = commentsPage,
    options?: { silent?: boolean }
  ) {
    if (!token) return;

    try {
      if (!options?.silent) {
        setCommentsLoading(true);
      }
      if (!options?.silent) {
        setCommentListError("");
      }

      const response = await fetch(
        `/api/public/sessions/comments?token=${encodeURIComponent(token)}&page=${targetPage}`,
        { cache: "no-store" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "댓글을 불러오지 못했습니다.");
      }

      setCommentListError("");
      setComments(data.comments ?? []);
      setCommentsPage(data.page ?? targetPage);
      setCommentsTotalPages(data.totalPages ?? 1);
      setCommentsTotalCount(data.totalCount ?? 0);
    } catch (error) {
      if (!options?.silent) {
        setCommentListError(
          error instanceof Error ? error.message : "댓글을 불러오지 못했습니다."
        );
      }
    } finally {
      if (!options?.silent) {
        setCommentsLoading(false);
      }
    }
  }

  async function identifyMember(options?: {
    rememberToken?: string;
    memberId?: number;
    silent?: boolean;
  }) {
    if (!token) return;
    const rememberToken = options?.rememberToken ?? "";
    const memberId = options?.memberId ?? null;

    if (!rememberToken && !memberId) {
      if (!options?.silent) {
        setIdentifyError("회원을 선택해주세요.");
      }
      return;
    }

    try {
      setIdentifyLoading(true);
      if (!options?.silent) {
        setIdentifyError("");
        setSubmitSuccessMessage("");
      }

      const response = await fetch("/api/public/sessions/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rememberToken,
          memberId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const err = new Error(data.error || "회원 확인에 실패했습니다.");
        (err as Error & { status: number }).status = response.status;
        throw err;
      }

      localStorage.setItem(getStorageKey(), data.rememberToken);
      setIdentifiedMember((previous) => {
        if (!options?.silent || !previous) {
          return data.member;
        }

        const hasUnsavedGuestDraft = previous.guests.some(
          (guest) => guest.name || guest.age || guest.gender || guest.level
        );

        return hasUnsavedGuestDraft
          ? { ...data.member, guests: previous.guests }
          : data.member;
      });
      setIdentifyError("");
    } catch (error) {
      const status = (error as Error & { status?: number }).status ?? 0;
      // silent 모드: 일시적 오류(5xx, 네트워크)는 저장된 토큰을 유지
      // 인증 거부(4xx)일 때만 토큰 삭제
      const shouldClearToken = !options?.silent || (status >= 400 && status < 500);
      if (shouldClearToken) {
        localStorage.removeItem(getStorageKey());
        setIdentifiedMember(null);
      }
      if (!options?.silent) {
        setIdentifyError(
          error instanceof Error ? error.message : "회원 확인에 실패했습니다."
        );
      }
    } finally {
      setIdentifyLoading(false);
    }
  }

  async function searchMembers() {
    if (!token || !memberName.trim()) return;

    try {
      setMemberSearchLoading(true);
      setMemberSearchError("");
      setMemberSearchResults([]);

      const response = await fetch("/api/public/sessions/search-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: memberName.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "검색에 실패했습니다.");
      }

      if ((data.members ?? []).length === 0) {
        setMemberSearchError("해당 이름의 회원을 찾을 수 없습니다. 이름을 다시 확인해주세요.");
      } else {
        setMemberSearchResults(data.members);
      }
    } catch (error) {
      setMemberSearchError(error instanceof Error ? error.message : "검색에 실패했습니다.");
    } finally {
      setMemberSearchLoading(false);
    }
  }

  async function refreshIdentifiedMember() {
    if (!token) return;
    const rememberToken = localStorage.getItem(getStorageKey());
    if (!rememberToken) return;

    await identifyMember({
      rememberToken,
      silent: true,
    });
  }

  useEffect(() => {
    fetchComments(1).catch(() => undefined);

    // 세션 데이터를 먼저 로드해 clubJoinTokenRef를 설정한 뒤 자동 인증 시도
    fetchSessionData().then(() => {
      const rememberToken = localStorage.getItem(getStorageKey());
      if (rememberToken) {
        identifyMember({ rememberToken, silent: true }).catch(() => undefined);
      }
    }).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchComments(commentsPage).catch(() => undefined);
  }, [commentsPage, token]);

  useEffect(() => {
    if (!token) return;

    const interval = window.setInterval(() => {
      fetchSessionData().catch(() => undefined);
      fetchComments(commentsPage, { silent: true }).catch(() => undefined);
    }, 5000);

    const handleFocus = () => {
      fetchSessionData().catch(() => undefined);
      fetchComments(commentsPage, { silent: true }).catch(() => undefined);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [commentsPage, token]);

  async function handleRespond(action: "REGISTER" | "CANCEL") {
    if (!identifiedMember) return;

    try {
      setSubmitLoading(true);
      setSubmitSuccessMessage("");
      const rememberToken = localStorage.getItem(getStorageKey());

      if (!rememberToken) {
        throw new Error("회원 자동 인식 정보가 없습니다. 다시 확인해주세요.");
      }

      const guests =
        action === "REGISTER"
          ? identifiedMember.guests
              .map((guest) => ({
                name: guest.name.trim(),
                age: guest.age.trim(),
                gender: guest.gender.trim(),
                level: guest.level.trim(),
              }))
              .filter((guest) => guest.name)
          : [];

      const response = await fetch("/api/public/sessions/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rememberToken,
          action,
          guests,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "참석 정보를 처리하지 못했습니다.");
      }

      setIdentifiedMember((previous) =>
        previous ? { ...previous, currentStatus: data.status } : previous
      );

      await Promise.all([fetchSessionData(), refreshIdentifiedMember()]);

      const successMessage =
        action === "CANCEL"
          ? "불참 처리가 완료되었습니다."
          : data.status === "WAITLIST"
            ? "참석 신청이 완료되었습니다. 현재 대기 인원으로 등록되었습니다."
            : "참석 신청이 완료되었습니다.";

      setSubmitSuccessMessage(successMessage);
      alert(successMessage);
    } catch (error) {
      setSubmitSuccessMessage("");
      alert(
        error instanceof Error ? error.message : "참석 정보를 처리하지 못했습니다."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleGuestRegister() {
    try {
      setGuestSubmitLoading(true);
      setGuestSubmitSuccessMessage("");

      const response = await fetch("/api/public/sessions/guest-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: guestName.trim(),
          age: guestAge,
          gender: guestGender,
          level: guestLevel,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "게스트 신청을 처리하지 못했습니다.");
      }

      const message =
        data.status === "WAITLIST"
          ? "게스트 신청이 완료되었습니다. 현재 대기 인원으로 등록되었습니다."
          : "게스트 신청이 완료되었습니다.";

      setGuestSubmitSuccessMessage(message);
      setGuestName("");
      setGuestAge("");
      setGuestGender("");
      setGuestLevel("");
      alert(message);
      await fetchSessionData();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "게스트 신청을 처리하지 못했습니다."
      );
    } finally {
      setGuestSubmitLoading(false);
    }
  }

  async function handleCommentSubmit() {
    if (!identifiedMember) {
      setCommentSubmitError("본인 확인 후 댓글을 작성할 수 있습니다.");
      return;
    }

    const content = commentInput.trim();
    const rememberToken = localStorage.getItem(getStorageKey());

    if (!rememberToken) {
      setCommentSubmitError("회원 자동 인식 정보가 없습니다. 다시 확인해주세요.");
      return;
    }

    if (!content) {
      setCommentSubmitError("댓글 내용을 입력해주세요.");
      return;
    }

    try {
      setCommentSubmitting(true);
      setCommentSubmitError("");
      setCommentMessage("");

      const response = await fetch("/api/public/sessions/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rememberToken,
          content,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "댓글을 등록하지 못했습니다.");
      }

      setCommentInput("");
      setCommentMessage(
        `${data.authorName ?? identifiedMember.name} 님의 댓글이 등록되었습니다.`
      );
      setCommentsPage(1);
      await fetchComments(1);
    } catch (error) {
      setCommentSubmitError(
        error instanceof Error ? error.message : "댓글을 등록하지 못했습니다."
      );
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleCommentDelete(commentId: number) {
    if (!identifiedMember) {
      setCommentSubmitError("본인 확인 후 댓글을 삭제할 수 있습니다.");
      return;
    }

    const rememberToken = localStorage.getItem(getStorageKey());

    if (!rememberToken) {
      setCommentSubmitError("회원 자동 인식 정보가 없습니다. 다시 확인해주세요.");
      return;
    }

    try {
      setCommentDeletingId(commentId);
      setCommentSubmitError("");
      setCommentMessage("");

      const response = await fetch("/api/public/sessions/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rememberToken,
          commentId,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "댓글을 삭제하지 못했습니다.");
      }

      const nextPage =
        comments.length === 1 && commentsPage > 1 ? commentsPage - 1 : commentsPage;

      setCommentMessage(
        `${data.authorName ?? identifiedMember.name} 님의 댓글을 삭제했습니다.`
      );

      if (nextPage !== commentsPage) {
        setCommentsPage(nextPage);
      }

      await fetchComments(nextPage);
    } catch (error) {
      setCommentSubmitError(
        error instanceof Error ? error.message : "댓글을 삭제하지 못했습니다."
      );
    } finally {
      setCommentDeletingId(null);
    }
  }

  const registeredMembers = useMemo(
    () =>
      (session?.registeredParticipants ?? []).filter(
        (participant) => participant.type === "MEMBER"
      ),
    [session]
  );
  const registeredGuests = useMemo(
    () =>
      (session?.registeredParticipants ?? []).filter(
        (participant) => participant.type === "GUEST"
      ),
    [session]
  );
  const waitlistedMembers = useMemo(
    () =>
      (session?.waitlistedParticipants ?? []).filter(
        (participant) => participant.type === "MEMBER"
      ),
    [session]
  );
  const waitlistedGuests = useMemo(
    () =>
      (session?.waitlistedParticipants ?? []).filter(
        (participant) => participant.type === "GUEST"
      ),
    [session]
  );
  const absentMembers = useMemo(
    () =>
      (session?.absentParticipants ?? []).filter(
        (participant) => participant.type === "MEMBER"
      ),
    [session]
  );
  const absentGuests = useMemo(
    () =>
      (session?.absentParticipants ?? []).filter(
        (participant) => participant.type === "GUEST"
      ),
    [session]
  );

  const statusLabel =
    identifiedMember?.currentStatus === "REGISTERED"
      ? "현재 참석 신청이 완료된 상태입니다."
      : identifiedMember?.currentStatus === "WAITLIST"
      ? "현재 대기 인원으로 등록되어 있습니다."
      : identifiedMember?.currentStatus === "CANCELED"
      ? "현재 불참으로 설정되어 있습니다."
      : "아직 참석 신청 전입니다.";
  const commentPaginationItems = useMemo(
    () => getPaginationItems(commentsPage, commentsTotalPages),
    [commentsPage, commentsTotalPages]
  );

  if (loadingSession) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white px-6 py-20 text-center text-sm text-slate-400 shadow-sm sm:px-10">
          운동 현황판을 불러오는 중입니다.
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white px-6 py-20 text-center shadow-sm sm:px-10">
          <h1 className="text-2xl font-black text-slate-900">
            운동 일정 링크를 확인해주세요
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            {sessionError || "운동 일정 정보를 불러오지 못했습니다."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="webview-safe min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="webview-safe-row flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl min-w-0">
              <p className="text-sm font-bold tracking-[0.2em] text-sky-600">
                {session.clubName}
              </p>
              <h1 className="webview-safe-text mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                {session.title}
              </h1>
              <div className="webview-safe-text mt-4 space-y-1.5 text-sm leading-7 text-slate-500 sm:text-base">
                <p>
                  <span className="font-bold text-slate-600">운동날짜</span> ·{" "}
                  {formatDate(session.date)}
                </p>
                <p>
                  <span className="font-bold text-slate-600">운동시간</span> ·{" "}
                  {session.startTime} - {session.endTime}
                </p>
                {session.location ? (
                  <p>
                    <span className="font-bold text-slate-600">운동장소</span> ·{" "}
                    {session.location}
                  </p>
                ) : null}
              </div>
              {session.description ? (
                <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                  {session.description}
                </p>
              ) : null}
              <p className="mt-3 text-xs font-semibold text-slate-400">
                마지막 업데이트는 5초마다 자동 반영됩니다.
              </p>
            </div>
            <div className="w-full max-w-3xl">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-3">
                <div className="rounded-[1rem] border border-sky-200 bg-sky-50 px-2 py-2 sm:rounded-[1.4rem] sm:px-4 sm:py-4">
                  <div className="text-[8px] font-black tracking-[0.1em] text-sky-600 sm:text-[11px] sm:tracking-[0.18em]">
                    CAPACITY
                  </div>
                  <div className="mt-0.5 text-[10px] font-bold text-slate-500 sm:mt-1.5 sm:text-sm">정원</div>
                  <div className="mt-1 text-lg font-black text-sky-700 sm:mt-2 sm:text-[2.25rem]">
                    {session.capacity === null ? "∞" : `${session.capacity}명`}
                  </div>
                </div>
                <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-2 py-2 sm:rounded-[1.4rem] sm:px-4 sm:py-4">
                  <div className="text-[8px] font-black tracking-[0.1em] text-emerald-600 sm:text-[11px] sm:tracking-[0.18em]">
                    REGISTERED
                  </div>
                  <div className="mt-0.5 text-[10px] font-bold text-slate-500 sm:mt-1.5 sm:text-sm">참석 현황</div>
                  <div className="mt-1 text-lg font-black text-emerald-700 sm:mt-2 sm:text-[2.25rem]">
                    {session.registeredCount}명
                  </div>
                  <div className="mt-1 space-y-0 text-[9px] font-semibold leading-3 text-slate-600 sm:mt-2 sm:space-y-1 sm:text-xs sm:leading-4">
                    <div>회원 {session.registeredMemberCount}명</div>
                    <div>게스트 {session.registeredGuestCount}명</div>
                  </div>
                </div>
                <div className="rounded-[1rem] border border-rose-100 bg-rose-50/60 px-2 py-2 sm:rounded-[1.4rem] sm:px-4 sm:py-4">
                  <div className="text-[8px] font-black tracking-[0.1em] text-rose-400 sm:text-[11px] sm:tracking-[0.18em]">
                    ABSENT
                  </div>
                  <div className="mt-0.5 text-[10px] font-bold text-slate-500 sm:mt-1.5 sm:text-sm">불참 현황</div>
                  <div className="mt-1 text-lg font-black text-rose-500 sm:mt-2 sm:text-[2.25rem]">
                    {absentMembers.length + absentGuests.length}명
                  </div>
                  <div className="mt-1 space-y-0 text-[9px] font-semibold leading-3 text-slate-600 sm:mt-2 sm:space-y-1 sm:text-xs sm:leading-4">
                    <div>회원 {absentMembers.length}명</div>
                    <div>게스트 {absentGuests.length}명</div>
                  </div>
                </div>
                <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-2 py-2 sm:rounded-[1.4rem] sm:px-4 sm:py-4">
                  <div className="text-[8px] font-black tracking-[0.1em] text-amber-600 sm:text-[11px] sm:tracking-[0.18em]">
                    WAITLIST
                  </div>
                  <div className="mt-0.5 text-[10px] font-bold text-slate-500 sm:mt-1.5 sm:text-sm">대기 현황</div>
                  <div className="mt-1 text-lg font-black text-amber-700 sm:mt-2 sm:text-[2.25rem]">
                    {session.waitlistCount}명
                  </div>
                  <div className="mt-1 space-y-0 text-[9px] font-semibold leading-3 text-slate-600 sm:mt-2 sm:space-y-1 sm:text-xs sm:leading-4">
                    <div>회원 {session.waitlistMemberCount}명</div>
                    <div>게스트 {session.waitlistGuestCount}명</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">참석 신청 / 취소</h2>

              {/* 신청 방식 탭 토글 */}
              <div className="mt-4 flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  onClick={() => setRegistrationMode("member")}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                    registrationMode === "member"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  회원으로 신청하기
                </button>
                <button
                  onClick={() => setRegistrationMode("guest")}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                    registrationMode === "guest"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  게스트로 신청하기
                </button>
              </div>

              {registrationMode === "guest" ? (
                <div className="mt-6 space-y-4">
                  <p className="text-sm leading-6 text-slate-500">
                    회원이 아니어도 게스트로 참석 신청할 수 있습니다. 신청 취소는 관리자를 통해 처리됩니다.
                  </p>
                  <input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="이름"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                  <div className="grid grid-cols-5 gap-1">
                    {[{ label: "10/20대", value: "20" }, { label: "30대", value: "30" }, { label: "40대", value: "40" }, { label: "50대", value: "50" }, { label: "60대", value: "60" }].map(({ label, value }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setGuestAge(guestAge === value ? "" : value)}
                        className={`rounded-2xl border py-3 text-[11px] font-bold transition text-center whitespace-nowrap ${
                          guestAge === value
                            ? "bg-sky-500 text-white border-sky-500"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={guestGender}
                      onChange={(e) => setGuestGender(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                    >
                      <option value="">성별 선택</option>
                      {GENDERS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <select
                      value={guestLevel}
                      onChange={(e) => setGuestLevel(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                    >
                      <option value="">급수 선택</option>
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  {guestSubmitSuccessMessage ? (
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
                      {guestSubmitSuccessMessage}
                    </div>
                  ) : null}
                  <button
                    onClick={() => { handleGuestRegister().catch(() => undefined); }}
                    disabled={guestSubmitLoading}
                    className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                  >
                    {guestSubmitLoading ? "처리 중..." : "참석 신청하기"}
                  </button>
                </div>
              ) : (
              <>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                처음 한 번만 이름으로 본인을 확인하면, 이후에는 같은 기기에서 자동으로 기억됩니다.
              </p>

              {!identifiedMember ? (
                <div className="mt-6 space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={memberName}
                      onChange={(event) => {
                        setMemberName(event.target.value);
                        setMemberSearchResults([]);
                        setMemberSearchError("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") searchMembers().catch(() => undefined);
                      }}
                      placeholder="이름을 입력하세요"
                      className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                    />
                    <button
                      onClick={() => { searchMembers().catch(() => undefined); }}
                      disabled={memberSearchLoading || !memberName.trim()}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {memberSearchLoading ? "검색 중..." : "검색"}
                    </button>
                  </div>

                  {memberSearchResults.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-500">본인을 선택해주세요</p>
                      {memberSearchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => { identifyMember({ memberId: result.id }).catch(() => undefined); }}
                          disabled={identifyLoading}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-bold text-slate-900">{result.name}</span>
                            <div className="flex gap-2">
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${genderBadgeClass(result.gender)}`}>
                                {normalizeGender(result.gender)}
                              </span>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${levelChipClass(result.level)}`}>
                                {normalizeLevel(result.level)}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {memberSearchError ? <p className="text-sm text-rose-600">{memberSearchError}</p> : null}
                  {identifyError ? <p className="text-sm text-rose-600">{identifyError}</p> : null}

                  {session.joinToken ? (
                    <Link
                      href={`/join/${session.joinToken}`}
                      className="block text-center text-sm font-semibold text-sky-600"
                    >
                      아직 회원이 아니라면 여기서 가입 신청하기
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-500">확인된 회원</p>
                        <p className="mt-1 text-xl font-black text-slate-900">{identifiedMember.name}</p>
                        <p className="mt-2 text-sm text-slate-500">{statusLabel}</p>
                      </div>
                      <button
                        onClick={() => {
                          localStorage.removeItem(getStorageKey());
                          setIdentifiedMember(null);
                          setIdentifyError("");
                          setSubmitSuccessMessage("");
                        }}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
                      >
                        다른 회원으로 확인
                      </button>
                    </div>
                  </div>

                  {submitSuccessMessage ? (
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
                      {submitSuccessMessage}
                    </div>
                  ) : null}

                  <div className="rounded-[1.5rem] border border-slate-200 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">동반 게스트 등록</h3>
                        <p className="mt-1 text-sm text-slate-500">게스트는 최대 5명까지 등록할 수 있습니다.</p>
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                          이미 신청한 게스트는 현재 입력한 내용으로 다시 반영되고, 입력창에서 뺀 게스트는 신청이 취소됩니다.
                          새 게스트만 추가해서 다시 신청하면 추가 인원만 더 반영됩니다.
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setIdentifiedMember((previous) => {
                            if (!previous || previous.guests.length >= MAX_GUESTS) return previous;
                            return { ...previous, guests: [...previous.guests, emptyGuest()] };
                          })
                        }
                        disabled={(identifiedMember.guests?.length ?? 0) >= MAX_GUESTS}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        게스트 추가
                      </button>
                    </div>
                    <div className="mt-4 space-y-4">
                      {identifiedMember.guests.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-400">
                          등록된 게스트가 없습니다. 필요하면 게스트를 추가해주세요.
                        </div>
                      ) : (
                        identifiedMember.guests.map((guest, index) => (
                          <div key={`guest-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-bold text-slate-700">게스트 {index + 1}</div>
                              <button
                                onClick={() =>
                                  setIdentifiedMember((previous) =>
                                    previous
                                      ? { ...previous, guests: previous.guests.filter((_item, guestIndex) => guestIndex !== index) }
                                      : previous
                                  )
                                }
                                className="text-sm font-semibold text-rose-500"
                              >
                                삭제
                              </button>
                            </div>
                            <div className="mt-3 space-y-2">
                              <input value={guest.name} onChange={(event) => setIdentifiedMember((previous) => previous ? { ...previous, guests: previous.guests.map((item, guestIndex) => guestIndex === index ? { ...item, name: event.target.value } : item) } : previous)} placeholder="게스트 이름" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                              <div className="grid grid-cols-5 gap-1">
                                {[{ label: "10/20대", value: "20" }, { label: "30대", value: "30" }, { label: "40대", value: "40" }, { label: "50대", value: "50" }, { label: "60대", value: "60" }].map(({ label, value }) => (
                                  <button key={value} type="button"
                                    onClick={() => setIdentifiedMember((previous) => previous ? { ...previous, guests: previous.guests.map((item, guestIndex) => guestIndex === index ? { ...item, age: item.age === value ? "" : value } : item) } : previous)}
                                    className={`rounded-2xl border py-3 text-[11px] font-bold transition text-center whitespace-nowrap ${guest.age === value ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                                  >{label}</button>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <select value={guest.gender} onChange={(event) => setIdentifiedMember((previous) => previous ? { ...previous, guests: previous.guests.map((item, guestIndex) => guestIndex === index ? { ...item, gender: event.target.value } : item) } : previous)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400">
                                  <option value="">성별 선택</option>
                                  {GENDERS.map((gender) => (
                                    <option key={gender} value={gender}>{gender}</option>
                                  ))}
                                </select>
                                <select value={guest.level} onChange={(event) => setIdentifiedMember((previous) => previous ? { ...previous, guests: previous.guests.map((item, guestIndex) => guestIndex === index ? { ...item, level: event.target.value } : item) } : previous)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400">
                                  <option value="">급수 선택</option>
                                  {LEVELS.map((level) => (
                                    <option key={level} value={level}>{level}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button onClick={() => { handleRespond("REGISTER").catch(() => undefined); }} disabled={submitLoading} className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300">
                      {submitLoading ? "처리 중..." : "참석 신청하기"}
                    </button>
                    <button onClick={() => { handleRespond("CANCEL").catch(() => undefined); }} disabled={submitLoading} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:text-rose-300">
                      불참
                    </button>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">댓글</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          게스트 요청, 콕 구매, 특이사항 같은 내용을 자유롭게 남겨주세요.
                        </p>
                        {identifiedMember ? (
                          <p className="mt-2 text-xs font-semibold text-slate-400">
                            현재 {identifiedMember.name} 님 이름으로 댓글이 등록됩니다.
                          </p>
                        ) : null}
                      </div>
                      <div className="text-xs font-semibold text-slate-400">
                        {commentsTotalCount}개
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <textarea
                        value={commentInput}
                        onChange={(event) => setCommentInput(event.target.value.slice(0, 300))}
                        rows={3}
                        placeholder={
                          identifiedMember
                            ? "댓글을 입력해주세요."
                            : "본인 확인 후 댓글을 작성할 수 있습니다."
                        }
                        disabled={!identifiedMember || commentSubmitting}
                        className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-400">{commentInput.length}/300</div>
                        <button
                          onClick={() => {
                            handleCommentSubmit().catch(() => undefined);
                          }}
                          disabled={!identifiedMember || commentSubmitting}
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {commentSubmitting ? "등록 중..." : "댓글 등록"}
                        </button>
                      </div>
                      {commentMessage ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                          {commentMessage}
                        </div>
                      ) : null}
                      {commentSubmitError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                          {commentSubmitError}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
              </>
              )}
            </div>

          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900">참석 관련 댓글</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              총 {commentsTotalCount}개
            </div>
          </div>

          {session.notice ? (
            <div className="mt-5 rounded-[1.5rem] border border-amber-300 bg-amber-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-black text-white">
                  공지
                </span>
                <span className="text-xs font-bold text-amber-700">관리자 공지</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                {session.notice}
              </p>
            </div>
          ) : null}

          {commentsLoading ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
              댓글을 불러오는 중입니다.
            </div>
          ) : comments.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
              아직 등록된 댓글이 없습니다.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {comments.map((comment) => (
                <article
                  key={comment.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-black text-slate-900">
                      {comment.member.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold text-slate-400">
                        {formatDateTime(comment.createdAt)}
                      </div>
                      {identifiedMember?.id === comment.member.id ? (
                        <button
                          onClick={() => {
                            const confirmed = window.confirm(
                              "댓글을 삭제하시겠습니까?"
                            );
                            if (!confirmed) return;
                            handleCommentDelete(comment.id).catch(() => undefined);
                          }}
                          disabled={commentDeletingId === comment.id}
                          className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-bold text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300"
                        >
                          {commentDeletingId === comment.id ? "삭제 중..." : "삭제"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                    {comment.content}
                  </p>
                </article>
              ))}
            </div>
          )}

          {commentListError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {commentListError}
            </div>
          ) : null}

          {commentsTotalPages > 1 ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {commentPaginationItems.map((item) =>
                typeof item === "string" ? (
                  <span key={item} className="px-2 text-sm font-semibold text-slate-300">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCommentsPage(item)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      item === commentsPage
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          ) : null}
        </section>

        <ParticipantGroups title="회원 참석 현황" participants={registeredMembers} emptyMessage="아직 참석 신청한 회원이 없습니다." />
        <ParticipantGroups title="게스트 참석 현황" participants={registeredGuests} emptyMessage="아직 등록된 게스트가 없습니다." />
        <ParticipantGroups title="불참 회원 현황" participants={absentMembers} emptyMessage="불참 회원이 없습니다." />
        <ParticipantGroups title="불참 게스트 현황" participants={absentGuests} emptyMessage="불참 게스트가 없습니다." />
        <PendingMembersSection members={session?.pendingMembers ?? []} />
        <ParticipantGroups title="대기 중인 회원 현황" participants={waitlistedMembers} emptyMessage="현재 대기 중인 회원이 없습니다." />
        <ParticipantGroups title="대기 중인 게스트 현황" participants={waitlistedGuests} emptyMessage="현재 대기 중인 게스트가 없습니다." />
      </div>
    </main>
  );
}
