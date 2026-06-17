import { prisma } from "../lib/prisma";

async function main() {
  // Qwer 클럽 찾기
  const club = await prisma.club.findFirst({
    where: { name: { contains: "Qwer" } },
    select: { id: true, name: true },
  });
  if (!club) { console.log("Qwer 클럽을 찾을 수 없습니다."); return; }
  console.log(`클럽: ${club.name} (id: ${club.id})`);

  // 가장 최근 세션 찾기 (2026-06-17)
  const session = await prisma.clubSession.findFirst({
    where: { clubId: club.id },
    orderBy: { date: "desc" },
    select: {
      id: true, title: true, date: true,
      bracket: { select: { config: true, rounds: true, summary: true, updatedAt: true } },
    },
  });
  if (!session) { console.log("세션 없음"); return; }
  console.log(`세션: ${session.title} / ${session.date.toISOString().slice(0, 10)} (id: ${session.id})`);

  if (!session.bracket) { console.log("대진표 없음"); return; }
  console.log(`대진 업데이트: ${session.bracket.updatedAt.toISOString()}`);

  const config = session.bracket.config as Record<string, unknown>;
  const rounds = session.bracket.rounds as Record<string, unknown>;
  const summary = session.bracket.summary as Record<string, unknown>;

  console.log("\n=== CONFIG ===");
  console.log(JSON.stringify(config, null, 2));

  // variants 구조 확인
  const roundsVariants = (rounds as { variants?: Record<string, unknown> }).variants;
  if (roundsVariants) {
    console.log("\n=== ROUNDS VARIANTS 키 목록 ===");
    console.log(Object.keys(roundsVariants));

    // STANDARD_separate 확인
    const separateData = roundsVariants["STANDARD_separate"] as {
      rounds?: Array<{
        roundNumber: number;
        matches: Array<{
          courtNumber: number;
          teamA: { players: Array<{ name: string; level?: string; gender?: string; score?: number }> };
          teamB: { players: Array<{ name: string; level?: string; gender?: string; score?: number }> };
          _levelGroupName?: string;
        }>;
        restingPlayers?: Array<{ name: string; level?: string }>;
      }>;
      levelGroupRounds?: Record<string, Array<{
        roundNumber: number;
        matches: Array<{
          courtNumber: number;
          teamA: { players: Array<{ name: string; level?: string; gender?: string; score?: number }> };
          teamB: { players: Array<{ name: string; level?: string; gender?: string; score?: number }> };
        }>;
        restingPlayers?: Array<{ name: string; level?: string }>;
      }>>;
    } | undefined;

    if (separateData?.levelGroupRounds) {
      console.log("\n=== STANDARD_separate levelGroupRounds ===");
      for (const [groupId, groupRounds] of Object.entries(separateData.levelGroupRounds)) {
        console.log(`\n--- 그룹: ${groupId} (${groupRounds.length} 라운드) ---`);
        let totalGames = 0;
        const playerGames: Record<string, number> = {};
        const playerRests: Record<string, number> = {};

        for (const round of groupRounds) {
          console.log(`  [라운드 ${round.roundNumber}]`);
          for (const match of round.matches) {
            const a = match.teamA.players.map((p) => `${p.name}(${p.level ?? "?"})`).join(" & ");
            const b = match.teamB.players.map((p) => `${p.name}(${p.level ?? "?"})`).join(" & ");
            console.log(`    코트${match.courtNumber}: ${a} vs ${b}`);
            for (const p of [...match.teamA.players, ...match.teamB.players]) {
              playerGames[p.name] = (playerGames[p.name] ?? 0) + 1;
            }
            totalGames++;
          }
          if (round.restingPlayers?.length) {
            console.log(`    휴식: ${round.restingPlayers.map((p) => `${p.name}(${p.level ?? "?"})`).join(", ")}`);
            for (const p of round.restingPlayers) {
              playerRests[p.name] = (playerRests[p.name] ?? 0) + 1;
            }
          }
        }

        console.log(`\n  경기수 분포:`);
        const sorted = Object.entries(playerGames).sort((a, b) => a[1] - b[1]);
        for (const [name, games] of sorted) {
          const rests = playerRests[name] ?? 0;
          console.log(`    ${name}: ${games}경기 / ${rests}휴식`);
        }
      }
    } else if (separateData?.rounds) {
      console.log("\n=== STANDARD_separate rounds (병합형) ===");
      for (const round of separateData.rounds) {
        console.log(`[라운드 ${round.roundNumber}]`);
        for (const match of round.matches) {
          const grp = match._levelGroupName ?? "-";
          const a = match.teamA.players.map((p) => `${p.name}(${p.level ?? "?"})`).join(" & ");
          const b = match.teamB.players.map((p) => `${p.name}(${p.level ?? "?"})`).join(" & ");
          console.log(`  코트${match.courtNumber}[${grp}]: ${a} vs ${b}`);
        }
        if (round.restingPlayers?.length) {
          console.log(`  휴식: ${round.restingPlayers.map((p) => `${p.name}(${p.level ?? "?"})`).join(", ")}`);
        }
      }
    } else {
      console.log("STANDARD_separate 데이터 없음");
      console.log(JSON.stringify(separateData, null, 2));
    }
  } else {
    console.log("\n=== ROUNDS (단일 형식) ===");
    console.log(JSON.stringify(rounds, null, 2).slice(0, 3000));
  }

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
