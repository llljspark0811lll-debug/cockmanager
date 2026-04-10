"use client";

type JoinRequestLinkPanelProps = {
  joinLink: string;
  onCopied?: () => void;
  showCopySuccessAlert?: boolean;
};

export function JoinRequestLinkPanel({
  joinLink,
  onCopied,
  showCopySuccessAlert = true,
}: JoinRequestLinkPanelProps) {
  async function handleCopyJoinLink() {
    try {
      await navigator.clipboard.writeText(joinLink);
      if (showCopySuccessAlert) {
        alert("가입 신청 링크를 복사했습니다.");
      }
      onCopied?.();
    } catch {
      alert("가입 신청 링크 복사에 실패했습니다.");
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            가입 링크
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">
            가입 신청 공유 링크
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            이 링크를 카카오톡 단체방이나 공지에 공유하면 신규 회원이 직접
            가입 신청서를 작성할 수 있습니다.
          </p>
        </div>

        <button
          data-tutorial-id="join-request-copy-button"
          onClick={() => {
            handleCopyJoinLink().catch(() => {
              alert("가입 신청 링크 복사에 실패했습니다.");
            });
          }}
          disabled={!joinLink}
          className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          링크 복사
        </button>
      </div>

      <div className="mt-4 break-all rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-7 text-slate-600 sm:text-sm">
        {joinLink || "클럽 정보를 불러오면 가입 신청 링크가 표시됩니다."}
      </div>
    </section>
  );
}
