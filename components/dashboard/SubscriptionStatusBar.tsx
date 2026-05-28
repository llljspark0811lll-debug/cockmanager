"use client";

import { useState } from "react";
import { SubscriptionModal } from "@/components/dashboard/SubscriptionModal";

type Props = {
  status: "ACTIVE" | "EXEMPT";
  subscriptionEnd?: Date | string | null;
  clubName: string;
};

function formatKoreanDate(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function SubscriptionStatusBar({ status, subscriptionEnd, clubName }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  if (status === "EXEMPT") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
        <span className="text-base">🎁</span>
        <p className="text-sm font-bold text-emerald-700">무료 라이센스 적용 중</p>
      </div>
    );
  }

  if (status === "ACTIVE" && subscriptionEnd) {
    const endDate = new Date(subscriptionEnd);
    return (
      <>
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <p className="text-sm font-bold text-sky-700">
              구독 중&nbsp;
              <span className="font-medium text-sky-600">·&nbsp;만료일 {formatKoreanDate(endDate)}</span>
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-xl border border-sky-200 px-3 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100"
          >
            갱신
          </button>
        </div>
        {modalOpen && (
          <SubscriptionModal clubName={clubName} onClose={() => setModalOpen(false)} />
        )}
      </>
    );
  }

  return null;
}
