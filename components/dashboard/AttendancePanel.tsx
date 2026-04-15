import { useEffect } from "react";
import { SessionBracketPanel } from "@/components/dashboard/SessionBracketPanel";
import type { ClubSession } from "@/components/dashboard/types";
import {
  formatDate,
  formatDateTime,
  getAttendanceStatusLabel,
  getParticipantDisplayName,
  getParticipantMetaText,
  getParticipantStatusLabel,
  isGuestParticipant,
} from "@/components/dashboard/utils";

type AttendancePanelProps = {
  sessions: ClubSession[];
  selectedSessionId: number | null;
  loadingSelectedSession: boolean;
  onSelectSession: (id: number) => void;
  onUpdateAttendance: (
    participantId: number,
    attendanceStatus:
      | "PENDING"
      | "PRESENT"
      | "ABSENT"
      | "LATE"
  ) => Promise<void>;
};

export function AttendancePanel({
  sessions,
  selectedSessionId,
  loadingSelectedSession,
  onSelectSession,
  onUpdateAttendance,
}: AttendancePanelProps) {
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

  const participants =
    selectedSession?.participants?.filter(
      (participant) => participant.status !== "CANCELED"
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              출석·대진 관리
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              현장 출석 체크를 마친 뒤 바로 자동 대진표까지 이어서 생성할 수
              있어요.
            </p>
          </div>

          <select
            value={selectedSession?.id ?? ""}
            onChange={(event) =>
              onSelectSession(Number(event.target.value))
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 md:w-[320px]"
          >
            <option value="" disabled>
              출석과 대진을 관리할 운동 일정을 선택해 주세요
            </option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title} / {formatDate(session.date)} /{" "}
                {session.startTime}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingSelectedSession ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
          출석 명단을 불러오는 중입니다.
        </div>
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-black text-slate-900">
                        {getParticipantDisplayName(participant)}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          isGuestParticipant(participant)
                            ? "bg-amber-50 text-amber-700"
                            : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {isGuestParticipant(participant)
                          ? "게스트"
                          : "회원"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {getParticipantMetaText(participant)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      참여 상태:{" "}
                      {getParticipantStatusLabel(participant.status)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      출석 상태:{" "}
                      {getAttendanceStatusLabel(
                        participant.attendanceStatus
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      체크 시간:{" "}
                      {formatDateTime(participant.checkedInAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      onUpdateAttendance(
                        participant.id,
                        "PRESENT"
                      ).catch((error: Error) => {
                        alert(error.message);
                      })
                    }
                    className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    출석
                  </button>
                  <button
                    onClick={() =>
                      onUpdateAttendance(
                        participant.id,
                        "LATE"
                      ).catch((error: Error) => {
                        alert(error.message);
                      })
                    }
                    className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                  >
                    지각
                  </button>
                  <button
                    onClick={() =>
                      onUpdateAttendance(
                        participant.id,
                        "ABSENT"
                      ).catch((error: Error) => {
                        alert(error.message);
                      })
                    }
                    className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    결석
                  </button>
                  <button
                    onClick={() =>
                      onUpdateAttendance(
                        participant.id,
                        "PENDING"
                      ).catch((error: Error) => {
                        alert(error.message);
                      })
                    }
                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                  >
                    초기화
                  </button>
                </div>
              </div>
            ))}

            {participants.length === 0 ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
                선택한 일정에 출석 대상이 없습니다.
              </div>
            ) : null}
          </div>

          <div className="hidden overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-4 font-semibold">이름</th>
                    <th className="px-4 py-4 font-semibold">구분</th>
                    <th className="px-4 py-4 font-semibold">
                      연락처 / 메모
                    </th>
                    <th className="px-4 py-4 font-semibold">참여 상태</th>
                    <th className="px-4 py-4 font-semibold">출석 상태</th>
                    <th className="px-4 py-4 font-semibold">체크 시간</th>
                    <th className="px-4 py-4 font-semibold">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {participants.map((participant) => (
                    <tr
                      key={participant.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-bold text-slate-900">
                        {getParticipantDisplayName(participant)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
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
                      <td className="px-4 py-4 font-semibold text-slate-700">
                        {getAttendanceStatusLabel(
                          participant.attendanceStatus
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-400">
                        {formatDateTime(participant.checkedInAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              onUpdateAttendance(
                                participant.id,
                                "PRESENT"
                              ).catch((error: Error) => {
                                alert(error.message);
                              })
                            }
                            className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            출석
                          </button>
                          <button
                            onClick={() =>
                              onUpdateAttendance(
                                participant.id,
                                "LATE"
                              ).catch((error: Error) => {
                                alert(error.message);
                              })
                            }
                            className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                          >
                            지각
                          </button>
                          <button
                            onClick={() =>
                              onUpdateAttendance(
                                participant.id,
                                "ABSENT"
                              ).catch((error: Error) => {
                                alert(error.message);
                              })
                            }
                            className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                          >
                            결석
                          </button>
                          <button
                            onClick={() =>
                              onUpdateAttendance(
                                participant.id,
                                "PENDING"
                              ).catch((error: Error) => {
                                alert(error.message);
                              })
                            }
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                          >
                            초기화
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {participants.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-sm text-slate-400"
                      >
                        선택한 일정에 출석 대상이 없습니다.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {selectedSession ? (
            <SessionBracketPanel session={selectedSession} />
          ) : null}
        </>
      )}
    </div>
  );
}
