"use client";

import { useMemo, useState } from "react";
import type { ClubSession } from "@/components/dashboard/types";
import {
  formatDate,
  getParticipantDisplayName,
  getParticipantMetaText,
  getParticipantStatusLabel,
  getRegisteredParticipants,
  getSessionStatusLabel,
  getWaitlistedParticipants,
  isGuestParticipant,
} from "@/components/dashboard/utils";

type SessionsPanelProps = {
  sessions: ClubSession[];
  selectedSessionId: number | null;
  publicSessionBaseUrl: string;
  onSelectSession: (id: number) => void;
  onCreateSession: (payload: {
    title: string;
    description: string;
    location: string;
    date: string;
    startTime: string;
    endTime: string;
    capacity: string;
  }) => Promise<void>;
  onDeleteSession: (sessionId: number) => Promise<void>;
  onUpdateSessionStatus: (
    sessionId: number,
    status: ClubSession["status"]
  ) => Promise<void>;
};

const initialForm = {
  title: "",
  description: "",
  location: "",
  date: "",
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

export function SessionsPanel({
  sessions,
  selectedSessionId,
  publicSessionBaseUrl,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onUpdateSessionStatus,
}: SessionsPanelProps) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ??
    sessions[0] ??
    null;

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

  async function handleSubmit() {
    setSubmitting(true);

    try {
      await onCreateSession(form);
      setForm(initialForm);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
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
      alert("운동 일정 링크를 복사했습니다.");
    } catch {
      alert("운동 일정 링크 복사에 실패했습니다.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-900">
            운동 일정 만들기
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            날짜, 시간, 장소, 정원을 입력하면 카카오톡 공유용 참석 링크까지
            바로 만들어집니다.
          </p>

          <div className="mt-5 space-y-3">
            <input
              value={form.title}
              onChange={(event) =>
                setForm({
                  ...form,
                  title: event.target.value,
                })
              }
              placeholder="예: 목요일 정기 운동"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
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
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date: event.target.value,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
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
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm({
                    ...form,
                    startTime: event.target.value,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
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
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
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
              className="h-24 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            />
          </div>

          <button
            onClick={() => {
              handleSubmit().catch(() => undefined);
            }}
            disabled={submitting}
            className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "생성 중..." : "운동 일정 생성"}
          </button>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
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
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-bold">
                      {session.title}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {getSessionStatusLabel(session.status)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm opacity-80">
                    {formatDate(session.date)} {session.startTime} -{" "}
                    {session.endTime}
                  </div>
                  <div className="mt-2 text-sm opacity-80">
                    참석 {getRegisteredParticipants(session).length}명 / 대기{" "}
                    {getWaitlistedParticipants(session).length}명
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

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        {selectedSession ? (
          <>
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-black text-slate-900">
                      {selectedSession.title}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {getSessionStatusLabel(selectedSession.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {formatDate(selectedSession.date)}{" "}
                    {selectedSession.startTime} - {selectedSession.endTime}
                    {selectedSession.location
                      ? ` · ${selectedSession.location}`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedSession.description || "설명 없음"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
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
                        className={`rounded-xl px-3 py-2 text-xs font-bold transition ${statusButtonClass(
                          status
                        )}`}
                      >
                        {getSessionStatusLabel(status)}
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
                    className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-sky-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold text-sky-700">
                      카카오톡 공유 링크
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      단톡방에 이 링크를 올리면 회원이 직접 참석 신청과 취소를
                      할 수 있어요. 게스트도 함께 등록됩니다.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleCopyLink().catch(() => {
                        alert("운동 일정 링크 복사에 실패했습니다.");
                      });
                    }}
                    className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
                  >
                    링크 복사
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  {publicSessionLink}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  정원
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {selectedSession.capacity ?? "제한 없음"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  참석 인원
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {registeredParticipants.length}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  대기 인원
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {waitlistedParticipants.length}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <section className="overflow-hidden rounded-[1.5rem] border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
                  <h4 className="text-base font-black text-slate-900">
                    참석 신청 명단
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    링크로 실제 참석 신청한 사람만 표시됩니다.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[520px] w-full text-sm">
                    <thead className="bg-white text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-4 font-semibold">이름</th>
                        <th className="px-4 py-4 font-semibold">구분</th>
                        <th className="px-4 py-4 font-semibold">연락처/메모</th>
                        <th className="px-4 py-4 font-semibold">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {registeredParticipants.map((participant) => (
                        <tr
                          key={participant.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-4 py-4 font-bold text-slate-900">
                            {getParticipantDisplayName(participant)}
                          </td>
                          <td className="px-4 py-4">
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
                          <td className="px-4 py-4 text-slate-500">
                            {getParticipantMetaText(participant)}
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {getParticipantStatusLabel(participant.status)}
                          </td>
                        </tr>
                      ))}

                      {registeredParticipants.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-12 text-center text-sm text-slate-400"
                          >
                            아직 참석 신청한 인원이 없습니다.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overflow-hidden rounded-[1.5rem] border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
                  <h4 className="text-base font-black text-slate-900">
                    대기 인원 명단
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    정원 초과 후 신청한 인원은 자동으로 대기로 이동합니다.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[520px] w-full text-sm">
                    <thead className="bg-white text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-4 font-semibold">이름</th>
                        <th className="px-4 py-4 font-semibold">구분</th>
                        <th className="px-4 py-4 font-semibold">연락처/메모</th>
                        <th className="px-4 py-4 font-semibold">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {waitlistedParticipants.map((participant) => (
                        <tr
                          key={participant.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-4 py-4 font-bold text-slate-900">
                            {getParticipantDisplayName(participant)}
                          </td>
                          <td className="px-4 py-4">
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
                          <td className="px-4 py-4 text-slate-500">
                            {getParticipantMetaText(participant)}
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {getParticipantStatusLabel(participant.status)}
                          </td>
                        </tr>
                      ))}

                      {waitlistedParticipants.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-12 text-center text-sm text-slate-400"
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
