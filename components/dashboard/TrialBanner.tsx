"use client";

import { useState } from "react";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";

type TrialBannerProps = {
  daysRemaining: number;
  clubName: string;
};

export function TrialBanner({ daysRemaining, clubName }: TrialBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isUrgent = daysRemaining <= 3;

  return (
    <>
      <div
        className={`mb-4 flex items-center justify-between rounded-2xl px-5 py-3 ${
          isUrgent
            ? "bg-red-50 border border-red-200"
            : "bg-amber-50 border border-amber-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{isUrgent ? "⏰" : "💡"}</span>
          <p className={`text-sm font-medium ${isUrgent ? "text-red-700" : "text-amber-700"}`}>
            무료 체험 기간이 <span className="font-black">{daysRemaining}일</span> 남았습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold text-white transition ${
              isUrgent ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            구독하기
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      </div>

      {modalOpen && (
        <SubscriptionModal
          clubName={clubName}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
