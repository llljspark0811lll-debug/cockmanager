import prisma from "../lib/prisma";

async function main() {
const sessions = await prisma.session.findMany({
  take: 5,
  orderBy: { date: "desc" },
  select: { id: true, title: true, date: true, bracket: { select: { updatedAt: true, data: true } } },
});

for (const s of sessions) {
  if (!s.bracket?.data) continue;
  const data = s.bracket.data as any;
  const rounds = data.rounds ?? [];
  const r1 = rounds[0];
  if (!r1) continue;

  console.log(`\n=== ${s.title} (${s.date.toISOString().slice(0,10)}) bracketUpdated: ${s.bracket.updatedAt.toISOString().slice(0,19)} ===`);
  for (const m of r1.matches) {
    const a = m.teamA.players.map((p: any) => `${p.name}(lv:${p.level},sc:${p.score},age:${p.age})`).join(" & ");
    const b = m.teamB.players.map((p: any) => `${p.name}(lv:${p.level},sc:${p.score},age:${p.age})`).join(" & ");
    console.log(`  Court ${m.courtNumber}: ${a}`);
    console.log(`           vs ${b} [gap:${m.balanceGap}]`);
  }
}

await prisma.$disconnect();
}
main().catch(console.error);
