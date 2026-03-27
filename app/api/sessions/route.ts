import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const sessions = await prisma.clubSession.findMany({
      where: { clubId: admin.clubId },
      include: {
        participants: {
          include: {
            member: true,
            hostMember: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: [
        { date: "desc" },
        { startTime: "desc" },
      ],
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "운동 일정 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const {
      title,
      description,
      location,
      date,
      startTime,
      endTime,
      capacity,
    } = body;

    if (!title || !date || !startTime || !endTime) {
      return NextResponse.json(
        {
          error:
            "제목, 날짜, 시작 시간, 종료 시간은 필수입니다.",
        },
        { status: 400 }
      );
    }

    const session = await prisma.clubSession.create({
      data: {
        title: String(title).trim(),
        description: description
          ? String(description).trim()
          : "",
        location: location ? String(location).trim() : "",
        date: new Date(date),
        startTime: String(startTime),
        endTime: String(endTime),
        capacity:
          capacity === "" ||
          capacity === null ||
          capacity === undefined
            ? null
            : Number(capacity),
        clubId: admin.clubId,
      },
      include: {
        participants: {
          include: {
            member: true,
            hostMember: true,
          },
        },
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "운동 일정 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const {
      id,
      title,
      description,
      location,
      date,
      startTime,
      endTime,
      capacity,
      status,
    } = body;

    const sessionId = Number(id);

    const existingSession = await prisma.clubSession.findFirst({
      where: {
        id: sessionId,
        clubId: admin.clubId,
      },
    });

    if (!existingSession) {
      return notFoundResponse("수정할 일정을 찾을 수 없습니다.");
    }

    const updatedSession = await prisma.clubSession.update({
      where: { id: existingSession.id },
      data: {
        title:
          title !== undefined
            ? String(title).trim()
            : existingSession.title,
        description:
          description !== undefined
            ? String(description).trim()
            : existingSession.description,
        location:
          location !== undefined
            ? String(location).trim()
            : existingSession.location,
        date: date ? new Date(date) : existingSession.date,
        startTime: startTime ?? existingSession.startTime,
        endTime: endTime ?? existingSession.endTime,
        capacity:
          capacity === undefined
            ? existingSession.capacity
            : capacity === "" || capacity === null
              ? null
              : Number(capacity),
        status: status ?? existingSession.status,
      },
      include: {
        participants: {
          include: {
            member: true,
            hostMember: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "운동 일정 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id } = await req.json();
    const sessionId = Number(id);

    const existingSession = await prisma.clubSession.findFirst({
      where: {
        id: sessionId,
        clubId: admin.clubId,
      },
    });

    if (!existingSession) {
      return notFoundResponse("삭제할 일정을 찾을 수 없습니다.");
    }

    await prisma.clubSession.delete({
      where: { id: existingSession.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "운동 일정 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
