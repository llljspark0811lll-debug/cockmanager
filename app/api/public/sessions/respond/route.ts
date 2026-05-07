import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPublicMemberToken } from "@/lib/public-member-auth";
import {
  getNextRegistrationStatus,
  promoteWaitlistIfPossible,
} from "@/lib/session-registration";
import { hasSessionParticipantGuestProfileColumns } from "@/lib/session-participant-schema";
import { sendTelegramAlert } from "@/lib/telegram";

type GuestEntry = {
  name: string;
  age: string;
  gender: string;
  level: string;
};

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

async function findSessionForRespond(token: string) {
  return prisma.clubSession.findUnique({
    where: { publicToken: token },
    include: {
      participants: {
        select: {
          id: true,
          status: true,
          memberId: true,
          hostMemberId: true,
          guestName: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

function sanitizeGuestEntries(value: unknown): GuestEntry[] {
  const legacyGuestNames = Array.isArray(value)
    ? value
    : Array.isArray((value as { guestNames?: unknown[] } | null)?.guestNames)
      ? ((value as { guestNames?: unknown[] }).guestNames ?? [])
      : [];

  return legacyGuestNames
    .map((item) => {
      if (typeof item === "string") {
        return {
          name: item.trim(),
          age: "",
          gender: "",
          level: "",
        };
      }

      return {
        name: String((item as GuestEntry | null)?.name ?? "").trim(),
        age: String((item as GuestEntry | null)?.age ?? "").replace(/\D/g, ""),
        gender: String((item as GuestEntry | null)?.gender ?? "").trim(),
        level: String((item as GuestEntry | null)?.level ?? "").trim(),
      };
    })
    .filter((item) => item.name)
    .slice(0, 5);
}

function validateGuestEntries(guests: GuestEntry[]) {
  const invalidGuest = guests.find(
    (guest) => !guest.name || !guest.age || !guest.gender || !guest.level
  );

  if (invalidGuest) {
    return "게스트 정보를 모두 입력해주세요. 이름, 나이, 성별, 급수를 확인해주세요.";
  }

  const invalidAge = guests.find((guest) => {
    const age = Number(guest.age);
    return !Number.isInteger(age) || age < 1 || age > 120;
  });

  if (invalidAge) {
    return "게스트 나이는 1세부터 120세 사이로 입력해주세요.";
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const rememberToken = String(body.rememberToken ?? "").trim();
    const action = body.action === "CANCEL" ? "CANCEL" : "REGISTER";
    const guestEntries = sanitizeGuestEntries(body.guests ?? body.guestNames);

    if (!token || !rememberToken) {
      return NextResponse.json(
        { error: "회원 확인 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const guestValidationError = validateGuestEntries(guestEntries);

    if (guestValidationError) {
      return NextResponse.json(
        { error: guestValidationError },
        { status: 400 }
      );
    }

    const session = await findSessionForRespond(token);

    if (!session) {
      return NextResponse.json(
        { error: "운동 일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const payload = await verifyPublicMemberToken(rememberToken);

    if (!payload || payload.clubId !== session.clubId) {
      return NextResponse.json(
        {
          error:
            "자동 인식 정보가 만료되었습니다. 다시 이름과 전화번호 뒤 4자리를 입력해주세요.",
        },
        { status: 401 }
      );
    }

    const member = await prisma.member.findFirst({
      where: {
        id: payload.memberId,
        clubId: session.clubId,
        deleted: false,
      },
    });

    if (!member) {
      return NextResponse.json(
        {
          error:
            "회원 정보를 찾을 수 없습니다. 다시 본인 확인을 진행해주세요.",
        },
        { status: 404 }
      );
    }

    if (action === "CANCEL") {
      const activeOwnedParticipants = session.participants.filter(
        (item) =>
          item.status !== "CANCELED" &&
          (item.memberId === member.id || item.hostMemberId === member.id)
      );

      const freedRegisteredCount = activeOwnedParticipants.filter(
        (item) => item.status === "REGISTERED"
      ).length;

      if (activeOwnedParticipants.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.sessionParticipant.updateMany({
            where: {
              id: {
                in: activeOwnedParticipants.map((item) => item.id),
              },
            },
            data: {
              status: "CANCELED",
              attendanceStatus: "PENDING",
              checkedInAt: null,
            },
          });

          for (let index = 0; index < freedRegisteredCount; index += 1) {
            await promoteWaitlistIfPossible(tx, session.id);
          }
        });
      } else {
        // 기존 참가 신청 없이 불참을 누른 경우 — 이미 CANCELED 레코드가 없으면 새로 생성
        const existingCanceledRecord = session.participants.find(
          (item) =>
            item.memberId === member.id &&
            item.hostMemberId === null &&
            item.status === "CANCELED"
        );

        if (!existingCanceledRecord) {
          await prisma.sessionParticipant.create({
            data: {
              sessionId: session.id,
              memberId: member.id,
              status: "CANCELED",
              attendanceStatus: "PENDING",
              checkedInAt: null,
            },
          });
        }
      }

      const club = await prisma.club.findUnique({
        where: { id: session.clubId },
        select: { name: true },
      });

      await sendTelegramAlert({
        event: "SESSION_RESPOND_CANCEL",
        clubName: club?.name ?? String(session.clubId),
        sessionTitle: session.title ?? String(session.id),
        memberName: member.name,
      }).catch((error) => {
        console.error("[telegram] session respond cancel alert failed", error);
      });

      return NextResponse.json({
        success: true,
        status: "CANCELED",
      });
    }

    if (session.status !== "OPEN") {
      return NextResponse.json(
        { error: "현재 이 일정은 참석 신청을 받고 있지 않습니다." },
        { status: 400 }
      );
    }

    const existingMemberParticipant = session.participants.find(
      (item) => item.memberId === member.id
    );
    const existingGuestParticipants = session.participants.filter(
      (item) => item.hostMemberId === member.id
    );

    const previousRegisteredCount = [
      existingMemberParticipant,
      ...existingGuestParticipants,
    ].filter((item) => item && item.status === "REGISTERED").length;

    const excludedIds = [
      existingMemberParticipant?.id,
      ...existingGuestParticipants.map((item) => item.id),
    ].filter((value): value is number => Boolean(value));

    const otherParticipants = session.participants.filter(
      (item) => item.status !== "CANCELED" && !excludedIds.includes(item.id)
    );

    const registeredCount = otherParticipants.filter(
      (item) => item.status === "REGISTERED"
    ).length;

    const createdAt = new Date();
    const partySize = 1 + guestEntries.length;
    const partyStatus = getNextRegistrationStatus(
      session.capacity,
      registeredCount,
      partySize
    );
    const memberStatus = partyStatus;
    const guestStatuses = guestEntries.map(() => partyStatus);

    const nextRegisteredCount = partyStatus === "REGISTERED" ? partySize : 0;
    const freedRegisteredCount = Math.max(
      0,
      previousRegisteredCount - nextRegisteredCount
    );

    const applyRegistrationChanges = async (includeGuestProfile: boolean) => {
      await prisma.$transaction(async (tx) => {
        const createParticipant = async (data: Record<string, unknown>) => {
          if (includeGuestProfile) {
            await tx.sessionParticipant.create({ data: data as never });
            return;
          }

          await tx.sessionParticipant.createMany({
            data: [data as never],
          });
        };

        const updateParticipant = async (
          id: number,
          data: Record<string, unknown>
        ) => {
          if (includeGuestProfile) {
            await tx.sessionParticipant.update({
              where: { id },
              data: data as never,
            });
            return;
          }

          await tx.sessionParticipant.updateMany({
            where: { id },
            data: data as never,
          });
        };

        if (existingMemberParticipant) {
          await updateParticipant(existingMemberParticipant.id, {
            memberId: member.id,
            guestName: null,
            ...(includeGuestProfile
              ? {
                  guestAge: null,
                  guestGender: null,
                  guestLevel: null,
                }
              : {}),
            hostMemberId: null,
            status: memberStatus,
            attendanceStatus: "PENDING",
            checkedInAt: null,
            createdAt,
          });
        } else {
          await createParticipant({
            sessionId: session.id,
            memberId: member.id,
            status: memberStatus,
            attendanceStatus: "PENDING",
            checkedInAt: null,
            createdAt,
          });
        }

        for (let index = 0; index < guestEntries.length; index += 1) {
          const existingGuest = existingGuestParticipants[index];
          const guest = guestEntries[index];
          const guestProfileData = includeGuestProfile
            ? {
                guestAge: Number(guest.age),
                guestGender: guest.gender,
                guestLevel: guest.level,
              }
            : {};

          if (existingGuest) {
            await updateParticipant(existingGuest.id, {
              memberId: null,
              guestName: guest.name,
              ...guestProfileData,
              hostMemberId: member.id,
              status: guestStatuses[index],
              attendanceStatus: "PENDING",
              checkedInAt: null,
              createdAt,
            });
          } else {
            await createParticipant({
              sessionId: session.id,
              guestName: guest.name,
              ...guestProfileData,
              hostMemberId: member.id,
              status: guestStatuses[index],
              attendanceStatus: "PENDING",
              checkedInAt: null,
              createdAt,
            });
          }
        }

        const extraGuests = existingGuestParticipants.slice(guestEntries.length);

        if (extraGuests.length > 0) {
          await tx.sessionParticipant.updateMany({
            where: {
              id: {
                in: extraGuests.map((item) => item.id),
              },
            },
            data: {
              status: "CANCELED",
              attendanceStatus: "PENDING",
              checkedInAt: null,
            },
          });
        }

        for (let index = 0; index < freedRegisteredCount; index += 1) {
          await promoteWaitlistIfPossible(tx, session.id);
        }
      });
    };

    const includeGuestProfile =
      guestEntries.length > 0 && (await hasSessionParticipantGuestProfileColumns());

    try {
      await applyRegistrationChanges(includeGuestProfile);
    } catch (error) {
      if (includeGuestProfile && hasMissingGuestProfileColumns(error)) {
        await applyRegistrationChanges(false);
      } else {
        throw error;
      }
    }

    const club = await prisma.club.findUnique({
      where: { id: session.clubId },
      select: { name: true },
    });
    await sendTelegramAlert({
      event: "SESSION_RESPOND_REGISTER",
      clubName: club?.name ?? String(session.clubId),
      sessionTitle: session.title ?? String(session.id),
      memberName: member.name,
      guestCount: guestEntries.length,
      status: memberStatus,
    }).catch((error) => {
      console.error("[telegram] session respond register alert failed", error);
    });

    return NextResponse.json({
      success: true,
      status: memberStatus,
      guestCount: guestEntries.length,
      waitlistGuestCount: guestStatuses.filter((status) => status === "WAITLIST")
        .length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "참석 응답을 처리하지 못했습니다." },
      { status: 500 }
    );
  }
}
