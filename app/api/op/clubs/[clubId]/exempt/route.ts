import { NextResponse } from "next/server";
import { isOpAuthenticated } from "@/lib/op-auth";
import { prisma } from "@/lib/prisma";

// POST /api/op/clubs/[clubId]/exempt  → toggle EXEMPT status
export async function POST(
  req: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  if (!(await isOpAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId: clubIdStr } = await params;
  const clubId = Number(clubIdStr);
  const { exempt } = await req.json() as { exempt: boolean };

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return NextResponse.json({ error: "클럽을 찾을 수 없습니다." }, { status: 404 });

  await prisma.club.update({
    where: { id: clubId },
    data: {
      subscriptionStatus: exempt ? "EXEMPT" : "TRIAL",
      subscriptionEnd: exempt ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ ok: true });
}
