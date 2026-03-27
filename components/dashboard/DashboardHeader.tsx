type DashboardHeaderProps = {
  clubName: string;
  subscriptionEnd?: string | Date | null;
  onAddMember: () => void;
  onLogout: () => void;
};

export function DashboardHeader({
  clubName,
  subscriptionEnd,
  onAddMember,
  onLogout,
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
        <h1 className="mt-2 text-3xl font-black text-slate-900">
          {clubName} 운영 대시보드
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          회원, 회비, 일정, 출석을 한곳에서 관리합니다.
        </p>
        <p className="mt-3 text-xs font-medium text-slate-400">
          구독 만료일 {subscriptionLabel}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onAddMember}
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
