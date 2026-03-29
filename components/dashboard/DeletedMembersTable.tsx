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

function DeletedMemberCard({
  member,
  customFieldLabel,
  onRestore,
  onPermanentDelete,
}: {
  member: Member;
  customFieldLabel: string;
  onRestore: (id: number) => void;
  onPermanentDelete: (id: number) => void;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-black text-slate-700">
            {member.name}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getGenderBadgeClasses(
                member.gender
              )}`}
            >
              {normalizeGenderLabel(member.gender)}
            </span>
            <span
              className={`text-xs font-extrabold ${getLevelTextClasses(
                member.level
              )}`}
            >
              {member.level}
            </span>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-[92px_1fr] gap-y-2 text-sm">
        <dt className="font-semibold text-slate-500">생년월일</dt>
        <dd className="text-slate-600">{formatDate(member.birth)}</dd>

        <dt className="font-semibold text-slate-500">탈퇴일</dt>
        <dd className="font-semibold text-rose-600">
          {formatDate(member.deletedAt)}
        </dd>

        <dt className="font-semibold text-slate-500">연락처</dt>
        <dd className="text-slate-600">
          {formatPhoneNumber(member.phone) || "-"}
        </dd>

        <dt className="font-semibold text-slate-500">
          {customFieldLabel}
        </dt>
        <dd className="text-slate-600">
          {member.customFieldValue || "-"}
        </dd>
      </dl>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onRestore(member.id)}
          className="flex-1 rounded-xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
        >
          복구
        </button>
        <button
          onClick={() => onPermanentDelete(member.id)}
          className="flex-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
        >
          영구 삭제
        </button>
      </div>
    </div>
  );
}

export function DeletedMembersTable({
  members,
  customFieldLabel,
  onRestore,
  onPermanentDelete,
}: DeletedMembersTableProps) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[960px] text-sm">
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

      <div className="space-y-3 p-4 lg:hidden">
        {members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            탈퇴 회원이 없습니다.
          </div>
        ) : null}

        {members.map((member) => (
          <DeletedMemberCard
            key={member.id}
            member={member}
            customFieldLabel={customFieldLabel}
            onRestore={onRestore}
            onPermanentDelete={onPermanentDelete}
          />
        ))}
      </div>
    </div>
  );
}
