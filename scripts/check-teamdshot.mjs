import { PrismaClient } from '../node_modules/@prisma/client/index.js';
const p = new PrismaClient();
try {
  const brackets = await p.$queryRawUnsafe(
    `SELECT id, config, rounds FROM "SessionBracket" WHERE "sessionId" = 25 ORDER BY id DESC LIMIT 1`
  );
  const b = brackets[0];
  const config = typeof b.config === 'string' ? JSON.parse(b.config) : b.config;
  const rounds = typeof b.rounds === 'string' ? JSON.parse(b.rounds) : b.rounds;
  const variant = rounds?.variants?.STANDARD;
  const cfg = config?.variants?.STANDARD?.config;

  console.log(`courtCount: ${cfg?.courtCount}, minGames: ${cfg?.minGamesPerPlayer}`);

  let totalCourtsPerRound = {};

  for (const [gid, grds] of Object.entries(variant.levelGroupRounds)) {
    console.log(`\n=== Group ${gid} ===`);
    const playerGames = {};
    const playerRests = {};

    for (const r of grds) {
      const playersThisRound = new Set();
      for (const m of r.matches) {
        const allPlayers = [...m.teamA.players, ...m.teamB.players];
        for (const p of allPlayers) {
          playerGames[p.playerId] = (playerGames[p.playerId] || 0) + 1;
          playerGames[`_name_${p.playerId}`] = p.name;
          playersThisRound.add(p.playerId);
        }
      }
      for (const rp of (r.restingPlayers || [])) {
        playerRests[rp.playerId] = (playerRests[rp.playerId] || 0) + 1;
      }

      const courts = r.matches.length;
      totalCourtsPerRound[r.roundNumber] = (totalCourtsPerRound[r.roundNumber] || 0) + courts;
    }

    // 선수별 게임수 출력
    const playerIds = Object.keys(playerGames).filter(k => !k.startsWith('_name_'));
    const sorted = playerIds.sort((a, b) => (playerGames[b] || 0) - (playerGames[a] || 0));
    console.log('선수별 게임수:');
    for (const pid of sorted) {
      const name = playerGames[`_name_${pid}`] || pid;
      const games = playerGames[pid] || 0;
      const rests = playerRests[pid] || 0;
      console.log(`  ${name}: ${games}게임, ${rests}휴식`);
    }
    const counts = sorted.map(pid => playerGames[pid] || 0);
    console.log(`  min=${Math.min(...counts)}, max=${Math.max(...counts)}`);
  }

  console.log('\n=== 라운드별 총 코트 수 ===');
  for (const [rn, courts] of Object.entries(totalCourtsPerRound).sort((a,b) => Number(a[0])-Number(b[0]))) {
    const expected = cfg?.courtCount;
    const ok = courts == expected ? '✓' : `✗ (예상: ${expected})`;
    console.log(`  Round ${rn}: ${courts}코트 ${ok}`);
  }

} catch(e) {
  console.error('Error:', e.message);
  console.error(e.stack);
} finally {
  await p.$disconnect();
}
