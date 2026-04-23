"use client";

type PersonalSettingsModalProps = {
  open: boolean;
  clubName: string;
  adminEmail: string;
  currentPassword: string;
  saving: boolean;
  onChangeClubName: (value: string) => void;
  onChangeAdminEmail: (value: string) => void;
  onChangeCurrentPassword: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onDeleteAccount: () => void;
};

export function PersonalSettingsModal({
  open,
  clubName,
  adminEmail,
  currentPassword,
  saving,
  onChangeClubName,
  onChangeAdminEmail,
  onChangeCurrentPassword,
  onClose,
  onSubmit,
  onDeleteAccount,
}: PersonalSettingsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm md:p-6">
      <div className="flex min-h-full items-start justify-center py-4 md:items-center">
        <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl md:max-h-[92vh]">
          <div className="border-b border-slate-100 px-6 pb-4 pt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              개인 설정
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              계정과 클럽 정보를 변경하세요
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              클럽/소모임명과 관리자 복구 이메일을 변경할 수 있습니다.
              안전한 변경을 위해 현재 비밀번호 확인이 필요합니다.
            </p>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">
                  클럽/소모임명
                </span>
                <input
                  value={clubName}
                  onChange={(event) =>
                    onChangeClubName(event.target.value)
                  }
                  placeholder="예: 민턴클럽"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">
                  관리자 복구 이메일
                </span>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(event) =>
                    onChangeAdminEmail(event.target.value)
                  }
                  placeholder="admin@example.com"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">
                  현재 비밀번호
                </span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) =>
                    onChangeCurrentPassword(event.target.value)
                  }
                  placeholder="현재 로그인 비밀번호를 입력하세요"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
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
              disabled={saving}
              className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "저장 중..." : "변경 저장"}
            </button>
          </div>

          {/* 위험 영역 */}
          <div className="border-t border-dashed border-rose-200 bg-rose-50/60 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-rose-700">계정 탈퇴</p>
                <p className="mt-0.5 text-xs text-rose-400">클럽과 모든 데이터가 영구 삭제됩니다</p>
              </div>
              <button
                onClick={onDeleteAccount}
                className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition hover:border-rose-400 hover:bg-rose-600 hover:text-white"
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
