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
  approvingIds?: number[];
  bulkProcessing?: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
};

function RequestCard({
  request,
  customFieldLabel,
  approving,
  bulkProcessing,
  onApprove,
  onReject,
}: {
  request: MemberRequest;
  customFieldLabel: string;
  approving: boolean;
  bulkProcessing: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const disabled = approving || bulkProcessing;

  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-black text-slate-900">
            {request.name}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getGenderBadgeClasses(
                request.gender
              )}`}
            >
              {normalizeGenderLabel(request.gender)}
            </span>
            <span
              className={`text-xs font-extrabold ${getLevelTextClasses(
                request.level
              )}`}
            >
              {request.level}
            </span>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-[92px_1fr] gap-y-2 text-sm">
        <dt className="font-semibold text-slate-500">생년월일</dt>
        <dd className="text-slate-700">{formatDate(request.birth)}</dd>

        <dt className="font-semibold text-slate-500">연락처</dt>
        <dd className="text-slate-700">
          {formatPhoneNumber(request.phone) || "-"}
        </dd>

        <dt className="font-semibold text-slate-500">
          {customFieldLabel}
        </dt>
        <dd className="text-slate-700">
          {request.customFieldValue || "-"}
        </dd>

        <dt className="font-semibold text-slate-500">메모</dt>
        <dd className="text-slate-700">{request.note || "-"}</dd>
      </dl>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onApprove(request.id)}
          disabled={disabled}
          className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          {approving ? "처리 중..." : "승인"}
        </button>
        <button
          onClick={() => onReject(request.id)}
          disabled={disabled}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          거절
        </button>
      </div>
    </div>
  );
}

export function RequestsTable({
  requests,
  customFieldLabel,
  approvingIds = [],
  bulkProcessing = false,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll,
}: RequestsTableProps) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">
            가입 신청 목록
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            들어온 신청을 개별로 확인하거나 한 번에 처리할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onApproveAll}
            disabled={requests.length === 0 || bulkProcessing}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {bulkProcessing ? "처리 중..." : "전체 승인"}
          </button>
          <button
            onClick={onRejectAll}
            disabled={requests.length === 0 || bulkProcessing}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            전체 거절
          </button>
        </div>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[960px] text-sm">
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
            {requests.map((request) => {
              const approving = approvingIds.includes(request.id);
              const disabled = approving || bulkProcessing;

              return (
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
                        disabled={disabled}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                      >
                        {approving ? "처리 중..." : "승인"}
                      </button>
                      <button
                        onClick={() => onReject(request.id)}
                        disabled={disabled}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        거절
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

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

      <div className="space-y-3 p-4 lg:hidden">
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            처리할 가입 신청이 없습니다.
          </div>
        ) : null}

        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            customFieldLabel={customFieldLabel}
            approving={approvingIds.includes(request.id)}
            bulkProcessing={bulkProcessing}
            onApprove={onApprove}
            onReject={onReject}
          />
        ))}
      </div>
    </div>
  );
}
