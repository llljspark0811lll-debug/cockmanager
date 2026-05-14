import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "token이 필요합니다." }, { status: 400 });
    }

    const session = await prisma.clubSession.findUnique({
      where: { publicToken: token },
      select: {
        id: true,
        courtBoard: {
          select: {
            id: true,
            isPublic: true,
            courts: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!session.courtBoard || !session.courtBoard.isPublic) {
      return NextResponse.json(null);
    }

    return NextResponse.json(session.courtBoard);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}
