import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const sessionId = Number(searchParams.get("sessionId"));

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 });
    }

    const session = await prisma.clubSession.findFirst({
      where: { id: sessionId, clubId: admin.clubId },
      select: { id: true },
    });

    if (!session) {
      return notFoundResponse("운동 일정을 찾을 수 없습니다.");
    }

    const board = await prisma.courtBoard.findUnique({
      where: { sessionId },
    });

    return NextResponse.json(board ?? null);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { sessionId } = await req.json();
    const parsedSessionId = Number(sessionId);

    const session = await prisma.clubSession.findFirst({
      where: { id: parsedSessionId, clubId: admin.clubId },
      select: { id: true },
    });

    if (!session) {
      return notFoundResponse("운동 일정을 찾을 수 없습니다.");
    }

    const board = await prisma.courtBoard.upsert({
      where: { sessionId: parsedSessionId },
      create: { sessionId: parsedSessionId, courts: [], isPublic: false },
      update: {},
    });

    return NextResponse.json(board);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id, courts, isPublic } = await req.json();
    const parsedId = Number(id);

    const existing = await prisma.courtBoard.findFirst({
      where: { id: parsedId, session: { clubId: admin.clubId } },
      select: { id: true },
    });

    if (!existing) {
      return notFoundResponse("코트보드를 찾을 수 없습니다.");
    }

    const updated = await prisma.courtBoard.update({
      where: { id: parsedId },
      data: {
        ...(courts !== undefined ? { courts } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id } = await req.json();
    const parsedId = Number(id);

    const existing = await prisma.courtBoard.findFirst({
      where: { id: parsedId, session: { clubId: admin.clubId } },
      select: { id: true },
    });

    if (!existing) {
      return notFoundResponse("코트보드를 찾을 수 없습니다.");
    }

    await prisma.courtBoard.delete({ where: { id: parsedId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "요청에 실패했습니다." }, { status: 500 });
  }
}
