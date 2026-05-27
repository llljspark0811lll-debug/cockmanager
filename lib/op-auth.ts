import { cookies } from "next/headers";

const OP_SESSION_COOKIE = "op_session";
const OP_SESSION_VALUE = "cockmanager_op_authenticated";

export function getOpPassword(): string {
  return process.env.OP_PASSWORD ?? "changeme";
}

export async function isOpAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(OP_SESSION_COOKIE)?.value === OP_SESSION_VALUE;
}

export function setOpSessionCookie(response: Response) {
  const maxAge = 60 * 60 * 8; // 8 hours
  response.headers.append(
    "Set-Cookie",
    `${OP_SESSION_COOKIE}=${OP_SESSION_VALUE}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`
  );
}
