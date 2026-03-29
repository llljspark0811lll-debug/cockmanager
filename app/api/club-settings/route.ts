import {
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = await requireAuthAdmin();

  if (!admin) {
    return unauthorizedResponse();
  }

  const currentAdmin = await prisma.admin.findUnique({
    where: { id: admin.adminId },
    select: {
      customFieldLabel: true,
      email: true,
    },
  });

  return NextResponse.json({
    customFieldLabel:
      currentAdmin?.customFieldLabel ?? "차량번호",
    adminEmail: currentAdmin?.email ?? "",
  });
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { customFieldLabel, adminEmail } = await req.json();
    const nextLabel = String(customFieldLabel ?? "").trim();
    const nextEmail = String(adminEmail ?? "")
      .trim()
      .toLowerCase();

    if (!nextLabel) {
      return NextResponse.json(
        { error: "항목 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!nextEmail) {
      return NextResponse.json(
        { error: "관리자 복구 이메일을 입력해주세요." },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.admin.findFirst({
      where: {
        email: nextEmail,
        id: {
          not: admin.adminId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "이미 다른 관리자 계정에서 사용 중인 이메일입니다." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.admin.updateMany({
        where: {
          clubId: admin.clubId,
        },
        data: {
          customFieldLabel: nextLabel,
        },
      }),
      prisma.admin.update({
        where: { id: admin.adminId },
        data: {
          email: nextEmail,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      customFieldLabel: nextLabel,
      adminEmail: nextEmail,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "설정을 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
