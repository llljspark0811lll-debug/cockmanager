import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const positions = await prisma.clubPosition.findMany({
      where: { clubId: admin.clubId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, order: true },
    });

    return NextResponse.json(positions);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "직위 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const { name } = await req.json();
    const trimmedName = String(name ?? "").trim();

    if (!trimmedName) {
      return NextResponse.json(
        { error: "직위 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.clubPosition.aggregate({
      where: { clubId: admin.clubId },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const position = await prisma.clubPosition.create({
      data: { name: trimmedName, order: nextOrder, clubId: admin.clubId },
      select: { id: true, name: true, order: true },
    });

    return NextResponse.json(position);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "직위 추가에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const { positions } = await req.json() as {
      positions: { id: number; order: number }[];
    };

    if (!Array.isArray(positions)) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    await prisma.$transaction(
      positions.map(({ id, order }) =>
        prisma.clubPosition.updateMany({
          where: { id, clubId: admin.clubId },
          data: { order },
        })
      )
    );

    const updated = await prisma.clubPosition.findMany({
      where: { clubId: admin.clubId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, order: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "직위 순서 변경에 실패했습니다." },
      { status: 500 }
    );
  }
}
