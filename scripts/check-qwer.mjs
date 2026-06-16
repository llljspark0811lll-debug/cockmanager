import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Qwer 계정 찾기
  const club = await prisma.club.findFirst({
    where: { name: { contains: "qwer", mode: "insensitive" } },
  });

  if (!club) { console.log("Qwer 클럽 없음"); return; }

  console.log(`클럽: ${club.name} (clubId: ${club.id})`);

  // 최근 세션 목록
  const sessions = await prisma.clubSession.findMany({
    where: { clubId: club.id },
    orderBy: { date: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      date: true,
      status: true,
      bracket: { select: { id: true, updatedAt: true, summary: true, rounds: true } },
    },
  });

  console.log(`\n최근 세션 ${sessions.length}개:`);
  for (const s of sessions) {
    const kstDate = new Date(s.date.getTime() + 9 * 60 * 60 * 1000);
    console.log(`\n[${s.id}] ${s.title} (${kstDate.toISOString().slice(0,10)}) - ${s.status}`);
    if (!s.bracket) {
      console.log("  → 대진표 없음");
      continue;
    }
    const kstUpdated = new Date(s.bracket.updatedAt.getTime() + 9 * 60 * 60 * 1000);
    console.log(`  대진표 ID: ${s.bracket.id}, 마지막 수정: ${kstUpdated.toISOString().replace("T"," ").slice(0,19)} KST`);
    console.log(`  summary: ${JSON.stringify(s.bracket.summary)}`);

    // rounds 구조 확인
    const rounds = s.bracket.rounds;
    if (rounds && typeof rounds === "object") {
      const keys = Object.keys(rounds);
      console.log(`  rounds 최상위 키: [${keys.join(", ")}]`);
      if (rounds.rounds) {
        console.log(`  라운드 수: ${rounds.rounds.length}`);
        const r1 = rounds.rounds[0];
        if (r1) {
          console.log(`  Round 1 matches: ${r1.matches?.length ?? 0}개, resting: ${r1.restingPlayers?.length ?? 0}명`);
          // 결과 데이터 확인
          const firstMatch = r1.matches?.[0];
          if (firstMatch) {
            console.log(`  첫 매치 키: [${Object.keys(firstMatch).join(", ")}]`);
            console.log(`  첫 매치: ${JSON.stringify(firstMatch).slice(0, 300)}`);
          }
        }
      } else if (rounds.variants) {
        const varKeys = Object.keys(rounds.variants);
        console.log(`  variants 키: [${varKeys.join(", ")}]`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
