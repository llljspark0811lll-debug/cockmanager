import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id } = await req.json();
    const requestId = Number(id);

    const memberRequest = await prisma.memberRequest.findFirst({
      where: {
        id: requestId,
        clubId: admin.clubId,
      },
    });

    if (!memberRequest) {
      return notFoundResponse("가입 신청을 찾을 수 없습니다.");
    }

    await prisma.memberRequest.update({
      where: { id: memberRequest.id },
      data: {
        status: "REJECTED",
        processedAt: new Date(),
      },
    });

    const club = await prisma.club.findUnique({ where: { id: memberRequest.clubId }, select: { name: true } });
    void sendTelegramAlert({
      event: "MEMBER_REQUEST_REJECT",
      clubName: club?.name ?? String(memberRequest.clubId),
      name: memberRequest.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "가입 거절 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
