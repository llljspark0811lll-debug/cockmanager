import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ clubcode: string }> }
) {
  try {
    const { clubcode } = await context.params;
    const accessToken = String(clubcode).trim();

    const club = await prisma.club.findUnique({
      where: {
        publicJoinToken: accessToken,
      },
      include: {
        admins: {
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
          select: {
            customFieldLabel: true,
          },
        },
      },
    });

    if (!club) {
      return NextResponse.json(
        { error: "클럽/소모임 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: club.name,
      publicJoinToken: club.publicJoinToken,
      customFieldLabel:
        club.admins[0]?.customFieldLabel ?? "추가 정보",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "클럽/소모임 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
