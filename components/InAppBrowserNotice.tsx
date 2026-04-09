"use client";

import { useEffect, useMemo, useState } from "react";

const DISMISS_KEY = "kokmanager_inapp_notice_dismissed";

function detectInAppBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const isInAppBrowser =
    /KAKAOTALK|Instagram|FBAN|FBAV|FB_IAB|Line|NAVER|DaumApps|WebView|; wv\)/i.test(
      userAgent,
    );

  return isMobile && isInAppBrowser;
}

export default function InAppBrowserNotice() {
  const [visible, setVisible] = useState(false);
  const isInAppBrowser = useMemo(detectInAppBrowser, []);

  useEffect(() => {
    if (!isInAppBrowser) {
      document.documentElement.removeAttribute("data-in-app-browser");
      return;
    }

    document.documentElement.setAttribute("data-in-app-browser", "true");

    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY) === "true";
      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }

    return () => {
      document.documentElement.removeAttribute("data-in-app-browser");
    };
  }, [isInAppBrowser]);

  if (!isInAppBrowser || !visible) {
    return null;
  }

  return (
    <div className="sticky top-0 z-[100] border-b border-sky-100 bg-white/95 px-4 py-2 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-3">
        <p className="text-[11px] leading-5 text-slate-500 sm:text-xs">
          화면이 다르게 보이면 우측 상단 메뉴에서
          <br />
          <span className="font-semibold text-slate-700"> Chrome에서 열기</span>
          를 눌러주세요.
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.setItem(DISMISS_KEY, "true");
            } catch {
              // Ignore storage failures and just hide the banner.
            }
            setVisible(false);
          }}
          className="shrink-0 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
