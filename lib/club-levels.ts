import { prisma } from "@/lib/prisma";
import { DEFAULT_LEVEL_NAMES, LEVEL_COUNT } from "@/lib/dashboard-constants";

export async function getClubLevels(clubId: number) {
  const saved = await prisma.clubLevel.findMany({
    where: { clubId },
    orderBy: { rank: "asc" },
    select: { rank: true, name: true },
  });

  return Array.from({ length: LEVEL_COUNT }, (_, i) => ({
    rank: i + 1,
    name: saved.find((l) => l.rank === i + 1)?.name ?? DEFAULT_LEVEL_NAMES[i] ?? String(i + 1),
  }));
}
