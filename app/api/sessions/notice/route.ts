import { requireAuthAdmin, notFoundResponse, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ensureSessionNoticeColumn } from "@/lib/club-session-notice-schema";

export async function GET(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const sessionId = Number(searchParams.get("sessionId"));

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 });
    }

    await ensureSessionNoticeColumn();

    const rows = await prisma.$queryRaw<Array<{ notice: string }>>`
      SELECT "notice" FROM "ClubSession"
      WHERE "id" = ${sessionId} AND "clubId" = ${admin.clubId}
    `;

    if (rows.length === 0) return notFoundResponse();

    return NextResponse.json({ notice: rows[0].notice });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "공지를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const body = await req.json();
    const sessionId = Number(body.sessionId);
    const notice = String(body.notice ?? "").trim();

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 });
    }

    if (notice.length > 500) {
      return NextResponse.json({ error: "공지는 500자 이내로 입력해주세요." }, { status: 400 });
    }

    await ensureSessionNoticeColumn();

    const updated = await prisma.$queryRaw<Array<{ id: number }>>`
      UPDATE "ClubSession"
      SET "notice" = ${notice}
      WHERE "id" = ${sessionId} AND "clubId" = ${admin.clubId}
      RETURNING "id"
    `;

    if (updated.length === 0) return notFoundResponse();

    return NextResponse.json({ success: true, notice });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "공지를 저장하지 못했습니다." }, { status: 500 });
  }
}
