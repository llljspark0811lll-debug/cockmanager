import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const code = String(body.code ?? "").trim();

    if (!email || !code) {
      return NextResponse.json({ error: "이메일과 인증 코드를 입력해 주세요." }, { status: 400 });
    }

    const record = await prisma.emailVerification.findFirst({
      where: { email, verified: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json({ error: "인증 코드를 먼저 발송해 주세요." }, { status: 400 });
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json({ error: "인증 코드가 만료되었습니다. 다시 발송해 주세요." }, { status: 400 });
    }

    if (record.code !== code) {
      return NextResponse.json({ error: "인증 코드가 올바르지 않습니다." }, { status: 400 });
    }

    await prisma.emailVerification.update({
      where: { id: record.id },
      data: { verified: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[verify-code]", error);
    return NextResponse.json({ error: "인증 확인에 실패했습니다." }, { status: 500 });
  }
}
