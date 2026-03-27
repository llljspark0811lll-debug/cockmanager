ALTER TABLE "SessionParticipant"
ALTER COLUMN "memberId" DROP NOT NULL;

ALTER TABLE "SessionParticipant"
ADD COLUMN "guestName" TEXT,
ADD COLUMN "hostMemberId" INTEGER;

ALTER TABLE "SessionParticipant"
ADD CONSTRAINT "SessionParticipant_hostMemberId_fkey"
FOREIGN KEY ("hostMemberId") REFERENCES "Member"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "SessionParticipant_hostMemberId_idx"
ON "SessionParticipant"("hostMemberId");
