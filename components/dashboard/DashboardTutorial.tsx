"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardTab } from "@/components/dashboard/types";

export type DashboardTutorialStep = {
  id: string;
  title: string;
  description: string;
  targetId?: string;
  tab?: DashboardTab;
};

type DashboardTutorialProps = {
  open: boolean;
  step: DashboardTutorialStep;
  stepIndex: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function DashboardTutorial({
  open,
  step,
  stepIndex,
  totalSteps,
  onPrev,
  onNext,
  onSkip,
  onComplete,
}: DashboardTutorialProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!open) {
      setTargetRect(null);
      return;
    }

    const updateLayout = () => {
      setIsMobile(window.innerWidth < 768);

      if (!step.targetId) {
        setTargetRect(null);
        return;
      }

      const element = document.querySelector(
        `[data-tutorial-id="${step.targetId}"]`
      ) as HTMLElement | null;

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: isMobile ? "center" : "nearest",
          inline: "center",
        });
      }

      setTargetRect(element?.getBoundingClientRect() ?? null);
    };

    const raf = window.requestAnimationFrame(updateLayout);
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
    };
  }, [open, step.targetId, step.tab]);

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
      top: fitsBelow
        ? preferredTop
        : Math.max(20, targetRect.top - 260),
      left: clamp(preferredLeft, 20, Math.max(20, maxLeft)),
      width: cardWidth,
    };
  }, [isMobile, targetRect]);

  if (!open) {
    return null;
  }

  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-slate-950/55" />

      {spotlightStyle ? (
        <div
          className="pointer-events-none absolute rounded-[1.75rem] border border-sky-300/70 bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]"
          style={spotlightStyle}
        />
      ) : null}

      <div
        className={`absolute z-[91] w-[min(92vw,24rem)] rounded-[1.75rem] border border-white/70 bg-white/95 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur ${
          isMobile || !cardStyle
            ? "bottom-4 left-1/2 -translate-x-1/2"
            : ""
        }`}
        style={cardStyle ?? undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
              사용 가이드 {stepIndex + 1}/{totalSteps}
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-900">
              {step.title}
            </h2>
          </div>
          <button
            onClick={onSkip}
            className="min-w-[4.5rem] rounded-full px-3 py-1 text-center text-xs font-semibold leading-tight text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 whitespace-nowrap"
          >
            건너뛰기
          </button>
        </div>

        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
          {step.description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
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
        </div>
      </div>
    </div>
  );
}
