import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const CODE_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "올바른 이메일 주소를 입력해 주세요." }, { status: 400 });
    }

    // 이미 가입된 이메일인지 확인
    const existing = await prisma.admin.findFirst({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 400 });
    }

    // 재발송 쿨다운: 60초 이내 재발송 방지
    const recentCode = await prisma.emailVerification.findFirst({
      where: {
        email,
        createdAt: { gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (recentCode) {
      return NextResponse.json(
        { error: `잠시 후 다시 시도해 주세요. (${RESEND_COOLDOWN_SECONDS}초 후 재발송 가능)` },
        { status: 429 }
      );
    }

    // 기존 미인증 코드 삭제 후 새 코드 발급
    await prisma.emailVerification.deleteMany({ where: { email, verified: false } });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.emailVerification.create({
      data: { email, code, expiresAt },
    });

    await sendEmail({
      to: email,
      subject: "[콕매니저] 이메일 인증 코드",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 8px;">
            🏸 콕매니저 이메일 인증
          </h2>
          <p style="color: #475569; font-size: 15px; margin-bottom: 24px;">
            아래 인증 코드를 입력해 주세요.
          </p>
          <div style="background: #f1f5f9; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0284c7;">
              ${code}
            </span>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">
            이 코드는 ${CODE_EXPIRY_MINUTES}분 후 만료됩니다.<br/>
            본인이 요청하지 않은 경우 이 메일을 무시해 주세요.
          </p>
        </div>
      `,
      text: `콕매니저 이메일 인증 코드: ${code}\n\n이 코드는 ${CODE_EXPIRY_MINUTES}분 후 만료됩니다.`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[send-code]", error);
    return NextResponse.json({ error: "인증 코드 발송에 실패했습니다." }, { status: 500 });
  }
}
