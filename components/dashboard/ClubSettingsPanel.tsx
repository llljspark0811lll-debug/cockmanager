"use client";

type ClubSettingsPanelProps = {
  customFieldLabel: string;
  draftLabel: string;
  adminEmail: string;
  adminEmailDraft: string;
  saving: boolean;
  joinLink: string;
  onChangeDraft: (value: string) => void;
  onChangeAdminEmailDraft: (value: string) => void;
  onSave: () => void;
};

export function ClubSettingsPanel({
  customFieldLabel,
  draftLabel,
  adminEmail,
  adminEmailDraft,
  saving,
  joinLink,
  onChangeDraft,
  onChangeAdminEmailDraft,
  onSave,
}: ClubSettingsPanelProps) {
  async function handleCopyJoinLink() {
    try {
      await navigator.clipboard.writeText(joinLink);
      alert("가입 신청 링크를 복사했습니다.");
    } catch {
      alert("가입 신청 링크 복사에 실패했습니다.");
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                클럽 설정
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">
                회원 추가 정보 항목 이름
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                차량번호, 소속클럽, 기수, 지역 같은 항목으로 유연하게 활용할 수
                있습니다.
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                현재 항목 이름: {customFieldLabel}
              </p>
            </div>

            <input
              value={draftLabel}
              onChange={(event) => onChangeDraft(event.target.value)}
              placeholder="예: 소속클럽"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                계정 보안
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">
                관리자 복구 이메일
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                아이디 찾기와 비밀번호 재설정 메일을 받는 주소입니다.
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-700 break-all">
                현재 이메일: {adminEmail || "미설정"}
              </p>
            </div>

            <input
              type="email"
              value={adminEmailDraft}
              onChange={(event) =>
                onChangeAdminEmailDraft(event.target.value)
              }
              placeholder="admin@example.com"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "저장 중..." : "설정 저장"}
          </button>
        </div>

        <div className="rounded-[1.5rem] bg-slate-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h4 className="text-lg font-black text-slate-900">
                가입 신청 공유 링크
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                이 링크를 카카오톡 단톡방이나 공지에 올리면, 신규 회원이 직접
                가입 신청서를 작성할 수 있습니다.
              </p>
            </div>

            <button
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

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-7 text-slate-600 sm:text-sm break-all">
            {joinLink || "클럽 정보를 불러오면 가입 신청 링크가 표시됩니다."}
          </div>
        </div>
      </div>
    </section>
  );
}
