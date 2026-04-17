import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getNextRegistrationStatus,
} from "@/lib/session-registration";
import { hasSessionParticipantGuestProfileColumns } from "@/lib/session-participant-schema";

function hasMissingGuestProfileColumns(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "");

  return (
    message.includes("guestAge") ||
    message.includes("guestGender") ||
    message.includes("guestLevel") ||
    message.includes("The column") ||
    message.includes("P2022")
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const name = String(body.name ?? "").trim();
    const age = String(body.age ?? "").replace(/\D/g, "");
    const gender = String(body.gender ?? "").trim();
    const level = String(body.level ?? "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "운동 일정 링크가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "이름을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!age) {
      return NextResponse.json(
        { error: "나이를 입력해주세요." },
        { status: 400 }
      );
    }

    const ageNumber = Number(age);
    if (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 120) {
      return NextResponse.json(
        { error: "나이는 1세부터 120세 사이로 입력해주세요." },
        { status: 400 }
      );
    }

    if (!gender) {
      return NextResponse.json(
        { error: "성별을 선택해주세요." },
        { status: 400 }
      );
    }

    if (!level) {
      return NextResponse.json(
        { error: "급수를 선택해주세요." },
        { status: 400 }
      );
    }

    const session = await prisma.clubSession.findUnique({
      where: { publicToken: token },
      include: {
        participants: {
          where: { status: { not: "CANCELED" } },
          select: { id: true, status: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "운동 일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (session.status !== "OPEN") {
      return NextResponse.json(
        { error: "현재 이 일정은 참석 신청을 받고 있지 않습니다." },
        { status: 400 }
      );
    }

    const registeredCount = session.participants.filter(
      (p) => p.status === "REGISTERED"
    ).length;

    const status = getNextRegistrationStatus(session.capacity, registeredCount, 1);

    const includeGuestProfile = await hasSessionParticipantGuestProfileColumns();

    const guestProfileData = includeGuestProfile
      ? { guestAge: ageNumber, guestGender: gender, guestLevel: level }
      : {};

    const participantData = {
      sessionId: session.id,
      guestName: name,
      ...guestProfileData,
      memberId: null,
      hostMemberId: null,
      status,
      attendanceStatus: "PENDING",
      checkedInAt: null,
      createdAt: new Date(),
    };

    const createParticipant = async (withProfile: boolean) => {
      const data = withProfile
        ? participantData
        : {
            sessionId: session.id,
            guestName: name,
            memberId: null,
            hostMemberId: null,
            status,
            attendanceStatus: "PENDING",
            checkedInAt: null,
            createdAt: new Date(),
          };

      if (withProfile) {
        await prisma.sessionParticipant.create({ data: data as never });
      } else {
        await prisma.sessionParticipant.createMany({ data: [data as never] });
      }
    };

    try {
      await createParticipant(includeGuestProfile);
    } catch (error) {
      if (includeGuestProfile && hasMissingGuestProfileColumns(error)) {
        await createParticipant(false);
      } else {
        throw error;
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "게스트 신청을 처리하지 못했습니다." },
      { status: 500 }
    );
  }
}
