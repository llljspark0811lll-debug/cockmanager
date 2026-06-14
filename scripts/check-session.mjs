import { PrismaClient } from '../node_modules/@prisma/client/index.js';
const p = new PrismaClient();
try {
  const sessions = await p.$queryRawUnsafe(
    `SELECT id, title, date, status FROM "ClubSession" WHERE "clubId"=71 ORDER BY id DESC LIMIT 5`
  );
  console.log(JSON.stringify(sessions, null, 2));

  if (sessions.length > 0) {
    const sid = sessions[0].id;
    const bracket = await p.$queryRawUnsafe(
      `SELECT config, rounds, summary FROM "SessionBracket" WHERE "sessionId"=$1`, sid
    );
    if (bracket.length > 0) {
      const b = bracket[0];
      const config = typeof b.config === 'string' ? JSON.parse(b.config) : b.config;
      const rounds = typeof b.rounds === 'string' ? JSON.parse(b.rounds) : b.rounds;
      console.log('\n=== CONFIG ===');
      console.log(JSON.stringify(config, null, 2));
      console.log('\n=== ROUNDS structure ===');
      // show top-level keys
      if (rounds && rounds.variants) {
        const v = rounds.variants.STANDARD;
        if (v && v.levelGroupRounds) {
          for (const [gid, grds] of Object.entries(v.levelGroupRounds)) {
            console.log(`\nGroup ${gid}: ${grds.length} rounds`);
            for (const r of grds) {
              console.log(`  Round ${r.roundNumber}: ${r.matches.length} matches, courts: ${r.matches.map(m=>m.courtNumber).join(',')}`);
            }
          }
        } else {
          console.log(JSON.stringify(rounds, null, 2).slice(0, 500));
        }
      } else {
        console.log(JSON.stringify(rounds, null, 2).slice(0, 500));
      }
    } else {
      console.log('No bracket for session', sid);
    }
  }
} catch(e) {
  console.error(e.message);
} finally {
  await p.$disconnect();
}
