CREATE TABLE "ClubLevel" (
    "id" SERIAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "clubId" INTEGER NOT NULL,
    CONSTRAINT "ClubLevel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubLevel_clubId_rank_key" ON "ClubLevel"("clubId", "rank");
CREATE INDEX "ClubLevel_clubId_idx" ON "ClubLevel"("clubId");

ALTER TABLE "ClubLevel" ADD CONSTRAINT "ClubLevel_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
