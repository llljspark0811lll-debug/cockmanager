import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ensureTutorialColumns } from "@/lib/tutorial-schema";
import { NextResponse } from "next/server";

const SAMPLE_MEMBERS = [
  { name: "[체험] 김민준", gender: "남", level: "A" },
  { name: "[체험] 이서연", gender: "여", level: "B" },
  { name: "[체험] 박지훈", gender: "남", level: "B" },
  { name: "[체험] 최수아", gender: "여", level: "C" },
  { name: "[체험] 정태양", gender: "남", level: "A" },
  { name: "[체험] 윤하나", gender: "여", level: "B" },
  { name: "[체험] 오성민", gender: "남", level: "C" },
  { name: "[체험] 강나래", gender: "여", level: "A" },
  { name: "[체험] 조태민", gender: "남", level: "B" },
  { name: "[체험] 신하린", gender: "여", level: "C" },
];

const SAMPLE_GUESTS = [
  { name: "[체험 게스트] 민호", gender: "남", level: "B", age: 31 },
  { name: "[체험 게스트] 지아", gender: "여", level: "C", age: 28 },
  { name: "[체험 게스트] 성우", gender: "남", level: "A", age: 35 },
  { name: "[체험 게스트] 유진", gender: "여", level: "B", age: 29 },
];

async function cleanupSamples(clubId: number) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM "SessionParticipant"
      WHERE "sessionId" IN (
        SELECT id FROM "ClubSession"
        WHERE "clubId" = ${clubId} AND "isSample" = true
      )
    `;
    await tx.$executeRaw`
      DELETE FROM "ClubSession"
      WHERE "clubId" = ${clubId} AND "isSample" = true
    `;
    await tx.$executeRaw`
      DELETE FROM "Member"
      WHERE "clubId" = ${clubId} AND "isSample" = true
    `;
  });
}

export async function POST() {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    await ensureTutorialColumns();
    await cleanupSamples(admin.clubId);

    const result = await prisma.$transaction(async (tx) => {
      const memberRows: Array<{ id: number }> = [];

      for (const member of SAMPLE_MEMBERS) {
        const rows = await tx.$queryRaw<{ id: number }[]>`
          INSERT INTO "Member" (
            name, gender, level, phone, "clubId", status, "isSample",
            carnumber, note, deleted, "createdAt"
          )
          VALUES (
            ${member.name}, ${member.gender}, ${member.level}, '',
            ${admin.clubId}, 'approved', true, '', '체험 튜토리얼용 샘플 회원입니다.', false, NOW()
          )
          RETURNING id
        `;

        memberRows.push(rows[0]);
      }

      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() + 1);

      const [sessionRow] = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO "ClubSession" (
          title, description, location, "publicToken", date, "startTime",
          "endTime", status, "clubId", "isSample", "createdAt"
        )
        VALUES (
          '[체험] 수요 정기운동',
          '콕매니저 체험을 위해 자동으로 만들어진 샘플 운동일정입니다.',
          '체육관 A코트',
          ${`tutorial-${admin.clubId}-${Date.now()}`},
          ${sessionDate},
          '19:00',
          '22:00',
          'CLOSED',
          ${admin.clubId},
          true,
          NOW()
        )
        RETURNING id
      `;

      for (const memberRow of memberRows) {
        await tx.$executeRaw`
          INSERT INTO "SessionParticipant" (
            "sessionId", "memberId", status, "attendanceStatus", "createdAt"
          )
          VALUES (${sessionRow.id}, ${memberRow.id}, 'REGISTERED', 'PENDING', NOW())
        `;
      }

      for (let index = 0; index < SAMPLE_GUESTS.length; index += 1) {
        const guest = SAMPLE_GUESTS[index];
        const hostMemberId = memberRows[index % memberRows.length].id;

        await tx.$executeRaw`
          INSERT INTO "SessionParticipant" (
            "sessionId", "memberId", "hostMemberId", "guestName", "guestAge",
            "guestGender", "guestLevel", status, "attendanceStatus", "createdAt"
          )
          VALUES (
            ${sessionRow.id}, NULL, ${hostMemberId}, ${guest.name}, ${guest.age},
            ${guest.gender}, ${guest.level}, 'REGISTERED', 'PENDING', NOW()
          )
        `;
      }

      return { sessionId: sessionRow.id };
    });

    return NextResponse.json({ success: true, sessionId: result.sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[tutorial/seed]", message);
    return NextResponse.json(
      { error: "샘플 데이터를 만드는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
