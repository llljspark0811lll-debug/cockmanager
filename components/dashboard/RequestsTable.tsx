import type { MemberRequest } from "@/components/dashboard/types";
import {
  formatDate,
  formatPhoneNumber,
  getGenderBadgeClasses,
  getLevelTextClasses,
  normalizeGenderLabel,
} from "@/components/dashboard/utils";

type RequestsTableProps = {
  requests: MemberRequest[];
  customFieldLabel: string;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
};

export function RequestsTable({
  requests,
  customFieldLabel,
  onApprove,
  onReject,
}: RequestsTableProps) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-4 font-semibold">이름</th>
              <th className="px-4 py-4 font-semibold">성별</th>
              <th className="px-4 py-4 font-semibold">생년월일</th>
              <th className="px-4 py-4 font-semibold">연락처</th>
              <th className="px-4 py-4 font-semibold">급수</th>
              <th className="px-4 py-4 font-semibold">
                {customFieldLabel}
              </th>
              <th className="px-4 py-4 font-semibold">메모</th>
              <th className="px-4 py-4 font-semibold">처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 font-bold text-slate-900">
                  {request.name}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getGenderBadgeClasses(
                      request.gender
                    )}`}
                  >
                    {normalizeGenderLabel(request.gender)}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-500">
                  {formatDate(request.birth)}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {formatPhoneNumber(request.phone) || "-"}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`text-xs font-extrabold ${getLevelTextClasses(
                      request.level
                    )}`}
                  >
                    {request.level}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-500">
                  {request.customFieldValue || "-"}
                </td>
                <td className="max-w-[220px] px-4 py-4 text-slate-400">
                  {request.note || "-"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApprove(request.id)}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => onReject(request.id)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                      거절
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {requests.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-sm text-slate-400"
                >
                  처리할 가입 신청이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
