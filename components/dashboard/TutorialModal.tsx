"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardTab } from "@/components/dashboard/types";

type TutorialStep =
  | "welcome"
  | "seeding"
  | "membersTab"
  | "membersList"
  | "sessionsTab"
  | "sessionsList"
  | "attendanceTab"
  | "attendanceList"
  | "generate"
  | "bracketView"
  | "export"
  | "cleaning"
  | "done";

type TutorialModalProps = {
  open: boolean;
  bracketGenerated: boolean;
  onClose: () => void;
  onSwitchTab: (tab: DashboardTab) => void;
  onSelectSession: (sessionId: number) => void;
  onSeeded: (sessionId: number) => Promise<void>;
  onCompleted: () => Promise<void>;
};

type StepMeta = {
  title: string;
  description: string;
  targetId?: string;
};

function useSpotlight(open: boolean, targetId?: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const retryRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !targetId) {
      setRect(null);
      return;
    }

    let cancelled = false;
    let retries = 0;

    // rect만 업데이트 (스크롤 이벤트용 — scrollIntoView 호출 없음)
    const updateRect = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tutorial-id="${targetId}"]`) as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };

    // 최초 1회: 요소가 나타날 때까지 대기 후 scrollIntoView + rect 설정
    const initScroll = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tutorial-id="${targetId}"]`) as HTMLElement | null;
      if (el) {
        const isMobile = window.innerWidth < 768;
        const isTabTarget = !!targetId?.startsWith("tab-");
        // 모바일 탭: end → 탭이 뷰포트 하단에 위치해 하단 고정 카드와 가까워짐
        // 모바일 패널: start → 패널 상단부터 보이게
        // 데스크탑: nearest → 이미 보이면 그대로
        el.scrollIntoView({ behavior: "smooth", block: isMobile ? (isTabTarget ? "end" : "start") : "nearest", inline: "nearest" });
        setRect(el.getBoundingClientRect());
        return;
      }
      setRect(null);
      if (retries < 20) {
        retries += 1;
        retryRef.current = window.setTimeout(initScroll, 150);
      }
    };

    window.requestAnimationFrame(initScroll);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      cancelled = true;
      if (retryRef.current) window.clearTimeout(retryRef.current);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open, targetId]);

  return rect;
}

export function TutorialModal({
  open,
  bracketGenerated,
  onClose,
  onSwitchTab,
  onSelectSession,
  onSeeded,
  onCompleted,
}: TutorialModalProps) {
  const [step, setStep] = useState<TutorialStep>("welcome");
  const [sampleSessionId, setSampleSessionId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const cardRef = useRef<HTMLDivElement | null>(null);

  const stepMeta = useMemo<StepMeta>(() => {
    switch (step) {
      case "welcome":
        return {
          title: "콕매니저🏸 체험을 시작할게요",
          description:
            "실제 운영 흐름을 한 번 끝까지 체험해보세요.\n\n테스트 회원 10명과 게스트 4명이 참석한 운동을 만들고, 마지막에는 직접 자동 대진표를 생성해봅니다.",
        };
      case "seeding":
        return {
          title: "체험용 데이터를 준비하고 있어요",
          description:
            "회원, 운동일정, 참석 명단을 자동으로 구성하는 중입니다.\n완료 후에는 테스트 데이터가 모두 삭제되고 초기 상태로 시작합니다.",
        };
      case "membersTab":
        return {
          title: "회원 탭에서 클럽 회원을 관리합니다",
          description:
            "회원 탭은 클럽 회원 명단을 모아두는 공간입니다.\n실제 운영에서는 가입 링크로 들어온 회원이나 관리자가 직접 등록한 회원이 이 곳에 등록됩니다.",
          targetId: "tab-members",
        };
      case "membersList":
        return {
          title: "체험용 회원 10명을 만들었습니다",
          description:
            "회원 목록을 직접 훑어보세요.\n이름, 성별, 급수, 메모가 실제 회원처럼 정리되어 있습니다.\n\n확인했다면 이 회원들로 운동일정을 만들어볼게요.",
          targetId: "members-panel",
        };
      case "sessionsTab":
        return {
          title: "운동일정을 만들면 참석 신청을 받을 수 있어요",
          description:
            "운동일정 탭에서는 정기운동, 번개운동 같은 일정을 만들고 참석 링크를 공유합니다.\n회원이 직접 신청하면 참석, 대기, 게스트 정보가 자동으로 등록됩니다.",
          targetId: "tab-sessions",
        };
      case "sessionsList":
        return {
          title: "테스트 운동일정이 생성되었습니다",
          description:
            "운동일정 1개가 마감된 상태로 준비되어 있습니다.\n회원 10명과 게스트 4명이 참석 신청한 상태라 바로 자동대진으로 넘어갈 수 있어요.\n\n목록을 스크롤로 확인한 뒤 자동대진 탭으로 이동해볼게요.",
          targetId: "sessions-panel",
        };
      case "attendanceTab":
        return {
          title: "자동대진 탭에서 최종 참석자를 확인합니다",
          description:
            "자동대진 탭은 마감된 운동의 최종 참석 명단을 기준으로 대진표를 만드는 곳입니다.\n총무가 명단을 다시 옮기지 않아도, 신청된 인원이 그대로 대진표 명단이 됩니다.",
          targetId: "tab-attendance",
        };
      case "attendanceList":
        return {
          title: "최종 참석 인원을 확인합니다",
          description:
            "지금은 회원 10명과 게스트 4명, 총 14명이 참석한 상태입니다.\n참석자 목록을 스크롤로 확인해보세요.\n\n확인 후 2코트, 1인 최소 4경기 조건으로 대진표를 만들어보겠습니다.",
          targetId: "attendance-participant-summary",
        };
      case "generate":
        return {
          title: "이제 자동 대진표를 직접 만들어보세요",
          description:
            "체험 조건은 2코트, 1인 최소 4경기, 남복/여복 분리 없음으로 맞춰두었습니다.\n\n아래의 자동 대진표 생성 버튼을 눌러보세요. 생성이 끝나면 다음 안내로 이어집니다.",
          targetId: "bracket-generate-button",
        };
      case "bracketView":
        return {
          title: "라운드별 대진 구성을 확인하세요",
          description:
            "급수·성별 균형을 맞춰 라운드마다 경기가 자동으로 배정됐어요.\n\n같은 라운드 안에서는 선수 위치를 직접 바꿀 수 있어요. 선수 이름을 눌러 원하는 자리로 바꿔보세요.\n\n수정이 끝났으면 이미지로 저장해 단톡방에 바로 공유해보세요.",
          targetId: "bracket-rounds",
        };
      case "export":
        return {
          title: "완성된 대진표는 이미지로 저장합니다",
          description:
            "이미지 저장 버튼을 누르면 라운드별 대진표가 이미지 파일로 저장돼요.\n저장한 이미지를 단톡방에 공유하면 끝!\n\n체험을 마치면 샘플 데이터는 자동으로 정리됩니다.",
          targetId: "bracket-export-button",
        };
      case "cleaning":
        return {
          title: "샘플 데이터를 정리하고 있어요",
          description:
            "체험용 회원, 운동일정, 참석 명단, 대진표를 삭제하고 실제 운영을 시작할 준비를 합니다.",
        };
      case "done":
        return {
          title: "체험이 끝났습니다",
          description:
            "이제 데이터는 초기 상태로 돌아왔습니다.\n회원 등록, 운동일정 생성, 자동대진까지 어떤 흐름인지 확인했으니 실제 클럽/소모임 운영을 시작해보세요.",
        };
    }
  }, [step]);

  const targetRect = useSpotlight(
    open && !["welcome", "seeding", "cleaning", "done"].includes(step),
    stepMeta.targetId
  );


  useEffect(() => {
    if (!open) return;

    if (step === "membersTab" || step === "membersList") {
      onSwitchTab("members");
    }
    if (step === "sessionsTab" || step === "sessionsList") {
      onSwitchTab("sessions");
    }
    if (
      step === "attendanceTab" ||
      step === "attendanceList" ||
      step === "generate" ||
      step === "bracketView" ||
      step === "export"
    ) {
      onSwitchTab("attendance");
      if (sampleSessionId) onSelectSession(sampleSessionId);
    }
  }, [open, step, sampleSessionId, onSwitchTab, onSelectSession]);

  useEffect(() => {
    if (!open) return;

    const allowedTargetIds =
      step === "generate"
        ? ["bracket-generate-button"]
        : step === "bracketView"
          ? ["bracket-rounds"]
          : step === "export"
            ? ["bracket-export-button"]
            : [];

    const isAllowedTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (cardRef.current?.contains(target)) return true;
      // 프로그래밍 방식 앵커 다운로드 (PC)
      if (target instanceof HTMLAnchorElement && target.hasAttribute("download")) return true;
      // 카카오톡 인앱 이미지 오버레이
      if (target.closest("[data-download-ui]")) return true;

      return allowedTargetIds.some((targetId) =>
        target.closest(`[data-tutorial-id="${targetId}"]`)
      );
    };

    const blockPageAction = (event: Event) => {
      if (isAllowedTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const blockPageKey = (event: KeyboardEvent) => {
      if (isAllowedTarget(event.target)) return;
      if (["Enter", " ", "Spacebar"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const actionEvents = [
      "click",
      "dblclick",
      "submit",
      "input",
      "change",
    ] as const;

    actionEvents.forEach((eventName) => {
      document.addEventListener(eventName, blockPageAction, true);
    });
    document.addEventListener("keydown", blockPageKey, true);

    return () => {
      actionEvents.forEach((eventName) => {
        document.removeEventListener(eventName, blockPageAction, true);
      });
      document.removeEventListener("keydown", blockPageKey, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (open && step === "generate" && bracketGenerated) {
      setStep("bracketView");
    }
  }, [bracketGenerated, open, step]);

  async function handleStart() {
    setStep("seeding");
    setErrorMsg("");

    try {
      const response = await fetch("/api/tutorial/seed", {
        method: "POST",
        credentials: "include",
      });
      const data = (await response.json()) as {
        sessionId?: number;
        error?: string;
      };

      if (!response.ok || !data.sessionId) {
        throw new Error(data.error ?? "샘플 데이터를 만들지 못했습니다.");
      }

      setSampleSessionId(data.sessionId);
      await onSeeded(data.sessionId);
      setStep("membersTab");
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "튜토리얼을 시작하지 못했습니다."
      );
      setStep("welcome");
    }
  }

  async function handleComplete() {
    setStep("cleaning");
    setErrorMsg("");

    try {
      const response = await fetch("/api/tutorial/cleanup", {
        method: "POST",
        credentials: "include",
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "샘플 데이터를 정리하지 못했습니다.");
      }

      await onCompleted();
      setStep("done");
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "샘플 데이터를 정리하지 못했습니다."
      );
      setStep("export");
    }
  }

  function handleClose() {
    setStep("welcome");
    setSampleSessionId(null);
    setErrorMsg("");
    onSwitchTab("members");
    onClose();
  }

  if (!open) return null;

  const isLoading = step === "seeding" || step === "cleaning";
  const isWelcome = step === "welcome";
  const isDone = step === "done";
  const spotlightPad = 10;
  const spotlightStyle = targetRect
    ? {
        top: targetRect.top - spotlightPad,
        left: targetRect.left - spotlightPad,
        width: targetRect.width + spotlightPad * 2,
        height: targetRect.height + spotlightPad * 2,
      }
    : null;

  const progressSteps: TutorialStep[] = [
    "membersTab",
    "membersList",
    "sessionsTab",
    "sessionsList",
    "attendanceTab",
    "attendanceList",
    "generate",
    "bracketView",
    "export",
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      <div className="pointer-events-none absolute inset-0 bg-slate-950/60" />

      {spotlightStyle ? (
        <div
          className="pointer-events-none absolute rounded-[1.5rem] border-2 border-sky-300 bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]"
          style={spotlightStyle}
        />
      ) : null}

      <div
        ref={cardRef}
        className={`pointer-events-auto absolute left-1/2 z-[91] flex w-[min(92vw,27rem)] -translate-x-1/2 flex-col rounded-[1.25rem] border border-white/70 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.24)] backdrop-blur md:bottom-auto md:left-auto md:right-6 md:top-1/2 md:max-h-[90vh] md:-translate-y-1/2 md:translate-x-0 ${step === "generate" ? "top-4 bottom-auto max-h-[45vh]" : "bottom-2 top-auto max-h-[42vh]"}`}
      >
        <div className="overflow-y-auto p-5 pb-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
            콕매니저 첫 체험
          </p>
          <h2 className="mt-2 text-xl font-black leading-7 text-slate-900">
            {stepMeta.title}
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
            {stepMeta.description}
          </p>
        </div>

        <div className="shrink-0 p-5 pt-3">
        {isLoading ? (
          <div className="mt-5 flex justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
          </div>
        ) : null}

        {errorMsg ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
            {errorMsg}
          </p>
        ) : null}

        {!isLoading ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            {isWelcome ? (
              <button
                onClick={() => {
                  handleStart().catch(() => undefined);
                }}
                className="ml-auto rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
              >
                체험 시작하기
              </button>
            ) : step === "membersTab" ? (
              <button
                onClick={() => setStep("membersList")}
                className="ml-auto rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
              >
                회원 목록 보기
              </button>
            ) : step === "membersList" ? (
              <>
                <button
                  onClick={() => setStep("membersTab")}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  이전
                </button>
                <button
                  onClick={() => setStep("sessionsTab")}
                  className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
                >
                  운동일정으로 이동
                </button>
              </>
            ) : step === "sessionsTab" ? (
              <>
                <button
                  onClick={() => setStep("membersList")}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  이전
                </button>
                <button
                  onClick={() => setStep("sessionsList")}
                  className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
                >
                  운동일정 목록 보기
                </button>
              </>
            ) : step === "sessionsList" ? (
              <>
                <button
                  onClick={() => setStep("sessionsTab")}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  이전
                </button>
                <button
                  onClick={() => setStep("attendanceTab")}
                  className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
                >
                  자동대진으로 이동
                </button>
              </>
            ) : step === "attendanceTab" ? (
              <>
                <button
                  onClick={() => setStep("sessionsList")}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  이전
                </button>
                <button
                  onClick={() => setStep("attendanceList")}
                  className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
                >
                  참석 명단 보기
                </button>
              </>
            ) : step === "attendanceList" ? (
              <>
                <button
                  onClick={() => setStep("attendanceTab")}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  이전
                </button>
                <button
                  onClick={() => setStep("generate")}
                  className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
                >
                  대진표 만들기
                </button>
              </>
            ) : step === "generate" ? (
              <div className="ml-auto rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">
                생성 버튼을 눌러주세요
              </div>
            ) : step === "bracketView" ? (
              <>
                <button
                  onClick={() => setStep("generate")}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  이전
                </button>
                <button
                  onClick={() => setStep("export")}
                  className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
                >
                  이미지 저장하기 →
                </button>
              </>
            ) : step === "export" ? (
              <>
                <button
                  onClick={() => setStep("generate")}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  이전
                </button>
                <button
                  onClick={() => {
                    handleComplete().catch(() => undefined);
                  }}
                  className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  체험 완료하기
                </button>
              </>
            ) : isDone ? (
              <button
                onClick={handleClose}
                className="ml-auto rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                실제 운영 시작하기
              </button>
            ) : null}
          </div>
        ) : null}

        {!isWelcome && !isLoading && !isDone ? (
          <div className="mt-4 flex justify-center gap-1.5">
            {progressSteps.map((item) => (
              <div
                key={item}
                className={`h-1.5 rounded-full transition-all ${
                  step === item ? "w-5 bg-sky-500" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}
