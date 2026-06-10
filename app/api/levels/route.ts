import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LEVEL_NAMES, LEVEL_COUNT } from "@/lib/dashboard-constants";
import { NextResponse } from "next/server";

function buildDefaultLevels() {
  return Array.from({ length: LEVEL_COUNT }, (_, i) => ({
    rank: i + 1,
    name: DEFAULT_LEVEL_NAMES[i] ?? String(i + 1),
  }));
}

export async function GET() {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const saved = await prisma.clubLevel.findMany({
      where: { clubId: admin.clubId },
      orderBy: { rank: "asc" },
      select: { rank: true, name: true },
    });

    if (saved.length === LEVEL_COUNT) {
      return NextResponse.json(saved);
    }

    const defaults = buildDefaultLevels();
    const savedMap = new Map(saved.map((l) => [l.rank, l.name]));
    return NextResponse.json(
      defaults.map((d) => ({ rank: d.rank, name: savedMap.get(d.rank) ?? d.name }))
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "급수 설정을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const { levels } = await req.json() as {
      levels: { rank: number; name: string }[];
    };

    if (!Array.isArray(levels) || levels.length !== LEVEL_COUNT) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    for (const l of levels) {
      if (typeof l.rank !== "number" || l.rank < 1 || l.rank > LEVEL_COUNT) {
        return NextResponse.json({ error: "잘못된 급수 번호입니다." }, { status: 400 });
      }
      const name = String(l.name ?? "").trim();
      if (!name) {
        return NextResponse.json({ error: "급수 이름을 모두 입력해주세요." }, { status: 400 });
      }
    }

    await prisma.$transaction(
      levels.map((l) =>
        prisma.clubLevel.upsert({
          where: { clubId_rank: { clubId: admin.clubId, rank: l.rank } },
          update: { name: String(l.name).trim() },
          create: { clubId: admin.clubId, rank: l.rank, name: String(l.name).trim() },
        })
      )
    );

    const updated = await prisma.clubLevel.findMany({
      where: { clubId: admin.clubId },
      orderBy: { rank: "asc" },
      select: { rank: true, name: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "급수 설정 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
