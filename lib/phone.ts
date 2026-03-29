export function normalizePhoneNumber(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatPhoneNumber(value: string | null | undefined) {
  const digits = normalizePhoneNumber(value);

  if (!digits) {
    return "";
  }

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(
    7,
    11
  )}`;
}
