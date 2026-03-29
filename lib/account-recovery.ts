import { createHash, randomBytes } from "crypto";

const PASSWORD_RESET_HOURS = 1;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function createPasswordResetToken() {
  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = hashRecoveryToken(rawToken);
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_HOURS * 60 * 60 * 1000
  );

  return {
    rawToken,
    hashedToken,
    expiresAt,
  };
}

export function hashRecoveryToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getAppBaseUrl() {
  const configured =
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "";

  return configured.replace(/\/+$/, "");
}

export function buildPasswordResetUrl(rawToken: string) {
  const baseUrl = getAppBaseUrl();

  if (!baseUrl) {
    throw new Error(
      "비밀번호 재설정 링크를 만들 수 없습니다. APP_BASE_URL 또는 NEXT_PUBLIC_APP_URL을 설정해주세요."
    );
  }

  return `${baseUrl}/admin/reset-password/${rawToken}`;
}
