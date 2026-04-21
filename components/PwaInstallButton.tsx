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

function showAndroidGuide() {
  alert(
    "콕매니저🏸를 홈 화면 앱으로 설치해보세요\n\n카카오톡 브라우저에서는 바로 설치가 어려워요. 우측 상단 메뉴에서 Chrome으로 연 뒤 '홈 화면에 추가'를 누르면\n\n콕매니저🏸를 앱처럼 바로 실행할 수 있습니다."
  );
}

function showIosGuide() {
  alert(
    "하단 공유 버튼에서 Safari로 연 뒤\n다시 한 번 하단 공유 버튼에서\n'홈 화면에 추가'를 누르면\n\n콕매니저🏸를 앱처럼\n바로 실행할 수 있습니다."
  );
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
      window.setTimeout(showAndroidGuide, 700);
      return;
    }

    if (env.isIOS) {
      showIosGuide();
      return;
    }

    alert(
      "콕매니저🏸를 홈 화면 앱으로 설치해보세요\n\n링크를 다시 찾지 않고, 앱처럼 바로 실행할 수 있습니다.\n\nChrome 우측 상단 메뉴에서 '홈 화면에 추가' 또는 '앱 설치'를 선택해주세요."
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
