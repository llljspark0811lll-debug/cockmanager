import type {
  ClubSession,
  SessionParticipant,
} from "@/components/dashboard/types";
import {
  formatPhoneNumber,
  normalizePhoneNumber,
} from "@/lib/phone";

export {
  formatPhoneNumber,
  normalizePhoneNumber,
} from "@/lib/phone";

const LEVEL_ORDER = ["S", "A", "B", "C", "D", "E", "초심"];

function ageGroupLabel(age: number): string {
  if (age <= 29) return "10/20대";
  if (age <= 39) return "30대";
  if (age <= 49) return "40대";
  if (age <= 59) return "50대";
  return "60대";
}

export function formatDate(
  value: string | Date | null | undefined
) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ko-KR");
}

export function formatDateTime(
  value: string | Date | null | undefined
) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${date.toLocaleDateString("ko-KR")} ${date.toLocaleTimeString(
    "ko-KR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  )}`;
}

export function toDateInputValue(
  value: string | Date | null | undefined
) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
}

export function getRegisteredParticipants(session: ClubSession) {
  return (session.participants ?? []).filter(
    (participant) => participant.status === "REGISTERED"
  );
}

export function getWaitlistedParticipants(session: ClubSession) {
  return (session.participants ?? []).filter(
    (participant) => participant.status === "WAITLIST"
  );
}

export function getCanceledParticipants(session: ClubSession) {
  return (session.participants ?? []).filter(
    (participant) =>
      participant.status === "CANCELED" &&
      participant.hostMemberId === null
  );
}

export function findParticipant(
  session: ClubSession,
  memberId: number
) {
  return (session.participants ?? []).find(
    (participant) => participant.memberId === memberId
  );
}

export function getSessionStatusLabel(
  status: ClubSession["status"]
) {
  if (status === "OPEN") return "모집 중";
  if (status === "CLOSED") return "마감";
  return "취소";
}

export function getParticipantStatusLabel(
  status: SessionParticipant["status"]
) {
  if (status === "REGISTERED") return "참석";
  if (status === "WAITLIST") return "대기";
  return "취소";
}

export function getAttendanceStatusLabel(
  status: SessionParticipant["attendanceStatus"]
) {
  if (status === "PRESENT") return "출석";
  if (status === "ABSENT") return "결석";
  if (status === "LATE") return "지각";
  return "미체크";
}

export function normalizeGenderLabel(
  gender: string | null | undefined
) {
  const value = String(gender ?? "").trim().toLowerCase();

  if (["남", "남자", "m", "male"].includes(value)) return "남";
  if (["여", "여자", "f", "female"].includes(value)) return "여";
  return String(gender ?? "").trim() || "-";
}

export function getGenderSortRank(gender: string) {
  const normalized = normalizeGenderLabel(gender);

  if (normalized === "남") return 0;
  if (normalized === "여") return 1;
  return 2;
}

export function getGenderBadgeClasses(gender: string) {
  const normalized = normalizeGenderLabel(gender);

  if (normalized === "남") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (normalized === "여") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function getLevelRank(level: string) {
  const normalized = level.trim().toUpperCase();
  const index = LEVEL_ORDER.indexOf(normalized);
  return index === -1 ? LEVEL_ORDER.length : index;
}

export function getSortedLevels(levels: string[]) {
  return [...levels].sort((left, right) => {
    const rankDiff =
      getLevelRank(left) - getLevelRank(right);

    if (rankDiff !== 0) {
      return rankDiff;
    }

    return left.localeCompare(right, "ko");
  });
}

export function getLevelTextClasses(level: string) {
  const normalized = level.trim().toUpperCase();

  if (normalized === "S") return "text-amber-600";
  if (normalized === "A") return "text-emerald-700";
  if (normalized === "B") return "text-violet-700";
  if (normalized === "C") return "text-orange-600";
  if (normalized === "D") return "text-lime-700";
  if (normalized === "E") return "text-slate-600";
  if (normalized === "초심") return "text-cyan-700";
  return "text-slate-500";
}

export function getParticipantDisplayName(
  participant: SessionParticipant
) {
  if (participant.guestName) {
    return participant.guestName;
  }

  return participant.member?.name ?? "이름 없음";
}

export function getParticipantMetaText(
  participant: SessionParticipant
) {
  if (participant.guestName) {
    const hostName =
      participant.hostMember?.name ?? "동반 회원 미확인";
    const guestMeta = [
      participant.guestGender
        ? normalizeGenderLabel(participant.guestGender)
        : "",
      participant.guestLevel?.trim() ?? "",
      participant.guestAge ? ageGroupLabel(participant.guestAge) : "",
    ].filter(Boolean);

    return guestMeta.length > 0
      ? `게스트 · ${guestMeta.join(" · ")} · 동반 회원 ${hostName}`
      : `게스트 · 동반 회원 ${hostName}`;
  }

  return formatPhoneNumber(participant.member?.phone) || "-";
}

export function isGuestParticipant(
  participant: SessionParticipant
) {
  return Boolean(participant.guestName);
}

export function getParticipantGenderLabel(
  participant: SessionParticipant
) {
  if (participant.guestName) {
    return normalizeGenderLabel(participant.guestGender);
  }

  return normalizeGenderLabel(participant.member?.gender);
}

export function getParticipantLevelLabel(
  participant: SessionParticipant
) {
  if (participant.guestName) {
    return participant.guestLevel?.trim() || "-";
  }

  return participant.member?.level?.trim() || "-";
}

export function getParticipantRemarkText(
  participant: SessionParticipant
) {
  if (participant.guestName) {
    const notes = [];

    if (participant.guestAge) {
      notes.push(ageGroupLabel(participant.guestAge));
    }

    if (participant.hostMember?.name) {
      notes.push(`동반 회원 ${participant.hostMember.name}`);
    }

    return notes.join("\n") || "-";
  }

  return participant.member?.note?.trim() || "-";
}
