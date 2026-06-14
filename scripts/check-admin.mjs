import { PrismaClient } from '../node_modules/@prisma/client/index.js';
const p = new PrismaClient();
try {
  const bracket = await p.$queryRawUnsafe(
    `SELECT config, rounds FROM "SessionBracket" WHERE id=124`
  );

  if (bracket.length > 0) {
    const b = bracket[0];
    const config = typeof b.config === 'string' ? JSON.parse(b.config) : b.config;
    const rounds = typeof b.rounds === 'string' ? JSON.parse(b.rounds) : b.rounds;

    console.log('=== CONFIG ===');
    console.log(JSON.stringify(config, null, 2));

    console.log('\n=== ROUNDS structure ===');
    if (rounds && rounds.variants) {
      const v = rounds.variants.STANDARD;
      if (v && v.levelGroupRounds) {
        for (const [gid, grds] of Object.entries(v.levelGroupRounds)) {
          console.log(`\nGroup ${gid}: ${grds.length} rounds`);
          for (const r of grds) {
            console.log(`  Round ${r.roundNumber}: ${r.matches.length} matches, courts: [${r.matches.map(m=>m.courtNumber).join(',')}]`);
          }
        }
      } else if (v && v.rounds) {
        for (const r of v.rounds) {
          console.log(`  Round ${r.roundNumber}: ${r.matches.length} matches, courts: [${r.matches.map(m=>m.courtNumber).join(',')}]`);
        }
      } else {
        console.log('STANDARD keys:', v ? Object.keys(v) : 'null');
        console.log(JSON.stringify(rounds, null, 2).slice(0, 2000));
      }
    } else if (Array.isArray(rounds)) {
      for (const r of rounds) {
        console.log(`  Round ${r.roundNumber}: ${r.matches.length} matches`);
      }
    } else {
      console.log('Rounds keys:', rounds ? Object.keys(rounds) : 'null');
      console.log(JSON.stringify(rounds, null, 2).slice(0, 2000));
    }
  }
} catch(e) {
  console.error('Error:', e.message);
} finally {
  await p.$disconnect();
}
