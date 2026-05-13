import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const { id } = await params;
    const positionId = Number(id);
    const { name } = await req.json();
    const trimmedName = String(name ?? "").trim();

    if (!trimmedName) {
      return NextResponse.json(
        { error: "직위 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    const existing = await prisma.clubPosition.findFirst({
      where: { id: positionId, clubId: admin.clubId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "직위를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const updated = await prisma.clubPosition.update({
      where: { id: positionId },
      data: { name: trimmedName },
      select: { id: true, name: true, order: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "직위 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const { id } = await params;
    const positionId = Number(id);

    const existing = await prisma.clubPosition.findFirst({
      where: { id: positionId, clubId: admin.clubId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "직위를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.clubPosition.delete({ where: { id: positionId } });

    return NextResponse.json({ message: "삭제 성공" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "직위 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
