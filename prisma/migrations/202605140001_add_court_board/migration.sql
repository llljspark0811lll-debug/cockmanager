CREATE TABLE IF NOT EXISTS "CourtBoard" (
    "id" SERIAL NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "courts" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" INTEGER NOT NULL,
    CONSTRAINT "CourtBoard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CourtBoard_sessionId_key"
ON "CourtBoard"("sessionId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'CourtBoard_sessionId_fkey'
    ) THEN
        ALTER TABLE "CourtBoard"
        ADD CONSTRAINT "CourtBoard_sessionId_fkey"
        FOREIGN KEY ("sessionId") REFERENCES "ClubSession"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
