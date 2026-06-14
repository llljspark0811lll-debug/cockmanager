import { PrismaClient } from '../node_modules/@prisma/client/index.js';
const p = new PrismaClient();
try {
  const tables = await p.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
  );
  console.log('Tables:', tables.map(t => t.table_name).join(', '));

  // Also check clubId values in ClubSession or similar
  const sessions = await p.$queryRawUnsafe(
    `SELECT id, title, date, "clubId" FROM "ClubSession" ORDER BY date DESC LIMIT 10`
  );
  console.log('\nSessions:', JSON.stringify(sessions, null, 2));
} catch(e) {
  console.error('Error:', e.message);
} finally {
  await p.$disconnect();
}
