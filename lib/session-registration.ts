import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasSessionParticipantGuestProfileColumns } from "@/lib/session-participant-schema";

type PrismaLikeClient = Prisma.TransactionClient | typeof prisma;

type PartyParticipant = {
  id: number;
  memberId: number | null;
  hostMemberId: number | null;
  createdAt: Date;
};

type ParticipantParty = {
  ids: number[];
  size: number;
  earliestCreatedAt: number;
  latestCreatedAt: number;
};

export function getNextRegistrationStatus(
  capacity: number | null,
  registeredCount: number,
  unitSize = 1
) {
  if (
    capacity !== null &&
    registeredCount + unitSize > capacity
  ) {
    return "WAITLIST" as const;
  }

  return "REGISTERED" as const;
}

function buildParticipantParties(participants: PartyParticipant[]) {
  const groupedUnits = new Map<string, ParticipantParty>();

  for (const participant of participants) {
    const unitKey =
      participant.memberId !== null
        ? `party-${participant.memberId}`
        : participant.hostMemberId !== null
          ? `party-${participant.hostMemberId}`
          : `participant-${participant.id}`;

    const timestamp = participant.createdAt.getTime();
    const existing = groupedUnits.get(unitKey);

    if (existing) {
      existing.ids.push(participant.id);
      existing.size += 1;
      existing.earliestCreatedAt = Math.min(
        existing.earliestCreatedAt,
        timestamp
      );
      existing.latestCreatedAt = Math.max(
        existing.latestCreatedAt,
        timestamp
      );
      continue;
    }

    groupedUnits.set(unitKey, {
      ids: [participant.id],
      size: 1,
      earliestCreatedAt: timestamp,
      latestCreatedAt: timestamp,
    });
  }

  return [...groupedUnits.values()];
}

export async function promoteWaitlistIfPossible(
  db: PrismaLikeClient,
  sessionId: number
) {
  const session = await db.clubSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      capacity: true,
      participants: {
        select: {
          id: true,
          memberId: true,
          hostMemberId: true,
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!session) {
    return false;
  }

  const registeredCount = session.participants.filter(
    (participant) => participant.status === "REGISTERED"
  ).length;

  if (
    session.capacity !== null &&
    registeredCount >= session.capacity
  ) {
    return false;
  }

  const waitlistedParticipants = session.participants.filter(
    (participant) => participant.status === "WAITLIST"
  );

  if (waitlistedParticipants.length === 0) {
    return false;
  }

  const nextWaitlistParty = buildParticipantParties(
    waitlistedParticipants
  ).sort(
    (left, right) =>
      left.earliestCreatedAt - right.earliestCreatedAt
  )[0];

  if (!nextWaitlistParty) {
    return false;
  }

  if (
    session.capacity !== null &&
    registeredCount + nextWaitlistParty.size >
      session.capacity
  ) {
    return false;
  }

  if (await hasSessionParticipantGuestProfileColumns()) {
    await db.sessionParticipant.update({
      where: { id: nextWaitlistParty.ids[0] },
      data: { status: "REGISTERED" },
    });
    if (nextWaitlistParty.ids.length > 1) {
      await db.sessionParticipant.updateMany({
        where: {
          id: {
            in: nextWaitlistParty.ids.slice(1),
          },
        },
        data: { status: "REGISTERED" },
      });
    }
    return true;
  }

  await db.sessionParticipant.updateMany({
    where: {
      id: {
        in: nextWaitlistParty.ids,
      },
    },
    data: { status: "REGISTERED" },
  });

  return true;
}

export async function rebalanceRegisteredParticipantsToCapacity(
  db: PrismaLikeClient,
  sessionId: number,
  capacity: number | null
) {
  const session = await db.clubSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      participants: {
        where: {
          status: "REGISTERED",
        },
        select: {
          id: true,
          memberId: true,
          hostMemberId: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!session) {
    return;
  }

  let registeredCount = session.participants.length;

  if (capacity !== null && registeredCount > capacity) {
    const units = buildParticipantParties(
      session.participants
    ).sort(
      (left, right) => right.latestCreatedAt - left.latestCreatedAt
    );

    for (const unit of units) {
      if (registeredCount <= capacity) {
        break;
      }

      await db.sessionParticipant.updateMany({
        where: {
          id: {
            in: unit.ids,
          },
        },
        data: {
          status: "WAITLIST",
          attendanceStatus: "PENDING",
          checkedInAt: null,
        },
      });

      registeredCount -= unit.ids.length;
    }
  }

  while (await promoteWaitlistIfPossible(db, sessionId)) {
    // Keep promoting whole waitlist parties while capacity allows.
  }
}

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}
