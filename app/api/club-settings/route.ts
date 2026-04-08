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

    const { customFieldLabel } = await req.json();
    const nextLabel = String(customFieldLabel ?? "").trim();

    if (!nextLabel) {
      return NextResponse.json(
        { error: "항목 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    await prisma.admin.updateMany({
      where: {
        clubId: admin.clubId,
      },
      data: {
        customFieldLabel: nextLabel,
      },
    });

    return NextResponse.json({
      success: true,
      customFieldLabel: nextLabel,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "설정을 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
