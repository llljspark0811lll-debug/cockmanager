import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashRecoveryToken } from "@/lib/account-recovery";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token ?? "").trim();
    const newPassword = String(body.newPassword ?? "");
    const confirmPassword = String(body.confirmPassword ?? "");

    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "토큰과 새 비밀번호 정보를 모두 입력해 주세요." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "비밀번호 확인이 일치하지 않습니다." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "비밀번호는 6자 이상으로 입력해 주세요." },
        { status: 400 }
      );
    }

    const hashedToken = hashRecoveryToken(token);

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        admin: true,
      },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "유효하지 않거나 만료된 재설정 링크입니다." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.admin.update({
        where: { id: resetToken.adminId },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          used: true,
        },
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          adminId: resetToken.adminId,
          used: false,
        },
        data: {
          used: true,
        },
      }),
    ]);

    return NextResponse.json({
      message: "비밀번호가 재설정되었습니다.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "비밀번호를 재설정하지 못했습니다." },
      { status: 500 }
    );
  }
}
