import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  normalizeEmail,
} from "@/lib/account-recovery";
import { isEmailConfigured, sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));

    if (!email) {
      return NextResponse.json(
        { error: "관리자 이메일을 입력해 주세요." },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findFirst({
      where: {
        email,
      },
      include: {
        club: {
          select: {
            name: true,
          },
        },
      },
    });

    let debugResetUrl: string | undefined;

    if (admin) {
      const { rawToken, hashedToken, expiresAt } =
        createPasswordResetToken();

      await prisma.$transaction([
        prisma.passwordResetToken.updateMany({
          where: {
            adminId: admin.id,
            used: false,
          },
          data: {
            used: true,
          },
        }),
        prisma.passwordResetToken.create({
          data: {
            token: hashedToken,
            expiresAt,
            adminId: admin.id,
          },
        }),
      ]);

      const resetUrl = buildPasswordResetUrl(rawToken);

      if (!isEmailConfigured()) {
        if (process.env.NODE_ENV !== "production") {
          debugResetUrl = resetUrl;
          console.warn(
            `[DEV] password recovery email not configured. Reset URL for ${admin.username}: ${resetUrl}`
          );
        } else {
          throw new Error(
            "메일 발송 환경변수가 설정되지 않았습니다."
          );
        }
      } else {
        await sendEmail({
          to: email,
          subject: `[${admin.club.name}] 관리자 계정 복구 안내`,
          text: [
            `${admin.club.name} 관리자 계정 복구 요청이 접수되었습니다.`,
            "",
            `관리자 아이디: ${admin.username}`,
            `비밀번호 재설정 링크: ${resetUrl}`,
            "",
            "이 링크는 1시간 동안만 유효합니다.",
            "본인이 요청하지 않았다면 이 메일을 무시해 주세요.",
          ].join("\n"),
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #111827;">
              <h2 style="margin-bottom: 12px;">${admin.club.name} 관리자 계정 복구 안내</h2>
              <p>관리자 아이디 찾기 및 비밀번호 재설정 요청이 접수되었습니다.</p>
              <p><strong>관리자 아이디:</strong> ${admin.username}</p>
              <p>
                아래 버튼을 눌러 새 비밀번호를 설정해 주세요.<br />
                링크 유효시간은 <strong>1시간</strong>입니다.
              </p>
              <p style="margin: 24px 0;">
                <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">
                  비밀번호 재설정하기
                </a>
              </p>
              <p style="word-break: break-all;">버튼이 열리지 않으면 아래 링크를 직접 열어 주세요.<br />${resetUrl}</p>
              <p>본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p>
            </div>
          `,
        });
      }
    }

    return NextResponse.json({
      message:
        "입력한 이메일이 등록되어 있다면 아이디 안내와 비밀번호 재설정 메일을 보냈습니다.",
      ...(debugResetUrl ? { debugResetUrl } : {}),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "계정 복구 메일을 보내지 못했습니다." },
      { status: 500 }
    );
  }
}
