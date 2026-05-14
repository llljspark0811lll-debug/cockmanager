import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const { sessionId } = await req.json();
    const parsedSessionId = Number(sessionId);

    const [session, club] = await Promise.all([
      prisma.clubSession.findFirst({
        where: { id: parsedSessionId, clubId: admin.clubId },
        select: { title: true },
      }),
      prisma.club.findUnique({
        where: { id: admin.clubId },
        select: { name: true },
      }),
    ]);

    if (!session) return NextResponse.json({ ok: false });

    await sendTelegramAlert({
      event: "COURT_BOARD_START",
      clubName: club?.name ?? "",
      sessionTitle: session.title,
      courtCount: 2,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[court-board/track] error:", error);
    return NextResponse.json({ ok: false });
  }
}
