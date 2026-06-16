import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 4/19 세션 — 참가자 포함해서 조회
  const sessions = await prisma.clubSession.findMany({
    take: 5,
    orderBy: { date: "desc" },
    where: {
      bracket: { isNot: null },
      date: {
        gte: new Date("2026-04-18"),
        lte: new Date("2026-04-20"),
      },
    },
    select: {
      id: true,
      title: true,
      date: true,
      bracket: { select: { updatedAt: true, rounds: true, config: true } },
      participants: {
        select: {
          id: true,
          status: true,
          member: { select: { id: true, name: true, gender: true, level: true, birth: true } },
          guestName: true,
          guestAge: true,
          guestGender: true,
          guestLevel: true,
        },
      },
    },
  });

  console.log(`총 세션 수: ${sessions.length}`);
  for (const s of sessions) {
    if (!s.bracket) continue;

    // 참가자 전체 목록 출력 (status 무관)
    console.log(`\n[${s.title}] 참가자 ${s.participants.length}명:`);
    for (const p of s.participants) {
      const name = p.member?.name ?? p.guestName ?? "?";
      const gender = p.member?.gender ?? p.guestGender ?? "?";
      const lv = p.member?.level ?? p.guestLevel ?? "?";
      const birth = p.member?.birth;
      const age = p.guestAge ?? (birth ? new Date().getFullYear() - new Date(birth).getFullYear() : null);
      console.log(`  [${p.status}] ${name}(${gender}, lv:${lv}, age:${age ?? "null"})`);
    }

    const bracketData = s.bracket.rounds;
    if (!bracketData?.variants) continue;

    // variants 안의 각 모드를 순회 (STANDARD, TEAM_BATTLE 등)
    for (const [variantKey, variantData] of Object.entries(bracketData.variants)) {
      const rounds = variantData?.rounds ?? [];
      if (rounds.length === 0) continue;

      console.log(`\n=== ${s.title} [${variantKey}] | ${s.bracket.updatedAt.toISOString().slice(0,19)} ===`);
      // 라운드 1만 출력
      const r1 = rounds[0];
      for (const m of r1.matches ?? []) {
        const a = m.teamA.players.map((p) => `${p.name}(lv:${p.level},sc:${p.score})`).join(" & ");
        const b = m.teamB.players.map((p) => `${p.name}(lv:${p.level},sc:${p.score})`).join(" & ");
        const aLevels = m.teamA.players.map((p) => p.level).join("");
        const bLevels = m.teamB.players.map((p) => p.level).join("");
        console.log(`  [${aLevels} vs ${bLevels}] Court ${m.courtNumber}: ${a}  vs  ${b}`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
