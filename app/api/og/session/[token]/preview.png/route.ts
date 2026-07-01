import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildSessionOgImage } from "../../session-og-image";

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

  const png = await buildSessionOgImage({
    title: session?.title ?? "운동 일정 참석 신청",
    clubName: session?.club.name ?? "콕매니저",
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
