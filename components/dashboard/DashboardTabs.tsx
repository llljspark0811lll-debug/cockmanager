import type { DashboardTab } from "@/components/dashboard/types";

type DashboardTabsProps = {
  activeTab: DashboardTab;
  requestsCount: number;
  onChange: (tab: DashboardTab) => void;
};

const tabs: Array<{
  id: DashboardTab;
  label: string;
}> = [
  { id: "members", label: "회원" },
  { id: "requests", label: "가입 신청" },
  { id: "fees", label: "회비" },
  { id: "sessions", label: "운동 일정" },
  { id: "attendance", label: "출석·대진" },
  { id: "deleted", label: "탈퇴 회원" },
  { id: "stats", label: "활동 통계" },
];

export function DashboardTabs({
  activeTab,
  requestsCount,
  onChange,
}: DashboardTabsProps) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] snap-x snap-mandatory">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          data-tutorial-id={`tab-${tab.id}`}
          className={`inline-flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === tab.id
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {tab.label}
          {tab.id === "requests" && requestsCount > 0 ? (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">
              {requestsCount}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
