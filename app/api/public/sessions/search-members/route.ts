import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const name = String(body.name ?? "").trim();

    if (!token || !name) {
      return NextResponse.json({ members: [] });
    }

    const session = await prisma.clubSession.findUnique({
      where: { publicToken: token },
      select: { clubId: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "운동 일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const members = await prisma.member.findMany({
      where: {
        clubId: session.clubId,
        deleted: false,
        name: { contains: name },
      },
      select: { id: true, name: true, gender: true, level: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
