import bcrypt from "bcrypt";
import {
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const {
      clubName,
      adminEmail,
      currentPassword,
    } = await req.json();

    const nextClubName = String(clubName ?? "").trim();
    const nextAdminEmail = String(adminEmail ?? "")
      .trim()
      .toLowerCase();
    const password = String(currentPassword ?? "");

    if (!nextClubName) {
      return NextResponse.json(
        { error: "클럽/소모임명을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!nextAdminEmail) {
      return NextResponse.json(
        { error: "관리자 복구 이메일을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "현재 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const currentAdmin = await prisma.admin.findUnique({
      where: { id: admin.adminId },
      select: {
        id: true,
        password: true,
        email: true,
      },
    });

    if (!currentAdmin) {
      return unauthorizedResponse();
    }

    const passwordMatched = await bcrypt.compare(
      password,
      currentAdmin.password
    );

    if (!passwordMatched) {
      return NextResponse.json(
        { error: "현재 비밀번호가 일치하지 않습니다." },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.admin.findFirst({
      where: {
        email: nextAdminEmail,
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
        {
          error:
            "이미 다른 관리자 계정에서 사용 중인 이메일입니다.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.club.update({
        where: {
          id: admin.clubId,
        },
        data: {
          name: nextClubName,
        },
      }),
      prisma.admin.update({
        where: {
          id: admin.adminId,
        },
        data: {
          email: nextAdminEmail,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      clubName: nextClubName,
      adminEmail: nextAdminEmail,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "개인 설정을 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
