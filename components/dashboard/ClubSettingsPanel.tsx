"use client";

type ClubSettingsPanelProps = {
  customFieldLabel: string;
  draftLabel: string;
  saving: boolean;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
};

export function ClubSettingsPanel({
  customFieldLabel,
  draftLabel,
  saving,
  onChangeDraft,
  onSave,
}: ClubSettingsPanelProps) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            클럽 설정
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">
            회원 추가 정보 항목 이름
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            차량번호, 소속클럽, 기수, 지역 같은 항목으로 유연하게 사용할 수
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

      <div className="mt-4 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving ? "저장 중..." : "설정 저장"}
        </button>
      </div>
    </section>
  );
}
