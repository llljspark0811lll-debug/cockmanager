"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardTab } from "@/components/dashboard/types";

export type DashboardTutorialStep = {
  id: string;
  title: string;
  description: string;
  targetId?: string;
  tab?: DashboardTab;
};

export type DashboardTutorialFinishMode =
  | "prompt"
  | "member-button"
  | "join-link-button"
  | "join-link-copy"
  | "join-link-done"
  | "final";

type DashboardTutorialProps = {
  open: boolean;
  step: DashboardTutorialStep;
  stepIndex: number;
  totalSteps: number;
  finishMode?: DashboardTutorialFinishMode;
  targetIdOverride?: string;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
  onFinishYes?: () => void;
  onFinishNo?: () => void;
  onOpenMemberPractice?: () => void;
  onMemberPracticeBack?: () => void;
  onOpenJoinLinkPractice?: () => void;
  onJoinLinkPracticeBack?: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function DashboardTutorial({
  open,
  step,
  stepIndex,
  totalSteps,
  finishMode = "final",
  targetIdOverride,
  onPrev,
  onNext,
  onSkip,
  onComplete,
  onFinishYes,
  onFinishNo,
  onOpenMemberPractice,
  onMemberPracticeBack,
  onOpenJoinLinkPractice,
  onJoinLinkPracticeBack,
}: DashboardTutorialProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const retryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setTargetRect(null);
      return;
    }

    let cancelled = false;
    let retryCount = 0;

    const updateLayout = () => {
      if (cancelled) {
        return;
      }

      const mobile = window.innerWidth < 768;
      const targetId = targetIdOverride ?? step.targetId;

      setIsMobile(mobile);

      if (!targetId) {
        setTargetRect(null);
        return;
      }

      const element = document.querySelector(
        `[data-tutorial-id="${targetId}"]`
      ) as HTMLElement | null;

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: mobile ? "center" : "nearest",
          inline: "center",
        });
        setTargetRect(element.getBoundingClientRect());
        return;
      }

      setTargetRect(null);

      if (retryCount < 18) {
        retryCount += 1;
        retryTimerRef.current = window.setTimeout(updateLayout, 120);
      }
    };

    const raf = window.requestAnimationFrame(updateLayout);
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, true);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
    };
  }, [open, step.id, step.targetId, targetIdOverride]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const spotlightStyle = useMemo(() => {
    if (!targetRect) {
      return null;
    }

    const padding = isMobile ? 8 : 12;

    return {
      top: targetRect.top - padding,
      left: targetRect.left - padding,
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2,
    };
  }, [isMobile, targetRect]);

  const cardStyle = useMemo(() => {
    if (isMobile || !targetRect) {
      return null;
    }

    const cardWidth = 360;
    const gap = 18;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const preferredLeft = targetRect.left;
    const maxLeft = viewportWidth - cardWidth - 20;
    const preferredTop = targetRect.bottom + gap;
    const fitsBelow = preferredTop + 240 < viewportHeight - 20;

    return {
      top: fitsBelow ? preferredTop : Math.max(20, targetRect.top - 260),
      left: clamp(preferredLeft, 20, Math.max(20, maxLeft)),
      width: cardWidth,
    };
  }, [isMobile, targetRect]);

  if (!open) {
    return null;
  }

  const isLastStep = stepIndex === totalSteps - 1;
  const isFinishStep = isLastStep && step.id === "finish";

  const displayedTitle = (() => {
    if (!isFinishStep) {
      return step.title;
    }

    if (finishMode === "prompt") {
      return "회원 등록까지 해볼까요?";
    }

    if (finishMode === "member-button") {
      return "회원 직접 등록 버튼을 눌러보세요";
    }

    if (finishMode === "join-link-button") {
      return "이제 가입 신청 탭도 둘러보세요";
    }

    if (finishMode === "join-link-copy") {
      return "링크 복사 버튼을 눌러보세요";
    }

    if (finishMode === "join-link-done") {
      return "가입 신청 링크도 바로 사용할 수 있습니다";
    }

    return "이제 바로 운영을 시작해보세요";
  })();

  const displayedDescription = (() => {
    if (!isFinishStep) {
      return step.description;
    }

    if (finishMode === "prompt") {
      return "실제 사용 전에 회원 1명을 직접 등록해보면 전체 흐름이 훨씬 빨리 이해됩니다.";
    }

    if (finishMode === "member-button") {
      return "오른쪽 위의 회원 직접 등록 버튼을 눌러 회원 등록 창을 열어보세요.\n잠깐만 체험해도 이후 사용 흐름이 더 잘 보입니다.";
    }

    if (finishMode === "join-link-button") {
      return "이번에는 가입 신청 탭으로 가서 공유 링크가 어디 있는지 먼저 확인해보세요.\n기존 회원이나 신입 회원에게 이 링크를 보내 신청을 받을 수 있습니다.";
    }

    if (finishMode === "join-link-copy") {
      return "이제 링크 복사 버튼을 직접 눌러보세요.\n복사가 완료되면 다음 안내로 자동 진행됩니다.";
    }

    if (finishMode === "join-link-done") {
      return "이제 이 링크를 기존 회원들이나 신입 회원에게 보내서 신청을 받으면 승인할 수 있습니다.\n엑셀 없이도 신청 기반으로 회원 정보를 모아볼 수 있습니다.";
    }

    return "회원 등록부터 시작하거나 가입 신청 링크와 운동 일정 링크를 먼저 공유해도 좋습니다.";
  })();

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      <div className="pointer-events-none absolute inset-0 bg-slate-950/55" />

      {spotlightStyle ? (
        <div
          className="pointer-events-none absolute rounded-[1.75rem] border border-sky-300/70 bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]"
          style={spotlightStyle}
        />
      ) : null}

      <div
        className={`pointer-events-auto absolute z-[91] w-[min(92vw,24rem)] rounded-[1.75rem] border border-white/70 bg-white/95 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur ${
          isMobile || !cardStyle ? "bottom-4 left-1/2 -translate-x-1/2" : ""
        }`}
        style={cardStyle ?? undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
              사용 가이드 {stepIndex + 1}/{totalSteps}
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-900">
              {displayedTitle}
            </h2>
          </div>
          <button
            onClick={onSkip}
            className="min-w-[4.5rem] whitespace-nowrap rounded-full px-3 py-1 text-center text-xs font-semibold leading-tight text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            건너뛰기
          </button>
        </div>

        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
          {displayedDescription}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          {isFinishStep && finishMode === "prompt" ? (
            <>
              <button
                onClick={onFinishNo}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                아니요
              </button>
              <button
                onClick={onFinishYes}
                className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
              >
                네
              </button>
            </>
          ) : isFinishStep && finishMode === "member-button" ? (
            <>
              <button
                onClick={onMemberPracticeBack}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                이전
              </button>
              <button
                onClick={onOpenMemberPractice}
                className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
              >
                회원 등록 창 열기
              </button>
            </>
          ) : isFinishStep && finishMode === "join-link-button" ? (
            <>
              <button
                onClick={onJoinLinkPracticeBack}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                이전
              </button>
              <button
                onClick={onOpenJoinLinkPractice}
                className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
              >
                링크 복사 단계로 가기
              </button>
            </>
          ) : isFinishStep && finishMode === "join-link-copy" ? (
            <>
              <button
                onClick={onJoinLinkPracticeBack}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                이전
              </button>
              <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
                링크 복사 버튼을 눌러보세요
              </div>
            </>
          ) : (
            <>
              <button
                onClick={onPrev}
                disabled={stepIndex === 0}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                이전
              </button>

              {isLastStep ? (
                <button
                  onClick={onComplete}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  바로 시작하기
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
                >
                  다음
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
