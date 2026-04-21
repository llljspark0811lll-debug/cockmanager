"use client";

import { useEffect, useMemo, useState } from "react";

type DeferredBeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function getPwaEnvironment() {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isStandalone: false,
      isInAppBrowser: false,
    };
  }

  const userAgent = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isMobile = isIOS || isAndroid;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const isInAppBrowser =
    /KAKAOTALK|Instagram|FBAN|FBAV|FB_IAB|Line|NAVER|DaumApps|WebView|; wv\)/i.test(
      userAgent
    );

  return {
    isMobile,
    isIOS,
    isAndroid,
    isStandalone,
    isInAppBrowser,
  };
}

function openInChrome() {
  const currentUrl = window.location.href;
  const urlWithoutScheme = currentUrl.replace(/^https?:\/\//, "");
  window.location.href = `intent://${urlWithoutScheme}#Intent;scheme=https;package=com.android.chrome;end`;
}

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<DeferredBeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [mounted, setMounted] = useState(false);
  const env = useMemo(getPwaEnvironment, []);

  useEffect(() => {
    setMounted(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredBeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  async function handleClick() {
    if (deferredPrompt) {
      setIsInstalling(true);

      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } finally {
        setDeferredPrompt(null);
        setIsInstalling(false);
      }

      return;
    }

    if (env.isInAppBrowser && env.isAndroid) {
      openInChrome();
      window.setTimeout(() => {
        alert(
          "카카오톡/인스타 브라우저에서는 바로 설치가 안 될 수 있어요.\n우측 상단 메뉴에서 Chrome에서 열기를 누른 뒤 홈 화면에 추가해주세요."
        );
      }, 700);
      return;
    }

    if (env.isIOS) {
      alert(
        "아이폰은 Safari에서 하단 공유 버튼을 누른 뒤\n'홈 화면에 추가'를 선택하면 앱처럼 사용할 수 있어요."
      );
      return;
    }

    alert(
      "Chrome 우측 상단 메뉴에서 '앱 설치' 또는 '홈 화면에 추가'를 선택해주세요."
    );
  }

  if (!mounted || !env.isMobile || env.isStandalone) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isInstalling}
      className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 transition hover:border-sky-200 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 md:hidden"
    >
      <span aria-hidden="true">📲</span>
      {isInstalling ? "설치 준비 중" : "앱으로 설치"}
    </button>
  );
}
