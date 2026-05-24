import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bracket = await prisma.sessionBracket.findUnique({
    where: { id: 528 },
    select: { rounds: true, updatedAt: true },
  });

  if (!bracket) { console.log("no bracket"); return; }

  const kstUpdated = new Date(bracket.updatedAt.getTime() + 9 * 60 * 60 * 1000);
  console.log(`마지막 생성: ${kstUpdated.toISOString().replace("T"," ").slice(0,19)} KST\n`);

  const roundsRaw = bracket.rounds as Record<string, unknown>;
  const std = (roundsRaw?.variants as Record<string, unknown>)?.STANDARD as Record<string, unknown>;
  const rounds = std?.rounds as Record<string, unknown>[];

  // Extract Group A (plays odd rounds) and Group B (plays even rounds)
  const groupA = new Set<string>(); // plays round 1
  const groupB = new Set<string>(); // rests round 1

  const r1 = rounds[0]!;
  const r1matches = r1.matches as Record<string, unknown>[];
  const r1resting = r1.restingPlayers as Record<string, unknown>[];

  for (const m of r1matches) {
    for (const p of (m.teamA as Record<string, unknown>).players as Record<string, unknown>[]) {
      groupA.add(p["name"] as string);
    }
    for (const p of (m.teamB as Record<string, unknown>).players as Record<string, unknown>[]) {
      groupA.add(p["name"] as string);
    }
  }
  for (const p of r1resting) {
    groupB.add(p["name"] as string);
  }

  console.log(`=== Group A (홀수 라운드 경기 / 짝수 라운드 휴식) - ${groupA.size}명 ===`);
  console.log([...groupA].join(", "));

  console.log(`\n=== Group B (홀수 라운드 휴식 / 짝수 라운드 경기) - ${groupB.size}명 ===`);
  console.log([...groupB].join(", "));

  // Show full bracket
  console.log("\n\n=== 전체 대진표 ===");
  for (const r of rounds) {
    const rn = r["roundNumber"] as number;
    const matches = r.matches as Record<string, unknown>[];
    const resting = r.restingPlayers as Record<string, unknown>[];
    console.log(`\n[Round ${rn}]`);
    for (const m of matches) {
      const tA = ((m.teamA as Record<string, unknown>).players as Record<string, unknown>[])
        .map(p => `${p["name"]}(${p["level"]})`).join("+");
      const tB = ((m.teamB as Record<string, unknown>).players as Record<string, unknown>[])
        .map(p => `${p["name"]}(${p["level"]})`).join("+");
      console.log(`  Court ${m["courtNumber"]}: ${tA} vs ${tB}`);
    }
    console.log(`  휴식: ${resting.map(p => p["name"]).join(", ")}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
