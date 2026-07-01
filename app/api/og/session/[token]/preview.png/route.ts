import prisma from "@/lib/prisma";
import { buildSessionOgImageResponse } from "../../session-og-image";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const session = await prisma.clubSession.findUnique({
    where: { publicToken: token },
    select: {
      title: true,
      club: {
        select: { name: true },
      },
    },
  });

  return buildSessionOgImageResponse({
    title: session?.title ?? "운동 일정 참석 신청",
    clubName: session?.club.name ?? "콕매니저",
  });
}
