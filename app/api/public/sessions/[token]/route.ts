import { prisma } from "@/lib/prisma";
import {
  getRegisteredParticipants,
  getWaitlistedParticipants,
} from "@/lib/session-summary";
import { NextResponse } from "next/server";

function getParticipantName(participant: {
  guestName?: string | null;
  member?: { name: string } | null;
}) {
  if (participant.guestName) {
    return `${participant.guestName} (게스트)`;
  }

  return participant.member?.name ?? "이름 없음";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    const session = await prisma.clubSession.findUnique({
      where: { publicToken: String(token).trim() },
      include: {
        club: {
          select: {
            name: true,
            publicJoinToken: true,
          },
        },
        participants: {
          where: {
            status: {
              not: "CANCELED",
            },
          },
          include: {
            member: {
              select: {
                name: true,
              },
            },
            hostMember: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "운동 일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: session.id,
      publicToken: session.publicToken,
      title: session.title,
      description: session.description,
      location: session.location,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      capacity: session.capacity,
      status: session.status,
      clubName: session.club.name,
      joinToken: session.club.publicJoinToken,
      registeredCount: getRegisteredParticipants(session.participants),
      waitlistCount: getWaitlistedParticipants(session.participants),
      participantNames: session.participants
        .filter((participant) => participant.status === "REGISTERED")
        .map(getParticipantName),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "운동 일정 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
