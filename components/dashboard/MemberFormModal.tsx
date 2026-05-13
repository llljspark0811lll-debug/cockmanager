import { GENDERS, LEVELS } from "@/lib/dashboard-constants";
import type {
  ClubPosition,
  Member,
  MemberFormState,
} from "@/components/dashboard/types";
import { formatPhoneNumber } from "@/components/dashboard/utils";

type MemberFormModalProps = {
  open: boolean;
  editingMember: Member | null;
  form: MemberFormState;
  customFieldLabel: string;
  positions: ClubPosition[];
  tutorialTargetId?: string;
  onChange: (form: MemberFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function MemberFormModal({
  open,
  editingMember,
  form,
  customFieldLabel,
  positions,
  tutorialTargetId,
  onChange,
  onClose,
  onSubmit,
}: MemberFormModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm md:p-6">
      <div className="flex min-h-full items-start justify-center py-4 md:items-center">
        <div
          data-tutorial-id={tutorialTargetId}
          className="flex w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl md:max-h-[92vh]"
        >
          <div className="border-b border-slate-100 px-6 pb-4 pt-6">
            <h2 className="text-2xl font-black text-slate-900">
              {editingMember ? "회원 정보 수정" : "새 회원 등록"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              운영에 필요한 기본 회원 정보를 입력해주세요.
            </p>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-600">
                  이름
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    onChange({ ...form, name: event.target.value })
                  }
                  placeholder="홍길동"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">
                  성별
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {GENDERS.map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => onChange({ ...form, gender })}
                      className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                        form.gender === gender
                          ? gender === "남"
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-rose-500 bg-rose-500 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">
                  급수
                </span>
                <select
                  value={form.level}
                  onChange={(event) =>
                    onChange({ ...form, level: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                >
                  <option value="">급수 선택</option>
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">
                  직위
                </span>
                <select
                  value={form.positionId}
                  onChange={(event) =>
                    onChange({ ...form, positionId: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                >
                  <option value="">미지정</option>
                  {positions.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">
                  생년월일
                </span>
                <input
                  type="date"
                  value={form.birth}
                  onChange={(event) =>
                    onChange({ ...form, birth: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">
                  연락처
                </span>
                <input
                  value={form.phone}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      phone: formatPhoneNumber(event.target.value),
                    })
                  }
                  placeholder="010-0000-0000"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-600">
                  {customFieldLabel}
                </span>
                <input
                  value={form.customFieldValue}
                  onChange={(event) =>
                    onChange({ ...form, customFieldValue: event.target.value })
                  }
                  placeholder={`${customFieldLabel} 입력`}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-600">
                  메모
                </span>
                <textarea
                  value={form.note}
                  onChange={(event) =>
                    onChange({ ...form, note: event.target.value })
                  }
                  placeholder="운영 메모"
                  className="h-24 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </label>
            </div>
          </div>

          <div className="flex gap-3 border-t border-slate-100 px-6 py-5">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={onSubmit}
              className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
