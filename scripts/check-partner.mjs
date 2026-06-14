import { PrismaClient } from '../node_modules/@prisma/client/index.js';
const p = new PrismaClient();
try {
  // 6/14 세션 찾기 (club 11)
  const sessions = await p.$queryRawUnsafe(
    `SELECT id, name, date FROM "Session" WHERE "clubId" = 11 AND date >= '2026-06-14' AND date < '2026-06-15' ORDER BY date DESC LIMIT 5`
  );
  console.log('Sessions:', sessions);
  if (!sessions[0]) { console.log('No session found'); process.exit(0); }

  const sessionId = Number(sessions[0].id);
  console.log('sessionId:', sessionId);

  // 최신 브래킷
  const brackets = await p.$queryRawUnsafe(
    `SELECT id, config, rounds FROM "SessionBracket" WHERE "sessionId" = ${sessionId} ORDER BY id DESC LIMIT 1`
  );
  if (!brackets[0]) { console.log('No bracket found'); process.exit(0); }

  const b = brackets[0];
  const config = typeof b.config === 'string' ? JSON.parse(b.config) : b.config;
  const rounds = typeof b.rounds === 'string' ? JSON.parse(b.rounds) : b.rounds;

  const cfg = config?.variants?.STANDARD?.config;
  console.log('\n=== 브래킷 설정 ===');
  console.log('fixedPairs:', JSON.stringify(cfg?.fixedPairs));
  console.log('generationMode:', cfg?.generationMode);
  console.log('levelMode:', cfg?.levelMode ?? 'none');

  const variant = rounds?.variants?.STANDARD;
  const allRounds = variant?.rounds ?? [];
  const levelRounds = variant?.levelGroupRounds ?? {};
  const allMatchRounds = allRounds.length > 0 ? allRounds : Object.values(levelRounds).flat();

  console.log(`\n총 라운드 수: ${allMatchRounds.length}`);

  // 원태귀/김재구 파트너 확인
  console.log('\n=== 원태귀/김재구 같은 팀 여부 ===');
  let togetherCount = 0, separateCount = 0;
  for (const r of allMatchRounds) {
    for (const m of (r.matches ?? [])) {
      const aNames = m.teamA.players.map(pl => pl.name);
      const bNames = m.teamB.players.map(pl => pl.name);
      const wonInA = aNames.includes('원태귀'), wonInB = bNames.includes('원태귀');
      const kimInA = aNames.includes('김재구'), kimInB = bNames.includes('김재구');
      const bothPlay = (wonInA || wonInB) && (kimInA || kimInB);
      if (!bothPlay) continue;
      if ((wonInA && kimInA) || (wonInB && kimInB)) {
        togetherCount++;
        console.log(`  R${r.roundNumber}: 같은 팀 ✓`);
      } else {
        separateCount++;
        console.log(`  R${r.roundNumber}: 상대팀 ✗`);
        console.log(`    teamA: ${aNames.join(', ')}`);
        console.log(`    teamB: ${bNames.join(', ')}`);
      }
    }
  }
  console.log(`\n결과 — 같이: ${togetherCount}회, 따로: ${separateCount}회`);

  // fixedPairs에 실제 playerId가 맞는지 확인
  if (cfg?.fixedPairs?.length > 0) {
    console.log('\n=== fixedPairs 설정된 playerId ===');
    for (const pair of cfg.fixedPairs) {
      console.log(' ', pair);
    }
    // 첫 라운드에서 원태귀/김재구 playerId 확인
    const firstRound = allMatchRounds[0];
    if (firstRound) {
      console.log('\n=== 1라운드 선수 playerId 샘플 ===');
      for (const m of (firstRound.matches ?? []).slice(0, 2)) {
        console.log('teamA:', m.teamA.players.map(pl => `${pl.name}(${pl.playerId})`).join(', '));
        console.log('teamB:', m.teamB.players.map(pl => `${pl.name}(${pl.playerId})`).join(', '));
      }
    }
  }

} catch(e) {
  console.error('Error:', e.message);
} finally {
  await p.$disconnect();
}
