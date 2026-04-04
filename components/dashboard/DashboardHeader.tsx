type DashboardHeaderProps = {
  clubName: string;
  subscriptionEnd?: string | Date | null;
  onAddMember: () => void;
  onLogout: () => void;
  onRestartTutorial: () => void;
};

export function DashboardHeader({
  clubName,
  subscriptionEnd,
  onAddMember,
  onLogout,
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
            {clubName} 운영 대시보드
          </h1>
          <button
            onClick={onRestartTutorial}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
          >
            사용 가이드
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          회원, 회비, 일정, 출석을 한곳에서 관리합니다.
        </p>
        <p className="mt-3 text-xs font-medium text-slate-400">
          구독 만료일 {subscriptionLabel}
        </p>
      </div>

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
  );
}
