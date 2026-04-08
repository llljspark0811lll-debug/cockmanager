import {
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const result = await prisma.memberRequest.updateMany({
      where: {
        clubId: admin.clubId,
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      rejectedCount: result.count,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "가입 신청 전체 거절 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
