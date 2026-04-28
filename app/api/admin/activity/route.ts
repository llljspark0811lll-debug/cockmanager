import { NextResponse } from "next/server";
import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert, type TelegramAlertInput } from "@/lib/telegram";

type ActivityBody =
  | { event: "ADMIN_MEMBERS_TAB_CLICK" }
  | { event: "ADMIN_FEES_TAB_CLICK" }
  | {
      event: "SESSION_BRACKET_SWAP";
      sessionTitle: string;
      roundNumber: number;
      fromCourtNumber: number;
      toCourtNumber: number;
      fromPlayerName: string;
      toPlayerName: string;
    };

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const body = (await req.json()) as ActivityBody;
    const club = await prisma.club.findUnique({
      where: { id: admin.clubId },
      select: { name: true },
    });
    const clubName = club?.name ?? String(admin.clubId);

    let payload: TelegramAlertInput | null = null;

    if (body.event === "ADMIN_MEMBERS_TAB_CLICK") {
      payload = { event: "ADMIN_MEMBERS_TAB_CLICK", clubName };
    } else if (body.event === "ADMIN_FEES_TAB_CLICK") {
      payload = { event: "ADMIN_FEES_TAB_CLICK", clubName };
    } else if (body.event === "SESSION_BRACKET_SWAP") {
      payload = {
        event: "SESSION_BRACKET_SWAP",
        clubName,
        sessionTitle: String(body.sessionTitle ?? ""),
        roundNumber: Number(body.roundNumber),
        fromCourtNumber: Number(body.fromCourtNumber),
        toCourtNumber: Number(body.toCourtNumber),
        fromPlayerName: String(body.fromPlayerName ?? ""),
        toPlayerName: String(body.toPlayerName ?? ""),
      };
    }

    if (!payload) {
      return NextResponse.json({ error: "지원하지 않는 활동 이벤트입니다." }, { status: 400 });
    }

    void sendTelegramAlert(payload);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/activity]", error);
    return NextResponse.json(
      { error: "활동 알림 전송에 실패했습니다." },
      { status: 500 }
    );
  }
}
