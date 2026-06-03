import { NextResponse } from "next/server";
import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const body = await req.json();
    const daysRemaining = Number(body.daysRemaining ?? 0);

    const club = await prisma.club.findUnique({
      where: { id: admin.clubId },
      select: { id: true, name: true },
    });
    if (!club) return NextResponse.json({ error: "클럽 정보를 찾을 수 없습니다." }, { status: 404 });

    void sendTelegramAlert({
      event: "TRIAL_SUBSCRIBE_CLICK",
      clubId: club.id,
      clubName: club.name,
      daysRemaining,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
