import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ensureTutorialColumns } from "@/lib/tutorial-schema";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    await ensureTutorialColumns();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM "SessionParticipant"
        WHERE "sessionId" IN (
          SELECT id FROM "ClubSession"
          WHERE "clubId" = ${admin.clubId} AND "isSample" = true
        )
      `;
      await tx.$executeRaw`
        DELETE FROM "ClubSession"
        WHERE "clubId" = ${admin.clubId} AND "isSample" = true
      `;
      await tx.$executeRaw`
        DELETE FROM "Member"
        WHERE "clubId" = ${admin.clubId} AND "isSample" = true
      `;
      await tx.$executeRaw`
        UPDATE "Club"
        SET "tutorialCompleted" = true
        WHERE id = ${admin.clubId}
      `;
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[tutorial/cleanup]", error);
    return NextResponse.json(
      { error: "샘플 데이터를 정리하는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
