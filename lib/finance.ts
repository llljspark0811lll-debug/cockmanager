export function buildMonthlyFeeReferenceKey(
  clubId: number,
  memberId: number,
  year: number,
  month: number
) {
  return `MONTHLY_FEE:${clubId}:${memberId}:${year}:${month}`;
}

export function buildMonthlyFeeTitle(
  memberName: string,
  year: number,
  month: number
) {
  return `${memberName} ${year}년 ${month}월 월회비`;
}

export function buildSpecialFeeReferenceKey(
  clubId: number,
  specialFeeId: number,
  memberId: number
) {
  return `SPECIAL_FEE:${clubId}:${specialFeeId}:${memberId}`;
}

export function buildSpecialFeeTitle(
  memberName: string,
  feeTitle: string
) {
  return `${memberName} ${feeTitle}`;
}

export function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export function formatNumberInput(value: string | number) {
  const digits = String(value ?? "").replace(/[^\d-]/g, "");

  if (!digits || digits === "-") {
    return "";
  }

  const parsed = Number(digits);

  if (!Number.isFinite(parsed)) {
    return "";
  }

  return parsed.toLocaleString("ko-KR");
}

export function parseNumberInput(value: string) {
  const digits = value.replace(/[^\d-]/g, "");

  if (!digits || digits === "-") {
    return 0;
  }

  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const LEDGER_CATEGORY_OPTIONS = {
  income: [
    { value: "MONTHLY_FEE", label: "월회비" },
    { value: "YEARLY_FEE", label: "연회비" },
    { value: "GUEST_FEE", label: "게스트비" },
    { value: "SUPPORT", label: "찬조금" },
    { value: "OTHER_INCOME", label: "기타 입금" },
  ],
  expense: [
    { value: "SHUTTLECOCK", label: "콕 구입" },
    { value: "COURT", label: "코트비" },
    { value: "SNACK", label: "간식비" },
    { value: "TOURNAMENT", label: "대회비" },
    { value: "DINING", label: "회식비" },
    { value: "SUPPLIES", label: "비품비" },
    { value: "OTHER_EXPENSE", label: "기타 지출" },
  ],
} as const;
