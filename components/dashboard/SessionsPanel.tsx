"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClubSession } from "@/components/dashboard/types";
import {
  formatDate,
  getParticipantDisplayName,
  getParticipantMetaText,
  getRegisteredParticipants,
  getWaitlistedParticipants,
  isGuestParticipant,
} from "@/components/dashboard/utils";

type SessionFormPayload = {
  title: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: string;
};

type SessionsPanelProps = {
  sessions: ClubSession[];
  selectedSessionId: number | null;
  publicSessionBaseUrl: string;
  loadingSelectedSession: boolean;
  onSelectSession: (id: number) => void;
  onCreateSession: (payload: SessionFormPayload) => Promise<void>;
  onUpdateSession: (
    sessionId: number,
    payload: SessionFormPayload
  ) => Promise<void>;
  onDeleteSession: (sessionId: number) => Promise<void>;
  onUpdateSessionStatus: (
    sessionId: number,
    status: ClubSession["status"]
  ) => Promise<void>;
};

const SESSION_STATUS_LABEL: Record<ClubSession["status"], string> = {
  OPEN: "모집 중",
  CLOSED: "마감",
  CANCELED: "취소",
};

function getTodayDateInputValue() {
  const now = new Date();
  const offsetDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60 * 1000
  );

  return offsetDate.toISOString().split("T")[0];
}

const initialForm: SessionFormPayload = {
  title: "",
  description: "",
  location: "",
  date: getTodayDateInputValue(),
  startTime: "19:00",
  endTime: "21:00",
  capacity: "",
};

function statusButtonClass(status: ClubSession["status"]) {
  if (status === "OPEN") {
    return "bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
  }

  if (status === "CLOSED") {
    return "bg-amber-50 text-amber-700 hover:bg-amber-100";
  }

  return "bg-rose-50 text-rose-700 hover:bg-rose-100";
}

function toSessionForm(session: ClubSession): SessionFormPayload {
  return {
    title: session.title ?? "",
    description: session.description ?? "",
    location: session.location ?? "",
    date: new Date(session.date).toISOString().split("T")[0],
    startTime: session.startTime ?? "19:00",
    endTime: session.endTime ?? "21:00",
    capacity:
      session.capacity === null || session.capacity === undefined
        ? ""
        : String(session.capacity),
  };
}

export function SessionsPanel({
  sessions,
  selectedSessionId,
  publicSessionBaseUrl,
  loadingSelectedSession,
  onSelectSession,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  onUpdateSessionStatus,
}: SessionsPanelProps) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(
    null
  );

  const hasSelectedSession = sessions.some(
    (session) => session.id === selectedSessionId
  );

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ??
    sessions[0] ??
    null;

  useEffect(() => {
    if (!hasSelectedSession && sessions[0]) {
      onSelectSession(sessions[0].id);
    }
  }, [hasSelectedSession, onSelectSession, sessions]);

  const publicSessionLink = useMemo(() => {
    if (!selectedSession) {
      return "";
    }

    return `${publicSessionBaseUrl}/${selectedSession.publicToken}`;
  }, [publicSessionBaseUrl, selectedSession]);

  const registeredParticipants = selectedSession
    ? getRegisteredParticipants(selectedSession)
    : [];
  const waitlistedParticipants = selectedSession
    ? getWaitlistedParticipants(selectedSession)
    : [];

  const registeredMemberCount = registeredParticipants.filter(
    (participant) => !isGuestParticipant(participant)
  ).length;
  const registeredGuestCount = registeredParticipants.filter(
    (participant) => isGuestParticipant(participant)
  ).length;
  const waitlistedMemberCount = waitlistedParticipants.filter(
    (participant) => !isGuestParticipant(participant)
  ).length;
  const waitlistedGuestCount = waitlistedParticipants.filter(
    (participant) => isGuestParticipant(participant)
  ).length;

  function resetForm() {
    setForm({
      ...initialForm,
      date: getTodayDateInputValue(),
    });
    setEditingSessionId(null);
  }

  async function handleSubmit() {
    if (
      editingSessionId &&
      selectedSession &&
      form.capacity !== ""
    ) {
      const nextCapacity = Number(form.capacity);
      const previousCapacity = selectedSession.capacity;
      const currentRegisteredCount =
        selectedSession.registeredCount ?? registeredParticipants.length;

      if (
        Number.isFinite(nextCapacity) &&
        nextCapacity >= 0 &&
        currentRegisteredCount > nextCapacity &&
        (previousCapacity === null || nextCapacity < previousCapacity)
      ) {
        const shouldContinue = confirm(
          "현재 참석 인원이 새 정원을 초과합니다.\n가장 마지막 신청 단위부터 대기 인원으로 이동됩니다."
        );

        if (!shouldContinue) {
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      if (editingSessionId) {
        await onUpdateSession(editingSessionId, form);
      } else {
        await onCreateSession(form);
      }

      resetForm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : editingSessionId
            ? "운동 일정을 수정하지 못했습니다."
            : "운동 일정을 생성하지 못했습니다.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyLink() {
    if (!publicSessionLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicSessionLink);
      alert("참석 신청 링크를 복사했습니다.");
    } catch {
      alert("참석 신청 링크 복사에 실패했습니다.");
    }
  }

  function startEditingSelectedSession() {
    if (!selectedSession) {
      return;
    }

    setEditingSessionId(selectedSession.id);
    setForm(toSessionForm(selectedSession));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-6">
      <div className="min-w-0 space-y-6">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {editingSessionId ? "운동 일정 수정" : "운동 일정 만들기"}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500 md:mt-2 md:text-sm">
                날짜, 시간, 장소, 정원을 입력하면 카카오톡 공유용 참석 링크까지
                바로 만들 수 있어요.
              </p>
            </div>

            {editingSessionId ? (
              <button
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                수정 취소
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-2.5 md:mt-5 md:space-y-3">
            <input
              value={form.title}
              onChange={(event) =>
                setForm({
                  ...form,
                  title: event.target.value,
                })
              }
              placeholder="예: 목요일 정기 운동"
              className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-400 md:px-4 md:py-3"
            />
            <input
              value={form.location}
              onChange={(event) =>
                setForm({
                  ...form,
                  location: event.target.value,
                })
              }
              placeholder="장소"
              className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-400 md:px-4 md:py-3"
            />
            <div className="grid grid-cols-2 gap-2.5 md:gap-3">
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date: event.target.value,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 md:px-4 md:py-3"
              />
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    capacity: event.target.value,
                  })
                }
                placeholder="정원"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 md:px-4 md:py-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:gap-3">
              <input
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm({
                    ...form,
                    startTime: event.target.value,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 md:px-4 md:py-3"
              />
              <input
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm({
                    ...form,
                    endTime: event.target.value,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 md:px-4 md:py-3"
              />
            </div>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({
                  ...form,
                  description: event.target.value,
                })
              }
              placeholder="운영 메모"
              className="h-20 w-full resize-none rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-400 md:h-24 md:px-4 md:py-3"
            />
          </div>

          <button
            onClick={() => {
              handleSubmit().catch(() => undefined);
            }}
            disabled={submitting}
            className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 md:mt-5 md:py-3"
          >
            {submitting
              ? editingSessionId
                ? "수정 중..."
                : "생성 중..."
              : editingSessionId
                ? "운동 일정 수정"
                : "운동 일정 생성"}
          </button>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-slate-900">
              일정 목록
            </h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              총 {sessions.length}개
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {sessions.map((session) => {
              const isSelected = selectedSession?.id === session.id;

              return (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full rounded-2xl border p-3.5 text-left transition md:p-4 ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold md:text-base">
                      {session.title}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {SESSION_STATUS_LABEL[session.status]}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs opacity-80 md:mt-2 md:text-sm">
                    {formatDate(session.date)} {session.startTime} -{" "}
                    {session.endTime}
                  </div>
                  <div className="mt-1.5 text-xs opacity-80 md:mt-2 md:text-sm">
                    참석 {session.registeredCount ?? 0}명 / 대기{" "}
                    {session.waitlistedCount ?? 0}명
                  </div>
                </button>
              );
            })}

            {sessions.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                아직 등록된 운동 일정이 없습니다.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        {selectedSession ? (
          <>
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-xl font-black text-slate-900 md:text-2xl">
                      {selectedSession.title}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {SESSION_STATUS_LABEL[selectedSession.status]}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-xs leading-5 text-slate-500 md:text-sm">
                    {formatDate(selectedSession.date)}{" "}
                    {selectedSession.startTime} - {selectedSession.endTime}
                    {selectedSession.location
                      ? ` | ${selectedSession.location}`
                      : ""}
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-400 md:text-sm">
                    {selectedSession.description || "설명 없음"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={startEditingSelectedSession}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:text-xs"
                  >
                    수정
                  </button>
                  {(["OPEN", "CLOSED", "CANCELED"] as const).map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() =>
                          onUpdateSessionStatus(
                            selectedSession.id,
                            status
                          ).catch((error: Error) => {
                            alert(error.message);
                          })
                        }
                        className={`rounded-xl px-3 py-2 text-[11px] font-bold transition md:text-xs ${statusButtonClass(
                          status
                        )}`}
                      >
                        {SESSION_STATUS_LABEL[status]}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => {
                      if (
                        !confirm(
                          "이 운동 일정을 삭제할까요? 참석 명단과 대기 명단도 함께 삭제됩니다."
                        )
                      ) {
                        return;
                      }

                      onDeleteSession(selectedSession.id).catch(
                        (error: Error) => {
                          alert(error.message);
                        }
                      );
                    }}
                    className="rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-rose-700 md:text-xs"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-sky-50 p-3 md:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 max-w-2xl">
                    <p className="text-xs font-semibold text-sky-700 md:text-sm">
                      참석 신청 공유 링크
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-slate-600 md:mt-2 md:text-sm md:leading-6">
                      회원과 게스트는 링크에서 현재 참석 현황을 보고 참석 신청,
                      취소, 게스트 등록까지 할 수 있습니다.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleCopyLink().catch(() => {
                        alert("참석 신청 링크 복사에 실패했습니다.");
                      });
                    }}
                    className="w-full rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700 lg:w-auto lg:py-3"
                  >
                    링크 복사
                  </button>
                </div>

                <div className="mt-3 break-all rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-5 text-slate-500 sm:text-sm sm:leading-7 md:mt-4 md:px-4 md:py-3">
                  {publicSessionLink}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 md:mt-5 md:gap-4">
              <div className="rounded-2xl bg-slate-50 p-3 md:p-4">
                <p className="text-[11px] font-semibold text-slate-500 md:text-sm">정원</p>
                <p className="mt-1.5 text-xl font-black text-slate-900 md:mt-2 md:text-2xl">
                  {selectedSession.capacity ?? "제한 없음"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 md:p-4">
                <p className="text-[11px] font-semibold text-slate-500 md:text-sm">
                  참석 인원
                </p>
                <p className="mt-1.5 text-xl font-black text-slate-900 md:mt-2 md:text-2xl">
                  {selectedSession.registeredCount ??
                    registeredParticipants.length}
                </p>
                <p className="mt-1.5 text-[10px] font-medium leading-4 text-slate-500 md:mt-2 md:text-xs">
                  회원 {registeredMemberCount}명 / 게스트 {registeredGuestCount}명
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 md:p-4">
                <p className="text-[11px] font-semibold text-slate-500 md:text-sm">
                  대기 인원
                </p>
                <p className="mt-1.5 text-xl font-black text-slate-900 md:mt-2 md:text-2xl">
                  {selectedSession.waitlistedCount ??
                    waitlistedParticipants.length}
                </p>
                <p className="mt-1.5 text-[10px] font-medium leading-4 text-slate-500 md:mt-2 md:text-xs">
                  회원 {waitlistedMemberCount}명 / 게스트 {waitlistedGuestCount}명
                </p>
              </div>
            </div>

            {loadingSelectedSession ? (
              <div className="mt-6 rounded-[1.5rem] bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
                참석 명단을 불러오는 중입니다.
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <section className="overflow-hidden rounded-[1.5rem] border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 md:px-4 md:py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-black text-slate-900">
                          참석 신청 명단
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          링크로 실제 참석 신청한 회원과 게스트 명단입니다.
                        </p>
                      </div>
                      <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 md:px-3 md:text-xs">
                        회원 {registeredMemberCount}명 / 게스트 {registeredGuestCount}명
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:min-w-[520px] sm:text-sm">
                      <thead className="bg-white text-left text-slate-500">
                        <tr>
                          <th className="px-3 py-3 font-semibold md:px-4 md:py-4">이름</th>
                          <th className="px-3 py-3 font-semibold md:px-4 md:py-4">구분</th>
                          <th className="px-3 py-3 font-semibold md:px-4 md:py-4">
                            연락처 / 메모
                          </th>
                          <th className="px-3 py-3 font-semibold md:px-4 md:py-4">상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {registeredParticipants.map((participant) => (
                          <tr
                            key={participant.id}
                            className="hover:bg-slate-50"
                          >
                            <td className="px-3 py-3 font-bold text-slate-900 md:px-4 md:py-4">
                              {getParticipantDisplayName(participant)}
                            </td>
                            <td className="px-3 py-3 md:px-4 md:py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                  isGuestParticipant(participant)
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-sky-50 text-sky-700"
                                }`}
                              >
                                {isGuestParticipant(participant)
                                  ? "게스트"
                                  : "회원"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-500 md:px-4 md:py-4">
                              {getParticipantMetaText(participant)}
                            </td>
                            <td className="px-3 py-3 text-slate-500 md:px-4 md:py-4">
                              참석
                            </td>
                          </tr>
                        ))}

                        {registeredParticipants.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-10 text-center text-xs text-slate-400 md:px-4 md:py-12 md:text-sm"
                            >
                              아직 참석 신청한 사람이 없습니다.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[1.5rem] border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 md:px-4 md:py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-black text-slate-900">
                          대기 인원 명단
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          정원 초과 시 자동으로 대기 인원으로 들어갑니다.
                        </p>
                      </div>
                      <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 md:px-3 md:text-xs">
                        회원 {waitlistedMemberCount}명 / 게스트 {waitlistedGuestCount}명
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:min-w-[520px] sm:text-sm">
                      <thead className="bg-white text-left text-slate-500">
                        <tr>
                          <th className="px-3 py-3 font-semibold md:px-4 md:py-4">이름</th>
                          <th className="px-3 py-3 font-semibold md:px-4 md:py-4">구분</th>
                          <th className="px-3 py-3 font-semibold md:px-4 md:py-4">
                            연락처 / 메모
                          </th>
                          <th className="px-3 py-3 font-semibold md:px-4 md:py-4">상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {waitlistedParticipants.map((participant) => (
                          <tr
                            key={participant.id}
                            className="hover:bg-slate-50"
                          >
                            <td className="px-3 py-3 font-bold text-slate-900 md:px-4 md:py-4">
                              {getParticipantDisplayName(participant)}
                            </td>
                            <td className="px-3 py-3 md:px-4 md:py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                  isGuestParticipant(participant)
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-sky-50 text-sky-700"
                                }`}
                              >
                                {isGuestParticipant(participant)
                                  ? "게스트"
                                  : "회원"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-500 md:px-4 md:py-4">
                              {getParticipantMetaText(participant)}
                            </td>
                            <td className="px-3 py-3 text-slate-500 md:px-4 md:py-4">
                              대기
                            </td>
                          </tr>
                        ))}

                        {waitlistedParticipants.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-10 text-center text-xs text-slate-400 md:px-4 md:py-12 md:text-sm"
                            >
                              현재 대기 인원이 없습니다.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full min-h-[360px] items-center justify-center rounded-[1.5rem] bg-slate-50 text-sm font-medium text-slate-400">
            먼저 운동 일정을 하나 선택해주세요.
          </div>
        )}
      </section>
    </div>
  );
}
