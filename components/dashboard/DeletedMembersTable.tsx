import type { Member } from "@/components/dashboard/types";
import {
  formatDate,
  formatPhoneNumber,
  getGenderBadgeClasses,
  getLevelTextClasses,
  normalizeGenderLabel,
} from "@/components/dashboard/utils";

type DeletedMembersTableProps = {
  members: Member[];
  customFieldLabel: string;
  onRestore: (id: number) => void;
  onPermanentDelete: (id: number) => void;
};

export function DeletedMembersTable({
  members,
  customFieldLabel,
  onRestore,
  onPermanentDelete,
}: DeletedMembersTableProps) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-4 font-semibold">이름</th>
              <th className="px-4 py-4 font-semibold">성별</th>
              <th className="px-4 py-4 font-semibold">생년월일</th>
              <th className="px-4 py-4 font-semibold">탈퇴일</th>
              <th className="px-4 py-4 font-semibold">연락처</th>
              <th className="px-4 py-4 font-semibold">급수</th>
              <th className="px-4 py-4 font-semibold">
                {customFieldLabel}
              </th>
              <th className="px-4 py-4 font-semibold">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => (
              <tr key={member.id} className="bg-slate-50/60">
                <td className="px-4 py-4 font-bold text-slate-500">
                  {member.name}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getGenderBadgeClasses(
                      member.gender
                    )}`}
                  >
                    {normalizeGenderLabel(member.gender)}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-400">
                  {formatDate(member.birth)}
                </td>
                <td className="px-4 py-4 font-semibold text-rose-500">
                  {formatDate(member.deletedAt)}
                </td>
                <td className="px-4 py-4 text-slate-400">
                  {formatPhoneNumber(member.phone) || "-"}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`text-xs font-extrabold ${getLevelTextClasses(
                      member.level
                    )}`}
                  >
                    {member.level}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-400">
                  {member.customFieldValue || "-"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onRestore(member.id)}
                      className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
                    >
                      복구
                    </button>
                    <button
                      onClick={() =>
                        onPermanentDelete(member.id)
                      }
                      className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                    >
                      영구 삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-sm text-slate-400"
                >
                  탈퇴 회원이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
