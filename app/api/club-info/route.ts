import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getCalculatedSubscriptionStatus } from "@/lib/subscription";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const [club, currentAdmin] = await Promise.all([
      prisma.club.findUnique({
        where: { id: admin.clubId },
        select: {
          id: true,
          name: true,
          publicJoinToken: true,
          createdAt: true,
          subscriptionStatus: true,
          subscriptionEnd: true,
        },
      }),
      prisma.admin.findUnique({
        where: { id: admin.adminId },
        select: {
          customFieldLabel: true,
          email: true,
        },
      }),
    ]);

    if (!club) {
      return NextResponse.json(
        { error: "클럽을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const calculatedStatus = getCalculatedSubscriptionStatus({
      subscriptionStatus: club.subscriptionStatus,
      createdAt: club.createdAt,
      subscriptionEnd: club.subscriptionEnd,
    });

    return NextResponse.json({
      id: club.id,
      name: club.name,
      publicJoinToken: club.publicJoinToken,
      calculatedStatus,
      subscriptionEnd: club.subscriptionEnd,
      customFieldLabel:
        currentAdmin?.customFieldLabel ?? "차량번호",
      adminEmail: currentAdmin?.email ?? "",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "클럽 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
