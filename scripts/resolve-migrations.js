const { execSync } = require("child_process");

// Migrations already applied to DB but missing from _prisma_migrations tracking table.
// Mark each as applied so prisma migrate deploy doesn't try to re-run them.
const alreadyApplied = [
  "202603270003_add_session_guests",
  "202603270005_remove_club_code",
  "202603290001_add_admin_email_recovery",
  "202604060001_add_guest_profile_to_session_participant",
  "202604140001_add_session_comments",
  "202604150001_add_session_brackets",
  "202604210001_add_tutorial_sample_flags",
  "202604220001_add_tutorial_completed",
  "202605140001_add_court_board",
];

for (const name of alreadyApplied) {
  try {
    execSync(`npx prisma migrate resolve --applied ${name}`, {
      stdio: "pipe",
      encoding: "utf8",
    });
    console.log(`[resolve] marked as applied: ${name}`);
  } catch {
    console.log(`[resolve] skipped (already recorded): ${name}`);
  }
}
