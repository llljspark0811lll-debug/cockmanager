type DashboardHeaderProps = {
  clubName: string;
  subscriptionEnd?: string | Date | null;
  onLogout: () => void;
  onOpenPersonalSettings: () => void;
  onRestartTutorial: () => void;
  onOpenSupport: () => void;
};

export function DashboardHeader({
  clubName,
  subscriptionEnd,
  onLogout,
  onOpenPersonalSettings,
  onRestartTutorial,
  onOpenSupport,
}: DashboardHeaderProps) {
  const subscriptionLabel = subscriptionEnd
    ? new Date(subscriptionEnd).toLocaleDateString("ko-KR")
    : "체험판 사용 중";

  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          배드민턴 클럽/소모임 운영
        </p>

        <div className="mt-2">
          <h1 className="text-3xl font-black text-slate-900">
            {clubName}
            <br />
            운영 대시보드
          </h1>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          회원, 회비, 통계, 운동 일정, 자동 대진표를 한 곳에서 관리합니다.
        </p>
        {/*
        <p className="mt-3 text-xs font-medium text-slate-400">
          구독 만료일 {subscriptionLabel}
        </p>
        */}
      </div>

      <div className="flex w-full items-center gap-1.5 md:w-auto md:gap-2">
        <button
          onClick={onRestartTutorial}
          className="flex-1 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:flex-none md:px-4 md:text-sm"
        >
          사용 가이드
        </button>
        <button
          onClick={onOpenSupport}
          className="flex-1 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:flex-none md:px-4 md:text-sm"
        >
          문의 / 요청
        </button>
        <button
          onClick={onLogout}
          className="flex-1 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:flex-none md:px-4 md:text-sm"
        >
          로그아웃
        </button>
        <button
          onClick={onOpenPersonalSettings}
          aria-label="개인 설정"
          title="개인 설정"
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 md:h-11 md:w-11"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.24.31.44.65.6 1a1.65 1.65 0 0 0 1 .33H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1 .33 1.65 1.65 0 0 0-.51.34z" />
          </svg>
        </button>
        <a
          href="https://www.instagram.com/cock_manager_official/"
          target="_blank"
          rel="noreferrer"
          aria-label="콕매니저 인스타그램"
          title="콕매니저 인스타그램"
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white transition hover:border-rose-200 hover:bg-rose-50 md:h-11 md:w-11"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
          >
            <defs>
              <linearGradient
                id="instagramOutlineGradient"
                x1="0%"
                y1="100%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#feda75" />
                <stop offset="35%" stopColor="#fa7e1e" />
                <stop offset="65%" stopColor="#d62976" />
                <stop offset="100%" stopColor="#962fbf" />
              </linearGradient>
            </defs>
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="5"
              ry="5"
              stroke="url(#instagramOutlineGradient)"
              strokeWidth="2"
            />
            <circle
              cx="12"
              cy="12"
              r="4"
              stroke="url(#instagramOutlineGradient)"
              strokeWidth="2"
            />
            <circle
              cx="17.5"
              cy="6.5"
              r="1.2"
              fill="url(#instagramOutlineGradient)"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
