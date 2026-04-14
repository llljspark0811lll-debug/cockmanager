type DashboardHeaderProps = {
  clubName: string;
  subscriptionEnd?: string | Date | null;
  onAddMember: () => void;
  onLogout: () => void;
  onOpenPersonalSettings: () => void;
  onRestartTutorial: () => void;
};

export function DashboardHeader({
  clubName,
  subscriptionEnd,
  onAddMember,
  onLogout,
  onOpenPersonalSettings,
  onRestartTutorial,
}: DashboardHeaderProps) {
  const subscriptionLabel = subscriptionEnd
    ? new Date(subscriptionEnd).toLocaleDateString("ko-KR")
    : "체험판 사용 중";

  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          배드민턴 클럽 운영
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black text-slate-900">
            {clubName} 
            <br />
            운영 대시보드
          </h1>

          <button
            onClick={onRestartTutorial}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
          >
            사용 가이드
          </button>

          <button
            onClick={onOpenPersonalSettings}
            aria-label="개인 설정"
            title="개인 설정"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
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
        </div>

        <p className="mt-2 text-sm text-slate-500">
          회원, 회비, 운동 일정, 출석을
          <br />
          한 곳에서 관리합니다.
        </p>
        <p className="mt-3 text-xs font-medium text-slate-400">
          구독 만료일 {subscriptionLabel}
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-3 md:items-end">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onAddMember}
            data-tutorial-id="add-member-button"
            className="rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
          >
            회원 직접 등록
          </button>
          <button
            onClick={onLogout}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
