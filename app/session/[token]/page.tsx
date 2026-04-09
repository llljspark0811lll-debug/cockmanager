"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Participant = {
  id: number;
  type: "MEMBER" | "GUEST";
  name: string;
  age: number | null;
  gender: string | null;
  level: string | null;
};

type SessionData = {
  id: number;
  publicToken: string;
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

function storageKey(token: string) {
  return `public-session-member:${token}`;
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

function ParticipantCard({ participant }: { participant: Participant }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-900">{participant.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            {participant.type === "GUEST"
              ? `${participant.age ? `${participant.age}세` : "나이 미정"} · 게스트`
              : "회원"}
          </div>
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
    <div className="flex flex-wrap gap-2">
      <StatChip label={`전체 ${participants.length}명`} />
      <StatChip label={`남자 ${male}명`} accent="male" />
      <StatChip label={`여자 ${female}명`} accent="female" />
      {levels.map((item) => (
        <StatChip
          key={item.level}
          label={`${item.level} ${item.count}명`}
          accent="level"
        />
      ))}
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
  const groups = useMemo(() => buildBoard(participants), [participants]);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h3 className="text-2xl font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        남/여 구분 후 급수 순으로 자동 정렬됩니다.
      </p>
      <div className="mt-5">
        <ParticipantSummary participants={participants} />
      </div>

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
    </section>
  );
}

export default function PublicSessionPage() {
  const params = useParams();
  const token = String(params?.token ?? "");

  const [session, setSession] = useState<SessionData | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [memberName, setMemberName] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [identifiedMember, setIdentifiedMember] = useState<IdentifiedMember | null>(
    null
  );
  const [identifyLoading, setIdentifyLoading] = useState(false);
  const [identifyError, setIdentifyError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState("");

  const rememberStorageKey = storageKey(token);

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

  async function identifyMember(options?: {
    rememberToken?: string;
    silent?: boolean;
  }) {
    if (!token) return;
    const rememberToken = options?.rememberToken ?? "";

    if (!rememberToken && (!memberName.trim() || phoneLast4.length !== 4)) {
      if (!options?.silent) {
        setIdentifyError("이름과 전화번호 뒤 4자리를 입력해주세요.");
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
          name: memberName.trim(),
          phoneLast4,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "회원 확인에 실패했습니다.");
      }

      localStorage.setItem(rememberStorageKey, data.rememberToken);
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
      if (!options?.silent) {
        setIdentifyError(
          error instanceof Error ? error.message : "회원 확인에 실패했습니다."
        );
      }
      localStorage.removeItem(rememberStorageKey);
      setIdentifiedMember(null);
    } finally {
      setIdentifyLoading(false);
    }
  }

  async function refreshIdentifiedMember() {
    if (!token) return;
    const rememberToken = localStorage.getItem(rememberStorageKey);
    if (!rememberToken) return;

    await identifyMember({
      rememberToken,
      silent: true,
    });
  }

  useEffect(() => {
    fetchSessionData().catch(() => undefined);

    const rememberToken = localStorage.getItem(rememberStorageKey);
    if (rememberToken) {
      identifyMember({
        rememberToken,
        silent: true,
      }).catch(() => undefined);
    }
  }, [rememberStorageKey, token]);

  useEffect(() => {
    if (!token) return;

    const interval = window.setInterval(() => {
      fetchSessionData().catch(() => undefined);
    }, 5000);

    const handleFocus = () => {
      fetchSessionData().catch(() => undefined);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [rememberStorageKey, token]);

  async function handleRespond(action: "REGISTER" | "CANCEL") {
    if (!identifiedMember) return;

    try {
      setSubmitLoading(true);
      setSubmitSuccessMessage("");
      const rememberToken = localStorage.getItem(rememberStorageKey);

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
          ? "참석 취소가 완료되었습니다."
          : data.status === "WAITLIST"
            ? "참석 신청이 완료되었습니다. 현재 대기 인원으로 등록되었습니다."
            : "참석 신청이 완료되었습니다.";

      setSubmitSuccessMessage(successMessage);
    } catch (error) {
      setSubmitSuccessMessage("");
      alert(
        error instanceof Error ? error.message : "참석 정보를 처리하지 못했습니다."
      );
    } finally {
      setSubmitLoading(false);
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

  const statusLabel =
    identifiedMember?.currentStatus === "REGISTERED"
      ? "현재 참석 신청이 완료된 상태입니다."
      : identifiedMember?.currentStatus === "WAITLIST"
      ? "현재 대기 인원으로 등록되어 있습니다."
      : "아직 참석 신청 전입니다.";

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
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-[1.15rem] border border-sky-200 bg-sky-50 px-3 py-3 sm:rounded-[1.4rem] sm:px-4 sm:py-4">
                  <div className="text-[9px] font-black tracking-[0.14em] text-sky-600 sm:text-[11px] sm:tracking-[0.18em]">
                    CAPACITY
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-500 sm:mt-1.5 sm:text-sm">정원</div>
                  <div className="mt-1.5 text-[1.55rem] font-black text-sky-700 sm:mt-2 sm:text-[2.25rem]">
                    {session.capacity === null ? "∞" : `${session.capacity}명`}
                  </div>
                </div>
                <div className="rounded-[1.15rem] border border-emerald-200 bg-emerald-50 px-3 py-3 sm:rounded-[1.4rem] sm:px-4 sm:py-4">
                  <div className="text-[9px] font-black tracking-[0.14em] text-emerald-600 sm:text-[11px] sm:tracking-[0.18em]">
                    REGISTERED
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-500 sm:mt-1.5 sm:text-sm">참석 현황</div>
                  <div className="mt-1.5 text-[1.55rem] font-black text-emerald-700 sm:mt-2 sm:text-[2.25rem]">
                    {session.registeredCount}명
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-[11px] font-semibold leading-4 text-slate-600 sm:mt-2 sm:space-y-1 sm:text-xs">
                    <div>회원 {session.registeredMemberCount}명</div>
                    <div>게스트 {session.registeredGuestCount}명</div>
                  </div>
                </div>
                <div className="rounded-[1.15rem] border border-amber-200 bg-amber-50 px-3 py-3 sm:rounded-[1.4rem] sm:px-4 sm:py-4">
                  <div className="text-[9px] font-black tracking-[0.14em] text-amber-600 sm:text-[11px] sm:tracking-[0.18em]">
                    WAITLIST
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-500 sm:mt-1.5 sm:text-sm">대기 현황</div>
                  <div className="mt-1.5 text-[1.55rem] font-black text-amber-700 sm:mt-2 sm:text-[2.25rem]">
                    {session.waitlistCount}명
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-[11px] font-semibold leading-4 text-slate-600 sm:mt-2 sm:space-y-1 sm:text-xs">
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
              <p className="mt-3 text-sm leading-6 text-slate-500">
                처음 한 번만 이름과 전화번호 뒤 4자리로 본인 확인을 하면, 이후에는 같은 기기에서 자동으로 기억됩니다.
              </p>

              {!identifiedMember ? (
                <div className="mt-6 space-y-3">
                  <input
                    value={memberName}
                    onChange={(event) => setMemberName(event.target.value)}
                    placeholder="이름"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                  <input
                    value={phoneLast4}
                    onChange={(event) =>
                      setPhoneLast4(event.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="전화번호 뒤 4자리"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                  {identifyError ? <p className="text-sm text-rose-600">{identifyError}</p> : null}
                  <button
                    onClick={() => {
                      identifyMember().catch(() => undefined);
                    }}
                    disabled={identifyLoading}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {identifyLoading ? "확인 중..." : "본인 확인하기"}
                  </button>
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
                          localStorage.removeItem(rememberStorageKey);
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
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <input value={guest.name} onChange={(event) => setIdentifiedMember((previous) => previous ? { ...previous, guests: previous.guests.map((item, guestIndex) => guestIndex === index ? { ...item, name: event.target.value } : item) } : previous)} placeholder="게스트 이름" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                              <input value={guest.age} onChange={(event) => setIdentifiedMember((previous) => previous ? { ...previous, guests: previous.guests.map((item, guestIndex) => guestIndex === index ? { ...item, age: event.target.value.replace(/\D/g, "").slice(0, 3) } : item) } : previous)} inputMode="numeric" placeholder="나이" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                              <select value={guest.gender} onChange={(event) => setIdentifiedMember((previous) => previous ? { ...previous, guests: previous.guests.map((item, guestIndex) => guestIndex === index ? { ...item, gender: event.target.value } : item) } : previous)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400">
                                <option value="">성별 선택</option>
                                {GENDERS.map((gender) => (
                                  <option key={gender} value={gender}>{gender}</option>
                                ))}
                              </select>
                              <select value={guest.level} onChange={(event) => setIdentifiedMember((previous) => previous ? { ...previous, guests: previous.guests.map((item, guestIndex) => guestIndex === index ? { ...item, level: event.target.value } : item) } : previous)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400">
                                <option value="">급수 선택</option>
                                {LEVELS.map((level) => (
                                  <option key={level} value={level}>{level}</option>
                                ))}
                              </select>
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
                    <button onClick={() => { handleRespond("CANCEL").catch(() => undefined); }} disabled={submitLoading} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300">
                      신청 취소하기
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        <ParticipantGroups title="회원 참석 현황" participants={registeredMembers} emptyMessage="아직 참석 신청한 회원이 없습니다." />
        <ParticipantGroups title="게스트 참석 현황" participants={registeredGuests} emptyMessage="아직 등록된 게스트가 없습니다." />
        <ParticipantGroups title="대기 중인 회원 현황" participants={waitlistedMembers} emptyMessage="현재 대기 중인 회원이 없습니다." />
        <ParticipantGroups title="대기 중인 게스트 현황" participants={waitlistedGuests} emptyMessage="현재 대기 중인 게스트가 없습니다." />
      </div>
    </main>
  );
}
