import {
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getTossSecretKey } from "@/lib/payments-server";
import { getNextSubscriptionEnd } from "@/lib/subscription";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { paymentKey, orderId, amount } = await req.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { error: "결제 검증에 필요한 값이 부족합니다." },
        { status: 400 }
      );
    }

    const secretKey = getTossSecretKey();
    const basicToken = Buffer.from(`${secretKey}:`).toString(
      "base64"
    );

    const response = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: Number(amount),
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.message ?? "결제 승인에 실패했습니다." },
        { status: response.status }
      );
    }

    const currentClub = await prisma.club.findUnique({
      where: { id: admin.clubId },
    });

    if (!currentClub) {
      return NextResponse.json(
        { error: "클럽/소모임을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { orderId },
    });

    if (existingPayment) {
      return NextResponse.json({ success: true });
    }

    const newEndDate = getNextSubscriptionEnd(
      currentClub.subscriptionEnd
    );

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId,
          paymentKey,
          amount: Number(amount),
          status: "DONE",
          method: result.method || "CARD",
          orderName:
            result.orderName || "배드민턴 클럽 구독 결제",
          clubId: admin.clubId,
        },
      }),
      prisma.club.update({
        where: { id: admin.clubId },
        data: {
          subscriptionStatus: "ACTIVE",
          subscriptionEnd: newEndDate,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "결제 승인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
