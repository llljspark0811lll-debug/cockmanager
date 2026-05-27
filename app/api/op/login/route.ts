import { NextResponse } from "next/server";
import { getOpPassword, setOpSessionCookie } from "@/lib/op-auth";

export async function POST(req: Request) {
  const { password } = await req.json();
  if (password !== getOpPassword()) {
    return NextResponse.json({ error: "비밀번호가 틀렸습니다." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  setOpSessionCookie(res as unknown as Response);
  return res;
}
