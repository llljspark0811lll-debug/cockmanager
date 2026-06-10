/**
 * Member.level / MemberRequest.level / SessionParticipant.guestLevel 값을
 * 이름 문자열("S", "A" 등)에서 rank 번호 문자열("1", "2" 등)로 변환합니다.
 *
 * 사용법:
 *   dry-run (변경 내역 미리 보기, DB 수정 없음):
 *     node scripts/migrate-levels-to-rank.js
 *
 *   실제 실행:
 *     node scripts/migrate-levels-to-rank.js --run
 */

const { PrismaClient } = require("@prisma/client");

const NAME_TO_RANK = {
  S: "1",
  A: "2",
  B: "3",
  C: "4",
  D: "5",
  E: "6",
  초심: "7",
};

const ALREADY_RANK = new Set(["1", "2", "3", "4", "5", "6", "7"]);

const isDryRun = !process.argv.includes("--run");

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log(isDryRun ? "[DRY-RUN] 실제 DB는 변경되지 않습니다.\n" : "[실행] DB를 변경합니다.\n");

    // --- Member.level ---
    const members = await prisma.member.findMany({
      select: { id: true, name: true, level: true },
    });

    const membersToUpdate = members.filter(
      (m) => m.level && !ALREADY_RANK.has(m.level) && NAME_TO_RANK[m.level]
    );
    const membersUnknown = members.filter(
      (m) => m.level && !ALREADY_RANK.has(m.level) && !NAME_TO_RANK[m.level]
    );

    console.log(`== Member.level ==`);
    console.log(`  전체: ${members.length}명, 변환 대상: ${membersToUpdate.length}명, 알 수 없는 값: ${membersUnknown.length}명`);

    for (const m of membersToUpdate) {
      const newLevel = NAME_TO_RANK[m.level];
      console.log(`  [${m.id}] ${m.name}: "${m.level}" → "${newLevel}"`);
      if (!isDryRun) {
        await prisma.member.update({ where: { id: m.id }, data: { level: newLevel } });
      }
    }

    if (membersUnknown.length > 0) {
      console.log(`  [경고] 알 수 없는 level 값 (변환 안 됨):`);
      for (const m of membersUnknown) {
        console.log(`    [${m.id}] ${m.name}: "${m.level}"`);
      }
    }

    // --- MemberRequest.level ---
    const requests = await prisma.memberRequest.findMany({
      select: { id: true, name: true, level: true },
    });

    const requestsToUpdate = requests.filter(
      (r) => r.level && !ALREADY_RANK.has(r.level) && NAME_TO_RANK[r.level]
    );
    const requestsUnknown = requests.filter(
      (r) => r.level && !ALREADY_RANK.has(r.level) && !NAME_TO_RANK[r.level]
    );

    console.log(`\n== MemberRequest.level ==`);
    console.log(`  전체: ${requests.length}건, 변환 대상: ${requestsToUpdate.length}건, 알 수 없는 값: ${requestsUnknown.length}건`);

    for (const r of requestsToUpdate) {
      const newLevel = NAME_TO_RANK[r.level];
      console.log(`  [${r.id}] ${r.name}: "${r.level}" → "${newLevel}"`);
      if (!isDryRun) {
        await prisma.memberRequest.update({ where: { id: r.id }, data: { level: newLevel } });
      }
    }

    if (requestsUnknown.length > 0) {
      console.log(`  [경고] 알 수 없는 level 값 (변환 안 됨):`);
      for (const r of requestsUnknown) {
        console.log(`    [${r.id}] ${r.name}: "${r.level}"`);
      }
    }

    // --- SessionParticipant.guestLevel ---
    const participants = await prisma.sessionParticipant.findMany({
      where: { isGuest: true },
      select: { id: true, name: true, guestLevel: true },
    });

    const participantsToUpdate = participants.filter(
      (p) => p.guestLevel && !ALREADY_RANK.has(p.guestLevel) && NAME_TO_RANK[p.guestLevel]
    );
    const participantsUnknown = participants.filter(
      (p) => p.guestLevel && !ALREADY_RANK.has(p.guestLevel) && !NAME_TO_RANK[p.guestLevel]
    );

    console.log(`\n== SessionParticipant.guestLevel ==`);
    console.log(`  전체 게스트: ${participants.length}명, 변환 대상: ${participantsToUpdate.length}명, 알 수 없는 값: ${participantsUnknown.length}명`);

    for (const p of participantsToUpdate) {
      const newLevel = NAME_TO_RANK[p.guestLevel];
      console.log(`  [${p.id}] ${p.name}: "${p.guestLevel}" → "${newLevel}"`);
      if (!isDryRun) {
        await prisma.sessionParticipant.update({ where: { id: p.id }, data: { guestLevel: newLevel } });
      }
    }

    if (participantsUnknown.length > 0) {
      console.log(`  [경고] 알 수 없는 guestLevel 값 (변환 안 됨):`);
      for (const p of participantsUnknown) {
        console.log(`    [${p.id}] ${p.name}: "${p.guestLevel}"`);
      }
    }

    console.log(isDryRun ? "\n[DRY-RUN 완료] 실제로 변경된 데이터는 없습니다." : "\n[마이그레이션 완료]");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
